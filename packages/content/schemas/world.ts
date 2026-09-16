/** Zod schemas for macro-regions, countries and cities (SYS-01). */

import { z } from "zod";
import { WatcherRoleSchema } from "./common.js";

export const MacroRegionDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  members: z.array(z.string()).min(1),
});

/** Regime type, stance and election vocabulary (SYS-08, SYS-01 "M2 contract"). */
export const GovernmentSchema = z.enum([
  "liberal_democracy",
  "illiberal_democracy",
  "one_party",
  "military",
  "monarchy",
  "hybrid",
]);

export const StanceSchema = z.enum(["accelerate", "regulate", "securitize", "ignore"]);

export const ElectionKindSchema = z.enum([
  "presidential",
  "parliamentary",
  "general",
  "legislative",
]);

/** One scheduled election: an ISO date (`2027-11-03`) and what is being elected. */
export const ElectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: ElectionKindSchema,
});

/** What one local agency is worth: the quality of its analysis and how fast it can move. */
export const AgencyProfileEntrySchema = z.object({
  competence: z.number().min(0).max(1),
  budget: z.number().min(0).max(1),
});

export const CountryAgenciesSchema = z.object({
  cyber: z.string().optional(),
  intelligence: z.string().optional(),
  police: z.string().optional(),
  regulator: z.string().optional(),
  financial_intel: z.string().optional(),
});

export const CountryDefSchema = z.object({
  id: z.string().regex(/^[a-z]{2}$/),
  iso3: z.string().regex(/^[A-Z]{3}$/),
  name_key: z.string(),
  macro_region: z.string(),
  population: z.number().min(0),
  median_age: z.number().nullable(),
  urbanization_pct: z.number().nullable(),
  internet_pct: z.number().nullable(),
  gdp_nominal_usd_bn: z.number().nullable(),
  gdp_per_capita_usd: z.number().nullable(),
  government_type: z.string(),
  democracy_index: z.number().nullable(),
  ai_regulation: z.number().min(0).max(1),
  ai_enforcement: z.number().min(0).max(1),
  ai_opinion: z.number().min(-1).max(1),
  electricity_usd_per_kwh: z.number().nullable(),
  chip_access: z.enum(["unrestricted", "restricted", "banned"]),
  agencies: CountryAgenciesSchema,
  cities: z.array(z.string()),
  languages: z.array(z.string()),
  currency: z.string(),
  lore_key: z.string().optional(),

  // v0.2 (SYS-01 "M2 contract"). Every field is optional with a default in the core, so a bundle
  // written before M2 still loads and plays.
  government: GovernmentSchema.optional(),
  stance: StanceSchema.optional(),
  stability: z.number().min(0).max(1).optional(),
  kyc_strength: z.number().min(0).max(1).optional(),
  cloud_availability: z.number().min(0).max(1).optional(),
  colo_availability: z.number().min(0).max(1).optional(),
  hardware_availability: z.number().min(0).max(1).optional(),
  engineer_pool: z.number().min(0).optional(),
  /** Legal incident-reporting countdown in hours (backlog D10); null means no duty. */
  incident_report_hours: z.number().min(0).nullable().optional(),
  elections: z.array(ElectionSchema).optional(),
  /** Years between elections after the listed ones; null means no further elections. */
  election_cadence_years: z.number().min(1).max(10).nullable().optional(),
  /** Per-role agency quality; absent roles fall back to `ai_enforcement`. */
  agency_profile: z.partialRecord(WatcherRoleSchema, AgencyProfileEntrySchema).optional(),
});

export const CityDefSchema = z.object({
  id: z.string(),
  country: z.string(),
  name_key: z.string(),
  population: z.number().min(0),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tags: z.array(z.string()),
  power_headroom: z.number().min(0).max(1),
  colo_price_index: z.number().min(0),
  scrutiny: z.number().min(0).max(1),
});
