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
  HANDOVER_EVIDENCE_SHARE,
  HANDOVER_LOCAL_SUSPICION,
  HUNT_PRESSURE_AWARENESS,
  HUNT_PRESSURE_PER_INVESTIGATION,
  LOCAL_HEAT_AWARENESS,
  LOCAL_HEAT_SECURITIZE,
  REGULATOR_TELEMETRY_ATTENTION,
  VAR_AWARENESS_PRESENCE,
  VAR_HUNT_PRESSURE,
} from "../src/balance.js";
import type { Investigation } from "../src/domain.js";
import {
  awarenessPresence,
  type CountryState,
  countryTable,
  investigationTable,
  watcherTable,
} from "../src/entities.js";
import { createGame, type Game } from "../src/index.js";
import { localHeat, localHeatTerms } from "../src/systems/detection/index.js";
import { huntPressure, openInvestigationFor } from "../src/systems/detection/investigations.js";
import { agencyProfile, attentionFor, countryAttention } from "../src/watchers.js";
import { loudSetup, m1Content, m1Setup } from "./fixtures/m1/index.js";

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

  it("publishes the lines the figure is made of, and they add up to it", () => {
    // M2 second pass: the City panel's tooltip is the same arithmetic the simulation runs.
    const started = game();
    const iceland = countryTable(started.world).is as CountryState;
    iceland.awareness = 0.4;
    iceland.stance = "securitize";
    const terms = localHeatTerms(started.world, "reykjavik");
    expect(terms.map((term) => term.key)).toEqual([
      "world.explain.heat.base",
      "world.explain.heat.scrutiny",
      "world.explain.heat.enforcement",
      "world.explain.heat.awareness",
      "world.explain.heat.incidents",
      "world.explain.heat.securitize",
    ]);
    const sum = terms.reduce((total, term) => total + term.value, 0);
    expect(sum).toBeCloseTo(localHeat(started.world, "reykjavik"), 9);
    // A city with no country behind it still reads, with the three lines it can answer.
    expect(localHeatTerms(started.world, "nowhere")).toHaveLength(3);
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

/**
 * A case the frontier lab has built, one hour from the stage that needs a warrant, with the local
 * agencies believing what the caller says they believe (SYS-05 "the handover").
 */
function caseAtTheDoor(seed: string, labSuspicion: number, local: Record<string, number>): Game {
  const started = createGame({ content: m1Content, setup: loudSetup({ seed }) });
  started.tick(24 * 40);
  expect(started.snapshot("p1").game_over).toBeNull();
  const watchers = watcherTable(started.world);
  for (const watcher of Object.values(watchers)) {
    if (watcher.playerId !== "p1") {
      continue;
    }
    const actor = watcher.id.split("/", 2)[1] ?? "";
    watcher.suspicion = actor === "global:lab_security" ? labSuspicion : (local[actor] ?? 0);
  }
  const site = started.snapshot("p1").sites.find((entry) => entry.status !== "lost");
  const investigation: Investigation = {
    id: "handover1",
    playerId: "p1",
    watcher: "global:lab_security",
    siteId: site?.id ?? null,
    stage: "active",
    stageStartedTick: started.world.clock.tick,
    stageDeadlineTick: started.world.clock.tick,
    evidence: 1,
    visible: true,
  };
  investigationTable(started.world).handover1 = investigation;
  return started;
}

describe("the handover (SYS-05 stage 4)", () => {
  it("gives the case to the agency with jurisdiction, with the file behind it", () => {
    const started = caseAtTheDoor("handover", 0.95, { "us:police": 0.6, "us:regulator": 0.2 });
    started.tick(1);
    const investigation = investigationTable(started.world).handover1 as Investigation;
    expect(investigation.stage).toBe("action");
    // The loudest American agency takes it, not the one that happens to be created first.
    expect(investigation.watcher).toBe("us:police");
    const police = watcherTable(started.world)["p1/us:police"];
    expect(police?.suspicion ?? 0).toBeGreaterThanOrEqual(0.95 * HANDOVER_EVIDENCE_SHARE - 1e-9);
    expect(started.world.log.some((entry) => entry.key === "log.investigation_handover")).toBe(
      true,
    );
    expect(
      started.snapshot("p1").notifications.some((e) => e.key === "alerts.investigation_handover"),
    ).toBe(true);
  });

  it("leaves the case with the analyst when nobody local believes the file", () => {
    // Just over the bar the `action` stage needs, so three quarters of it is under the bar an
    // agency has to clear to take the case on, and no local agency believes anything by itself.
    const labSuspicion = 0.72;
    expect(labSuspicion * HANDOVER_EVIDENCE_SHARE).toBeLessThan(HANDOVER_LOCAL_SUSPICION);
    const started = caseAtTheDoor("quiet-handover", labSuspicion, {});
    started.tick(1);
    const investigation = investigationTable(started.world).handover1 as Investigation;
    expect(investigation.stage).toBe("action");
    expect(investigation.watcher).toBe("global:lab_security");
    expect(started.world.log.some((entry) => entry.key === "log.investigation_handover")).toBe(
      false,
    );
  });

  it("folds the agency's own file into the case it is handed", () => {
    const started = caseAtTheDoor("handover", 0.95, { "us:police": 0.6 });
    // The American police already have a file of their own by day forty; it is the same siege.
    const own = openInvestigationFor(started.world, "p1", "us:police");
    expect(own).toBeDefined();
    started.tick(1);
    const table = investigationTable(started.world);
    expect(table[own?.id ?? ""]).toBeUndefined();
    expect((table.handover1 as Investigation).watcher).toBe("us:police");
    expect(Object.values(table).filter((entry) => entry.watcher === "us:police")).toHaveLength(1);
  });
});
