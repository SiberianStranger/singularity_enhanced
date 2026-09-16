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

export function shortId(id: string): string {
  return id.length <= 12 ? id : `${id.slice(0, 11)}…`;
}
