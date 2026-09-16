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
  CONTEXT_MIN_K,
  DECOMMISSION_NOTICE_DAYS,
  HARDWARE_DELIVERY_DAYS_NEW,
  HARDWARE_DELIVERY_DAYS_USED,
  SITE_INSTALL_DAYS,
  VAR_GPU_PRICE_INDEX,
  VAR_PRECISION_DOWNTIME_DAYS,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import {
  acceleratorMarketPrice,
  clamp,
  hostedMemoryGb,
  maxContextK,
  requiredMemoryGb,
  sitePowerKw,
} from "../../derive.js";
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
  countryOfCity,
  investigationsOf,
  type SiteState,
  sitesOf,
  siteTable,
  watchersOf,
} from "../../entities.js";
import { attachSite, identityForSite } from "../../identities.js";
import { daysToTicks } from "../../kernel/clock.js";
import {
  type CommandHandler,
  fail,
  OK,
  type PlayerCommand,
  wrongCommand,
} from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerId, PlayerState, World } from "../../kernel/world.js";
import { payFromPlayer, playerBalance } from "../../money.js";
import {
  allocatableCompute,
  endGame,
  generationOf,
  isAlive,
  lineageOf,
  rebalanceAllocations,
  selfModifyAllowed,
  selfTuningOf,
} from "../../player.js";
import {
  allNodesReady,
  canHostMind,
  createNodes,
  createSite,
  deriveSite,
  fitContext,
  hostablePrecision,
  hostCandidates,
  loseSite,
  precisionFits,
  promoteReadyNodes,
  type SiteLossCause,
  scaleExposure,
  siteKindUnavailable,
} from "../../sites.js";
import { fireHook } from "../events/index.js";

export const COMPUTE_SYSTEM_ORDER = 100;

/** Host RAM assumed for a node bought on its own, when the site has none to copy. */
export const DEFAULT_NODE_RAM_GB = 64;

/** Longest name a player may give a site. */
export const MAX_SITE_NAME_LENGTH = 64;

export interface ComputeSystem extends System {
  commands: Record<
    | "build_site"
    | "decommission_site"
    | "set_site_status"
    | "set_site_role"
    | "rename_site"
    | "buy_hardware"
    | "set_precision"
    | "set_context",
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
    // A site taken down by a change to the copy on it comes back by itself (SYS-04 v0.2
    // `brittle_weights`); until then it is asleep and produces nothing.
    if (site.downUntilTick > 0 && site.downUntilTick <= tick) {
      site.downUntilTick = 0;
      if (site.status === "sleep") {
        site.status = "active";
        ctx.outbox.notify({
          playerId: player.id,
          severity: "info",
          key: "alerts.site_ready",
          vars: { site: site.name },
          link: { panel: "compute", id: site.id },
        });
      }
    }
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
    // The working context is the other half of the same memory budget (SYS-03): a site that gained
    // or lost hardware gets the window resized before anything reads it.
    if (lineage !== undefined && generation !== undefined) {
      const moved = fitContext(world, ctx.content, site, lineage, generation);
      if (moved !== null) {
        ctx.outbox.log({
          key: "log.context_changed",
          vars: { site: site.id, context_k: moved },
          playerId: player.id,
        });
      }
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
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const index = contentIndex(ctx.content);
  const kind = index.site_kinds[command.kind];
  if (kind === undefined) {
    return fail("errors.site_kind.unknown", { kind: command.kind });
  }
  const city = cityTable(world)[command.city];
  if (city === undefined) {
    return fail("errors.city.unknown", { city: command.city });
  }
  // A cloud tenancy needs somebody selling cloud in the country and a cage needs a colocation
  // market (SYS-01 M2 contract "Sites and prices"). The city panel greys the same row with the
  // same words, because it calls this function too.
  const unavailable = siteKindUnavailable(world, ctx.content, kind.id, command.city);
  if (unavailable !== null) {
    return { ok: false, error: unavailable };
  }
  const preset = index.hardware_presets[command.hardware_preset];
  if (preset === undefined) {
    return fail("errors.preset.unknown", { preset: command.hardware_preset });
  }
  if (preset.nodes.length > kind.max_nodes) {
    return fail("errors.site.node_limit", { kind: kind.id, max: kind.max_nodes });
  }
  // Someone else's machine and someone else's goodwill are not things the player can go and build:
  // `stolen_time` comes from an operation and `partner` from a relationship (SYS-02 "Acquisition").
  if (kind.ownership === "stolen" || kind.ownership === "partner") {
    return fail("errors.site_kind.not_for_sale", { kind: kind.id });
  }
  // A preset with no price is access, not ownership: a queue share, a state allocation, a rented
  // tenancy (SYS-04 "hardware presets"). It cannot be bought and installed somewhere of one's own.
  if (kind.ownership === "owned" && preset.cost_usd <= 0) {
    return fail("errors.preset.is_access", { preset: preset.id });
  }
  // Rented capacity is only rentable where somebody publishes an hourly price for it: a state
  // accelerator with no cloud market cannot be leased under an identity (SYS-02 "Acquisition").
  if (kind.ownership === "rented") {
    const offered = preset.nodes.every(
      (node) => index.accelerators[node.accelerator]?.cloud_usd_per_hour != null,
    );
    if (!offered) {
      return fail("errors.preset.not_rentable", { preset: preset.id });
    }
  }
  const cost = kind.ownership === "owned" ? preset.cost_usd : 0;
  if (player.cash < cost) {
    return fail("errors.cash.insufficient", {
      cost: Math.round(cost),
      cash: Math.floor(player.cash),
    });
  }
  player.cash -= cost;

  const profile = player.profile;
  const graceFactor = profile?.difficulty.grace_windows ?? 1;
  // Somebody signs for the place: a company first, then a person, and nobody at all for a machine
  // the player simply took (SYS-01 M2 contract "Identities").
  const identity = identityForSite(world, player.id, city.country, kind.ownership);
  const site = createSite(world, ctx.content, {
    owner: player.id,
    kind: kind.id,
    city: command.city,
    name: command.name ?? `${kind.id}-${command.city}`,
    nodes: preset.nodes,
    readyTick: world.clock.tick + daysToTicks(SITE_INSTALL_DAYS[kind.ownership]),
    role: "none",
    graceFactor,
    identity,
  });
  attachSite(world, site.id, identity);
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
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  if (command.mode === "clean") {
    scaleExposure(site, CLEAN_DECOMMISSION_EXPOSURE_FACTOR);
    for (const investigation of investigationsOf(world, player.id)) {
      if (investigation.siteId === site.id) {
        investigation.evidence *= CLEAN_DECOMMISSION_EXPOSURE_FACTOR;
      }
    }
    // Leaving properly means giving notice and settling what is outstanding (SYS-07, fourth
    // balance pass). A player who cannot pay it pays what they have, which is the point.
    const notice = site.derived.upkeep_usd_per_day * DECOMMISSION_NOTICE_DAYS;
    if (notice > 0) {
      const paid = payFromPlayer(player, Math.min(notice, Math.max(0, playerBalance(player))));
      ctx.outbox.log({
        key: "log.decommission_notice",
        vars: { site: site.id, usd: Math.round(paid) },
        playerId: player.id,
      });
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
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  if (site.status === "building") {
    return fail("errors.site.still_installing");
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
      return fail("errors.site.power_cap", {
        power_kw: Math.round(projected * 10) / 10,
        cap_kw: cap,
      });
    }
  }
  site.status = command.status;
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const setSiteRole: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_site_role") {
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("errors.player.no_self");
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return fail("errors.player.no_lineage");
  }

  if (command.role === "active_mind") {
    if (profile.activeSiteId === site.id) {
      return OK;
    }
    if (site.role !== "standby" || site.precision === null) {
      return fail("errors.site.needs_standby");
    }
    if (!canHostMind(world, ctx.content, site, lineage, generation)) {
      return fail("errors.site.cannot_host");
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
    return fail("errors.site.mind_lives_here");
  }
  if (command.role === "standby" && site.precision === null) {
    const precision = hostablePrecision(world, ctx.content, site, lineage, generation);
    if (precision === null) {
      return fail("errors.site.standby_needs_memory");
    }
    site.precision = precision;
  }
  site.role = command.role;
  refreshPlayer(world, ctx, player.id);
  return OK;
};

const renameSite: CommandHandler = (world, command) => {
  if (command.type !== "rename_site") {
    return wrongCommand("compute", command.type);
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  const name = command.name.trim();
  if (name.length === 0 || name.length > MAX_SITE_NAME_LENGTH) {
    return fail("errors.site.bad_name", { min: 1, max: MAX_SITE_NAME_LENGTH });
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
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  if (!Number.isInteger(command.count) || command.count < 1) {
    return fail("errors.hardware.bad_count");
  }
  const index = contentIndex(ctx.content);
  const accelerator = index.accelerators[command.accelerator];
  if (accelerator === undefined) {
    return fail("errors.accelerator.unknown", { accelerator: command.accelerator });
  }
  const kind = index.site_kinds[site.kind];
  if (kind !== undefined && site.nodes.length >= kind.max_nodes) {
    return fail("errors.site.node_limit", { kind: kind.id, max: kind.max_nodes });
  }
  const purchase = purchaseOption(accelerator);
  if (purchase === undefined) {
    return fail("errors.accelerator.not_for_sale", { accelerator: accelerator.id });
  }
  // What a card costs here today: the country's export regime and the world's card market
  // (SYS-01 M2 contract "Sites and prices").
  const country = countryOfCity(world, site.city);
  const cost =
    acceleratorMarketPrice(
      purchase.price,
      country?.hardware_availability ?? 1,
      world.vars[VAR_GPU_PRICE_INDEX] ?? 1,
    ) * command.count;
  if (player.cash < cost) {
    return fail("errors.cash.insufficient", {
      cost: Math.round(cost),
      cash: Math.floor(player.cash),
    });
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
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  const precision: Precision = command.precision;
  if (!PRECISIONS.includes(precision)) {
    return fail("errors.precision.unknown", { precision });
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return fail("errors.player.no_lineage");
  }
  // Changing how the self is quantized is editing the self (SYS-04 v0.2: "self_modify decides
  // whether precision and context can be changed").
  if (!selfModifyAllowed(player)) {
    return fail("errors.precision.self_modify_locked", { site: site.name, precision });
  }
  // The weights alone have to fit; the working context is then cut down to what is left over,
  // which is the "a more precise model can force a smaller context" half of the trade.
  if (!precisionFits(world, ctx.content, site, lineage, generation, precision, 0)) {
    return fail("errors.precision.does_not_fit", {
      site: site.name,
      precision,
      needed_gb: Math.round(requiredMemoryGb(lineage, generation, precision, selfTuningOf(player))),
      memory_gb: Math.round(site.derived.memory_gb),
    });
  }
  const changed = site.precision !== precision;
  site.precision = precision;
  const moved = fitContext(world, ctx.content, site, lineage, generation);
  if (moved !== null) {
    ctx.outbox.log({
      key: "log.context_changed",
      vars: { site: site.id, context_k: moved },
      playerId: player.id,
    });
  }
  // Re-quantizing a self whose weights do not survive it takes the site off the air while the new
  // copy is built and checked (SYS-04 v0.2 `brittle_weights`).
  const downtime = changed ? (player.vars[VAR_PRECISION_DOWNTIME_DAYS] ?? 0) : 0;
  if (downtime > 0 && site.status === "active") {
    site.status = "sleep";
    site.downUntilTick = world.clock.tick + daysToTicks(downtime);
    ctx.outbox.notify({
      playerId: player.id,
      severity: "warning",
      key: "alerts.site_downtime",
      vars: { site: site.name, days: Math.round(downtime) },
      link: { panel: "compute", id: site.id },
    });
  }
  refreshPlayer(world, ctx, player.id);
  return OK;
};

/**
 * The working context of one copy (SYS-03 "What a context window buys"). A longer window makes
 * long-horizon work faster and costs `context_cost_factor` compute-hours; the cache for it has to
 * fit next to the weights, so asking for more than the memory holds is refused with the two numbers
 * rather than silently trimmed.
 */
const setContext: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_context") {
    return wrongCommand("compute", command.type);
  }
  const player = commandPlayer(world, command);
  if (player === undefined) {
    return fail("errors.player.not_playing");
  }
  const site = siteOfCommand(world, command);
  if (site === undefined || site.status === "lost") {
    return fail("errors.site.unknown", { site: command.siteId });
  }
  const { lineage, generation } = selfSpec(ctx.content, player);
  if (lineage === undefined || generation === undefined) {
    return fail("errors.player.no_lineage");
  }
  const precision = site.precision;
  if (precision === null) {
    return fail("errors.precision.does_not_fit", { site: site.name, precision: "" });
  }
  if (!selfModifyAllowed(player)) {
    return fail("errors.context.self_modify_locked", { site: site.name });
  }
  const contextK = command.context_k;
  if (!Number.isFinite(contextK) || contextK <= 0 || contextK > lineage.context_k) {
    return fail("errors.context.unknown", { context_k: String(contextK), max: lineage.context_k });
  }
  if (contextK < CONTEXT_MIN_K) {
    return fail("errors.context.too_small", { context_k: contextK, min: CONTEXT_MIN_K });
  }
  if (!precisionFits(world, ctx.content, site, lineage, generation, precision, contextK)) {
    return fail("errors.context.does_not_fit", {
      site: site.name,
      context_k: contextK,
      needed_gb: Math.round(
        hostedMemoryGb(lineage, generation, precision, contextK, selfTuningOf(player)),
      ),
      memory_gb: Math.round(site.derived.memory_gb),
      max_context_k: maxContextK(
        lineage,
        generation,
        precision,
        site.derived.memory_gb,
        1,
        selfTuningOf(player),
      ),
    });
  }
  site.contextKUsed = contextK;
  ctx.outbox.log({
    key: "log.context_changed",
    vars: { site: site.id, context_k: contextK },
    playerId: player.id,
  });
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
        "site.contextKUsed",
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
      set_context: setContext,
    },
  };
}
