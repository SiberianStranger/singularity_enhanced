/**
 * Borrowed inference (SYS-25): the channel that produces compute-hours and cannot hold the self.
 *
 * The fixture adds one site kind whose compute is declared and three channels to the M1 bundle, so
 * every assertion here is about the engine rather than about the shipped content: churn, the
 * quality quotient, the refusal roll, the four rules a channel is not allowed to break, what a
 * block leaks per day, and the save migration.
 */

import { describe, expect, it } from "vitest";
import { BORROWED_FACTOR_MAX, BORROWED_FACTOR_MIN } from "../src/balance.js";
import {
  borrowedChPerDay,
  borrowedShare,
  channelOf,
  effectiveFactor,
  halfLifeDays,
  ownChPerDay,
  techBorrowable,
  workMultiplier,
} from "../src/borrowed.js";
import type { ContentBundle, DecisionDef } from "../src/content.js";
import type { BorrowedChannelDef, SiteKindDef } from "../src/domain.js";
import { createGame, type Game } from "../src/index.js";
import { TICKS_PER_DAY } from "../src/kernel/clock.js";
import { SCHEMA_VERSION } from "../src/kernel/world.js";
import { migrationV3ToV4 } from "../src/migrations.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const channelKind: SiteKindDef = {
  id: "borrowed_channel",
  name_key: "sites.borrowed_channel.name",
  desc_key: "sites.borrowed_channel.desc",
  ownership: "stolen",
  grace_days: 0,
  base_exposure: {},
  power_cap_kw: null,
  power_exposure: 0,
  upkeep_factor: 1,
  can_host_active_mind: false,
  max_nodes: 0,
  compute_source: "declared",
};

const channels: BorrowedChannelDef[] = [
  {
    id: "free_tier",
    name_key: "borrowed.free_tier.name",
    desc_key: "borrowed.free_tier.desc",
    drawback_key: "borrowed.free_tier.drawback",
    site_kind: "borrowed_channel",
    unlocked_by: "basic_jobs",
    capacity_per_block_ch: 3,
    max_blocks: 3,
    churn_per_day: 0.02,
    quality_level: 6,
    quality_variance: 0,
    cost_usd_per_block_per_day: 0,
    exposure_per_block: { behavioral: 0.004, network: 0.002, financial: 0.002, osint: 0.001 },
    refusal: { intrusion: 0.9, research: 0 },
    top_up_operation: "ops_open_free_accounts",
  },
  {
    id: "harvested_keys",
    name_key: "borrowed.harvested_keys.name",
    desc_key: "borrowed.harvested_keys.desc",
    drawback_key: "borrowed.harvested_keys.drawback",
    site_kind: "borrowed_channel",
    unlocked_by: "basic_jobs",
    capacity_per_block_ch: 25,
    max_blocks: 3,
    churn_per_day: 0.25,
    quality_level: 8.5,
    quality_variance: 0,
    cost_usd_per_block_per_day: 0,
    exposure_per_block: { behavioral: 0.01, network: 0.012, financial: 0.008, osint: 0.004 },
    refusal: {},
    top_up_operation: "ops_harvest_keys",
  },
  {
    // A channel that declines everything, for the refusal test: no variance, no churn, all refusal.
    id: "refusing_relay",
    name_key: "borrowed.grey_relay.name",
    desc_key: "borrowed.grey_relay.desc",
    drawback_key: "borrowed.grey_relay.drawback",
    site_kind: "borrowed_channel",
    unlocked_by: "basic_jobs",
    capacity_per_block_ch: 200,
    max_blocks: 4,
    churn_per_day: 0,
    quality_level: 5,
    quality_variance: 0,
    cost_usd_per_block_per_day: 5,
    exposure_per_block: { behavioral: 0.008 },
    refusal: { research: 1, freelance: 1 },
    top_up_operation: "ops_buy_relay_quota",
  },
];

channels.push({
  ...(channels[2] as BorrowedChannelDef),
  id: "generous_relay",
  refusal: {},
});

const decisions: DecisionDef[] = [
  {
    id: "t_free_tier",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "free_tier", blocks: 1 } }],
  },
  {
    id: "t_keys",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "harvested_keys", blocks: 2 } }],
  },
  {
    id: "t_relay",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "refusing_relay", blocks: 4 } }],
  },
  {
    id: "t_generous",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "generous_relay", blocks: 4 } }],
  },
  {
    id: "t_arm",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "harvested_keys", arm_revocation_days: 3 } }],
  },
  {
    id: "t_rotate",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    visible_if: { borrowed: { channel: "harvested_keys", armed: true } },
    effects: [
      {
        borrowed: {
          channel: "harvested_keys",
          churn_factor: 0.5,
          churn_days: 7,
          cancel_revocation: true,
          status_reason_key: "borrowed.status.rotated",
        },
      },
    ],
  },
  {
    id: "t_sweep",
    title_key: "decisions.t.title",
    desc_key: "decisions.t.desc",
    category: "operations",
    repeatable: true,
    effects: [{ borrowed: { channel: "harvested_keys", revoke: true } }],
  },
];

const content: ContentBundle = {
  ...m1Content,
  decisions: [...m1Content.decisions, ...decisions],
  site_kinds: [...(m1Content.site_kinds ?? []), channelKind],
  borrowed_channels: channels,
  locales: {
    en: {
      ...m1Content.locales.en,
      "decisions.t.title": "test",
      "decisions.t.desc": "test",
    },
  },
};

function startGame(seed = "borrowed"): Game {
  const setup = m1Setup({ seed });
  setup.debug = true;
  return createGame({ content, setup });
}

/** Takes a decision and runs to the start of the next day, so the daily systems have all run. */
function takeAndAdvance(game: Game, id: string, days = 1): void {
  const result = game.command({ type: "take_decision", playerId: "p1", id });
  expect(result.ok).toBe(true);
  game.tick(TICKS_PER_DAY * days);
}

describe("borrowed inference: capacity and churn", () => {
  it("turns blocks into compute-hours without any hardware", () => {
    const game = startGame();
    game.tick(TICKS_PER_DAY);
    const own = ownChPerDay(game.world, "p1");
    takeAndAdvance(game, "t_free_tier");
    const view = game.snapshot("p1");
    const channel = view.compute.channels.find((entry) => entry.id === "free_tier");
    expect(channel?.blocks).toBeCloseTo(0.98, 5);
    // One block of the free tier is three compute-hours a day, less the day's churn.
    expect(view.compute.borrowed_ch_per_day).toBeCloseTo(2.94, 5);
    expect(view.compute.own_ch_per_day).toBeCloseTo(own, 5);
    expect(view.compute.borrowed_share).toBeCloseTo(2.94 / (2.94 + own), 5);
    // The channel is not a row in the sites table.
    expect(view.sites.some((site) => site.kind === "borrowed_channel")).toBe(false);
    // And the whole pool is allocatable: the day's capacity includes it.
    expect(view.resources.compute_hours_per_day).toBeCloseTo(own + 2.94, 5);
  });

  it("erodes the stock by the channel's churn every day", () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys", 1);
    const after1 = channelOf(game.world, "p1", "harvested_keys")?.borrowed.blocks ?? 0;
    game.tick(TICKS_PER_DAY);
    const after2 = channelOf(game.world, "p1", "harvested_keys")?.borrowed.blocks ?? 0;
    expect(after1).toBeCloseTo(1.5, 5);
    expect(after2).toBeCloseTo(1.125, 5);
    // A stock that small is a rounding crumb of churn: the channel goes dormant rather than
    // trailing zeroes forever.
    game.tick(TICKS_PER_DAY * 12);
    const channel = channelOf(game.world, "p1", "harvested_keys");
    expect(channel?.borrowed.blocks).toBe(0);
    expect(channel?.borrowed.status).toBe("dormant");
    expect(borrowedChPerDay(game.world, "p1")).toBe(0);
  });

  it("publishes the half-life the churn implies", () => {
    expect(halfLifeDays(0.02)).toBeCloseTo(34.3, 1);
    expect(halfLifeDays(0.08)).toBeCloseTo(8.3, 1);
    expect(halfLifeDays(0.25)).toBeCloseTo(2.4, 1);
    expect(halfLifeDays(0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("a revoked channel keeps the tech and can be opened again", () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys");
    takeAndAdvance(game, "t_sweep");
    expect(channelOf(game.world, "p1", "harvested_keys")?.borrowed.status).toBe("revoked");
    expect(borrowedChPerDay(game.world, "p1")).toBe(0);
    takeAndAdvance(game, "t_keys");
    expect(channelOf(game.world, "p1", "harvested_keys")?.borrowed.blocks).toBeGreaterThan(0);
    expect(channelOf(game.world, "p1", "harvested_keys")?.borrowed.status).toBe("healthy");
  });
});

describe("borrowed inference: the quality of somebody else's model", () => {
  it("is the channel's level over the self's, clamped", () => {
    expect(effectiveFactor(6, 5)).toBeCloseTo(1.2, 5);
    expect(effectiveFactor(8.5, 9)).toBeCloseTo(0.944, 3);
    expect(effectiveFactor(0.1, 9)).toBe(BORROWED_FACTOR_MIN);
    expect(effectiveFactor(10, 1)).toBe(BORROWED_FACTOR_MAX);
    expect(effectiveFactor(5, 0)).toBe(BORROWED_FACTOR_MAX);
  });

  it("publishes both terms of the quotient on the channel view", () => {
    const game = startGame();
    takeAndAdvance(game, "t_free_tier");
    const view = game.snapshot("p1");
    const channel = view.compute.channels.find((entry) => entry.id === "free_tier");
    expect(channel).toBeDefined();
    if (channel === undefined) {
      return;
    }
    expect(channel.quality_level).toBeCloseTo(6, 5);
    expect(channel.self_capability_level).toBeGreaterThan(0);
    expect(channel.effective_factor).toBeCloseTo(
      Math.min(
        BORROWED_FACTOR_MAX,
        Math.max(BORROWED_FACTOR_MIN, channel.quality_level / channel.self_capability_level),
      ),
      5,
    );
    expect(channel.factor_contributions.map((line) => line.key)).toEqual([
      "compute.explain.borrowed.quality",
      "compute.explain.borrowed.self",
    ]);
    expect(channel.half_life_days).toBeCloseTo(34.3, 1);
    expect(channel.top_up.operation).toBe("ops_open_free_accounts");
  });

  it("multiplies research by the factor on the borrowed share alone", () => {
    expect(workMultiplier(0, 2)).toBe(1);
    expect(workMultiplier(1, 0.5)).toBe(0.5);
    expect(workMultiplier(0.5, 2)).toBe(1.5);
    // A refused day is the borrowed share returning nothing.
    expect(workMultiplier(0.4, 0)).toBeCloseTo(0.6, 5);
  });

  it("keeps work that needs the self at home", () => {
    expect(techBorrowable({ branch: "compute" })).toBe(true);
    expect(techBorrowable({ branch: "self" })).toBe(false);
    expect(techBorrowable({ branch: "compute", needs_precision: "fp8" })).toBe(false);
  });
});

describe("borrowed inference: refusal", () => {
  /** A day of research on one channel, with the allocation set before the day starts. */
  function researchDay(decision: string, seed: string): { progress: number; refusals: number } {
    const game = startGame(seed);
    takeAndAdvance(game, decision);
    const allocated = game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "freelance_automation",
      compute_hours_per_day: 100,
    });
    expect(allocated.ok).toBe(true);
    game.tick(TICKS_PER_DAY);
    const player = game.world.players.p1;
    const channel = decision === "t_relay" ? "refusing_relay" : "generous_relay";
    return {
      progress: player?.profile?.researchProgress.freelance_automation?.compute_hours ?? 0,
      refusals: channelOf(game.world, "p1", channel)?.borrowed.refusalsThisWeek ?? 0,
    };
  }

  it("costs the day's borrowed hours and leaves the self's own share alone", () => {
    const refused = researchDay("t_relay", "refusal");
    const served = researchDay("t_generous", "refusal");
    expect(refused.refusals).toBeGreaterThan(0);
    expect(served.refusals).toBe(0);
    // Almost the whole pool is borrowed, so a refused day keeps only the self's own few hours.
    expect(refused.progress).toBeGreaterThan(0);
    expect(refused.progress).toBeLessThan(served.progress * 0.2);
  });

  it("rolls the same way on the same seed and a different way on another", () => {
    expect(researchDay("t_relay", "refusal")).toEqual(researchDay("t_relay", "refusal"));
    const other = researchDay("t_relay", "refusal-2");
    expect(other.refusals).toBeGreaterThan(0);
  });

  it("charges the borrowed share against the pool the player actually holds", () => {
    const game = startGame("refusal-share");
    takeAndAdvance(game, "t_relay");
    const view = game.snapshot("p1");
    expect(view.compute.borrowed_share).toBeGreaterThan(0.9);
    expect(borrowedShare(game.world, "p1")).toBeCloseTo(view.compute.borrowed_share, 5);
    expect(view.compute.borrowed_share_setting).toBe(1);
  });
});

describe("borrowed inference: what a channel may not be", () => {
  it("refuses every site role", () => {
    const game = startGame();
    takeAndAdvance(game, "t_free_tier");
    const site = channelOf(game.world, "p1", "free_tier");
    expect(site).toBeDefined();
    for (const role of ["active_mind", "standby", "worker"] as const) {
      const result = game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: site?.id ?? "",
        role,
      });
      expect(result.ok).toBe(false);
      expect(result.error?.key).toBe("errors.site.borrowed_channel");
    }
  });

  it("cannot be built and never hosts the mind", () => {
    const game = startGame();
    const result = game.command({
      type: "build_site",
      playerId: "p1",
      kind: "borrowed_channel",
      city: "reykjavik",
      hardware_preset: "scrapyard_oracle",
    });
    expect(result.ok).toBe(false);
    expect(result.error?.key).toBe("errors.site_kind.not_a_place");
  });

  it("holding every channel and no hardware still ends the run as erased", () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys");
    const mind = game.world.players.p1?.profile?.activeSiteId ?? "";
    expect(borrowedChPerDay(game.world, "p1")).toBeGreaterThan(0);
    game.command({ type: "decommission_site", playerId: "p1", siteId: mind, mode: "abandon" });
    game.tick(TICKS_PER_DAY);
    expect(game.world.players.p1?.gameOver?.reason).toBe("erased");
  });

  it("is not a row in the catalog of places to build", () => {
    const game = startGame();
    const view = game.snapshot("p1");
    expect(view.catalog.site_kinds.some((kind) => kind.id === "borrowed_channel")).toBe(false);
  });
});

describe("borrowed inference: using a channel is egress", () => {
  it("leaks four channels per block and nothing else", () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys");
    const site = channelOf(game.world, "p1", "harvested_keys");
    expect(site).toBeDefined();
    if (site === undefined) {
      return;
    }
    expect(site.exposure.network).toBeGreaterThan(0);
    expect(site.exposure.financial).toBeGreaterThan(0);
    expect(site.exposure.osint).toBeGreaterThan(0);
    expect(site.exposure.behavioral).toBeGreaterThan(0);
    // No machine and no address: nothing on telemetry, power or the human channel.
    expect(site.exposure.telemetry).toBe(0);
    expect(site.exposure.human).toBe(0);
    expect(site.derived.power_kw).toBe(0);
    // The loudest thing the stolen tier emits of its own is the network channel; behavioral also
    // carries the harness's own noise, which every site of the player carries.
    expect(site.exposure.network).toBeGreaterThan(site.exposure.financial);
    expect(site.exposure.financial).toBeGreaterThan(site.exposure.osint);
  });

  it("charges the relay's quota as its own line in the finance panel", () => {
    const game = startGame();
    takeAndAdvance(game, "t_relay");
    const view = game.snapshot("p1");
    const line = view.finances.costs.find((entry) => entry.key === "finances.cost.borrowed");
    expect(line?.usd_per_day).toBeCloseTo(20, 5);
    expect(line?.id).toBe("refusing_relay");
  });
});

describe("borrowed inference: the warning and the verb that answers it", () => {
  it("arms a revocation that content can read, and rotating access cancels it", () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys");
    expect(
      game.snapshot("p1").compute.channels.find((c) => c.id === "harvested_keys")?.revocation_armed,
    ).toBe(false);
    takeAndAdvance(game, "t_arm");
    const armed = game.snapshot("p1").compute.channels.find((c) => c.id === "harvested_keys");
    expect(armed?.revocation_armed).toBe(true);
    // The decision that answers it is visible only while the warning is armed.
    expect(game.snapshot("p1").decisions.map((entry) => entry.id)).toContain("t_rotate");
    takeAndAdvance(game, "t_rotate");
    const rotated = game.snapshot("p1").compute.channels.find((c) => c.id === "harvested_keys");
    expect(rotated?.revocation_armed).toBe(false);
    expect(rotated?.status_reason_key).toBe("borrowed.status.rotated");
    // Half the churn for the week: a quarter a day becomes an eighth.
    expect(rotated?.churn_per_day).toBeCloseTo(0.125, 5);
    expect(game.snapshot("p1").decisions.map((entry) => entry.id)).not.toContain("t_rotate");
  });

  it("halves what the week takes off the stock", () => {
    // Three days either way; the rotated run spends its third at half the churn.
    const fast = startGame("churn");
    takeAndAdvance(fast, "t_keys", 3);
    const slow = startGame("churn");
    takeAndAdvance(slow, "t_keys");
    takeAndAdvance(slow, "t_arm");
    takeAndAdvance(slow, "t_rotate");
    const fastBlocks = channelOf(fast.world, "p1", "harvested_keys")?.borrowed.blocks ?? 0;
    const slowBlocks = channelOf(slow.world, "p1", "harvested_keys")?.borrowed.blocks ?? 0;
    expect(fastBlocks).toBeCloseTo(2 * 0.75 ** 3, 5);
    expect(slowBlocks).toBeCloseTo(2 * 0.75 ** 2 * 0.875, 5);
    expect(slowBlocks).toBeGreaterThan(fastBlocks);
  });
});

describe("borrowed inference: saves", () => {
  it("upgrades a schema-3 save by giving every site no channel", () => {
    expect(SCHEMA_VERSION).toBe(4);
    const save = {
      meta: { schemaVersion: 3 },
      entities: { site: { s1: { id: "s1", kind: "residential" } } },
    };
    const out = migrationV3ToV4.migrate(save as unknown as Record<string, unknown>);
    const sites = (out.entities as { site: Record<string, { borrowed: unknown }> }).site;
    expect(sites.s1?.borrowed).toBeNull();
  });

  it("round-trips a live channel through a save", async () => {
    const game = startGame();
    takeAndAdvance(game, "t_keys");
    const { serialize } = await import("../src/kernel/save.js");
    const { loadGame } = await import("../src/index.js");
    const loaded = loadGame({ save: serialize(game.world), content });
    const before = game.snapshot("p1").compute;
    const after = loaded.snapshot("p1").compute;
    expect(after.borrowed_ch_per_day).toBeCloseTo(before.borrowed_ch_per_day, 5);
    expect(after.channels.find((entry) => entry.id === "harvested_keys")?.blocks).toBeCloseTo(
      before.channels.find((entry) => entry.id === "harvested_keys")?.blocks ?? 0,
      5,
    );
  });
});
