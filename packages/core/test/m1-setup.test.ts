import { describe, expect, it } from "vitest";
import { createGame } from "../src/index.js";
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
