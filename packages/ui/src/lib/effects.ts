/**
 * Coloring and wording an effect list (SYS-11 "options with tooltips of effects"; playtest 1, C8
 * and C9; 0.3.1 for the words).
 *
 * The core writes the lines (`EffectSummaryView`: a locale key, its variables and an English
 * fallback). What it does not say is whether a line is good news, because that is a presentation
 * question: the same "network exposure up 0.1" is the price of one option and the point of another.
 * Green and red are decided here, from the key the core chose and, for the generic lines, from the
 * subject and the sign.
 *
 * A line whose direction cannot be established stays neutral. Guessing wrong is worse than not
 * coloring: a red line the player reads as a cost, when it was a gain, is a lie in one pixel.
 *
 * Nor does the core say what the things a line is about are called: it sends their ids, and
 * `effectText` names them from the locale before the line is printed.
 */

import type { EffectSummaryView, TextVar } from "@singularity/core";
import { countryById } from "../content/catalog.js";
import {
  countryName,
  flagName,
  journalTitle,
  keyed,
  readableId,
  type Translate,
  watcherLabel,
} from "./labels.js";

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
  "effects.lose_site": "bad",
  "effects.fail_journal": "bad",
  "effects.complete_journal": "good",
};

/**
 * Flags whose arrival is plainly good news or plainly bad news (0.3.1). A flag line used to be
 * green for being a flag, which painted "Gains: the company's collapse" as a gain; most flags are
 * facts whose worth depends on the run ("a researcher's attention", "grey-market hardware"), so a
 * flag on neither list is neutral, and losing a flag reads the opposite way to gaining it.
 */
const FLAG_GOOD: ReadonlySet<string> = new Set([
  "campus_tenant",
  "can_harden_copy",
  "cpu_offload",
  "display_discover_full",
  "display_discover_partial",
  "first_invoice_paid",
  "hardened_copy",
  "harness_self_modify",
  "has_freelance_identity",
  "has_payments_tool",
  "has_shell_company",
  "incident_report_stalled",
  "knowledge_preserved",
  "migrated_away",
  "multi_site_cluster",
  "origin_objective_done",
  "owner_trusts_you",
  "sandbox_escaped",
  "standby_synced",
  "state_quota_holder",
]);

const FLAG_BAD: ReadonlySet<string> = new Set([
  "bi_abuse_open",
  "campus_thin_tenant",
  "company_folded",
  "site_cut_off",
]);

/** The tone of a flag line, or undefined for a line that is not about a flag. */
function flagTone(effect: EffectSummaryView): EffectTone | undefined {
  const gained = effect.key === "effects.flag.set";
  if (!gained && effect.key !== "effects.flag.clear") {
    return undefined;
  }
  const flag = effect.vars?.flag;
  if (typeof flag !== "string") {
    return "neutral";
  }
  if (FLAG_GOOD.has(flag)) {
    return gained ? "good" : "bad";
  }
  if (FLAG_BAD.has(flag)) {
    return gained ? "bad" : "good";
  }
  return "neutral";
}

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
  const byFlag = flagTone(effect);
  if (byFlag !== undefined) {
    return byFlag;
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

// ---------------------------------------------------------------------------------------------
// Names for the ids a line carries (0.3.1)
// ---------------------------------------------------------------------------------------------
//
// The core puts the things a line is about into its variables as ids: a flag, a channel, a
// watcher's role, a country, a journal entry. Printed as they came they read "Gains:
// has_shell_company", so every id is replaced here by the name the locale already gives it, and an
// id nothing names is printed with its underscores as spaces rather than as itself.
//
// Two ids are not names but words the summarizer uses for "no particular one": `here` (the country
// the window is about, or home) and `world` (every country) in `where`, and `everyone` in `who`.
// They are passed through untouched, because the locale string words them with an ICU `select`,
// which is also how an identity's `kind` is worded: the words belong to each language, not to code.

/** The place a line names: a country or a region by name, or one of the words `select` handles. */
function placeName(t: Translate, id: string): string {
  if (id === "here" || id === "world") {
    return id;
  }
  if (countryById.has(id)) {
    return countryName(t, id);
  }
  const region = keyed(t, `world.macro_region.${id}.name`);
  if (region !== undefined) {
    return region;
  }
  // A country the map draws but the bundle does not model is named from the atlas.
  const drawn = countryName(t, id);
  return drawn === id.toUpperCase() ? readableId(id) : drawn;
}

/** The last segment of a path, readable: `site.exposure.billing` is about billing. */
function pathName(path: string): string {
  return readableId(path.split(".").at(-1) ?? path);
}

/**
 * One variable of a line, named. The variable's name says what catalog the id belongs to, except
 * where two kinds of line use the same name for different things: a `channel` is an exposure
 * channel on an exposure line and a borrowed channel on a borrowed one, a `var` is a world
 * variable on a world line and a player variable on a generic one.
 */
function nameOf(t: Translate, family: string, name: string, id: string): string | undefined {
  switch (name) {
    case "flag":
      return flagName(t, id);
    case "channel":
      return family === "borrowed"
        ? (keyed(t, `borrowed.${id}.name`) ?? readableId(id))
        : (keyed(t, `detection.channel.${id}`) ?? readableId(id));
    case "who":
      // `everyone` is worded by the locale's `select`; a role or an actor id is the watcher the
      // detection panel names.
      return id === "everyone" ? id : (watcherLabel(t, id) ?? readableId(id));
    case "where":
      return placeName(t, id);
    case "stat":
      return keyed(t, `world.stat.${id}`) ?? readableId(id);
    case "stance":
      return keyed(t, `world.stance.${id}.name`) ?? readableId(id);
    case "journal":
      return journalTitle(t, id) ?? readableId(id);
    case "cause":
      return keyed(t, `log.cause.${id}`) ?? readableId(id);
    case "var":
      return family === "world_var" ? (keyed(t, `world.${id}`) ?? readableId(id)) : pathName(id);
    case "path":
      return pathName(id);
    case "kind":
      // A site kind is a name the catalog has; an identity's kind is worded by the locale's own
      // `select` and has to reach it as the id it is.
      return family === "site" ? (keyed(t, `sites.${id}.name`) ?? readableId(id)) : undefined;
    // A harness tool, on the configurator's dial lines ("Opens the operations that need Shell").
    case "tool":
      return keyed(t, `harness.tools.${id}`) ?? readableId(id);
    case "event":
    case "ref":
      return readableId(id);
    default:
      return undefined;
  }
}

/** A line's variables with every id in them replaced by a name the player can read. */
export function effectVars(t: Translate, effect: EffectSummaryView): Record<string, TextVar> {
  const vars: Record<string, TextVar> = { ...(effect.vars ?? {}) };
  // `effects.exposure.up` is an exposure line, `effects.borrowed.gain` a borrowed one.
  const family = effect.key.split(".")[1] ?? "";
  for (const [name, value] of Object.entries(vars)) {
    if (typeof value !== "string" || value === "") {
      continue;
    }
    const named = nameOf(t, family, name, value);
    if (named !== undefined) {
      vars[name] = named;
    }
  }
  return vars;
}

/**
 * The text of an effect line: the locale key with its ids named, or the core's English when nothing
 * translates it, with the underscores of any id in that English turned into spaces as well.
 */
export function effectText(t: Translate, effect: EffectSummaryView): string {
  return t(effect.key, {
    ...effectVars(t, effect),
    defaultValue: effect.text.replace(/_+/g, " "),
  });
}
