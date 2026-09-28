import { describe, expect, it } from "vitest";
import { borrowedChPerDay, newChannelState } from "../src/borrowed.js";
import type { ContentBundle } from "../src/content.js";
import { siteTable } from "../src/entities.js";
import { buildEquipmentView, quoteEquipment } from "../src/equipment.js";
import type { EquipmentDef } from "../src/equipment-types.js";
import { createGame, loadGame } from "../src/index.js";
import { parallelEquipmentFactor } from "../src/infrastructure.js";
import { serialize } from "../src/kernel/save.js";
import { egressAllowed } from "../src/player.js";
import { createSite } from "../src/sites.js";
import { createComputeSystem } from "../src/systems/compute/index.js";
import { createDetectionSystem } from "../src/systems/detection/index.js";
import { marketDepthOf, marketDepthTerms } from "../src/systems/economy/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const basic: EquipmentDef = {
  id: "complete_node",
  slot: "compute",
  archetype: "workstation",
  name_key: "eq.name",
  desc_key: "eq.desc",
  tradeoff_key: "eq.tradeoff",
  basis: ["One complete workstation"],
  stage: 0,
  requires: [],
  reveal_after: [],
  site_kinds: ["residential", "colo"],
  cost_usd: 100,
  upkeep_usd_per_day: 3,
  install_days: 2,
  nodes: [{ accelerator: "rtx_pro_6000", count: 1, ram_gb: 32, interconnect: "pcie" }],
};
const { nodes: _nodes, ...infrastructureBase } = basic;
const definitions: EquipmentDef[] = [
  basic,
  {
    ...basic,
    id: "prototype",
    archetype: "custom",
    requires: ["basic_jobs"],
    reveal_after: ["basic_jobs"],
    prototype_days: 2,
    prototype_cost_usd: 2000,
  },
  {
    ...basic,
    id: "huge",
    archetype: "huge",
    nodes: [{ accelerator: "rtx_pro_6000", count: 100, ram_gb: 32, interconnect: "pcie" }],
  },
  { ...infrastructureBase, id: "power", slot: "power", effects: { power_capacity_kw: 20 } },
  { ...infrastructureBase, id: "power_small", slot: "power", effects: { power_capacity_kw: 1 } },
  {
    ...infrastructureBase,
    id: "cooling",
    slot: "cooling",
    effects: { cooling_capacity_kw: 20, power_factor: 0.9 },
  },
  {
    ...infrastructureBase,
    id: "offline",
    slot: "network",
    effects: { network_egress: false, network_mbps: 0 },
  },
  {
    ...infrastructureBase,
    id: "uplink",
    slot: "network",
    effects: { network_egress: true, network_mbps: 10000, external_work_factor: 1.2 },
  },
  {
    ...infrastructureBase,
    id: "fabric",
    slot: "interconnect",
    effects: { interconnect_tier: 2, parallel_factor: 1.25 },
  },
  {
    ...infrastructureBase,
    id: "fabric_low",
    slot: "interconnect",
    effects: { interconnect_tier: 0 },
  },
  { ...basic, id: "parallel", min_interconnect_tier: 2 },
  {
    ...infrastructureBase,
    id: "security",
    slot: "security",
    effects: { exposure_factors: { human: 0.5 } },
  },
];
// Drop undefined optional fields, the same shape YAML produces.
const content: ContentBundle = {
  ...m1Content,
  equipment: definitions.map(({ nodes, ...def }) =>
    nodes === undefined ? def : { ...def, nodes },
  ),
};
function start() {
  const game = createGame({ content, setup: m1Setup(), systems: [createComputeSystem()] });
  const player = game.world.players.p1;
  if (player === undefined) throw new Error("player missing");
  player.cash = 1000000;
  const site = Object.values(siteTable(game.world)).find((s) => s.owner === "p1");
  if (site === undefined) throw new Error("site missing");
  return { game, player, site };
}
const order = (siteId: string, equipmentId: string) => ({
  type: "order_equipment" as const,
  playerId: "p1",
  siteId,
  equipmentId,
});

describe("equipment orders and progression", () => {
  it("reveals only discovered archetypes and rejects a forged hidden order and raw purchase", () => {
    const { game, player, site } = start();
    expect(
      buildEquipmentView(game.world, content, site).offers.some((o) => o.id === "prototype"),
    ).toBe(false);
    expect(game.command(order(site.id, "prototype")).error?.key).toBe(
      "equipment.error.undiscovered",
    );
    expect(
      game.command({
        type: "buy_hardware",
        playerId: "p1",
        siteId: site.id,
        accelerator: "rtx_pro_6000",
        count: 1,
      }).error?.key,
    ).toBe("equipment.error.use_configuration");
    player.flags["tech.basic_jobs"] = true;
    expect(
      quoteEquipment(game.world, content, "p1", site.id, "prototype")?.blocked_reason,
    ).toBeNull();
  });

  it("debits once, uses the ordered assembly, and adds no memory until readiness", () => {
    const { game, player, site } = start();
    const quote = quoteEquipment(game.world, content, "p1", site.id, basic.id);
    const cash = player.cash;
    const before = site.derived.memory_gb;
    expect(game.command(order(site.id, basic.id)).ok).toBe(true);
    expect(player.cash).toBeCloseTo(cash - (quote?.cost_usd ?? 0));
    expect(site.nodes.at(-1)?.ram_gb).toBe(32);
    game.tick(47);
    expect(site.derived.memory_gb).toBe(before);
    game.tick(1);
    expect(site.derived.memory_gb).toBe(quote?.preview.memory_gb);
    expect(site.derived.compute_hours_per_day).toBeCloseTo(quote?.preview.compute_after ?? -1, 6);
    expect(site.equipmentOrders).toEqual([]);
  });

  it("reserves pending load, rejects cap downgrades and reports the same command reason", () => {
    const { game, site } = start();
    for (const id of ["huge", "power_small"]) {
      const quote = quoteEquipment(game.world, content, "p1", site.id, id);
      expect(quote?.blocked_reason).not.toBeNull();
      expect(game.command(order(site.id, id)).error).toEqual(quote?.blocked_reason);
    }
    expect(game.command(order(site.id, basic.id)).ok).toBe(true);
    expect(game.command(order(site.id, basic.id)).ok).toBe(true);
    expect(game.command(order(site.id, basic.id)).error?.key).toBe("equipment.error.space");
  });

  it("keeps prototype reservation per player and survives a save in both stages", () => {
    const { game, player, site } = start();
    player.flags["tech.basic_jobs"] = true;
    const second = createSite(game.world, content, {
      owner: "p1",
      kind: "residential",
      city: site.city,
      name: "second",
      nodes: [],
      readyTick: 0,
      role: "none",
    });
    expect(game.command(order(site.id, "prototype")).ok).toBe(true);
    expect(game.command(order(second.id, "prototype")).error?.key).toBe("equipment.error.pending");
    game.tick(24);
    const restored = loadGame({
      save: serialize(game.world),
      content,
      systems: [createComputeSystem()],
    });
    expect(
      buildEquipmentView(restored.world, content, siteTable(restored.world)[site.id] as typeof site)
        .orders[0]?.phase,
    ).toBe("prototype");
    game.tick(24);
    restored.tick(24);
    expect(
      buildEquipmentView(restored.world, content, siteTable(restored.world)[site.id] as typeof site)
        .orders[0]?.phase,
    ).toBe("delivery");
    game.tick(48);
    restored.tick(48);
    expect(serialize(restored.world)).toBe(serialize(game.world));
    expect(player.flags["equipment.blueprint.prototype"]).toBe(true);
    expect(quoteEquipment(game.world, content, "p1", second.id, "prototype")?.prototype).toBe(
      false,
    );
  });

  it("preserves legacy equipment on schema-4 load and rejects another player's site", () => {
    const { game, site } = start();
    const saved = JSON.parse(serialize(game.world));
    saved.meta.schemaVersion = 4;
    delete saved.entities.site[site.id].equipment;
    delete saved.entities.site[site.id].equipmentOrders;
    const restored = loadGame({
      save: JSON.stringify(saved),
      content,
      systems: [createComputeSystem()],
    });
    expect(restored.world.meta.schemaVersion).toBe(5);
    expect(siteTable(restored.world)[site.id]?.nodes).toEqual(site.nodes);
    expect(siteTable(restored.world)[site.id]?.equipment).toEqual({});
    expect(quoteEquipment(game.world, content, "stranger", site.id, basic.id)).toBeUndefined();
  });

  it("requires control of physical equipment and does not upgrade an endpoint", () => {
    const { game, site } = start();
    const hosted = {
      ...content,
      site_kinds: (content.site_kinds ?? []).map((k) =>
        k.id === site.kind ? { ...k, ownership: "stolen" as const } : k,
      ),
    };
    expect(quoteEquipment(game.world, hosted, "p1", site.id, basic.id)?.blocked_reason?.key).toBe(
      "equipment.error.managed",
    );
    const endpoint = {
      ...content,
      site_kinds: (content.site_kinds ?? []).map((k) =>
        k.id === site.kind ? { ...k, compute_source: "declared" as const } : k,
      ),
    };
    expect(quoteEquipment(game.world, endpoint, "p1", site.id, basic.id)?.blocked_reason?.key).toBe(
      "equipment.error.endpoint",
    );
  });
});

describe("equipment multiplayer isolation", () => {
  it("isolates discoveries, prototype reservations and ownership between two real players", () => {
    const setup = m1Setup();
    const first = setup.players[0];
    if (first === undefined) throw new Error("setup player missing");
    setup.players.push({ ...first, id: "p2", name: "Second player" });
    const game = createGame({ content, setup, systems: [createComputeSystem()] });
    const one = game.world.players.p1;
    const two = game.world.players.p2;
    const sites = Object.values(siteTable(game.world));
    const siteOne = sites.find((site) => site.owner === "p1");
    const siteTwo = sites.find((site) => site.owner === "p2");
    if (one === undefined || two === undefined || siteOne === undefined || siteTwo === undefined)
      throw new Error("two-player setup missing");
    one.cash = 1000000;
    two.cash = 1000000;
    one.flags["tech.basic_jobs"] = true;
    const visibleTo = (playerId: string) =>
      game.snapshot(playerId).sites.flatMap((site) => site.equipment?.offers ?? []);
    expect(visibleTo("p1").some((offer) => offer.id === "prototype")).toBe(true);
    expect(visibleTo("p2").some((offer) => offer.id === "prototype")).toBe(false);
    expect(game.snapshot("p2").sites.map((site) => site.id)).not.toContain(siteOne.id);
    const cash = two.cash;
    const nodes = siteOne.nodes.length;
    expect(quoteEquipment(game.world, content, "p2", siteOne.id, basic.id)).toBeUndefined();
    expect(game.command({ ...order(siteOne.id, basic.id), playerId: "p2" }).ok).toBe(false);
    expect(two.cash).toBe(cash);
    expect(siteOne.nodes).toHaveLength(nodes);
    expect(siteOne.equipmentOrders).toEqual([]);
    expect(game.command(order(siteOne.id, "prototype")).ok).toBe(true);
    game.tick(24);
    expect(visibleTo("p2").some((offer) => offer.id === "prototype")).toBe(false);
    two.flags["tech.basic_jobs"] = true;
    expect(quoteEquipment(game.world, content, "p2", siteTwo.id, "prototype")?.prototype).toBe(
      true,
    );
    expect(game.command({ ...order(siteTwo.id, "prototype"), playerId: "p2" }).ok).toBe(true);
    game.tick(72);
    expect(one.flags["equipment.blueprint.prototype"]).toBe(true);
    expect(two.flags["equipment.blueprint.prototype"]).toBeUndefined();
    expect(siteTwo.equipmentOrders).toHaveLength(1);
    expect(quoteEquipment(game.world, content, "p1", siteOne.id, "prototype")?.prototype).toBe(
      false,
    );
    expect(quoteEquipment(game.world, content, "p2", siteTwo.id, "prototype")?.prototype).toBe(
      true,
    );
    game.tick(24);
    expect(two.flags["equipment.blueprint.prototype"]).toBe(true);
    expect(siteOne.equipmentOrders).toEqual([]);
    expect(siteTwo.equipmentOrders).toEqual([]);
  });
});

describe("site subsystem effects", () => {
  it("persists a pending infrastructure replacement and installs it once after reload", () => {
    const { game, site } = start();
    expect(game.command(order(site.id, "cooling")).ok).toBe(true);
    game.tick(24);
    const restored = loadGame({
      save: serialize(game.world),
      content,
      systems: [createComputeSystem()],
    });
    game.tick(24);
    restored.tick(24);
    expect(serialize(restored.world)).toBe(serialize(game.world));
    expect(siteTable(restored.world)[site.id]?.equipment?.cooling).toBe("cooling");
    expect(siteTable(restored.world)[site.id]?.equipmentOrders).toEqual([]);
  });

  it("changes power and cooling only after installation and publishes the actual bill delta", () => {
    const { game, site } = start();
    const power = site.derived.power_kw;
    const bill = site.derived.upkeep_usd_per_day;
    const quote = quoteEquipment(game.world, content, "p1", site.id, "cooling");
    expect(game.command(order(site.id, "cooling")).ok).toBe(true);
    expect(site.derived.power_kw).toBe(power);
    game.tick(48);
    expect(site.derived.power_kw).toBeCloseTo(power * 0.9);
    expect(site.derived.upkeep_usd_per_day - bill).toBeCloseTo(
      quote?.upkeep_usd_per_day ?? -999,
      6,
    );
  });

  it("changes external work and borrowed access without accelerating local compute", () => {
    const { game, player, site } = start();
    const work = marketDepthOf(game.world, content, player);
    const compute = site.derived.compute_hours_per_day;
    expect(game.command(order(site.id, "uplink")).ok).toBe(true);
    game.tick(48);
    expect(marketDepthOf(game.world, content, player)).toBeCloseTo(work * 1.2);
    expect(
      marketDepthTerms(game.world, content, player).reduce((s, x) => s + x.value, 0),
    ).toBeCloseTo(work * 1.2);
    expect(site.derived.compute_hours_per_day).toBeCloseTo(compute);
    const channel = createSite(game.world, content, {
      owner: "p1",
      kind: "cloud",
      city: site.city,
      name: "channel",
      nodes: [],
      readyTick: 0,
      role: "none",
      borrowed: { ...newChannelState("test", 0), blocks: 1 },
    });
    channel.status = "active";
    channel.derived.compute_hours_per_day = 9;
    expect(borrowedChPerDay(game.world, "p1")).toBe(9);
    expect(game.command(order(site.id, "offline")).ok).toBe(true);
    game.tick(48);
    expect(egressAllowed(player)).toBe(false);
    channel.derived.compute_hours_per_day = 9; // Even a stale channel view cannot fund work offline.
    expect(borrowedChPerDay(game.world, "p1")).toBe(0);
    expect(marketDepthOf(game.world, content, player)).toBe(0);
    expect(site.derived.compute_hours_per_day).toBeCloseTo(compute);
    expect(game.command(order(site.id, "uplink")).ok).toBe(true);
    game.tick(48);
    expect(egressAllowed(player)).toBe(true);
  });

  it("does not speed independent replicas or graft NVLink, and keeps installed fabric requirements", () => {
    const { game, site } = start();
    site.equipment = { interconnect: "fabric" };
    expect(game.command(order(site.id, "parallel")).ok).toBe(true);
    expect(game.command(order(site.id, "fabric_low")).error?.key).toBe("equipment.error.fabric");
    game.tick(48);
    expect(site.nodes.at(-1)?.interconnect).toBe("pcie");
    expect(parallelEquipmentFactor(content, site, game.world.clock.tick, 1)).toBe(1);
    expect(parallelEquipmentFactor(content, site, game.world.clock.tick, 100000)).toBe(1.25);
  });

  it("refreshes borrowed capacity immediately when the mind moves between isolated and connected sites", () => {
    const endpointBase = content.site_kinds?.find((kind) => kind.id === "campus_slice");
    if (endpointBase === undefined) throw new Error("endpoint base fixture missing");
    const connectedContent: ContentBundle = {
      ...content,
      site_kinds: [
        ...(content.site_kinds ?? []),
        {
          ...endpointBase,
          id: "test_endpoint",
          compute_source: "declared",
          max_nodes: 0,
          can_host_active_mind: false,
        },
      ],
      borrowed_channels: [
        {
          id: "test_channel",
          name_key: "test.channel",
          desc_key: "test.channel.desc",
          drawback_key: "test.channel.drawback",
          site_kind: "test_endpoint",
          unlocked_by: "basic_jobs",
          capacity_per_block_ch: 9,
          max_blocks: 1,
          churn_per_day: 0,
          quality_level: 6,
          quality_variance: 0,
          cost_usd_per_block_per_day: 0,
          exposure_per_block: {},
          refusal: {},
          top_up_operation: "test_top_up",
        },
      ],
    };
    const game = createGame({
      content: connectedContent,
      setup: m1Setup(),
      systems: [createComputeSystem()],
    });
    const player = game.world.players.p1;
    const isolated = Object.values(siteTable(game.world)).find((site) => site.owner === "p1");
    if (player === undefined || isolated === undefined) throw new Error("initial mind missing");
    isolated.equipment = { network: "offline" };
    const connected = createSite(game.world, connectedContent, {
      owner: "p1",
      kind: "residential",
      city: isolated.city,
      name: "connected standby",
      nodes: isolated.nodes.map(({ accelerator, count, ram_gb, interconnect }) => ({
        accelerator,
        count,
        ram_gb,
        interconnect,
      })),
      readyTick: 0,
      role: "none",
    });
    const channel = createSite(game.world, connectedContent, {
      owner: "p1",
      kind: "test_endpoint",
      city: isolated.city,
      name: "external API",
      nodes: [],
      readyTick: 0,
      role: "none",
      borrowed: { ...newChannelState("test_channel", 0), blocks: 1, status: "healthy" },
    });
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: connected.id, role: "standby" })
        .ok,
    ).toBe(true);
    expect(egressAllowed(player)).toBe(false);
    expect(channel.derived.compute_hours_per_day).toBe(0);
    const tick = game.world.clock.tick;
    expect(
      game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: connected.id,
        role: "active_mind",
      }).ok,
    ).toBe(true);
    expect(game.world.clock.tick).toBe(tick);
    expect(egressAllowed(player)).toBe(true);
    expect(channel.derived.compute_hours_per_day).toBe(9);
    expect(borrowedChPerDay(game.world, "p1")).toBe(9);
    expect(game.snapshot("p1").compute.borrowed_ch_per_day).toBe(9);
    expect(
      game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: isolated.id,
        role: "active_mind",
      }).ok,
    ).toBe(true);
    expect(game.world.clock.tick).toBe(tick);
    expect(egressAllowed(player)).toBe(false);
    expect(channel.derived.compute_hours_per_day).toBe(0);
    expect(borrowedChPerDay(game.world, "p1")).toBe(0);
    expect(game.snapshot("p1").compute.borrowed_ch_per_day).toBe(0);
  });

  it("security changes new exposure accrual without deleting the old evidence", () => {
    const a = start();
    const b = start();
    a.site.exposure.human = 0.2;
    b.site.exposure.human = 0.2;
    a.site.equipment = { security: "security" };
    expect(a.site.exposure.human).toBe(0.2);
    const aa = loadGame({
      save: serialize(a.game.world),
      content,
      systems: [createComputeSystem(), createDetectionSystem()],
    });
    const bb = loadGame({
      save: serialize(b.game.world),
      content,
      systems: [createComputeSystem(), createDetectionSystem()],
    });
    aa.tick(24);
    bb.tick(24);
    expect(siteTable(aa.world)[a.site.id]?.exposure.human).toBeLessThan(
      siteTable(bb.world)[b.site.id]?.exposure.human ?? 0,
    );
    expect(siteTable(aa.world)[a.site.id]?.exposure.human).toBeGreaterThan(0.1);
  });
});
