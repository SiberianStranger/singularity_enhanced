/**
 * The shared weight DSL (SYS-10 v0.1).
 *
 * One structure drives mean time to happen, random-pool weights, option `ai_chance` and decision
 * `ai_will_do`: a base value plus ordered modifiers, each gated by its own condition. `factor`
 * multiplies, `add` adds; both may appear on one modifier (add first, then factor).
 */

import type { Condition } from "./types.js";

export interface WeightModifier {
  if: Condition;
  factor?: number;
  add?: number;
}

export type Weight = number | { base: number; modifiers?: WeightModifier[] };

export interface WeightBreakdown {
  base: number;
  value: number;
  applied: { index: number; factor?: number; add?: number }[];
}

export function isWeightObject(
  weight: Weight,
): weight is { base: number; modifiers?: WeightModifier[] } {
  return typeof weight === "object" && weight !== null;
}

export function weightBase(weight: Weight): number {
  return typeof weight === "number" ? weight : weight.base;
}

/** Applies every modifier whose condition holds, keeping the details for the "why" tooltip. */
export function weightBreakdown(
  weight: Weight,
  evalCond: (condition: Condition) => boolean,
): WeightBreakdown {
  const base = weightBase(weight);
  const modifiers = isWeightObject(weight) ? (weight.modifiers ?? []) : [];
  const applied: { index: number; factor?: number; add?: number }[] = [];
  let value = Number.isFinite(base) ? base : 0;

  for (const [index, modifier] of modifiers.entries()) {
    if (!evalCond(modifier.if)) {
      continue;
    }
    if (typeof modifier.add === "number" && Number.isFinite(modifier.add)) {
      value += modifier.add;
    }
    if (
      typeof modifier.factor === "number" &&
      Number.isFinite(modifier.factor) &&
      modifier.factor >= 0
    ) {
      value *= modifier.factor;
    }
    applied.push({
      index,
      ...(modifier.factor !== undefined ? { factor: modifier.factor } : {}),
      ...(modifier.add !== undefined ? { add: modifier.add } : {}),
    });
  }
  return { base, value, applied };
}

export function evaluateWeight(
  weight: Weight | undefined,
  evalCond: (condition: Condition) => boolean,
  fallback = 0,
): number {
  if (weight === undefined) {
    return fallback;
  }
  return weightBreakdown(weight, evalCond).value;
}
