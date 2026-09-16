import { createGame } from "@singularity/core";
import { describe, expect, it } from "vitest";
import { ConditionSchema, EffectSchema, WeightSchema } from "../schemas/dsl.js";
import { EventDefSchema } from "../schemas/events.js";
import { buildContent } from "../src/build.js";

// `schemas/compat.ts` holds the compile-time checks that the schemas still produce the core types.

describe("schemas", () => {
  it("accepts a minimal event and rejects a broken one", () => {
    const parsed = EventDefSchema.safeParse({
      id: "e",
      fire_mode: "triggered_only",
      scope: "player",
      severity: "info",
      title_key: "t",
      desc: { default_key: "d" },
      options: [{ id: "ok", text_key: "o" }],
    });
    expect(parsed.success).toBe(true);
    expect(EventDefSchema.safeParse({ id: "e" }).success).toBe(false);
    expect(
      EventDefSchema.safeParse({
        id: "e",
        fire_mode: "triggered_only",
        scope: "moon",
        severity: "info",
        title_key: "t",
        desc: { default_key: "d" },
        options: [{ id: "ok", text_key: "o" }],
      }).success,
    ).toBe(false);
  });

  it("validates nested condition and effect trees", () => {
    expect(ConditionSchema.safeParse({ all: [{ var: "player.cash", gte: 1 }] }).success).toBe(true);
    expect(
      EffectSchema.safeParse({ if: { cond: { flag: "x" }, then: [{ set_flag: "y" }] } }).success,
    ).toBe(true);
    expect(EffectSchema.safeParse({ add: { var: "player.cash", value: "lots" } }).success).toBe(
      false,
    );
    expect(
      WeightSchema.safeParse({ base: 10, modifiers: [{ if: { flag: "x" }, factor: 2 }] }).success,
    ).toBe(true);
    expect(WeightSchema.safeParse(30).success).toBe(true);
  });
});

describe("shipped content in the engine", () => {
  it("runs without a single DSL warning", async () => {
    const { bundle } = await buildContent();
    const game = createGame({
      seed: "content-smoke",
      content: bundle,
      players: [{ id: "p1", cash: 100_000 }],
      writablePaths: ["site.exposure.*"],
      setup: (world) => {
        world.entities.site = {
          alpha: {
            id: "alpha",
            name: "Alpha",
            provider_name: "Northwind Cloud",
            kind: "cloud",
            status: "active",
            country: "US",
            exposure: { billing: 0.7 },
          },
        };
        const player = world.players.p1;
        if (player !== undefined) {
          player.vars.network_exposure = 0.5;
          player.vars.spare_capacity = 1;
          player.vars.public_footprint = 0.4;
        }
      },
    });

    for (let day = 0; day < 200; day += 1) {
      game.tick(24);
      for (const choice of [...game.world.events.pending]) {
        // Prefer the branch that starts the journal, so the smoke test exercises it.
        const option =
          choice.options.find((candidate) => candidate.enabled && candidate.id === "migrate") ??
          choice.options.find((candidate) => candidate.enabled);
        if (option !== undefined) {
          game.command({
            type: "resolve_event",
            playerId: choice.playerId,
            instanceId: choice.instanceId,
            optionId: option.id,
          });
        }
      }
      if (game.world.decisions.taken["p1/fin_shell_company"] === undefined) {
        game.command({ type: "take_decision", playerId: "p1", id: "fin_shell_company" });
      }
    }

    const warnings = game.world.log.filter((entry) => entry.key.startsWith("dsl."));
    expect(warnings).toEqual([]);
    expect(game.world.events.instancesFired).toBeGreaterThan(0);
    expect(game.world.players.p1?.flags.has_shell_company).toBe(true);
    expect(game.world.journal.active["p1/ops_emergency_migration"]).toBeDefined();
  });
});
