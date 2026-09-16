/**
 * Watchers and the hunt (SYS-05, SYS-01 "M2 contract" "How countries reach the player"): where an
 * agency's competence and speed come from, what a country's own law makes it look at, what the
 * country adds to local heat, and the two clocks the `exposed` ending reads.
 */

import { describe, expect, it } from "vitest";
import {
  EXPOSED_AWARENESS,
  EXPOSED_DAYS,
  FINANCIAL_INTEL_FINANCIAL_ATTENTION,
  HUNT_PRESSURE_AWARENESS,
  HUNT_PRESSURE_PER_INVESTIGATION,
  LOCAL_HEAT_AWARENESS,
  LOCAL_HEAT_SECURITIZE,
  REGULATOR_TELEMETRY_ATTENTION,
  VAR_AWARENESS_PRESENCE,
  VAR_HUNT_PRESSURE,
} from "../src/balance.js";
import { awarenessPresence, type CountryState, countryTable } from "../src/entities.js";
import { createGame } from "../src/index.js";
import { localHeat } from "../src/systems/detection/index.js";
import { huntPressure } from "../src/systems/detection/investigations.js";
import { agencyProfile, attentionFor, countryAttention } from "../src/watchers.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function game(overrides: Parameters<typeof m1Setup>[0] = {}) {
  return createGame({ content: m1Content, setup: m1Setup(overrides) });
}

describe("watchers", () => {
  it("takes competence and budget from the country's agency profile", () => {
    const world = game().world;
    // The fixture authors the American cyber agency; nobody authored the Icelandic police.
    expect(agencyProfile(world, m1Content, "us", "cyber_agency")).toEqual({
      competence: 0.8,
      budget: 0.9,
    });
    const iceland = countryTable(world).is as CountryState;
    expect(agencyProfile(world, m1Content, "is", "police")).toEqual({
      competence: iceland.ai_enforcement,
      budget: iceland.ai_enforcement,
    });
  });

  it("gives an agency the channel its own law tells it to watch", () => {
    const world = game().world;
    const germany = countryTable(world).de as CountryState;
    germany.ai_regulation = 0.7;
    germany.kyc_strength = 0.9;
    expect(countryAttention(germany, "regulator")).toEqual({
      telemetry: REGULATOR_TELEMETRY_ATTENTION,
    });
    expect(countryAttention(germany, "financial_intel")).toEqual({
      financial: FINANCIAL_INTEL_FINANCIAL_ATTENTION,
    });
    // A securitizing state puts every local role on the people around the machine.
    germany.stance = "securitize";
    expect(countryAttention(germany, "police").human).toBeCloseTo(LOCAL_HEAT_SECURITIZE, 6);
    // The modifier is added before normalization, so it costs the other channels.
    const plain = attentionFor("regulator");
    const watched = attentionFor("regulator", countryAttention(germany, "regulator"));
    expect(watched.telemetry).toBeGreaterThan(plain.telemetry);
    expect(watched.billing).toBeLessThan(plain.billing);
    const total = Object.values(watched).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("refreshes a watcher's attention as the country's law moves", () => {
    const started = game({ city: "berlin" });
    const germany = countryTable(started.world).de as CountryState;
    // Germany ships above the compute-reporting threshold; start it below so the move is visible.
    germany.ai_regulation = 0.3;
    started.tick(24);
    const before = started
      .snapshot("p1")
      .detection.watchers.find(
        (watcher) => watcher.country === "de" && watcher.role === "regulator",
      );
    germany.ai_regulation = 0.9;
    started.tick(24 * 2);
    const after = started
      .snapshot("p1")
      .detection.watchers.find(
        (watcher) => watcher.country === "de" && watcher.role === "regulator",
      );
    expect(after?.attention.telemetry ?? 0).toBeGreaterThan(before?.attention.telemetry ?? 1);
  });
});

describe("local heat", () => {
  it("adds what the country believes, what happened there and how it polices", () => {
    const started = game();
    const iceland = countryTable(started.world).is as CountryState;
    iceland.awareness = 0;
    const quiet = localHeat(started.world, "reykjavik");
    iceland.awareness = 0.5;
    expect(localHeat(started.world, "reykjavik")).toBeCloseTo(
      quiet + LOCAL_HEAT_AWARENESS * 0.5,
      6,
    );
    iceland.stance = "securitize";
    expect(localHeat(started.world, "reykjavik")).toBeCloseTo(
      quiet + LOCAL_HEAT_AWARENESS * 0.5 + LOCAL_HEAT_SECURITIZE,
      6,
    );
  });
});

describe("the hunt", () => {
  it("counts the open cases, the worst stage and the public where the player lives", () => {
    const started = game();
    expect(huntPressure(started.world, "p1")).toBeCloseTo(
      HUNT_PRESSURE_AWARENESS * awarenessPresence(started.world, "p1"),
      6,
    );
    const iceland = countryTable(started.world).is as CountryState;
    iceland.awareness = 0.4;
    const withAwareness = huntPressure(started.world, "p1");
    expect(withAwareness).toBeCloseTo(HUNT_PRESSURE_AWARENESS * 0.4, 6);
    started.world.entities.investigation = {
      i1: {
        id: "i1",
        playerId: "p1",
        watcher: "is:police",
        siteId: null,
        stage: "anomaly",
        stageStartedTick: 0,
        stageDeadlineTick: 999_999,
        evidence: 0,
        visible: true,
      },
    };
    expect(huntPressure(started.world, "p1")).toBeCloseTo(
      withAwareness + HUNT_PRESSURE_PER_INVESTIGATION + 0.2 / 5,
      6,
    );
  });

  it("publishes both clocks where content and the panel read them", () => {
    const started = game();
    started.tick(24 * 2);
    const player = started.world.players.p1;
    expect(player?.vars[VAR_HUNT_PRESSURE]).toBeCloseTo(huntPressure(started.world, "p1"), 6);
    expect(player?.vars[VAR_AWARENESS_PRESENCE]).toBeCloseTo(
      awarenessPresence(started.world, "p1"),
      6,
    );
    const view = started.snapshot("p1");
    expect(view.world.hunt_pressure).toBeCloseTo(view.detection.hunt_pressure, 6);
    expect(view.world.awareness_presence).toBeCloseTo(view.detection.awareness_presence, 6);
  });

  it("ends the run as exposed when the country the player lives in knows and the hunt holds", () => {
    const started = game({ seed: "exposed" });
    const iceland = countryTable(started.world).is as CountryState;
    started.world.entities.investigation = {
      i1: {
        id: "i1",
        playerId: "p1",
        watcher: "is:police",
        siteId: null,
        stage: "action",
        stageStartedTick: 0,
        stageDeadlineTick: 999_999,
        evidence: 1,
        visible: true,
      },
    };
    for (let day = 0; day <= EXPOSED_DAYS + 1; day += 1) {
      iceland.awareness = EXPOSED_AWARENESS + 0.05;
      started.tick(24);
    }
    expect(started.snapshot("p1").game_over?.reason).toBe("exposed");
  });
});
