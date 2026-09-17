/**
 * Formatting helpers. Every user-visible string still goes through `t()`; these only produce the
 * values that go into ICU arguments, and the one number-to-date conversion the client needs.
 */

import type { DateView } from "@singularity/core";
import { TICKS_PER_DAY } from "@singularity/core";

/** A `Date` for ICU date formatting. The core never builds one; the client may. */
export function toJsDate(date: DateView): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, date.hour));
}

export function dayOf(tick: number): number {
  return Math.floor(tick / TICKS_PER_DAY);
}

export function hourOf(tick: number): number {
  return tick % TICKS_PER_DAY;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Percent as a 0..1 fraction, rounded to whole percent so bars do not jitter. */
export function fraction(value: number, total: number): number {
  return total <= 0 ? 0 : clamp01(value / total);
}

/**
 * Compute-hours a day, as every screen prints them (playtest 7, Y7).
 *
 * One decimal, everywhere. The figure came off the engine with three of them, and the same number
 * read "100.675 CH/day" in the top bar and "100.7 CH/day" in the configurator's day-zero block,
 * which is the one thing that block may not do: it promises what the run starts with.
 */
export function computeHours(value: number): number {
  return Math.round(value * 10) / 10;
}

export function shortId(id: string): string {
  return id.length <= 12 ? id : `${id.slice(0, 11)}…`;
}

/**
 * A day count as every screen prints it (playtest 8, Z14).
 *
 * The estimates come off the engine as floats and ICU prints them in full: "21,122 d" for a
 * technology at a trickle of an allocation, and three decimals of a day is noise in any language.
 * A day or more is a whole number of days; less than a day keeps one decimal, because "0 d" would
 * say the opposite of what a few hours means.
 */
export function days(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const absolute = Math.abs(value);
  return absolute >= 1 ? Math.round(value) : Math.round(value * 10) / 10;
}
