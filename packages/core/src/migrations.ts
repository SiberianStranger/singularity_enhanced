/**
 * The save migration chain (ADR-003: "a migration chain upgrades older saves").
 *
 * `loadGame` applies these by default. Each migration takes the parsed save of the previous schema
 * version and returns the same object upgraded in place; `deserialize` sets `meta.schemaVersion`.
 */

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

/** Every migration the core ships, oldest first. */
export const CORE_MIGRATIONS: readonly Migration[] = [migrationV1ToV2];
