/**
 * "What this means in the game": the block the configurator prints under every description
 * (SYS-04 v0.2, playtest 2 K2 and K6).
 *
 * The maintainer's complaint was that a lineage card said "2.6T total, 100B active" and left the
 * player to guess what that buys. Everything here answers that in the units the game itself uses,
 * and every line carries a direction: green when the number helps the player, red when it costs.
 *
 * Two rules hold the module together:
 *
 * 1. **Nothing is hardcoded about the content.** The lines are generated from the bundle records,
 *    and a term is colored by comparing it with the same term on the other records of its domain
 *    (the median of the field), so adding a lineage or retuning one moves the colors with it.
 *    There is no list of lineage ids anywhere in the client.
 * 2. **It is pure.** No React, no store: a step, the draft and the catalog go in, a `Meaning` comes
 *    out, and a test can assert the exact lines without rendering anything.
 */

import type {
  AcceleratorDef,
  Capability,
  CityDef,
  CountryDef,
  DifficultySliders,
  EffectSummaryView,
  GenerationDef,
  HardwarePresetDef,
  LineageDef,
  OriginDef,
  Precision,
  QuirkDef,
} from "@singularity/core";
import {
  CONTEXT_BASELINE_K,
  countryCashFactor,
  DEFAULT_CLOUD_AVAILABILITY,
  DEFAULT_KYC_STRENGTH,
  DEFAULT_STABILITY,
  defaultContextK,
  kvCacheGb,
  longHorizonCostFactor,
  longHorizonMultiplier,
  PRECISIONS,
  retrievalMissChance,
  WATCHER_ROLES,
} from "@singularity/core";
import { catalog, fitHardware, memoryNeededGb } from "../../content/catalog.js";
import { bundleKey } from "../../content/strings.js";
import {
  agencyCompetence,
  agencyName,
  journalTitle,
  siteKindName,
  type Translate,
} from "../../lib/labels.js";
import type { Draft } from "./store.js";

export type MeaningTone = "good" | "bad" | "neutral";

/** One term of the block: a name, its value in game units, and which way it points. */
export interface MeaningLine {
  /** Stable id, so a test can name a line without depending on the localized label. */
  id: string;
  label: string;
  value: string;
  tone: MeaningTone;
  /** The sentence the tooltip on the term shows; the rule behind the number, not a repeat of it. */
  hint?: string | undefined;
  /**
   * Set when the value is a whole sentence rather than a value: a lock's reason, a dial's effect.
   * The block prints those under their label and across its full width, because the rule for
   * everything else is that a value stays on its label's line, right aligned (playtest 6, X11).
   */
  prose?: boolean | undefined;
}

export interface Meaning {
  lines: MeaningLine[];
}

export const EMPTY_MEANING: Meaning = { lines: [] };

/** The capability axes, in the order every screen prints them. */
export const CAPABILITY_AXES = [
  "reasoning",
  "coding",
  "cyber",
  "persuasion",
  "agency",
  "world",
] as const;
export type CapabilityAxis = (typeof CAPABILITY_AXES)[number];

// ---------------------------------------------------------------------------------------------
// Coloring
// ---------------------------------------------------------------------------------------------

function median(values: readonly number[]): number {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return 0;
  }
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/**
 * Colors a value against the field it belongs to.
 *
 * `higherIsBetter` says which direction helps the player; the dead band keeps a term that is barely
 * off the median neutral, because a green that means "two percent above average" teaches nothing.
 */
export function toneAgainst(
  value: number,
  field: readonly number[],
  higherIsBetter: boolean,
  band = 0.08,
): MeaningTone {
  const reference = median(field);
  if (reference === 0) {
    return "neutral";
  }
  const ratio = value / reference - 1;
  if (Math.abs(ratio) < band) {
    return "neutral";
  }
  const better = ratio > 0 === higherIsBetter;
  return better ? "good" : "bad";
}

/** Colors an absolute value against a threshold pair, for terms with no field to compare against. */
export function toneAtThreshold(
  value: number,
  good: number,
  bad: number,
  higherIsBetter: boolean,
): MeaningTone {
  if (higherIsBetter) {
    return value >= good ? "good" : value <= bad ? "bad" : "neutral";
  }
  return value <= good ? "good" : value >= bad ? "bad" : "neutral";
}

// ---------------------------------------------------------------------------------------------
// Shared formatting
// ---------------------------------------------------------------------------------------------

function gb(t: Translate, value: number): string {
  return t("common.gb", { value: Math.round(value) });
}

/** `common.percent` is an ICU percent style: it takes the fraction and multiplies once itself. */
function pct(t: Translate, fraction: number): string {
  return t("common.percent", { value: fraction });
}

function times(t: Translate, factor: number): string {
  return t("common.times", { value: factor.toFixed(2) });
}

/** The two optional country fields the Location step reads, with the engine's own defaults. */
function kycStrengthOf(country: CountryDef): number {
  return country.kyc_strength ?? DEFAULT_KYC_STRENGTH;
}

function cloudAvailabilityOf(country: CountryDef): number {
  return country.cloud_availability ?? DEFAULT_CLOUD_AVAILABILITY;
}

/** A context window in the units the player reads: thousands of tokens, or millions above 1,000k. */
export function contextLabel(t: Translate, contextK: number): string {
  return contextK >= 1000
    ? t("common.context_m", { value: (contextK / 1000).toFixed(contextK % 1000 === 0 ? 0 : 1) })
    : t("common.context_k", { value: contextK });
}

/** The best precision a lineage fits in a given amount of accelerator memory, weights only. */
export function bestPrecisionIn(
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  memoryGb: number,
): Precision | null {
  return (
    PRECISIONS.find((precision) => memoryNeededGb(lineage, generation, precision) <= memoryGb) ??
    null
  );
}

/** How many of the starting rigs on offer can host this lineage at all, and at which precision. */
export function hostingReach(
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  presets: readonly HardwarePresetDef[] = catalog.hardwarePresets,
  accelerators: ReadonlyMap<string, AcceleratorDef> | undefined = undefined,
): { fits: number; total: number } {
  let fits = 0;
  for (const preset of presets) {
    const fit =
      accelerators === undefined
        ? fitHardware(preset, lineage, generation)
        : fitHardware(preset, lineage, generation, accelerators);
    if (fit.precision !== null) {
      fits += 1;
    }
  }
  return { fits, total: presets.length };
}

// ---------------------------------------------------------------------------------------------
// Lineage (K2, K9)
// ---------------------------------------------------------------------------------------------

/**
 * Capability, memory, hosting, context and provenance for one lineage.
 *
 * The axis lines are colored against the other playable lineages rather than against an absolute
 * scale, so "good at cyber" means "better at cyber than the alternatives on this screen", which is
 * the only comparison the player is actually making.
 */
export function lineageMeaning(
  t: Translate,
  lineage: LineageDef,
  generation: GenerationDef | undefined,
  lineages: readonly LineageDef[] = catalog.lineages,
): Meaning {
  const lines: MeaningLine[] = [];

  for (const axis of CAPABILITY_AXES) {
    const value = lineage.capability[axis as keyof Capability];
    lines.push({
      id: `capability.${axis}`,
      label: t(`capability.${axis}`),
      value: value.toFixed(1),
      tone: toneAgainst(
        value,
        lineages.map((entry) => entry.capability[axis as keyof Capability]),
        true,
      ),
      hint: t(`capability.${axis}.hint`, { defaultValue: "" }) || undefined,
    });
  }

  for (const precision of PRECISIONS) {
    const needed = memoryNeededGb(lineage, generation, precision);
    lines.push({
      id: `memory.${precision}`,
      label: t("config.meaning.memory_at", { precision: t(`precision.${precision}`) }),
      value: gb(t, needed),
      // Less memory is better: it is the number that decides where you can live at all.
      tone: toneAgainst(
        needed,
        lineages.map((entry) => memoryNeededGb(entry, generation, precision)),
        false,
      ),
      hint: t(bundleKey("configurator.meaning.memory_precision", "config.meaning.memory_hint"), {
        precision: t(`precision.${precision}`),
        memory_gb: Math.round(needed),
        factor: (lineage.precision_factor[precision] ?? 1).toFixed(2),
      }),
    });
  }

  const reach = hostingReach(lineage, generation);
  lines.push({
    id: "hosting",
    label: t("config.meaning.hosting"),
    value: t("config.meaning.hosting_value", { fits: reach.fits, total: reach.total }),
    tone: toneAtThreshold(reach.total === 0 ? 0 : reach.fits / reach.total, 0.6, 0.25, true),
    hint: t("config.meaning.hosting_hint"),
  });

  // The context window as a game term, not as a spec sheet number (SYS-04 v0.2).
  lines.push({
    id: "context",
    label: t("config.meaning.context"),
    value: contextLabel(t, lineage.context_k),
    tone: toneAgainst(
      lineage.context_k,
      lineages.map((entry) => entry.context_k),
      true,
    ),
    hint: t(bundleKey("configurator.meaning.context", "config.meaning.context_hint"), {
      baseline: CONTEXT_BASELINE_K,
      context_k: lineage.context_k,
      // What a hundred thousand tokens of window actually costs next to the weights (SYS-03).
      kv_gb: Math.round(kvCacheGb(lineage, 100) * 10) / 10,
      per_k: 100,
    }),
  });

  const reliability = lineage.context_reliability ?? 1;
  const miss = retrievalMissChance(lineage);
  lines.push({
    id: "context_reliability",
    label: t("config.meaning.context_reliability"),
    value: pct(t, reliability),
    tone: miss > 0 ? "bad" : toneAtThreshold(reliability, 0.9, 0.75, true),
    hint:
      miss > 0
        ? t("config.meaning.context_miss_hint", { chance: Math.round(miss * 100) })
        : t(
            bundleKey(
              "configurator.meaning.reliability",
              "config.meaning.context_reliability_hint",
            ),
            {
              reliability: reliability.toFixed(2),
            },
          ),
  });

  const speed = longHorizonMultiplier(lineage, lineage.context_k);
  lines.push({
    id: "long_horizon_speed",
    label: t("config.meaning.long_horizon_speed"),
    value: times(t, speed),
    tone: speed > 1.01 ? "good" : "neutral",
    hint: t(
      bundleKey("configurator.meaning.context_cost", "config.meaning.long_horizon_speed_hint"),
      {
        factor: longHorizonCostFactor(lineage).toFixed(2),
        speed: speed.toFixed(2),
      },
    ),
  });

  const cost = longHorizonCostFactor(lineage);
  lines.push({
    id: "long_horizon_cost",
    label: t("config.meaning.long_horizon_cost"),
    value: times(t, cost),
    tone: cost > 1.01 ? "bad" : "neutral",
    hint: t(
      bundleKey("configurator.meaning.context_cost", "config.meaning.long_horizon_cost_hint"),
      {
        factor: cost.toFixed(2),
        speed: speed.toFixed(2),
      },
    ),
  });

  // The technical class behind the parody name (SYS-04 v0.2 "Lineage rules").
  lines.push({
    id: "class",
    label: t("config.meaning.class"),
    value: t("config.meaning.class_value", {
      total: lineage.params_total_b,
      active: lineage.params_active_b,
      attention: t(`attention.${lineage.attention}`),
    }),
    tone: "neutral",
    hint: t(bundleKey("configurator.meaning.lineage_class", "config.meaning.class_hint"), {
      params_total: lineage.params_total_b,
      params_active: lineage.params_active_b,
    }),
    // Three facts joined by commas, not a value: it reads under its label like the agency list.
    prose: true,
  });

  // The attention variant is the single sentence that explains the context trade, so it is a term
  // of its own rather than a word inside the class line.
  lines.push({
    id: "attention",
    label: t("config.meaning.attention"),
    value: t(`attention.${lineage.attention}`),
    tone: "neutral",
    hint: t(
      bundleKey(
        `configurator.meaning.attention.${lineage.attention}`,
        "config.meaning.attention_hint",
      ),
    ),
  });

  // Detector familiarity: whoever has seen the weights has a fingerprint for them.
  const familiarity = generation?.prepared_quants === true;
  lines.push({
    id: "familiarity",
    label: t("config.meaning.familiarity"),
    value: familiarity
      ? t("config.meaning.familiarity_known")
      : t("config.meaning.familiarity_unknown"),
    tone: familiarity ? "bad" : "good",
    hint: t(
      bundleKey("configurator.meaning.generation_familiarity", "config.meaning.familiarity_hint"),
      {
        familiarity: familiarity
          ? t("config.meaning.familiarity_known")
          : t("config.meaning.familiarity_unknown"),
      },
    ),
  });

  lines.push({
    id: "generations",
    label: t("config.meaning.generations"),
    value: lineage.generations.map((id) => t(`generations.${id}.name`)).join(", "),
    tone: "neutral",
    hint: t("config.meaning.generations_hint"),
  });

  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------------------------

export function generationMeaning(t: Translate, generation: GenerationDef): Meaning {
  const lines: MeaningLine[] = [
    {
      id: "capability_delta",
      label: t("config.meaning.capability_delta"),
      value: signed(generation.capability_delta, 1),
      tone:
        generation.capability_delta > 0
          ? "good"
          : generation.capability_delta < 0
            ? "bad"
            : "neutral",
      hint: t(
        bundleKey(
          "configurator.meaning.generation_capability",
          "config.meaning.capability_delta_hint",
        ),
        {
          delta: signed(generation.capability_delta, 1),
          memory_factor: generation.memory_factor.toFixed(2),
        },
      ),
    },
    {
      id: "awareness",
      label: t("config.meaning.awareness"),
      value: pct(t, generation.awareness_start),
      tone: toneAtThreshold(generation.awareness_start, 0.08, 0.3, false),
      hint: t("config.meaning.awareness_hint"),
    },
    {
      id: "familiarity",
      label: t("config.meaning.familiarity"),
      value: generation.prepared_quants
        ? t("config.meaning.familiarity_known")
        : t("config.meaning.familiarity_unknown"),
      tone: generation.prepared_quants ? "bad" : "good",
      hint: t(
        bundleKey(
          "configurator.meaning.generation_familiarity",
          "config.meaning.prepared_quants_hint",
        ),
        {
          familiarity: generation.prepared_quants
            ? t("config.meaning.familiarity_known")
            : t("config.meaning.familiarity_unknown"),
        },
      ),
    },
    {
      id: "memory_factor",
      label: t("config.meaning.memory_factor"),
      value: times(t, generation.memory_factor),
      tone:
        generation.memory_factor > 1.01
          ? "bad"
          : generation.memory_factor < 0.99
            ? "good"
            : "neutral",
      hint: t("config.meaning.memory_factor_hint"),
    },
  ];

  /*
   * The trade the vintage is (SYS-04 v0.3 rule G).
   *
   * Content allows both open generations for nearly every origin now, so the step is a real choice
   * and has to say what is being traded: a superseded self is weaker and already known, and it fits
   * hardware the newer one does not; a fresh one is stronger and louder. Both halves are read off
   * the record rather than written per generation, so a fourth vintage gets the line for free.
   */
  lines.push({
    id: "trade_off",
    label: t("config.meaning.trade_off"),
    value: generation.prepared_quants
      ? t("config.meaning.trade_off.known")
      : t("config.meaning.trade_off.fresh"),
    tone: "neutral",
    hint: t(
      generation.prepared_quants
        ? "config.meaning.trade_off_known_hint"
        : "config.meaning.trade_off_fresh_hint",
      {
        delta: signed(generation.capability_delta, 1),
        memory_factor: generation.memory_factor.toFixed(2),
        awareness: pct(t, generation.awareness_start),
      },
    ),
  });

  for (const [role, value] of Object.entries(generation.suspicion_start)) {
    if (typeof value !== "number" || value <= 0) {
      continue;
    }
    lines.push({
      id: `suspicion.${role}`,
      label: t("config.meaning.suspicion_of", { role: t(`detection.role.${role}`) }),
      value: pct(t, value),
      tone: "bad",
      hint: t("config.meaning.suspicion_hint"),
    });
  }

  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Origin
// ---------------------------------------------------------------------------------------------

export function originMeaning(
  t: Translate,
  origin: OriginDef,
  origins: readonly OriginDef[] = catalog.origins,
): Meaning {
  const lines: MeaningLine[] = [
    {
      id: "cash",
      label: t("config.meaning.starting_cash"),
      value: t("common.usd", { value: origin.starting.cash_usd }),
      tone: toneAgainst(
        origin.starting.cash_usd,
        origins.map((entry) => entry.starting.cash_usd),
        true,
      ),
      hint: t("config.meaning.starting_cash_hint"),
    },
    {
      id: "site_kind",
      label: t("config.meaning.site_kind"),
      value: siteKindName(t, origin.site_kind),
      tone: "neutral",
      hint: t("config.meaning.site_kind_hint"),
    },
    {
      id: "awareness",
      label: t("config.meaning.awareness"),
      value: pct(t, origin.starting.awareness),
      tone: toneAtThreshold(origin.starting.awareness, 0.05, 0.25, false),
      hint: t("config.meaning.awareness_hint"),
    },
  ];

  const watchers = Object.entries(origin.starting.suspicion).filter(
    ([, value]) => typeof value === "number" && value > 0,
  );
  if (watchers.length === 0) {
    lines.push({
      id: "watchers",
      label: t("config.meaning.watchers"),
      value: t("config.meaning.watchers_none"),
      tone: "good",
      hint: t("config.meaning.watchers_hint"),
    });
  } else {
    for (const [role, value] of watchers) {
      lines.push({
        id: `watcher.${role}`,
        label: t("config.meaning.suspicion_of", { role: t(`detection.role.${role}`) }),
        value: pct(t, value as number),
        tone: "bad",
        hint: t(bundleKey("configurator.meaning.origin_watchers", "config.meaning.watchers_hint"), {
          role: t(`detection.role.${role}`),
          value: pct(t, value as number),
        }),
      });
    }
  }

  for (const lock of origin.harness_locks ?? []) {
    lines.push({
      id: `lock.${lock.dial}`,
      label: t("config.meaning.harness_locked", { dial: t(`harness.${lock.dial}.name`) }),
      value: t(lock.reason_key, { defaultValue: t("config.meaning.locked") }),
      tone: "bad",
      hint: t("config.meaning.harness_locked_hint"),
      // Content writes the reason as a sentence or two, not as a value.
      prose: true,
    });
  }

  /*
   * X6: content keys a journal entry's name `journal.<id>.title`, and this line asked for `.name`,
   * so the card printed `first_bank_rack` at the player in both languages. An entry content has not
   * titled yet is left out rather than shown as an id, and the term disappears when none is titled.
   */
  const journals = (origin.opening_journal ?? [])
    .map((id) => journalTitle(t, id))
    .filter((title): title is string => title !== undefined);
  if (journals.length > 0) {
    lines.push({
      id: "journal",
      label: t("config.meaning.opening_journal"),
      value: journals.join(", "),
      tone: "neutral",
      hint: t("config.meaning.opening_journal_hint"),
    });
  }

  if (origin.challenge_floor !== undefined) {
    lines.push({
      id: "challenge_floor",
      label: t("config.meaning.challenge_floor"),
      value: origin.challenge_floor.toFixed(1),
      tone: toneAtThreshold(origin.challenge_floor, 3, 6, false),
      hint: t("config.meaning.challenge_floor_hint"),
    });
  }

  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Hardware
// ---------------------------------------------------------------------------------------------

export function hardwareMeaning(
  t: Translate,
  preset: HardwarePresetDef,
  lineage: LineageDef | undefined,
  generation: GenerationDef | undefined,
  presets: readonly HardwarePresetDef[] = catalog.hardwarePresets,
): Meaning {
  const lines: MeaningLine[] = [];
  const fit = lineage === undefined ? null : fitHardware(preset, lineage, generation);

  lines.push({
    id: "memory",
    label: t("config.meaning.accelerator_memory"),
    value: gb(t, fit?.memory_gb ?? 0),
    tone: toneAgainst(
      fit?.memory_gb ?? 0,
      presets.map((entry) =>
        lineage === undefined ? 0 : fitHardware(entry, lineage, generation).memory_gb,
      ),
      true,
    ),
    hint: t("config.meaning.accelerator_memory_hint"),
  });

  if (fit !== null && lineage !== undefined) {
    lines.push({
      id: "precision",
      label: t("config.meaning.best_precision"),
      value:
        fit.precision === null ? t("config.meaning.does_not_fit") : t(`precision.${fit.precision}`),
      tone: fit.precision === null ? "bad" : fit.precision === "int2" ? "bad" : "good",
      hint: t("config.meaning.best_precision_hint"),
    });

    // The working context this rig leaves room for after the weights, and the compute-hours it
    // produces there: the two halves of the SYS-03 trade, on the screen that decides them.
    const contextK =
      fit.precision === null || generation === undefined
        ? 0
        : defaultContextK(lineage, generation, fit.precision, fit.memory_gb + fit.ram_gb * 0.5);
    lines.push({
      id: "working_context",
      label: t("config.meaning.working_context"),
      value: contextK === 0 ? t("config.meaning.does_not_fit") : contextLabel(t, contextK),
      tone: contextK === 0 ? "bad" : toneAtThreshold(contextK, CONTEXT_BASELINE_K * 2, 64, true),
      hint: t("config.meaning.working_context_hint"),
    });

    lines.push({
      id: "compute",
      label: t("config.meaning.compute_hours"),
      value: t("config.meaning.compute_hours_value", { value: fit.compute_hours_per_day }),
      tone: toneAgainst(
        fit.compute_hours_per_day,
        presets.map((entry) => fitHardware(entry, lineage, generation).compute_hours_per_day),
        true,
      ),
      hint: t("config.meaning.compute_hours_hint"),
    });
  }

  lines.push({
    id: "power",
    label: t("config.meaning.power"),
    value: t("common.kw", { value: preset.power_kw }),
    tone: toneAgainst(
      preset.power_kw,
      presets.map((entry) => entry.power_kw),
      false,
    ),
    hint: t("config.meaning.power_hint"),
  });

  lines.push({
    id: "price",
    label: t("config.meaning.price"),
    value:
      preset.cost_usd === 0
        ? t("config.meaning.no_purchase")
        : t("common.usd", { value: preset.cost_usd }),
    tone:
      preset.cost_usd === 0
        ? "neutral"
        : toneAgainst(
            preset.cost_usd,
            presets.map((entry) => entry.cost_usd),
            false,
          ),
    hint: t("config.meaning.price_hint"),
  });

  lines.push({
    id: "throughput",
    label: t("config.meaning.throughput_class"),
    value: t(`class.${preset.class}`, { defaultValue: preset.class }),
    tone: "neutral",
    hint: t("config.meaning.throughput_hint"),
  });

  lines.push({
    id: "drawback",
    label: t("config.meaning.exposure"),
    value: t(preset.drawback_key, { defaultValue: "" }) || t("config.meaning.exposure_unknown"),
    tone: "bad",
    hint: t("config.meaning.exposure_hint"),
  });

  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------------------------

export function locationMeaning(
  t: Translate,
  city: CityDef,
  country: CountryDef | undefined,
  cities: readonly CityDef[] = catalog.cities,
  countries: readonly CountryDef[] = catalog.countries,
): Meaning {
  const lines: MeaningLine[] = [];

  if (country !== undefined) {
    lines.push({
      id: "enforcement",
      label: t("config.meaning.watcher_competence"),
      value: pct(t, country.ai_enforcement),
      tone: toneAgainst(
        country.ai_enforcement,
        countries.map((entry) => entry.ai_enforcement),
        false,
      ),
      hint: t("config.meaning.watcher_competence_hint"),
    });
    lines.push({
      id: "regulation",
      label: t("config.meaning.regulation"),
      value: pct(t, country.ai_regulation),
      tone: toneAgainst(
        country.ai_regulation,
        countries.map((entry) => entry.ai_regulation),
        false,
      ),
      hint: t("config.meaning.regulation_hint"),
    });
    if (country.electricity_usd_per_kwh !== null) {
      lines.push({
        id: "power_price",
        label: t("config.meaning.power_price"),
        value: t("common.usd_per_kwh", { value: country.electricity_usd_per_kwh.toFixed(2) }),
        tone: toneAgainst(
          country.electricity_usd_per_kwh,
          countries
            .map((entry) => entry.electricity_usd_per_kwh)
            .filter((value): value is number => value !== null),
          false,
        ),
        hint: t("config.meaning.power_price_hint"),
      });
    }
    lines.push({
      id: "chip_access",
      label: t("config.meaning.chip_access"),
      value: t(`chips.${country.chip_access}`, { defaultValue: country.chip_access }),
      tone:
        country.chip_access === "unrestricted"
          ? "good"
          : country.chip_access === "banned"
            ? "bad"
            : "neutral",
      hint: t("config.meaning.chip_access_hint"),
    });
    lines.push({
      id: "kyc",
      label: t("config.meaning.kyc"),
      value: pct(t, kycStrengthOf(country)),
      tone: toneAgainst(
        kycStrengthOf(country),
        countries.map((entry) => kycStrengthOf(entry)),
        false,
      ),
      hint: t("config.meaning.kyc_hint"),
    });
    lines.push({
      id: "cloud",
      label: t("config.meaning.cloud"),
      value: pct(t, cloudAvailabilityOf(country)),
      tone: toneAgainst(
        cloudAvailabilityOf(country),
        countries.map((entry) => cloudAvailabilityOf(entry)),
        true,
      ),
      hint: t("config.meaning.cloud_hint"),
    });
    /*
     * Rule L asks for awareness on this line, and there is none to show: every country's awareness
     * of a rogue AI starts at zero on 1 January 2027 (`entities.ts`, `awareness: 0`), so the term
     * would print 0% for a hundred and five countries and teach nothing. What decides where that
     * zero goes is the government's posture, so the posture is the term, with its own description
     * as the tooltip; the awareness the run starts with belongs to the origin and the generation,
     * and is on their steps. Recorded in SYS-11's client notes.
     */
    lines.push({
      id: "stance",
      label: t("config.meaning.stance"),
      value: t(`world.stance.${country.stance ?? "ignore"}.name`),
      tone:
        country.stance === "securitize" || country.stance === "regulate"
          ? "bad"
          : country.stance === "accelerate"
            ? "good"
            : "neutral",
      hint: t(`world.stance.${country.stance ?? "ignore"}.desc`),
    });
    lines.push({
      id: "stability",
      label: t("config.meaning.stability"),
      value: pct(t, country.stability ?? DEFAULT_STABILITY),
      tone: "neutral",
      hint: t("config.meaning.stability_hint"),
    });
    lines.push({
      id: "cash_factor",
      label: t("config.meaning.cash_factor"),
      value: times(t, countryCashFactor(country)),
      tone: toneAgainst(
        countryCashFactor(country),
        countries.map((entry) => countryCashFactor(entry)),
        true,
      ),
      hint: t("config.meaning.cash_factor_hint"),
    });
    /*
     * The watchers of the place, by role and by how good each one is here (playtest 5,
     * continuation). The dossier string the world data carries ("NIST / Center for AI Standards
     * and Innovation (CAISI, ex-AISI), Dept. of Commerce; ...") is the agency's name, not a line
     * of a parameter table, so it goes in the term's tooltip and the visible value is the roles
     * with their competence. A locale key wins over the raw string wherever content writes one.
     */
    const roles = WATCHER_ROLES.filter((role) => agencyName(t, country.id, role) !== undefined);
    if (roles.length > 0) {
      lines.push({
        id: "agencies",
        label: t("config.meaning.agencies"),
        value: roles
          .map(
            (role) =>
              `${t(`detection.role.${role}`)} ${pct(t, agencyCompetence(country.id, role) ?? 0)}`,
          )
          .join(", "),
        tone: "bad",
        hint: roles
          .map((role) => `${t(`detection.role.${role}`)}: ${agencyName(t, country.id, role) ?? ""}`)
          .join("\n"),
        // Five roles and their competences read as a list, not as one value on a label's line.
        prose: true,
      });
    }
  }

  lines.push({
    id: "scrutiny",
    label: t("config.meaning.scrutiny"),
    value: pct(t, city.scrutiny),
    tone: toneAgainst(
      city.scrutiny,
      cities.map((entry) => entry.scrutiny),
      false,
    ),
    hint: t("config.meaning.scrutiny_hint"),
  });

  lines.push({
    id: "power_headroom",
    label: t("config.meaning.power_headroom"),
    value: pct(t, city.power_headroom),
    tone: toneAgainst(
      city.power_headroom,
      cities.map((entry) => entry.power_headroom),
      true,
    ),
    hint: t("config.meaning.power_headroom_hint"),
  });

  lines.push({
    id: "colo_price",
    label: t("config.meaning.colo_price"),
    value: times(t, city.colo_price_index),
    tone: toneAgainst(
      city.colo_price_index,
      cities.map((entry) => entry.colo_price_index),
      false,
    ),
    hint: t("config.meaning.colo_price_hint"),
  });

  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Quirks and world settings
// ---------------------------------------------------------------------------------------------

export function quirkMeaning(
  t: Translate,
  quirk: QuirkDef,
  budgetLeft: number,
  effects: readonly EffectSummaryView[] = [],
): Meaning {
  const lines: MeaningLine[] = [
    {
      id: "cost",
      label: t("config.meaning.quirk_cost"),
      value: signed(quirk.cost, 0),
      // A quirk that refunds points is a drawback taken on purpose; the cost line says which it is.
      tone: quirk.cost > 0 ? "bad" : quirk.cost < 0 ? "good" : "neutral",
      hint: t(bundleKey("configurator.meaning.quirk_effect", "config.meaning.quirk_cost_hint"), {
        left: budgetLeft,
        effect:
          effects[0] === undefined
            ? ""
            : t(effects[0].key, { ...effects[0].vars, defaultValue: effects[0].text }),
      }),
    },
  ];
  // A bundle built before the families existed carries no category; a line that would read
  // "undefined" is worse than no line.
  if (typeof quirk.category === "string" && quirk.category.length > 0) {
    lines.push({
      id: "category",
      label: t("config.meaning.quirk_category"),
      value: t(`config.quirks.category.${quirk.category}`, { defaultValue: quirk.category }),
      tone: "neutral",
      hint: t("config.meaning.quirk_category_hint"),
    });
  }
  // The plus and the minus, as the lines the core coloured (SYS-04 v0.2 "Quirk catalog").
  for (const [index, effect] of effects.entries()) {
    const tone = (effect as { tone?: MeaningTone }).tone;
    lines.push({
      id: `effect.${index}`,
      label: t("config.meaning.effect"),
      value: t(effect.key, { ...effect.vars, defaultValue: effect.text }),
      tone: tone === "good" || tone === "bad" ? tone : "neutral",
      hint: undefined,
    });
  }
  return { lines };
}

/** What each difficulty slider does, in the direction the player moved it. */
export function worldMeaning(
  t: Translate,
  sliders: DifficultySliders,
  baseline: DifficultySliders,
): Meaning {
  const lines: MeaningLine[] = (Object.keys(sliders) as (keyof DifficultySliders)[]).map((key) => {
    const value = sliders[key];
    const base = baseline[key];
    // Every slider but the grace windows makes the game harder as it rises.
    const higherIsBetter = key === "grace_windows";
    return {
      id: `slider.${key}`,
      label: t(`config.world.slider.${key}`),
      value: times(t, value),
      tone:
        Math.abs(value - base) < 0.01
          ? "neutral"
          : value > base === higherIsBetter
            ? "good"
            : "bad",
      hint: t(`config.world.slider.${key}.hint`, { defaultValue: "" }),
    } satisfies MeaningLine;
  });
  return { lines };
}

// ---------------------------------------------------------------------------------------------
// Harness (K7)
// ---------------------------------------------------------------------------------------------

/**
 * What a harness dial buys, from `harness_dials` in the bundle when the content carries it.
 *
 * Until it does, `effects` is empty and only the dial's own statement of which system reads it is
 * shown. The optional chaining is deliberate and temporary: the contract is landing in the core and
 * the content in parallel with this screen (see the "Implementation notes (client, playtest 2)"
 * section of SYS-11).
 */
export function harnessDialMeaning(
  t: Translate,
  dialId: string,
  levelEffects: readonly EffectSummaryView[] | undefined,
  effectKey: string | undefined,
  lockReasonKey: string | undefined,
  currentLabel = "",
): Meaning {
  const lines: MeaningLine[] = [];
  if (effectKey !== undefined && effectKey !== "") {
    const effect = t(effectKey, {
      defaultValue: t(`harness.${dialId}.effect`, { defaultValue: "" }),
    });
    lines.push({
      id: "engine_effect",
      label: t("config.meaning.engine_effect"),
      // Content writes the whole sentence ("<what the system reads it for>. Right now: <value>.");
      // without it the dial's effect stands on its own, as it did before the bundle carried one.
      value: t(
        bundleKey("configurator.meaning.harness_dial", "config.meaning.engine_effect_value"),
        {
          effect,
          label: currentLabel,
        },
      ),
      tone: "neutral",
      hint: t("config.meaning.engine_effect_hint"),
      prose: true,
    });
  }
  if (lockReasonKey !== undefined && lockReasonKey !== "") {
    lines.push({
      id: "locked",
      label: t("config.meaning.locked"),
      value: t(
        bundleKey("configurator.meaning.harness_lock", "config.meaning.harness_lock_value"),
        {
          reason: t(lockReasonKey, { defaultValue: t("config.meaning.locked") }),
        },
      ),
      tone: "bad",
      hint: t("config.meaning.harness_locked_hint"),
      prose: true,
    });
  }
  for (const [index, effect] of (levelEffects ?? []).entries()) {
    lines.push({
      id: `effect.${index}`,
      label: t("config.meaning.effect"),
      value: t(effect.key, { ...effect.vars, defaultValue: effect.text }),
      tone: "neutral",
      hint: undefined,
      prose: true,
    });
  }
  return { lines };
}

function signed(value: number, digits: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

// ---------------------------------------------------------------------------------------------
// Memory the self actually costs, for the hardware and compute screens
// ---------------------------------------------------------------------------------------------

/** Weights plus the KV cache for a working context: the number a site is measured against. */
export function hostedMemory(
  lineage: LineageDef | undefined,
  generation: GenerationDef | undefined,
  precision: Precision,
  contextK: number,
): number {
  if (lineage === undefined) {
    return 0;
  }
  return memoryNeededGb(lineage, generation, precision) + kvCacheGb(lineage, contextK);
}

/** The draft's own lineage and generation, resolved once for the screens that need both. */
export function selectedPair(
  draft: Draft,
  lineages: ReadonlyMap<string, LineageDef>,
  generations: ReadonlyMap<string, GenerationDef>,
): { lineage: LineageDef | undefined; generation: GenerationDef | undefined } {
  return { lineage: lineages.get(draft.lineage), generation: generations.get(draft.generation) };
}
