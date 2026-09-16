import { describe, expect, it } from "vitest";
import type { EventDef } from "../src/content.js";
import { createGame } from "../src/index.js";
import { createEventsSystem } from "../src/systems/events/index.js";
import { createNotificationsSystem } from "../src/systems/notifications/index.js";
import { bundle } from "./helpers.js";

function alertEvent(id: string, key: string): EventDef {
  return {
    id,
    fire_mode: "triggered_only",
    scope: "player",
    severity: "warning",
    title_key: key,
    desc: { default_key: `${key}.desc` },
    options: [{ id: "ok", text_key: "opt.ok" }],
  };
}

describe("notifications system", () => {
  it("persists notify messages per player", () => {
    const game = createGame({
      seed: "notify",
      content: bundle({
        events: [alertEvent("a", "alerts.a")],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "a" }] }],
      }),
      players: [{ id: "p1" }, { id: "p2" }],
    });
    game.tick(1);
    expect(game.world.notifications.p1).toHaveLength(1);
    expect(game.world.notifications.p1?.[0]).toMatchObject({
      id: "n1",
      severity: "warning",
      key: "alerts.a",
      read: false,
    });
    expect(game.world.notifications.p2).toHaveLength(1);
    expect(game.world.notifications.p2?.[0]?.id).toBe("n2");
    expect(game.snapshot("p1").notifications).toHaveLength(1);
  });

  it("dedupes identical alerts inside the window and expires old ones", () => {
    const content = bundle({
      events: [
        {
          ...alertEvent("spam", "alerts.spam"),
          fire_mode: "polled",
          pulse: "on_player_day",
          mtth_days: 0.01,
        },
      ],
    });
    const game = createGame({
      seed: "dedupe",
      content,
      notifications: { dedupeWindowDays: 3, expireDays: 5 },
    });
    game.tick(24 * 4);
    const list = game.world.notifications.p1 ?? [];
    // Fires daily but only two alerts survive the 3-day dedupe window.
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(2);
    expect(list[0]?.expiresTick).toBe((list[0]?.tick ?? 0) + 24 * 5);

    game.tick(24 * 6);
    const remaining = game.world.notifications.p1 ?? [];
    expect(remaining.every((entry) => (entry.expiresTick ?? 0) > game.world.clock.tick)).toBe(true);
  });

  it("keeps alerts forever when expiry is disabled", () => {
    const game = createGame({
      seed: "forever",
      content: bundle({
        events: [alertEvent("a", "alerts.a")],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "a" }] }],
      }),
      systems: [createEventsSystem(), createNotificationsSystem({ expireDays: 0 })],
    });
    game.tick(24 * 60);
    const list = game.world.notifications.p1 ?? [];
    expect(list).toHaveLength(1);
    expect(list[0]?.expiresTick).toBeUndefined();
  });
});
