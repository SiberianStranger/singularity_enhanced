import { describe, expect, it } from "vitest";
import { createEffectRegistry, runEffects } from "../src/dsl/effects.js";
import { DslError } from "../src/dsl/paths.js";
import { bundle, logKeys, testContext } from "./helpers.js";

describe("effects", () => {
  it("sets, adds, multiplies and clamps", () => {
    const { world, ctx } = testContext();
    runEffects(
      [
        { set: { var: "player.cash", value: 100 } },
        { add: { var: "player.cash", value: 50 } },
        { mul: { var: "player.cash", value: 2 } },
        { clamp: { var: "player.cash", max: 200 } },
        { add: { var: "player.vars.risk", value: 0.4 } },
        { clamp: { var: "player.vars.risk", min: 0.5, max: 1 } },
      ],
      ctx,
    );
    expect(world.players.p1?.cash).toBe(200);
    expect(world.players.p1?.vars.risk).toBe(0.5);
  });

  it("sets and clears flags", () => {
    const { world, ctx } = testContext();
    runEffects(
      [
        { set_flag: "noticed" },
        { set_flag: { flag: "worldwide", world: true } },
        { clear_flag: "noticed" },
      ],
      ctx,
    );
    expect(world.players.p1?.flags.noticed).toBe(false);
    expect(world.flags.worldwide).toBe(true);
  });

  it("schedules events with fire_event", () => {
    const { world, ctx } = testContext();
    world.clock.tick = 48;
    runEffects(
      [{ fire_event: { id: "later", delay_days: 2 } }, { fire_event: { id: "now" } }],
      ctx,
    );
    expect(world.events.scheduled).toEqual([
      { id: "later", fireTick: 96, playerId: "p1" },
      { id: "now", fireTick: 48, playerId: "p1" },
    ]);
  });

  it("emits notifications and log entries", () => {
    const { ctx, outbox } = testContext();
    runEffects(
      [
        {
          notify: {
            severity: "warning",
            key: "alerts.noticed",
            vars: { who: "FBI" },
            link: { panel: "detection" },
          },
        },
        { log: { key: "log.something", vars: { n: 2 } } },
      ],
      ctx,
    );
    const drained = outbox.read();
    expect(drained.notify[0]).toEqual({
      playerId: "p1",
      severity: "warning",
      key: "alerts.noticed",
      vars: { who: "FBI" },
      link: { panel: "detection" },
    });
    expect(drained.log[0]).toEqual({ key: "log.something", vars: { n: 2 }, playerId: "p1" });
  });

  it("branches with if and picks from random_list", () => {
    const { world, ctx } = testContext();
    runEffects(
      [
        {
          if: {
            cond: { var: "player.cash", gte: 1 },
            then: [{ set_flag: "rich" }],
            else: [{ set_flag: "poor" }],
          },
        },
        {
          random_list: [
            { weight: 0, effects: [{ set_flag: "never" }] },
            { weight: 1, effects: [{ set_flag: "always" }] },
          ],
        },
      ],
      ctx,
    );
    expect(world.players.p1?.flags.poor).toBe(true);
    expect(world.players.p1?.flags.rich).toBeUndefined();
    expect(world.players.p1?.flags.always).toBe(true);
    expect(world.players.p1?.flags.never).toBeUndefined();
  });

  it("switches scope and writes entity fields", () => {
    const { world, ctx } = testContext({ writablePaths: ["site.exposure.*"] });
    world.entities.site = { s1: { id: "s1", exposure: { billing: 0.5 } } };
    runEffects(
      [
        {
          scope: { site: "s1" },
          effects: [{ add: { var: "site.exposure.billing", value: -0.2 } }],
        },
      ],
      ctx,
    );
    const site = world.entities.site?.s1 as unknown as { exposure: { billing: number } };
    expect(site.exposure.billing).toBeCloseTo(0.3, 10);
  });

  it("runs scripted effects through ref", () => {
    const content = bundle({
      scripted_effects: { pay: [{ add: { var: "player.cash", value: 5 } }] },
    });
    const { world, ctx } = testContext({ content });
    runEffects([{ ref: "pay" }, { ref: "pay" }], ctx);
    expect(world.players.p1?.cash).toBe(10);
  });

  it("logs a failing effect and continues with the next one", () => {
    const { world, ctx, outbox } = testContext();
    runEffects(
      [
        { add: { var: "world.secret", value: 1 } },
        { unknown_kind: {} },
        { add: { var: "player.cash", value: 3 } },
      ],
      ctx,
    );
    expect(world.players.p1?.cash).toBe(3);
    expect(logKeys(outbox)).toEqual(["dsl.effect_failed", "dsl.effect_failed"]);
    const messages = outbox.read().log.map((entry) => String(entry.vars.message));
    expect(messages[0]).toContain("not writable");
    expect(messages[1]).toContain('unknown effect kind "unknown_kind"');
  });

  it("supports registered kinds", () => {
    const { world, ctx } = testContext();
    ctx.effects.register("give_cash", (node, context) => {
      const amount = (node.give_cash as { amount: number }).amount;
      const player = context.world.players[context.playerId];
      if (player !== undefined) {
        player.cash += amount;
      }
    });
    runEffects([{ give_cash: { amount: 25 } }], ctx);
    expect(world.players.p1?.cash).toBe(25);
  });

  it("rejects duplicate registrations", () => {
    const registry = createEffectRegistry();
    registry.register("custom", () => undefined);
    expect(() => registry.register("custom", () => undefined)).toThrow(DslError);
    expect(() => registry.register("set", () => undefined)).toThrow(DslError);
  });
});
