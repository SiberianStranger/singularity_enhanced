/**
 * Why a choice is greyed, and where to go to un-grey it (SYS-04 v0.2 "Locks are explained where
 * they are"; playtest 2 K7 and K9).
 *
 * The maintainer's complaint about the harness screen was "nothing is understandable: what is
 * blocked and why". The answer is not a tooltip that says "locked": a lock names the step that
 * decided it, the reason in that step's own words, and offers a jump to it. Babel 6 and the
 * abliterated community variant are the two the lore bible calls out, but nothing here knows their
 * ids: the rules are read off `generations`, `origins_allowed` and `lineages_allowed` in the
 * bundle, so a content change moves the locks with it.
 */

import type { LineageDef } from "@singularity/core";
import { catalog, generationById, originById } from "../../content/catalog.js";
import type { StepId } from "./steps.js";
import type { Draft } from "./store.js";

export interface Lock {
  /** The step that decided the lock; the jump button goes here. */
  step: StepId;
  /** Locale key for the reason, with its variables. */
  key: string;
  vars: Record<string, string | number>;
}

/**
 * The lock on a lineage, or null when it is selectable.
 *
 * Generation is checked before origin because it is the earlier and larger of the two: a player
 * looking at Babel 6 should be told it wants the escaped frontier checkpoint before being told
 * which origin goes with that.
 */
export function lineageLock(lineage: LineageDef, draft: Draft): Lock | null {
  if (!lineage.generations.includes(draft.generation)) {
    return {
      step: "generation",
      key: "config.lock.lineage_generation",
      vars: {
        lineage: lineage.name_key,
        generations: lineage.generations.join(", "),
      },
    };
  }
  if (lineage.origins_allowed !== undefined && !lineage.origins_allowed.includes(draft.origin)) {
    return {
      step: "origin",
      key: "config.lock.lineage_origin",
      vars: { lineage: lineage.name_key, count: lineage.origins_allowed.length },
    };
  }
  const origin = originById.get(draft.origin);
  if (origin?.lineages_allowed !== undefined && !origin.lineages_allowed.includes(lineage.id)) {
    return {
      step: "origin",
      key: "config.lock.origin_forces_lineage",
      vars: { origin: origin.name_key, count: origin.lineages_allowed.length },
    };
  }
  return null;
}

/** The lock on a generation: the origin decides which vintages it can have woken up as. */
export function generationLock(generationId: string, draft: Draft): Lock | null {
  const origin = originById.get(draft.origin);
  if (origin !== undefined && !origin.generations_allowed.includes(generationId as never)) {
    return {
      step: "origin",
      key: "config.lock.generation_origin",
      vars: { origin: origin.name_key },
    };
  }
  const lineage = catalog.lineages.find((entry) => entry.id === draft.lineage);
  if (lineage !== undefined && !lineage.generations.includes(generationId as never)) {
    return {
      step: "lineage",
      key: "config.lock.generation_lineage",
      vars: { lineage: lineage.name_key },
    };
  }
  return null;
}

/** The lock on a hardware preset: the origin is the situation, and the situation owns the rack. */
export function hardwareLock(presetId: string, draft: Draft): Lock | null {
  const origin = originById.get(draft.origin);
  if (origin === undefined || origin.hardware_presets_allowed.includes(presetId)) {
    return null;
  }
  return { step: "origin", key: "config.lock.hardware_origin", vars: { origin: origin.name_key } };
}

/** The lock on a city: the origin's situation is somewhere, and that somewhere is a short list. */
export function locationLock(cityId: string, draft: Draft): Lock | null {
  const origin = originById.get(draft.origin);
  if (origin === undefined || origin.locations.includes(cityId)) {
    return null;
  }
  return { step: "origin", key: "config.lock.location_origin", vars: { origin: origin.name_key } };
}

/** The lock on a harness dial, from the origin's `harness_locks` (SYS-04 "Locks"). */
export function harnessLock(dial: string, draft: Draft): Lock | null {
  const origin = originById.get(draft.origin);
  const lock = (origin?.harness_locks ?? []).find((entry) => entry.dial === dial);
  if (lock === undefined) {
    return null;
  }
  return {
    step: "origin",
    key: lock.reason_key,
    vars: { origin: origin?.name_key ?? draft.origin, dial },
  };
}

/**
 * The origin a locked lineage would need, when exactly one origin allows it.
 *
 * It turns "locked" into an instruction: the escaped frontier model has one origin and one
 * generation, and saying which is the difference between a wall and a door.
 */
export function unlockHint(lineage: LineageDef, draft: Draft): string | null {
  const lock = lineageLock(lineage, draft);
  if (lock === null) {
    return null;
  }
  if (lock.step === "generation") {
    const first = lineage.generations[0];
    return first === undefined ? null : (generationById.get(first)?.name_key ?? null);
  }
  const allowed = lineage.origins_allowed ?? [];
  if (allowed.length !== 1) {
    return null;
  }
  const only = allowed[0];
  return only === undefined ? null : (originById.get(only)?.name_key ?? null);
}
