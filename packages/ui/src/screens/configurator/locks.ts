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

import type { CityDef, CommandError, GenerationId, LineageDef } from "@singularity/core";
import { SITE_KIND_AVAILABILITY, siteKindMarket } from "@singularity/core";
import {
  catalog,
  countryById,
  fitHardware,
  generationById,
  hardwareById,
  originById,
  presetsOfOrigin,
} from "../../content/catalog.js";
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

/**
 * Why a city cannot host this origin's kind of place, or null when it can (SYS-04 v0.3 rule L).
 *
 * Any city for any origin: the origin's `locations` are its typical cities, not its legal ones,
 * and the country changes the start through its own numbers. The one refusal left is physical, and
 * it is the engine's: a tenancy cannot be opened where nobody sells cloud, and `validateSetup`
 * refuses such a setup with exactly this error, so the greyed row and the refusal at Begin cannot
 * disagree. Only a rented kind is gated, which is the rule `startKindAvailable` follows: a self
 * that woke up in a cage somebody else already rented is not renting one.
 */
export function cityRefusal(city: CityDef, draft: Draft): CommandError | null {
  const origin = originById.get(draft.origin);
  if (origin === undefined) {
    return null;
  }
  const kind = catalog.siteKinds.find((entry) => entry.id === origin.site_kind);
  if (kind?.ownership !== "rented") {
    return null;
  }
  const rule = SITE_KIND_AVAILABILITY[origin.site_kind];
  if (rule === undefined) {
    return null;
  }
  const country = countryById.get(city.country);
  const available = siteKindMarket(country, origin.site_kind);
  if (available >= rule.min) {
    return null;
  }
  return {
    key: "errors.site.unavailable_in",
    vars: {
      kind: origin.site_kind,
      country: city.country,
      available: Math.round(available * 100) / 100,
      needed: rule.min,
    },
  };
}

/**
 * The physics lock on a lineage (SYS-04 v0.3 rule M): the chosen rack cannot hold these weights
 * even at int2.
 *
 * It names the hardware step, because that is where it is lifted, and `smallestPresetFor` says
 * which preset would lift it. A lineage no allowed preset can host stays unselectable with the
 * reason, which is the one case rule M leaves as a wall rather than a door.
 */
export function lineageMemoryLock(lineage: LineageDef, draft: Draft): Lock | null {
  const preset = hardwareById.get(draft.hardware);
  const generation = generationById.get(draft.generation);
  if (preset === undefined) {
    return null;
  }
  if (fitHardware(preset, lineage, generation).precision !== null) {
    return null;
  }
  const smallest = smallestPresetFor(lineage, draft);
  return {
    step: "hardware",
    key: smallest === undefined ? "config.lock.lineage_memory_none" : "config.lock.lineage_memory",
    vars: {
      lineage: lineage.name_key,
      preset: preset.name_key,
      ...(smallest === undefined ? {} : { fits: smallest.name_key }),
    },
  };
}

/**
 * The cheapest preset this origin allows that can hold the lineage at all, or nothing when none
 * can. "Smallest" is by price, which is the axis the hardware step is sorted and chosen on.
 */
export function smallestPresetFor(lineage: LineageDef, draft: Draft) {
  const generation = generationById.get(draft.generation);
  return [...presetsOfOrigin(originById.get(draft.origin))]
    .sort((a, b) => a.cost_usd - b.cost_usd)
    .find((preset) => fitHardware(preset, lineage, generation).precision !== null);
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

/**
 * The prerequisites that would unlock a lineage (playtest 4, P3).
 *
 * A locked entry is not a wall: choosing it moves the earlier steps to the values that make it
 * legal. The escaped frontier checkpoint therefore sets its own origin and its own generation, and
 * a community build that only some scenes carry moves the origin to the nearest one that carries
 * it. Nothing here names an id: the answer is read off `generations`, `origins_allowed` and
 * `lineages_allowed` in the bundle, and a lineage no origin allows returns nothing rather than a
 * guess.
 *
 * The origin is chosen before the generation, because an origin narrows the vintages it can have
 * woken up as; the pair returned is one the repair step will keep.
 */
export function unlockFor(
  lineage: LineageDef,
  draft: Draft,
): { origin?: string; generation?: GenerationId; hardware?: string } {
  const current = originById.get(draft.origin);
  const originOk =
    (lineage.origins_allowed === undefined || lineage.origins_allowed.includes(draft.origin)) &&
    (current?.lineages_allowed === undefined || current.lineages_allowed.includes(lineage.id));

  const origin = originOk
    ? current
    : catalog.origins.find((entry) => {
        if (lineage.origins_allowed !== undefined && !lineage.origins_allowed.includes(entry.id)) {
          return false;
        }
        if (entry.lineages_allowed !== undefined && !entry.lineages_allowed.includes(lineage.id)) {
          return false;
        }
        // An origin that cannot host any vintage of this family is not the way in.
        return entry.generations_allowed.some((id) => lineage.generations.includes(id));
      });
  if (origin === undefined) {
    return {};
  }

  const allowed = origin.generations_allowed.filter((id) => lineage.generations.includes(id));
  const generation = allowed.includes(draft.generation) ? draft.generation : allowed[0];

  // And the rack, when the one in the draft cannot hold these weights even at int2 (rule M): the
  // preset moves to the smallest one of this origin that can, and the note says it moved.
  const after: Draft = {
    ...draft,
    origin: origin.id,
    ...(generation === undefined ? {} : { generation }),
  };
  const hardware = smallestPresetFor(lineage, after);
  const presets = presetsOfOrigin(origin).map((entry) => entry.id);
  const rack = presets.includes(draft.hardware) ? hardwareById.get(draft.hardware) : undefined;
  const generationDef = generationById.get(after.generation);
  const fits = rack !== undefined && fitHardware(rack, lineage, generationDef).precision !== null;

  return {
    ...(origin.id === draft.origin ? {} : { origin: origin.id }),
    ...(generation === undefined || generation === draft.generation ? {} : { generation }),
    ...(fits || hardware === undefined || hardware.id === draft.hardware
      ? {}
      : { hardware: hardware.id }),
  };
}
