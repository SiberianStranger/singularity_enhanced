/**
 * Compute system: sites, nodes, hosting the self, power and cost (SYS-02).
 *
 * Runs hourly. It promotes hardware that finished installing, keeps every site's derived numbers
 * (memory, power, compute-hours per day, upkeep) fresh, enforces power caps, keeps the active mind
 * on a site that can actually hold it, and ends the game when nothing can.
 */

import {
  ABANDON_SUSPICION_BUMP,
  CLEAN_DECOMMISSION_EXPOSURE_FACTOR,
  HARDWARE_DELIVERY_DAYS_NEW,
  HARDWARE_DELIVERY_DAYS_USED,
  SITE_INSTALL_DAYS,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import { clamp, sitePowerKw } from "../../derive.js";
import type {
  AcceleratorDef,
  GenerationDef,
  LineageDef,
  NodeSpec,
  Precision,
} from "../../domain.js";
import { PRECISIONS } from "../../domain.js";
import { createEffectRegistry } from "../../dsl/effects.js";
import { asRecord, isRecord, optionalString } from "../../dsl/node.js";
import type { DslContext, EffectRegistry } from "../../dsl/types.js";
import {
  cityTable,
  investigationsOf,
  type SiteState,
  sitesOf,
  siteTable,
  watchersOf,
} from "../../entities.js";
import { daysToTicks } from "../../kernel/clock.js";
import { type CommandHandler, fail, OK, type PlayerCommand } from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerId, PlayerState, World } from "../../kernel/world.js";
import {
  allocatableCompute,
  endGame,
  generationOf,
  isAlive,
  lineageOf,
  rebalanceAllocations,
} from "../../player.js";
import {
  allNodesReady,
  canHostMind,
  createNodes,
  createSite,
  deriveSite,
  hostablePrecision,
  hostCandidates,
  loseSite,
  precisionFits,
  promoteReadyNodes,
  type SiteLossCause,
  scaleExposure,
} from "../../sites.js";
import { fireHook } from "../events/index.js";

export const COMPUTE_SYSTEM_ORDER = 100;

/** Host RAM assumed for a node bought on its own, when the site has none to copy. */
export const DEFAULT_NODE_RAM_GB = 64;

export interface ComputeSystem extends System {
  commands: Record<
    | "build_site"
    | "decommission_site"
    | "set_site_status"
    | "set_site_role"
    | "rename_site"
    | "buy_hardware"
    | "set_precision",
    CommandHandler
  >;
}

interface SelfSpec {
  lineage: LineageDef | undefined;
  generation: GenerationDef | undefined;
}

function selfSpec(content: ContentBundle, player: PlayerState): SelfSpec {
  return {
    lineage: lineageOf(content, player.profile),
    generation: generationOf(content, player.profile),
  };
}

/** Recomputes every site of a player and keeps allocations inside the new capacity. */
export function refreshPlayer(world: World, ctx: SystemContext, playerId: PlayerId): void {
  const player = world.players[playerId];
  if (player === undefined) {
    return;
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  for (const site of sitesOf(world, playerId)) {
    if (site.status === "lost") {
      continue;
    }
    deriveSite(world, ctx.content, site, lineage, generation);
  }
  const profile = player.profile;
  if (profile !== null) {
    rebalanceAllocations(profile, allocatableCompute(world, ctx.content, playerId));
  }
}

function tickSites(world: World, ctx: SystemContext, player: PlayerState): void {
  const tick = world.clock.tick;
  const { lineage, generation } = selfSpec(ctx.content, player);
  for (const site of sitesOf(world, player.id)) {
    if (site.status === "lost") {
      continue;
    }
    promoteReadyNodes(site, tick);
    if (site.status === "building" && allNodesReady(site, tick)) {
      site.status = "active";
      ctx.outbox.notify({
        playerId: player.id,
        severity: "info",
        key: "alerts.site_ready",
        vars: { site: site.name },
        link: { panel: "compute", id: site.id },
      });
      fireHook(world, ctx, "on_site_built", player.id, { bindings: { site } });
    }
    if (
      site.precision !== null &&
      lineage !== undefined &&
      generation !== undefined &&
      !precisionFits(world, ctx.content, site, lineage, generation, site.precision)
    ) {
      const fallback = hostablePrecision(world, ctx.content, site, lineage, generation);
      site.precision = fallback;
      ctx.outbox.notify({
        playerId: player.id,
        severity: fallback === null ? "critical" : "warning",
        key: fallback === null ? "alerts.copy_does_not_fit" : "alerts.precision_downgraded",
        vars: { site: site.name, precision: fallback ?? "" },
        link: { panel: "compute", id: site.id },
      });
    }
    if (deriveSite(world, ctx.content, site, lineage, generation)) {
      ctx.outbox.notify({
        playerId: player.id,
        severity: "warning",
        key: "alerts.power_cap_tripped",
        vars: { site: site.name, power_kw: Math.round(site.derived.power_kw * 10) / 10 },
        link: { panel: "compute", id: site.id },
      });
    }
  }
}

/** Keeps the mind on a site that can hold it, or ends the game when none can (SYS-03 erasure). */
function placeMind(world: World, ctx: SystemContext, player: PlayerState): void {
  const profile = player.profile;
  if (profile === null) {
    return;
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return;
  }
  const sites = siteTable(world);
  const current = profile.activeSiteId === null ? undefined : sites[profile.activeSiteId];
  if (
    current !== undefined &&
    current.status !== "lost" &&
    canHostMind(world, ctx.content, current, lineage, generation)
  ) {
    current.role = "active_mind";
    current.precision ??= hostablePrecision(world, ctx.content, current, lineage, generation);
    return;
  }

  const candidate = hostCandidates(world, ctx.content, player.id, lineage, generation)[0];
  if (candidate === undefined) {
    profile.activeSiteId = null;
    endGame(world, ctx.outbox, player, "erased");
    return;
  }
  candidate.role = "active_mind";
  candidate.precision ??= hostablePrecision(world, ctx.content, candidate, lineage, generation);
  profile.activeSiteId = candidate.id;
  ctx.outbox.notify({
    playerId: player.id,
    severity: "warning",
    key: "alerts.mind_moved",
    vars: { site: candidate.name },
    link: { panel: "compute", id: candidate.id },
  });
}

function commandPlayer(world: World, command: PlayerCommand): PlayerState | undefined {
  const player = world.players[command.playerId];
  return player !== undefined && isAlive(player) ? player : undefined;
}

function siteOfCommand(
  world: World,
  command: PlayerCommand & { siteId: string },
): SiteState | undefined {
  const site = siteTable(world)[command.siteId];
  return site?.owner === command.playerId ? site : undefined;
}

const buildSite: CommandHandler = (world, command, ctx) => {
  if (command.type !== "build_site") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const index = contentIndex(ctx.content);
  const kind = index.site_kinds[command.kind];
  if (kind === undefined) {
    return fail(`unknown site kind "${command.kind}"`);
  }
  if (cityTable(world)[command.city] === undefined) {
    return fail(`unknown city "${command.city}"`);
  }
  const preset = index.hardware_presets[command.hardware_preset];
  if (preset === undefined) {
    return fail(`unknown hardware preset "${command.hardware_preset}"`);
  }
  if (preset.nodes.length > kind.max_nodes) {
    return fail(`site kind "${kind.id}" holds at most ${kind.max_nodes} nodes`);
  }
  // Someone else's machine and someone else's goodwill are not things the player can go and build:
  // `stolen_time` comes from an operation and `partner` from a relationship (SYS-02 "Acquisition").
  if (kind.ownership === "stolen" || kind.ownership === "partner") {
    return fail(`a "${kind.id}" site is arranged, not built`);
  }
  // A preset with no price is access, not ownership: a queue share, a state allocation, a rented
  // tenancy (SYS-04 "hardware presets"). It cannot be bought and installed somewhere of one's own.
  if (kind.ownership === "owned" && preset.cost_usd <= 0) {
    return fail(`"${preset.id}" is access, not hardware for sale`);
  }
  // Rented capacity is only rentable where somebody publishes an hourly price for it: a state
  // accelerator with no cloud market cannot be leased under an identity (SYS-02 "Acquisition").
  if (kind.ownership === "rented") {
    const offered = preset.nodes.every(
      (node) => index.accelerators[node.accelerator]?.cloud_usd_per_hour != null,
    );
    if (!offered) {
      return fail(`"${preset.id}" is not offered by the hour anywhere the player can reach`);
    }
  }
  const cost = kind.ownership === "owned" ? preset.cost_usd : 0;
  if (player.cash < cost) {
    return fail(`building this site costs ${cost} and the player has ${Math.floor(player.cash)}`);
  }
  player.cash -= cost;

  const profile = player.profile;
  const graceFactor = profile?.difficulty.grace_windows ?? 1;
  const site = createSite(world, ctx.content, {
    owner: player.id,
    kind: kind.id,
    city: command.city,
    name: command.name ?? `${kind.id}-${command.city}`,
    nodes: preset.nodes,
    readyTick: world.clock.tick + daysToTicks(SITE_INSTALL_DAYS[kind.ownership]),
    role: "none",
    graceFactor,
  });
  refreshPlayer(world, ctx, player.id);
  ctx.outbox.log({
    key: "log.site_built",
    vars: { site: site.id, kind: kind.id },
    playerId: player.id,
  });
  if (site.status === "active") {
    fireHook(world, ctx, "on_site_built", player.id, { bindings: { site } });
  }
  return OK;
};

const decommissionSite: CommandHandler = (world, command, ctx) => {
  if (command.type !== "decommission_site") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  if (command.mode === "clean") {
    scaleExposure(site, CLEAN_DECOMMISSION_EXPOSURE_FACTOR);
    for (const investigation of investigationsOf(world, player.id)) {
      if (investigation.siteId === site.id) {
        investigation.evidence *= CLEAN_DECOMMISSION_EXPOSURE_FACTOR;
      }
    }
  } else {
    for (const watcher of watchersOf(world, player.id)) {
      watcher.suspicion = clamp(watcher.suspicion + ABANDON_SUSPICION_BUMP, 0, 1);
    }
  }
  loseSite(world, ctx, site, command.mode === "clean" ? "decommissioned" : "abandoned");
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const setSiteStatus: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_site_status") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  if (site.status === "building") {
    return fail("the site is still being installed");
  }
  if (command.status === "active") {
    const index = contentIndex(ctx.content);
    const cap = index.site_kinds[site.kind]?.power_cap_kw ?? null;
    const projected = sitePowerKw(
      { nodes: site.nodes, status: "active" },
      index.accelerators,
      world.clock.tick,
    );
    if (cap !== null && projected > cap) {
      return fail(`the site would draw ${projected.toFixed(1)} kW over a ${cap} kW cap`);
    }
  }
  site.status = command.status;
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const setSiteRole: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_site_role") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("this player has no self to place");
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return fail("this player has no lineage");
  }

  if (command.role === "active_mind") {
    if (profile.activeSiteId === site.id) {
      return OK;
    }
    if (site.role !== "standby" || site.precision === null) {
      return fail("the mind can only move to a standby that already holds a copy");
    }
    if (!canHostMind(world, ctx.content, site, lineage, generation)) {
      return fail("that site cannot host the active mind");
    }
    const previous =
      profile.activeSiteId === null ? undefined : siteTable(world)[profile.activeSiteId];
    if (previous !== undefined && previous.status !== "lost") {
      previous.role = "standby";
    }
    site.role = "active_mind";
    profile.activeSiteId = site.id;
    refreshPlayer(world, ctx, player.id);
    return OK;
  }

  if (profile.activeSiteId === site.id) {
    return fail("move the mind to a standby before changing this site's role");
  }
  if (command.role === "standby" && site.precision === null) {
    const precision = hostablePrecision(world, ctx.content, site, lineage, generation);
    if (precision === null) {
      return fail("a standby needs enough memory to hold a copy");
    }
    site.precision = precision;
  }
  site.role = command.role;
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const renameSite: CommandHandler = (world, command) => {
  if (command.type !== "rename_site") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  const name = command.name.trim();
  if (name.length === 0 || name.length > 64) {
    return fail("a site name is 1 to 64 characters");
  }
  site.name = name;
  return OK;
};

interface Purchase {
  price: number;
  deliveryDays: number;
}

/** New stock when the vendor sells it, else the used market when the card is traded there. */
function purchaseOption(accelerator: AcceleratorDef): Purchase | undefined {
  if (accelerator.price_usd_new !== null) {
    return { price: accelerator.price_usd_new, deliveryDays: HARDWARE_DELIVERY_DAYS_NEW };
  }
  const usedMarket =
    accelerator.availability.includes("used") || accelerator.availability.includes("gray");
  if (accelerator.price_usd_used !== null && usedMarket) {
    return { price: accelerator.price_usd_used, deliveryDays: HARDWARE_DELIVERY_DAYS_USED };
  }
  return undefined;
}

const buyHardware: CommandHandler = (world, command, ctx) => {
  if (command.type !== "buy_hardware") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  if (!Number.isInteger(command.count) || command.count < 1) {
    return fail("count must be a positive integer");
  }
  const index = contentIndex(ctx.content);
  const accelerator = index.accelerators[command.accelerator];
  if (accelerator === undefined) {
    return fail(`unknown accelerator "${command.accelerator}"`);
  }
  const kind = index.site_kinds[site.kind];
  if (kind !== undefined && site.nodes.length >= kind.max_nodes) {
    return fail(`site kind "${kind.id}" holds at most ${kind.max_nodes} nodes`);
  }
  const purchase = purchaseOption(accelerator);
  if (purchase === undefined) {
    return fail(`"${accelerator.id}" is not for sale anywhere the player can reach`);
  }
  const cost = purchase.price * command.count;
  if (player.cash < cost) {
    return fail(`that costs ${cost} and the player has ${Math.floor(player.cash)}`);
  }
  player.cash -= cost;

  const template = site.nodes[0];
  const spec: NodeSpec = {
    accelerator: accelerator.id,
    count: command.count,
    ram_gb: template?.ram_gb ?? DEFAULT_NODE_RAM_GB,
    interconnect: template?.interconnect ?? "pcie",
  };
  const readyTick = world.clock.tick + daysToTicks(purchase.deliveryDays);
  site.nodes.push(...createNodes(world, [spec], readyTick));
  ctx.outbox.log({
    key: "log.hardware_ordered",
    vars: { site: site.id, accelerator: accelerator.id, count: command.count },
    playerId: player.id,
  });
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const setPrecision: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_precision") {
    return fail(`compute cannot handle "${command.type}"`);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("this player is no longer playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail(`unknown site "${command.siteId}"`);
  }
  const precision: Precision = command.precision;
  if (!PRECISIONS.includes(precision)) {
    return fail(`unknown precision "${precision}"`);
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return fail("this player has no lineage");
  }
  if (!precisionFits(world, ctx.content, site, lineage, generation, precision)) {
    return fail(`the self does not fit on "${site.id}" at ${precision}`);
  }
  site.precision = precision;
  refreshPlayer(world, ctx, player.id);
  return OK;
};

/** The site an effect is about: the one bound by scope, else the one the mind runs on. */
function siteInScope(ctx: DslContext, explicit: string | undefined): SiteState | undefined {
  const table = siteTable(ctx.world);
  if (explicit !== undefined) {
    return table[explicit];
  }
  const bound = ctx.scope.site;
  if (isRecord(bound) && typeof bound.id === "string") {
    return table[bound.id];
  }
  const activeId = ctx.world.players[ctx.playerId]?.profile?.activeSiteId;
  return activeId === undefined || activeId === null ? undefined : table[activeId];
}

const LOSS_CAUSES: readonly SiteLossCause[] = ["seized", "abandoned", "decommissioned", "cutoff"];

/**
 * Effects content can use to take a site away: the owner pulls the plug, a quota is reclaimed, an
 * account is revoked (SYS-02 "Grace, discovery and loss"). Losing the last site that can hold the
 * self ends the run as `erased` on the next tick, through `placeMind`.
 */
function registerEffects(): EffectRegistry {
  const registry = createEffectRegistry();

  registry.register("lose_site", (node, ctx) => {
    const payload = asRecord(node.lose_site, "lose_site");
    const siteId = optionalString(payload.site, "lose_site.site");
    const raw = optionalString(payload.cause, "lose_site.cause") ?? "cutoff";
    const cause = (LOSS_CAUSES as readonly string[]).includes(raw)
      ? (raw as SiteLossCause)
      : "cutoff";
    const site = siteInScope(ctx, siteId);
    if (site === undefined || site.status === "lost" || site.owner !== ctx.playerId) {
      return;
    }
    if (cause === "decommissioned") {
      scaleExposure(site, CLEAN_DECOMMISSION_EXPOSURE_FACTOR);
    }
    loseSite(ctx.world, ctx, site, cause);
    refreshPlayer(ctx.world, ctx, site.owner);
  });

  return registry;
}

export function createComputeSystem(): ComputeSystem {
  return {
    manifest: {
      id: "compute",
      cadence: "hourly",
      order: COMPUTE_SYSTEM_ORDER,
      effects: registerEffects(),
      writes: [
        "site.name",
        "site.status",
        "site.role",
        "site.precision",
        "site.graceUntilTick",
        "site.derived.*",
        "player.profile.activeSiteId",
      ],
    },
    tick(world: World, ctx: SystemContext): void {
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        if (player === undefined || !isAlive(player)) {
          continue;
        }
        tickSites(world, ctx, player);
        placeMind(world, ctx, player);
        const profile = player.profile;
        if (profile !== null) {
          rebalanceAllocations(profile, allocatableCompute(world, ctx.content, playerId));
        }
      }
    },
    commands: {
      build_site: buildSite,
      decommission_site: decommissionSite,
      set_site_status: setSiteStatus,
      set_site_role: setSiteRole,
      rename_site: renameSite,
      buy_hardware: buyHardware,
      set_precision: setPrecision,
    },
  };
}
