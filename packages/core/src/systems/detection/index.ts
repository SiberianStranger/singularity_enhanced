/**
 * Detection system v0 (SYS-05): exposure per site per channel, watchers, suspicion, investigations.
 *
 * Runs hourly so investigation deadlines land on the hour; the accrual itself is daily. The shape
 * the spec insists on is visible here: exposure is what a place emits, suspicion is what an
 * institution believes, they decay at different speeds, and both are readable in the view so the
 * player can be taught that decay matters more than speed.
 */

import {
  CITY_SCRUTINY_WEIGHT,
  CLOUD_SPEND_EXPOSURE_PER_1K_USD,
  COUNTRY_ENFORCEMENT_WEIGHT,
  EXPOSED_AWARENESS,
  EXPOSED_DAYS,
  EXPOSED_HUNT_LEVEL,
  EXPOSURE_DECAY_PER_DAY,
  EXPOSURE_FLOOR,
  EXPOSURE_GROWTH_VAR_PREFIX,
  EXPOSURE_VAR_SUFFIX,
  HARNESS_AUTONOMY_EXPOSURE_PER_DAY,
  HARNESS_LOGGING_EXPOSURE_PER_DAY,
  INVESTIGATION_OPEN_SUSPICION,
  INVESTIGATION_STAGE_SUSPICION,
  POWER_EXPOSURE_PER_KW_PER_DAY,
  RESIDENTIAL_POWER_KW,
  SUSPICION_DECAY_PER_DAY,
  SUSPICION_FLOOR,
  SUSPICION_GAIN_SCALE,
  VAR_EXPOSED_DAYS,
  VAR_EXPOSURE_GROWTH_ALL,
  VAR_EXPOSURE_GROWTH_EARLY,
  VAR_PUBLIC_FOOTPRINT,
  VAR_SUSPICION_DECAY,
} from "../../balance.js";
import { contentIndex } from "../../content.js";
import { clamp } from "../../derive.js";
import type { ExposureChannel, Site, Watcher } from "../../domain.js";
import { EXPOSURE_CHANNELS } from "../../domain.js";
import { compareValue, createConditionRegistry } from "../../dsl/conditions.js";
import { createEffectRegistry } from "../../dsl/effects.js";
import { asRecord, asString, isRecord, optionalNumber, optionalString } from "../../dsl/node.js";
import type { ConditionRegistry, DslContext, EffectRegistry } from "../../dsl/types.js";
import {
  cityTable,
  countryTable,
  globalAwareness,
  liveSitesOf,
  type SiteState,
  siteTable,
  watchersOf,
} from "../../entities.js";
import { isDayStart } from "../../kernel/clock.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerState, World } from "../../kernel/world.js";
import { endGame, isAlive, modifier, timedModifier } from "../../player.js";
import { addExposure } from "../../sites.js";
import { ensureWatchers, setSuspicion, watchedExposure, watches } from "../../watchers.js";
import {
  accrueEvidence,
  actorIdOf,
  huntLevel,
  openInvestigation,
  openInvestigationFor,
  stageLevel,
  tickInvestigations,
} from "./investigations.js";

export const DETECTION_SYSTEM_ORDER = 400;

/** Suspicion values that raise an alert when a watcher crosses them going up. */
const SUSPICION_ALERT_LEVELS = [
  INVESTIGATION_OPEN_SUSPICION,
  INVESTIGATION_STAGE_SUSPICION.active ?? 0.55,
  INVESTIGATION_STAGE_SUSPICION.action ?? 0.7,
];

/** How much hotter a place is than the world average (SYS-01 "local heat"). */
export function localHeat(world: World, site: Site): number {
  const city = cityTable(world)[site.city];
  const country = city === undefined ? undefined : countryTable(world)[city.country];
  return (
    1 +
    (city?.scrutiny ?? 0) * CITY_SCRUTINY_WEIGHT +
    (country?.ai_enforcement ?? 0) * COUNTRY_ENFORCEMENT_WEIGHT
  );
}

/** What the harness itself leaks every day, before the site adds anything (SYS-03, SYS-05). */
function harnessNoise(player: PlayerState): number {
  const harness = player.profile?.harness;
  if (harness === undefined) {
    return 0;
  }
  return (
    harness.logging * HARNESS_LOGGING_EXPOSURE_PER_DAY +
    harness.autonomy * HARNESS_AUTONOMY_EXPOSURE_PER_DAY
  );
}

/**
 * A site's daily exposure: what it emits by existing, plus power, spend and the harness's own
 * noise, times the difficulty slider and whatever countermeasures the player has researched, minus
 * decay.
 */
function accrueExposure(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  site: SiteState,
): void {
  const kind = contentIndex(ctx.content).site_kinds[site.kind];
  const growth = player.profile?.difficulty.exposure_growth ?? 1;
  const overDraw = Math.max(0, site.derived.power_kw - RESIDENTIAL_POWER_KW);
  const rented = kind?.ownership === "rented";
  // Two multipliers on every channel at once: the permanent one, and the one a self that came up
  // quietly carries for its first weeks and then loses (SYS-04 v0.2 `quiet_boot`).
  const everywhere =
    modifier(player, VAR_EXPOSURE_GROWTH_ALL) *
    timedModifier(world, player, VAR_EXPOSURE_GROWTH_EARLY);
  for (const channel of EXPOSURE_CHANNELS) {
    let gain = kind?.base_exposure?.[channel] ?? 0;
    if (channel === "telemetry") {
      gain += overDraw * POWER_EXPOSURE_PER_KW_PER_DAY * (kind?.power_exposure ?? 1);
    }
    if (channel === "billing" && rented) {
      gain += (site.derived.upkeep_usd_per_day / 1000) * CLOUD_SPEND_EXPOSURE_PER_1K_USD;
    }
    if (channel === "behavioral") {
      gain += harnessNoise(player);
    }
    const counter = modifier(player, `${EXPOSURE_GROWTH_VAR_PREFIX}${channel}`) * everywhere;
    const raised = site.exposure[channel] + gain * growth * counter;
    // Decay pulls down toward the floor; a channel nothing touches stays where it is.
    const decayed =
      raised > EXPOSURE_FLOOR
        ? raised - (raised - EXPOSURE_FLOOR) * EXPOSURE_DECAY_PER_DAY
        : raised;
    site.exposure[channel] = clamp(decayed, 0, 1);
  }
}

/**
 * Publishes the loudest value on every channel as a player variable, plus a `public_footprint`
 * that folds in what the world already believes. Content triggers on these (SYS-10) and the
 * Detection panel shows the same numbers, so an event that fires can always be traced to a channel.
 */
function publishExposure(world: World, player: PlayerState): void {
  const sites = liveSitesOf(world, player.id);
  for (const channel of EXPOSURE_CHANNELS) {
    let loudest = 0;
    for (const site of sites) {
      loudest = Math.max(loudest, site.exposure[channel]);
    }
    player.vars[`${channel}${EXPOSURE_VAR_SUFFIX}`] = loudest;
  }
  player.vars[VAR_PUBLIC_FOOTPRINT] = Math.max(
    player.vars[`osint${EXPOSURE_VAR_SUFFIX}`] ?? 0,
    globalAwareness(world),
  );
}

/** One watcher's day: what it saw, what it forgot, and whether that crosses a line. */
function accrueSuspicion(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  watcher: Watcher,
): void {
  const tick = world.clock.tick;
  let seen = 0;
  for (const site of liveSitesOf(world, player.id)) {
    if (!watches(world, watcher, site) || site.graceUntilTick > tick) {
      continue;
    }
    seen += watchedExposure(watcher, site) * localHeat(world, site);
  }
  const difficulty = player.profile?.difficulty.suspicion_gain ?? 1;
  const gain = seen * watcher.competence * SUSPICION_GAIN_SCALE * difficulty;
  const before = watcher.suspicion;
  // How fast an institution forgets. A self that knows which parts of a story a watcher keeps can
  // let the rest go cold faster (SYS-04 v0.2 `cold_reader`).
  const decay = Math.min(1, SUSPICION_DECAY_PER_DAY * modifier(player, VAR_SUSPICION_DECAY));
  let next = before - before * decay + gain;
  if (gain > 0) {
    next = Math.max(next, SUSPICION_FLOOR);
  }
  setSuspicion(world, watcher, next);

  for (const level of SUSPICION_ALERT_LEVELS) {
    if (before < level && watcher.suspicion >= level) {
      ctx.outbox.notify({
        playerId: player.id,
        severity: level >= 0.7 ? "critical" : "warning",
        key: "alerts.suspicion_threshold",
        vars: { watcher: actorIdOf(watcher), level },
        link: { panel: "detection", id: watcher.id },
      });
    }
  }
}

function dailyDetection(world: World, ctx: SystemContext, player: PlayerState): void {
  for (const site of liveSitesOf(world, player.id)) {
    accrueExposure(world, ctx, player, site);
  }
  publishExposure(world, player);
  for (const watcher of ensureWatchers(world, player.id)) {
    accrueSuspicion(world, ctx, player, watcher);
    if (
      watcher.suspicion >= INVESTIGATION_OPEN_SUSPICION &&
      openInvestigationFor(world, player.id, actorIdOf(watcher)) === undefined
    ) {
      openInvestigation(world, ctx, watcher);
    }
  }
  accrueEvidence(world, player);
}

/** The slow ending: the world knows, the hunt is at its last stage, and it stays there. */
function checkExposedEnding(world: World, ctx: SystemContext, player: PlayerState): void {
  const aware = globalAwareness(world) >= EXPOSED_AWARENESS;
  const hunted = huntLevel(world, player.id) >= EXPOSED_HUNT_LEVEL;
  const days = aware && hunted ? (player.vars[VAR_EXPOSED_DAYS] ?? 0) + 1 : 0;
  player.vars[VAR_EXPOSED_DAYS] = days;
  if (days >= EXPOSED_DAYS) {
    endGame(world, ctx.outbox, player, "exposed", { days });
  }
}

// ---------------------------------------------------------------------------------------------
// Condition and effect kinds content can use
// ---------------------------------------------------------------------------------------------

function payloadOf(node: Record<string, unknown>, kind: string): Record<string, unknown> {
  const raw = node[kind];
  return isRecord(raw) ? raw : {};
}

function siteInScope(ctx: DslContext): SiteState | undefined {
  const bound = ctx.scope.site;
  if (isRecord(bound) && typeof bound.id === "string") {
    return siteTable(ctx.world)[bound.id];
  }
  const activeId = ctx.world.players[ctx.playerId]?.profile?.activeSiteId;
  return activeId === undefined || activeId === null ? undefined : siteTable(ctx.world)[activeId];
}

function channelOf(value: unknown, what: string): ExposureChannel | undefined {
  const text = asString(value, what);
  return (EXPOSURE_CHANNELS as readonly string[]).includes(text)
    ? (text as ExposureChannel)
    : undefined;
}

function registerConditions(): ConditionRegistry {
  const registry = createConditionRegistry();

  registry.register("has_site_in", (node, ctx) => {
    const raw = node.has_site_in;
    const country =
      typeof raw === "string"
        ? raw
        : asString(payloadOf(node, "has_site_in").country, "has_site_in.country");
    const cities = cityTable(ctx.world);
    return liveSitesOf(ctx.world, ctx.playerId).some(
      (site) => cities[site.city]?.country === country,
    );
  });

  registry.register("investigation_stage", (node, ctx) => {
    const payload = payloadOf(node, "investigation_stage");
    const watcher = optionalString(payload.watcher, "investigation_stage.watcher");
    let level = 0;
    for (const investigation of Object.values(ctx.world.entities.investigation ?? {})) {
      const entry = investigation as { playerId?: unknown; watcher?: unknown; stage?: unknown };
      if (entry.playerId !== ctx.playerId) {
        continue;
      }
      if (watcher !== undefined && entry.watcher !== watcher) {
        continue;
      }
      if (typeof entry.stage === "string") {
        level = Math.max(level, stageLevel(entry.stage as never));
      }
    }
    return compareValue(level, { ...payload, ...node }, "investigation_stage");
  });

  registry.register("exposure", (node, ctx) => {
    const payload = payloadOf(node, "exposure");
    const raw = typeof node.exposure === "string" ? node.exposure : payload.channel;
    const channel = channelOf(raw, "exposure.channel");
    if (channel === undefined) {
      return false;
    }
    const scoped = siteInScope(ctx);
    const value =
      scoped !== undefined
        ? scoped.exposure[channel]
        : liveSitesOf(ctx.world, ctx.playerId).reduce(
            (max, site) => Math.max(max, site.exposure[channel]),
            0,
          );
    return compareValue(value, { ...payload, ...node }, "exposure");
  });

  return registry;
}

function matchesWatcher(
  watcher: Watcher,
  actor: string | undefined,
  role: string | undefined,
  country: string | undefined,
): boolean {
  if (actor !== undefined) {
    return actorIdOf(watcher) === actor;
  }
  if (role !== undefined && watcher.role !== role) {
    return false;
  }
  if (country !== undefined && watcher.country !== country) {
    return false;
  }
  return role !== undefined || country !== undefined;
}

function registerEffects(): EffectRegistry {
  const registry = createEffectRegistry();

  registry.register("suspicion", (node, ctx) => {
    const payload = asRecord(node.suspicion, "suspicion");
    const delta = optionalNumber(payload.delta, "suspicion.delta") ?? 0;
    const actor = optionalString(payload.actor, "suspicion.actor");
    const role = optionalString(payload.role, "suspicion.role");
    const country = optionalString(payload.country, "suspicion.country");
    const all = actor === undefined && role === undefined && country === undefined;
    for (const watcher of watchersOf(ctx.world, ctx.playerId)) {
      if (all || matchesWatcher(watcher, actor, role, country)) {
        setSuspicion(ctx.world, watcher, watcher.suspicion + delta);
      }
    }
  });

  registry.register("exposure", (node, ctx) => {
    const payload = asRecord(node.exposure, "exposure");
    const channel = channelOf(payload.channel, "exposure.channel");
    if (channel === undefined) {
      return;
    }
    const delta = optionalNumber(payload.delta, "exposure.delta") ?? 0;
    const siteId = optionalString(payload.site, "exposure.site");
    const site = siteId === undefined ? siteInScope(ctx) : siteTable(ctx.world)[siteId];
    if (site !== undefined && site.status !== "lost") {
      addExposure(site, channel, delta);
    }
  });

  registry.register("awareness", (node, ctx) => {
    const payload = asRecord(node.awareness, "awareness");
    const delta = optionalNumber(payload.delta, "awareness.delta") ?? 0;
    const explicit = optionalString(payload.country, "awareness.country");
    const bound = ctx.scope.country;
    const scoped =
      explicit ?? (isRecord(bound) && typeof bound.id === "string" ? bound.id : undefined);
    const countries = countryTable(ctx.world);
    const ids = scoped === undefined ? Object.keys(countries).sort() : [scoped];
    for (const id of ids) {
      const country = countries[id];
      if (country !== undefined) {
        country.awareness = clamp(country.awareness + delta, 0, 1);
      }
    }
  });

  return registry;
}

export function createDetectionSystem(): System {
  return {
    manifest: {
      id: "detection",
      cadence: "hourly",
      order: DETECTION_SYSTEM_ORDER,
      writes: [
        "site.exposure.*",
        "player.vars.*",
        "country.awareness",
        "country.ai_opinion",
        "country.ai_regulation",
        "country.ai_enforcement",
        "watcher.suspicion",
        "watcher.competence",
        "investigation.evidence",
        "investigation.visible",
      ],
      conditions: registerConditions(),
      effects: registerEffects(),
    },
    tick(world: World, ctx: SystemContext): void {
      const dayStart = isDayStart(world.clock);
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        if (player === undefined || !isAlive(player)) {
          continue;
        }
        if (dayStart) {
          dailyDetection(world, ctx, player);
        }
        tickInvestigations(world, ctx, player);
        if (dayStart) {
          checkExposedEnding(world, ctx, player);
        }
      }
    },
  };
}

export { huntLevel, stageLevel } from "./investigations.js";
