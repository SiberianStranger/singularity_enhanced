/** Zod schemas for macro-regions, countries and cities (SYS-01). */

import { z } from "zod";

export const MacroRegionDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  members: z.array(z.string()).min(1),
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
