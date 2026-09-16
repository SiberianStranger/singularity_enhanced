/// <reference lib="webworker" />
/**
 * The simulation worker: `@singularity/core` running off the main thread (ADR-003).
 *
 * It owns the clock. A frame timer asks the core how many ticks the elapsed real time is worth at
 * the current speed (`ticksForFrame`), advances that many, and posts one view per frame, so the
 * client never sees more than 20 views a second whatever the speed is. A blocking pending choice
 * stops the clock until a command answers it.
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
  serialize,
  ticksForFrame,
} from "@singularity/core";
import { FRAME_MS, type HostRequest, type HostResponse, MAX_TICKS_PER_FRAME } from "./protocol.js";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let game: Game | null = null;
let setup: GameSetup | null = null;
let content: ContentBundle | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let leftoverMs = 0;
let lastFrameAt = 0;

function post(message: HostResponse): void {
  ctx.postMessage(message);
}

function localPlayer(): PlayerId {
  return setup?.players[0]?.id ?? game?.world.meta.hostPlayerId ?? "p1";
}

function emit(): void {
  if (game === null) {
    return;
  }
  post({ kind: "view", view: game.snapshot(localPlayer()) });
}

function isBlocked(): boolean {
  if (game === null) {
    return true;
  }
  const player = localPlayer();
  return game.world.events.pending.some((choice) => choice.blocking && choice.playerId === player);
}

function frame(): void {
  if (game === null) {
    return;
  }
  const now = performance.now();
  const elapsed = lastFrameAt === 0 ? FRAME_MS : now - lastFrameAt;
  lastFrameAt = now;
  if (isBlocked()) {
    leftoverMs = 0;
    return;
  }
  const budget = ticksForFrame(game.world.speed, elapsed + leftoverMs, MAX_TICKS_PER_FRAME);
  leftoverMs = budget.leftoverMs;
  if (budget.ticks > 0) {
    game.tick(budget.ticks);
    emit();
  }
}

function startTimer(): void {
  if (timer === null) {
    lastFrameAt = 0;
    timer = setInterval(frame, FRAME_MS);
  }
}

function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function start(next: GameSetup, bundle: ContentBundle): void {
  const first = next.players[0];
  if (first === undefined) {
    throw new Error("a setup needs at least one player");
  }
  setup = next;
  content = bundle;
  // The setup goes to the core whole: `createGame` applies it (selves, sites, watchers, opening
  // story) before the first tick. Passing only seed and players would start an empty world.
  game = createGame({
    seed: next.seed,
    content: bundle,
    setup: next,
    hostPlayerId: next.host_player_id ?? first.id,
  });
  startTimer();
  emit();
}

type Reply = { ok: true; result?: CommandResult | string } | { ok: false; error: string };

function handle(request: HostRequest): Reply {
  switch (request.type) {
    case "init": {
      start(request.setup, request.content);
      return { ok: true };
    }
    case "command": {
      if (game === null) {
        return { ok: false, error: "no game" };
      }
      const command: PlayerCommand = request.command;
      const result = game.command(command);
      emit();
      return { ok: true, result };
    }
    case "set_speed": {
      if (game === null) {
        return { ok: false, error: "no game" };
      }
      const result = game.command({
        type: "set_speed",
        playerId: game.world.meta.hostPlayerId,
        speed: request.speed,
      });
      emit();
      return { ok: true, result };
    }
    case "save": {
      if (game === null) {
        return { ok: false, error: "no game" };
      }
      return { ok: true, result: serialize(game.world) };
    }
    case "load": {
      const bundle = request.content ?? content;
      if (bundle === null) {
        return { ok: false, error: "no content bundle" };
      }
      game = loadGame({ save: request.save, content: bundle });
      content = bundle;
      leftoverMs = 0;
      startTimer();
      emit();
      return { ok: true };
    }
    case "dispose": {
      stopTimer();
      game = null;
      setup = null;
      return { ok: true };
    }
    default:
      return { ok: false, error: "unknown request" };
  }
}

ctx.onmessage = (event: MessageEvent<HostRequest>): void => {
  const request = event.data;
  try {
    const reply = handle(request);
    if (reply.ok) {
      post({
        kind: "reply",
        id: request.id,
        ok: true,
        ...(reply.result === undefined ? {} : { result: reply.result }),
      });
    } else {
      post({ kind: "reply", id: request.id, ok: false, error: reply.error });
    }
  } catch (error) {
    post({
      kind: "reply",
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
