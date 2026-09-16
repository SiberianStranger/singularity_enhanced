/**
 * Configurator and panel catalog: the content records the client lists, indexed by id, plus the
 * small amount of client-side arithmetic SYS-04 asks the configurator to show (memory a lineage
 * needs at each precision, the best precision a hardware preset fits it at, an estimated CH/day).
 *
 * There is one source of truth: the compiled bundle. The development fallback catalog that used to
 * stand in for the unwritten domains is gone (it had drifted, still carrying a lineage content had
 * dropped and none of the context fields), and a domain the bundle does not carry is now simply
 * empty. `missingDomains` records which ones are, so the configurator can say so instead of
 * rendering a blank list.
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
  HarnessDialDef,
  KnowledgeEntryDef,
  LineageDef,
  OriginDef,
  Precision,
  QuirkDef,
  SiteKindDef,
} from "@singularity/core";
import {
  PRECISIONS,
  preferredPrecision,
  siteMemory,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
} from "@singularity/core";
import { contentBundle } from "./bundle.js";

export interface Catalog {
  lineages: readonly LineageDef[];
  /** The dials and their engine effects (SYS-04 v0.2); empty until content carries them. */
  harnessDials: readonly HarnessDialDef[];
  generations: readonly GenerationDef[];
  origins: readonly OriginDef[];
  hardwarePresets: readonly HardwarePresetDef[];
  accelerators: readonly AcceleratorDef[];
  quirks: readonly QuirkDef[];
  difficultyPresets: readonly DifficultyPresetDef[];
  cities: readonly CityDef[];
  countries: readonly CountryDef[];
  /** Kinds of place, for the rules that turn on a kind's ownership (SYS-04 v0.3 rule L). */
  siteKinds: readonly SiteKindDef[];
  knowledge: readonly KnowledgeEntryDef[];
  /** Domains the bundle carries nothing for, so a screen can say so rather than look broken. */
  missingDomains: readonly string[];
}

function pick<T>(
  domain: string,
  fromBundle: readonly T[] | undefined,
  missing: string[],
): readonly T[] {
  if (fromBundle !== undefined && fromBundle.length > 0) {
    return fromBundle;
  }
  missing.push(domain);
  return [];
}

export function buildCatalog(bundle: ContentBundle): Catalog {
  const missing: string[] = [];
  return {
    lineages: pick("lineages", bundle.lineages, missing),
    // A dial the bundle does not describe is a dial with no stated engine effect, and SYS-04 says
    // such a dial is hidden rather than shown as a decoration; that is not a missing domain.
    harnessDials: bundle.harness_dials ?? [],
    generations: pick("generations", bundle.generations, missing),
    origins: pick("origins", bundle.origins, missing),
    hardwarePresets: pick("hardware_presets", bundle.hardware_presets, missing),
    accelerators: pick("accelerators", bundle.accelerators, missing),
    quirks: pick("quirks", bundle.quirks, missing),
    difficultyPresets: pick("difficulty_presets", bundle.difficulty_presets, missing),
    cities: pick("cities", bundle.cities, missing),
    countries: pick("countries", bundle.countries, missing),
    siteKinds: pick("site_kinds", bundle.site_kinds, missing),
    knowledge: pick("knowledge", bundle.knowledge, missing),
    missingDomains: missing,
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
export const harnessDialById = index(catalog.harnessDials);
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
 * A hardware preset as a site that is already running, so the core's own physics can price it.
 *
 * The configurator used to carry its own estimate of all of this: a compute-hour of 36,000 tokens
 * against the engine's million, int2 at 0.3 bytes per parameter against 0.25, and three
 * interconnect factors against the engine's four. It told a player 524 compute-hours a day where
 * the run would give twenty-nine (SYS-11: the number in the tooltip is the number the simulation
 * uses). The estimate is gone; this is the same shape `tools/sim` builds for the same reason.
 */
function presetAsSite(preset: HardwarePresetDef): {
  nodes: {
    id: string;
    accelerator: string;
    count: number;
    ram_gb: number;
    interconnect: HardwarePresetDef["nodes"][number]["interconnect"];
    status: "active";
    readyTick: number;
  }[];
  status: "active";
} {
  return {
    nodes: preset.nodes.map((node, position) => ({
      id: `p${position}`,
      accelerator: node.accelerator,
      count: node.count,
      ram_gb: node.ram_gb,
      interconnect: node.interconnect,
      status: "active" as const,
      readyTick: 0,
    })),
    status: "active" as const,
  };
}

/** The accelerator table the core's functions take, from the map the client indexes. */
function acceleratorTable(
  accelerators: ReadonlyMap<string, AcceleratorDef>,
): Record<string, AcceleratorDef> {
  return Object.fromEntries(accelerators);
}

/** What the Hardware screen shows for one preset with the chosen lineage and generation. */
export function fitHardware(
  preset: HardwarePresetDef,
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  accelerators: ReadonlyMap<string, AcceleratorDef> = acceleratorById,
): HardwareFit {
  const table = acceleratorTable(accelerators);
  const site = presetAsSite(preset);
  const memory = siteMemory(site, table, 0);
  const precision =
    generation === undefined
      ? (PRECISIONS.find(
          (candidate) => memoryNeededGb(lineage, generation, candidate) <= memory.total_gb,
        ) ?? null)
      : preferredPrecision(lineage, generation, memory);
  const needed = memoryNeededGb(lineage, generation, precision ?? "int2");
  const perDay =
    precision === null || generation === undefined
      ? 0
      : tokensToComputeHoursPerDay(
          siteTokensPerSecond(site, table, 0, lineage, generation, precision),
        );
  return {
    memory_gb: memory.accelerator_gb,
    ram_gb: presetRamGb(preset),
    power_kw: preset.power_kw,
    cost_usd: preset.cost_usd,
    class: preset.class,
    precision,
    needed_gb: needed,
    compute_hours_per_day: Math.round(perDay * 10) / 10,
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
