import { describe, expect, it } from "vitest";
import { mtthBreakdown } from "../src/dsl/mtth.js";
import type { Weight } from "../src/dsl/weight.js";
import { describeCondition, describeMtth } from "../src/explain.js";
import { createGame, type Game, loadGame } from "../src/index.js";
import { serialize } from "../src/kernel/save.js";
import { bundle } from "./helpers.js";

describe("describeCondition", () => {
  it("names each leaf of a condition tree", () => {
    const reasons = describeCondition({
      all: [
        { var: "player.cash", gte: 1000 },
        { tech: "spend_smoothing" },
        { not: { flag: "quiet_month" } },
      ],
    });
    expect(reasons.map((reason) => reason.key)).toEqual([
      "requirements.var.player.cash",
      "techs.spend_smoothing.name",
      "requirements.flag.quiet_month",
    ]);
    expect(reasons[0]?.text).toBe("player.cash >= 1000");
    expect(reasons[2]?.text).toBe("not flag quiet_month");
  });

  it("names a registered kind that a comparator sorts in front of", () => {
    // The content compiler sorts keys, so the kind is not reliably the first one.
    const reasons = describeCondition({ gte: 2, investigation_stage: {} });
    expect(reasons[0]?.key).toBe("requirements.investigation_stage");
    expect(reasons[0]?.text).toBe("investigation_stage >= 2");
  });

  it("returns nothing for an event with no trigger", () => {
    expect(describeCondition(undefined)).toEqual([]);
  });
});

describe("describeMtth", () => {
  const weight: Weight = {
    base: 60,
    modifiers: [
      { if: { var: "player.cash", gte: 100 }, factor: 0.5 },
      { if: { tech: "spend_smoothing" }, factor: 1.5 },
      { if: { flag: "never" }, add: 10 },
    ],
  };

  it("lists the base, the modifiers that applied and the result", () => {
    // The first two modifiers hold, the third does not.
    const breakdown = mtthBreakdown(weight, (condition) => condition.flag !== "never");
    const reasons = describeMtth(weight, breakdown);

    expect(reasons.map((reason) => reason.key)).toEqual([
      "events.why.mtth_base",
      "requirements.var.player.cash",
      "techs.spend_smoothing.name",
      "events.why.mtth_effective",
    ]);
    expect(reasons[1]?.factor).toBe(0.5);
    expect(reasons[3]?.vars?.days).toBe(45);
  });

  it("works for a plain number weight", () => {
    const breakdown = mtthBreakdown(30, () => true);
    expect(describeMtth(30, breakdown).map((reason) => reason.key)).toEqual([
      "events.why.mtth_base",
      "events.why.mtth_effective",
    ]);
  });
});

describe("pending choices carry their reasons", () => {
  const options = [
    { id: "pay", text_key: "opt.pay", effects: [] },
    { id: "ignore", text_key: "opt.ignore", effects: [] },
  ];

  function game(): Game {
    return createGame({
      seed: "why",
      content: bundle({
        events: [
          {
            id: "det_letter",
            fire_mode: "polled",
            pulse: "on_player_day",
            scope: "player",
            severity: "warning",
            title_key: "events.det_letter.title",
            desc: { default_key: "events.det_letter.desc" },
            trigger: { var: "player.cash", gte: 0 },
            mtth_days: {
              base: 2,
              modifiers: [{ if: { var: "player.cash", gte: 0 }, factor: 0.25 }],
            },
            options,
          },
        ],
      }),
    });
  }

  it("explains the mean time to happen and the trigger of a polled event", () => {
    const first = game();
    for (let day = 0; day < 40 && first.world.events.pending.length === 0; day += 1) {
      first.tick(24);
    }
    const choice = first.world.events.pending[0];
    expect(choice?.eventId).toBe("det_letter");
    expect(choice?.why?.map((reason) => reason.key)).toEqual([
      "events.why.mtth_base",
      "requirements.var.player.cash",
      "events.why.mtth_effective",
      "requirements.var.player.cash",
    ]);
    expect(choice?.why?.[1]?.factor).toBe(0.25);
    expect(choice?.why?.[2]?.vars?.days).toBe(0.5);
  });

  it("survives a save and a load", () => {
    const first = game();
    for (let day = 0; day < 40 && first.world.events.pending.length === 0; day += 1) {
      first.tick(24);
    }
    const reloaded = loadGame({ save: serialize(first.world), content: bundle() });
    expect(reloaded.world.events.pending[0]?.why?.length).toBe(4);
  });

  it("does not draw from the world rng", () => {
    // Two identical games stay identical: explanations are built from data already evaluated.
    const a = game();
    const b = game();
    a.tick(24 * 30);
    b.tick(24 * 30);
    expect(serialize(a.world)).toEqual(serialize(b.world));
  });
});
