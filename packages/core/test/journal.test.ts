import { describe, expect, it } from "vitest";
import type { EventDef, JournalDef } from "../src/content.js";
import { createGame } from "../src/index.js";
import { requirePlayer } from "../src/kernel/world.js";
import { bundle } from "./helpers.js";

function journal(id: string, parts: Partial<JournalDef> = {}): JournalDef {
  return {
    id,
    title_key: `journal.${id}.title`,
    desc_key: `journal.${id}.desc`,
    scope: "player",
    alert: "normal",
    ...parts,
  };
}

const starter: EventDef = {
  id: "starter",
  fire_mode: "triggered_only",
  scope: "player",
  severity: "info",
  title_key: "events.starter.title",
  desc: { default_key: "events.starter.desc" },
  hidden: true,
  options: [{ id: "go", text_key: "o", effects: [{ start_journal: { id: "invest" } }] }],
};

const startHook = { id: "on_game_start", scope: "player" as const, events: [{ id: "starter" }] };

describe("journal", () => {
  it("starts through an effect and tracks var progress", () => {
    const game = createGame({
      seed: "journal-progress",
      content: bundle({
        events: [starter],
        hooks: [startHook],
        journal: [
          journal("invest", {
            progress: { var: "player.vars.evidence", max: 4 },
            complete_if: { var: "player.vars.evidence", gte: 4 },
            on_complete: [{ set_flag: "investigated" }],
          }),
        ],
      }),
      debug: true,
    });
    game.tick(1);
    const state = game.world.journal.active["p1/invest"];
    expect(state).toMatchObject({ id: "invest", playerId: "p1", status: "active", progress: 0 });
    expect(game.world.notifications.p1?.[0]?.key).toBe("journal.invest.title");

    requirePlayer(game.world, "p1").vars.evidence = 2;
    game.tick(24);
    expect(game.world.journal.active["p1/invest"]?.progress).toBe(0.5);

    requirePlayer(game.world, "p1").vars.evidence = 4;
    game.tick(24);
    expect(game.world.journal.active["p1/invest"]).toMatchObject({
      status: "complete",
      progress: 1,
    });
    expect(game.world.players.p1?.flags.investigated).toBe(true);
  });

  it("advances through steps and stages", () => {
    const game = createGame({
      seed: "journal-steps",
      content: bundle({
        events: [starter],
        hooks: [startHook],
        journal: [
          journal("invest", {
            progress: {
              steps: [
                {
                  id: "one",
                  complete_if: { flag: "step_one" },
                  effects: [{ set_flag: "did_one" }],
                },
                { id: "two", complete_if: { flag: "step_two" } },
              ],
            },
            stages: [
              { threshold: 0.5, on_enter: [{ set_flag: "stage_half" }] },
              { threshold: 1, on_enter: [{ set_flag: "stage_full" }] },
            ],
          }),
        ],
      }),
    });
    game.tick(1);
    requirePlayer(game.world, "p1").flags.step_one = true;
    game.tick(24);
    let state = game.world.journal.active["p1/invest"];
    expect(state).toMatchObject({ stepIndex: 1, progress: 0.5, stageIndex: 1, status: "active" });
    expect(game.world.players.p1?.flags.did_one).toBe(true);
    expect(game.world.players.p1?.flags.stage_half).toBe(true);

    requirePlayer(game.world, "p1").flags.step_two = true;
    game.tick(24);
    state = game.world.journal.active["p1/invest"];
    expect(state).toMatchObject({ status: "complete", stepIndex: 2, stageIndex: 2 });
    expect(game.world.players.p1?.flags.stage_full).toBe(true);
  });

  it("fails and times out", () => {
    const failing = createGame({
      seed: "journal-fail",
      content: bundle({
        events: [starter],
        hooks: [startHook],
        journal: [
          journal("invest", { fail_if: { flag: "busted" }, on_fail: [{ set_flag: "failed" }] }),
        ],
      }),
    });
    failing.tick(1);
    requirePlayer(failing.world, "p1").flags.busted = true;
    failing.tick(24);
    expect(failing.world.journal.active["p1/invest"]?.status).toBe("failed");
    expect(failing.world.players.p1?.flags.failed).toBe(true);

    const timing = createGame({
      seed: "journal-timeout",
      content: bundle({
        events: [starter],
        hooks: [startHook],
        journal: [journal("invest", { timeout_days: 2, on_timeout: [{ set_flag: "too_late" }] })],
      }),
    });
    timing.tick(24 * 3);
    expect(timing.world.journal.active["p1/invest"]?.status).toBe("timeout");
    expect(timing.world.players.p1?.flags.too_late).toBe(true);
  });

  it("auto-starts entries and answers journal_active", () => {
    const game = createGame({
      seed: "journal-auto",
      content: bundle({
        events: [
          {
            id: "reacts",
            fire_mode: "polled",
            pulse: "on_player_day",
            scope: "player",
            severity: "info",
            title_key: "t",
            desc: { default_key: "d" },
            mtth_days: 0.01,
            trigger: { journal_active: { id: "auto" } },
            fire_only_once: true,
            options: [{ id: "ok", text_key: "o", effects: [{ set_flag: "reacted" }] }],
          },
        ],
        journal: [journal("auto", { start_if: { flag: "ready" }, alert: "silent" })],
      }),
      setup: (world) => {
        world.flags.ready = true;
      },
    });
    game.tick(24);
    expect(game.world.journal.active["p1/auto"]?.status).toBe("active");
    // Silent entries do not raise an alert.
    expect(game.world.notifications.p1).toHaveLength(0);
    game.tick(24);
    expect(game.world.players.p1?.flags.reacted).toBe(true);
  });

  it("fires the completion hook", () => {
    const game = createGame({
      seed: "journal-hook",
      content: bundle({
        events: [
          starter,
          {
            id: "after",
            fire_mode: "triggered_only",
            scope: "player",
            severity: "info",
            title_key: "t",
            desc: { default_key: "d" },
            hidden: true,
            options: [{ id: "ok", text_key: "o", effects: [{ set_flag: "after_complete" }] }],
          },
        ],
        hooks: [
          startHook,
          { id: "on_journal_complete", scope: "player", events: [{ id: "after" }] },
        ],
        journal: [journal("invest", { complete_if: { flag: "done" } })],
      }),
    });
    game.tick(1);
    requirePlayer(game.world, "p1").flags.done = true;
    game.tick(24);
    expect(game.world.players.p1?.flags.after_complete).toBe(true);
  });
});
