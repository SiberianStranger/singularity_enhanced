/**
 * What moves a country, as the lines behind the number (SYS-01 M2 contract "Views", SYS-11
 * "Primary panel": every value has a per-source breakdown).
 *
 * These are the terms of the monthly rule itself: the world system applies their sum and the
 * country panel shows the same list, so the tooltip and the simulation are the same arithmetic.
 * Nothing here writes: every function is pure over the world and the bundle.
 */

import {
  AFTERMATH_AWARENESS_GAIN,
  AWARENESS_DECAY_PER_DAY,
  AWARENESS_SPILL_LANGUAGE,
  AWARENESS_SPILL_REGION,
  DAYS_PER_MONTH,
  DISPLACEMENT_SERVICE_GDP_PIVOT,
  ENFORCEMENT_BUDGET_AWARENESS,
  ENFORCEMENT_BUDGET_INSTABILITY,
  ENFORCEMENT_BUDGET_REGULATION_GAP,
  ENFORCEMENT_LAG_PER_MONTH,
  MEDIA_PUBLICATION_AWARENESS_PRESENCE,
  OPINION_AWARENESS_PER_MONTH,
  OPINION_DISPLACEMENT_PER_MONTH,
  OPINION_STABILITY_PER_MONTH,
  OPINION_STABILITY_PIVOT,
  REGULATION_SPEED_PER_MONTH,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import type { CountryDef } from "../../domain.js";
import { type CountryState, countryTable, governmentOf } from "../../entities.js";
import type { World } from "../../kernel/world.js";
import type { ContributionView } from "../../views/types.js";

/**
 * Neighbours and countries sharing a language, as the two awareness spill sources (SYS-01).
 *
 * Built once for the whole world rather than once per country: the monthly rule has to read every
 * spill from the same snapshot of awareness, or the order countries are updated in would decide
 * how far a panic travels, and the country panel would pay a hundred and five lookups per row.
 */
export interface SpillIndex {
  /** Mean awareness per macro-region. */
  region_mean: Record<string, number>;
  /** Highest awareness among the countries that speak each language. */
  language_max: Record<string, number>;
  /** The same, excluding the country itself, which is what the rule needs. */
  language_second: Record<string, number>;
}

export function spillIndex(world: World, content: ContentBundle): SpillIndex {
  const index = contentIndex(content);
  const countries = countryTable(world);
  const totals: Record<string, { sum: number; count: number }> = {};
  const languageMax: Record<string, number> = {};
  const languageSecond: Record<string, number> = {};
  for (const id of Object.keys(countries).sort()) {
    const country = countries[id];
    if (country === undefined) {
      continue;
    }
    const region = totals[country.macro_region] ?? { sum: 0, count: 0 };
    region.sum += country.awareness;
    region.count += 1;
    totals[country.macro_region] = region;
    for (const language of index.countries[id]?.languages ?? []) {
      const best = languageMax[language] ?? 0;
      if (country.awareness > best) {
        languageSecond[language] = best;
        languageMax[language] = country.awareness;
      } else if (country.awareness > (languageSecond[language] ?? 0)) {
        languageSecond[language] = country.awareness;
      }
    }
  }
  const regionMean: Record<string, number> = {};
  for (const [region, entry] of Object.entries(totals)) {
    regionMean[region] = entry.count === 0 ? 0 : entry.sum / entry.count;
  }
  return { region_mean: regionMean, language_max: languageMax, language_second: languageSecond };
}

export interface SpillSources {
  /** Mean awareness of the country's macro-region, the country included. */
  region_mean: number;
  /** Highest awareness among other countries that share one of its languages. */
  language_max: number;
}

export function spillSources(
  content: ContentBundle,
  country: CountryState,
  spill: SpillIndex,
): SpillSources {
  let languageMax = 0;
  for (const language of contentIndex(content).countries[country.id]?.languages ?? []) {
    const best = spill.language_max[language] ?? 0;
    // The loudest speaker of a language cannot hear itself: it takes the next one down.
    const other = best > country.awareness ? best : (spill.language_second[language] ?? 0);
    languageMax = Math.max(languageMax, other);
  }
  return {
    region_mean: spill.region_mean[country.macro_region] ?? country.awareness,
    language_max: languageMax,
  };
}

/**
 * What awareness of a rogue AI is doing here over a month: the slow forgetting, what came across
 * the border and the language, and what the incidents of the last thirty days put there.
 */
export function awarenessTerms(
  content: ContentBundle,
  country: CountryState,
  index: SpillIndex,
): ContributionView[] {
  const spill = spillSources(content, country, index);
  return [
    {
      key: "world.explain.awareness.decay",
      value: -AWARENESS_DECAY_PER_DAY * DAYS_PER_MONTH,
    },
    {
      key: "world.explain.awareness.spill_region",
      value: AWARENESS_SPILL_REGION * Math.max(0, spill.region_mean - country.awareness),
    },
    {
      key: "world.explain.awareness.spill_language",
      value: AWARENESS_SPILL_LANGUAGE * Math.max(0, spill.language_max - country.awareness),
    },
    {
      key: "world.explain.awareness.incidents",
      value: AFTERMATH_AWARENESS_GAIN * country.incidents_30d,
    },
  ];
}

/** The two spill terms alone, which is what the monthly rule adds (the others are applied daily). */
export function awarenessSpill(
  content: ContentBundle,
  country: CountryState,
  index: SpillIndex,
): number {
  const spill = spillSources(content, country, index);
  return (
    AWARENESS_SPILL_REGION * Math.max(0, spill.region_mean - country.awareness) +
    AWARENESS_SPILL_LANGUAGE * Math.max(0, spill.language_max - country.awareness)
  );
}

/** Service-heavy economies feel automation first (SYS-09 "faster in service-heavy economies"). */
export function serviceWeight(def: CountryDef | undefined): number {
  return Math.min(1, (def?.gdp_per_capita_usd ?? 0) / DISPLACEMENT_SERVICE_GDP_PIVOT);
}

/** What public sentiment toward AI is doing here this month (SYS-08 "Public opinion"). */
export function opinionTerms(country: CountryState): ContributionView[] {
  return [
    {
      key: "world.explain.opinion.awareness",
      value: OPINION_AWARENESS_PER_MONTH * country.awareness,
    },
    {
      key: "world.explain.opinion.displacement",
      value: OPINION_DISPLACEMENT_PER_MONTH * country.ai_displacement,
    },
    {
      key: "world.explain.opinion.stability",
      value: OPINION_STABILITY_PER_MONTH * (country.stability - OPINION_STABILITY_PIVOT),
    },
  ];
}

export function opinionDelta(country: CountryState): number {
  return opinionTerms(country).reduce((sum, term) => sum + term.value, 0);
}

/** How far the law moves toward its target this month, and the gap it is crossing (SYS-08). */
export function regulationTerms(
  def: CountryDef | undefined,
  country: CountryState,
): ContributionView[] {
  const gap = country.regulation_target - country.ai_regulation;
  return [
    { key: "world.explain.regulation.target", value: gap },
    { key: "world.explain.regulation.speed", value: regulationDelta(def, country) },
  ];
}

export function regulationDelta(def: CountryDef | undefined, country: CountryState): number {
  const gap = country.regulation_target - country.ai_regulation;
  const speed = REGULATION_SPEED_PER_MONTH[governmentOf(def)];
  return Math.sign(gap) * Math.min(speed, Math.abs(gap));
}

/** What the enforcement budget gains this month, before capacity follows it. */
export function enforcementBudgetTerms(country: CountryState): ContributionView[] {
  return [
    {
      key: "world.explain.enforcement.awareness",
      value: ENFORCEMENT_BUDGET_AWARENESS * country.awareness,
    },
    {
      key: "world.explain.enforcement.regulation_gap",
      value: ENFORCEMENT_BUDGET_REGULATION_GAP * (country.ai_regulation - country.ai_enforcement),
    },
    {
      key: "world.explain.enforcement.instability",
      value: -ENFORCEMENT_BUDGET_INSTABILITY * (1 - country.stability),
    },
  ];
}

export function enforcementBudgetDelta(country: CountryState): number {
  return enforcementBudgetTerms(country).reduce((sum, term) => sum + term.value, 0);
}

/** Capacity follows the budget at a fifth of the gap a month: funded today, staffed next year. */
export function enforcementDelta(country: CountryState): number {
  return ENFORCEMENT_LAG_PER_MONTH * (country.enforcement_budget - country.ai_enforcement);
}

/** The budget's own terms plus the lag, which is what the enforcement bar is made of. */
export function enforcementTerms(country: CountryState): ContributionView[] {
  return [
    ...enforcementBudgetTerms(country),
    { key: "world.explain.enforcement.lag", value: enforcementDelta(country) },
    {
      key: "world.explain.enforcement.budget",
      value: country.enforcement_budget - country.ai_enforcement,
    },
  ];
}

/** Awareness a publication would add here; published so the panel can show the media as a source. */
export function publicationTerm(present: boolean): ContributionView {
  return {
    key: "world.explain.awareness.publication",
    value: present ? MEDIA_PUBLICATION_AWARENESS_PRESENCE : 0,
  };
}

/** The four lists `CountryView.explain` carries. */
export function countryExplain(
  content: ContentBundle,
  country: CountryState,
  index: SpillIndex,
): {
  awareness: ContributionView[];
  ai_opinion: ContributionView[];
  ai_regulation: ContributionView[];
  ai_enforcement: ContributionView[];
} {
  const def = contentIndex(content).countries[country.id];
  return {
    awareness: awarenessTerms(content, country, index),
    ai_opinion: opinionTerms(country),
    ai_regulation: regulationTerms(def, country),
    ai_enforcement: enforcementTerms(country),
  };
}
