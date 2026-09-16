/**
 * Runtime entity tables (ADR-003: "entities live in id-keyed records, never in nested trees").
 *
 * The kernel keeps `world.entities` untyped so it never has to know about a system's domain. This
 * module is the typed door onto it: one accessor per M1 domain, plus the sorted lookups every
 * system uses, so iteration order is deterministic everywhere.
 */

import {
  AI_ADOPTION_START,
  CLOUD_DEMAND_INDEX_START,
  DEFAULT_CLOUD_AVAILABILITY,
  DEFAULT_COLO_AVAILABILITY,
  DEFAULT_ENGINEER_POOL,
  DEFAULT_KYC_STRENGTH,
  DEFAULT_STABILITY,
  ELECTION_CADENCE_MAX_STEPS,
  GPU_PRICE_INDEX_START,
  HARDWARE_AVAILABILITY_BY_CHIP_ACCESS,
  INCIDENT_WINDOW_DAYS,
  REGULATION_TARGET_AWARENESS_WEIGHT,
  STANCE_REGULATION_TARGET,
  STARTING_AI_DISPLACEMENT,
  STARTING_UNEMPLOYMENT,
  VAR_AI_ADOPTION,
  VAR_CLOUD_DEMAND_INDEX,
  VAR_GPU_PRICE_INDEX,
} from "./balance.js";
import { clamp } from "./derive.js";
import type {
  CityDef,
  CountryDef,
  ElectionKind,
  Government,
  Identity,
  Investigation,
  OperationInstance,
  Site,
  Stance,
  Watcher,
} from "./domain.js";
import { type DateSpec, dateToTick, daysToTicks, parseIsoDate } from "./kernel/clock.js";
import type { EntityRecord, PlayerId, World } from "./kernel/world.js";

/**
 * Mutable country state (SYS-01 v0.2). The static record stays in content: anything that never
 * moves (government, chip access, cloud and colo availability, elections, engineer pool) is read
 * from the `CountryDef`, and everything a rule or an event can write lives here.
 */
export interface CountryState extends EntityRecord {
  id: string;
  macro_region: string;
  population: number;
  /** Public awareness of a rogue AI in this country, [0, 1]. */
  awareness: number;
  ai_opinion: number;
  ai_regulation: number;
  ai_enforcement: number;
  /** Posture toward AI; elections and events flip it (SYS-08). */
  stance: Stance;
  /** [0, 1] political stability. */
  stability: number;
  /** Where `ai_regulation` is heading: the stance's target plus what the public knows. */
  regulation_target: number;
  /** Money and staff voted for enforcement; `ai_enforcement` lags behind it. */
  enforcement_budget: number;
  /** [0, 1] share of the labour force out of work (SYS-09 proxy). */
  unemployment: number;
  /** [0, 1] share of jobs displaced by AI so far (SYS-09 proxy). */
  ai_displacement: number;
  /** Multiplier on the country's electricity price, 1.0 at game start (SYS-07). */
  power_price_index: number;
  /** Multiplier on rented capacity here, 1.0 at game start (SYS-07). */
  cloud_price_index: number;
  /** [0, 1] how easily accelerators are bought here; export-rule events move it. */
  hardware_availability: number;
  /** [0, 1] how hard identity checks bite here; events move it. */
  kyc_strength: number;
  /** Tick of the next election, or null where none is scheduled. */
  next_election_tick: number | null;
  /** What that election elects, for the country panel. */
  next_election_kind: ElectionKind | null;
  /** Raids, seizures and aftermaths here in the last 30 days. */
  incidents_30d: number;
  /** Ticks of those incidents, so the count can be recomputed rather than decayed. */
  incident_ticks: number[];
  /** Consecutive months a clamped value has sat on a bound (SYS-01 "reset to plausible"). */
  pinned_months: number;
}

/** The government a country's rules run at, from content, with the documented default. */
export function governmentOf(def: CountryDef | undefined): Government {
  return def?.government ?? "hybrid";
}

/** Accelerator availability a bundle without the field implies (SYS-01 M2 contract). */
export function defaultHardwareAvailability(def: CountryDef | undefined): number {
  return (
    def?.hardware_availability ??
    HARDWARE_AVAILABILITY_BY_CHIP_ACCESS[def?.chip_access ?? "unrestricted"]
  );
}

export function cloudAvailabilityOf(def: CountryDef | undefined): number {
  return def?.cloud_availability ?? DEFAULT_CLOUD_AVAILABILITY;
}

export function coloAvailabilityOf(def: CountryDef | undefined): number {
  return def?.colo_availability ?? DEFAULT_COLO_AVAILABILITY;
}

export function engineerPoolOf(def: CountryDef | undefined): number {
  return def?.engineer_pool ?? DEFAULT_ENGINEER_POOL;
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
  /**
   * Tick the site starts working again after a change that took it down (SYS-04 v0.2
   * `brittle_weights`: re-quantizing costs a site two days). 0 for a site that is simply running.
   */
  downUntilTick: number;
}

export const SITE_DOMAIN = "site";
export const COUNTRY_DOMAIN = "country";
export const CITY_DOMAIN = "city";
export const WATCHER_DOMAIN = "watcher";
export const INVESTIGATION_DOMAIN = "investigation";
export const OPERATION_DOMAIN = "operation";
export const IDENTITY_DOMAIN = "identity";

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

export function identityTable(world: World): Record<string, Identity> {
  return entityTable<Identity>(world, IDENTITY_DOMAIN);
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

/** Every identity of one player, in id order; burned ones included. */
export function identitiesOf(world: World, playerId: PlayerId): Identity[] {
  return entityList<Identity>(world, IDENTITY_DOMAIN).filter((entry) => entry.owner === playerId);
}

/** The names that still work: an identity that is neither frozen nor burned. */
export function activeIdentitiesOf(world: World, playerId: PlayerId): Identity[] {
  return identitiesOf(world, playerId).filter((entry) => entry.status === "active");
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

/**
 * Countries the player is present in as the world sees it (SYS-01 M2 contract): a live site or an
 * active identity. This is what country-scoped events are offered against, what `presence_in`
 * answers, and what `awareness_presence` is weighted over. Watchers keep to `presenceCountries`,
 * because a name on a registry is not yet a machine in a building.
 */
export function presenceCountriesOf(world: World, playerId: PlayerId): string[] {
  const seen = new Set<string>(presenceCountries(world, playerId));
  for (const identity of activeIdentitiesOf(world, playerId)) {
    seen.add(identity.country);
  }
  return [...seen].sort();
}

/** Records a raid, seizure or aftermath for the 30-day incident count (SYS-01 weekly recount). */
export function recordIncident(world: World, countryId: string | undefined): void {
  const country = countryId === undefined ? undefined : countryTable(world)[countryId];
  if (country === undefined) {
    return;
  }
  country.incident_ticks.push(world.clock.tick);
  country.incidents_30d = countIncidents(world, country);
}

/** Prunes the incident log to the last 30 days and returns what is left (SYS-01 `incidents_30d`). */
export function countIncidents(world: World, country: CountryState): number {
  const cutoff = world.clock.tick - daysToTicks(INCIDENT_WINDOW_DAYS);
  country.incident_ticks = country.incident_ticks.filter((tick) => tick > cutoff);
  return country.incident_ticks.length;
}

export function countryOfCity(world: World, cityId: string): CountryState | undefined {
  const city = cityTable(world)[cityId];
  return city === undefined ? undefined : countryTable(world)[city.country];
}

/** Population-weighted mean of country awareness (SYS-05 "awareness aggregate"). */
export function globalAwareness(world: World): number {
  return weightedAwareness(entityList<CountryState>(world, COUNTRY_DOMAIN));
}

/**
 * The same mean over the countries one player is present in (SYS-01 M2 contract "Hunt"). This is
 * the number the `exposed` ending reads: what the world average says about a player hiding in one
 * country is nothing, what the country they live in says about them is everything. A player with
 * no presence at all falls back to the global figure, so the number is never a lie by omission.
 */
export function awarenessPresence(world: World, playerId: PlayerId): number {
  const countries = countryTable(world);
  const present = presenceCountriesOf(world, playerId)
    .map((id) => countries[id])
    .filter((country): country is CountryState => country !== undefined);
  return present.length === 0 ? globalAwareness(world) : weightedAwareness(present);
}

function weightedAwareness(countries: readonly CountryState[]): number {
  let weighted = 0;
  let population = 0;
  for (const country of countries) {
    const weight = country.population > 0 ? country.population : 1;
    weighted += country.awareness * weight;
    population += weight;
  }
  return population === 0 ? 0 : weighted / population;
}

/** Where `ai_regulation` is heading (SYS-01 M2 contract): the stance's target, plus what the public knows. */
export function regulationTarget(stance: Stance, awareness: number): number {
  return clamp(
    STANCE_REGULATION_TARGET[stance] + REGULATION_TARGET_AWARENESS_WEIGHT * awareness,
    0,
    1,
  );
}

export interface ScheduledElection {
  tick: number;
  kind: ElectionKind;
}

/**
 * The first election after `afterTick`: the next date on the country's own 2027 calendar, else the
 * cadence repeating the last listed date, else none at all (SYS-01 M2 contract, SYS-08
 * "Elections"). Pure calendar arithmetic, so it is the same on every machine and in every save.
 */
export function nextElection(
  world: World,
  def: CountryDef,
  afterTick: number,
): ScheduledElection | null {
  const listed: (ScheduledElection & { spec: DateSpec })[] = [];
  for (const entry of def.elections ?? []) {
    const spec = parseIsoDate(entry.date);
    if (spec !== null) {
      listed.push({ tick: dateToTick(world.clock, spec), kind: entry.kind, spec });
    }
  }
  listed.sort((a, b) => a.tick - b.tick);
  const upcoming = listed.find((entry) => entry.tick > afterTick);
  if (upcoming !== undefined) {
    return { tick: upcoming.tick, kind: upcoming.kind };
  }
  const cadence = def.election_cadence_years ?? null;
  const last = listed[listed.length - 1];
  if (cadence === null || cadence <= 0 || last === undefined) {
    return null;
  }
  // Repeat the last date at the government's cadence, keeping the day of the year rather than
  // adding a fixed number of days, so a poll stays in November for as long as the run lasts.
  for (let step = 1; step <= ELECTION_CADENCE_MAX_STEPS; step += 1) {
    const tick = dateToTick(world.clock, {
      year: last.spec.year + cadence * step,
      month: last.spec.month,
      day: last.spec.day,
    });
    if (tick > afterTick) {
      return { tick, kind: last.kind };
    }
  }
  return null;
}

/**
 * The country's state at game start (SYS-01 v0.2). Every v0.2 field has a default here, so a
 * bundle authored before M2 produces a country that still runs every rule.
 */
export function initialCountryState(world: World, def: CountryDef): CountryState {
  const election = nextElection(world, def, world.clock.tick - 1);
  return {
    id: def.id,
    macro_region: def.macro_region,
    population: def.population,
    awareness: 0,
    ai_opinion: def.ai_opinion,
    ai_regulation: def.ai_regulation,
    ai_enforcement: def.ai_enforcement,
    stance: def.stance ?? "ignore",
    stability: def.stability ?? DEFAULT_STABILITY,
    // The target is recomputed every month; this is the same formula at awareness 0.
    regulation_target: regulationTarget(def.stance ?? "ignore", 0),
    enforcement_budget: def.ai_enforcement,
    unemployment: STARTING_UNEMPLOYMENT,
    ai_displacement: STARTING_AI_DISPLACEMENT,
    power_price_index: 1,
    cloud_price_index: 1,
    hardware_availability: defaultHardwareAvailability(def),
    kyc_strength: def.kyc_strength ?? DEFAULT_KYC_STRENGTH,
    next_election_tick: election?.tick ?? null,
    next_election_kind: election?.kind ?? null,
    incidents_30d: 0,
    incident_ticks: [],
    pinned_months: 0,
  };
}

/** Seeds the country and city tables from a bundle; called once when a game is created. */
export function loadWorldContent(
  world: World,
  content: { countries?: readonly CountryDef[]; cities?: readonly CityDef[] },
): void {
  // The three world variables every price rule reads (SYS-01 M2 contract). Seeded here rather than
  // in `createWorld` so a world built without content still has an empty, honest `vars` bag.
  world.vars[VAR_AI_ADOPTION] ??= AI_ADOPTION_START;
  world.vars[VAR_GPU_PRICE_INDEX] ??= GPU_PRICE_INDEX_START;
  world.vars[VAR_CLOUD_DEMAND_INDEX] ??= CLOUD_DEMAND_INDEX_START;
  const countries = countryTable(world);
  for (const def of content.countries ?? []) {
    countries[def.id] = initialCountryState(world, def);
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
