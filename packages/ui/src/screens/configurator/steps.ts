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
import type { Draft } from "./store.js";

export const STEP_IDS = [
  "lineage",
  "generation",
  "origin",
  "hardware",
  "harness",
  "location",
  "quirks",
  "world",
  "summary",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/**
 * One accelerator per step, chosen so that no two are the same and none collides with the footer
 * (Back, randoM build, Reroll, Next/begiN). `test/configurator.test.tsx` asserts the uniqueness on
 * the rendered screen rather than trusting this table.
 */
export const STEP_HOTKEYS: Readonly<Record<StepId, string>> = {
  lineage: "l",
  generation: "g",
  origin: "o",
  hardware: "h",
  harness: "e",
  location: "c",
  quirks: "q",
  world: "w",
  summary: "s",
};

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

/** How many real options each step has right now; one option is a decision already taken. */
export function optionCount(step: StepId, draft: Draft): number {
  const origin = originById.get(draft.origin);
  switch (step) {
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
