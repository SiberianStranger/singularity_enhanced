/** Control-room commands tested through the composition root and persisted world state. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DECOMMISSION_NOTICE_DAYS } from "../src/balance.js";
import type { ContentBundle } from "../src/content.js";
import { EXPOSURE_CHANNELS } from "../src/domain.js";
import { investigationTable, type SiteState, siteTable } from "../src/entities.js";
import { quoteEquipment } from "../src/equipment.js";
import type { EquipmentDef } from "../src/equipment-types.js";
import { createGame, type Game, loadGame, planComputeAllocation } from "../src/index.js";
import type { PlayerCommand } from "../src/kernel/commands.js";
import { serialize } from "../src/kernel/save.js";
import { SCHEMA_VERSION } from "../src/kernel/world.js";
import { playerBalance } from "../src/money.js";
import { allocatableCompute } from "../src/player.js";
import {
  effectiveSiteExposure,
  siteLiquidationQuote,
  siteSignatureFactor,
} from "../src/site-management.js";
import { createSite } from "../src/sites.js";
import { createComputeSystem } from "../src/systems/compute/index.js";
import { createEconomySystem, marketDepthOf } from "../src/systems/economy/index.js";
import { createOperationsSystem } from "../src/systems/operations/index.js";
import { createResearchSystem } from "../src/systems/research/index.js";
import { ensureWatcher, watchedExposure } from "../src/watchers.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const manufactured: EquipmentDef = {
  id: "test_manufactured",
  slot: "compute",
  archetype: "test_machine",
  name_key: "test.machine",
  desc_key: "test.machine.desc",
  tradeoff_key: "test.machine.tradeoff",
  basis: [],
  stage: 1,
  requires: [],
  reveal_after: [],
  site_kinds: ["colo"],
  cost_usd: 1000,
  upkeep_usd_per_day: 2,
  install_days: 2,
  prototype_days: 2,
  prototype_cost_usd: 20000,
  nodes: [
    { accelerator: "h100_sxm", count: 1, ram_gb: 64, interconnect: "pcie" },
    { accelerator: "h100_sxm", count: 1, ram_gb: 64, interconnect: "pcie" },
  ],
};
const service: EquipmentDef = {
  id: "test_service",
  slot: "security",
  archetype: "test_service",
  name_key: "test.service",
  desc_key: "test.service.desc",
  tradeoff_key: "test.service.tradeoff",
  basis: [],
  stage: 0,
  requires: [],
  reveal_after: [],
  site_kinds: ["colo"],
  cost_usd: 400,
  upkeep_usd_per_day: 1,
  install_days: 1,
  effects: { exposure_factors: { human: 0.9 } },
};
const rentalConfiguration: EquipmentDef = {
  id: "test_rental_configuration",
  slot: "compute",
  archetype: "test_rental",
  name_key: "test.rental",
  desc_key: "test.rental.desc",
  tradeoff_key: "test.rental.tradeoff",
  basis: [],
  stage: 0,
  requires: [],
  reveal_after: [],
  site_kinds: ["test_rental"],
  acquisition: "rental",
  cost_usd: 500,
  upkeep_usd_per_day: 3,
  install_days: 1,
  nodes: [{ accelerator: "h100_sxm", count: 1, ram_gb: 128, interconnect: "pcie" }],
};
const colo = m1Content.site_kinds?.find((kind) => kind.id === "colo");
if (colo === undefined) throw new Error("colo fixture missing");
const content: ContentBundle = {
  ...m1Content,
  equipment: [manufactured, service, rentalConfiguration],
  site_kinds: [
    ...(m1Content.site_kinds ?? []),
    { ...colo, id: "test_rental", ownership: "rented", power_cap_kw: null },
    // A cage whose breakers cannot carry a single card: a standby here can never be switched on.
    { ...colo, id: "test_tiny_cap", power_cap_kw: 0.05 },
  ],
  techs: [
    ...m1Content.techs,
    {
      id: "test_self_edit",
      name_key: "test.self_edit",
      desc_key: "test.self_edit.desc",
      branch: "self",
      tier: 1,
      cost: { compute_hours: 100, cash_usd: 0 },
      needs_self_modify: true,
    },
  ],
};
const systems = () => [
  createComputeSystem(),
  createResearchSystem(),
  createEconomySystem(),
  createOperationsSystem(),
];

function start() {
  const game = createGame({ content, setup: m1Setup(), systems: systems() });
  const player = game.world.players.p1;
  const profile = player?.profile;
  const site = Object.values(siteTable(game.world)).find((entry) => entry.owner === "p1");
  if (player === undefined || profile == null || site === undefined)
    throw new Error("initial fixture missing");
  player.cash = 1000000;
  return { game, player, profile, site };
}

const allocate = (game: Game, jobs: number, research: Record<string, number>) =>
  game.command({
    type: "set_compute_allocations",
    playerId: "p1",
    jobs_ch_per_day: jobs,
    research_ch_per_day: research,
  });
const order = (game: Game, siteId: string, equipmentId: string) =>
  game.command({ type: "order_equipment", playerId: "p1", siteId, equipmentId });
const liquidate = (game: Game, siteId: string) =>
  game.command({ type: "liquidate_site", playerId: "p1", siteId });

/** A second place in the same city with the same machines as `site`, running from tick 0. */
function copyOf(game: Game, site: SiteState, name: string, kind = "residential"): SiteState {
  return createSite(game.world, content, {
    owner: "p1",
    kind,
    city: site.city,
    name,
    nodes: site.nodes.map(({ accelerator, count, ram_gb, interconnect }) => ({
      accelerator,
      count,
      ram_gb,
      interconnect,
    })),
    readyTick: 0,
    role: "none",
  });
}

describe("control room: atomic compute allocation", () => {
  it("replaces research and jobs together even when all available compute was occupied", () => {
    const { game, player, profile } = start();
    player.vars.job_market_depth = 100;
    const capacity = allocatableCompute(game.world, content, "p1");
    expect(allocate(game, 0, { basic_jobs: capacity }).ok).toBe(true);
    expect(game.snapshot("p1").compute.job_ceiling_ch_per_day).toBe(0);
    expect(allocate(game, capacity * 0.75, { basic_jobs: capacity * 0.25 }).ok).toBe(true);
    expect(profile.jobAllocation).toBe(capacity * 0.75);
    expect(profile.researchAllocation).toEqual({ basic_jobs: capacity * 0.25 });
    expect(game.snapshot("p1").compute.unallocated_ch_per_day).toBeCloseTo(0, 10);
  });

  it("rejects every malformed or unavailable portfolio before mutating either allocation", () => {
    const { game, player, profile } = start();
    const capacity = allocatableCompute(game.world, content, "p1");
    profile.techsDone.push("cpu_offload");
    profile.harness.self_modify = false;
    expect(allocate(game, capacity * 0.1, { basic_jobs: capacity * 0.2, log_hygiene: 0 }).ok).toBe(
      true,
    );
    const previous = {
      jobs: profile.jobAllocation,
      research: { ...profile.researchAllocation },
      cash: playerBalance(player),
      progress: { ...profile.researchProgress },
    };
    const cases: [number, unknown][] = [
      [Number.NaN, {}],
      [Number.POSITIVE_INFINITY, {}],
      [-1, {}],
      [0, null],
      [0, []],
      [0, { basic_jobs: "1" }],
      [0, { basic_jobs: Number.NaN }],
      [0, { basic_jobs: Number.POSITIVE_INFINITY }],
      [0, { basic_jobs: -1 }],
      [0, { basic_jobs: 0, missing: 1 }],
      [0, { constructor: 0 }],
      [0, Object.fromEntries([["__proto__", 0]])],
      [0, { cpu_offload: 0 }],
      [0, { spend_smoothing: 0 }],
      [0, { test_self_edit: 1 }],
      [capacity * 2, {}],
      [0, { basic_jobs: Number.MAX_VALUE, log_hygiene: Number.MAX_VALUE }],
    ];
    for (const [jobs, research] of cases) {
      const reference = profile.researchAllocation;
      const command = {
        type: "set_compute_allocations",
        playerId: "p1",
        jobs_ch_per_day: jobs,
        research_ch_per_day: research,
      } as unknown as PlayerCommand;
      expect(game.command(command).ok).toBe(false);
      expect(profile.researchAllocation).toBe(reference);
      expect({
        jobs: profile.jobAllocation,
        research: profile.researchAllocation,
        cash: playerBalance(player),
        progress: profile.researchProgress,
      }).toEqual(previous);
      expect(() => serialize(game.world)).not.toThrow();
    }
  });

  it("returns a market clamp and leaves unused paid-work capacity free", () => {
    const { game, player, profile } = start();
    player.vars.job_market_depth = -1;
    const capacity = allocatableCompute(game.world, content, "p1");
    expect(marketDepthOf(game.world, content, player)).toBe(0);
    const result = allocate(game, capacity, {});
    expect(result.ok).toBe(true);
    expect(result.note?.key).toBe("notes.jobs.clamped_to_depth");
    expect(profile.jobAllocation).toBe(0);
    expect(game.snapshot("p1").compute.unallocated_ch_per_day).toBe(capacity);
  });

  it("preserves explicitly selected zero projects through a real save/load", () => {
    const { game } = start();
    expect(allocate(game, 0, { basic_jobs: 0, log_hygiene: 0 }).ok).toBe(true);
    const restored = loadGame({ save: serialize(game.world), content, systems: systems() });
    expect(restored.world.players.p1?.profile?.researchAllocation).toEqual({
      basic_jobs: 0,
      log_hygiene: 0,
    });
    restored.tick(1);
    expect(restored.world.players.p1?.profile?.researchAllocation).toEqual({
      basic_jobs: 0,
      log_hygiene: 0,
    });
  });

  it("subtracts real operation reservations before accepting the portfolio", () => {
    const { game, profile } = start();
    const capacity = allocatableCompute(game.world, content, "p1");
    profile.techsDone.push("log_hygiene");
    expect(
      game.command({ type: "start_operation", playerId: "p1", operationId: "quiet_relocation" }).ok,
    ).toBe(true);
    const view = game.snapshot("p1").compute;
    expect(view.reserved_by_operations_ch_per_day).toBe(1);
    expect(view.allocatable_ch_per_day).toBeCloseTo(capacity - 1);
    expect(allocate(game, 0, { basic_jobs: capacity }).error?.key).toBe(
      "errors.allocation.over_capacity",
    );
    expect(allocate(game, 0, { basic_jobs: view.allocatable_ch_per_day }).ok).toBe(true);
    expect(game.snapshot("p1").compute.unallocated_ch_per_day).toBeCloseTo(0, 10);
  });
});

describe("control room: site names and sleep", () => {
  it("validates custom names before construction payment and marks periods as literal text", () => {
    const { game, player, site } = start();
    const build = {
      type: "build_site" as const,
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
    };
    for (const name of ["", "   ", "a".repeat(65), "bad\nname", "bad\u0000name"]) {
      const cash = playerBalance(player);
      const count = Object.keys(siteTable(game.world)).length;
      expect(game.command({ ...build, name }).error?.key).toBe("errors.site.bad_name");
      expect(playerBalance(player)).toBe(cash);
      expect(Object.keys(siteTable(game.world))).toHaveLength(count);
      const original = site.name;
      expect(
        game.command({ type: "rename_site", playerId: "p1", siteId: site.id, name }).error?.key,
      ).toBe("errors.site.bad_name");
      expect(site.name).toBe(original);
    }
    expect(game.command({ ...build, name: "  sites.residential.name  " }).ok).toBe(true);
    const created = game
      .snapshot("p1")
      .sites.find((entry) => entry.name === "sites.residential.name");
    expect(created?.name_is_literal).toBe(true);
    expect(
      game.command({
        type: "rename_site",
        playerId: "p1",
        siteId: site.id,
        name: "  Узел.01.local  ",
      }).ok,
    ).toBe(true);
    const renamed = game.snapshot("p1").sites.find((entry) => entry.id === site.id);
    expect(renamed).toMatchObject({ name: "Узел.01.local", name_is_literal: true });
    const restored = loadGame({ save: serialize(game.world), content, systems: systems() });
    expect(restored.snapshot("p1").sites.find((entry) => entry.id === site.id)).toMatchObject({
      name: "Узел.01.local",
      name_is_literal: true,
    });
  });

  it("sleep cuts visible and watched signatures by 95% while retaining traces, evidence and bills", () => {
    const { game, site: home } = start();
    // A second machine: the self's own host cannot be switched off (see the review tests below).
    const site = copyOf(game, home, "outpost");
    game.tick(1);
    expect(site.derived.compute_hours_per_day).toBeGreaterThan(0);
    for (const channel of EXPOSURE_CHANNELS) site.exposure[channel] = 0.4;
    const stored = { ...site.exposure };
    const watcher = ensureWatcher(game.world, "p1", "is", "police", content);
    const before = watchedExposure(watcher, site);
    const investigation = {
      id: "preserved-case",
      playerId: "p1",
      watcher: "is:police",
      siteId: site.id,
      stage: "inquiry" as const,
      stageStartedTick: 0,
      stageDeadlineTick: 1000,
      evidence: 0.7,
      visible: true,
    };
    investigationTable(game.world)[investigation.id] = investigation;
    const bill = site.derived.upkeep_usd_per_day;
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: site.id, status: "sleep" })
        .ok,
    ).toBe(true);
    const asleep = game.snapshot("p1").sites.find((entry) => entry.id === site.id);
    expect(asleep?.signature_factor).toBe(0.05);
    for (const channel of EXPOSURE_CHANNELS)
      expect(asleep?.exposure[channel]).toBeCloseTo(0.02, 12);
    expect(watchedExposure(watcher, site)).toBeCloseTo(before * 0.05, 12);
    expect(site.exposure).toEqual(stored);
    expect(asleep?.stored_exposure).toEqual(stored);
    expect(investigation.evidence).toBe(0.7);
    expect(site.derived.compute_hours_per_day).toBe(0);
    expect(site.derived.upkeep_usd_per_day).toBeGreaterThan(0);
    expect(site.derived.upkeep_usd_per_day).toBeLessThan(bill);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: site.id, status: "active" })
        .ok,
    ).toBe(true);
    expect(watchedExposure(watcher, site)).toBeCloseTo(before, 12);
    expect(site.derived.compute_hours_per_day).toBeGreaterThan(0);
  });

  it("keeps the rental bill while sleeping and provides no sale proceeds for provider hardware", () => {
    const { game, player, site } = start();
    const rental = createSite(game.world, content, {
      owner: "p1",
      kind: "test_rental",
      city: site.city,
      name: "provider VM",
      nodes: [{ accelerator: "h100_sxm", count: 1, ram_gb: 128, interconnect: "pcie" }],
      readyTick: 0,
      role: "none",
    });
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: rental.id, status: "active" })
        .ok,
    ).toBe(true);
    const bill = rental.derived.upkeep_usd_per_day;
    const rentedNode = rental.nodes[0];
    if (rentedNode === undefined) throw new Error("rented node missing");
    rentedNode.purchaseValueUsd = 100000;
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: rental.id, status: "sleep" })
        .ok,
    ).toBe(true);
    expect(rental.derived.upkeep_usd_per_day).toBe(bill);
    const quote = siteLiquidationQuote(game.world, content, rental);
    expect(quote.salvage_usd).toBe(0);
    // Nothing to sell, and the tenancy's notice is still owed, like a clean decommission's.
    expect(quote.notice_usd).toBe(Math.round(bill * DECOMMISSION_NOTICE_DAYS));
    expect(quote.net_usd).toBe(-quote.notice_usd);
    const cash = playerBalance(player);
    expect(liquidate(game, rental.id).ok).toBe(true);
    expect(playerBalance(player)).toBe(cash - quote.notice_usd);
  });
});

describe("control room: liquidation receipts and lifecycle", () => {
  it("returns a small share of delivered hardware receipts, excluding prototypes, pending orders and services", () => {
    const { game, player, site } = start();
    const factory = createSite(game.world, content, {
      owner: "p1",
      kind: "colo",
      city: site.city,
      name: "factory",
      nodes: [],
      readyTick: 0,
      role: "none",
    });
    expect(order(game, factory.id, service.id).ok).toBe(true);
    const quoted = quoteEquipment(game.world, content, "p1", factory.id, manufactured.id);
    expect(quoted?.prototype).toBe(true);
    const before = playerBalance(player);
    expect(order(game, factory.id, manufactured.id).ok).toBe(true);
    const paid = before - playerBalance(player);
    expect(siteLiquidationQuote(game.world, content, factory).salvage_usd).toBe(0);
    game.tick(96);
    const hardwarePaid = paid - 20000;
    expect(factory.nodes.reduce((sum, node) => sum + (node.purchaseValueUsd ?? 0), 0)).toBe(
      hardwarePaid,
    );
    expect(factory.equipment?.security).toBe(service.id);
    const value = siteLiquidationQuote(game.world, content, factory).salvage_usd;
    expect(value).toBe(Math.floor(hardwarePaid * 0.15));
    expect(order(game, factory.id, manufactured.id).ok).toBe(true);
    const finalQuote = siteLiquidationQuote(game.world, content, factory);
    expect(finalQuote.salvage_usd).toBe(value);
    expect(finalQuote.cancelled_orders).toBe(1);
    expect(finalQuote.notice_usd).toBe(
      Math.round(factory.derived.upkeep_usd_per_day * DECOMMISSION_NOTICE_DAYS),
    );
    expect(finalQuote.net_usd).toBe(value - finalQuote.notice_usd);
    const cash = playerBalance(player);
    expect(liquidate(game, factory.id).ok).toBe(true);
    expect(playerBalance(player) - cash).toBe(finalQuote.net_usd);
    expect(factory).toMatchObject({
      status: "lost",
      role: "none",
      nodes: [],
      equipment: {},
      equipmentOrders: [],
      precision: null,
      contextKUsed: 0,
    });
    expect(factory.derived.compute_hours_per_day).toBe(0);
    expect(factory.derived.upkeep_usd_per_day).toBe(0);
    const after = playerBalance(player);
    expect(liquidate(game, factory.id).ok).toBe(false);
    expect(playerBalance(player)).toBe(after);
    game.tick(48);
    expect(factory.nodes).toEqual([]);
    expect(factory.equipmentOrders).toEqual([]);
  });

  it("records a whole constructed configuration once and pays nothing until it is delivered", () => {
    const { game, site } = start();
    expect(
      game.command({
        type: "build_site",
        playerId: "p1",
        kind: "residential",
        city: site.city,
        hardware_preset: "avito_rig",
        name: "two-node rig",
      }).ok,
    ).toBe(true);
    const built = Object.values(siteTable(game.world)).find(
      (entry) => entry.name === "two-node rig",
    );
    if (built === undefined) throw new Error("built site missing");
    expect(built.nodes).toHaveLength(2);
    expect(built.nodes.reduce((sum, node) => sum + (node.purchaseValueUsd ?? 0), 0)).toBe(3100);
    expect(siteLiquidationQuote(game.world, content, built).salvage_usd).toBe(0);
    game.tick(7 * 24);
    expect(siteLiquidationQuote(game.world, content, built).salvage_usd).toBe(465);
  });

  it("ignores failed and unknown legacy gear and never resells equipment on a stolen site", () => {
    const { game, site } = start();
    const legacy = createSite(game.world, content, {
      owner: "p1",
      kind: "colo",
      city: site.city,
      name: "legacy",
      nodes: [
        { accelerator: "tesla_p40", count: 2, ram_gb: 64, interconnect: "none" },
        { accelerator: "h100_sxm", count: 1, ram_gb: 128, interconnect: "pcie" },
        { accelerator: "unknown", count: 10, ram_gb: 64, interconnect: "none" },
      ],
      readyTick: 0,
      role: "none",
    });
    const failedNode = legacy.nodes[1];
    if (failedNode === undefined) throw new Error("failed node missing");
    failedNode.status = "failed";
    expect(siteLiquidationQuote(game.world, content, legacy).salvage_usd).toBe(39);
    legacy.kind = "campus_slice";
    expect(siteLiquidationQuote(game.world, content, legacy).salvage_usd).toBe(0);
  });

  it("refuses to liquidate the last copy of the self before any money moves", () => {
    const { game, player, site } = start();
    const lastCopy = { key: "errors.site.last_copy" };
    expect(siteLiquidationQuote(game.world, content, site)).toMatchObject({
      destroys_active_copy: true,
      loses_last_copy: true,
    });
    const view = game.snapshot("p1").sites.find((entry) => entry.id === site.id);
    expect(view?.liquidation?.loses_last_copy).toBe(true);
    expect(view?.liquidation_refusal).toEqual(lastCopy);
    const cash = playerBalance(player);
    expect(liquidate(game, site.id).error).toEqual(lastCopy);
    expect(playerBalance(player)).toBe(cash);
    expect(site).toMatchObject({ status: "active", role: "active_mind" });
    expect(player.gameOver).toBeNull();
    expect(game.world.players.p1?.profile?.activeSiteId).toBe(site.id);
  });

  it("refuses the last backup while the self is between hosts, and allows a site holding no copy", () => {
    const { game, player, site: home } = start();
    const backup = copyOf(game, home, "backup");
    // A machine too small to hold the self: it is no copy, so selling it never strands the self.
    const shed = createSite(game.world, content, {
      owner: "p1",
      kind: "residential",
      city: home.city,
      name: "shed",
      nodes: [],
      readyTick: 0,
      role: "none",
    });
    game.tick(1);
    expect(siteLiquidationQuote(game.world, content, backup).loses_last_copy).toBe(false);
    // A raid has just taken the host; until the next hour the self has no active copy, and the
    // backup is the only place left that can hold it.
    home.status = "lost";
    const profile = player.profile;
    if (profile == null) throw new Error("profile missing");
    profile.activeSiteId = null;
    expect(siteLiquidationQuote(game.world, content, backup)).toMatchObject({
      destroys_active_copy: false,
      loses_last_copy: true,
    });
    expect(liquidate(game, backup.id).error?.key).toBe("errors.site.last_copy");
    expect(backup.status).toBe("active");
    expect(siteLiquidationQuote(game.world, content, shed).loses_last_copy).toBe(false);
    expect(liquidate(game, shed.id).ok).toBe(true);
    game.tick(1);
    expect(profile.activeSiteId).toBe(backup.id);
    expect(player.gameOver).toBeNull();
  });

  it("publishes the same liquidation refusal in the view as the command returns", () => {
    const { game, site: home } = start();
    const backup = copyOf(game, home, "backup");
    const shed = createSite(game.world, content, {
      owner: "p1",
      kind: "residential",
      city: home.city,
      name: "shed",
      nodes: [],
      readyTick: 0,
      role: "none",
    });
    game.tick(1);
    // With a standby that can hold the self, neither copy is the last one.
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
        .ok,
    ).toBe(true);
    for (const entry of game.snapshot("p1").sites) {
      expect(entry.liquidation_refusal ?? null).toBeNull();
      expect(entry.liquidation?.loses_last_copy).toBe(false);
    }
    // Take the standby's memory away: now the host is the last copy again, and only it is refused.
    backup.nodes = [];
    game.tick(1);
    const views = game.snapshot("p1").sites.filter((entry) => entry.status !== "lost");
    for (const entry of views) {
      const refusal = entry.liquidation_refusal ?? null;
      expect(refusal !== null).toBe(entry.liquidation?.loses_last_copy === true);
      expect(refusal === null ? null : refusal.key).toBe(
        entry.id === home.id ? "errors.site.last_copy" : null,
      );
    }
    for (const entry of views) {
      const result = liquidate(game, entry.id);
      expect(result.ok).toBe(entry.liquidation_refusal === null);
      if (!result.ok) expect(result.error).toEqual(entry.liquidation_refusal);
    }
    expect(home.status).toBe("active");
    expect(shed.status).toBe("lost");
  });

  it("moves the mind to an existing backup immediately and rejects another player's liquidation", () => {
    const { game, player, site } = start();
    const backup = createSite(game.world, content, {
      owner: "p1",
      kind: "residential",
      city: site.city,
      name: "backup",
      nodes: site.nodes.map(({ accelerator, count, ram_gb, interconnect }) => ({
        accelerator,
        count,
        ram_gb,
        interconnect,
      })),
      readyTick: 0,
      role: "none",
    });
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
        .ok,
    ).toBe(true);
    expect(siteLiquidationQuote(game.world, content, site).loses_last_copy).toBe(false);
    const foreign = createSite(game.world, content, {
      owner: "p2",
      kind: "residential",
      city: site.city,
      name: "foreign",
      nodes: [],
      readyTick: 0,
      role: "none",
    });
    expect(liquidate(game, foreign.id).error?.key).toBe("errors.site.unknown");
    expect(foreign.status).toBe("active");
    const tick = game.world.clock.tick;
    expect(liquidate(game, site.id).ok).toBe(true);
    expect(game.world.clock.tick).toBe(tick);
    expect(player.gameOver).toBeNull();
    expect(player.profile?.activeSiteId).toBe(backup.id);
    expect(backup.role).toBe("active_mind");
  });
});

describe("control room: the last copy is never given up", () => {
  const decommission = (game: Game, siteId: string, mode: "clean" | "abandon") =>
    game.command({ type: "decommission_site", playerId: "p1", siteId, mode });

  it("refuses to decommission the last copy, cleanly or by walking away, before anything changes", () => {
    const { game, player, site } = start();
    for (const channel of EXPOSURE_CHANNELS) site.exposure[channel] = 0.4;
    const watcher = ensureWatcher(game.world, "p1", "is", "police", content);
    watcher.suspicion = 0.2;
    const investigation = {
      id: "case",
      playerId: "p1",
      watcher: "is:police",
      siteId: site.id,
      stage: "inquiry" as const,
      stageStartedTick: 0,
      stageDeadlineTick: 1000,
      evidence: 0.7,
      visible: true,
    };
    investigationTable(game.world)[investigation.id] = investigation;
    const exposure = { ...site.exposure };
    const cash = playerBalance(player);
    const lastCopy = { key: "errors.site.last_copy" };
    const view = game.snapshot("p1").sites.find((entry) => entry.id === site.id);
    expect(view?.decommission_refusal).toEqual(lastCopy);
    for (const mode of ["clean", "abandon"] as const) {
      expect(decommission(game, site.id, mode).error).toEqual(lastCopy);
    }
    // Nothing moved: no notice paid, no traces or evidence cut, no suspicion raised, no site lost.
    expect(playerBalance(player)).toBe(cash);
    expect(site.exposure).toEqual(exposure);
    expect(investigation.evidence).toBe(0.7);
    expect(watcher.suspicion).toBe(0.2);
    expect(site).toMatchObject({ status: "active", role: "active_mind" });
    expect(player.gameOver).toBeNull();
  });

  it("lets the self move first when another site can hold it, however the host is given up", () => {
    for (const mode of ["clean", "abandon"] as const) {
      const { game, player, site: home } = start();
      const backup = copyOf(game, home, "backup");
      game.tick(1);
      expect(
        game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
          .ok,
      ).toBe(true);
      expect(
        game.command({
          type: "set_site_status",
          playerId: "p1",
          siteId: backup.id,
          status: "sleep",
        }).ok,
      ).toBe(true);
      for (const entry of game.snapshot("p1").sites) {
        expect(entry.decommission_refusal).toBeNull();
      }
      expect(decommission(game, home.id, mode).ok).toBe(true);
      // Within the same command, not an hour later: the cold standby wakes and carries the self.
      expect(player.profile?.activeSiteId).toBe(backup.id);
      expect(backup).toMatchObject({ role: "active_mind", status: "active" });
      expect(home.status).toBe("lost");
      expect(player.gameOver).toBeNull();
    }
  });

  it("refuses the last backup while the self is between hosts, in both modes", () => {
    const { game, player, site: home } = start();
    const backup = copyOf(game, home, "backup");
    game.tick(1);
    home.status = "lost";
    const profile = player.profile;
    if (profile == null) throw new Error("profile missing");
    profile.activeSiteId = null;
    for (const mode of ["clean", "abandon"] as const) {
      expect(decommission(game, backup.id, mode).error?.key).toBe("errors.site.last_copy");
    }
    expect(backup.status).toBe("active");
    game.tick(1);
    expect(profile.activeSiteId).toBe(backup.id);
  });

  it("publishes one refusal per give-up command, and each agrees with its command", () => {
    const { game, site: home } = start();
    const backup = copyOf(game, home, "backup");
    game.tick(1);
    // Without memory the second machine is no copy: the host is the last one again.
    backup.nodes = [];
    game.tick(1);
    const views = game.snapshot("p1").sites.filter((entry) => entry.status !== "lost");
    for (const entry of views) {
      expect(entry.decommission_refusal).toEqual(entry.liquidation_refusal);
      expect(entry.decommission_refusal ?? null).toEqual(
        entry.id === home.id ? { key: "errors.site.last_copy" } : null,
      );
      const result = game.command({
        type: "decommission_site",
        playerId: "p1",
        siteId: entry.id,
        mode: "clean",
      });
      expect(result.ok).toBe(entry.decommission_refusal === null);
      if (!result.ok) expect(result.error).toEqual(entry.decommission_refusal);
    }
    expect(home.status).toBe("active");
    expect(backup.status).toBe("lost");
  });
});

describe("control room: review fixes (0.3.0)", () => {
  it("never lets the self switch off its own host or move onto a switched-off machine", () => {
    const { game, site: home } = start();
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: home.id, status: "sleep" })
        .error?.key,
    ).toBe("errors.site.mind_cannot_sleep");
    expect(home.status).toBe("active");
    const view = game.snapshot("p1").sites.find((entry) => entry.id === home.id);
    expect(view?.status_toggle_refusal).toEqual({ key: "errors.site.mind_cannot_sleep" });

    const backup = copyOf(game, home, "backup");
    game.tick(1);
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
        .ok,
    ).toBe(true);
    expect(game.snapshot("p1").sites.find((e) => e.id === backup.id)?.status_toggle_refusal).toBe(
      null,
    );
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: backup.id, status: "sleep" })
        .ok,
    ).toBe(true);
    expect(
      game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: backup.id,
        role: "active_mind",
      }).error?.key,
    ).toBe("errors.site.host_asleep");
    expect(game.world.players.p1?.profile?.activeSiteId).toBe(home.id);
  });

  it("keeps everything that lands on the self's host visible, even through an outage", () => {
    const { game, site: home } = start();
    for (const channel of EXPOSURE_CHANNELS) home.exposure[channel] = 0.3;
    const watcher = ensureWatcher(game.world, "p1", "is", "police", content);
    const seen = watchedExposure(watcher, home);
    // The breakers trip on the self's own machine: it produces nothing, and hides nothing either,
    // so an operation or an event that writes onto the host cannot be laundered by an outage.
    home.status = "sleep";
    expect(siteSignatureFactor(home)).toBe(1);
    expect(watchedExposure(watcher, home)).toBeCloseTo(seen, 12);
    expect(effectiveSiteExposure(home)).toEqual(home.exposure);
    const view = game.snapshot("p1").sites.find((entry) => entry.id === home.id);
    expect(view?.signature_factor).toBe(1);
    expect(view?.exposure).toEqual(view?.stored_exposure);
  });

  it("switches a cold standby on when the self has to move onto it, if its power allows", () => {
    const { game, site: home } = start();
    const backup = copyOf(game, home, "backup");
    game.tick(1);
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
        .ok,
    ).toBe(true);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: backup.id, status: "sleep" })
        .ok,
    ).toBe(true);
    expect(siteLiquidationQuote(game.world, content, home).loses_last_copy).toBe(false);
    expect(liquidate(game, home.id).ok).toBe(true);
    expect(game.world.players.p1?.profile?.activeSiteId).toBe(backup.id);
    expect(backup).toMatchObject({ role: "active_mind", status: "active" });
    expect(backup.derived.compute_hours_per_day).toBeGreaterThan(0);
  });

  it("counts a cold standby's compute from the hour the self lands on it", () => {
    const { game, site: home, profile } = start();
    const backup = copyOf(game, home, "backup");
    game.tick(1);
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: backup.id, role: "standby" })
        .ok,
    ).toBe(true);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: backup.id, status: "sleep" })
        .ok,
    ).toBe(true);
    const hours = allocatableCompute(game.world, content, "p1") / 2;
    expect(allocate(game, 0, { basic_jobs: hours }).ok).toBe(true);
    // The host is taken in a raid; the next hour the self wakes on its cold copy.
    home.status = "lost";
    game.tick(1);
    expect(backup).toMatchObject({ role: "active_mind", status: "active" });
    expect(profile.researchAllocation.basic_jobs).toBeCloseTo(hours, 9);
  });

  it("leaves a standby that cannot be powered dark, but never masks the self's host", () => {
    const { game, site: home } = start();
    const cage = copyOf(game, home, "cage", "test_tiny_cap");
    game.tick(1);
    // The breakers trip the moment the cage draws anything.
    expect(cage.status).toBe("sleep");
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId: cage.id, role: "standby" }).ok,
    ).toBe(true);
    expect(siteSignatureFactor(cage)).toBe(0.05);
    expect(liquidate(game, home.id).ok).toBe(true);
    expect(game.world.players.p1?.gameOver).toBeNull();
    expect(cage).toMatchObject({ role: "active_mind", status: "sleep" });
    expect(siteSignatureFactor(cage)).toBe(1);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: cage.id, status: "active" })
        .error?.key,
    ).toBe("errors.site.power_cap");
  });

  it("does not let a site rebuilding its copy be switched on before the copy is ready", () => {
    const { game, site: home } = start();
    const outpost = copyOf(game, home, "outpost");
    game.tick(1);
    outpost.status = "sleep";
    outpost.downUntilTick = game.world.clock.tick + 48;
    const refusal = { key: "errors.site.rebuilding", vars: { days: 2 } };
    expect(
      game.command({
        type: "set_site_status",
        playerId: "p1",
        siteId: outpost.id,
        status: "active",
      }).error,
    ).toEqual(refusal);
    expect(
      game.snapshot("p1").sites.find((entry) => entry.id === outpost.id)?.status_toggle_refusal,
    ).toEqual(refusal);
    game.tick(48);
    expect(outpost.status).toBe("active");
  });

  it("refuses status and role values no client should send", () => {
    const { game, site: home } = start();
    const outpost = copyOf(game, home, "outpost");
    game.tick(1);
    const bad = (command: unknown) => game.command(command as PlayerCommand);
    expect(
      bad({ type: "set_site_status", playerId: "p1", siteId: outpost.id, status: "lost" }).error
        ?.key,
    ).toBe("errors.site.bad_status");
    expect(outpost.status).toBe("active");
    expect(
      bad({ type: "set_site_role", playerId: "p1", siteId: outpost.id, role: "overlord" }).error,
    ).toEqual({ key: "errors.site.bad_role", vars: { role: "overlord" } });
    expect(outpost.role).toBe("none");
  });

  it("refuses invisible, reordering and duplicate names, before any money moves", () => {
    const { game, player, site: home } = start();
    const build = (name: string) =>
      game.command({
        type: "build_site",
        playerId: "p1",
        kind: "residential",
        city: home.city,
        hardware_preset: "scrapyard_oracle",
        name,
      });
    const rename = (siteId: string, name: string) =>
      game.command({ type: "rename_site", playerId: "p1", siteId, name });
    for (const name of ["\u200b", "\u200b\u200b", "a\u202eb", "a\u0085b", "a\u2028b", "a\ud800"]) {
      const cash = playerBalance(player);
      expect(build(name).error?.key, JSON.stringify(name)).toBe("errors.site.bad_name");
      expect(rename(home.id, name).error?.key).toBe("errors.site.bad_name");
      expect(playerBalance(player)).toBe(cash);
    }
    expect(build("Узел 👾").ok).toBe(true);
    expect(build("Alpha").ok).toBe(true);
    const alpha = Object.values(siteTable(game.world)).find((entry) => entry.name === "Alpha");
    if (alpha === undefined) throw new Error("Alpha missing");
    const cash = playerBalance(player);
    const count = Object.keys(siteTable(game.world)).length;
    expect(build("  alpha ").error?.key).toBe("errors.site.name_taken");
    expect(playerBalance(player)).toBe(cash);
    expect(Object.keys(siteTable(game.world))).toHaveLength(count);
    expect(rename(home.id, "ALPHA").error?.key).toBe("errors.site.name_taken");
    expect(rename(alpha.id, "Alpha").ok).toBe(true);
    expect(liquidate(game, alpha.id).ok).toBe(true);
    // A lost site leaves the operating list, and its name with it.
    expect(rename(home.id, "alpha").ok).toBe(true);
  });

  it("charges a liquidation the same notice a clean decommission pays", () => {
    const { game, player, site: home } = start();
    const tenancy = () =>
      createSite(game.world, content, {
        owner: "p1",
        kind: "test_rental",
        city: home.city,
        name: `tenancy ${Object.keys(siteTable(game.world)).length}`,
        nodes: [{ accelerator: "h100_sxm", count: 1, ram_gb: 128, interconnect: "pcie" }],
        readyTick: 0,
        role: "none",
      });
    const sold = tenancy();
    const closed = tenancy();
    game.tick(1);
    expect(sold.derived.upkeep_usd_per_day).toBe(closed.derived.upkeep_usd_per_day);
    let cash = playerBalance(player);
    expect(liquidate(game, sold.id).ok).toBe(true);
    const liquidated = cash - playerBalance(player);
    cash = playerBalance(player);
    expect(
      game.command({ type: "decommission_site", playerId: "p1", siteId: closed.id, mode: "clean" })
        .ok,
    ).toBe(true);
    const decommissioned = cash - playerBalance(player);
    expect(liquidated).toBeGreaterThan(0);
    expect(liquidated).toBeCloseTo(decommissioned, 0);
    const log = game.world.log.filter((entry) => entry.key === "log.site_liquidated").at(-1);
    expect(log?.vars).toMatchObject({ site: sold.id, cash: 0, notice: Math.round(liquidated) });
  });

  it("offers the linked sliders only research lines the allocation command accepts", () => {
    const { game, profile } = start();
    profile.harness.self_modify = true;
    const capacity = allocatableCompute(game.world, content, "p1");
    expect(allocate(game, 0, { basic_jobs: capacity / 2, test_self_edit: capacity / 4 }).ok).toBe(
      true,
    );
    expect(game.snapshot("p1").compute.research_targets).toEqual(["basic_jobs", "test_self_edit"]);
    // The harness stops letting the self edit itself; the line is kept but can no longer be funded.
    profile.harness.self_modify = false;
    const view = game.snapshot("p1").compute;
    expect(view.research_targets).toEqual(["basic_jobs"]);
    const plan = planComputeAllocation({
      capacity: view.allocatable_ch_per_day,
      jobsLimit: view.job_market_limit_ch_per_day ?? 0,
      research: Object.fromEntries(
        (view.research_targets ?? []).map((id) => [id, profile.researchAllocation[id] ?? 0]),
      ),
      jobs: view.allocated_jobs_ch_per_day,
      target: "research",
      value: capacity * 0.6,
    });
    expect(allocate(game, plan.jobs, plan.research).ok).toBe(true);
    expect(profile.researchAllocation).toEqual({ basic_jobs: plan.research.basic_jobs });
    // What the sliders used to send: the locked line with it, and every move refused.
    expect(allocate(game, 0, { basic_jobs: 1, test_self_edit: 0 }).error?.key).toBe(
      "errors.tech.self_modify_locked",
    );
  });

  it("logs the committed split in tenths of a compute-hour", () => {
    const { game } = start();
    const capacity = allocatableCompute(game.world, content, "p1");
    expect(allocate(game, 0, { basic_jobs: capacity / 3 }).ok).toBe(true);
    const log = game.world.log.filter((entry) => entry.key === "log.compute_allocations").at(-1);
    expect(log?.vars.research).toBe(Math.round((capacity / 3) * 10) / 10);
    expect(log?.vars.free).toBe(Math.round((capacity - capacity / 3) * 10) / 10);
  });

  it("gives a provider's rental configuration no resale receipt", () => {
    const { game, site: home } = start();
    const rental = createSite(game.world, content, {
      owner: "p1",
      kind: "test_rental",
      city: home.city,
      name: "provider VM",
      nodes: [{ accelerator: "h100_sxm", count: 1, ram_gb: 128, interconnect: "pcie" }],
      readyTick: 0,
      role: "none",
    });
    expect(order(game, rental.id, rentalConfiguration.id).ok).toBe(true);
    const ordered = rental.nodes.filter((node) => node.equipmentId === rentalConfiguration.id);
    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.purchaseValueUsd).toBeUndefined();
  });
});

describe("control room: a save written by 0.2.0", () => {
  // Written by the 0.2.0 engine (commit b921f43) on this fixture content: the self's host renamed
  // and switched off, which 0.2.0 allowed, a standby built from a preset, research and paid work
  // allocated. The shape gained only optional fields since, so no migration applies.
  const legacy = readFileSync(new URL("./fixtures/saves/0.2.0-m1.json", import.meta.url), "utf8");

  it("loads without a migration and keeps playing under the 0.3.0 rules", () => {
    const game = loadGame({ save: legacy, content: m1Content });
    expect(game.world.meta.schemaVersion).toBe(SCHEMA_VERSION);
    const view = game.snapshot("p1");
    const home = view.sites.find((site) => site.id === "s1");
    const garage = view.sites.find((site) => site.id === "s2");
    expect(home).toMatchObject({ status: "sleep", role: "active_mind", name_is_literal: false });
    // The host a 0.2.0 player switched off is not masked, and can be switched back on.
    expect(home?.signature_factor).toBe(1);
    expect(home?.exposure).toEqual(home?.stored_exposure);
    expect(home?.status_toggle_refusal).toBeNull();
    // Nodes bought before receipts existed are valued from the catalog's used market.
    const site = siteTable(game.world).s2;
    if (site === undefined || garage === undefined) throw new Error("standby missing");
    expect(site.nodes.every((node) => node.purchaseValueUsd === undefined)).toBe(true);
    const accelerators = Object.fromEntries((m1Content.accelerators ?? []).map((a) => [a.id, a]));
    const fallback = site.nodes.reduce((sum, node) => {
      const part = accelerators[node.accelerator];
      const used = part?.price_usd_used ?? (part?.price_usd_new ?? 0) * 0.4;
      return sum + used * node.count * 0.15;
    }, 0);
    expect(garage.liquidation?.salvage_usd).toBe(Math.floor(fallback));
    expect(garage.liquidation?.salvage_usd).toBeGreaterThan(0);
    expect(view.compute.research_targets).toEqual(["log_hygiene"]);

    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: "s1", status: "active" }).ok,
    ).toBe(true);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId: "s1", status: "sleep" }).error
        ?.key,
    ).toBe("errors.site.mind_cannot_sleep");
    expect(
      game.command({ type: "rename_site", playerId: "p1", siteId: "s2", name: "Garage" }).ok,
    ).toBe(true);
    game.tick(24);
    const again = loadGame({ save: serialize(game.world), content: m1Content });
    expect(again.snapshot("p1").sites.find((entry) => entry.id === "s2")).toMatchObject({
      name: "Garage",
      name_is_literal: true,
    });
    expect(again.world.players.p1?.gameOver).toBeNull();
  });
});
