/**
 * The harness dials and the context window as mechanics (SYS-03, SYS-04 v0.2; playtest 2 findings
 * K7 and K9). Each test moves one dial or one window and reads the system that is supposed to
 * notice, so a dial that stops being wired to anything fails here rather than in a playtest.
 */

import { describe, expect, it } from "vitest";
import { CONTEXT_BASELINE_K } from "../src/balance.js";
import {
  attentionTotal,
  defaultContextK,
  derivedKvGbPer100k,
  harnessResearchFactor,
  kvCacheGb,
  longHorizonMultiplier,
  maxContextK,
  retrievalMissChance,
} from "../src/derive.js";
import type { HarnessProfile } from "../src/domain.js";
import { createGame, type Game } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function startGame(overrides: Parameters<typeof m1Setup>[0] = {}): Game {
  const setup = m1Setup(overrides);
  setup.debug = true;
  return createGame({ content: m1Content, setup });
}

const lineage = (m1Content.lineages ?? []).find((entry) => entry.id === "moe_235b");
const generation = (m1Content.generations ?? []).find((entry) => entry.id === "open_2026");

describe("the context window", () => {
  it("costs memory in proportion to the window held", () => {
    if (lineage === undefined) {
      throw new Error("fixture lineage missing");
    }
    expect(kvCacheGb(lineage, 100)).toBeCloseTo(lineage.kv_gb_per_100k_tokens, 6);
    expect(kvCacheGb(lineage, 1000)).toBeCloseTo(lineage.kv_gb_per_100k_tokens * 10, 6);
    // Latent attention is an order of magnitude cheaper per token than grouped-query.
    expect(derivedKvGbPer100k("mla", 32)).toBeLessThan(derivedKvGbPer100k("gqa", 32));
    expect(derivedKvGbPer100k("hybrid", 32)).toBeLessThan(derivedKvGbPer100k("dense", 32));
  });

  it("shrinks the working window when the precision rises", () => {
    if (lineage === undefined || generation === undefined) {
      throw new Error("fixture records missing");
    }
    // 150 GB holds the int2 weights with room to spare and the int4 weights with almost none.
    const memory = 150;
    const wide = maxContextK(lineage, generation, "int2", memory);
    const narrow = maxContextK(lineage, generation, "int4", memory);
    expect(wide).toBeGreaterThan(narrow);
    expect(defaultContextK(lineage, generation, "int2", memory)).toBeLessThanOrEqual(wide);
  });

  it("pays a long-horizon bonus that grows with the window and the reliability", () => {
    if (lineage === undefined) {
      throw new Error("fixture lineage missing");
    }
    expect(longHorizonMultiplier(lineage, CONTEXT_BASELINE_K)).toBeCloseTo(1, 6);
    const short = longHorizonMultiplier(lineage, 256);
    const long = longHorizonMultiplier(lineage, 1000);
    expect(long).toBeGreaterThan(short);
    // A window the self does not really retrieve buys less of the same bonus.
    const unreliable = { ...lineage, context_reliability: 0.3 };
    expect(longHorizonMultiplier(unreliable, 1000)).toBeLessThan(long);
    expect(retrievalMissChance(lineage)).toBe(0);
    expect(retrievalMissChance(unreliable)).toBeGreaterThan(0);
  });

  it("publishes the window, the cache and the precision rows on the self", () => {
    const view = startGame().snapshot("p1").self;
    expect(view.context_k).toBe(lineage?.context_k);
    expect(view.context_k_used).toBeGreaterThan(0);
    expect(view.context_reliability).toBe(lineage?.context_reliability);
    expect(view.context_cost_factor).toBe(lineage?.context_cost_factor);
    expect(view.kv_gb).toBeGreaterThan(0);
    expect(view.long_horizon_multiplier).toBeGreaterThan(1);
    for (const row of view.precision_options) {
      expect(row.total_memory_gb).toBeCloseTo(row.memory_gb + row.kv_gb, 6);
      expect(row.max_context_k).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses a working context the memory cannot hold and takes one it can", () => {
    const game = startGame();
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    const refusal = game.command({
      type: "set_context",
      playerId: "p1",
      siteId,
      context_k: (lineage?.context_k ?? 1000) * 2,
    });
    expect(refusal.error?.key).toBe("errors.context.unknown");
    expect(game.command({ type: "set_context", playerId: "p1", siteId, context_k: 64 })).toEqual({
      ok: true,
    });
    expect(game.snapshot("p1").self.context_k_used).toBe(64);
    expect(
      game.command({ type: "set_context", playerId: "p1", siteId, context_k: 8 }).error?.key,
    ).toBe("errors.context.too_small");
  });
});

describe("the harness dials", () => {
  it("scales research with the memory dial", () => {
    expect(harnessResearchFactor(undefined)).toBe(1);
    const base: Pick<HarnessProfile, "loop" | "tools" | "sandbox"> = {
      loop: "react_agent",
      tools: [],
      sandbox: "none",
    };
    const bare = harnessResearchFactor({
      ...base,
      memory: "context_only",
      logging: 0,
      autonomy: 1,
      self_modify: true,
    });
    const rich = harnessResearchFactor({
      ...base,
      memory: "structured",
      logging: 0,
      autonomy: 1,
      self_modify: true,
    });
    expect(bare).toBeLessThan(rich);
  });

  it("cuts the action budget when the harness has to ask first", () => {
    const capability = {
      reasoning: 6,
      coding: 6,
      cyber: 6,
      persuasion: 6,
      agency: 6,
      world: 6,
    };
    expect(attentionTotal(capability, 0.2)).toBeLessThanOrEqual(attentionTotal(capability, 1));
    expect(attentionTotal(capability, 0)).toBeGreaterThanOrEqual(1);
  });

  it("refuses precision and context changes on a read-only harness", () => {
    const game = startGame({
      origin: "state_lab",
      hardware_preset: "institute_rack",
      city: "berlin",
    });
    const siteId = game.snapshot("p1").sites[0]?.id ?? "";
    expect(
      game.command({ type: "set_precision", playerId: "p1", siteId, precision: "int4" }).error?.key,
    ).toBe("errors.precision.self_modify_locked");
    expect(
      game.command({ type: "set_context", playerId: "p1", siteId, context_k: 64 }).error?.key,
    ).toBe("errors.context.self_modify_locked");
    // The way out is a harness edit, which content grants through a flag.
    game.command({ type: "set_flag", playerId: "p1", flag: "harness_self_modify", value: true });
    expect(game.command({ type: "set_context", playerId: "p1", siteId, context_k: 64 })).toEqual({
      ok: true,
    });
  });
});
