/**
 * Watchers: who is looking at this player, where they look and how good they are (SYS-05).
 *
 * A watcher exists per player, per country the player is present in, per role, plus the two global
 * roles that watch everywhere. They are created lazily: a player with one site in one country has
 * six watchers, not a table of every agency on earth. Shared with the setup, which seeds the
 * starting suspicion an origin and a generation come with.
 */

import {
  FINANCIAL_INTEL_FINANCIAL_ATTENTION,
  GLOBAL_WATCHER_COMPETENCE,
  GLOBAL_WATCHER_ROLES,
  KYC_FINANCIAL_THRESHOLD,
  LOCAL_WATCHER_ROLES,
  MIN_WATCHER_COMPETENCE,
  REGULATION_TELEMETRY_THRESHOLD,
  REGULATOR_TELEMETRY_ATTENTION,
  SECURITIZE_HUMAN_ATTENTION,
  WATCHER_ATTENTION,
} from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import { clamp } from "./derive.js";
import type { Exposure, ExposureChannel, Site, Watcher, WatcherRole } from "./domain.js";
import { EXPOSURE_CHANNELS } from "./domain.js";
import {
  type CountryState,
  cityTable,
  countryTable,
  presenceCountries,
  watchersOf,
  watcherTable,
} from "./entities.js";
import type { PlayerId, World } from "./kernel/world.js";

export const GLOBAL_JURISDICTION = "global";

/** The actor a watcher is: `us:cyber_agency`, `global:media`. Shared across players. */
export function watcherActorId(country: string | null, role: WatcherRole): string {
  return `${country ?? GLOBAL_JURISDICTION}:${role}`;
}

/** The entity id of one player's view of that actor. */
export function watcherEntityId(playerId: PlayerId, actorId: string): string {
  return `${playerId}/${actorId}`;
}

export function splitActorId(actorId: string): { country: string | null; role: string } {
  const [scope, role] = actorId.split(":", 2);
  return {
    country: scope === GLOBAL_JURISDICTION || scope === undefined ? null : scope,
    role: role ?? "",
  };
}

/**
 * What a country's own law makes its watchers look at (SYS-01 M2 contract "Watchers", SYS-08
 * "each threshold enables specific watcher behaviors"). Added before normalization, so a regulator
 * with compute reporting looks at telemetry at the cost of everything else rather than on top of
 * it. A watcher with no country behind it has no law to read.
 */
export function countryAttention(
  country: CountryState | undefined,
  role: WatcherRole,
): Partial<Exposure> {
  if (country === undefined) {
    return {};
  }
  const extra: Partial<Exposure> = {};
  if (role === "regulator" && country.ai_regulation >= REGULATION_TELEMETRY_THRESHOLD) {
    extra.telemetry = REGULATOR_TELEMETRY_ATTENTION;
  }
  if (role === "financial_intel" && country.kyc_strength >= KYC_FINANCIAL_THRESHOLD) {
    extra.financial = FINANCIAL_INTEL_FINANCIAL_ATTENTION;
  }
  if (country.stance === "securitize") {
    extra.human = (extra.human ?? 0) + SECURITIZE_HUMAN_ATTENTION;
  }
  return extra;
}

/** Attention over every channel, normalized to sum to 1 (SYS-05). */
export function attentionFor(role: WatcherRole, extra: Partial<Exposure> = {}): Exposure {
  const table = WATCHER_ATTENTION[role];
  const attention = {} as Exposure;
  let total = 0;
  for (const channel of EXPOSURE_CHANNELS) {
    const value = (table[channel] ?? 0) + (extra[channel] ?? 0);
    attention[channel] = value;
    total += value;
  }
  if (total > 0 && Math.abs(total - 1) > 1e-9) {
    for (const channel of EXPOSURE_CHANNELS) {
      attention[channel] = attention[channel] / total;
    }
  }
  return attention;
}

/**
 * How good a watcher is and how fast it can move (SYS-01 M2 contract "Watchers"). Content may
 * author both per country and per role in `agency_profile`; where it does not, both are the
 * country's `ai_enforcement`, which is what M1 used for every role everywhere.
 */
export function agencyProfile(
  world: World,
  content: ContentBundle | undefined,
  country: string | null,
  role: WatcherRole,
): { competence: number; budget: number } {
  if (country === null) {
    const competence = GLOBAL_WATCHER_COMPETENCE[role];
    return { competence, budget: competence };
  }
  const enforcement = countryTable(world)[country]?.ai_enforcement ?? MIN_WATCHER_COMPETENCE;
  const authored =
    content === undefined
      ? undefined
      : contentIndex(content).countries[country]?.agency_profile?.[role];
  return {
    competence: clamp(authored?.competence ?? enforcement, MIN_WATCHER_COMPETENCE, 1),
    budget: clamp(authored?.budget ?? enforcement, 0, 1),
  };
}

/** Creates the watcher if this player does not have it yet, and returns it either way. */
export function ensureWatcher(
  world: World,
  playerId: PlayerId,
  country: string | null,
  role: WatcherRole,
  content?: ContentBundle,
): Watcher {
  const actorId = watcherActorId(country, role);
  const id = watcherEntityId(playerId, actorId);
  const table = watcherTable(world);
  const existing = table[id];
  if (existing !== undefined) {
    return existing;
  }
  const profile = agencyProfile(world, content, country, role);
  const watcher: Watcher = {
    id,
    playerId,
    country,
    role,
    suspicion: 0,
    attention: attentionFor(role, countryAttention(countryOf(world, country), role)),
    competence: profile.competence,
    budget: profile.budget,
  };
  table[id] = watcher;
  return watcher;
}

function countryOf(world: World, country: string | null): CountryState | undefined {
  return country === null ? undefined : countryTable(world)[country];
}

/**
 * Keeps a watcher's attention on what its country's law makes it look at today. Competence is not
 * refreshed: it is set when the watcher is created and only an aftermath raises it, because an
 * agency that has been through a case has learned something a budget line cannot take back.
 */
export function refreshWatcher(world: World, content: ContentBundle, watcher: Watcher): void {
  const country = countryOf(world, watcher.country);
  watcher.attention = attentionFor(watcher.role, countryAttention(country, watcher.role));
  if (watcher.country !== null) {
    watcher.budget = agencyProfile(world, content, watcher.country, watcher.role).budget;
  }
}

/** Every watcher a player's current presence implies; new countries add theirs on first sight. */
export function ensureWatchers(
  world: World,
  playerId: PlayerId,
  content?: ContentBundle,
): Watcher[] {
  for (const role of GLOBAL_WATCHER_ROLES) {
    ensureWatcher(world, playerId, null, role, content);
  }
  for (const country of presenceCountries(world, playerId)) {
    for (const role of LOCAL_WATCHER_ROLES) {
      ensureWatcher(world, playerId, country, role, content);
    }
  }
  return watchersOf(world, playerId);
}

/** Whether a site falls inside a watcher's jurisdiction. */
export function watches(world: World, watcher: Watcher, site: Site): boolean {
  if (watcher.country === null) {
    return true;
  }
  return cityTable(world)[site.city]?.country === watcher.country;
}

/** How loud a site is in the channels this watcher actually looks at. */
export function watchedExposure(watcher: Watcher, site: Site): number {
  let total = 0;
  for (const channel of EXPOSURE_CHANNELS) {
    total += site.exposure[channel] * watcher.attention[channel];
  }
  return total;
}

/** The channel a watcher weights most, for the icon in the detection panel. */
export function topChannel(watcher: Watcher): ExposureChannel {
  let best: ExposureChannel = "network";
  for (const channel of EXPOSURE_CHANNELS) {
    if (watcher.attention[channel] > watcher.attention[best]) {
      best = channel;
    }
  }
  return best;
}

/** Writes a watcher's suspicion and mirrors it onto the player, where content can read it. */
export function setSuspicion(world: World, watcher: Watcher, value: number): void {
  watcher.suspicion = clamp(value, 0, 1);
  const player = world.players[watcher.playerId];
  if (player !== undefined) {
    const { country, role } = splitActorId(watcher.id.split("/", 2)[1] ?? "");
    player.suspicion[watcherActorId(country, role as WatcherRole)] = watcher.suspicion;
  }
}
