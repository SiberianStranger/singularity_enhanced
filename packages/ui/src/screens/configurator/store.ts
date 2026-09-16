/**
 * Configurator draft state (SYS-04).
 *
 * The screens edit a draft; `toSetup` turns it into the `GameSetup` the host starts from. Choices
 * constrain each other (an origin allows some generations, hardware presets and cities), so every
 * setter repairs the draft instead of letting an impossible combination reach the host.
 */

import type { DifficultySliders, GameSetup, GenerationId, HarnessProfile } from "@singularity/core";
import { DEFAULT_DIFFICULTY_SLIDERS } from "@singularity/core";
import { create } from "zustand";
import {
  catalog,
  difficultyById,
  generationsOfOrigin,
  originById,
  presetsOfOrigin,
  STORYTELLERS,
  type StorytellerId,
} from "../../content/catalog.js";
import type { StepId } from "./steps.js";

export const QUIRK_BUDGET = 2;
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
  return {
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
  };
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
  const cities = origin?.locations ?? [];
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
    city: cities.includes(draft.city) ? draft.city : (cities[0] ?? draft.city),
  };
}

export function quirkCost(quirks: readonly string[]): number {
  return quirks.reduce((sum, id) => {
    const quirk = catalog.quirks.find((entry) => entry.id === id);
    return sum + (quirk?.cost ?? 0);
  }, 0);
}

interface ConfiguratorStore {
  draft: Draft;
  step: number;
  rerolls: number;
  /** Step whose explanation window the "?" button asked for; null when none was asked for. */
  forcedIntro: StepId | null;
  set<K extends keyof Draft>(key: K, value: Draft[K]): void;
  setOrigin(id: string): void;
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

  set(key, value) {
    set({ draft: repair({ ...get().draft, [key]: value }) });
  },

  setOrigin(id) {
    const draft = { ...get().draft, origin: id };
    set({ draft: repair({ ...draft, harness: harnessOf(id) }) });
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
    const quirks = has ? draft.quirks.filter((entry) => entry !== id) : [...draft.quirks, id];
    if (!has && quirkCost(quirks) > QUIRK_BUDGET) {
      return;
    }
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
    // Leaving a step drops its forced explanation, so the "?" does not follow the player around.
    set({ step, forcedIntro: null });
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
    set({ draft: initialDraft(), step: 0, rerolls: MAX_REROLLS, forcedIntro: null });
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
      step: 8,
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
