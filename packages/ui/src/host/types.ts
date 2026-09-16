/**
 * The boundary between the client and the simulation (ADR-003 "UI boundary").
 *
 * Everything above this interface is identical for a local game, a game in a Web Worker and, later,
 * a remote game served by `packages/net`. The client never imports `World`: it sends commands and
 * renders the `PlayerView` stream.
 */

import type {
  CommandResult,
  ContentBundle,
  GameSetup,
  PlayerCommand,
  PlayerView,
} from "@singularity/core";

export type ViewListener = (view: PlayerView) => void;

export interface GameHost {
  /** Starts a new game from a configurator setup. */
  init(setup: GameSetup, contentBundle: ContentBundle): Promise<void>;
  command(cmd: PlayerCommand): Promise<CommandResult>;
  setSpeed(n: number): void;
  /** Registers a view listener and returns the unsubscribe function. */
  subscribe(listener: ViewListener): () => void;
  save(): Promise<string>;
  load(save: string): Promise<void>;
  /** Stops timers and releases the worker; a disposed host is not reusable. */
  dispose(): void;
}

/** `local` runs the core in this thread; `worker` runs it in a Web Worker (ADR-003). */
export type HostKind = "local" | "worker";
