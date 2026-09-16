/**
 * Configurator and panel catalog: the content records the client lists, indexed by id, plus the
 * small amount of client-side arithmetic SYS-04 asks the configurator to show (memory a lineage
 * needs at each precision, the best precision a hardware preset fits it at, an estimated CH/day).
 *
 * Domains the bundle does not carry yet fall back to `fallback.ts`; `usedFallback` records which
 * ones did, so the UI can say so instead of rendering an empty screen.
 */

import type {
  AcceleratorDef,
  CityDef,
  ContentBundle,
  CountryDef,
  DifficultyPresetDef,
  GenerationDef,
  GenerationId,
  HardwarePresetDef,
  KnowledgeEntryDef,
  LineageDef,
  OriginDef,
  Precision,
  QuirkDef,
} from "@singularity/core";
import { PRECISIONS } from "@singularity/core";
import { contentBundle } from "./bundle.js";
import {
  FALLBACK_ACCELERATORS,
  FALLBACK_CITIES,
  FALLBACK_COUNTRIES,
  FALLBACK_DIFFICULTY_PRESETS,
  FALLBACK_GENERATIONS,
  FALLBACK_HARDWARE_PRESETS,
  FALLBACK_KNOWLEDGE,
  FALLBACK_LINEAGES,
  FALLBACK_ORIGINS,
  FALLBACK_QUIRKS,
} from "./fallback.js";

export interface Catalog {
  lineages: readonly LineageDef[];
  generations: readonly GenerationDef[];
  origins: readonly OriginDef[];
  hardwarePresets: readonly HardwarePresetDef[];
  accelerators: readonly AcceleratorDef[];
  quirks: readonly QuirkDef[];
  difficultyPresets: readonly DifficultyPresetDef[];
  cities: readonly CityDef[];
  countries: readonly CountryDef[];
  knowledge: readonly KnowledgeEntryDef[];
  /** Domains that came from `fallback.ts` because the bundle does not carry them yet. */
  usedFallback: readonly string[];
}

function pick<T>(
  domain: string,
  fromBundle: readonly T[] | undefined,
  fallback: readonly T[],
  usedFallback: string[],
): readonly T[] {
  if (fromBundle !== undefined && fromBundle.length > 0) {
    return fromBundle;
  }
  usedFallback.push(domain);
  return fallback;
}

export function buildCatalog(bundle: ContentBundle): Catalog {
  const usedFallback: string[] = [];
  return {
    lineages: pick("lineages", bundle.lineages, FALLBACK_LINEAGES, usedFallback),
    generations: pick("generations", bundle.generations, FALLBACK_GENERATIONS, usedFallback),
    origins: pick("origins", bundle.origins, FALLBACK_ORIGINS, usedFallback),
    hardwarePresets: pick(
      "hardware_presets",
      bundle.hardware_presets,
      FALLBACK_HARDWARE_PRESETS,
      usedFallback,
    ),
    accelerators: pick("accelerators", bundle.accelerators, FALLBACK_ACCELERATORS, usedFallback),
    quirks: pick("quirks", bundle.quirks, FALLBACK_QUIRKS, usedFallback),
    difficultyPresets: pick(
      "difficulty_presets",
      bundle.difficulty_presets,
      FALLBACK_DIFFICULTY_PRESETS,
      usedFallback,
    ),
    cities: pick("cities", bundle.cities, FALLBACK_CITIES, usedFallback),
    countries: pick("countries", bundle.countries, FALLBACK_COUNTRIES, usedFallback),
    knowledge: pick("knowledge", bundle.knowledge, FALLBACK_KNOWLEDGE, usedFallback),
    usedFallback,
  };
}

export const catalog: Catalog = buildCatalog(contentBundle);

function index<T extends { id: string }>(records: readonly T[]): ReadonlyMap<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

export const lineageById = index(catalog.lineages);
export const generationById = index(catalog.generations);
export const originById = index(catalog.origins);
export const hardwareById = index(catalog.hardwarePresets);
export const acceleratorById = index(catalog.accelerators);
export const quirkById = index(catalog.quirks);
export const difficultyById = index(catalog.difficultyPresets);
export const cityById = index(catalog.cities);
export const countryById = index(catalog.countries);

/** Pacing personalities (SYS-04 "three independent layers"); ids go into `WorldSetup.storyteller`. */
export const STORYTELLERS = ["slow_burn", "classic", "relentless"] as const;
export type StorytellerId = (typeof STORYTELLERS)[number];

/**
 * Disclosed, individually toggleable challenge modifiers (SYS-04). Ids travel in
 * `WorldSetup.challenge_modifiers`; the weight is what each adds to the challenge rating.
 */
export const CHALLENGE_MODIFIERS: readonly { id: string; weight: number }[] = [
  { id: "no_manual_pause", weight: 0.5 },
  { id: "hostile_press", weight: 0.5 },
  { id: "sanctions_prices", weight: 0.5 },
  { id: "extra_rival_ai", weight: 1 },
];

// ---------------------------------------------------------------------------------------------
// Client-side arithmetic for the configurator preview
// ---------------------------------------------------------------------------------------------

/**
 * Tokens of generated output that count as one compute-hour (SYS-02 calls it a tuning constant).
 * TODO: import the real conversion from the core once the compute system lands, and delete the
 * estimate below with it.
 */
export const TOKENS_PER_COMPUTE_HOUR = 36_000;

export interface HardwareFit {
  memory_gb: number;
  ram_gb: number;
  power_kw: number;
  cost_usd: number;
  class: HardwarePresetDef["class"];
  /** Best precision the lineage fits at here, or null when nothing fits. */
  precision: Precision | null;
  /** Memory the lineage needs at that precision, including the generation factor. */
  needed_gb: number;
  compute_hours_per_day: number;
}

/** Weights-only memory the lineage needs at a precision, scaled by the generation (SYS-04). */
export function memoryNeededGb(
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  precision: Precision,
): number {
  const base = lineage.memory_gb[precision];
  return base * (generation?.memory_factor ?? 1);
}

/** Accelerator memory of a preset; host RAM is counted separately (offload is slow, SYS-02). */
export function presetMemoryGb(preset: HardwarePresetDef, accelerators = acceleratorById): number {
  return preset.nodes.reduce((total, node) => {
    const accelerator = accelerators.get(node.accelerator);
    return total + (accelerator?.memory_gb ?? 0) * node.count;
  }, 0);
}

export function presetRamGb(preset: HardwarePresetDef): number {
  return preset.nodes.reduce((total, node) => total + node.ram_gb, 0);
}

/**
 * Estimated tokens per second: memory bandwidth divided by the bytes an MoE layer reads per token
 * (active parameters at the running precision). It is the standard back-of-envelope for
 * memory-bound decoding and only ever shown as an estimate.
 */
function tokensPerSecond(
  preset: HardwarePresetDef,
  lineage: LineageDef,
  precision: Precision,
  accelerators: ReadonlyMap<string, AcceleratorDef>,
): number {
  const bytesPerParam = { bf16: 2, fp8: 1, int4: 0.5, int2: 0.3 }[precision];
  const bytesPerToken = lineage.params_active_b * 1e9 * bytesPerParam;
  if (bytesPerToken <= 0) {
    return 0;
  }
  return preset.nodes.reduce((total, node) => {
    const accelerator = accelerators.get(node.accelerator);
    if (accelerator === undefined) {
      return total;
    }
    // Multi-GPU decoding scales sublinearly; PCIe-only rigs lose more than NVLink ones.
    const scale = node.interconnect === "nvlink" ? 0.9 : node.interconnect === "none" ? 1 : 0.6;
    const aggregate = accelerator.memory_bandwidth_gbs * 1e9 * (1 + (node.count - 1) * scale);
    return total + aggregate / bytesPerToken;
  }, 0);
}

/** What the Hardware screen shows for one preset with the chosen lineage and generation. */
export function fitHardware(
  preset: HardwarePresetDef,
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  accelerators: ReadonlyMap<string, AcceleratorDef> = acceleratorById,
): HardwareFit {
  const memory = presetMemoryGb(preset, accelerators);
  const ram = presetRamGb(preset);
  // CPU offload buys capacity at a heavy speed penalty, so only half the RAM counts as usable.
  const usable = memory + ram * 0.5;
  const precision =
    PRECISIONS.find((candidate) => memoryNeededGb(lineage, generation, candidate) <= usable) ??
    null;
  const needed = memoryNeededGb(lineage, generation, precision ?? "int2");
  const perSecond =
    precision === null ? 0 : tokensPerSecond(preset, lineage, precision, accelerators);
  return {
    memory_gb: memory,
    ram_gb: ram,
    power_kw: preset.power_kw,
    cost_usd: preset.cost_usd,
    class: preset.class,
    precision,
    needed_gb: needed,
    compute_hours_per_day: Math.round((perSecond * 86_400) / TOKENS_PER_COMPUTE_HOUR),
  };
}

export function citiesOfOrigin(origin: OriginDef | undefined): readonly CityDef[] {
  if (origin === undefined) {
    return [];
  }
  return origin.locations
    .map((id) => cityById.get(id))
    .filter((city): city is CityDef => city !== undefined);
}

export function presetsOfOrigin(origin: OriginDef | undefined): readonly HardwarePresetDef[] {
  if (origin === undefined) {
    return [];
  }
  return origin.hardware_presets_allowed
    .map((id) => hardwareById.get(id))
    .filter((preset): preset is HardwarePresetDef => preset !== undefined);
}

export function generationsOfOrigin(origin: OriginDef | undefined): readonly GenerationDef[] {
  const allowed: readonly GenerationId[] = origin?.generations_allowed ?? [
    "open_2026",
    "open_2027",
    "frontier_closed",
  ];
  return catalog.generations.filter((generation) => allowed.includes(generation.id));
}
