import { describe, expect, it } from "vitest";
import type { ContentBundle, EventDef } from "../src/content.js";
import { cumulativeProbability } from "../src/dsl/mtth.js";
import { createGame } from "../src/index.js";
import { bundle } from "./helpers.js";

/** One polled event with a 30-day MTTH and no modifiers. */
const baseEvent: EventDef = {
  id: "det_billing_anomaly",
  fire_mode: "polled",
  pulse: "on_player_day",
  scope: "player",
  severity: "warning",
  title_key: "events.det_billing_anomaly.title",
  desc: { default_key: "events.det_billing_anomaly.desc" },
  mtth_days: 30,
  fire_only_once: true,
  options: [{ id: "ok", text_key: "opt.ok" }],
};

const content: ContentBundle = bundle({ events: [baseEvent] });

function firedWithin(seed: string, days: number): boolean {
  const game = createGame({ seed, content });
  game.tick(24 * days);
  return game.world.events.firedOnce["p1/det_billing_anomaly"] === true;
}

describe("scenario: mtth hazard", () => {
  it("fires at the rate the exponential model predicts", () => {
    const seeds = 300;
    for (const days of [30, 60]) {
      let fires = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        if (firedWithin(`mtth-${days}-${seed}`, days)) {
          fires += 1;
        }
      }
      const rate = fires / seeds;
      const expected = cumulativeProbability(30, days);
      expect(rate).toBeGreaterThan(expected - 0.06);
      expect(rate).toBeLessThan(expected + 0.06);
    }
  });

  it("makes an event with a factor modifier fire sooner", () => {
    const hot = bundle({
      events: [
        {
          ...baseEvent,
          mtth_days: { base: 30, modifiers: [{ if: { flag: "exposed" }, factor: 0.25 }] },
        },
      ],
    });
    let cold = 0;
    let warm = 0;
    for (let seed = 0; seed < 120; seed += 1) {
      const calm = createGame({ seed: `mod-${seed}`, content: hot });
      calm.tick(24 * 10);
      if (calm.world.events.firedOnce["p1/det_billing_anomaly"] === true) {
        cold += 1;
      }
      const exposed = createGame({
        seed: `mod-${seed}`,
        content: hot,
        setup: (world) => {
          world.flags.exposed = true;
        },
      });
      exposed.tick(24 * 10);
      if (exposed.world.events.firedOnce["p1/det_billing_anomaly"] === true) {
        warm += 1;
      }
    }
    expect(warm).toBeGreaterThan(cold * 2);
  });
});
