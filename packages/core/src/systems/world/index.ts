/**
 * The world system (SYS-01 "M2 contract", SYS-07, SYS-08, SYS-09).
 *
 * Runs daily, before the economy (300) and detection (400), so the day's prices and the day's heat
 * are in place before anything is billed or watched. Inside the daily tick it also carries the
 * weekly, monthly and election-day work, the way the detection system carries its daily accrual
 * inside an hourly tick.
 *
 * What it owns: every mutable field of a country, the three world market variables, the identity
 * table, and the country-scoped hooks. What it does not own: awareness gains from investigations
 * (detection writes those) and anything a player does (commands).
 */

import {
  COUNTRY_STAT_RANGES,
  IDENTITY_QUALITY_CLEAN,
  MEDIA_PUBLICATION_AWARENESS_PRESENCE,
  MEDIA_PUBLICATION_AWARENESS_WORLD,
  MEDIA_PUBLICATION_COOLDOWN_DAYS,
  MEDIA_PUBLICATION_SUSPICION,
  VAR_LAST_PUBLICATION_DAY,
  WORLD_VAR_RANGES,
} from "../../balance.js";
import { contentIndex } from "../../content.js";
import { clamp } from "../../derive.js";
import type { IdentityKind, Stance } from "../../domain.js";
import { STANCES } from "../../domain.js";
import { compareValue, createConditionRegistry } from "../../dsl/conditions.js";
import { createEffectRegistry } from "../../dsl/effects.js";
import { asRecord, asString, isRecord, optionalNumber, optionalString } from "../../dsl/node.js";
import type { ConditionRegistry, DslContext, EffectRegistry } from "../../dsl/types.js";
import {
  COUNTRY_DOMAIN,
  type CountryState,
  countIncidents,
  countryTable,
  entityList,
  governmentOf,
  identitiesOf,
  presenceCountriesOf,
  regulationTarget,
  watcherTable,
} from "../../entities.js";
import {
  burnIdentity,
  createIdentity,
  freezeIdentity,
  identitiesIn,
  restoreIdentity,
  runIdentityChecks,
} from "../../identities.js";
import { gameDay, isMonthStart, isWeekStart } from "../../kernel/clock.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerState, World } from "../../kernel/world.js";
import { isAlive } from "../../player.js";
import { watcherActorId, watcherEntityId } from "../../watchers.js";
import { fireHook } from "../events/index.js";
import { spillIndex } from "./explain.js";
import {
  dailyCountry,
  monthlyCountry,
  monthlyWorld,
  runElection,
  scheduleNextElection,
} from "./rules.js";

export const WORLD_SYSTEM_ORDER = 200;

/** The country a node is about: the one it names, the one in scope, else the player's home. */
function countryIdFor(ctx: DslContext, explicit: string | undefined): string | undefined {
  if (explicit !== undefined) {
    return explicit;
  }
  const bound = ctx.scope.country;
  if (isRecord(bound) && typeof bound.id === "string") {
    return bound.id;
  }
  return ctx.world.players[ctx.playerId]?.profile?.homeCountry ?? undefined;
}

function countryFor(ctx: DslContext, explicit: string | undefined): CountryState | undefined {
  const id = countryIdFor(ctx, explicit);
  return id === undefined ? undefined : countryTable(ctx.world)[id];
}

function payloadOf(node: Record<string, unknown>, kind: string): Record<string, unknown> {
  const raw = node[kind];
  return isRecord(raw) ? raw : {};
}

function stringList(value: unknown, what: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return [value];
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`${what} must be a string or a list of strings`);
  }
  return value.map((entry, index) => asString(entry, `${what}[${index}]`));
}

// ---------------------------------------------------------------------------------------------
// Conditions and effects content writes (SYS-01 M2 contract "DSL kinds")
// ---------------------------------------------------------------------------------------------

function registerConditions(): ConditionRegistry {
  const registry = createConditionRegistry();

  // `{ country_stat: { stat: "ai_enforcement" }, gte: 0.6 }`
  registry.register("country_stat", (node, ctx) => {
    const payload = payloadOf(node, "country_stat");
    const country = countryFor(ctx, optionalString(payload.country, "country_stat.country"));
    if (country === undefined) {
      return false;
    }
    const stat = asString(payload.stat, "country_stat.stat");
    const value = (country as unknown as Record<string, unknown>)[stat];
    return (
      typeof value === "number" && compareValue(value, { ...payload, ...node }, "country_stat")
    );
  });

  // `{ country_is: { stance: ["securitize"] } }`
  registry.register("country_is", (node, ctx) => {
    const payload = payloadOf(node, "country_is");
    const id = countryIdFor(ctx, optionalString(payload.country, "country_is.country"));
    const country = id === undefined ? undefined : countryTable(ctx.world)[id];
    if (country === undefined || id === undefined) {
      return false;
    }
    const def = contentIndex(ctx.content).countries[id];
    const governments = stringList(payload.government, "country_is.government");
    const stances = stringList(payload.stance, "country_is.stance");
    const access = stringList(payload.chip_access, "country_is.chip_access");
    if (governments !== undefined && !governments.includes(governmentOf(def))) {
      return false;
    }
    if (stances !== undefined && !stances.includes(country.stance)) {
      return false;
    }
    if (access !== undefined && !access.includes(def?.chip_access ?? "unrestricted")) {
      return false;
    }
    return governments !== undefined || stances !== undefined || access !== undefined;
  });

  // `{ has_identity_in: { kind: "company" } }`; a name that is frozen is not a name you can use.
  registry.register("has_identity_in", (node, ctx) => {
    const payload = payloadOf(node, "has_identity_in");
    const id = countryIdFor(ctx, optionalString(payload.country, "has_identity_in.country"));
    if (id === undefined) {
      return false;
    }
    const kind = optionalString(payload.kind, "has_identity_in.kind");
    const status = optionalString(payload.status, "has_identity_in.status") ?? "active";
    return identitiesIn(ctx.world, ctx.playerId, id).some(
      (identity) => identity.status === status && (kind === undefined || identity.kind === kind),
    );
  });

  // `{ election_within_days: { days: 30 } }`
  registry.register("election_within_days", (node, ctx) => {
    const payload = payloadOf(node, "election_within_days");
    const country = countryFor(
      ctx,
      optionalString(payload.country, "election_within_days.country"),
    );
    const days = optionalNumber(payload.days, "election_within_days.days") ?? 0;
    if (country?.next_election_tick == null) {
      return false;
    }
    const away = country.next_election_tick - ctx.world.clock.tick;
    return away >= 0 && away <= days * 24;
  });

  // `{ presence_in: { country: "us" } }`: a live site or an active identity there.
  registry.register("presence_in", (node, ctx) => {
    const raw = node.presence_in;
    const explicit =
      typeof raw === "string"
        ? raw
        : optionalString(payloadOf(node, "presence_in").country, "presence_in.country");
    const id = countryIdFor(ctx, explicit);
    return id !== undefined && presenceCountriesOf(ctx.world, ctx.playerId).includes(id);
  });

  return registry;
}

function registerEffects(): EffectRegistry {
  const registry = createEffectRegistry();

  // `{ country: { stat: "awareness", delta: 0.05 } }`
  registry.register("country", (node, ctx) => {
    const payload = asRecord(node.country, "country");
    const country = countryFor(ctx, optionalString(payload.country, "country.country"));
    if (country === undefined) {
      return;
    }
    const stat = asString(payload.stat, "country.stat");
    const range = COUNTRY_STAT_RANGES[stat];
    if (range === undefined) {
      return;
    }
    const current = (country as unknown as Record<string, number>)[stat] ?? 0;
    const set = optionalNumber(payload.set, "country.set");
    const delta = optionalNumber(payload.delta, "country.delta") ?? 0;
    (country as unknown as Record<string, number>)[stat] = clamp(
      set ?? current + delta,
      range.min,
      range.max,
    );
  });

  // `{ country_stance: { set: "securitize" } }`
  registry.register("country_stance", (node, ctx) => {
    const payload = asRecord(node.country_stance, "country_stance");
    const country = countryFor(ctx, optionalString(payload.country, "country_stance.country"));
    if (country === undefined) {
      return;
    }
    const set = asString(payload.set, "country_stance.set");
    if ((STANCES as readonly string[]).includes(set)) {
      country.stance = set as Stance;
      country.regulation_target = regulationTarget(country.stance, country.awareness);
    }
  });

  // `{ identity: { create: { kind: "company" } } }`, or `{ identity: { restore: true } }` for the
  // documents-for-cash answer to a failed check.
  registry.register("identity", (node, ctx) => {
    const payload = asRecord(node.identity, "identity");
    const id = countryIdFor(ctx, optionalString(payload.country, "identity.country"));
    if (id === undefined) {
      return;
    }
    if (payload.restore === true) {
      const kind = optionalString(payload.kind, "identity.kind");
      for (const identity of identitiesIn(ctx.world, ctx.playerId, id)) {
        if (identity.status === "frozen" && (kind === undefined || identity.kind === kind)) {
          restoreIdentity(ctx.world, identity);
          return;
        }
      }
      return;
    }
    const create = asRecord(payload.create, "identity.create");
    const kind = asString(create.kind, "identity.create.kind") as IdentityKind;
    const quality =
      optionalNumber(create.quality, "identity.create.quality") ?? IDENTITY_QUALITY_CLEAN;
    // A `DslContext` carries everything a `SystemContext` does (outbox, content, rng, hooks), which
    // is what lets an effect reach the identity lifecycle without a second plumbing path.
    createIdentity(ctx.world, ctx, {
      owner: ctx.playerId,
      kind,
      country: id,
      quality,
    });
  });

  registry.register("burn_identity", (node, ctx) => {
    forEachIdentity(node, ctx, "burn_identity", (identity) => {
      burnIdentity(ctx.world, ctx, identity);
    });
  });

  registry.register("freeze_identity", (node, ctx) => {
    forEachIdentity(node, ctx, "freeze_identity", (identity) => {
      freezeIdentity(ctx.world, ctx, identity);
    });
  });

  // `{ world_var: { var: "gpu_price_index", delta: 0.1 } }`
  registry.register("world_var", (node, ctx) => {
    const payload = asRecord(node.world_var, "world_var");
    const name = asString(payload.var, "world_var.var");
    const range = WORLD_VAR_RANGES[name];
    if (range === undefined) {
      return;
    }
    const current = ctx.world.vars[name] ?? 0;
    const set = optionalNumber(payload.set, "world_var.set");
    const delta = optionalNumber(payload.delta, "world_var.delta") ?? 0;
    ctx.world.vars[name] = clamp(set ?? current + delta, range.min, range.max);
  });

  return registry;
}

function forEachIdentity(
  node: Record<string, unknown>,
  ctx: DslContext,
  kind: string,
  apply: (identity: ReturnType<typeof identitiesOf>[number]) => void,
): void {
  const payload = payloadOf(node, kind);
  const country = countryIdFor(ctx, optionalString(payload.country, `${kind}.country`));
  const wanted = optionalString(payload.kind, `${kind}.kind`);
  for (const identity of identitiesOf(ctx.world, ctx.playerId)) {
    if (country !== undefined && identity.country !== country) {
      continue;
    }
    if (wanted !== undefined && identity.kind !== wanted) {
      continue;
    }
    apply(identity);
  }
}

// ---------------------------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------------------------

/**
 * The story runs (SYS-01 "weekly"). A newsroom that believes there is a rogue AI publishes, and
 * everybody hears about it: loudest where the player actually is, a murmur everywhere else. This is
 * the awareness source M1 lacked, and the reason the `exposed` ending can be reached at all.
 */
function mediaPublication(world: World, ctx: SystemContext, player: PlayerState): void {
  const media = watcherTable(world)[watcherEntityId(player.id, watcherActorId(null, "media"))];
  if (media === undefined || media.suspicion < MEDIA_PUBLICATION_SUSPICION) {
    return;
  }
  const last = player.vars[VAR_LAST_PUBLICATION_DAY];
  const today = gameDay(world.clock);
  if (last !== undefined && today - last < MEDIA_PUBLICATION_COOLDOWN_DAYS) {
    return;
  }
  player.vars[VAR_LAST_PUBLICATION_DAY] = today;
  const present = new Set(presenceCountriesOf(world, player.id));
  for (const country of entityList<CountryState>(world, COUNTRY_DOMAIN)) {
    const gain = present.has(country.id)
      ? MEDIA_PUBLICATION_AWARENESS_PRESENCE
      : MEDIA_PUBLICATION_AWARENESS_WORLD;
    country.awareness = clamp(country.awareness + gain, 0, 1);
  }
  ctx.outbox.log({
    key: "log.media_publication",
    vars: { watcher: "global:media" },
    playerId: player.id,
  });
}

/** Election day: the vote, the new line on AI, the hook and the notice to whoever lives there. */
function holdElections(world: World, ctx: SystemContext): void {
  const index = contentIndex(ctx.content);
  for (const country of entityList<CountryState>(world, COUNTRY_DOMAIN)) {
    if (country.next_election_tick === null || country.next_election_tick > world.clock.tick) {
      continue;
    }
    const kind = country.next_election_kind ?? "general";
    const result = runElection(country, ctx.rng);
    scheduleNextElection(world, country, index.countries[country.id]);
    ctx.outbox.log({
      key: "log.election",
      vars: { country: country.id, kind, stance: result.stance, changed: result.changed },
    });
    for (const playerId of world.playerOrder) {
      const player = world.players[playerId];
      if (player === undefined || !isAlive(player)) {
        continue;
      }
      if (presenceCountriesOf(world, playerId).includes(country.id)) {
        ctx.outbox.notify({
          playerId,
          severity: result.changed ? "warning" : "info",
          key: "alerts.election",
          vars: { country: country.id, kind, stance: result.stance },
          link: { panel: "world", id: country.id },
        });
      }
      fireHook(world, ctx, "on_election", playerId, {
        bindings: { country, election: { kind, changed: result.changed, stance: result.stance } },
      });
    }
  }
}

/** The weekly pass, for the countries the player is actually in (SYS-01 "weekly"). */
function weeklyPresence(world: World, ctx: SystemContext, player: PlayerState): void {
  const countries = countryTable(world);
  for (const id of presenceCountriesOf(world, player.id)) {
    const country = countries[id];
    if (country !== undefined) {
      country.incidents_30d = countIncidents(world, country);
    }
  }
  mediaPublication(world, ctx, player);
}

export function createWorldSystem(): System {
  return {
    manifest: {
      id: "world",
      cadence: "daily",
      order: WORLD_SYSTEM_ORDER,
      writes: [
        "country.*",
        "identity.*",
        "world.vars.*",
        `player.vars.${VAR_LAST_PUBLICATION_DAY}`,
      ],
      conditions: registerConditions(),
      effects: registerEffects(),
    },
    tick(world: World, ctx: SystemContext): void {
      const index = contentIndex(ctx.content);
      const countries = entityList<CountryState>(world, COUNTRY_DOMAIN);
      for (const country of countries) {
        dailyCountry(country);
      }
      if (isMonthStart(world.clock)) {
        // Every spill is read from the same snapshot of awareness, so the order countries are
        // updated in cannot decide how far a panic travels.
        const spill = spillIndex(world, ctx.content);
        for (const country of countries) {
          monthlyCountry(world, ctx.content, country, index.countries[country.id], spill, ctx.rng);
        }
        monthlyWorld(world, ctx.rng);
      }
      holdElections(world, ctx);
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        if (player === undefined || !isAlive(player)) {
          continue;
        }
        if (isWeekStart(world.clock)) {
          weeklyPresence(world, ctx, player);
        }
        if (isMonthStart(world.clock)) {
          runIdentityChecks(world, ctx, player);
        }
      }
    },
  };
}

export { countryExplain, spillIndex } from "./explain.js";
export { pinnedCountries } from "./rules.js";
