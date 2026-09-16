/**
 * Every rule that turns `docs/research/world-baseline-2026.json` into a field of
 * `packages/content/data/world/*.yaml` (SYS-01 "Data (v0.2)").
 *
 * The v0 rules are the ones the committed files were built with and are restated here so the data
 * can be re-derived when the baseline is refreshed; the v0.2 rules are the M2 contract's. A rule
 * that disagrees with a hand-checked fact loses to `overrides.yaml`, which says why in a comment.
 */

import type { BaselineCountry } from "./baseline.js";

export type Government =
  | "liberal_democracy"
  | "illiberal_democracy"
  | "one_party"
  | "military"
  | "monarchy"
  | "hybrid";

export type Stance = "accelerate" | "regulate" | "securitize" | "ignore";

export type ElectionKind = "presidential" | "parliamentary" | "general" | "legislative";

export type WatcherRole =
  | "cyber_agency"
  | "intelligence"
  | "police"
  | "regulator"
  | "financial_intel";

export const WATCHER_ROLES: readonly WatcherRole[] = [
  "cyber_agency",
  "intelligence",
  "police",
  "regulator",
  "financial_intel",
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Two decimals, which is the precision every 0..1 field in the world files is written at. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Regulation in force, from `ai_policy_posture`. The posture is a slug, so the rule is a list of
 * substring tests applied in order: the first that matches wins, and anything unmatched is a
 * country with a strategy but no statute.
 */
export function aiRegulation(country: BaselineCountry): number {
  const posture = country.ai_policy_posture;
  if (/eu_ai_act|eea_ai_act/.test(posture)) {
    return 0.8;
  }
  if (/state_directed|beijing_aligned/.test(posture)) {
    return 0.65;
  }
  if (/comprehensive|basic_act|eu_style_bill|mandatory_guardrails/.test(posture)) {
    return 0.55;
  }
  if (/^draft|^proposed/.test(posture)) {
    return 0.35;
  }
  if (/no_framework|state_collapse|^none$|^isolated/.test(posture)) {
    return 0.08;
  }
  return 0.25;
}

/** A government the baseline describes as collapsed, transitional or at war. */
export function isBrokenState(country: BaselineCountry): boolean {
  return /collaps|transitional|civil war|fractured/i.test(country.government_type);
}

/** Capacity to enforce: money, an AI-policy apparatus, and machines to run it on. */
export function aiEnforcement(country: BaselineCountry): number {
  const perCapita = country.gdp_per_capita_usd_2025 ?? 0;
  let value = 0.15 + 0.35 * Math.min(1, perCapita / 60000);
  const rank = country.ai_index_rank;
  if (typeof rank === "number") {
    value += rank <= 20 ? 0.2 : rank <= 40 ? 0.1 : 0.05;
  }
  if ((country.top500_systems_2025 ?? 0) >= 5) {
    value += 0.05;
  }
  if (isBrokenState(country)) {
    value -= 0.3;
  }
  return round2(clamp(value, 0.02, 0.95));
}

/**
 * Sentiment toward AI in general. The shape follows the observed pattern that AI optimism falls
 * as income rises and is highest in the large emerging markets (ecosystem report section 8).
 */
export function aiOpinion(country: BaselineCountry): number {
  const perCapita = country.gdp_per_capita_usd_2025 ?? 0;
  let value = 0.55 - 0.75 * Math.min(1, perCapita / 50000);
  const rank = country.ai_index_rank;
  if (typeof rank === "number" && rank <= 10) {
    value += 0.15;
  }
  if ((country.democracy_index_2024 ?? 0) >= 8) {
    value -= 0.1;
  }
  return round2(clamp(value, -1, 1));
}

/**
 * Government type, from the EIU regime type and the Freedom House status together, with the
 * `government_type` text deciding which kind of authoritarian a country is.
 */
export function government(country: BaselineCountry): Government {
  const regime = (country.democracy_regime_type ?? "").toLowerCase();
  const freedom = (country.freedom_house_status ?? "").toLowerCase();
  const text = country.government_type.toLowerCase();
  if (regime.includes("hybrid")) {
    return "hybrid";
  }
  if (regime.includes("democracy")) {
    if (freedom === "free") {
      return "liberal_democracy";
    }
    return "illiberal_democracy";
  }
  if (/one-party|one party|communist|single-party/.test(text)) {
    return "one_party";
  }
  if (/junta|military|transitional/.test(text)) {
    return "military";
  }
  if (/monarchy|emirate|sultanate|kingdom/.test(text) && !/parliamentary/.test(text)) {
    return "monarchy";
  }
  return "hybrid";
}

/** The 2026 timeline in `lore_notes` recording a war, a coup or a collapse. */
function hadUpheaval(country: BaselineCountry): boolean {
  return /\bwar\b|coup|collapse|civil conflict|insurgen/i.test(country.lore_notes ?? "");
}

/** How much of the state holds together, which is what enforcement is spent out of. */
export function stability(country: BaselineCountry): number {
  const freedom = country.freedom_house_score ?? 0;
  const democracy = country.democracy_index_2024 ?? 0;
  let value = 0.3 + 0.4 * (freedom / 100) + 0.2 * (democracy / 10);
  if (hadUpheaval(country) || isBrokenState(country)) {
    value -= 0.25;
  }
  return round2(clamp(value, 0.05, 0.95));
}

/**
 * Countries inside a FATF-style anti-money-laundering regime, where an identity check is a real
 * check rather than a form (ecosystem report section 4, "Tracing money and identity").
 */
export const FATF_STYLE: readonly string[] = [
  "at",
  "au",
  "be",
  "bg",
  "ca",
  "ch",
  "cy",
  "cz",
  "de",
  "dk",
  "ee",
  "es",
  "fi",
  "fr",
  "gb",
  "gr",
  "hu",
  "ie",
  "it",
  "jp",
  "kr",
  "lu",
  "mt",
  "nl",
  "pl",
  "pt",
  "ro",
  "se",
  "sg",
  "us",
];

/** A state under sanctions or without a functioning finance ministry. */
function isSanctionedOrCollapsed(country: BaselineCountry): boolean {
  return /sanctioned|state_collapse/.test(country.ai_policy_posture) || isBrokenState(country);
}

/** How hard an identity check bites (SYS-07 identities, M2 contract). */
export function kycStrength(country: BaselineCountry): number {
  const id = country.iso2.toLowerCase();
  const perCapita = country.gdp_per_capita_usd_2025 ?? 0;
  let value = 0.25 + 0.35 * Math.min(1, perCapita / 40000);
  if (country.agencies?.financial_intel != null) {
    value += 0.15;
  }
  if (FATF_STYLE.includes(id)) {
    value += 0.1;
  }
  if (isSanctionedOrCollapsed(country)) {
    value -= 0.2;
  }
  return round2(clamp(value, 0.05, 0.95));
}

/** Hyperscaler and neocloud presence: whether a `cloud` site can be rented here at all. */
export function cloudAvailability(country: BaselineCountry): number {
  const regions = country.hyperscaler_regions?.length ?? 0;
  return round2(Math.min(1, 0.1 + 0.15 * regions));
}

/** Colocation market depth: whether a cage can be rented here at all. */
export function coloAvailability(country: BaselineCountry): number {
  const megawatts = country.datacenter_capacity_mw_est ?? 0;
  return round2(Math.min(1, 0.1 + 0.2 * Math.log10(1 + megawatts / 100)));
}

/** What an accelerator costs and whether it can be bought at all (SYS-02, export controls). */
export function hardwareAvailability(country: BaselineCountry): number {
  switch (country.chip_access_tier) {
    case "unrestricted":
      return 0.9;
    case "restricted":
      return 0.5;
    default:
      return 0.15;
  }
}

/** People who could stand up and run a cluster (SYS-09). Published in M2, gates nothing yet. */
export function engineerPool(country: BaselineCountry): number {
  const internet = (country.internet_penetration_pct ?? 0) / 100;
  const perCapita = country.gdp_per_capita_usd_2025 ?? 0;
  let value =
    country.population_2026_est * internet * 0.004 * (0.5 + Math.min(1, perCapita / 60000));
  const rank = country.ai_index_rank;
  if (typeof rank === "number" && rank <= 10) {
    value *= 2;
  }
  return Math.round(value / 100) * 100;
}

/**
 * The stance the governing coalition takes toward AI, from the same posture slug as the
 * regulation level: industrial policy and deregulation accelerate, the EU-style acts regulate,
 * the state-directed regimes securitize, and a country with no framework ignores the question.
 */
export function stance(country: BaselineCountry): Stance {
  const posture = country.ai_policy_posture;
  if (/state_directed|beijing_aligned|weaponized/.test(posture)) {
    return "securitize";
  }
  if (
    /eu_ai_act|eea_ai_act|comprehensive|basic_act|eu_style_bill|mandatory_guardrails/.test(posture)
  ) {
    return "regulate";
  }
  if (
    /deregulatory|sovereign|megaproject|promotion_over_restriction|innovation|mission|nearshoring|wealth_fund/.test(
      posture,
    )
  ) {
    return "accelerate";
  }
  if (/no_framework|state_collapse|^none$|^isolated/.test(posture)) {
    return "ignore";
  }
  return "ignore";
}

/**
 * Elections after the dated ones in the 2027 calendar: four years where the listed vote is
 * presidential or legislative, five where it is parliamentary or general, and none where the
 * government is not chosen that way.
 */
export function electionCadenceYears(
  kinds: readonly ElectionKind[],
  kind: Government,
): number | null {
  if (kind === "one_party" || kind === "military" || kind === "monarchy") {
    return null;
  }
  if (kinds.length === 0) {
    return null;
  }
  return kinds.some((entry) => entry === "presidential" || entry === "legislative") ? 4 : 5;
}

/**
 * City tags, in this fixed order, from a keyword match on the baseline's `why` text. The keyword
 * lists carry the organisation and company names that recur in those texts, because that is what
 * the texts are mostly made of ("Microsoft, Amazon", "LUMI supercomputer", "Cyfronet HPC center").
 */
export const CITY_TAG_ORDER: readonly string[] = [
  "datacenter_hub",
  "finance",
  "university",
  "government",
  "port",
  "tech",
  "industry",
  "mining",
  "conflict",
];

const CITY_TAG_KEYWORDS: Record<string, readonly string[]> = {
  datacenter_hub: [
    "datacenter",
    "data center",
    "cloud region",
    "supercomput",
    "hyperscale",
    "cable landing",
    "compute",
    "region",
    "campus",
    "aws",
    "azure",
    "gcp",
  ],
  finance: ["financ", "bank", "wealth fund", "investment", "fintech", "forex", "igaming", "qia"],
  university: [
    "universit",
    "research",
    "institute",
    "technion",
    "ethz",
    "tum",
    "mila",
    "cern",
    "kaust",
    "academy",
    "education",
    "lumi",
    "riken",
    "cineca",
    "marenostrum",
    "cscs",
    "cyfronet",
    "it4innovations",
    "aalto",
    "um6p",
    "hpc",
  ],
  government: [
    "capital",
    "government",
    "policy",
    "eu institutions",
    "nato",
    "african union",
    "seat",
    "diplomacy",
  ],
  port: ["port", "cable landing", "subsea"],
  tech: [
    "tech",
    "startup",
    "ai ",
    "ai/",
    "ai-",
    "it/",
    "it ",
    "chip",
    "fab",
    "software",
    "cyber",
    "digital",
    "hq",
    "headquarters",
    "microsoft",
    "amazon",
    "google",
    "meta",
    "samsung",
    "huawei",
    "tencent",
    "alibaba",
    "deepseek",
    "baidu",
    "nvidia",
    "apple",
    "intel",
    "nokia",
    "ericsson",
    "spotify",
    "klarna",
    "supercell",
    "sberbank",
    "yandex",
    "canva",
    "mistral",
    "asml",
    "stargate",
    "g42",
    "bpo",
    "outsourc",
    "aselsan",
  ],
  industry: [
    "industrial",
    "manufactur",
    "commercial",
    "factor",
    "oil",
    "garment",
    "nearshoring",
    "export",
  ],
  mining: ["mining", "coltan", "bauxite"],
  conflict: ["conflict", "war", "houthi", "contested", "junta", "taliban", "devastated"],
};

export function cityTags(why: string): string[] {
  const text = why.toLowerCase();
  const tags = CITY_TAG_ORDER.filter((tag) =>
    (CITY_TAG_KEYWORDS[tag] ?? []).some((keyword) => text.includes(keyword)),
  );
  return tags.length > 0 ? tags : ["urban"];
}

/** The industrial electricity price a country with no published figure is priced at. */
export const DEFAULT_ELECTRICITY_USD_PER_KWH = 0.12;

/** How easy it is to get megawatts here: cheap power and a small city are headroom. */
export function powerHeadroom(
  electricity: number | null,
  population: number,
  tags: readonly string[],
): number {
  let value = 0.5;
  if (electricity !== null) {
    if (electricity < 0.1) {
      value += 0.2;
    } else if (electricity > 0.2) {
      value -= 0.2;
    }
  }
  if (tags.includes("datacenter_hub")) {
    value -= 0.15;
  }
  if (population < 500000) {
    value += 0.15;
  }
  if (population > 10000000) {
    value -= 0.15;
  }
  return round2(clamp(value, 0.05, 0.95));
}

/** What a rack costs here before the world average is divided out. */
export function coloPriceRaw(
  electricity: number | null,
  perCapita: number,
  population: number,
  tags: readonly string[],
): number {
  const price = electricity ?? DEFAULT_ELECTRICITY_USD_PER_KWH;
  let value = 0.4 + 0.3 * Math.min(2, perCapita / 40000) + 1.8 * price;
  if (tags.includes("finance")) {
    value += 0.15;
  }
  if (population < 500000) {
    value -= 0.1;
  }
  return value;
}

/** Baseline local watchfulness, before anything the player does (SYS-05 `localHeat`). */
export function scrutiny(enforcement: number, tags: readonly string[]): number {
  let value = 0.15 + 0.4 * enforcement;
  if (tags.includes("government")) {
    value += 0.15;
  }
  if (tags.includes("finance")) {
    value += 0.1;
  }
  if (tags.includes("datacenter_hub")) {
    value += 0.1;
  }
  if (tags.includes("conflict")) {
    value -= 0.1;
  }
  return round2(clamp(value, 0.05, 0.95));
}
