import { describe, expect, it } from "vitest";
import type { DecisionDef } from "../src/content.js";
import { createGame } from "../src/index.js";
import { requirePlayer } from "../src/kernel/world.js";
import { bundle } from "./helpers.js";

function decision(id: string, parts: Partial<DecisionDef> = {}): DecisionDef {
  return {
    id,
    title_key: `decisions.${id}.title`,
    desc_key: `decisions.${id}.desc`,
    category: "operations",
    ...parts,
  };
}

describe("decisions", () => {
  it("charges the cash cost and runs the effects", () => {
    const game = createGame({
      seed: "decision-cost",
      content: bundle({
        decisions: [
          decision("shell", { cost: { cash: 500 }, effects: [{ set_flag: "has_shell" }] }),
        ],
      }),
      players: [{ id: "p1", cash: 600 }],
    });
    expect(game.command({ type: "take_decision", playerId: "p1", id: "shell" })).toEqual({
      ok: true,
    });
    expect(game.world.players.p1?.cash).toBe(100);
    expect(game.world.players.p1?.flags.has_shell).toBe(true);
    expect(game.world.decisions.taken["p1/shell"]).toBe(1);

    const second = game.command({ type: "take_decision", playerId: "p1", id: "shell" });
    expect(second.ok).toBe(false);
    expect(second.error?.key).toBe("errors.decision.already_taken");
  });

  it("refuses unaffordable, invisible, disabled and unknown decisions", () => {
    const game = createGame({
      seed: "decision-gates",
      content: bundle({
        decisions: [
          decision("pricey", { cost: { cash: 1000 } }),
          decision("hidden_one", { visible_if: { flag: "never" } }),
          decision("locked", { enabled_if: { flag: "never" } }),
        ],
      }),
    });
    expect(game.command({ type: "take_decision", playerId: "p1", id: "pricey" }).error?.key).toBe(
      "errors.decision.cannot_afford",
    );
    expect(
      game.command({ type: "take_decision", playerId: "p1", id: "hidden_one" }).error?.key,
    ).toBe("errors.decision.not_visible");
    expect(game.command({ type: "take_decision", playerId: "p1", id: "locked" }).error?.key).toBe(
      "errors.decision.not_enabled",
    );
    expect(game.command({ type: "take_decision", playerId: "p1", id: "ghost" }).error).toEqual({
      key: "errors.decision.unknown",
      vars: { decision: "ghost" },
    });
  });

  it("applies cooldowns to repeatable decisions", () => {
    const game = createGame({
      seed: "decision-cooldown",
      content: bundle({
        decisions: [
          decision("scan", {
            repeatable: true,
            cooldown_days: 2,
            effects: [{ add: { var: "player.vars.scans", value: 1 } }],
          }),
        ],
      }),
    });
    expect(game.command({ type: "take_decision", playerId: "p1", id: "scan" }).ok).toBe(true);
    expect(game.command({ type: "take_decision", playerId: "p1", id: "scan" }).error?.key).toBe(
      "errors.decision.on_cooldown",
    );
    game.tick(48);
    expect(game.command({ type: "take_decision", playerId: "p1", id: "scan" }).ok).toBe(true);
    expect(game.world.players.p1?.vars.scans).toBe(2);
  });

  it("completes decisions with a duration", () => {
    const game = createGame({
      seed: "decision-duration",
      content: bundle({
        decisions: [
          decision("migrate", {
            duration_days: 3,
            effects: [{ set_flag: "migrating" }],
            on_complete: [{ clear_flag: "migrating" }, { set_flag: "migrated" }],
          }),
        ],
      }),
    });
    game.command({ type: "take_decision", playerId: "p1", id: "migrate" });
    expect(game.world.decisions.inProgress).toHaveLength(1);
    expect(game.world.players.p1?.flags.migrating).toBe(true);

    game.tick(24 * 2);
    expect(game.world.decisions.inProgress).toHaveLength(1);
    game.tick(24);
    expect(game.world.decisions.inProgress).toHaveLength(0);
    expect(game.world.players.p1?.flags.migrated).toBe(true);
    expect(game.world.players.p1?.flags.migrating).toBe(false);
  });

  it("alerts once when a decision becomes available", () => {
    const game = createGame({
      seed: "decision-alert",
      content: bundle({
        decisions: [
          decision("offer", {
            visible_if: { flag: "offered" },
            should_alert: { flag: "offered" },
          }),
        ],
      }),
    });
    game.tick(24);
    expect(game.world.notifications.p1).toHaveLength(0);

    requirePlayer(game.world, "p1").flags.offered = true;
    game.tick(24);
    expect(game.world.notifications.p1).toHaveLength(1);
    expect(game.world.notifications.p1?.[0]).toMatchObject({
      key: "decisions.offer.title",
      severity: "opportunity",
    });
    game.tick(24 * 3);
    expect(game.world.notifications.p1).toHaveLength(1);
  });

  it("fires the on_decision_taken hook and answers decision_taken", () => {
    const game = createGame({
      seed: "decision-hook",
      content: bundle({
        decisions: [decision("act")],
        events: [
          {
            id: "after",
            fire_mode: "triggered_only",
            scope: "player",
            severity: "info",
            title_key: "t",
            desc: { default_key: "d" },
            hidden: true,
            trigger: { decision_taken: { id: "act" } },
            options: [{ id: "ok", text_key: "o", effects: [{ set_flag: "followed_up" }] }],
          },
        ],
        hooks: [{ id: "on_decision_taken", scope: "player", events: [{ id: "after" }] }],
      }),
    });
    game.command({ type: "take_decision", playerId: "p1", id: "act" });
    expect(game.world.players.p1?.flags.followed_up).toBe(true);
  });

  it("keeps decisions per player", () => {
    const game = createGame({
      seed: "decision-players",
      content: bundle({ decisions: [decision("act")] }),
      players: [{ id: "a" }, { id: "b" }],
    });
    expect(game.command({ type: "take_decision", playerId: "a", id: "act" }).ok).toBe(true);
    expect(game.command({ type: "take_decision", playerId: "b", id: "act" }).ok).toBe(true);
    expect(game.command({ type: "take_decision", playerId: "a", id: "act" }).ok).toBe(false);
    expect(game.world.decisions.taken).toEqual({ "a/act": 1, "b/act": 1 });
  });
});
