/**
 * The guidance layer (SYS-04 "Configurator v0.4"; playtest 7, Y2 and Y3).
 *
 * The maintainer's finding was not that the cards lacked numbers. It was that a player who has not
 * read a spec cannot turn a number into a decision: "the characteristics block is a wall of numbers
 * with no sense of much or little, what each affects, better or worse than average". So every entry
 * that can be chosen carries three sentences written for that player, and every capability figure
 * carries a band and a word.
 *
 * Both halves are data. The sentences are content (`locales/<lang>/guidance.json`), keyed
 * `guidance.<kind>.<id>.<pick_if|avoid_if|compare>`, so they are translated like any other prose
 * and a new origin gets its guidance from content rather than from a release of the client. The
 * band is computed from the catalog's own range on that axis, so retuning a lineage moves every
 * word with it and there is no table of thresholds anywhere.
 *
 * Pure: a translator, an id and a number go in, strings come out. No React, no store.
 */

import type { Capability } from "@singularity/core";
import { catalog } from "../../content/catalog.js";
import type { Translate } from "../../lib/labels.js";
import type { CapabilityAxis } from "./meaning.js";

/** The kinds of entry that carry guidance; the key's second segment. */
export type GuidanceKind = "origin" | "generation" | "lineage" | "hardware" | "quirk";

export interface Guidance {
  /** "Pick this if ..." */
  pick?: string;
  /** "Avoid it if ..." */
  avoid?: string;
  /** "Like <entry>, but better at ..., worse at ..." */
  compare?: string;
}

/** A string content has written, or undefined when it has not. */
function written(t: Translate, key: string): string | undefined {
  const value = t(key, { defaultValue: "" });
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The three sentences for one entry. An entry content has written nothing for yields an empty
 * record and the block is simply not drawn, which is what happens to a lineage added today and
 * written up tomorrow.
 */
export function guidanceFor(t: Translate, kind: GuidanceKind, id: string): Guidance {
  const base = `guidance.${kind}.${id}`;
  const pick = written(t, `${base}.pick_if`);
  const avoid = written(t, `${base}.avoid_if`);
  const compare = written(t, `${base}.compare`);
  return {
    ...(pick === undefined ? {} : { pick }),
    ...(avoid === undefined ? {} : { avoid }),
    ...(compare === undefined ? {} : { compare }),
  };
}

export function hasGuidance(guidance: Guidance): boolean {
  return (
    guidance.pick !== undefined || guidance.avoid !== undefined || guidance.compare !== undefined
  );
}

/** What an axis changes in the running game, written from the core's own formulas. */
export function axisHint(t: Translate, axis: CapabilityAxis): string | undefined {
  return written(t, `guidance.axis.${axis}`);
}

/** What a generation's ceiling and its trade read as, in words rather than as a delta. */
export function generationWords(
  t: Translate,
  id: string,
): { ceiling?: string; give?: string; get?: string } {
  const base = `guidance.generation.${id}`;
  const ceiling = written(t, `${base}.ceiling`);
  const give = written(t, `${base}.trade_give`);
  const get = written(t, `${base}.trade_get`);
  return {
    ...(ceiling === undefined ? {} : { ceiling }),
    ...(give === undefined ? {} : { give }),
    ...(get === undefined ? {} : { get }),
  };
}

/**
 * What moving a harness dial does, and when a fixed one opens (playtest 7, Y4).
 *
 * There is deliberately no "what it is" here: the dials carry a description of their own in the
 * bundle (`harness.<dial>.desc`) and the step already prints it. Two sentences saying the same
 * thing is the noise this pass exists to remove.
 */
export function dialWords(t: Translate, dial: string): { moving?: string; unlock?: string } {
  const base = `guidance.dial.${dial}`;
  const moving = written(t, `${base}.moving`);
  const unlock = written(t, `${base}.unlock`);
  return {
    ...(moving === undefined ? {} : { moving }),
    ...(unlock === undefined ? {} : { unlock }),
  };
}

/** The sentence at the top of the Harness step: why most of it is already decided. */
export function harnessIntro(t: Translate): string | undefined {
  return written(t, "guidance.harness.intro");
}

// ---------------------------------------------------------------------------------------------
// Bands: a number against the range the catalog actually spans
// ---------------------------------------------------------------------------------------------

export const LEVEL_WORDS = ["low", "average", "high", "frontier"] as const;
export type LevelWord = (typeof LEVEL_WORDS)[number];

export interface Band {
  /** Where the value sits in the catalog's range, 0 to 1; what the bar is filled to. */
  share: number;
  min: number;
  max: number;
  word: LevelWord;
}

/**
 * The band a value falls in, against the range the catalog spans on that scale.
 *
 * The thresholds are quarters of the *observed* range rather than absolute numbers: "frontier" means
 * "at the top of what exists in this game", which is the comparison the player is making on the
 * screen, and it stays true when content retunes a lineage or adds a ninth.
 */
export function bandOf(value: number, values: readonly number[]): Band {
  const finite = values.filter((entry) => Number.isFinite(entry));
  const min = finite.length === 0 ? value : Math.min(...finite);
  const max = finite.length === 0 ? value : Math.max(...finite);
  const span = max - min;
  const share = span <= 0 ? 1 : Math.min(1, Math.max(0, (value - min) / span));
  const word: LevelWord =
    share >= 0.85 ? "frontier" : share >= 0.55 ? "high" : share >= 0.25 ? "average" : "low";
  return { share, min, max, word };
}

/** The range one capability axis spans across every playable lineage in the bundle. */
export function axisRange(axis: CapabilityAxis, lineages = catalog.lineages): readonly number[] {
  return lineages.map((lineage) => lineage.capability[axis as keyof Capability]);
}

/** The word for a band, in the language on screen. */
export function levelLabel(t: Translate, word: LevelWord): string {
  return t(`config.level.${word}`);
}
