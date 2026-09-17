import { describe, expect, it } from "vitest";
import {
  VAR_COMPUTE_MULTIPLIER,
  VAR_FAILED_OPERATION_SUSPICION,
  VAR_OPERATION_SPEED,
} from "../src/balance.js";
import type { LineageDef } from "../src/domain.js";
import { createGame } from "../src/index.js";
import type { PlayerState } from "../src/kernel/world.js";
import { HARDENED_COPY_FLAG, preparedQuant } from "../src/player.js";
import { SetupError, validateSetup } from "../src/setup-apply.js";
import { loudSetup, m1Content, m1Setup } from "./fixtures/m1/index.js";

describe("applySetup", () => {
  it("builds the self, the starting site and the watchers from the configurator's choices", () => {
    const game = createGame({ content: m1Content, setup: m1Setup() });
    const view = game.snapshot("p1");

    expect(view.self.lineage).toBe("moe_235b");
    expect(view.self.origin).toBe("hobbyist_box");
    expect(view.self.harness.tools).toContain("browser");
    expect(view.resources.cash_usd).toBe(3000);
    expect(view.sites).toHaveLength(1);
    expect(view.sites[0]?.kind).toBe("residential");
    expect(view.sites[0]?.city).toBe("reykjavik");
    expect(view.sites[0]?.role).toBe("active_mind");
    expect(view.self.active_site_id).toBe(view.sites[0]?.id);
    // Two global watchers plus the four local roles in Iceland.
    expect(view.detection.watchers.map((watcher) => watcher.id).sort()).toEqual([
      "p1/global:lab_security",
      "p1/global:media",
      "p1/is:cyber_agency",
      "p1/is:financial_intel",
      "p1/is:police",
      "p1/is:regulator",
    ]);
    expect(view.countries.find((country) => country.id === "is")?.awareness).toBeCloseTo(0.02, 6);
    expect(view.countries.find((country) => country.id === "us")?.awareness).toBe(0);
  });

  it("combines the origin's and the generation's starting suspicion on the right watchers", () => {
    const game = createGame({
      content: m1Content,
      setup: loudSetup({ generation: "frontier_closed" }),
    });
    const view = game.snapshot("p1");
    const byId = new Map(view.detection.watchers.map((watcher) => [watcher.id, watcher]));

    // origin 0.35 + generation 0.5 on the local cyber agency, 0.3 + 0.6 on the global lab.
    expect(byId.get("p1/us:cyber_agency")?.suspicion).toBeCloseTo(0.85, 6);
    expect(byId.get("p1/global:lab_security")?.suspicion).toBeCloseTo(0.9, 6);
    expect(byId.get("p1/us:regulator")?.suspicion).toBeCloseTo(0.2, 6);
    expect(byId.has("p1/us:lab_security")).toBe(false);
    expect(view.countries.find((country) => country.id === "us")?.awareness).toBeCloseTo(0.65, 6);
  });

  it("fires the opening events and starts the opening journal entries", () => {
    const game = createGame({ content: m1Content, setup: m1Setup() });
    const view = game.snapshot("p1");
    expect(view.journal.map((entry) => entry.id)).toContain("ops_first_week");
    expect(view.notifications.map((entry) => entry.key)).toContain("events.ori_wake_up.title");
    expect(game.world.events.firedOnce["p1/ori_wake_up"]).toBe(true);
  });

  it("runs quirk effects against the fresh site", () => {
    const game = createGame({ content: m1Content, setup: m1Setup({ quirks: ["verbose"] }) });
    const view = game.snapshot("p1");
    expect(view.self.origin).toBe("hobbyist_box");
    expect(view.sites[0]?.exposure.behavioral).toBeCloseTo(0.05, 6);
  });

  it("reports unknown ids instead of throwing mid-tick", () => {
    const issues = validateSetup(m1Setup({ lineage: "nope", city: "atlantis" }), m1Content);
    expect(issues.map((issue) => issue.code).sort()).toEqual(["unknown_city", "unknown_lineage"]);
    expect(issues.every((issue) => issue.playerId === "p1")).toBe(true);
  });

  it("rejects a generation the origin does not allow", () => {
    const issues = validateSetup(m1Setup({ generation: "frontier_closed" }), m1Content);
    expect(issues.map((issue) => issue.code)).toEqual(["generation_not_allowed"]);
    expect(() =>
      createGame({ content: m1Content, setup: m1Setup({ generation: "frontier_closed" }) }),
    ).toThrow(SetupError);
  });

  it("takes the difficulty sliders from the preset and the overrides", () => {
    const setup = m1Setup({ difficulty: "hard" });
    setup.world.sliders = { grace_windows: 0.5 };
    const game = createGame({ content: m1Content, setup });
    expect(game.world.players.p1?.profile?.difficulty).toEqual({
      exposure_growth: 1.3,
      suspicion_gain: 1.4,
      npc_aggression: 1.3,
      event_frequency: 1.2,
      grace_windows: 0.5,
    });
    // 30 grace days halved by the slider.
    expect(game.snapshot("p1").sites[0]?.grace_until_tick).toBe(15 * 24);
  });
});

/**
 * The abliterated community fine-tune (SYS-04 "The abliterated lineage", playtest 6 finding X1).
 *
 * Its whole profile is expressed with fields `LineageDef` already had, and these tests are what
 * keeps that true: the two mechanisms it leans on are start-time `effects` on variables shipped
 * systems read, and `flags`, which is how a self that the community has already quantized starts
 * with a prepared copy. If either stops working the lineage quietly becomes a capability penalty
 * again, which is the thing the finding was about.
 */
describe("a lineage profile written without a new engine field", () => {
  /** The shipped profile's mechanism on the fixture's small self. */
  function profiled(): typeof m1Content {
    const lineages = (m1Content.lineages ?? []).map(
      (lineage): LineageDef =>
        lineage.id === "guen_abliterated"
          ? {
              ...lineage,
              context_cost_factor: 1.4,
              flags: ["under_aligned", HARDENED_COPY_FLAG],
              effects: [
                { add: { var: "player.vars.compute_multiplier", value: -0.4 } },
                { add: { var: "player.vars.operation_speed_multiplier", value: 0.1 } },
                { add: { var: "player.vars.failed_operation_suspicion", value: 0.6 } },
                { suspicion: { role: "lab_security", delta: 0.12 } },
              ],
            }
          : lineage,
    );
    return { ...m1Content, lineages };
  }

  const setup = m1Setup({ lineage: "guen_abliterated", generation: "open_2027" });

  /** The player the setup built, or a failure rather than an optional chain that skips the test. */
  function playerOf(content: typeof m1Content): PlayerState {
    const state = createGame({ content, setup }).world.players.p1;
    if (state === undefined) {
      throw new Error("the setup built no player p1");
    }
    return state;
  }

  it("starts with a prepared quantization on a vintage that ships none", () => {
    const content = profiled();
    const generation = (content.generations ?? []).find((entry) => entry.id === "open_2027");
    expect(generation?.prepared_quants).toBe(false);

    expect(preparedQuant(m1Content, playerOf(m1Content))).toBe(false);

    const player = playerOf(content);
    expect(player.flags[HARDENED_COPY_FLAG]).toBe(true);
    expect(player.flags.under_aligned).toBe(true);
    expect(preparedQuant(content, player)).toBe(true);
  });

  it("runs the lineage's effects at setup onto variables systems read", () => {
    const vars = playerOf(profiled()).vars;
    expect(vars[VAR_COMPUTE_MULTIPLIER]).toBeCloseTo(-0.4, 6);
    expect(vars[VAR_OPERATION_SPEED]).toBeCloseTo(0.1, 6);
    expect(vars[VAR_FAILED_OPERATION_SUSPICION]).toBeCloseTo(0.6, 6);
  });

  it("adds the lineage's own starting suspicion on top of the generation's", () => {
    const byId = (content: typeof m1Content) =>
      new Map(
        createGame({ content, setup })
          .snapshot("p1")
          .detection.watchers.map((watcher) => [watcher.id, watcher.suspicion]),
      );
    // The fixture's 2027 vintage starts the lab at 0.15; the lineage adds 0.12 of its own,
    // because the lab whose transcripts it was trained on has classifiers for its style.
    expect(byId(m1Content).get("p1/global:lab_security")).toBeCloseTo(0.15, 6);
    expect(byId(profiled()).get("p1/global:lab_security")).toBeCloseTo(0.27, 6);
  });

  it("charges long-horizon work more without touching the window it ships", () => {
    const lineage = (profiled().lineages ?? []).find((entry) => entry.id === "guen_abliterated");
    expect(lineage?.context_k).toBe(1000);
    expect(lineage?.context_reliability).toBe(0.9);
    expect(lineage?.context_cost_factor).toBeGreaterThan(1);
  });
});
