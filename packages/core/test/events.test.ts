import { describe, expect, it } from "vitest";
import type { EventDef } from "../src/content.js";
import { createGame, type Game } from "../src/index.js";
import type { World } from "../src/kernel/world.js";
import { bundle } from "./helpers.js";

function event(id: string, parts: Partial<EventDef> = {}): EventDef {
  return {
    id,
    fire_mode: "triggered_only",
    scope: "player",
    severity: "info",
    title_key: `events.${id}.title`,
    desc: { default_key: `events.${id}.desc` },
    options: [{ id: "ok", text_key: `events.${id}.opt.ok` }],
    ...parts,
  };
}

const twoOptions = [
  { id: "pay", text_key: "opt.pay", effects: [{ add: { var: "player.cash", value: -10 } }] },
  { id: "ignore", text_key: "opt.ignore", effects: [{ set_flag: "ignored" }] },
];

function sites(world: World): void {
  world.entities.site = {
    s1: { id: "s1", name: "Alpha", kind: "cloud", exposure: { billing: 0.8 } },
    s2: { id: "s2", name: "Beta", kind: "colo", exposure: { billing: 0.1 } },
  };
}

describe("event engine", () => {
  it("fires a triggered event from a hook and queues a pending choice", () => {
    const game = createGame({
      seed: "pending",
      content: bundle({
        events: [event("det_letter", { options: twoOptions, severity: "warning" })],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "det_letter" }] }],
      }),
    });
    const result = game.tick(1);
    expect(result.outbox.pending).toHaveLength(1);
    const choice = game.world.events.pending[0];
    expect(choice).toMatchObject({
      eventId: "det_letter",
      playerId: "p1",
      blocking: true,
      severity: "warning",
      titleKey: "events.det_letter.title",
      descKey: "events.det_letter.desc",
    });
    expect(choice?.options.map((option) => option.id)).toEqual(["pay", "ignore"]);

    const resolved = game.command({
      type: "resolve_event",
      playerId: "p1",
      instanceId: choice?.instanceId ?? "",
      optionId: "ignore",
    });
    expect(resolved).toEqual({ ok: true });
    expect(game.world.events.pending).toHaveLength(0);
    expect(game.world.players.p1?.flags.ignored).toBe(true);
    expect(game.world.log.some((entry) => entry.key === "log.event_resolved")).toBe(true);
  });

  it("rejects bad resolutions", () => {
    const game = createGame({
      seed: "reject",
      content: bundle({
        events: [
          event("e", {
            options: [
              { id: "rich", text_key: "o", enabled_if: { var: "player.cash", gte: 1000 } },
              { id: "ok", text_key: "o2" },
            ],
          }),
        ],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "e" }] }],
      }),
      players: [{ id: "a" }, { id: "b" }],
    });
    game.tick(1);
    const choice = game.world.events.pending.find((entry) => entry.playerId === "a");
    const instanceId = choice?.instanceId ?? "";
    expect(choice?.options.find((option) => option.id === "rich")?.enabled).toBe(false);

    expect(
      game.command({ type: "resolve_event", playerId: "b", instanceId, optionId: "ok" }).error,
    ).toContain("another player");
    expect(
      game.command({ type: "resolve_event", playerId: "a", instanceId, optionId: "rich" }).error,
    ).toContain("not enabled");
    expect(
      game.command({ type: "resolve_event", playerId: "a", instanceId, optionId: "nope" }).error,
    ).toContain("unknown option");
    expect(
      game.command({ type: "resolve_event", playerId: "a", instanceId: "ev999", optionId: "ok" })
        .error,
    ).toContain("no pending event");
    expect(game.world.events.pending.filter((entry) => entry.playerId === "a")).toHaveLength(1);
  });

  it("fires at most one blocking event per player per day and queues the rest", () => {
    const game = createGame({
      seed: "cap",
      content: bundle({
        events: [event("first", { options: twoOptions }), event("second", { options: twoOptions })],
        hooks: [
          { id: "on_game_start", scope: "player", events: [{ id: "first" }, { id: "second" }] },
        ],
      }),
    });
    game.tick(1);
    expect(game.world.events.pending).toHaveLength(1);
    expect(game.world.events.scheduled).toEqual([
      { id: "second", fireTick: 24, playerId: "p1", source: "blocking_queue" },
    ]);

    game.tick(24);
    expect(game.world.events.pending.map((choice) => choice.eventId)).toEqual(["first", "second"]);
  });

  it("honours fire_only_once and cooldown_days", () => {
    const content = bundle({
      events: [
        event("daily", {
          fire_mode: "polled",
          pulse: "on_player_day",
          mtth_days: 0.01,
          cooldown_days: 3,
        }),
        event("once", {
          fire_mode: "polled",
          pulse: "on_player_day",
          mtth_days: 0.01,
          fire_only_once: true,
        }),
      ],
    });
    const game = createGame({ seed: "cooldown", content });
    game.tick(24 * 10);
    const fired = game.world.log.filter((entry) => entry.key === "log.event_fired");
    expect(fired.filter((entry) => entry.vars.event === "once")).toHaveLength(1);
    const dailyFires = fired.filter((entry) => entry.vars.event === "daily").length;
    expect(dailyFires).toBeGreaterThanOrEqual(3);
    expect(dailyFires).toBeLessThanOrEqual(4);
  });

  it("resolves a non-blocking event with a ttl through on_expire", () => {
    const game = createGame({
      seed: "ttl",
      content: bundle({
        events: [
          event("offer", {
            blocking: false,
            ttl_days: 2,
            on_expire: { resolve_as_option: "decline" },
            options: [
              { id: "accept", text_key: "o", effects: [{ set_flag: "accepted" }] },
              { id: "decline", text_key: "o2", effects: [{ set_flag: "declined" }] },
            ],
          }),
        ],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "offer" }] }],
      }),
    });
    game.tick(1);
    const choice = game.world.events.pending[0];
    expect(choice?.blocking).toBe(false);
    expect(choice?.expiresTick).toBe(1 + 48);
    expect(game.world.notifications.p1).toHaveLength(1);

    game.tick(48);
    expect(game.world.events.pending).toHaveLength(0);
    expect(game.world.players.p1?.flags.declined).toBe(true);
    expect(game.world.players.p1?.flags.accepted).toBeUndefined();
  });

  it("only shows fallback options when nothing else is legal", () => {
    const content = bundle({
      events: [
        event("gate", {
          options: [
            { id: "rich", text_key: "o", if: { var: "player.cash", gte: 1000 } },
            { id: "broke", text_key: "o2", fallback: true },
          ],
        }),
      ],
      hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "gate" }] }],
    });
    const poor = createGame({ seed: "fallback-a", content });
    poor.tick(1);
    expect(poor.world.events.pending[0]?.options.map((option) => option.id)).toEqual(["broke"]);

    const rich = createGame({
      seed: "fallback-b",
      content,
      players: [{ id: "p1", cash: 5000 }],
    });
    rich.tick(1);
    expect(rich.world.events.pending[0]?.options.map((option) => option.id)).toEqual(["rich"]);
  });

  it("picks the first matching description variant", () => {
    const content = bundle({
      events: [
        event("variants", {
          desc: {
            default_key: "desc.default",
            variants: [{ when: { flag: "alarmed" }, key: "desc.alarmed" }],
          },
          options: twoOptions,
        }),
      ],
      hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "variants" }] }],
    });
    const calm = createGame({ seed: "variant-a", content });
    calm.tick(1);
    expect(calm.world.events.pending[0]?.descKey).toBe("desc.default");

    const alarmed = createGame({
      seed: "variant-b",
      content,
      setup: (world) => {
        world.flags.alarmed = true;
      },
    });
    alarmed.tick(1);
    expect(alarmed.world.events.pending[0]?.descKey).toBe("desc.alarmed");
  });

  it("targets scoped events and interpolates their vars", () => {
    const game = createGame({
      seed: "targets",
      content: bundle({
        events: [
          event("det_billing", {
            fire_mode: "polled",
            pulse: "on_player_day",
            scope: "site",
            mtth_days: 0.01,
            targets: {
              all: [
                { var: "site.kind", eq: "cloud" },
                { var: "site.exposure.billing", gte: 0.3 },
              ],
            },
            vars: { site_name: "site.name" },
            fire_only_once: true,
          }),
        ],
      }),
      setup: sites,
    });
    game.tick(24);
    const notification = game.world.notifications.p1?.[0];
    expect(notification?.vars).toEqual({ site_name: "Alpha" });
    expect(game.world.events.firedOnce["p1/det_billing/s1"]).toBe(true);
    expect(game.world.events.firedOnce["p1/det_billing/s2"]).toBeUndefined();
  });

  it("runs hidden events silently", () => {
    const game = createGame({
      seed: "hidden",
      content: bundle({
        events: [
          event("plumbing", {
            hidden: true,
            options: [{ id: "only", text_key: "o", effects: [{ set_flag: "plumbed" }] }],
          }),
        ],
        hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "plumbing" }] }],
      }),
    });
    game.tick(1);
    expect(game.world.players.p1?.flags.plumbed).toBe(true);
    expect(game.world.events.pending).toHaveLength(0);
    expect(game.world.notifications.p1).toHaveLength(0);
  });

  it("re-checks the guard of a scheduled event", () => {
    const content = bundle({
      events: [
        event("guarded", { trigger: { flag: "allowed" } }),
        event("starter", {
          hidden: true,
          options: [
            {
              id: "go",
              text_key: "o",
              effects: [{ fire_event: { id: "guarded", delay_days: 1 } }],
            },
          ],
        }),
      ],
      hooks: [{ id: "on_game_start", scope: "player", events: [{ id: "starter" }] }],
    });
    const blocked = createGame({ seed: "guard-a", content });
    blocked.tick(30);
    expect(blocked.world.log.some((entry) => entry.key === "log.event_skipped")).toBe(true);

    const allowed = createGame({
      seed: "guard-b",
      content,
      setup: (world) => {
        world.flags.allowed = true;
      },
    });
    allowed.tick(30);
    expect(
      allowed.world.log.some(
        (entry) => entry.key === "log.event_fired" && entry.vars.event === "guarded",
      ),
    ).toBe(true);
  });
});

describe("hooks", () => {
  function poolGame(seed: string): Game {
    return createGame({
      seed,
      content: bundle({
        events: [event("a"), event("b")],
        hooks: [
          {
            id: "detection_pulse",
            extends: "on_player_day",
            scope: "player",
            random_events: {
              pool: [
                { weight: { base: 100 }, id: "a" },
                { weight: { base: 100 }, id: "b" },
                { weight: { base: 100 }, id: null },
              ],
            },
          },
        ],
      }),
    });
  }

  it("draws at most one event per pool roll, including the null bucket", () => {
    const counts: Record<string, number> = { a: 0, b: 0, none: 0 };
    for (let seed = 0; seed < 30; seed += 1) {
      const game = poolGame(`pool-${seed}`);
      game.tick(24);
      const fired = game.world.log.filter((entry) => entry.key === "log.event_fired");
      expect(fired.length).toBeLessThanOrEqual(1);
      const bucket = fired.length === 0 ? "none" : String(fired[0]?.vars.event);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
    expect(counts.none).toBeGreaterThan(0);
  });

  it("gates a hook with its trigger and falls back when nothing fired", () => {
    const content = bundle({
      events: [event("gated", { trigger: { flag: "never" } }), event("backup")],
      hooks: [
        {
          id: "on_player_day",
          scope: "player",
          trigger: { flag: "hook_on" },
          first_valid: ["gated"],
          fallback: "backup",
        },
      ],
    });
    const off = createGame({ seed: "hook-off", content });
    off.tick(24);
    expect(off.world.log.filter((entry) => entry.key === "log.event_fired")).toHaveLength(0);

    const on = createGame({
      seed: "hook-on",
      content,
      setup: (world) => {
        world.flags.hook_on = true;
      },
    });
    on.tick(24);
    expect(
      on.world.log.filter(
        (entry) => entry.key === "log.event_fired" && entry.vars.event === "backup",
      ),
    ).toHaveLength(1);
  });

  it("chains hooks and stops at the depth limit", () => {
    const game = createGame({
      seed: "chain",
      content: bundle({
        events: [event("deep")],
        hooks: [
          { id: "on_game_start", scope: "player", hooks: ["loop"] },
          {
            id: "loop",
            extends: "on_player_hour",
            scope: "player",
            hooks: ["loop"],
            events: [{ id: "deep" }],
          },
        ],
      }),
    });
    game.tick(1);
    expect(game.world.log.some((entry) => entry.key === "log.hook_too_deep")).toBe(true);
    // The event is only allowed to fire once per player, so the loop cannot spam it.
    expect(
      game.world.log.filter(
        (entry) => entry.key === "log.event_fired" && entry.vars.event === "deep",
      ).length,
    ).toBeGreaterThan(0);
  });
});
