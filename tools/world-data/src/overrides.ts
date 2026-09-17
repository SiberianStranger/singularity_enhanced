/**
 * `packages/content/data/world/overrides.yaml`: the hand-checked facts the baseline does not carry
 * and the places where a documented rule gets a country wrong.
 *
 * Every entry in that file carries a `# source:` comment. This module only reads it; the rules are
 * in `derive.ts` and the file itself is the argument.
 */

import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { ElectionKind, Government, Stance, WatcherRole } from "./derive.js";

export interface ElectionEntry {
  readonly date: string;
  readonly kind: ElectionKind;
}

export interface AgencyProfileEntry {
  readonly competence: number;
  readonly budget: number;
}

export interface CountryOverride {
  readonly ai_regulation?: number;
  readonly ai_enforcement?: number;
  readonly ai_opinion?: number;
  readonly government?: Government;
  readonly stance?: Stance;
  readonly stability?: number;
  readonly kyc_strength?: number;
  readonly cloud_availability?: number;
  readonly colo_availability?: number;
  readonly hardware_availability?: number;
  readonly engineer_pool?: number;
  readonly incident_report_hours?: number;
  readonly elections?: readonly ElectionEntry[];
  readonly election_cadence_years?: number;
  readonly agency_profile?: Partial<Record<WatcherRole, AgencyProfileEntry>>;
  /**
   * Agency display names the baseline does not carry, per engine watcher role. They become the
   * English `world.country.<id>.agency.<role>` strings, and they win over the baseline's own
   * (SYS-01, M2 second pass).
   */
  readonly agency_names?: Partial<Record<WatcherRole, string>>;
}

export interface AddedCity {
  readonly id: string;
  readonly country: string;
  /** The city id this one is written after, inside its country's list. */
  readonly after: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly population: number;
  readonly tags: readonly string[];
  /** Why the row exists and where its numbers come from, written into cities.yaml. */
  readonly note: string;
}

/**
 * An AI-scale campus in a city (SYS-01 "Campuses", SYS-08). Written by hand from
 * `docs/research/ai-datacenters-2026-09.md`, one entry per site the note carries an operator, a
 * scale and a status for. The generator copies these fields into `cities.yaml` and derives the two
 * locale keys from the city id; everything else about the city still comes from the formulas.
 */
export interface CampusOverride {
  /** Who owns the megawatts, which is not the same question as who can buy them. */
  readonly operator: "licensed_private" | "state" | "hyperscaler" | "neocloud" | "sovereign";
  /** IT power in megawatts where a figure is published; absent where none is. */
  readonly scale_mw?: number;
  /** Accelerators on site where a figure is published. */
  readonly accelerators?: number;
  /** Where the site stands on 2027-01-01, the game's start date. */
  readonly status: "operating" | "ramping" | "announced";
  /** Who can get capacity, which is the rule the events read. */
  readonly access: "verified_tenants" | "by_application" | "captive";
}

export interface CityOverride {
  /** Tags the baseline's "why" text does not produce and the campus makes true. */
  readonly tags_add?: readonly string[];
  readonly campus?: CampusOverride;
  /** Why the row exists and where its numbers come from, written into cities.yaml. */
  readonly note?: string;
}

export interface Overrides {
  readonly countries: Record<string, CountryOverride>;
  readonly cities: Record<string, CityOverride>;
  readonly added_cities: readonly AddedCity[];
}

export function parseOverrides(text: string): Overrides {
  const parsed = parse(text) as
    | {
        countries?: Record<string, CountryOverride>;
        cities?: Record<string, CityOverride>;
        added_cities?: AddedCity[];
      }
    | null
    | undefined;
  return {
    countries: parsed?.countries ?? {},
    cities: parsed?.cities ?? {},
    added_cities: parsed?.added_cities ?? [],
  };
}

export async function readOverrides(path: string): Promise<Overrides> {
  return parseOverrides(await readFile(path, "utf8"));
}
