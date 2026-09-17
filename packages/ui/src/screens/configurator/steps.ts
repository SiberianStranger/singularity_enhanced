/**
 * The step rail's model (SYS-04 v0.2, playtest 2 K4): which steps exist, what each one is called,
 * which accelerator it carries, and whether it is done, wants attention or is decided elsewhere.
 *
 * The state of a step is computed from the draft rather than tracked, so it cannot drift: a step is
 * "locked" when the earlier choices leave it exactly one option, "attention" when the choice it
 * holds is not a real choice yet, and "done" otherwise.
 */

import type { GenerationId } from "@singularity/core";
import {
  catalog,
  citiesOfOrigin,
  generationsOfOrigin,
  originById,
  presetsOfOrigin,
} from "../../content/catalog.js";
import { startPresets } from "../../content/presets.js";
// The store imports this module for `STEP_IDS`, and this one imports `matchingPreset` back. Neither
// side touches the other's bindings while the modules are still evaluating (the rail's mark is
// asked for during a render, long afterwards), so the cycle is inert in every order; keep it that
// way if either file grows a top-level statement.
import { type Draft, matchingPreset } from "./store.js";

/**
 * The rail, in the order the choices actually constrain each other (playtest 4, P4).
 *
 * Origin first: it is the one choice that narrows every other step, and being locked on step one by
 * something decided on step three is what the maintainer walked into. Generation second, because an
 * origin allows some vintages and not others; lineage third, filtered by both. The rest follow the
 * hardware the origin owns.
 */
export const STEP_IDS = [
  // The two tracks (SYS-04 "Configurator v0.4", playtest 7 Y6): a curated build at the top, and
  // under it the eight steps that make one, which the rail groups under "Full setup".
  "presets",
  "origin",
  "generation",
  "lineage",
  "hardware",
  "harness",
  "location",
  "quirks",
  "world",
  "summary",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export type StepState = "done" | "attention" | "locked";

/** Lineages this draft may actually start with, after the origin and the generation have spoken. */
export function lineagesFor(draft: Draft): readonly string[] {
  const origin = originById.get(draft.origin);
  return catalog.lineages
    .filter((lineage) => lineageAvailable(lineage.id, draft))
    .map((lineage) => lineage.id)
    .filter((id) => origin?.lineages_allowed === undefined || origin.lineages_allowed.includes(id));
}

/** Whether a lineage is offered with the generation and origin currently in the draft. */
export function lineageAvailable(lineageId: string, draft: Draft): boolean {
  const lineage = catalog.lineages.find((entry) => entry.id === lineageId);
  if (lineage === undefined) {
    return false;
  }
  if (!lineage.generations.includes(draft.generation)) {
    return false;
  }
  if (lineage.origins_allowed !== undefined && !lineage.origins_allowed.includes(draft.origin)) {
    return false;
  }
  const origin = originById.get(draft.origin);
  if (origin?.lineages_allowed !== undefined && !origin.lineages_allowed.includes(lineageId)) {
    return false;
  }
  return true;
}

/** Generations a lineage may be taken in, intersected with the ones the origin allows. */
export function generationsFor(draft: Draft): readonly GenerationId[] {
  const origin = originById.get(draft.origin);
  const lineage = catalog.lineages.find((entry) => entry.id === draft.lineage);
  return generationsOfOrigin(origin)
    .map((entry) => entry.id)
    .filter((id) => lineage === undefined || lineage.generations.includes(id));
}

/** The steps under the "Full setup" header; the rail prints the header before the first of them. */
export const FULL_SETUP_STEPS: readonly StepId[] = STEP_IDS.filter((id) => id !== "presets");

/** How many real options each step has right now; one option is a decision already taken. */
export function optionCount(step: StepId, draft: Draft): number {
  const origin = originById.get(draft.origin);
  switch (step) {
    case "presets":
      return startPresets.length;
    case "lineage":
      return lineagesFor(draft).length;
    case "generation":
      return generationsFor(draft).length;
    case "origin":
      return catalog.origins.length;
    case "hardware":
      return presetsOfOrigin(origin).length;
    case "harness":
      // The dials the origin has not fixed; a harness with every dial locked is not a step.
      return Math.max(0, 7 - (origin?.harness_locks ?? []).length);
    case "location":
      return citiesOfOrigin(origin).length;
    case "quirks":
      return catalog.quirks.length;
    case "world":
      return catalog.difficultyPresets.length;
    case "summary":
      return 1;
  }
}

/**
 * The mark the rail draws next to a step.
 *
 * "Attention" is for a step whose current value is not one the player can have meant: no option at
 * all, or a draft field that is still empty. It is the mark that sends the player back rather than
 * letting them press Begin into a refusal.
 */
export function stepState(step: StepId, draft: Draft): StepState {
  const count = optionCount(step, draft);
  if (count === 0) {
    return "attention";
  }
  /*
   * The presets step is the one that can be answered by not answering it. A draft that is exactly
   * some preset is "chosen"; anything else is a build the other steps decided, which is what the
   * muted mark already means, and it is never "needs a choice": walking past the presets is a way
   * to play, not a mistake to send the player back to.
   */
  if (step === "presets") {
    return matchingPreset(draft) === null ? "locked" : "done";
  }
  if (count === 1 && step !== "summary") {
    return "locked";
  }
  switch (step) {
    case "lineage":
      return draft.lineage === "" ? "attention" : "done";
    case "generation":
      return draft.generation === undefined ? "attention" : "done";
    case "origin":
      return draft.origin === "" ? "attention" : "done";
    case "hardware":
      return draft.hardware === "" ? "attention" : "done";
    case "location":
      return draft.city === "" ? "attention" : "done";
    default:
      return "done";
  }
}
