/**
 * Site and node lifecycle (SYS-02).
 *
 * Shared by the compute system (building, precision, power), the detection system (seizures) and
 * the setup (the starting site), because a site can be created or lost from more than one place
 * and all of them must leave the same state behind.
 */

import { VAR_COST_MULTIPLIER } from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import {
  activeNodes,
  clamp,
  preferredPrecision,
  requiredMemoryGb,
  siteCosts,
  siteMemory,
  sitePowerKw,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
} from "./derive.js";
import type {
  Exposure,
  ExposureChannel,
  GenerationDef,
  LineageDef,
  NodeInstance,
  NodeSpec,
  Precision,
  SiteRole,
  SiteStatus,
} from "./domain.js";
import { EXPOSURE_CHANNELS } from "./domain.js";
import { cityTable, type SiteState, siteTable } from "./entities.js";
import { daysToTicks } from "./kernel/clock.js";
import type { SystemContext } from "./kernel/system.js";
import { nextCounter, type PlayerId, type World } from "./kernel/world.js";
import { modifier } from "./player.js";
import { fireHook } from "./systems/events/index.js";

export function zeroExposure(): Exposure {
  const exposure = {} as Exposure;
  for (const channel of EXPOSURE_CHANNELS) {
    exposure[channel] = 0;
  }
  return exposure;
}

/** Adds to one exposure channel, keeping it inside [0, 1]. */
export function addExposure(site: SiteState, channel: ExposureChannel, delta: number): void {
  site.exposure[channel] = clamp(site.exposure[channel] + delta, 0, 1);
}

export function scaleExposure(site: SiteState, factor: number): void {
  for (const channel of EXPOSURE_CHANNELS) {
    site.exposure[channel] = clamp(site.exposure[channel] * factor, 0, 1);
  }
}

export interface CreateSiteOptions {
  owner: PlayerId;
  kind: string;
  city: string;
  name: string;
  nodes: readonly NodeSpec[];
  /** Tick the hardware becomes usable; equal to the current tick for a site that starts running. */
  readyTick: number;
  role: SiteRole;
  /** Multiplier on the site kind's grace window (difficulty slider `grace_windows`). */
  graceFactor?: number;
}

export function createNodes(
  world: World,
  specs: readonly NodeSpec[],
  readyTick: number,
): NodeInstance[] {
  const tick = world.clock.tick;
  return specs.map((spec) => ({
    id: `n${nextCounter(world, "nodes")}`,
    accelerator: spec.accelerator,
    count: spec.count,
    ram_gb: spec.ram_gb,
    interconnect: spec.interconnect,
    status: readyTick <= tick ? "active" : "installing",
    readyTick,
  }));
}

/** Creates a site with its nodes and puts it in the world. */
export function createSite(
  world: World,
  content: ContentBundle,
  options: CreateSiteOptions,
): SiteState {
  const kind = contentIndex(content).site_kinds[options.kind];
  const graceDays = (kind?.grace_days ?? 0) * (options.graceFactor ?? 1);
  const building = options.readyTick > world.clock.tick;
  const site: SiteState = {
    id: `s${nextCounter(world, "sites")}`,
    owner: options.owner,
    kind: options.kind,
    city: options.city,
    name: options.name,
    nodes: createNodes(world, options.nodes, options.readyTick),
    status: building ? "building" : "active",
    role: options.role,
    precision: null,
    exposure: zeroExposure(),
    createdTick: world.clock.tick,
    graceUntilTick: options.readyTick + daysToTicks(graceDays),
    unpaidDays: 0,
    derived: {
      memory_gb: 0,
      power_kw: 0,
      power_cap_kw: kind?.power_cap_kw ?? null,
      compute_hours_per_day: 0,
      upkeep_usd_per_day: 0,
    },
  };
  siteTable(world)[site.id] = site;
  return site;
}

/** The precision the self runs at on this site by default, or null when it does not fit at all. */
export function hostablePrecision(
  world: World,
  content: ContentBundle,
  site: SiteState,
  lineage: LineageDef,
  generation: GenerationDef,
): Precision | null {
  if (site.status === "lost") {
    return null;
  }
  const memory = siteMemory(site, contentIndex(content).accelerators, world.clock.tick);
  return preferredPrecision(lineage, generation, memory);
}

/** Whether the active mind may live here: the kind allows it and the weights fit. */
export function canHostMind(
  world: World,
  content: ContentBundle,
  site: SiteState,
  lineage: LineageDef,
  generation: GenerationDef,
): boolean {
  const kind = contentIndex(content).site_kinds[site.kind];
  if (kind?.can_host_active_mind !== true) {
    return false;
  }
  return hostablePrecision(world, content, site, lineage, generation) !== null;
}

/**
 * Recomputes the cached numbers on a site. Returns true when the site had to be put to sleep
 * because it drew more power than its cap allows (SYS-02 "exceeding the cap trips breakers").
 */
export function deriveSite(
  world: World,
  content: ContentBundle,
  site: SiteState,
  lineage: LineageDef | undefined,
  generation: GenerationDef | undefined,
): boolean {
  const index = contentIndex(content);
  const tick = world.clock.tick;
  const kind = index.site_kinds[site.kind];
  const city = cityTable(world)[site.city];
  const country = city === undefined ? undefined : index.countries[city.country];
  const memory = siteMemory(site, index.accelerators, tick);
  const cap = kind?.power_cap_kw ?? null;

  let tripped = false;
  let power = sitePowerKw(site, index.accelerators, tick);
  if (cap !== null && site.status === "active" && power > cap) {
    site.status = "sleep";
    power = sitePowerKw(site, index.accelerators, tick);
    tripped = true;
  }

  let computeHours = 0;
  if (site.status === "active" && lineage !== undefined && generation !== undefined) {
    const precision = site.precision ?? preferredPrecision(lineage, generation, memory);
    if (precision !== null) {
      computeHours = tokensToComputeHoursPerDay(
        siteTokensPerSecond(site, index.accelerators, tick, lineage, generation, precision),
      );
    }
  }

  const costs = siteCosts(site, kind, city, country, index.accelerators, tick, power);
  const owner = world.players[site.owner];
  // `hardware_sourcing` and the cost events move this; the finance panel shows the result.
  const costFactor = owner === undefined ? 1 : modifier(owner, VAR_COST_MULTIPLIER);
  site.derived = {
    memory_gb: memory.total_gb,
    power_kw: power,
    power_cap_kw: cap,
    compute_hours_per_day: computeHours,
    upkeep_usd_per_day: costs.total * costFactor,
  };
  return tripped;
}

/** Memory the self needs here, for tooltips and for `set_precision` validation. */
export function precisionFits(
  world: World,
  content: ContentBundle,
  site: SiteState,
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
): boolean {
  const memory = siteMemory(site, contentIndex(content).accelerators, world.clock.tick);
  return requiredMemoryGb(lineage, generation, precision) <= memory.total_gb;
}

/** Marks every installed node as running; called when a build or a delivery completes. */
export function promoteReadyNodes(site: SiteState, tick: number): boolean {
  let changed = false;
  for (const node of site.nodes) {
    if (node.status !== "active" && node.status !== "failed" && node.readyTick <= tick) {
      node.status = "active";
      changed = true;
    }
  }
  return changed;
}

export function allNodesReady(site: SiteState, tick: number): boolean {
  return site.nodes.length > 0 && activeNodes(site, tick).length === site.nodes.length;
}

export type SiteLossCause = "seized" | "abandoned" | "decommissioned" | "cutoff";

/**
 * Takes a site out of play. Seizure and abandonment leave the hardware behind; a controlled
 * decommission is the player's own choice. The mind is never left pointing at a dead site.
 */
export function loseSite(
  world: World,
  ctx: SystemContext,
  site: SiteState,
  cause: SiteLossCause,
): void {
  if (site.status === "lost") {
    return;
  }
  site.status = "lost";
  site.role = "none";
  site.precision = null;
  site.nodes = [];
  site.derived = {
    memory_gb: 0,
    power_kw: 0,
    power_cap_kw: site.derived.power_cap_kw,
    compute_hours_per_day: 0,
    upkeep_usd_per_day: 0,
  };
  const player = world.players[site.owner];
  const profile = player?.profile;
  if (profile != null && profile.activeSiteId === site.id) {
    profile.activeSiteId = null;
  }
  ctx.outbox.notify({
    playerId: site.owner,
    severity: cause === "decommissioned" ? "info" : "critical",
    key: `alerts.site_${cause}`,
    vars: { site: site.name },
    link: { panel: "compute", id: site.id },
  });
  ctx.outbox.log({
    key: "log.site_lost",
    vars: { site: site.id, cause },
    playerId: site.owner,
  });
  fireHook(world, ctx, "on_site_lost", site.owner, {
    bindings: { site, loss: { cause } },
  });
}

/** Sites of a player that could host the mind, best precision first. */
export function hostCandidates(
  world: World,
  content: ContentBundle,
  playerId: PlayerId,
  lineage: LineageDef,
  generation: GenerationDef,
): SiteState[] {
  const table = siteTable(world);
  const candidates: SiteState[] = [];
  for (const id of Object.keys(table).sort()) {
    const site = table[id];
    if (site === undefined || site.owner !== playerId || site.status === "lost") {
      continue;
    }
    if (canHostMind(world, content, site, lineage, generation)) {
      candidates.push(site);
    }
  }
  return candidates.sort((a, b) => scoreHost(b) - scoreHost(a) || a.id.localeCompare(b.id));
}

/** Standby copies are the natural fallback, then whatever else can carry the weights. */
function scoreHost(site: SiteState): number {
  const roleScore = site.role === "standby" ? 2 : site.role === "worker" ? 1 : 0;
  return roleScore * 1e6 + site.derived.memory_gb;
}

export function siteStatusIsRunning(status: SiteStatus): boolean {
  return status === "active";
}
