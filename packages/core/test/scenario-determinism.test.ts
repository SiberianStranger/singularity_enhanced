import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../src/content.js";
import { autoResolvePolicy, createGame, type Game, runHeadless } from "../src/index.js";
import type { PlayerCommand } from "../src/kernel/commands.js";
import { serialize } from "../src/kernel/save.js";
import { bundle } from "./helpers.js";

const content: ContentBundle = bundle({
  events: [
    {
      id: "det_ping",
      fire_mode: "polled",
      pulse: "on_player_day",
      scope: "player",
      severity: "warning",
      title_key: "events.det_ping.title",
      desc: { default_key: "events.det_ping.desc" },
      mtth_days: 5,
      cooldown_days: 2,
      options: [
        { id: "pay", text_key: "opt.pay", effects: [{ add: { var: "player.cash", value: -25 } }] },
        {
          id: "ignore",
          text_key: "opt.ignore",
          effects: [{ add: { var: "player.vars.heat", value: 1 } }],
        },
      ],
    },
    {
      id: "eco_tick",
      fire_mode: "polled",
      pulse: "on_player_week",
      scope: "player",
      severity: "info",
      title_key: "events.eco_tick.title",
      desc: { default_key: "events.eco_tick.desc" },
      mtth_days: 10,
      options: [
        { id: "ok", text_key: "opt.ok", effects: [{ add: { var: "player.cash", value: 100 } }] },
      ],
    },
  ],
  hooks: [
    {
      id: "weekly_pool",
      extends: "on_player_week",
      scope: "player",
      random_events: {
        pool: [
          { weight: { base: 100 }, id: "det_ping" },
          { weight: { base: 200 }, id: null },
        ],
      },
    },
  ],
});

function play(seed: string): Game {
  const game = createGame({ seed, content, players: [{ id: "p1", cash: 1000 }], debug: true });
  const policy = autoResolvePolicy();
  runHeadless(game, 2000, (current, tick) => {
    const commands: PlayerCommand[] = [...(policy(current, tick) ?? [])];
    if (tick === 100) {
      commands.push({ type: "set_speed", playerId: "p1", speed: 3, tick });
    }
    if (tick % 500 === 0) {
      commands.push({ type: "cheat_add_cash", playerId: "p1", amount: 50, tick });
    }
    return commands;
  });
  return game;
}

describe("scenario: determinism", () => {
  it("produces identical worlds for the same seed and command log", () => {
    const first = play("determinism");
    const second = play("determinism");
    expect(second.world.clock.tick).toBe(2000);
    expect(serialize(second.world)).toBe(serialize(first.world));

    // The run is not trivial: events fired, alerts landed, the log filled up.
    expect(first.world.events.instancesFired).toBeGreaterThan(5);
    expect(first.world.log.length).toBeGreaterThan(10);
    expect(first.world.notifications.p1?.length ?? 0).toBeGreaterThan(0);
    expect(first.world.speed).toBe(3);
  });

  it("diverges for a different seed", () => {
    expect(serialize(play("determinism").world)).not.toBe(serialize(play("other-seed").world));
  });
});
