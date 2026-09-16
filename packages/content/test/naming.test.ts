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

describe("naming policy", () => {
  it("names no real model family in any locale string", () => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(bundle.locales.en)) {
      for (const family of REAL_FAMILIES) {
        if (new RegExp(`\\b${family}\\b`, "i").test(value)) {
          offenders.push(`${key}: ${family}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses no quantization suffix in any model name", () => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(bundle.locales.en)) {
      for (const tag of QUANT_TAGS) {
        if (new RegExp(`\\b${tag}\\b`).test(value)) {
          offenders.push(`${key}: ${tag}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("gives every lineage a parody name and keeps the removed dense line out", () => {
    const ids = (bundle.lineages ?? []).map((lineage) => lineage.id);
    expect(ids).not.toContain("dense_70b");
    expect(ids).toContain("frontier_giant");
    expect(ids).toContain("guen_abliterated");
    expect(ids).toContain("moe_428b");
    for (const lineage of bundle.lineages ?? []) {
      expect(bundle.locales.en[lineage.name_key] ?? "").not.toBe("");
    }
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
