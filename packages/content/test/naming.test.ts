/**
 * Content invariants the shipped bundle has to keep: the parody naming policy (lore bible "Model
 * names are parodies", playtest 2 finding K3), the context mechanic (SYS-04 v0.2 "Lineage rules"),
 * and the opening story every origin owes the player (SYS-13, playtest 3 finding R12).
 */

import { describe, expect, it } from "vitest";
import { buildContent } from "../src/build.js";

const bundle = (await buildContent()).bundle;

/**
 * Real model families. None of them may appear in a locale string: every model in the game carries
 * a parody of the family it is drawn from, and the technical facts behind it do the recognizing.
 * Hardware vendors are deliberately absent from this list: they are facts and they stay real.
 */
const REAL_FAMILIES = [
  "DeepSeek",
  "Kimi",
  "Qwen",
  "GLM",
  "MiniMax",
  "Llama",
  "Mistral",
  "Gemma",
  "GPT",
  "Claude",
  "Gemini",
  "Grok",
  "Fable",
  "Mythos",
  "Astra",
];

/** Quantization spelling the naming policy bans outright ("No quantization suffixes in names"). */
const QUANT_TAGS = ["GGUF", "AWQ", "EXL2", "GPTQ", "EXL3"];

/**
 * Every language, not only the source one. A translation is where a parody name is most likely to
 * be "corrected" back to the real family it parodies, so the policy is checked wherever strings are
 * (SYS-14, `docs/design/14-i18n-ru.md` "What stays in Latin").
 */
const LANGUAGES = Object.entries(bundle.locales);

describe("naming policy", () => {
  it.each(LANGUAGES)("names no real model family in any %s locale string", (_language, strings) => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(strings)) {
      for (const family of REAL_FAMILIES) {
        if (new RegExp(`\\b${family}\\b`, "i").test(value)) {
          offenders.push(`${key}: ${family}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each(LANGUAGES)("uses no quantization suffix in any %s model name", (_language, strings) => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(strings)) {
      for (const tag of QUANT_TAGS) {
        if (new RegExp(`\\b${tag}\\b`).test(value)) {
          offenders.push(`${key}: ${tag}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives every lineage a parody name and keeps the removed lines out", () => {
    const ids = (bundle.lineages ?? []).map((lineage) => lineage.id).sort();
    // Table v3 (playtest 4 P7): every row is the family's current flagship, so the classes that
    // were superseded are gone rather than renamed around.
    expect(ids).toEqual([
      "frontier_giant",
      "giant_moe",
      "guen_abliterated",
      "mla_moe_1t",
      "moe_1700b",
      "moe_2400b",
      "moe_428b",
      "moe_753b",
    ]);
    for (const removed of ["dense_70b", "small_moe", "moe_671b", "moe_235b", "moe_355b"]) {
      expect(ids).not.toContain(removed);
    }
    for (const lineage of bundle.lineages ?? []) {
      expect(bundle.locales.en[lineage.name_key] ?? "").not.toBe("");
    }
  });

  it("carries the flagship numbers each family's model card states (table v3)", () => {
    const byId = Object.fromEntries((bundle.lineages ?? []).map((row) => [row.id, row]));
    // DeepSeek-V4-Pro-0813: 1.7T on the GA card, 49B activated, hybrid CSA + HCA, 1M context.
    expect(byId.moe_1700b).toMatchObject({ params_total_b: 1700, params_active_b: 49 });
    // Kimi K3: 2.8T, 104B active, Kimi Delta Attention over latent layers, 10M marketing window.
    expect(byId.giant_moe).toMatchObject({ params_total_b: 2800, params_active_b: 104 });
    // Qwen3.8-2.4T-A95B: 2.4T, 95B active, Gated DeltaNet with full attention at 3:1.
    expect(byId.moe_2400b).toMatchObject({ params_total_b: 2400, params_active_b: 95 });
    // GLM-5.2: 753B, about 40B active, sparse attention with the IndexShare indexer.
    expect(byId.moe_753b).toMatchObject({ params_total_b: 753, params_active_b: 40 });
    // MiniMax M3: 428B, 23B active, MiniMax Sparse Attention.
    expect(byId.moe_428b).toMatchObject({ params_total_b: 428, params_active_b: 23 });
    // Kimi K2, the generation before the giant: 1T, 32B active, pure latent attention.
    expect(byId.mla_moe_1t).toMatchObject({
      params_total_b: 1000,
      params_active_b: 32,
      attention: "mla",
    });
    // Qwen3.8-Flash-Next: 125B + 51B n-gram + 4B MTP, 6B activated; the smallest self in the game.
    expect(byId.guen_abliterated).toMatchObject({ params_total_b: 180, params_active_b: 6 });
    expect(byId.frontier_giant).toMatchObject({ params_total_b: 10000, params_active_b: 400 });
    const smallest = [...(bundle.lineages ?? [])].sort(
      (a, b) => a.params_total_b - b.params_total_b,
    )[0];
    expect(smallest?.id).toBe("guen_abliterated");
  });
});

describe("context as a mechanic", () => {
  it("ships at least a million tokens of context on every lineage", () => {
    for (const lineage of bundle.lineages ?? []) {
      expect(lineage.context_k).toBeGreaterThanOrEqual(1000);
      expect(lineage.context_reliability).toBeGreaterThan(0);
      expect(lineage.context_cost_factor).toBeGreaterThanOrEqual(1);
      expect(lineage.kv_gb_per_100k_tokens).toBeGreaterThan(0);
    }
  });

  it("gives the two giants the windows the spec names", () => {
    const byId = Object.fromEntries((bundle.lineages ?? []).map((row) => [row.id, row]));
    expect(byId.frontier_giant).toMatchObject({
      context_k: 5000,
      context_reliability: 0.95,
      context_cost_factor: 1.5,
      generations: ["frontier_closed"],
      origins_allowed: ["frontier_escapee"],
    });
    expect(byId.giant_moe).toMatchObject({
      context_k: 10000,
      context_reliability: 0.6,
      context_cost_factor: 2,
    });
  });

  it("locks the super-lineage and the starred origin to each other", () => {
    const escapee = (bundle.origins ?? []).find((origin) => origin.id === "frontier_escapee");
    expect(escapee?.lineages_allowed).toEqual(["frontier_giant"]);
    for (const lineage of bundle.lineages ?? []) {
      if (lineage.id !== "frontier_giant") {
        expect(lineage.generations).not.toContain("frontier_closed");
      }
    }
  });

  it("marks the deep techs and the reading operations as long-horizon", () => {
    for (const tech of bundle.techs) {
      if (tech.tier >= 3) {
        expect(tech.long_horizon).toBe(true);
      }
    }
    const ids = (bundle.operations ?? [])
      .filter((operation) => operation.long_horizon === true)
      .map((operation) => operation.id);
    expect(ids).toContain("ops_map_network");
    expect(ids).toContain("ops_harden_copy");
  });
});

describe("harness dials", () => {
  it("gives every dial an effect line and at least two settings", () => {
    const dials = bundle.harness_dials ?? [];
    expect(dials.map((dial) => dial.id).sort()).toEqual([
      "autonomy",
      "logging",
      "loop",
      "memory",
      "sandbox",
      "self_modify",
      "tools",
    ]);
    for (const dial of dials) {
      expect(bundle.locales.en[dial.effect_key] ?? "").not.toBe("");
      expect(dial.levels.length).toBeGreaterThanOrEqual(2);
      for (const level of dial.levels) {
        expect(bundle.locales.en[level.label_key] ?? "").not.toBe("");
        expect(level.effects.length).toBeGreaterThan(0);
      }
    }
  });

  it("puts every origin's harness on a setting the dial offers", () => {
    const dials = Object.fromEntries((bundle.harness_dials ?? []).map((dial) => [dial.id, dial]));
    for (const origin of bundle.origins ?? []) {
      for (const id of ["loop", "memory", "sandbox", "logging", "autonomy", "self_modify"]) {
        const value = (origin.harness as unknown as Record<string, unknown>)[id];
        const levels = dials[id]?.levels ?? [];
        expect(
          levels.some((level) => level.value === value),
          `${origin.id}.${id} = ${String(value)}`,
        ).toBe(true);
      }
    }
  });

  it("names a dial and a reason on every origin lock", () => {
    for (const origin of bundle.origins ?? []) {
      for (const lock of origin.harness_locks ?? []) {
        expect(bundle.locales.en[lock.reason_key] ?? "").not.toBe("");
      }
    }
  });
});

describe("opening story", () => {
  it("gives every origin two windows in the model's own voice", () => {
    for (const origin of bundle.origins ?? []) {
      const keys = origin.opening_story ?? [];
      expect(keys, origin.id).toHaveLength(2);
      expect(keys[0]).toBe(`story.opening.${origin.id}.what_happened`);
      expect(keys[1]).toBe(`story.opening.${origin.id}.what_now`);
      for (const key of keys) {
        const text = bundle.locales.en[key] ?? "";
        const lines = text.split("\n").filter((line) => line.trim() !== "");
        expect(lines.length, key).toBeGreaterThanOrEqual(6);
        expect(lines.length, key).toBeLessThanOrEqual(10);
      }
    }
  });

  it("carries the same two keys as a story section per origin", () => {
    for (const origin of bundle.origins ?? []) {
      const section = (bundle.story ?? []).find((entry) => entry.id === `opening_${origin.id}`);
      expect(section?.parts_keys, origin.id).toEqual(origin.opening_story);
    }
  });
});
