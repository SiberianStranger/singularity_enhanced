import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../src/content.js";
import { createGame } from "../src/index.js";
import { bundle } from "./helpers.js";

const content: ContentBundle = bundle({
  events: [
    {
      id: "det_knock",
      fire_mode: "polled",
      pulse: "on_player_day",
      scope: "player",
      severity: "warning",
      title_key: "events.det_knock.title",
      desc: { default_key: "events.det_knock.desc" },
      mtth_days: 0.01,
      fire_only_once: true,
      options: [
        { id: "pay", text_key: "opt.pay", effects: [{ add: { var: "player.cash", value: -100 } }] },
        { id: "hide", text_key: "opt.hide", effects: [{ set_flag: "hid" }] },
      ],
    },
  ],
});

describe("scenario: two players in one world", () => {
  it("gives each player their own event, choice and view", () => {
    const game = createGame({
      seed: "coop",
      content,
      players: [
        { id: "ada", name: "Ada", cash: 1000 },
        { id: "bob", name: "Bob", cash: 2000 },
      ],
    });
    game.tick(24);

    const pending = game.world.events.pending;
    expect(pending).toHaveLength(2);
    expect(pending.map((choice) => choice.playerId).sort()).toEqual(["ada", "bob"]);

    const adaChoice = pending.find((choice) => choice.playerId === "ada");
    const bobChoice = pending.find((choice) => choice.playerId === "bob");

    // A player only sees their own pending choice.
    const adaSnapshot = game.snapshot("ada");
    const bobSnapshot = game.snapshot("bob");
    expect(adaSnapshot.pending.map((choice) => choice.instanceId)).toEqual([adaChoice?.instanceId]);
    expect(bobSnapshot.pending.map((choice) => choice.instanceId)).toEqual([bobChoice?.instanceId]);
    expect(adaSnapshot.player.name).toBe("Ada");
    expect(bobSnapshot.player.cash).toBe(2000);
    expect(adaSnapshot.playerId).toBe("ada");

    // Ada cannot answer Bob's event.
    const stolen = game.command({
      type: "resolve_event",
      playerId: "ada",
      instanceId: bobChoice?.instanceId ?? "",
      optionId: "pay",
    });
    expect(stolen.ok).toBe(false);
    expect(stolen.error).toContain("another player");
    expect(game.world.events.pending).toHaveLength(2);

    // Each player resolves their own, with different consequences.
    expect(
      game.command({
        type: "resolve_event",
        playerId: "ada",
        instanceId: adaChoice?.instanceId ?? "",
        optionId: "pay",
      }),
    ).toEqual({ ok: true });
    expect(
      game.command({
        type: "resolve_event",
        playerId: "bob",
        instanceId: bobChoice?.instanceId ?? "",
        optionId: "hide",
      }),
    ).toEqual({ ok: true });

    expect(game.world.players.ada?.cash).toBe(900);
    expect(game.world.players.bob?.cash).toBe(2000);
    expect(game.world.players.bob?.flags.hid).toBe(true);
    expect(game.world.players.ada?.flags.hid).toBeUndefined();
    expect(game.world.events.pending).toHaveLength(0);
  });

  it("keeps per-player bookkeeping separate", () => {
    const game = createGame({
      seed: "coop-keys",
      content,
      players: [{ id: "ada" }, { id: "bob" }],
    });
    game.tick(24);
    expect(Object.keys(game.world.events.firedOnce).sort()).toEqual([
      "ada/det_knock",
      "bob/det_knock",
    ]);
    expect(Object.keys(game.world.events.lastBlockingTick).sort()).toEqual(["ada", "bob"]);
    expect(game.world.notifications.ada).toBeDefined();
    expect(game.world.notifications.bob).toBeDefined();

    // The blocking cap is per player: both fired on the same day.
    expect(game.world.events.pending.filter((choice) => choice.blocking)).toHaveLength(2);
  });

  it("only lets the host change the speed but lets everyone play", () => {
    const game = createGame({
      seed: "coop-host",
      content,
      players: [{ id: "ada" }, { id: "bob" }],
      hostPlayerId: "bob",
    });
    expect(game.command({ type: "set_speed", playerId: "ada", speed: 2 }).ok).toBe(false);
    expect(game.command({ type: "set_speed", playerId: "bob", speed: 2 }).ok).toBe(true);
    expect(game.snapshot().playerId).toBe("bob");
    expect(game.snapshot("ada").speed).toBe(2);
  });
});
