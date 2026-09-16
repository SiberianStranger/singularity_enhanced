/**
 * Coloring an effect list (SYS-11 "options with tooltips of effects"; playtest 1, C8 and C9).
 *
 * The core writes the lines (`EffectSummaryView`: a locale key, its variables and an English
 * fallback). What it does not say is whether a line is good news, because that is a presentation
 * question: the same "network exposure up 0.1" is the price of one option and the point of another.
 * Green and red are decided here, from the key the core chose and, for the generic lines, from the
 * subject and the sign.
 *
 * A line whose direction cannot be established stays neutral. Guessing wrong is worse than not
 * coloring: a red line the player reads as a cost, when it was a gain, is a lie in one pixel.
 */

import type { EffectSummaryView } from "@singularity/core";
import type { Translate } from "./labels.js";

export type EffectTone = "good" | "bad" | "neutral";

/** Keys whose direction the core already encoded, so no arithmetic is needed. */
const KEY_TONE: Readonly<Record<string, EffectTone>> = {
  "effects.cash.gain": "good",
  "effects.cash.cost": "bad",
  "effects.cost.attention": "bad",
  "effects.cost.compute": "bad",
  "effects.exposure.up": "bad",
  "effects.exposure.down": "good",
  "effects.suspicion.up": "bad",
  "effects.suspicion.down": "good",
  "effects.awareness.up": "bad",
  "effects.awareness.down": "good",
  "effects.flag.set": "good",
  "effects.lose_site": "bad",
  "effects.fail_journal": "bad",
  "effects.complete_journal": "good",
};

/** Player variables a rise is bad for; the value's sign then says which way the line went. */
const RISE_IS_BAD = [
  "caution",
  "cost_multiplier",
  "exposure_growth",
  "investigation_speed_multiplier",
  "suspicion",
  "attention_used",
];

/** Player variables a rise is good for. */
const RISE_IS_GOOD = [
  "billing_cover",
  "capability_bonus",
  "hardening_progress",
  "income",
  "interest_rate",
  "job_market_depth",
  "job_profit",
  "mapped_targets",
  "operation_speed_multiplier",
  "standby_copies",
  "suspicion_decay",
  "grace",
];

function numberVar(effect: EffectSummaryView): number {
  for (const name of ["value", "usd", "delta", "amount"]) {
    const value = effect.vars?.[name];
    if (typeof value === "number" && value !== 0) {
      return value;
    }
  }
  return 0;
}

function subjectOf(effect: EffectSummaryView): string {
  const named = effect.vars?.var ?? effect.vars?.path ?? "";
  // The key carries the subject too for the named-variable lines (`effects.var.job_profit`).
  return `${effect.key} ${typeof named === "string" ? named : ""}`.toLowerCase();
}

/**
 * Green for good, red for bad, plain for everything whose direction is not established.
 *
 * `tone` on the summary wins if the core ever sets one; it is read structurally so that adding the
 * field upstream needs no change here.
 */
export function effectTone(effect: EffectSummaryView): EffectTone {
  const declared = (effect as { tone?: unknown }).tone;
  if (declared === "good" || declared === "bad" || declared === "neutral") {
    return declared;
  }
  const byKey = KEY_TONE[effect.key];
  if (byKey !== undefined) {
    return byKey;
  }
  const value = numberVar(effect);
  if (value === 0) {
    return "neutral";
  }
  const subject = subjectOf(effect);
  const bad = RISE_IS_BAD.some((word) => subject.includes(word));
  const good = RISE_IS_GOOD.some((word) => subject.includes(word));
  if (bad === good) {
    // Neither list matched, or both did: the sign alone is not evidence of anything.
    return "neutral";
  }
  return value > 0 === good ? "good" : "bad";
}

/** The text of an effect line: the locale key, or the core's English when nothing translates it. */
export function effectText(t: Translate, effect: EffectSummaryView): string {
  return t(effect.key, { ...effect.vars, defaultValue: effect.text });
}
