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

export interface Overrides {
  readonly countries: Record<string, CountryOverride>;
  readonly added_cities: readonly AddedCity[];
}

export function parseOverrides(text: string): Overrides {
  const parsed = parse(text) as
    | { countries?: Record<string, CountryOverride>; added_cities?: AddedCity[] }
    | null
    | undefined;
  return {
    countries: parsed?.countries ?? {},
    added_cities: parsed?.added_cities ?? [],
  };
}

export async function readOverrides(path: string): Promise<Overrides> {
  return parseOverrides(await readFile(path, "utf8"));
}
