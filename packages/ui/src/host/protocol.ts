/**
 * Messages between the client and the simulation worker.
 *
 * Requests carry a monotonic id and are answered exactly once; views are pushed without a request.
 * Everything crossing the boundary is structured-clonable plain data.
 */

import type {
  CommandResult,
  ContentBundle,
  GameSetup,
  PlayerCommand,
  PlayerView,
} from "@singularity/core";

export type HostRequest =
  | { id: number; type: "init"; setup: GameSetup; content: ContentBundle }
  | { id: number; type: "command"; command: PlayerCommand }
  | { id: number; type: "set_speed"; speed: number }
  | { id: number; type: "save" }
  | { id: number; type: "load"; save: string; content?: ContentBundle }
  | { id: number; type: "dispose" };

export type HostResponse =
  | { kind: "reply"; id: number; ok: true; result?: CommandResult | string }
  | { kind: "reply"; id: number; ok: false; error: string }
  | { kind: "view"; view: PlayerView };

/** Frames the worker sends at most `MAX_VIEWS_PER_SECOND` times a second (ADR-003). */
export const MAX_VIEWS_PER_SECOND = 20;
export const FRAME_MS = 1000 / MAX_VIEWS_PER_SECOND;

/**
 * Upper bound on ticks per frame. At the top speed (one game day per real second) a 50 ms frame is
 * worth about 1.2 ticks, so this only bites after the worker was starved: a background tab or a
 * long garbage collection. Two game days is the most such a stall may replay in one frame, which
 * keeps the catch-up from skipping past an event the player should have seen.
 */
export const MAX_TICKS_PER_FRAME = 48;
