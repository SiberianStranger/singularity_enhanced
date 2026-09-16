import { describe, expect, it } from "vitest";
import { createConditionRegistry, evaluateCondition } from "../src/dsl/conditions.js";
import { DslError } from "../src/dsl/paths.js";
import { requirePlayer } from "../src/kernel/world.js";
import { bundle, logKeys, testContext } from "./helpers.js";

describe("conditions", () => {
  it("treats a missing condition as true", () => {
    const { ctx } = testContext();
    expect(evaluateCondition(undefined, ctx)).toBe(true);
  });

  it("evaluates var comparators", () => {
    const { world, ctx } = testContext();
    requirePlayer(world, "p1").cash = 1000;
    requirePlayer(world, "p1").vars.risk = 0.4;

    expect(evaluateCondition({ var: "player.cash", gte: 1000 }, ctx)).toBe(true);
    expect(evaluateCondition({ var: "player.cash", gt: 1000 }, ctx)).toBe(false);
    expect(evaluateCondition({ var: "player.cash", lt: 2000, gt: 500 }, ctx)).toBe(true);
    expect(evaluateCondition({ var: "player.vars.risk", lte: 0.4 }, ctx)).toBe(true);
    expect(evaluateCondition({ var: "player.name", eq: "Player 1" }, ctx)).toBe(true);
    expect(evaluateCondition({ var: "player.name", ne: "Player 2" }, ctx)).toBe(true);
    expect(evaluateCondition({ var: "player.name", in: ["Player 1", "x"] }, ctx)).toBe(true);
    // A missing value never satisfies a numeric comparison.
    expect(evaluateCondition({ var: "player.vars.unknown", gte: 0 }, ctx)).toBe(false);
  });

  it("combines all, any and not", () => {
    const { world, ctx } = testContext();
    requirePlayer(world, "p1").cash = 10;
    const yes = { var: "player.cash", eq: 10 };
    const no = { var: "player.cash", eq: 11 };
    expect(evaluateCondition({ all: [yes, yes] }, ctx)).toBe(true);
    expect(evaluateCondition({ all: [yes, no] }, ctx)).toBe(false);
    expect(evaluateCondition({ any: [no, yes] }, ctx)).toBe(true);
    expect(evaluateCondition({ any: [no, no] }, ctx)).toBe(false);
    expect(evaluateCondition({ not: no }, ctx)).toBe(true);
  });

  it("reads flags from the player and the world", () => {
    const { world, ctx } = testContext();
    requirePlayer(world, "p1").flags.has_shell_company = true;
    world.flags.global_alarm = true;
    expect(evaluateCondition({ flag: "has_shell_company" }, ctx)).toBe(true);
    expect(evaluateCondition({ flag: "global_alarm" }, ctx)).toBe(true);
    expect(evaluateCondition({ flag: "missing" }, ctx)).toBe(false);
    expect(evaluateCondition({ flag: "missing", value: false }, ctx)).toBe(true);
  });

  it("asks the tech hook", () => {
    const { world, ctx } = testContext();
    requirePlayer(world, "p1").flags["tech.advanced_stealth"] = true;
    expect(evaluateCondition({ tech: "advanced_stealth" }, ctx)).toBe(true);
    expect(evaluateCondition({ tech: "other" }, ctx)).toBe(false);
  });

  it("uses the world rng for chance", () => {
    const { ctx } = testContext({ seed: "chance" });
    let hits = 0;
    for (let i = 0; i < 400; i += 1) {
      if (evaluateCondition({ chance: 0.5 }, ctx)) {
        hits += 1;
      }
    }
    expect(hits).toBeGreaterThan(150);
    expect(hits).toBeLessThan(250);
  });

  it("switches scope and counts entities", () => {
    const { world, ctx } = testContext();
    world.entities.site = {
      s1: { id: "s1", kind: "cloud", exposure: { billing: 0.7 } },
      s2: { id: "s2", kind: "colo", exposure: { billing: 0.1 } },
    };
    expect(
      evaluateCondition({ scope: { site: "s1" }, cond: { var: "site.kind", eq: "cloud" } }, ctx),
    ).toBe(true);
    expect(
      evaluateCondition({ scope: { site: "s2" }, cond: { var: "site.kind", eq: "cloud" } }, ctx),
    ).toBe(false);
    expect(evaluateCondition({ scope: { site: "missing" }, cond: { flag: "x" } }, ctx)).toBe(false);

    expect(evaluateCondition({ count: { kind: "site" }, gte: 2 }, ctx)).toBe(true);
    expect(
      evaluateCondition(
        { count: { kind: "site", where: { var: "site.exposure.billing", gte: 0.5 } }, eq: 1 },
        ctx,
      ),
    ).toBe(true);
  });

  it("resolves scripted triggers through ref", () => {
    const content = bundle({
      scripted_triggers: { rich: { var: "player.cash", gte: 100 } },
    });
    const { world, ctx } = testContext({ content });
    requirePlayer(world, "p1").cash = 150;
    expect(evaluateCondition({ ref: "rich" }, ctx)).toBe(true);
    requirePlayer(world, "p1").cash = 10;
    expect(evaluateCondition({ ref: "rich" }, ctx)).toBe(false);
  });

  it("supports registered kinds and warns about unknown ones", () => {
    const { ctx, outbox } = testContext();
    ctx.conditions.register("always_true", () => true);
    expect(evaluateCondition({ always_true: {} }, ctx)).toBe(true);

    expect(evaluateCondition({ no_such_kind: {} }, ctx)).toBe(false);
    expect(logKeys(outbox)).toContain("dsl.condition_failed");
    expect(outbox.read().log[0]?.vars.message).toContain('unknown condition kind "no_such_kind"');
  });

  it("never throws on malformed nodes", () => {
    const { ctx, outbox } = testContext();
    expect(evaluateCondition({}, ctx)).toBe(false);
    expect(evaluateCondition({ var: "player.cash" }, ctx)).toBe(false);
    expect(evaluateCondition({ all: "nope" } as never, ctx)).toBe(false);
    expect(logKeys(outbox)).toHaveLength(3);
  });

  it("rejects duplicate registrations", () => {
    const registry = createConditionRegistry();
    registry.register("custom", () => true);
    expect(() => registry.register("custom", () => false)).toThrow(DslError);
    expect(() => registry.register("all", () => false)).toThrow(DslError);
    expect(registry.kinds()).toEqual(["custom"]);
  });
});
