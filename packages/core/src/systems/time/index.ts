/**
 * Time system: game speed and cadence helpers.
 *
 * The kernel advances the clock in `runTick`; this system owns the speed table and the frame
 * budget the host uses to decide how many ticks a real-time frame is worth, and logs year changes.
 */

import { tickToDate } from "../../kernel/clock.js";
import type { System, SystemContext } from "../../kernel/system.js";
import { MAX_SPEED, MIN_SPEED, type World } from "../../kernel/world.js";

/** Game hours per real second per speed setting (ADR-003); speed 5 is uncapped. */
export const SPEED_HOURS_PER_SECOND: readonly number[] = [
  0,
  1,
  6,
  24,
  168,
  Number.POSITIVE_INFINITY,
];

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
