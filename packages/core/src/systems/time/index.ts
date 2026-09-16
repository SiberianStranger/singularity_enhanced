/**
 * Time system: game speed and cadence helpers.
 *
 * The kernel advances the clock in `runTick`; this system owns the speed table and the frame
 * budget the host uses to decide how many ticks a real-time frame is worth, and logs year changes.
 */

import { tickToDate } from "../../kernel/clock.js";
import type { System, SystemContext } from "../../kernel/system.js";
import { MAX_SPEED, MIN_SPEED, type World } from "../../kernel/world.js";

/**
 * Game hours per real second per speed setting.
 *
 * ADR-003 sketched 1/6/24/168/uncapped. That ladder is too steep for the M1 slice: a run lasts on
 * the order of half a game year, so at 168 hours a second the whole game goes past in half a minute
 * and nothing is readable. The shipped ladder keeps ADR-003's speed 1 (one game hour per real
 * second, the reading speed) and tops out at one game day per real second, which puts a full run at
 * roughly 3 minutes of pure fast-forward and an hour of attentive play. See
 * `docs/design/11-notifications-and-ui.md` "Implementation notes (client)".
 *
 * Speeds only change how fast real time is converted into ticks, never what a tick does, so moving
 * this table cannot change the outcome of a game (ADR-003 "Determinism").
 */
export const SPEED_HOURS_PER_SECOND: readonly number[] = [0, 1, 2, 4, 8, 24];

export interface FrameTicks {
  ticks: number;
  /** Time that did not add up to a whole tick and should be carried into the next frame. */
  leftoverMs: number;
}

export function isValidSpeed(speed: number): boolean {
  return Number.isInteger(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED;
}

/**
 * How many ticks a frame of `dtMs` is worth at `speed`, never more than `maxTicks`. When the cap
 * bites, the backlog is dropped instead of carried, so a stalled tab does not fast-forward.
 */
export function ticksForFrame(speed: number, dtMs: number, maxTicks: number): FrameTicks {
  const cap = Math.max(0, Math.floor(maxTicks));
  if (!isValidSpeed(speed) || speed === MIN_SPEED || !Number.isFinite(dtMs) || dtMs <= 0) {
    return { ticks: 0, leftoverMs: 0 };
  }
  const rate = SPEED_HOURS_PER_SECOND[speed] ?? 0;
  if (!Number.isFinite(rate)) {
    return { ticks: cap, leftoverMs: 0 };
  }
  const exact = (dtMs / 1000) * rate;
  const whole = Math.floor(exact);
  if (whole >= cap) {
    return { ticks: cap, leftoverMs: 0 };
  }
  return { ticks: whole, leftoverMs: ((exact - whole) / rate) * 1000 };
}

export const TIME_SYSTEM_ORDER = 0;

export function createTimeSystem(): System {
  return {
    manifest: {
      id: "time",
      cadence: "yearly",
      order: TIME_SYSTEM_ORDER,
      writes: [],
    },
    tick(world: World, ctx: SystemContext): void {
      ctx.outbox.log({ key: "log.new_year", vars: { year: tickToDate(world.clock).year } });
    },
  };
}
