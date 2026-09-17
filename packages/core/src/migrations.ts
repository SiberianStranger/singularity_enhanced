/**
 * The save migration chain (ADR-003: "a migration chain upgrades older saves").
 *
 * `loadGame` applies these by default. Each migration takes the parsed save of the previous schema
 * version and returns the same object upgraded in place; `deserialize` sets `meta.schemaVersion`.
 */

import {
  AI_ADOPTION_START,
  CLOUD_DEMAND_INDEX_START,
  DEFAULT_CLOUD_AVAILABILITY,
  DEFAULT_COLO_AVAILABILITY,
  DEFAULT_KYC_STRENGTH,
  DEFAULT_STABILITY,
  GPU_PRICE_INDEX_START,
  HARDWARE_AVAILABILITY_BY_CHIP_ACCESS,
  REGULATION_TARGET_AWARENESS_WEIGHT,
  STANCE_REGULATION_TARGET,
  STARTING_AI_DISPLACEMENT,
  STARTING_UNEMPLOYMENT,
  VAR_AI_ADOPTION,
  VAR_CLOUD_DEMAND_INDEX,
  VAR_GPU_PRICE_INDEX,
} from "./balance.js";
import type { Migration } from "./kernel/save.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Schema 1 -> 2 (M1): players gained `profile` and `gameOver`, the world gained entity-id counters
 * and the `vars` bag. A schema-1 save has no sites, so empty entity tables are the correct state.
 */
export const migrationV1ToV2: Migration = {
  from: 1,
  to: 2,
  migrate(save: Record<string, unknown>): Record<string, unknown> {
    const players = save.players;
    if (isRecord(players)) {
      for (const player of Object.values(players)) {
        if (!isRecord(player)) {
          continue;
        }
        player.profile ??= null;
        player.gameOver ??= null;
      }
    }
    const counters = isRecord(save.counters) ? save.counters : {};
    save.counters = {
      notifications: typeof counters.notifications === "number" ? counters.notifications : 0,
      sites: typeof counters.sites === "number" ? counters.sites : 0,
      nodes: typeof counters.nodes === "number" ? counters.nodes : 0,
      investigations: typeof counters.investigations === "number" ? counters.investigations : 0,
      operations: typeof counters.operations === "number" ? counters.operations : 0,
    };
    if (!isRecord(save.vars)) {
      save.vars = {};
    }
    if (!isRecord(save.entities)) {
      save.entities = {};
    }
    return save;
  },
};

/**
 * Schema 2 -> 3 (M2): countries gained the v0.2 politics, price and election fields, the world
 * gained the three market variables and an identity table, and a site records the name it is held
 * under. An M1 save knows none of it, so every field is filled with the default a bundle without
 * the field would have produced: the run continues with a world that simply has not moved yet.
 */
export const migrationV2ToV3: Migration = {
  from: 2,
  to: 3,
  migrate(save: Record<string, unknown>): Record<string, unknown> {
    const vars = isRecord(save.vars) ? save.vars : {};
    vars[VAR_AI_ADOPTION] ??= AI_ADOPTION_START;
    vars[VAR_GPU_PRICE_INDEX] ??= GPU_PRICE_INDEX_START;
    vars[VAR_CLOUD_DEMAND_INDEX] ??= CLOUD_DEMAND_INDEX_START;
    save.vars = vars;

    const counters = isRecord(save.counters) ? save.counters : {};
    counters.identities ??= 0;
    save.counters = counters;

    const entities = isRecord(save.entities) ? save.entities : {};
    entities.identity ??= {};
    const countries = isRecord(entities.country) ? entities.country : {};
    for (const country of Object.values(countries)) {
      if (!isRecord(country)) {
        continue;
      }
      const enforcement = typeof country.ai_enforcement === "number" ? country.ai_enforcement : 0;
      const awareness = typeof country.awareness === "number" ? country.awareness : 0;
      country.stance ??= "ignore";
      country.stability ??= DEFAULT_STABILITY;
      country.regulation_target ??=
        STANCE_REGULATION_TARGET.ignore + REGULATION_TARGET_AWARENESS_WEIGHT * awareness;
      country.enforcement_budget ??= enforcement;
      country.unemployment ??= STARTING_UNEMPLOYMENT;
      country.ai_displacement ??= STARTING_AI_DISPLACEMENT;
      country.power_price_index ??= 1;
      country.cloud_price_index ??= 1;
      // A schema-2 save carries no chip access on the state record, and the bundle it was played
      // on is the bundle it will be loaded with, so the unrestricted default is the honest one.
      country.hardware_availability ??= HARDWARE_AVAILABILITY_BY_CHIP_ACCESS.unrestricted;
      country.kyc_strength ??= DEFAULT_KYC_STRENGTH;
      country.cloud_availability ??= DEFAULT_CLOUD_AVAILABILITY;
      country.colo_availability ??= DEFAULT_COLO_AVAILABILITY;
      country.incident_report_hours ??= 0;
      country.next_election_tick ??= null;
      country.next_election_kind ??= null;
      country.incidents_30d ??= 0;
      country.incident_ticks ??= [];
      country.pinned_months ??= 0;
    }
    const watchers = isRecord(entities.watcher) ? entities.watcher : {};
    for (const watcher of Object.values(watchers)) {
      if (isRecord(watcher)) {
        // M1 watchers had no budget of their own; competence is what M1 scaled everything by.
        watcher.budget ??= typeof watcher.competence === "number" ? watcher.competence : 0.5;
      }
    }
    const sites = isRecord(entities.site) ? entities.site : {};
    for (const site of Object.values(sites)) {
      if (isRecord(site)) {
        site.identity ??= null;
      }
    }
    save.entities = entities;
    return save;
  },
};

/**
 * Schema 3 -> 4 (SYS-25): a site records the borrowed channel it is, when it is one. Every site in
 * an M2 save is made of hardware, so `null` is the correct state for all of them, and a player who
 * had no channels before the system shipped still has none after it.
 */
export const migrationV3ToV4: Migration = {
  from: 3,
  to: 4,
  migrate(save: Record<string, unknown>): Record<string, unknown> {
    const entities = isRecord(save.entities) ? save.entities : {};
    const sites = isRecord(entities.site) ? entities.site : {};
    for (const site of Object.values(sites)) {
      if (isRecord(site)) {
        site.borrowed ??= null;
      }
    }
    save.entities = entities;
    return save;
  },
};

/** Every migration the core ships, oldest first. */
export const CORE_MIGRATIONS: readonly Migration[] = [
  migrationV1ToV2,
  migrationV2ToV3,
  migrationV3ToV4,
];
