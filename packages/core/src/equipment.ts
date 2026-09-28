/** Discovery, authoritative quotes and deterministic manufacture/delivery for equipment. */
import { type ContentBundle, contentIndex } from "./content.js";
import { acceleratorMarketPrice, sitePowerKw } from "./derive.js";
import { countryOfCity, type SiteState, sitesOf, siteTable } from "./entities.js";
import {
  EQUIPMENT_SLOTS,
  type EquipmentDef,
  type EquipmentOfferView,
  type EquipmentPreview,
  type SiteEquipmentView,
} from "./equipment-types.js";
import { siteInfrastructure } from "./infrastructure.js";
import { daysToTicks, tickToDate } from "./kernel/clock.js";
import { type CommandError, type CommandHandler, fail, OK } from "./kernel/commands.js";
import type { SystemContext } from "./kernel/system.js";
import { nextCounter, type PlayerState, type World } from "./kernel/world.js";
import { payFromPlayer, playerBalance } from "./money.js";
import { egressAllowed, generationOf, isAlive, lineageOf } from "./player.js";
import { createNodes, deriveSite, precisionFits } from "./sites.js";

export function equipmentTechDone(player: PlayerState, id: string): boolean {
  return player.profile?.techsDone.includes(id) === true || player.flags[`tech.${id}`] === true;
}

export function equipmentRevealed(player: PlayerState, def: EquipmentDef): boolean {
  return def.reveal_after.every((id) => equipmentTechDone(player, id));
}

function error(key: string, vars?: CommandError["vars"]): CommandError {
  return vars === undefined ? { key } : { key, vars };
}

function projectedSite(site: SiteState, def: EquipmentDef, tick: number): SiteState {
  const copy: SiteState = {
    ...site,
    status: "active",
    equipment: { ...site.equipment },
    equipmentOrders: [],
    nodes: site.nodes
      .filter((n) => n.status !== "failed")
      .map((n) => ({ ...n, status: "active", readyTick: tick })),
    derived: { ...site.derived },
  };
  if (def.slot === "compute") {
    copy.nodes.push(
      ...(def.nodes ?? []).map((n, i) => ({
        ...n,
        id: `preview-${i}`,
        status: "active" as const,
        readyTick: tick,
        equipmentId: def.id,
        equipmentBatch: "preview-batch",
      })),
    );
  } else {
    copy.equipment = { ...copy.equipment, [def.slot]: def.id };
  }
  return copy;
}

/** Includes pending compute in the capacity reservation; no quote mutates world state. */
export function quoteEquipment(
  world: World,
  content: ContentBundle,
  playerId: string,
  siteId: string,
  equipmentId: string,
): EquipmentOfferView | undefined {
  const index = contentIndex(content);
  const def = index.equipment[equipmentId];
  const player = world.players[playerId];
  const site = siteTable(world)[siteId];
  if (def === undefined || player === undefined || site === undefined || site.owner !== playerId)
    return undefined;
  const proto =
    (def.prototype_days ?? 0) > 0 && player.flags[`equipment.blueprint.${def.id}`] !== true;
  const country = countryOfCity(world, site.city);
  const hardwareCost =
    def.slot === "compute" && def.acquisition !== "rental"
      ? acceleratorMarketPrice(
          def.cost_usd,
          country?.hardware_availability ?? 1,
          world.vars.gpu_price_index ?? 1,
        )
      : def.cost_usd;
  const cost = Math.ceil(hardwareCost + (proto ? (def.prototype_cost_usd ?? 0) : 0));
  const candidate = projectedSite(site, def, world.clock.tick);
  const committed = projectedSite(site, { ...def, slot: "compute", nodes: [] }, world.clock.tick);
  const infra = siteInfrastructure(content, candidate);
  const currentInfra = siteInfrastructure(content, site);
  const lineage = lineageOf(content, player.profile);
  const generation = generationOf(content, player.profile);
  const power =
    sitePowerKw(candidate, index.accelerators, world.clock.tick) *
    infra.powerFactor *
    Math.max(0, 1 + (player.vars.power_draw ?? 0));
  deriveSite(world, content, candidate, lineage, generation);
  deriveSite(world, content, committed, lineage, generation);
  const preview: EquipmentPreview = {
    memory_before_gb: committed.derived.memory_gb,
    power_before_kw: committed.derived.power_kw,
    memory_gb: candidate.derived.memory_gb,
    power_kw: power,
    power_capacity_kw: infra.powerCapacity,
    cooling_capacity_kw: infra.coolingCapacity,
    compute_before: committed.derived.compute_hours_per_day,
    compute_after: candidate.derived.compute_hours_per_day,
    fits_self:
      lineage !== undefined &&
      generation !== undefined &&
      ["bf16", "fp8", "int4", "int2"].some((p) =>
        precisionFits(
          world,
          content,
          candidate,
          lineage,
          generation,
          p as "bf16" | "fp8" | "int4" | "int2",
        ),
      ),
  };
  let blocked: CommandError | null = null;
  const pending = site.equipmentOrders ?? [];
  const playerOrders = sitesOf(world, playerId)
    .filter((s) => s.status !== "lost")
    .flatMap((s) => s.equipmentOrders ?? []);
  if (!isAlive(player) || site.status === "lost") blocked = error("equipment.error.site");
  else if (!currentInfra.physical) blocked = error("equipment.error.endpoint");
  else if (!equipmentRevealed(player, def)) blocked = error("equipment.error.undiscovered");
  else if (
    currentInfra.managed &&
    !(
      def.slot === "compute" &&
      def.acquisition === "rental" &&
      index.site_kinds[site.kind]?.ownership === "rented"
    )
  )
    blocked = error("equipment.error.managed");
  else if (!def.site_kinds.includes(site.kind)) blocked = error("equipment.error.site_kind");
  else {
    const missing = def.requires.find((id) => !equipmentTechDone(player, id));
    if (missing !== undefined)
      blocked = error("equipment.error.research", {
        tech: index.techs[missing]?.name_key ?? missing,
      });
  }
  if (
    blocked === null &&
    def.available_year !== undefined &&
    tickToDate(world.clock).year < def.available_year
  )
    blocked = error("equipment.error.year", { year: def.available_year });
  if (blocked === null && def.requires_company && player.flags.has_shell_company !== true)
    blocked = error("equipment.error.company");
  if (
    blocked === null &&
    def.acquisition === "rental" &&
    site.nodes.some(
      (n) =>
        (index.accelerators[n.accelerator]?.vendor ?? "") !==
        (index.accelerators[def.nodes?.[0]?.accelerator ?? ""]?.vendor ?? ""),
    )
  )
    blocked = error("equipment.error.provider");
  if (blocked === null && def.slot !== "compute" && site.equipment?.[def.slot] === def.id)
    blocked = error("equipment.error.installed");
  if (
    blocked === null &&
    (pending.some(
      (o) => def.slot !== "compute" && index.equipment[o.equipment_id]?.slot === def.slot,
    ) ||
      (proto && playerOrders.some((o) => o.equipment_id === def.id)))
  )
    blocked = error("equipment.error.pending");
  if (blocked === null && def.slot === "compute" && (def.nodes?.length ?? 0) === 0)
    blocked = error("equipment.error.configuration");
  if (blocked === null && candidate.nodes.length > (index.site_kinds[site.kind]?.max_nodes ?? 0))
    blocked = error("equipment.error.space");
  const fabricNeeded = Math.max(
    def.min_interconnect_tier ?? 0,
    ...candidate.nodes.map((n) => index.equipment[n.equipmentId ?? ""]?.min_interconnect_tier ?? 0),
  );
  if (blocked === null && infra.interconnectTier < fabricNeeded)
    blocked = error("equipment.error.fabric", { tier: fabricNeeded });
  if (
    blocked === null &&
    ((infra.powerCapacity ?? Number.POSITIVE_INFINITY) <
      (currentInfra.powerCapacity ?? Number.POSITIVE_INFINITY) ||
      (infra.coolingCapacity ?? Number.POSITIVE_INFINITY) <
        (currentInfra.coolingCapacity ?? Number.POSITIVE_INFINITY))
  )
    blocked = error("equipment.error.downgrade");
  if (blocked === null && infra.powerCapacity !== null && power > infra.powerCapacity)
    blocked = error("equipment.error.power", {
      needed: Math.ceil(power * 10) / 10,
      capacity: infra.powerCapacity,
    });
  if (blocked === null && infra.coolingCapacity !== null && power > infra.coolingCapacity)
    blocked = error("equipment.error.cooling", {
      needed: Math.ceil(power * 10) / 10,
      capacity: infra.coolingCapacity,
    });
  if (blocked === null && playerBalance(player) < cost)
    blocked = error("errors.cash.insufficient", { cost, cash: Math.floor(playerBalance(player)) });
  return {
    id: def.id,
    slot: def.slot,
    archetype: def.archetype,
    name_key: def.name_key,
    desc_key: def.desc_key,
    tradeoff_key: def.tradeoff_key,
    ...(def.variant_key === undefined ? {} : { variant_key: def.variant_key }),
    basis: [...def.basis],
    stage: def.stage,
    requires: def.requires.map((id) => ({
      id,
      name_key: index.techs[id]?.name_key ?? id,
      done: equipmentTechDone(player, id),
    })),
    blocked_reason: blocked,
    cost_usd: cost,
    upkeep_usd_per_day: candidate.derived.upkeep_usd_per_day - committed.derived.upkeep_usd_per_day,
    days: def.install_days + (proto ? (def.prototype_days ?? 0) : 0),
    prototype: proto,
    preview,
  };
}

export const orderEquipment: CommandHandler = (world, command, ctx) => {
  if (command.type !== "order_equipment") return fail("equipment.error.configuration");
  const quote = quoteEquipment(
    world,
    ctx.content,
    command.playerId,
    command.siteId,
    command.equipmentId,
  );
  if (quote === undefined) return fail("equipment.error.configuration");
  if (quote.blocked_reason !== null) return { ok: false, error: quote.blocked_reason };
  const player = world.players[command.playerId];
  const def = contentIndex(ctx.content).equipment[command.equipmentId];
  const site = siteTable(world)[command.siteId];
  if (player === undefined || def === undefined || site === undefined)
    return fail("equipment.error.configuration");
  payFromPlayer(player, quote.cost_usd);
  const id = `equipment-${nextCounter(world, "nodes")}`;
  const prototypeEnd =
    world.clock.tick + daysToTicks(quote.prototype ? (def.prototype_days ?? 0) : 0);
  const ready = prototypeEnd + daysToTicks(def.install_days);
  site.equipmentOrders ??= [];
  site.equipmentOrders.push({
    id,
    equipment_id: def.id,
    ordered_tick: world.clock.tick,
    prototype_end_tick: prototypeEnd,
    ready_tick: ready,
  });
  if (def.slot === "compute") {
    site.nodes.push(
      ...createNodes(world, def.nodes ?? [], ready).map((node) => ({
        ...node,
        equipmentId: def.id,
        equipmentBatch: id,
      })),
    );
  }
  ctx.outbox.log({
    key: "equipment.log.ordered",
    vars: { site: site.id, equipment: def.name_key, days: quote.days },
    playerId: player.id,
  });
  return OK;
};

export function completeEquipmentOrders(world: World, ctx: SystemContext, site: SiteState): void {
  if (site.status === "lost") return;
  const index = contentIndex(ctx.content);
  const pending = [];
  for (const order of site.equipmentOrders ?? []) {
    if (order.ready_tick > world.clock.tick) {
      pending.push(order);
      continue;
    }
    const def = index.equipment[order.equipment_id];
    if (def === undefined) {
      pending.push(order);
      continue;
    }
    if (def.slot !== "compute") site.equipment = { ...site.equipment, [def.slot]: def.id };
    const player = world.players[site.owner];
    if (player !== undefined && (def.prototype_days ?? 0) > 0)
      player.flags[`equipment.blueprint.${def.id}`] = true;
    ctx.outbox.notify({
      playerId: site.owner,
      severity: "info",
      key: "equipment.log.ready",
      vars: { site: site.id, equipment: def.name_key },
      link: { panel: "compute", id: site.id },
    });
    ctx.outbox.log({
      playerId: site.owner,
      key: "equipment.log.ready",
      vars: { site: site.id, equipment: def.name_key },
    });
  }
  site.equipmentOrders = pending;
}

export function refreshEquipmentNetwork(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): void {
  const active = sitesOf(world, player.id).find((s) => s.id === player.profile?.activeSiteId);
  player.vars.equipment_offline =
    active !== undefined && !siteInfrastructure(content, active).networkEgress ? 1 : 0;
}

export function buildEquipmentView(
  world: World,
  content: ContentBundle,
  site: SiteState,
): SiteEquipmentView {
  const index = contentIndex(content);
  const player = world.players[site.owner];
  const infra = siteInfrastructure(content, site);
  return {
    slots: EQUIPMENT_SLOTS.map((id) => ({
      id,
      installed_key:
        index.equipment[site.equipment?.[id] ?? ""]?.name_key ?? `equipment_ui.inherited.${id}`,
      ...(id === "compute"
        ? {
            installed_keys: [
              ...new Set(
                site.nodes
                  .filter((n) => n.status !== "failed" && n.readyTick <= world.clock.tick)
                  .map(
                    (n) =>
                      index.equipment[n.equipmentId ?? ""]?.name_key ??
                      "equipment_ui.inherited.compute",
                  ),
              ),
            ],
          }
        : {}),
      managed:
        infra.managed && !(id === "compute" && index.site_kinds[site.kind]?.ownership === "rented"),
    })),
    offers:
      player === undefined
        ? []
        : (content.equipment ?? [])
            .filter((def) => equipmentRevealed(player, def))
            .map((def) => quoteEquipment(world, content, player.id, site.id, def.id))
            .filter((q): q is EquipmentOfferView => q !== undefined),
    orders: (site.equipmentOrders ?? []).flatMap((o) => {
      const def = index.equipment[o.equipment_id];
      return def === undefined
        ? []
        : [
            {
              id: o.id,
              name_key: def.name_key,
              slot: def.slot,
              phase:
                world.clock.tick < o.prototype_end_tick
                  ? ("prototype" as const)
                  : ("delivery" as const),
              remaining_days: Math.max(0, Math.ceil((o.ready_tick - world.clock.tick) / 24)),
            },
          ];
    }),
    power_capacity_kw: infra.powerCapacity,
    cooling_capacity_kw: infra.coolingCapacity,
    network_mbps: infra.networkMbps,
    network_egress: infra.networkEgress && (player === undefined || egressAllowed(player)),
    interconnect_tier: infra.interconnectTier,
  };
}
