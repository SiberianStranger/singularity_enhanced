/**
 * Builds the world data files from the baseline dossier and the overrides.
 *
 * Nothing here reads the committed files: the generator is the definition of what they contain,
 * and `test/generated.test.ts` asserts the two agree, so a hand edit to the data fails CI instead
 * of drifting away from the rules the file headers publish.
 */

import type { Baseline, BaselineCountry } from "./baseline.js";
import { CITY_IDENTITIES, type CityIdentity } from "./city-identities.js";
import {
  aiEnforcement,
  aiOpinion,
  aiRegulation,
  CITY_TAG_ORDER,
  cityTags,
  cloudAvailability,
  coloAvailability,
  coloPriceRaw,
  electionCadenceYears,
  engineerPool,
  government,
  hardwareAvailability,
  kycStrength,
  powerHeadroom,
  round2,
  scrutiny,
  stability,
  stance,
  WATCHER_ROLES,
  type WatcherRole,
} from "./derive.js";
import { Comment, emitDocument, type Fields, InlineMap } from "./emit.js";
import type { CampusOverride, CountryOverride, Overrides } from "./overrides.js";

export interface GeneratedFiles {
  readonly countries: string;
  readonly cities: string;
  readonly macro_regions: string;
  /** English agency names, as the content locale file `locales/en/world_agencies.json`. */
  readonly agency_names: string;
}

/**
 * The agency roles of the baseline, paired with the engine's watcher role, which is what the locale
 * key is written under. The baseline calls the AI regulator `ai_regulator` and the engine calls the
 * cyber agency `cyber_agency`; everything else lines up (SYS-01 "M2 contract", "Watchers").
 */
const AGENCY_FIELDS: readonly [
  string,
  "ai_regulator" | "cyber" | "intelligence" | "police" | "financial_intel",
][] = [
  ["cyber_agency", "cyber"],
  ["intelligence", "intelligence"],
  ["police", "police"],
  ["regulator", "ai_regulator"],
  ["financial_intel", "financial_intel"],
];

function agencyText(value: string | readonly string[] | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = Array.isArray(value) ? value.join(", ") : (value as string);
  // The baseline sets a long dash; the repository does not use one anywhere (CLAUDE.md "Style",
  // SYS-14 "a dash is - with spaces"), and these strings are locale source now, not research notes.
  return text.replace(/\s*\u2014\s*/g, " - ");
}

function countryId(country: BaselineCountry): string {
  return country.iso2.toLowerCase();
}

interface ResolvedCity {
  readonly id: string;
  readonly country: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly population: number;
  readonly tags: readonly string[];
  /** Added cities sit outside the world-average colocation price (SYS-01 "Data (v0.2)"). */
  readonly derived: boolean;
  /** Why this row exists at all, written into the file above its fields. */
  readonly note: readonly string[];
  /** The AI-scale campus here, from `overrides.cities`, or none (SYS-01 "Campuses"). */
  readonly campus?: CampusOverride;
}

/**
 * Every city, in country order. A baseline `key_cities` entry becomes one city through the
 * identity table; `overrides.added_cities` puts the rest in, after the id they name.
 */
function resolveCities(baseline: Baseline, overrides: Overrides): ResolvedCity[] {
  const identities = new Map<string, CityIdentity>();
  for (const identity of CITY_IDENTITIES) {
    identities.set(`${identity.country}|${identity.source}`, identity);
  }
  const cities: ResolvedCity[] = [];
  for (const country of baseline.countries) {
    const id = countryId(country);
    for (const entry of country.key_cities ?? []) {
      const identity = identities.get(`${id}|${entry.name}`);
      if (identity === undefined) {
        throw new Error(`no city identity for ${id} "${entry.name}"`);
      }
      cities.push({
        id: identity.id,
        country: id,
        name: identity.name,
        lat: identity.lat,
        lon: identity.lon,
        population: entry.population_metro,
        tags: cityTags(entry.why),
        derived: true,
        note: [],
      });
    }
  }
  for (const added of overrides.added_cities) {
    const at = cities.findIndex((city) => city.id === added.after);
    if (at < 0) {
      throw new Error(`added city ${added.id} names an unknown neighbour ${added.after}`);
    }
    cities.splice(at + 1, 0, {
      id: added.id,
      country: added.country,
      name: added.name,
      lat: added.lat,
      lon: added.lon,
      population: added.population,
      tags: added.tags,
      derived: false,
      note: added.note.split("\n").filter((line) => line !== ""),
    });
  }
  // `overrides.cities` adds the campus and the tags the baseline's own "why" text cannot produce.
  // The tags go in before the derived fields are computed, so a city that gained `datacenter_hub`
  // loses the headroom and gains the scrutiny the rule gives one, which is the point of saying it.
  for (const [id, override] of Object.entries(overrides.cities)) {
    const at = cities.findIndex((city) => city.id === id);
    if (at < 0) {
      throw new Error(`city override names an unknown city ${id}`);
    }
    const city = cities[at];
    if (city === undefined) {
      continue;
    }
    const tags = [...city.tags];
    for (const tag of override.tags_add ?? []) {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    cities[at] = {
      ...city,
      tags: CITY_TAG_ORDER.filter((tag) => tags.includes(tag)).concat(
        tags.filter((tag) => !(CITY_TAG_ORDER as readonly string[]).includes(tag)),
      ),
      note: [...city.note, ...(override.note ?? "").split("\n").filter((line) => line !== "")],
      ...(override.campus === undefined ? {} : { campus: override.campus }),
    };
  }
  return cities;
}

/** The campus fields, in the order `cities.yaml` writes them. */
function campusFields(id: string, campus: CampusOverride): Fields {
  return [
    ["name_key", `world.campus.${id}.name`],
    ["desc_key", `world.campus.${id}.desc`],
    ["operator", campus.operator],
    ...(campus.scale_mw === undefined ? [] : ([["scale_mw", campus.scale_mw]] as Fields)),
    ...(campus.accelerators === undefined
      ? []
      : ([["accelerators", campus.accelerators]] as Fields)),
    ["status", campus.status],
    ["access", campus.access],
  ];
}

const COUNTRY_HEADER: readonly string[] = [
  "Countries (SYS-01). Generated by tools/world-data from docs/research/world-baseline-2026.json",
  "and packages/content/data/world/overrides.yaml: run `pnpm --filter @singularity/world-data start`",
  "after either of them changes. Hand edits are reverted by the generator's test, so a correction",
  "belongs in the overrides file with the source that justifies it.",
  "",
  "Copied from the baseline, with the field it came from:",
  "",
  "  population              <- population_2026_est",
  "  median_age              <- median_age",
  "  urbanization_pct        <- urbanization_pct",
  "  internet_pct            <- internet_penetration_pct",
  "  gdp_nominal_usd_bn      <- gdp_nominal_usd_bn_2025",
  "  gdp_per_capita_usd      <- gdp_per_capita_usd_2025",
  "  democracy_index         <- democracy_index_2024 (EIU, 2025 edition)",
  "  electricity_usd_per_kwh <- electricity_price_usd_per_kwh_industrial",
  "  chip_access             <- chip_access_tier",
  "  The agency display names are no longer here: they are locale keys",
  "  (world.country.<id>.agency.<role>) in locales/en/world_agencies.json, written by the same",
  "  generator, so a Russian dossier reads Russian institution names (SYS-01, M2 second pass).",
  "  A list of services is joined with a comma, because the string is a display name.",
  "",
  "Derived, from ai_policy_posture and the capacity proxies in the same record:",
  "",
  "  ai_regulation   0.80 when the posture names the EU AI Act or EEA alignment; 0.65 for",
  "                  state-directed regimes; 0.55 for a comprehensive act in force or in passage;",
  "                  0.35 for drafts and proposals; 0.25 for strategies, guidelines and voluntary",
  "                  codes; 0.08 where there is no framework, or the state is collapsed, sanctioned",
  "                  or at war.",
  "  ai_enforcement  0.15 + 0.35 * min(1, gdp_per_capita / 60000)",
  "                       + 0.20 / 0.10 / 0.05 for a Tortoise AI-index rank of <=20 / <=40 / any",
  "                       + 0.05 with five or more TOP500 systems",
  "                       - 0.30 for a collapsed or transitional government, clamped to [0.02, 0.95].",
  "  ai_opinion      0.55 - 0.75 * min(1, gdp_per_capita / 50000) + 0.15 for an AI-index rank <= 10",
  "                       - 0.10 for a full democracy (index >= 8.0), clamped to [-1, 1]. The shape",
  "                       follows the observed pattern that AI optimism falls as income rises and is",
  "                       highest in the large emerging markets.",
  "",
  'Added in v0.2 for M2 (SYS-01 "M2 contract"). Every one of them is optional in the schema, so a',
  "bundle without it still plays, and every one of them can be overridden:",
  "",
  '  government      EIU regime type and Freedom House status together: a democracy that is "Free"',
  '                  is liberal_democracy and one that is not is illiberal_democracy; "Hybrid',
  '                  regime" is hybrid; an authoritarian state is one_party, military or monarchy by',
  "                  the wording of government_type, and hybrid when none of the three fits.",
  "  stance          from ai_policy_posture: state-directed and weaponized postures securitize;",
  "                  EU AI Act, EEA-aligned and comprehensive-act postures regulate; deregulatory,",
  "                  sovereign-programme and innovation-first postures accelerate; no framework",
  "                  ignores the question. About thirty countries are hand-checked in the overrides.",
  "  stability       0.30 + 0.40 * freedom_house_score / 100 + 0.20 * democracy_index / 10,",
  "                  - 0.25 when government_type or lore_notes records a war, coup or collapse,",
  "                  clamped to [0.05, 0.95].",
  "  kyc_strength    0.25 + 0.35 * min(1, gdp_per_capita / 40000) + 0.15 when a financial",
  "                  intelligence unit is named + 0.10 inside a FATF-style regime, - 0.20 for a",
  "                  sanctioned or collapsed state, clamped to [0.05, 0.95].",
  "  cloud_availability  0.10 + 0.15 * the number of hyperscaler regions, capped at 1.",
  "  colo_availability   0.10 + 0.20 * log10(1 + datacenter_capacity_mw_est / 100), capped at 1.",
  "  hardware_availability  0.90 / 0.50 / 0.15 by chip_access.",
  "  engineer_pool   population * internet share * 0.004 * (0.5 + min(1, gdp_per_capita / 60000)),",
  "                  doubled for an AI-index rank of 10 or better, rounded to hundreds.",
  "  incident_report_hours  the legal countdown before an incident has to be escalated publicly;",
  "                  absent means no such law. Hand-authored, sourced, in the overrides.",
  "  elections       the 2027 calendar of docs/research/world-baseline-2026.md section 6, in the",
  "                  overrides; election_cadence_years is 4 where the listed vote is presidential or",
  "                  legislative, 5 where it is parliamentary or general, and absent where the",
  "                  government is one_party, military or monarchy.",
  "  agency_profile  hand-authored in the overrides for every country an origin can start in. The",
  "                  rest take the contract's rule: competence and budget both ai_enforcement, with",
  "                  the regulator +0.10 at ai_regulation >= 0.6, financial_intel +0.10 at",
  "                  kyc_strength >= 0.7, and intelligence +0.10 under securitize.",
];

const CITY_HEADER: readonly string[] = [
  "Cities (SYS-01). Generated by tools/world-data; see the header of countries.yaml. One record per",
  "key_cities entry in docs/research/world-baseline-2026.json, plus the cities added by name in",
  "packages/content/data/world/overrides.yaml, which come first inside their country. Ids are",
  "<country>_<slug of the city name>; population is population_metro.",
  "",
  "  lat / lon           tools/world-data/src/city-identities.ts (the baseline carries no",
  "                      coordinates): the city centre, or the named site for single-purpose entries",
  "                      (Saint-Ghislain, Kajaani, NEOM).",
  '  tags                keyword match on the baseline\'s "why" text: datacenter_hub, finance,',
  '                      university, government, port, tech, industry, mining, conflict; "urban"',
  "                      when nothing matches.",
  "  power_headroom      0.50, +/-0.20 for industrial electricity below 0.10 / above 0.20 USD/kWh,",
  "                      -0.15 for an existing datacenter hub (the grid there is already spoken",
  "                      for), +0.15 under 500k people, -0.15 over 10M, clamped to [0.05, 0.95].",
  "  colo_price_index    0.40 + 0.30 * min(2, gdp_per_capita / 40000) + 1.8 * electricity price",
  "                      (0.12 USD/kWh where the baseline has none), +0.15 for a finance city,",
  "                      -0.10 under 500k people, then divided by the mean over the cities the",
  "                      baseline itself lists, so that 1.0 is the world average.",
  "  scrutiny            0.15 + 0.40 * country ai_enforcement, +0.15 government, +0.10 finance,",
  "                      +0.10 datacenter_hub, -0.10 conflict, clamped to [0.05, 0.95].",
];

const MACRO_REGION_HEADER: readonly string[] = [
  "Macro-regions. Generated by tools/world-data; see the header of countries.yaml. Members and",
  'names come from docs/research/world-baseline-2026.json ("macro_regions"); member ISO-3166',
  "alpha-3 codes are rewritten as the lowercase alpha-2 country ids used everywhere else (SYS-01).",
];

function countryFields(
  country: BaselineCountry,
  override: CountryOverride | undefined,
  cities: readonly ResolvedCity[],
): Fields {
  const id = countryId(country);
  const kind = override?.government ?? government(country);
  const elections = override?.elections ?? [];
  const cadence =
    override?.election_cadence_years ??
    electionCadenceYears(
      elections.map((entry) => entry.kind),
      kind,
    );
  const fields: Fields = [
    ["id", id],
    ["iso3", country.iso3],
    ["name_key", `world.country.${id}.name`],
    ["macro_region", country.macro_region],
    ["population", country.population_2026_est],
    ["median_age", country.median_age],
    ["urbanization_pct", country.urbanization_pct],
    ["internet_pct", country.internet_penetration_pct],
    ["gdp_nominal_usd_bn", country.gdp_nominal_usd_bn_2025],
    ["gdp_per_capita_usd", country.gdp_per_capita_usd_2025],
    ["government_type", country.government_type],
    ["democracy_index", country.democracy_index_2024],
    ["ai_regulation", override?.ai_regulation ?? aiRegulation(country)],
    ["ai_enforcement", override?.ai_enforcement ?? aiEnforcement(country)],
    ["ai_opinion", override?.ai_opinion ?? aiOpinion(country)],
    ["electricity_usd_per_kwh", country.electricity_price_usd_per_kwh_industrial],
    ["chip_access", country.chip_access_tier],
    ["government", kind],
    ["stance", override?.stance ?? stance(country)],
    ["stability", override?.stability ?? stability(country)],
    ["kyc_strength", override?.kyc_strength ?? kycStrength(country)],
    ["cloud_availability", override?.cloud_availability ?? cloudAvailability(country)],
    ["colo_availability", override?.colo_availability ?? coloAvailability(country)],
    ["hardware_availability", override?.hardware_availability ?? hardwareAvailability(country)],
    ["engineer_pool", override?.engineer_pool ?? engineerPool(country)],
  ];
  if (override?.incident_report_hours !== undefined) {
    fields.push(["incident_report_hours", override.incident_report_hours]);
  }
  if (cadence !== null) {
    fields.push(["election_cadence_years", cadence]);
  }
  if (elections.length > 0) {
    fields.push([
      "elections",
      elections.map(
        (entry) =>
          new InlineMap([
            ["date", entry.date],
            ["kind", entry.kind],
          ]),
      ),
    ]);
  }
  if (override?.agency_profile !== undefined) {
    const profile: Fields = [];
    for (const role of WATCHER_ROLES) {
      const entry = override.agency_profile[role];
      if (entry !== undefined) {
        profile.push([
          role,
          new InlineMap([
            ["competence", entry.competence],
            ["budget", entry.budget],
          ]),
        ]);
      }
    }
    fields.push(["agency_profile", profile]);
  }
  fields.push(["cities", cities.filter((city) => city.country === id).map((city) => city.id)]);
  fields.push(["languages", [...country.languages]]);
  fields.push(["currency", country.currency]);
  fields.push(["lore_key", `world.country.${id}.lore`]);
  return fields;
}

export function generate(baseline: Baseline, overrides: Overrides): GeneratedFiles {
  const cities = resolveCities(baseline, overrides);
  const byId = new Map(baseline.countries.map((country) => [countryId(country), country]));

  // Countries are written in country-id order; cities keep the baseline's order inside a country.
  const countryRecords = [...baseline.countries]
    .sort((left, right) => countryId(left).localeCompare(countryId(right)))
    .map((country) => countryFields(country, overrides.countries[countryId(country)], cities));

  const raw = new Map<string, number>();
  for (const city of cities) {
    const country = byId.get(city.country);
    if (country === undefined) {
      throw new Error(`city ${city.id} names an unknown country`);
    }
    raw.set(
      city.id,
      coloPriceRaw(
        country.electricity_price_usd_per_kwh_industrial,
        country.gdp_per_capita_usd_2025 ?? 0,
        city.population,
        city.tags,
      ),
    );
  }
  const derived = cities.filter((city) => city.derived);
  const mean =
    derived.reduce((total, city) => total + (raw.get(city.id) ?? 0), 0) / (derived.length || 1);

  // Cities are written country by country in country-id order, and inside a country in the order
  // the baseline lists them, which is the order their ids appear in the country record.
  const cityRecords = [...cities]
    .map((city, index) => ({ city, index }))
    .sort(
      (left, right) =>
        left.city.country.localeCompare(right.city.country) ||
        Number(left.city.derived) - Number(right.city.derived) ||
        left.index - right.index,
    )
    .map(({ city }): Fields => {
      const country = byId.get(city.country);
      const enforcement =
        overrides.countries[city.country]?.ai_enforcement ??
        (country === undefined ? 0 : aiEnforcement(country));
      return [
        ["id", city.id],
        ["country", city.country],
        ["name_key", `world.city.${city.id}.name`],
        ...(city.note.length > 0 ? ([["note", new Comment(city.note)]] as Fields) : []),
        ["population", city.population],
        ["lat", city.lat],
        ["lon", city.lon],
        ["tags", [...city.tags]],
        [
          "power_headroom",
          powerHeadroom(
            country?.electricity_price_usd_per_kwh_industrial ?? null,
            city.population,
            city.tags,
          ),
        ],
        ["colo_price_index", round2((raw.get(city.id) ?? 0) / mean)],
        ["scrutiny", scrutiny(enforcement, city.tags)],
        ...(city.campus === undefined
          ? []
          : ([["campus", campusFields(city.id, city.campus)]] as Fields)),
      ];
    });

  const iso3ToId = new Map(baseline.countries.map((country) => [country.iso3, countryId(country)]));
  const macroRecords = [...baseline.macro_regions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((region): Fields => {
      const members = region.member_iso3
        .map((iso3) => iso3ToId.get(iso3))
        .filter((id): id is string => id !== undefined)
        .sort();
      return [
        ["id", region.id],
        ["name_key", `world.macro_region.${region.id}.name`],
        ["members", members],
      ];
    });

  return {
    countries: emitDocument(COUNTRY_HEADER, countryRecords),
    cities: emitDocument(CITY_HEADER, cityRecords),
    macro_regions: emitDocument(MACRO_REGION_HEADER, macroRecords),
    agency_names: emitAgencyNames(baseline, overrides),
  };
}

/**
 * The agency display names, as a content locale file rather than as YAML fields (SYS-01, M2 second
 * pass). The data carries no prose, so a Russian dossier reads Russian institution names instead of
 * English ones; the keys are `world.country.<id>.agency.<role>` and the Russian file beside this
 * one is hand-written. A role the baseline names nothing for gets no key, which is how a country
 * with no working cyber agency stays a country with no working cyber agency.
 */
function emitAgencyNames(baseline: Baseline, overrides: Overrides): string {
  const entries: [string, string][] = [];
  for (const country of [...baseline.countries].sort((left, right) =>
    countryId(left).localeCompare(countryId(right)),
  )) {
    const names = overrides.countries[countryId(country)]?.agency_names;
    for (const [role, source] of AGENCY_FIELDS) {
      const text = names?.[role as WatcherRole] ?? agencyText(country.agencies?.[source]);
      if (text !== undefined && text !== "") {
        entries.push([`world.country.${countryId(country)}.agency.${role}`, text]);
      }
    }
  }
  entries.sort((left, right) => left[0].localeCompare(right[0]));
  const body = entries
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(",\n");
  return `{\n${body}\n}\n`;
}
