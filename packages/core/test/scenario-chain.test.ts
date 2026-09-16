import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../src/content.js";
import { createGame, loadGame } from "../src/index.js";
import { serialize } from "../src/kernel/save.js";
import { requirePlayer } from "../src/kernel/world.js";
import { bundle } from "./helpers.js";

/**
 * A two-step chain: the first event sets a flag and schedules the second one three days later.
 * The second is blocking, so the player answers it with a command.
 */
const content: ContentBundle = bundle({
  events: [
    {
      id: "chain_start",
      fire_mode: "triggered_only",
      scope: "player",
      severity: "info",
      title_key: "events.chain_start.title",
      desc: { default_key: "events.chain_start.desc" },
      hidden: true,
      options: [
        {
          id: "go",
          text_key: "opt.go",
          effects: [
            { set_flag: "chain_started" },
            { fire_event: { id: "chain_end", delay_days: 3 } },
          ],
        },
      ],
    },
    {
      id: "chain_end",
      fire_mode: "triggered_only",
      scope: "player",
      severity: "warning",
      title_key: "events.chain_end.title",
      desc: { default_key: "events.chain_end.desc" },
      trigger: { flag: "chain_started" },
      options: [
        { id: "pay", text_key: "opt.pay", effects: [{ add: { var: "player.cash", value: -100 } }] },
        { id: "refuse", text_key: "opt.refuse", effects: [{ set_flag: "refused" }] },
      ],
    },
  ],
  hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "chain_start" }] }],
});

describe("scenario: chain with a save in the middle", () => {
  it("keeps the schedule and the pending choice across a save", () => {
    const game = createGame({ seed: "chain", content, players: [{ id: "p1", cash: 1000 }] });
    game.tick(1);
    expect(game.world.players.p1?.flags.chain_started).toBe(true);
    expect(game.world.events.scheduled).toEqual([
      { id: "chain_end", fireTick: 1 + 72, playerId: "p1" },
    ]);

    // Save while the delayed event is still pending.
    game.tick(30);
    const midSave = serialize(game.world);
    const resumed = loadGame({ save: midSave, content });
    expect(resumed.world.events.scheduled).toEqual(game.world.events.scheduled);
    expect(resumed.world.clock.tick).toBe(31);

    // The resumed game fires the scheduled event at the same tick the original would have.
    resumed.tick(50);
    expect(resumed.world.clock.tick).toBe(81);
    const choice = resumed.world.events.pending[0];
    expect(choice).toMatchObject({ eventId: "chain_end", blocking: true, tick: 73 });
    expect(resumed.world.events.scheduled).toEqual([]);

    // Save again with the choice open, then answer it in the reloaded game.
    const pendingSave = serialize(resumed.world);
    const reloaded = loadGame({ save: pendingSave, content });
    expect(reloaded.world.events.pending).toEqual(resumed.world.events.pending);

    const result = reloaded.command({
      type: "resolve_event",
      playerId: "p1",
      instanceId: choice?.instanceId ?? "",
      optionId: "refuse",
    });
    expect(result).toEqual({ ok: true });
    expect(reloaded.world.events.pending).toHaveLength(0);
    expect(reloaded.world.players.p1?.flags.refused).toBe(true);
    expect(reloaded.world.players.p1?.cash).toBe(1000);
  });

  it("drops the chain when the guard no longer holds", () => {
    const game = createGame({ seed: "chain-guard", content });
    game.tick(1);
    requirePlayer(game.world, "p1").flags.chain_started = false;
    game.tick(100);
    expect(game.world.events.pending).toHaveLength(0);
    expect(game.world.log.some((entry) => entry.key === "log.event_skipped")).toBe(true);
  });
});
