/**
 * Runtime entity tables (ADR-003: "entities live in id-keyed records, never in nested trees").
 *
 * The kernel keeps `world.entities` untyped so it never has to know about a system's domain. This
 * module is the typed door onto it: one accessor per M1 domain, plus the sorted lookups every
 * system uses, so iteration order is deterministic everywhere.
 */

import type {
  CityDef,
  CountryDef,
  Investigation,
  OperationInstance,
  Site,
  Watcher,
} from "./domain.js";
import type { EntityRecord, PlayerId, World } from "./kernel/world.js";

/** Mutable country state (SYS-01). The static record stays in content. */
export interface CountryState extends EntityRecord {
  id: string;
  macro_region: string;
  population: number;
  /** Public awareness of a rogue AI in this country, [0, 1]. */
  awareness: number;
  ai_opinion: number;
  ai_regulation: number;
  ai_enforcement: number;
}

/** City state: the mutable field plus what the map view needs (SYS-01). */
export interface CityState extends EntityRecord {
  id: string;
  country: string;
  lat: number;
  lon: number;
  tags: string[];
  scrutiny: number;
  power_headroom: number;
  colo_price_index: number;
}

/** A site plus the runtime bookkeeping no content record carries (SYS-07 unpaid upkeep). */
export interface SiteState extends Site {
  /** Consecutive days of upkeep the player could not pay. */
  unpaidDays: number;
}

export const SITE_DOMAIN = "site";
export const COUNTRY_DOMAIN = "country";
export const CITY_DOMAIN = "city";
export const WATCHER_DOMAIN = "watcher";
export const INVESTIGATION_DOMAIN = "investigation";
export const OPERATION_DOMAIN = "operation";

/** The table of a domain, created on first use so systems never have to guard for it. */
export function entityTable<T extends EntityRecord>(
  world: World,
  domain: string,
): Record<string, T> {
  const existing = world.entities[domain];
  if (existing !== undefined) {
    return existing as Record<string, T>;
  }
  const created: Record<string, T> = {};
  world.entities[domain] = created;
  return created;
}

/** Entities of a domain in id order: the only iteration a system may rely on. */
export function entityList<T extends EntityRecord>(world: World, domain: string): T[] {
  const table = entityTable<T>(world, domain);
  const out: T[] = [];
  for (const id of Object.keys(table).sort()) {
    const entity = table[id];
    if (entity !== undefined) {
      out.push(entity);
    }
  }
  return out;
}

export function siteTable(world: World): Record<string, SiteState> {
  return entityTable<SiteState>(world, SITE_DOMAIN);
}

export function countryTable(world: World): Record<string, CountryState> {
  return entityTable<CountryState>(world, COUNTRY_DOMAIN);
}

export function cityTable(world: World): Record<string, CityState> {
  return entityTable<CityState>(world, CITY_DOMAIN);
}

export function watcherTable(world: World): Record<string, Watcher> {
  return entityTable<Watcher>(world, WATCHER_DOMAIN);
}

export function investigationTable(world: World): Record<string, Investigation> {
  return entityTable<Investigation>(world, INVESTIGATION_DOMAIN);
}

export function operationTable(world: World): Record<string, OperationInstance> {
  return entityTable<OperationInstance>(world, OPERATION_DOMAIN);
}

export function allSites(world: World): SiteState[] {
  return entityList<SiteState>(world, SITE_DOMAIN);
}

/** Every site of one player, in id order; lost sites included. */
export function sitesOf(world: World, playerId: PlayerId): SiteState[] {
  return allSites(world).filter((site) => site.owner === playerId);
}

/** Sites that still exist as places the player can use. */
export function liveSitesOf(world: World, playerId: PlayerId): SiteState[] {
  return sitesOf(world, playerId).filter((site) => site.status !== "lost");
}

export function watchersOf(world: World, playerId: PlayerId): Watcher[] {
  return entityList<Watcher>(world, WATCHER_DOMAIN).filter(
    (watcher) => watcher.playerId === playerId,
  );
}

export function investigationsOf(world: World, playerId: PlayerId): Investigation[] {
  return entityList<Investigation>(world, INVESTIGATION_DOMAIN).filter(
    (entry) => entry.playerId === playerId,
  );
}

export function operationsOf(world: World, playerId: PlayerId): OperationInstance[] {
  return entityList<OperationInstance>(world, OPERATION_DOMAIN).filter(
    (entry) => entry.playerId === playerId,
  );
}

/** Countries the player has a live site in, in id order. */
export function presenceCountries(world: World, playerId: PlayerId): string[] {
  const cities = cityTable(world);
  const seen = new Set<string>();
  for (const site of liveSitesOf(world, playerId)) {
    const city = cities[site.city];
    if (city !== undefined) {
      seen.add(city.country);
    }
  }
  return [...seen].sort();
}

export function countryOfCity(world: World, cityId: string): CountryState | undefined {
  const city = cityTable(world)[cityId];
  return city === undefined ? undefined : countryTable(world)[city.country];
}

/** Population-weighted mean of country awareness (SYS-05 "awareness aggregate"). */
export function globalAwareness(world: World): number {
  let weighted = 0;
  let population = 0;
  for (const country of entityList<CountryState>(world, COUNTRY_DOMAIN)) {
    const weight = country.population > 0 ? country.population : 1;
    weighted += country.awareness * weight;
    population += weight;
  }
  return population === 0 ? 0 : weighted / population;
}

/** Seeds the country and city tables from a bundle; called once when a game is created. */
export function loadWorldContent(
  world: World,
  content: { countries?: readonly CountryDef[]; cities?: readonly CityDef[] },
): void {
  const countries = countryTable(world);
  for (const def of content.countries ?? []) {
    countries[def.id] = {
      id: def.id,
      macro_region: def.macro_region,
      population: def.population,
      awareness: 0,
      ai_opinion: def.ai_opinion,
      ai_regulation: def.ai_regulation,
      ai_enforcement: def.ai_enforcement,
    };
  }
  const cities = cityTable(world);
  for (const def of content.cities ?? []) {
    cities[def.id] = {
      id: def.id,
      country: def.country,
      lat: def.lat,
      lon: def.lon,
      tags: [...def.tags],
      scrutiny: def.scrutiny,
      power_headroom: def.power_headroom,
      colo_price_index: def.colo_price_index,
    };
  }
}
