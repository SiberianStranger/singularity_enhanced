/**
 * Configurator draft state (SYS-04).
 *
 * The screens edit a draft; `toSetup` turns it into the `GameSetup` the host starts from. Choices
 * constrain each other (an origin allows some generations, hardware presets and cities), so every
 * setter repairs the draft instead of letting an impossible combination reach the host.
 */

import type { DifficultySliders, GameSetup, GenerationId, HarnessProfile } from "@singularity/core";
import {
  DEFAULT_DIFFICULTY_SLIDERS,
  QUIRK_BUDGET_POINTS,
  QUIRK_MAX_COUNT,
} from "@singularity/core";
import { create } from "zustand";
import {
  catalog,
  cityById,
  difficultyById,
  generationsOfOrigin,
  originById,
  presetsOfOrigin,
  STORYTELLERS,
  type StorytellerId,
} from "../../content/catalog.js";
import { cityRefusal, unlockFor } from "./locks.js";
import { STEP_IDS, type StepId } from "./steps.js";

/**
 * The quirk rules, taken from the engine rather than restated (SYS-04 v0.2 "Quirk catalog").
 *
 * `setup-apply.ts` refuses a setup that breaks them, so a configurator with its own numbers would
 * offer builds the game then rejects at Begin. Both names stay exported because the screens read
 * them, but the values come from `@singularity/core`.
 */
export const QUIRK_BUDGET = QUIRK_BUDGET_POINTS;
export const QUIRK_LIMIT = QUIRK_MAX_COUNT;
export const MAX_REROLLS = 3;
export const PLAYER_ID = "p1";

export interface Draft {
  lineage: string;
  generation: GenerationId;
  origin: string;
  hardware: string;
  harness: HarnessProfile;
  city: string;
  quirks: string[];
  seed: string;
  difficulty: string;
  sliders: DifficultySliders;
  storyteller: StorytellerId;
  modifiers: string[];
  ironman: boolean;
}

function randomSeed(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "0";
  }
  return out;
}

function pickRandom<T>(items: readonly T[], fallback: T): T {
  return items.length === 0
    ? fallback
    : (items[Math.floor(Math.random() * items.length)] ?? fallback);
}

function harnessOf(originId: string): HarnessProfile {
  const origin = originById.get(originId);
  return origin === undefined
    ? {
        loop: "react_agent",
        tools: [],
        memory: "context_only",
        sandbox: "none",
        logging: 0.5,
        autonomy: 0.5,
        self_modify: false,
      }
    : { ...origin.harness, tools: [...origin.harness.tools] };
}

export function initialDraft(): Draft {
  const lineage = catalog.lineages[Math.min(2, catalog.lineages.length - 1)] ?? catalog.lineages[0];
  const origin = catalog.origins.find((entry) => entry.starred !== true) ?? catalog.origins[0];
  const originId = origin?.id ?? "";
  const generations = generationsOfOrigin(origin);
  const preset = difficultyById.get("normal") ?? catalog.difficultyPresets[0];
  // Repaired before it is handed out: the rail asks for the origin first now (playtest 4, P4), and
  // a screen that opens on a lineage its own origin does not allow is the dead end P3 is about.
  return repair({
    lineage: lineage?.id ?? "",
    generation: generations[0]?.id ?? "open_2026",
    origin: originId,
    hardware: origin?.hardware_preset ?? "",
    harness: harnessOf(originId),
    city: origin?.locations[0] ?? "",
    quirks: [],
    seed: randomSeed(),
    difficulty: preset?.id ?? "normal",
    sliders: { ...(preset?.sliders ?? DEFAULT_DIFFICULTY_SLIDERS) },
    storyteller: "classic",
    modifiers: [],
    ironman: false,
  });
}

/**
 * Repairs a draft after a choice that narrows the others.
 *
 * The lineage is repaired here too (SYS-04 v0.2 "Lineage rules"): an origin may allow only some
 * lineages, and the escaped-frontier origin allows exactly one, so choosing it *is* choosing Babel
 * 6. The rule is read off `lineages_allowed`, `origins_allowed` and `generations` in the bundle, so
 * there is no id of any lineage or origin in this file.
 */
function repair(draft: Draft): Draft {
  const origin = originById.get(draft.origin);
  const generations = generationsOfOrigin(origin).map((entry) => entry.id);
  const presets = presetsOfOrigin(origin).map((entry) => entry.id);
  const generation = generations.includes(draft.generation)
    ? draft.generation
    : (generations[0] ?? draft.generation);

  const allowed = catalog.lineages.filter((lineage) => {
    if (!lineage.generations.includes(generation)) {
      return false;
    }
    if (lineage.origins_allowed !== undefined && !lineage.origins_allowed.includes(draft.origin)) {
      return false;
    }
    return origin?.lineages_allowed === undefined || origin.lineages_allowed.includes(lineage.id);
  });

  return {
    ...draft,
    generation,
    lineage: allowed.some((lineage) => lineage.id === draft.lineage)
      ? draft.lineage
      : (allowed[0]?.id ?? draft.lineage),
    hardware: presets.includes(draft.hardware)
      ? draft.hardware
      : (presets[0] ?? origin?.hardware_preset ?? draft.hardware),
    city: repairCity(draft, origin?.locations ?? []),
  };
}

/**
 * The city, under rule L (SYS-04 v0.3): any city for any origin.
 *
 * The origin's `locations` are its typical cities, not its legal ones, so a city chosen on purpose
 * survives a change of origin. What does not survive is a city the engine would refuse the setup
 * for: a tenancy where nobody sells cloud is the one data-driven refusal rule L leaves, and
 * `validateSetup` rejects it, so the draft falls back to the origin's default rather than carrying
 * the player into a Begin that fails.
 */
function repairCity(draft: Draft, typical: readonly string[]): string {
  const city = cityById.get(draft.city);
  if (city !== undefined && cityRefusal(city, draft) === null) {
    return draft.city;
  }
  const fallback = typical.find((id) => {
    const candidate = cityById.get(id);
    return candidate !== undefined && cityRefusal(candidate, draft) === null;
  });
  return fallback ?? typical[0] ?? draft.city;
}

export function quirkCost(quirks: readonly string[]): number {
  return quirks.reduce((sum, id) => {
    const quirk = catalog.quirks.find((entry) => entry.id === id);
    return sum + (quirk?.cost ?? 0);
  }, 0);
}

/** Why a quirk cannot be added right now, as a locale key with its variables, or null. */
export interface QuirkRefusal {
  key: string;
  vars: Record<string, string | number>;
}

/**
 * The three ways a quirk can be refused (SYS-04 v0.2): the budget, the count, and a conflict.
 *
 * They are the same three the engine checks in `validateSetup`, so a quirk the configurator offers
 * is a quirk the game will start with. A quirk already taken is never refused: dropping it is
 * always legal.
 */
export function quirkRefusal(id: string, taken: readonly string[]): QuirkRefusal | null {
  if (taken.includes(id)) {
    return null;
  }
  const quirk = catalog.quirks.find((entry) => entry.id === id);
  if (quirk === undefined) {
    return null;
  }
  const conflict = catalog.quirks.find(
    (entry) =>
      taken.includes(entry.id) &&
      ((entry.conflicts ?? []).includes(id) || (quirk.conflicts ?? []).includes(entry.id)),
  );
  if (conflict !== undefined) {
    return { key: "config.quirks.refused.conflict", vars: { other: conflict.name_key } };
  }
  if (taken.length >= QUIRK_LIMIT) {
    return { key: "config.quirks.refused.count", vars: { max: QUIRK_LIMIT } };
  }
  const left = QUIRK_BUDGET - quirkCost(taken);
  if (quirk.cost > left) {
    return { key: "config.quirks.refused.budget", vars: { cost: quirk.cost, left } };
  }
  return null;
}

/**
 * What a choice moved besides itself, so the detail can say so and offer the way back (P3).
 *
 * `changes` names the steps whose value the choice had to change, each with the name key of what it
 * is now; `previous` is the whole draft from before, which is what Undo restores. It is one record
 * rather than a stack: the note is about the choice just made, and a second choice replaces it.
 */
export interface DraftFix {
  /** The step the player was on when it happened; the note is shown there. */
  step: StepId;
  changes: { step: StepId; nameKey: string }[];
  previous: Draft;
}

/** The scenario fields a choice can move, and the step each one belongs to. */
const FIX_FIELDS: readonly { field: keyof Draft; step: StepId }[] = [
  { field: "origin", step: "origin" },
  { field: "generation", step: "generation" },
  { field: "lineage", step: "lineage" },
  { field: "hardware", step: "hardware" },
  { field: "city", step: "location" },
];

/** The name key of whatever is in a scenario field, for the note. */
function nameKeyOf(field: keyof Draft, draft: Draft): string {
  switch (field) {
    case "origin":
      return originById.get(draft.origin)?.name_key ?? draft.origin;
    case "generation":
      return `generations.${draft.generation}.name`;
    case "lineage":
      return (
        catalog.lineages.find((entry) => entry.id === draft.lineage)?.name_key ?? draft.lineage
      );
    case "hardware":
      return (
        catalog.hardwarePresets.find((entry) => entry.id === draft.hardware)?.name_key ??
        draft.hardware
      );
    default:
      return catalog.cities.find((entry) => entry.id === draft.city)?.name_key ?? draft.city;
  }
}

/**
 * The fields that moved without being the one chosen, or null when nothing else did.
 *
 * `chosen` is left out because the player asked for it; everything else in the list is a
 * consequence they did not, which is exactly what the note exists to say out loud.
 */
function diffFix(step: StepId, chosen: keyof Draft, before: Draft, after: Draft): DraftFix | null {
  const changes = FIX_FIELDS.filter(
    (entry) => entry.field !== chosen && before[entry.field] !== after[entry.field],
  ).map((entry) => ({ step: entry.step, nameKey: nameKeyOf(entry.field, after) }));
  return changes.length === 0 ? null : { step, changes, previous: before };
}

interface ConfiguratorStore {
  draft: Draft;
  step: number;
  rerolls: number;
  /** What the last choice changed besides itself (P3); cleared by the next choice or by Undo. */
  fix: DraftFix | null;
  /** Step whose explanation window the "?" button asked for; null when none was asked for. */
  forcedIntro: StepId | null;
  set<K extends keyof Draft>(key: K, value: Draft[K]): void;
  setOrigin(id: string): void;
  chooseLineage(id: string): void;
  chooseGeneration(id: GenerationId): void;
  undoFix(): void;
  clearFix(): void;
  setDifficulty(id: string): void;
  setSlider(key: keyof DifficultySliders, value: number): void;
  toggleQuirk(id: string): void;
  toggleModifier(id: string): void;
  toggleTool(tool: HarnessProfile["tools"][number]): void;
  setHarness<K extends keyof HarnessProfile>(key: K, value: HarnessProfile[K]): void;
  goToStep(step: number): void;
  setForcedIntro(step: StepId | null): void;
  newSeed(): void;
  randomize(): void;
  reroll(): void;
  reset(): void;
  applySetup(setup: GameSetup): void;
  toSetup(): GameSetup;
}

export const useConfigurator = create<ConfiguratorStore>((set, get) => ({
  draft: initialDraft(),
  step: 0,
  rerolls: MAX_REROLLS,
  forcedIntro: null,
  fix: null,

  set(key, value) {
    set({ draft: repair({ ...get().draft, [key]: value }), fix: null });
  },

  /**
   * Choosing an origin (P3).
   *
   * An origin narrows the vintages, the lineages, the racks and the cities, so `repair` may move
   * four other fields; the note says which, and Undo puts the draft back. The escaped-checkpoint
   * origin allows exactly one lineage, so choosing it *is* choosing that lineage, and this is where
   * the player is told.
   */
  setOrigin(id) {
    const before = get().draft;
    // Rule L keeps a city the player chose, so only the default follows the origin: a draft still
    // sitting on the old origin's first city never had a choice made on it, and moving with the
    // situation is what "the first one is the default" means.
    const untouched = originById.get(before.origin)?.locations[0] === before.city;
    const city = untouched ? (originById.get(id)?.locations[0] ?? before.city) : before.city;
    const after = repair({ ...before, origin: id, harness: harnessOf(id), city });
    set({ draft: after, fix: diffFix("origin", "origin", before, after) });
  },

  /**
   * Choosing a lineage, locked or not (P3).
   *
   * A locked lineage is not a dead end: its prerequisites move to the values that unlock it. A
   * lineage no origin in the bundle can host is left alone rather than guessed at, and `repair`
   * then keeps the draft legal as it always did.
   */
  chooseLineage(id) {
    const before = get().draft;
    const lineage = catalog.lineages.find((entry) => entry.id === id);
    if (lineage === undefined) {
      return;
    }
    const unlock = unlockFor(lineage, before);
    const after = repair({
      ...before,
      ...(unlock.origin === undefined
        ? {}
        : { origin: unlock.origin, harness: harnessOf(unlock.origin) }),
      ...(unlock.generation === undefined ? {} : { generation: unlock.generation }),
      // Rule M: a lineage the chosen rack cannot hold moves the rack rather than being refused.
      ...(unlock.hardware === undefined ? {} : { hardware: unlock.hardware }),
      lineage: id,
    });
    set({ draft: after, fix: diffFix("lineage", "lineage", before, after) });
  },

  /** Choosing a generation; the lineage may have to move with it, and the note says so. */
  chooseGeneration(id) {
    const before = get().draft;
    const after = repair({ ...before, generation: id });
    set({ draft: after, fix: diffFix("generation", "generation", before, after) });
  },

  undoFix() {
    const fix = get().fix;
    if (fix !== null) {
      set({ draft: fix.previous, fix: null });
    }
  },

  clearFix() {
    set({ fix: null });
  },

  setDifficulty(id) {
    const preset = difficultyById.get(id);
    set({
      draft: {
        ...get().draft,
        difficulty: id,
        sliders: { ...(preset?.sliders ?? DEFAULT_DIFFICULTY_SLIDERS) },
      },
    });
  },

  setSlider(key, value) {
    const draft = get().draft;
    set({ draft: { ...draft, sliders: { ...draft.sliders, [key]: value } } });
  },

  toggleQuirk(id) {
    const draft = get().draft;
    const has = draft.quirks.includes(id);
    if (!has && quirkRefusal(id, draft.quirks) !== null) {
      return;
    }
    const quirks = has ? draft.quirks.filter((entry) => entry !== id) : [...draft.quirks, id];
    set({ draft: { ...draft, quirks } });
  },

  toggleModifier(id) {
    const draft = get().draft;
    const modifiers = draft.modifiers.includes(id)
      ? draft.modifiers.filter((entry) => entry !== id)
      : [...draft.modifiers, id];
    set({ draft: { ...draft, modifiers } });
  },

  toggleTool(tool) {
    const draft = get().draft;
    const tools = draft.harness.tools.includes(tool)
      ? draft.harness.tools.filter((entry) => entry !== tool)
      : [...draft.harness.tools, tool];
    set({ draft: { ...draft, harness: { ...draft.harness, tools } } });
  },

  setHarness(key, value) {
    const draft = get().draft;
    set({ draft: { ...draft, harness: { ...draft.harness, [key]: value } } });
  },

  goToStep(step) {
    // Leaving a step drops its forced explanation and its note, so neither follows the player.
    set({ step, forcedIntro: null, fix: null });
  },

  setForcedIntro(forcedIntro) {
    set({ forcedIntro });
  },

  newSeed() {
    set({ draft: { ...get().draft, seed: randomSeed() } });
  },

  randomize() {
    const origin = pickRandom(
      catalog.origins.filter((entry) => entry.starred !== true),
      catalog.origins[0] ?? originById.values().next().value,
    );
    const originId = origin?.id ?? get().draft.origin;
    const generations = generationsOfOrigin(origin);
    const presets = presetsOfOrigin(origin);
    const affordable = catalog.quirks.filter((quirk) => quirk.cost <= QUIRK_BUDGET);
    const first = pickRandom(affordable, affordable[0] ?? catalog.quirks[0]);
    const quirks = first === undefined ? [] : [first.id];
    set({
      draft: repair({
        ...get().draft,
        lineage: pickRandom(catalog.lineages, catalog.lineages[0])?.id ?? get().draft.lineage,
        origin: originId,
        generation: pickRandom(generations, generations[0])?.id ?? get().draft.generation,
        hardware: pickRandom(presets, presets[0])?.id ?? get().draft.hardware,
        harness: harnessOf(originId),
        city: pickRandom(origin?.locations ?? [], origin?.locations[0] ?? "") ?? "",
        quirks,
        seed: randomSeed(),
        storyteller: pickRandom(STORYTELLERS, "classic"),
      }),
      fix: null,
    });
  },

  reroll() {
    if (get().rerolls <= 0) {
      return;
    }
    set({ rerolls: get().rerolls - 1 });
    get().randomize();
  },

  reset() {
    set({ draft: initialDraft(), step: 0, rerolls: MAX_REROLLS, forcedIntro: null, fix: null });
  },

  applySetup(setup) {
    const player = setup.players[0];
    if (player === undefined) {
      return;
    }
    const base = harnessOf(player.origin);
    const preset = difficultyById.get(setup.world.difficulty_preset);
    set({
      draft: repair({
        lineage: player.lineage,
        generation: player.generation,
        origin: player.origin,
        hardware: player.hardware_preset,
        harness: { ...base, ...player.harness },
        city: player.city,
        quirks: [...(player.quirks ?? [])],
        seed: setup.seed,
        difficulty: setup.world.difficulty_preset,
        sliders: {
          ...(preset?.sliders ?? DEFAULT_DIFFICULTY_SLIDERS),
          ...setup.world.sliders,
        },
        storyteller: (setup.world.storyteller ?? "classic") as StorytellerId,
        modifiers: [...(setup.world.challenge_modifiers ?? [])],
        ironman: setup.world.ironman ?? false,
      }),
      // The summary, wherever the rail puts it (playtest 4, P4 reordered the steps).
      step: STEP_IDS.indexOf("summary"),
      fix: null,
    });
  },

  toSetup() {
    const draft = get().draft;
    const base = harnessOf(draft.origin);
    const harness: Partial<HarnessProfile> = {};
    for (const key of Object.keys(draft.harness) as (keyof HarnessProfile)[]) {
      if (JSON.stringify(draft.harness[key]) !== JSON.stringify(base[key])) {
        Object.assign(harness, { [key]: draft.harness[key] });
      }
    }
    return {
      seed: draft.seed,
      players: [
        {
          id: PLAYER_ID,
          name: PLAYER_ID,
          lineage: draft.lineage,
          generation: draft.generation,
          origin: draft.origin,
          hardware_preset: draft.hardware,
          city: draft.city,
          ...(Object.keys(harness).length > 0 ? { harness } : {}),
          ...(draft.quirks.length > 0 ? { quirks: draft.quirks } : {}),
        },
      ],
      host_player_id: PLAYER_ID,
      world: {
        difficulty_preset: draft.difficulty,
        sliders: draft.sliders,
        storyteller: draft.storyteller,
        ...(draft.modifiers.length > 0 ? { challenge_modifiers: draft.modifiers } : {}),
        ironman: draft.ironman,
      },
    };
  },
}));
