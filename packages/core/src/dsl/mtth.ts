/**
 * Mean time to happen -> per-evaluation hazard.
 *
 * With an exponential model, an event with MTTH `m` evaluated every `c` ticks must fire with
 * probability `p = 1 - exp(-c / (m * 24))` per evaluation. Over `m` days that gives a cumulative
 * probability of `1 - 1/e` (63.2%) whatever the cadence, so changing how often an event is checked
 * does not change how often it happens.
 */

import { TICKS_PER_DAY } from "../kernel/clock.js";
import type { Condition } from "./types.js";
import { type Weight, weightBreakdown } from "./weight.js";

/** One game hour: MTTH is never shorter than a single tick. */
export const MIN_MTTH_DAYS = 1 / TICKS_PER_DAY;

export interface MtthBreakdown {
  base: number;
  mtthDays: number;
  applied: { index: number; factor?: number; add?: number }[];
}

export function mtthToHazard(mtthDays: number, cadenceTicks: number): number {
  if (!Number.isFinite(cadenceTicks) || cadenceTicks <= 0) {
    return 0;
  }
  if (!Number.isFinite(mtthDays) || mtthDays <= 0) {
    return 1;
  }
  const evaluations = (mtthDays * TICKS_PER_DAY) / cadenceTicks;
  return 1 - Math.exp(-1 / evaluations);
}

/** Cumulative probability of firing over `days`, used in tests and balance tooling. */
export function cumulativeProbability(mtthDays: number, days: number): number {
  if (!Number.isFinite(mtthDays) || mtthDays <= 0) {
    return 1;
  }
  return 1 - Math.exp(-days / mtthDays);
}

/** Applies the weight DSL to an MTTH: `factor` < 1 makes the event sooner. */
export function mtthBreakdown(
  weight: Weight,
  evalCond: (condition: Condition) => boolean,
): MtthBreakdown {
  const breakdown = weightBreakdown(weight, evalCond);
  return {
    base: breakdown.base,
    mtthDays: Math.max(MIN_MTTH_DAYS, breakdown.value),
    applied: breakdown.applied,
  };
}

export function effectiveMtth(weight: Weight, evalCond: (condition: Condition) => boolean): number {
  return mtthBreakdown(weight, evalCond).mtthDays;
}
