/** The shape of `docs/research/world-baseline-2026.json` that the generator reads. */

export interface BaselineCity {
  readonly name: string;
  readonly population_metro: number;
  readonly why: string;
}

export interface BaselineAgencies {
  readonly ai_regulator?: string | string[] | null;
  readonly cyber?: string | string[] | null;
  readonly intelligence?: string | string[] | null;
  readonly police?: string | string[] | null;
  readonly financial_intel?: string | string[] | null;
}

export interface BaselineCountry {
  readonly iso2: string;
  readonly iso3: string;
  readonly name: string;
  readonly macro_region: string;
  readonly population_2026_est: number;
  readonly median_age: number | null;
  readonly urbanization_pct: number | null;
  readonly internet_penetration_pct: number | null;
  readonly gdp_nominal_usd_bn: number | null;
  readonly gdp_nominal_usd_bn_2025: number | null;
  readonly gdp_per_capita_usd_2025: number | null;
  readonly government_type: string;
  readonly democracy_index_2024: number | null;
  readonly democracy_regime_type?: string | null;
  readonly freedom_house_status?: string | null;
  readonly freedom_house_score?: number | null;
  readonly ai_index_rank?: number | null;
  readonly top500_systems_2025?: number | null;
  readonly datacenter_capacity_mw_est?: number | null;
  readonly hyperscaler_regions?: readonly string[] | null;
  readonly chip_access_tier: string;
  readonly electricity_price_usd_per_kwh_industrial: number | null;
  readonly agencies?: BaselineAgencies;
  readonly ai_policy_posture: string;
  readonly key_cities?: readonly BaselineCity[];
  readonly languages: readonly string[];
  readonly currency: string;
  readonly lore_notes?: string | null;
}

export interface BaselineMacroRegion {
  readonly id: string;
  readonly name: string;
  readonly member_iso3: readonly string[];
}

export interface Baseline {
  readonly macro_regions: readonly BaselineMacroRegion[];
  readonly countries: readonly BaselineCountry[];
}
