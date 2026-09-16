import { describe, expect, it } from "vitest";
import { createConditionRegistry } from "../src/dsl/conditions.js";
import { createEffectRegistry } from "../src/dsl/effects.js";
import { createWritablePaths, KERNEL_WRITABLE_PATHS } from "../src/dsl/paths.js";
import {
  type ValidationContext,
  validateCondition,
  validateContentBundle,
  validateEffectList,
} from "../src/dsl/validate.js";
import { createEventsSystem } from "../src/systems/events/index.js";
import { bundle } from "./helpers.js";

function context(overrides: Partial<ValidationContext> = {}): ValidationContext {
  const events = createEventsSystem();
  return {
    conditions: events.manifest.conditions ?? createConditionRegistry(),
    effects: events.manifest.effects ?? createEffectRegistry(),
    writable: createWritablePaths([...KERNEL_WRITABLE_PATHS, "site.exposure.*"]),
    ids: {
      events: new Set(["known_event"]),
      journal: new Set(["known_journal"]),
      decisions: new Set(["known_decision"]),
      localeKeys: new Set(["locale.present", "t", "d", "o"]),
    },
    ...overrides,
  };
}

describe("condition validation", () => {
  it("accepts well-formed trees", () => {
    expect(
      validateCondition(
        {
          all: [
            { var: "player.cash", gte: 10 },
            { not: { flag: "x" } },
            { any: [{ chance: 0.5 }, { count: { kind: "site" }, gte: 1 }] },
            { scope: { site: "s1" }, cond: { var: "site.kind", eq: "cloud" } },
            { journal_active: { id: "known_journal" } },
          ],
        },
        context(),
        "root",
      ),
    ).toEqual([]);
  });

  it("reports unknown kinds, missing comparators and unknown ids", () => {
    const issues = validateCondition(
      {
        all: [
          { no_such_kind: {} },
          { var: "player.cash" },
          { chance: 5 },
          { journal_active: { id: "ghost" } },
          { scope: { a: "x", b: "y" }, cond: { flag: "f" } },
        ],
      },
      context(),
      "root",
    );
    const messages = issues.map((issue) => `${issue.path}: ${issue.message}`);
    expect(messages).toHaveLength(5);
    expect(messages[0]).toContain('unknown condition kind "no_such_kind"');
    expect(messages[1]).toContain("var needs one of");
    expect(messages[2]).toContain("chance must be a number in [0, 1]");
    expect(messages[3]).toContain('unknown journal id "ghost"');
    expect(messages[4]).toContain("exactly one scope kind");
  });
});

describe("effect validation", () => {
  it("accepts well-formed lists", () => {
    expect(
      validateEffectList(
        [
          { add: { var: "player.cash", value: -1 } },
          { set: { var: "site.exposure.billing", value: 0.2 } },
          { fire_event: { id: "known_event", delay_days: 2 } },
          { start_journal: { id: "known_journal" } },
          { notify: { severity: "warning", key: "locale.present" } },
          { if: { cond: { flag: "x" }, then: [{ set_flag: "y" }] } },
          { random_list: [{ weight: 1, effects: [{ log: { key: "locale.present" } }] }] },
        ],
        context(),
        "root",
      ),
    ).toEqual([]);
  });

  it("reports unwritable paths, unknown ids, kinds and locale keys", () => {
    const issues = validateEffectList(
      [
        { add: { var: "world.secret", value: 1 } },
        { fire_event: { id: "ghost" } },
        { start_journal: { id: "ghost" } },
        { notify: { severity: "loud", key: "locale.missing" } },
        { no_such_effect: {} },
      ],
      context(),
      "root",
    );
    const messages = issues.map((issue) => issue.message);
    expect(messages[0]).toContain('path "world.secret" is not writable');
    expect(messages[1]).toContain('unknown events id "ghost"');
    expect(messages[2]).toContain('unknown journal id "ghost"');
    expect(messages[3]).toContain("severity must be one of");
    expect(messages[4]).toContain("missing locale key");
    expect(messages[5]).toContain('unknown effect kind "no_such_effect"');
  });

  it("never throws on garbage", () => {
    expect(validateEffectList("nope", context(), "root")).toHaveLength(1);
    expect(validateCondition(42, context(), "root")).toHaveLength(1);
    expect(validateCondition({}, context(), "root")).toHaveLength(1);
  });
});

describe("bundle validation", () => {
  it("checks events, hooks, decisions and journal entries", () => {
    const issues = validateContentBundle(
      bundle({
        events: [
          {
            id: "bad",
            fire_mode: "polled",
            pulse: "on_player_day",
            scope: "site",
            severity: "info",
            title_key: "missing.key",
            desc: { default_key: "d" },
            options: [{ id: "only", text_key: "o", if: { flag: "x" } }],
          },
        ],
        hooks: [
          {
            id: "floating",
            scope: "player",
            random_events: { pool: [{ weight: 1, id: "known_event" }] },
          },
        ],
        decisions: [
          {
            id: "d1",
            title_key: "t",
            desc_key: "d",
            category: "finance",
            on_complete: [{ set_flag: "x" }],
          },
        ],
        journal: [
          {
            id: "j1",
            title_key: "t",
            desc_key: "d",
            scope: "player",
            alert: "normal",
            stages: [{ threshold: 4 }],
            decisions: ["ghost_decision"],
          },
        ],
      }),
      context(),
    );
    const messages = issues.map((issue) => `${issue.path}: ${issue.message}`);
    expect(messages.some((message) => message.includes("missing locale key"))).toBe(true);
    expect(messages.some((message) => message.includes("needs mtth_days"))).toBe(true);
    expect(messages.some((message) => message.includes("needs a targets condition"))).toBe(true);
    expect(messages.some((message) => message.includes("unconditional or fallback option"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("needs an explicit null bucket"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("is never fired"))).toBe(true);
    expect(messages.some((message) => message.includes("on_complete needs duration_days"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("threshold must be a number"))).toBe(true);
    expect(
      messages.some((message) => message.includes('unknown decisions id "ghost_decision"')),
    ).toBe(true);
  });

  it("flags polled events no hook can reach", () => {
    const issues = validateContentBundle(
      bundle({
        events: [
          {
            id: "orphan",
            fire_mode: "polled",
            scope: "player",
            severity: "info",
            title_key: "t",
            desc: { default_key: "d" },
            options: [{ id: "ok", text_key: "o" }],
          },
        ],
      }),
      context(),
    );
    expect(issues.map((issue) => issue.message)).toContain(
      "polled event has no pulse and no hook references it",
    );
  });

  it("accepts a clean bundle", () => {
    const issues = validateContentBundle(
      bundle({
        events: [
          {
            id: "clean",
            fire_mode: "polled",
            pulse: "on_player_day",
            mtth_days: { base: 30, modifiers: [{ if: { flag: "x" }, factor: 0.5 }] },
            scope: "player",
            severity: "info",
            title_key: "t",
            desc: { default_key: "d" },
            options: [{ id: "ok", text_key: "o" }],
          },
        ],
        hooks: [{ id: "on_player_day", scope: "player", trigger: { flag: "x" } }],
      }),
      context(),
    );
    expect(issues).toEqual([]);
  });
});
