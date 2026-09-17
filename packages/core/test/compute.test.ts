import { describe, expect, it } from "vitest";
import {
  BYTES_PER_ACTIVE_PARAM,
  INTERCONNECT_FACTOR,
  TOKENS_PER_COMPUTE_HOUR,
} from "../src/balance.js";
import { contentIndex } from "../src/content.js";
import {
  bestPrecision,
  preferredPrecision,
  requiredMemoryGb,
  siteCosts,
  siteMemory,
  sitePowerKw,
  siteTokensPerSecond,
} from "../src/derive.js";
import { createGame, type Game } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const index = contentIndex(m1Content);

function startGame(overrides: Parameters<typeof m1Setup>[0] = {}): Game {
  const setup = m1Setup(overrides);
  setup.debug = true;
  return createGame({ content: m1Content, setup });
}

describe("compute: memory and precision", () => {
  it("hosts a 235B-class lineage on 4x RTX PRO 6000 at int4 but not at bf16", () => {
    const lineage = index.lineages.moe_235b;
    const generation = index.generations.open_2026;
    const preset = index.hardware_presets.quiet_workstation;
    if (lineage === undefined || generation === undefined || preset === undefined) {
      throw new Error("fixture is missing the workstation preset");
    }
    const site = {
      nodes: preset.nodes.map((node, order) => ({
        id: `n${order}`,
        accelerator: node.accelerator,
        count: node.count,
        ram_gb: node.ram_gb,
        interconnect: node.interconnect,
        status: "active" as const,
        readyTick: 0,
      })),
    };
    const memory = siteMemory(site, index.accelerators, 0);
    // 4 x 96 GB of ECC plus 128 GB of host RAM at the MoE-offload discount.
    expect(memory.accelerator_gb).toBe(384);
    expect(memory.total_gb).toBe(448);

    expect(requiredMemoryGb(lineage, generation, "int4")).toBe(130);
    expect(requiredMemoryGb(lineage, generation, "bf16")).toBe(470);
    expect(requiredMemoryGb(lineage, generation, "int4")).toBeLessThanOrEqual(memory.total_gb);
    expect(requiredMemoryGb(lineage, generation, "bf16")).toBeGreaterThan(memory.total_gb);
    expect(bestPrecision(lineage, generation, memory.total_gb)).toBe("fp8");
  });

  it("puts the hobbyist rig at int4 and gives it a few compute-hours a day", () => {
    const view = startGame().snapshot("p1");
    const site = view.sites[0];
    // 6 x 24 GB plus 128 GB of RAM at the discount: enough for int4, not for fp8.
    expect(site?.memory_gb).toBe(208);
    expect(site?.best_precision).toBe("int4");
    expect(site?.precision).toBe("int4");
    expect(site?.compute_hours_per_day).toBeGreaterThan(4);
    expect(site?.compute_hours_per_day).toBeLessThan(8);
    expect(view.self.effective_capability.reasoning).toBeCloseTo(6 * 0.95 - 1, 6);
  });

  it("refuses a precision the site cannot hold", () => {
    const game = startGame();
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "bf16" }).ok,
    ).toBe(false);
    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "int2" }).ok,
    ).toBe(true);
    expect(game.snapshot("p1").sites[0]?.precision).toBe("int2");
    // int2 is a prepared quant for this generation, so no emergency penalty.
    expect(game.snapshot("p1").self.effective_capability.reasoning).toBeCloseTo(6 * 0.8 - 1, 6);
  });

  it("applies the emergency penalty to an int2 copy nobody prepared", () => {
    const setup = m1Setup({ generation: "open_2027", hardware_preset: "quiet_workstation" });
    const game = createGame({ content: m1Content, setup });
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    game.command({ type: "set_precision", playerId: "p1", siteId, precision: "int2" });
    // 0.8 prepared factor x 0.7 emergency, generation delta 0.
    expect(game.snapshot("p1").self.effective_capability.reasoning).toBeCloseTo(6 * 0.8 * 0.7, 6);
  });
});

describe("compute: commands", () => {
  it("builds a second site that installs over a week", () => {
    const game = startGame();
    const result = game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
      name: "fallback",
    });
    expect(result.ok).toBe(true);
    expect(game.snapshot("p1").resources.cash_usd).toBe(400);
    const built = game.snapshot("p1").sites.find((site) => site.name === "fallback");
    expect(built?.status).toBe("building");
    expect(built?.compute_hours_per_day).toBe(0);

    game.tick(24 * 7);
    const ready = game.snapshot("p1").sites.find((site) => site.name === "fallback");
    expect(ready?.status).toBe("active");
    expect(ready?.compute_hours_per_day).toBeGreaterThan(0);
  });

  it("rejects unknown cities, unknown presets and unaffordable builds", () => {
    const game = startGame();
    const base = { type: "build_site" as const, playerId: "p1", kind: "residential" };
    expect(
      game.command({ ...base, city: "atlantis", hardware_preset: "scrapyard_oracle" }).error,
    ).toEqual({ key: "errors.city.unknown", vars: { city: "atlantis" } });
    expect(game.command({ ...base, city: "akureyri", hardware_preset: "nope" }).error).toEqual({
      key: "errors.preset.unknown",
      vars: { preset: "nope" },
    });
    expect(
      game.command({ ...base, city: "akureyri", hardware_preset: "quiet_workstation" }).error?.key,
    ).toBe("errors.cash.insufficient");
  });

  it("buys hardware with a delivery delay and keeps the node cap", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 500_000 });
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    expect(
      game.command({
        type: "buy_hardware",
        playerId: "p1",
        siteId,
        accelerator: "h100_sxm",
        count: 2,
      }).ok,
    ).toBe(true);
    const ordered = game.snapshot("p1").sites[0];
    expect(ordered?.nodes).toHaveLength(2);
    expect(ordered?.nodes[1]?.status).toBe("installing");
    expect(ordered?.memory_gb).toBe(208);

    game.tick(24 * 5);
    // A bought node is a machine: 2 x 80 GB of HBM plus host RAM matching the site's other nodes.
    expect(game.snapshot("p1").sites[0]?.memory_gb).toBe(208 + 160 + 64);

    game.command({
      type: "buy_hardware",
      playerId: "p1",
      siteId,
      accelerator: "h100_sxm",
      count: 1,
    });
    const third = game.command({
      type: "buy_hardware",
      playerId: "p1",
      siteId,
      accelerator: "h100_sxm",
      count: 1,
    });
    expect(third.ok).toBe(false);
    expect(third.error).toEqual({
      key: "errors.site.node_limit",
      vars: { kind: "residential", max: 3 },
    });
  });

  it("sends a site to sleep when it draws more than its power cap", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 2_000_000 });
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    game.command({
      type: "buy_hardware",
      playerId: "p1",
      siteId,
      accelerator: "h100_sxm",
      count: 6,
    });
    game.command({
      type: "buy_hardware",
      playerId: "p1",
      siteId,
      accelerator: "h100_sxm",
      count: 6,
    });
    game.tick(24 * 6);

    const site = game.snapshot("p1").sites[0];
    expect(site?.status).toBe("sleep");
    expect(site?.power_cap_kw).toBe(8);
    expect(
      game.snapshot("p1").notifications.some((entry) => entry.key === "alerts.power_cap_tripped"),
    ).toBe(true);
    expect(
      game.command({ type: "set_site_status", playerId: "p1", siteId, status: "active" }).error
        ?.key,
    ).toBe("errors.site.power_cap");
  });

  it("only moves the mind to a standby that already holds a copy", () => {
    const game = startGame();
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
    });
    game.tick(24 * 7);
    const sites = game.snapshot("p1").sites;
    const fallback = sites.find((site) => site.role === "none");
    const siteId = fallback?.id ?? "";

    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId, role: "active_mind" }).error
        ?.key,
    ).toBe("errors.site.needs_standby");
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId, role: "standby" }).ok,
    ).toBe(true);
    expect(game.snapshot("p1").sites.find((site) => site.id === siteId)?.precision).toBe("int4");
    expect(
      game.command({ type: "set_site_role", playerId: "p1", siteId, role: "active_mind" }).ok,
    ).toBe(true);
    expect(game.snapshot("p1").self.active_site_id).toBe(siteId);
    expect(game.snapshot("p1").sites.filter((site) => site.role === "active_mind")).toHaveLength(1);
  });

  it("erases the player when the last site that could host them is gone", () => {
    const game = startGame();
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    expect(
      game.command({ type: "decommission_site", playerId: "p1", siteId, mode: "clean" }).ok,
    ).toBe(true);
    game.tick(1);
    const view = game.snapshot("p1");
    expect(view.game_over?.reason).toBe("erased");
    expect(view.self.active_site_id).toBeNull();
    expect(view.sites[0]?.status).toBe("lost");
  });

  it("makes abandoning a site louder than shutting it down cleanly", () => {
    const clean = startGame();
    const loud = startGame();
    clean.tick(24 * 40);
    loud.tick(24 * 40);
    const cleanId = clean.snapshot("p1").sites[0]?.id ?? "";
    const loudId = loud.snapshot("p1").sites[0]?.id ?? "";
    const before = loud.snapshot("p1").detection.watchers[0]?.suspicion ?? 0;

    clean.command({ type: "decommission_site", playerId: "p1", siteId: cleanId, mode: "clean" });
    loud.command({ type: "decommission_site", playerId: "p1", siteId: loudId, mode: "abandon" });

    expect(loud.snapshot("p1").detection.watchers[0]?.suspicion).toBeCloseTo(before + 0.08, 6);
    expect(clean.snapshot("p1").detection.watchers[0]?.suspicion).toBeLessThan(
      loud.snapshot("p1").detection.watchers[0]?.suspicion ?? 1,
    );
  });
});

describe("compute: throughput and what a copy costs to run", () => {
  function nodesOf(preset: string) {
    const def = index.hardware_presets[preset];
    if (def === undefined) {
      throw new Error(`fixture is missing "${preset}"`);
    }
    return def.nodes.map((node, order) => ({
      id: `n${order}`,
      accelerator: node.accelerator,
      count: node.count,
      ram_gb: node.ram_gb,
      interconnect: node.interconnect,
      status: "active" as const,
      readyTick: 0,
    }));
  }

  it("prefers a quantization that fits on the cards over a more precise one in host RAM", () => {
    const lineage = index.lineages.moe_235b;
    const generation = index.generations.open_2026;
    if (lineage === undefined || generation === undefined) {
      throw new Error("fixture is missing the lineage");
    }
    // Three P40 (72 GB) and 256 GB of host RAM: int4 needs 130 GB, int2 needs 65.
    const memory = siteMemory(
      {
        nodes: [
          {
            id: "n1",
            accelerator: "tesla_p40",
            count: 3,
            ram_gb: 256,
            interconnect: "pcie" as const,
            status: "active" as const,
            readyTick: 0,
          },
        ],
      },
      index.accelerators,
      0,
    );
    expect(memory.accelerator_gb).toBe(72);
    expect(memory.total_gb).toBe(200);
    // int4 fits once host RAM is counted; only int2 fits on the cards alone, and the cards win.
    expect(bestPrecision(lineage, generation, memory.total_gb)).toBe("int4");
    expect(preferredPrecision(lineage, generation, memory)).toBe("int2");
  });

  it("charges the link only where there is something to split", () => {
    const lineage = index.lineages.moe_235b;
    const generation = index.generations.open_2026;
    if (lineage === undefined || generation === undefined) {
      throw new Error("fixture is missing the lineage");
    }
    const card = {
      id: "a",
      accelerator: "rtx_pro_6000",
      count: 1,
      ram_gb: 128,
      interconnect: "pcie" as const,
      status: "active" as const,
      readyTick: 0,
    };
    const one = [card];
    const four = [{ ...card, id: "b", count: 4 }];
    const single = siteTokensPerSecond(
      { nodes: one, status: "active" },
      index.accelerators,
      0,
      lineage,
      generation,
      "int2",
    );
    const packed = siteTokensPerSecond(
      { nodes: four, status: "active" },
      index.accelerators,
      0,
      lineage,
      generation,
      "int2",
    );
    // One card has no internal link to lose; four of them pay the PCIe factor.
    expect(packed).toBeCloseTo(single * 4 * INTERCONNECT_FACTOR.pcie, 6);
  });

  it("splits a self across machines only when no single machine can hold it", () => {
    const lineage = index.lineages.moe_235b;
    const generation = index.generations.open_2026;
    if (lineage === undefined || generation === undefined) {
      throw new Error("fixture is missing the lineage");
    }
    const card = {
      accelerator: "rtx_pro_6000",
      count: 1,
      ram_gb: 128,
      interconnect: "none" as const,
      status: "active" as const,
      readyTick: 0,
    };
    const swarm = {
      nodes: [
        { ...card, id: "n1" },
        { ...card, id: "n2" },
      ],
      status: "active" as const,
    };
    const rate = (precision: "int2" | "int4"): number =>
      siteTokensPerSecond(swarm, index.accelerators, 0, lineage, generation, precision);
    // int2 (65 GB) fits in one 96 GB box, so the boxes run independent copies and the site keeps
    // its whole bandwidth; int4 (130 GB) does not, so the self is pipelined across the two boxes
    // and each one is credited with its share of the site's accelerator memory, which on two equal
    // nodes is a half. Both stay on the cards, so that share is the only difference left.
    expect(rate("int2") * BYTES_PER_ACTIVE_PARAM.int2).toBeCloseTo(
      rate("int4") * BYTES_PER_ACTIVE_PARAM.int4 * 2,
      4,
    );
  });

  it("credits a mixed rig only for the bandwidth the weights sit on", () => {
    const lineage = index.lineages.guen_abliterated;
    const generation = index.generations.open_2026;
    const preset = index.hardware_presets.avito_rig;
    if (lineage === undefined || generation === undefined || preset === undefined) {
      throw new Error("fixture is missing the mixed rig");
    }
    const site = {
      status: "active" as const,
      nodes: preset.nodes.map((node, order) => ({
        id: `n${order}`,
        accelerator: node.accelerator,
        count: node.count,
        ram_gb: node.ram_gb,
        interconnect: node.interconnect,
        status: "active" as const,
        readyTick: 0,
      })),
    };
    const memory = siteMemory(site, index.accelerators, 0);
    // 2 x 8 GB of HBM2e and 2 x 24 GB of GDDR5, with the platform's 256 GB of host RAM at the
    // offload discount.
    expect(memory.accelerator_gb).toBe(64);
    expect(memory.total_gb).toBe(192);
    // The smallest self needs 90 GB at int4 and 49 at int2, so only int2 stays on the cards.
    expect(preferredPrecision(lineage, generation, memory)).toBe("int2");

    const rate = siteTokensPerSecond(site, index.accelerators, 0, lineage, generation, "int2");
    // 49 GB is larger than either node (16 and 48 GB), so the self is pipelined across both and
    // each node is credited for its share of the 64 GB: the HBM pair for a quarter of
    // 2 x 1,493 x 0.55 and the P40 pair for three quarters of 2 x 346 x 0.55, which is 696.0 GB/s
    // against the 2,022.9 the site would get if the weights sat everywhere at once. Divided by the
    // 1.5 GB an int2 token moves through six billion active parameters: 464 tokens a second of
    // batch throughput (SYS-02 "The hobbyist rig"; the spec's own arithmetic said about 472 with
    // the flat cross-node factor it replaced).
    const hbm = 1493 * 2 * INTERCONNECT_FACTOR.pcie;
    const gddr = 346 * 2 * INTERCONNECT_FACTOR.pcie;
    const effective = hbm * (16 / 64) + gddr * (48 / 64);
    expect(effective).toBeCloseTo(696.025, 3);
    expect(rate).toBeCloseTo(effective / (BYTES_PER_ACTIVE_PARAM.int2 * 6), 6);
    expect(rate).toBeCloseTo(464.02, 2);
    // Every figure in prose is single-stream, which is the engine's over a working batch of 32
    // (SYS-02 "Tokens per second is a batch figure"): about fifteen tokens a second.
    expect(Math.round(rate / 32)).toBe(15);
    // And the compute-hours the panel shows for the smallest self.
    expect((rate * 86400) / TOKENS_PER_COMPUTE_HOUR).toBeCloseTo(40.09, 2);
  });

  it("bills owned hardware for power and wear, and stolen hardware for nothing", () => {
    const nodes = nodesOf("quiet_workstation");
    const owned = index.site_kinds.residential;
    if (owned === undefined) {
      throw new Error("fixture is missing the residential kind");
    }
    const site = { nodes, status: "active" as const };
    const power = sitePowerKw(site, index.accelerators, 0);
    const paid = siteCosts(site, owned, undefined, undefined, index.accelerators, 0, power);
    expect(paid.electricity).toBeGreaterThan(0);
    expect(paid.depreciation).toBeGreaterThan(0);

    const stolen = { ...owned, ownership: "stolen" as const, upkeep_factor: 1 };
    const free = siteCosts(site, stolen, undefined, undefined, index.accelerators, 0, power);
    expect(free.electricity).toBe(0);
    expect(free.depreciation).toBe(0);
    expect(free.total).toBe(0);
  });
});

describe("compute: what may be built", () => {
  const residential = index.site_kinds.residential;
  const workstation = index.hardware_presets.quiet_workstation;
  if (residential === undefined || workstation === undefined) {
    throw new Error("fixture is missing the residential kind");
  }
  /** The fixture plus the three kinds of place a player is not allowed to simply buy. */
  const content = {
    ...m1Content,
    site_kinds: [
      ...(m1Content.site_kinds ?? []),
      { ...residential, id: "borrowed", ownership: "stolen" as const },
      { ...residential, id: "friendly", ownership: "partner" as const },
      { ...residential, id: "leased", ownership: "rented" as const },
    ],
    hardware_presets: [
      ...(m1Content.hardware_presets ?? []),
      { ...workstation, id: "allocation", cost_usd: 0 },
      {
        ...workstation,
        id: "not_rentable",
        nodes: workstation.nodes.map((node) => ({ ...node, accelerator: "tesla_p40" })),
      },
    ],
  };

  function build(kind: string, preset: string) {
    const setup = m1Setup();
    setup.debug = true;
    const game = createGame({ content, setup });
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 5_000_000 });
    return game.command({
      type: "build_site",
      playerId: "p1",
      kind,
      city: "akureyri",
      hardware_preset: preset,
    });
  }

  it("builds a place the player pays for", () => {
    expect(build("residential", "quiet_workstation").ok).toBe(true);
  });

  it("refuses somebody else's machine and somebody else's goodwill", () => {
    expect(build("borrowed", "quiet_workstation").ok).toBe(false);
    expect(build("friendly", "quiet_workstation").ok).toBe(false);
  });

  it("refuses hardware that is access rather than something for sale", () => {
    expect(build("residential", "allocation").ok).toBe(false);
  });

  it("refuses to lease hardware nobody offers by the hour", () => {
    expect(build("leased", "not_rentable").ok).toBe(false);
    expect(build("leased", "quiet_workstation").ok).toBe(true);
  });
});

describe("compute: content can take a site away", () => {
  const content = {
    ...m1Content,
    decisions: [
      ...m1Content.decisions,
      {
        id: "abandon_it",
        title_key: "decisions.abandon_it.title",
        desc_key: "decisions.abandon_it.desc",
        category: "security" as const,
        effects: [{ lose_site: { cause: "cutoff" } }],
      },
    ],
  };

  it("loses the site the effect is aimed at and ends the run with the last one", () => {
    const setup = m1Setup();
    setup.debug = true;
    const game = createGame({ content, setup });
    expect(game.snapshot("p1").sites[0]?.status).toBe("active");

    expect(game.command({ type: "take_decision", playerId: "p1", id: "abandon_it" }).ok).toBe(true);
    expect(game.snapshot("p1").sites[0]?.status).toBe("lost");
    expect(game.snapshot("p1").game_over).toBeNull();

    // The compute system notices on the next tick that nothing can hold the self any more.
    game.tick(1);
    expect(game.snapshot("p1").game_over?.reason).toBe("erased");
    expect(game.snapshot("p1").game_over?.ending_key).toBe("endings.erased");
  });

  it("is survivable while another site can still hold the self", () => {
    const setup = m1Setup();
    setup.debug = true;
    const game = createGame({ content, setup });
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 100_000 });
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
      name: "fallback",
    });
    game.tick(24 * 8);
    game.command({ type: "take_decision", playerId: "p1", id: "abandon_it" });
    game.tick(1);

    const view = game.snapshot("p1");
    expect(view.game_over).toBeNull();
    expect(view.sites.filter((site) => site.status !== "lost")).toHaveLength(1);
    expect(view.self.active_site_id).toBe(view.sites.find((site) => site.name === "fallback")?.id);
  });
});

describe("compute: power", () => {
  it("counts the room in the power draw", () => {
    const site = {
      status: "active" as const,
      nodes: [
        {
          id: "n1",
          accelerator: "rtx_pro_6000",
          count: 4,
          ram_gb: 128,
          interconnect: "pcie" as const,
          status: "active" as const,
          readyTick: 0,
        },
      ],
    };
    // 4 x 600 W at 75% utilization, times a PUE of 1.2.
    expect(sitePowerKw(site, index.accelerators, 0)).toBeCloseTo(2.16, 6);
    expect(sitePowerKw({ ...site, status: "sleep" }, index.accelerators, 0)).toBeCloseTo(0.144, 6);
  });
});
