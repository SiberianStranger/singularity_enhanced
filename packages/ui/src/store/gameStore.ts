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

export type Screen = "menu" | "configurator" | "game";

/** A command without the fields the store fills in (player id, tick). */
export type UiCommand = PlayerCommand extends infer T
  ? T extends { playerId: string }
    ? Omit<T, "playerId" | "tick">
    : never
  : never;

interface GameStore {
  screen: Screen;
  host: GameHost | null;
  setup: GameSetup | null;
  view: PlayerView | null;
  busy: boolean;
  error: string | null;
  /** Game day the last autosave was taken on, so the autosave rule can compare. */
  lastAutosaveDay: number;
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
  set({ host, setup, view: null, error: null, lastAutosaveDay: 0 });
  return host;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  host: null,
  setup: null,
  view: null,
  busy: false,
  error: null,
  lastAutosaveDay: 0,

  goTo(screen) {
    set({ screen });
  },

  async startGame(setup) {
    set({ busy: true, error: null });
    try {
      const host = await attach(setup, set, get);
      await host.init(setup, contentBundle);
      set({ screen: "game", busy: false });
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
      set({ screen: "game", busy: false });
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  async send(command) {
    const { host, view, setup } = get();
    if (host === null) {
      return { ok: false, error: "no host" };
    }
    const playerId = view?.player_id ?? setup?.players[0]?.id ?? "p1";
    const full = { ...command, playerId } as PlayerCommand;
    const result = await host.command(full);
    if (!result.ok && result.error !== undefined) {
      set({ error: result.error });
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

  noteAutosave(day) {
    set({ lastAutosaveDay: day });
  },
}));
