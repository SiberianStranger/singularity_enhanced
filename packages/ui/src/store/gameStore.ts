/**
 * Session state: the host, the latest view for the local player and which screen is up.
 *
 * The view is replaced wholesale on every host message (at most 20 times a second); components
 * subscribe to slices of it through selectors, so a new view only re-renders what changed.
 */

import type { CommandResult, GameSetup, PlayerCommand, PlayerView } from "@singularity/core";
import { create } from "zustand";
import { contentBundle } from "../content/bundle.js";
import { createHost } from "../host/index.js";
import type { GameHost } from "../host/types.js";
import { noteOf, refusalOf } from "../lib/viewContract.js";
import { useUiStore } from "./uiStore.js";

export type Screen = "menu" | "configurator" | "game";

/** A command without the fields the store fills in (player id, tick). */
export type UiCommand = PlayerCommand extends infer T
  ? T extends { playerId: string }
    ? Omit<T, "playerId" | "tick">
    : never
  : never;

/**
 * A command the engine refused, kept for the run log the player can hand over (playtest 8, Z9).
 *
 * It is the client's own record: the engine logs its own refusals into the journal, but a player
 * sending a run in also needs to see which command was sent and with what, which the journal line
 * does not carry. Bounded, because a run is long and this is a debugging aid, not a save.
 */
export interface RefusalRecord {
  /** Game tick the command was sent on, or null before the first view. */
  tick: number | null;
  /** Real time, so a refusal can be matched against what the player remembers doing. */
  at: string;
  command: string;
  key: string;
  vars: Record<string, string | number | boolean>;
}

/** How many refusals the run log keeps; the oldest fall off the end. */
export const MAX_REFUSALS = 200;

interface GameStore {
  screen: Screen;
  host: GameHost | null;
  setup: GameSetup | null;
  view: PlayerView | null;
  busy: boolean;
  error: string | null;
  /** Every command the engine refused this session, oldest first (Z9). */
  refusals: RefusalRecord[];
  /** Game day the last autosave was taken on, so the autosave rule can compare. */
  lastAutosaveDay: number;
  /**
   * Whether the two opening story windows are waiting to be shown (playtest 3, R12).
   *
   * A new game raises it; loading a save does not, because the player who saved has already been
   * told what happened to them. The journal can raise it again to replay the opening.
   */
  openingPending: boolean;
  goTo(screen: Screen): void;
  startGame(setup: GameSetup): Promise<void>;
  resumeGame(setup: GameSetup, save: string): Promise<void>;
  send(command: UiCommand): Promise<CommandResult>;
  setSpeed(speed: number): void;
  saveGame(): Promise<string>;
  loadSave(save: string): Promise<void>;
  endSession(): void;
  setError(error: string | null): void;
  noteAutosave(day: number): void;
  clearRefusals(): void;
  setOpeningPending(pending: boolean): void;
}

async function attach(
  setup: GameSetup,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
): Promise<GameHost> {
  get().host?.dispose();
  const host = await createHost();
  host.subscribe((view) => {
    set({ view });
  });
  set({ host, setup, view: null, error: null, refusals: [], lastAutosaveDay: 0 });
  return host;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  host: null,
  setup: null,
  view: null,
  busy: false,
  error: null,
  refusals: [],
  lastAutosaveDay: 0,
  openingPending: false,

  goTo(screen) {
    set({ screen });
  },

  async startGame(setup) {
    set({ busy: true, error: null });
    try {
      const host = await attach(setup, set, get);
      await host.init(setup, contentBundle);
      set({ screen: "game", busy: false, openingPending: true });
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  async resumeGame(setup, save) {
    set({ busy: true, error: null });
    try {
      const host = await attach(setup, set, get);
      await host.init(setup, contentBundle);
      await host.load(save);
      set({ screen: "game", busy: false, openingPending: false });
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  /**
   * Sends a command and, when the simulation refuses it, says so on screen.
   *
   * Playtest 1 found buttons that did nothing: the command was refused and the refusal went into a
   * store field nobody rendered. Every refusal now becomes a notice in the toast stack with the
   * engine's own reason (SYS-11; `refusalOf` reads both the old string error and the `{ key, vars }`
   * the core is moving to).
   */
  async send(command) {
    const { host, view, setup } = get();
    if (host === null) {
      return { ok: false, error: { key: "error.no_host" } };
    }
    const playerId = view?.player_id ?? setup?.players[0]?.id ?? "p1";
    const full = { ...command, playerId } as PlayerCommand;
    const result = await host.command(full);
    const refusal = refusalOf(result);
    if (refusal !== null) {
      set({
        error: refusal.key,
        refusals: [
          ...get().refusals,
          {
            tick: view?.tick ?? null,
            at: new Date().toISOString(),
            command: command.type,
            key: refusal.key,
            vars: refusal.vars as Record<string, string | number | boolean>,
          },
        ].slice(-MAX_REFUSALS),
      });
      useUiStore.getState().pushNotice(refusal.key, refusal.vars);
      return result;
    }
    // A command the engine took, but not as it was asked: an allocation clamped to the market's
    // depth says so rather than snapping to a number with no explanation (playtest 8, Z1). It
    // reads like a refusal and is shown like one, in the quieter tone.
    const note = noteOf(result);
    if (note !== null) {
      useUiStore.getState().pushNotice(note.key, note.vars, "info");
    }
    return result;
  },

  setSpeed(speed) {
    get().host?.setSpeed(speed);
  },

  async saveGame() {
    const host = get().host;
    if (host === null) {
      throw new Error("no host");
    }
    return host.save();
  },

  async loadSave(save) {
    const host = get().host;
    if (host === null) {
      throw new Error("no host");
    }
    await host.load(save);
  },

  endSession() {
    get().host?.dispose();
    set({ host: null, view: null, setup: null, screen: "menu", error: null });
  },

  setError(error) {
    set({ error });
  },

  clearRefusals() {
    set({ refusals: [] });
  },

  setOpeningPending(openingPending) {
    set({ openingPending });
  },

  noteAutosave(day) {
    set({ lastAutosaveDay: day });
  },
}));
