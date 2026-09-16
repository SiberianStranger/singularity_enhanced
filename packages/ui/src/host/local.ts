/**
 * `LocalHost`: the real simulation core on the main thread.
 *
 * Same code as the worker host runs, minus the worker: `createGame` from `@singularity/core`, a
 * frame timer that converts real time into ticks at the current speed, and one view per frame. It
 * exists for the places a `Worker` is not available or not wanted: component tests in jsdom, and
 * `VITE_HOST=local` while debugging, where a breakpoint in a system is worth more than a free
 * thread. Because it is the same core, a panel that renders here renders in the shipped build.
 *
 * Tests turn the timer off and call `advance(ticks)`, so a test never waits on wall-clock time.
 */

import {
  type CommandResult,
  type ContentBundle,
  createGame,
  type Game,
  type GameSetup,
  loadGame,
  type PlayerCommand,
  type PlayerId,
  type PlayerView,
  serialize,
  ticksForFrame,
} from "@singularity/core";
import { FRAME_MS, MAX_TICKS_PER_FRAME } from "./protocol.js";
import type { GameHost, ViewListener } from "./types.js";

export interface LocalHostOptions {
  /** Drives the clock from a real timer. Off in tests, which call `advance` instead. */
  timer?: boolean;
  /** Monotonic clock source; only the frame pacing uses it, never the simulation. */
  now?: () => number;
}

export class LocalHost implements GameHost {
  private readonly listeners = new Set<ViewListener>();
  private readonly useTimer: boolean;
  private readonly now: () => number;
  private game: Game | null = null;
  private setup: GameSetup | null = null;
  private content: ContentBundle | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private leftoverMs = 0;
  private lastFrameAt = 0;

  constructor(options: LocalHostOptions = {}) {
    this.useTimer = options.timer ?? true;
    this.now = options.now ?? (() => performance.now());
  }

  private playerId(): PlayerId {
    return this.setup?.players[0]?.id ?? this.game?.world.meta.hostPlayerId ?? "p1";
  }

  private emit(): void {
    const game = this.game;
    if (game === null) {
      return;
    }
    const view: PlayerView = game.snapshot(this.playerId());
    for (const listener of this.listeners) {
      listener(view);
    }
  }

  /** A blocking choice stops the clock until a command answers it (ADR-003 "UI boundary"). */
  private isBlocked(): boolean {
    const game = this.game;
    if (game === null) {
      return true;
    }
    const player = this.playerId();
    return game.world.events.pending.some(
      (choice) => choice.blocking && choice.playerId === player,
    );
  }

  private frame(): void {
    if (this.game === null) {
      return;
    }
    const now = this.now();
    const elapsed = this.lastFrameAt === 0 ? FRAME_MS : now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (this.isBlocked()) {
      this.leftoverMs = 0;
      return;
    }
    const budget = ticksForFrame(
      this.game.world.speed,
      elapsed + this.leftoverMs,
      MAX_TICKS_PER_FRAME,
    );
    this.leftoverMs = budget.leftoverMs;
    if (budget.ticks > 0) {
      this.game.tick(budget.ticks);
      this.emit();
    }
  }

  private startTimer(): void {
    if (!this.useTimer || this.timer !== null) {
      return;
    }
    this.lastFrameAt = 0;
    this.timer = setInterval(() => {
      this.frame();
    }, FRAME_MS);
  }

  /** Advances the simulation by whole ticks, for tests and for headless stepping. */
  advance(ticks: number): void {
    if (this.game === null || ticks <= 0) {
      return;
    }
    this.game.tick(ticks);
    this.emit();
  }

  init(setup: GameSetup, contentBundle: ContentBundle): Promise<void> {
    const first = setup.players[0];
    if (first === undefined) {
      return Promise.reject(new Error("a setup needs at least one player"));
    }
    this.setup = setup;
    this.content = contentBundle;
    this.game = createGame({
      seed: setup.seed,
      content: contentBundle,
      setup,
      hostPlayerId: setup.host_player_id ?? first.id,
    });
    this.startTimer();
    this.emit();
    return Promise.resolve();
  }

  command(cmd: PlayerCommand): Promise<CommandResult> {
    if (this.game === null) {
      return Promise.resolve({ ok: false, error: { key: "error.no_game" } });
    }
    const result = this.game.command(cmd);
    this.emit();
    return Promise.resolve(result);
  }

  setSpeed(n: number): void {
    const game = this.game;
    if (game === null) {
      return;
    }
    game.command({ type: "set_speed", playerId: game.world.meta.hostPlayerId, speed: n });
    this.emit();
  }

  subscribe(listener: ViewListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  save(): Promise<string> {
    if (this.game === null) {
      return Promise.reject(new Error("no game"));
    }
    return Promise.resolve(serialize(this.game.world));
  }

  load(save: string, contentBundle?: ContentBundle): Promise<void> {
    const bundle = contentBundle ?? this.content;
    if (bundle === null) {
      return Promise.reject(new Error("no content bundle"));
    }
    this.game = loadGame({ save, content: bundle });
    this.content = bundle;
    this.leftoverMs = 0;
    this.startTimer();
    this.emit();
    return Promise.resolve();
  }

  dispose(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.game = null;
    this.setup = null;
    this.listeners.clear();
  }
}
