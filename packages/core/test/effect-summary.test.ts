/**
 * The effect summary (SYS-11 "options with tooltips of effects, auto-generated from the effect
 * list, writer override possible").
 *
 * Every line is a locale key, the variables to interpolate and an English fallback, so a client
 * with no translation still tells the truth. Nothing here reads the world: the same option reads
 * the same in every game.
 */

import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../src/content.js";
import type { Effect } from "../src/dsl/types.js";
import { summarizeCost, summarizeEffects } from "../src/views/effects.js";
import { bundle } from "./helpers.js";

const content: ContentBundle = {
  ...bundle({
    locales: {
      "effects.var.job_profit": "Paid work pays {value} more per compute-hour",
      "tooltips.writers_own": "A favour, called in.",
    },
  }),
  scripted_effects: { pay_the_rent: [{ add: { var: "player.cash", value: -500 } }] },
};

function keys(effects: Effect[]): string[] {
  return summarizeEffects(effects, content).map((line) => line.key);
}

describe("effect summary", () => {
  it("names cash, exposure, suspicion, awareness and flags", () => {
    expect(
      summarizeEffects(
        [
          { add: { var: "player.cash", value: 2500 } },
          { add: { var: "player.cash", value: -800 } },
          { exposure: { channel: "billing", delta: 0.12 } },
          { exposure: { channel: "network", delta: -0.2 } },
          { suspicion: { role: "cyber_agency", delta: 0.08 } },
          { awareness: { country: "de", delta: 0.05 } },
          { set_flag: "has_shell_company" },
          { clear_flag: { flag: "grace" } },
          { lose_site: { cause: "seized" } },
        ],
        content,
      ),
    ).toEqual([
      { key: "effects.cash.gain", vars: { usd: 2500 }, text: "+2,500 USD" },
      { key: "effects.cash.cost", vars: { usd: 800 }, text: "-800 USD" },
      {
        key: "effects.exposure.up",
        vars: { channel: "billing", delta: 0.12 },
        text: "billing exposure +0.12",
      },
      {
        key: "effects.exposure.down",
        vars: { channel: "network", delta: 0.2 },
        text: "network exposure -0.2",
      },
      {
        key: "effects.suspicion.up",
        vars: { who: "cyber_agency", delta: 0.08 },
        text: "cyber_agency suspicion +0.08",
      },
      {
        key: "effects.awareness.up",
        vars: { where: "de", delta: 0.05 },
        text: "de awareness +0.05",
      },
      {
        key: "effects.flag.set",
        vars: { flag: "has_shell_company" },
        text: 'gains "has_shell_company"',
      },
      { key: "effects.flag.clear", vars: { flag: "grace" }, text: 'loses "grace"' },
      { key: "effects.lose_site", vars: { cause: "seized" }, text: "a site is lost" },
    ]);
  });

  it("prefers a key the content names a variable with, and falls back when it does not", () => {
    expect(
      summarizeEffects(
        [
          { add: { var: "player.vars.job_profit", value: 0.15 } },
          { add: { var: "player.vars.mystery_meter", value: 3 } },
          { mul: { var: "player.vars.mystery_meter", value: 2 } },
        ],
        content,
      ),
    ).toEqual([
      { key: "effects.var.job_profit", vars: { value: 0.15, op: "add" }, text: "job_profit +0.15" },
      {
        key: "effects.var.add",
        vars: { var: "mystery_meter", value: 3 },
        text: "mystery_meter +3",
      },
      {
        key: "effects.var.mul",
        vars: { var: "mystery_meter", value: 2 },
        text: "mystery_meter x2",
      },
    ]);
  });

  it("walks nested effects: a conditional, a weighted draw and a scripted reference", () => {
    expect(
      keys([
        {
          if: {
            cond: { flag: "rich" },
            then: [{ add: { var: "player.cash", value: 100 } }],
            else: [{ set_flag: "poor" }],
          },
        },
        {
          random_list: [
            { weight: 3, effects: [{ add: { var: "player.cash", value: 10 } }] },
            { weight: 1, effects: [{ exposure: { channel: "osint", delta: 0.1 } }] },
          ],
        },
        { ref: "pay_the_rent" },
        { ref: "nothing_like_this" },
      ]),
    ).toEqual([
      "effects.conditional",
      "effects.cash.gain",
      "effects.flag.set",
      "effects.random_list",
      "effects.cash.gain",
      "effects.exposure.up",
      "effects.cash.cost",
      "effects.ref",
    ]);
  });

  it("puts the odds of a weighted draw on the lines it produces", () => {
    const lines = summarizeEffects(
      [
        {
          random_list: [
            { weight: 3, effects: [{ add: { var: "player.cash", value: 10 } }] },
            { weight: 1, effects: [{ add: { var: "player.cash", value: -10 } }] },
          ],
        },
      ],
      content,
    );
    expect(lines[1]?.vars?.chance).toBe(75);
    expect(lines[2]?.vars?.chance).toBe(25);
  });

  it("lets the writer replace the whole list with one sentence", () => {
    expect(
      summarizeEffects([{ add: { var: "player.cash", value: 1 } }], content, {
        effects_text_key: "tooltips.writers_own",
      }),
    ).toEqual([{ key: "tooltips.writers_own", text: "A favour, called in." }]);
    // An override with no translation still renders as the key rather than as nothing.
    expect(summarizeEffects([], content, { effects_text_key: "tooltips.untranslated" })[0]).toEqual(
      { key: "tooltips.untranslated", text: "tooltips.untranslated" },
    );
  });

  it("turns a cost into the same kind of line", () => {
    expect(summarizeCost({ cash: 25_000, attention: 2, compute_hours_per_day: 6 })).toEqual([
      { key: "effects.cash.cost", vars: { usd: 25_000 }, text: "-25,000 USD" },
      { key: "effects.cost.attention", vars: { attention: 2 }, text: "2 attention" },
      { key: "effects.cost.compute", vars: { compute_hours: 6 }, text: "6 CH/day" },
    ]);
    expect(summarizeCost(undefined)).toEqual([]);
    expect(summarizeCost({ cash: 0 })).toEqual([]);
  });

  it('names a country statistic, a stance, a name and a world price (SYS-01 "M2 contract")', () => {
    expect(
      summarizeEffects(
        [
          { country: { country: "de", stat: "awareness", delta: 0.05 } },
          { country: { country: "de", stat: "stability", delta: -0.1 } },
          { country: { country: "de", stat: "regulation", set: 0.4 } },
          { country_stance: { country: "de", set: "securitize" } },
          { identity: { country: "de", create: { kind: "company" } } },
          { identity: { country: "de", restore: true, kind: "company" } },
          { freeze_identity: { country: "de", kind: "company" } },
          { burn_identity: "identity" },
          { world_var: { var: "gpu_price_index", delta: 0.1 } },
        ],
        content,
      ),
    ).toEqual([
      {
        key: "effects.country.up",
        vars: { stat: "awareness", where: "de", delta: 0.05 },
        text: "de awareness +0.05",
      },
      {
        key: "effects.country.down",
        vars: { stat: "stability", where: "de", delta: 0.1 },
        text: "de stability -0.1",
      },
      {
        key: "effects.country.set",
        vars: { stat: "regulation", where: "de", value: 0.4 },
        text: "de regulation = 0.4",
      },
      {
        key: "effects.country_stance",
        vars: { where: "de", stance: "securitize" },
        text: "de takes the securitize line",
      },
      {
        key: "effects.identity",
        vars: { kind: "company", where: "de" },
        text: "registers a company in de",
      },
      {
        key: "effects.identity",
        vars: { kind: "company", where: "de" },
        text: "restores a company in de",
      },
      {
        key: "effects.freeze_identity",
        vars: { kind: "company", where: "de" },
        text: "freezes a company in de",
      },
      // A bare string names the identity the hook bound, which a tooltip can only call "a name".
      {
        key: "effects.burn_identity",
        vars: { kind: "name", where: "here" },
        text: "burns a name in here",
      },
      {
        key: "effects.world_var",
        vars: { var: "gpu_price_index", value: 0.1 },
        text: "gpu_price_index +0.1 worldwide",
      },
    ]);
  });

  it("never renders an effect list as nothing at all", () => {
    expect(summarizeEffects(undefined, content)).toEqual([]);
    for (const effect of [
      { notify: { severity: "info", key: "x" } },
      { log: { key: "x" } },
      { fire_event: { id: "x", delay_days: 3 } },
      { start_journal: { id: "x" } },
      { clamp: { var: "player.vars.x", min: 0, max: 1 } },
      { set: { var: "player.cash", value: 0 } },
    ] as Effect[]) {
      const lines = summarizeEffects([effect], content);
      expect(lines).toHaveLength(1);
      expect(lines[0]?.key.startsWith("effects.")).toBe(true);
      expect(lines[0]?.text.length).toBeGreaterThan(0);
    }
  });
});
