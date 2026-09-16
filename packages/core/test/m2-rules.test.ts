/**
 * The world system's rules (SYS-01 "The world system", SYS-08, SYS-09): the daily decay, the
 * monthly politics and prices, the election, the spill, and the country pulse that is evaluated
 * once for the country and offered to everybody who lives there.
 */

import { describe, expect, it } from "vitest";
import {
  AWARENESS_DECAY_PER_DAY,
  ENFORCEMENT_LAG_PER_MONTH,
  PIN_AT_BOUND_MONTHS,
  PRICE_INDEX_MAX,
  PRICE_INDEX_MIN,
  REGULATION_SPEED_PER_MONTH,
  STANCE_REGULATION_TARGET,
  VAR_AI_ADOPTION,
  VAR_GPU_PRICE_INDEX,
} from "../src/balance.js";
import { type CountryState, countryTable, entityList } from "../src/entities.js";
import { createGame } from "../src/index.js";
import { createRng } from "../src/kernel/rng.js";
import { serialize } from "../src/kernel/save.js";
import { opinionDelta, regulationDelta, spillIndex } from "../src/systems/world/explain.js";
import { pinnedCountries, runElection } from "../src/systems/world/rules.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function game(overrides: Parameters<typeof m1Setup>[0] = {}) {
  return createGame({ content: m1Content, setup: m1Setup(overrides) });
}

/** A game with the fixture's M2 country events switched on. */
function worldGame(overrides: Parameters<typeof m1Setup>[0] = {}) {
  const started = game(overrides);
  started.world.flags.m2_events_on = true;
  return started;
}

describe("the world system", () => {
  it("runs the same world twice from one seed", () => {
    const first = game({ seed: "determinism" });
    const second = game({ seed: "determinism" });
    first.tick(24 * 400);
    second.tick(24 * 400);
    expect(serialize(first.world)).toBe(serialize(second.world));
  });

  it("lets awareness fade every day, and never below zero", () => {
    const started = game();
    const country = countryTable(started.world).de as CountryState;
    country.awareness = 0.5;
    started.tick(24 * 10);
    expect(country.awareness).toBeCloseTo(0.5 - 10 * AWARENESS_DECAY_PER_DAY, 6);
    country.awareness = 0.001;
    started.tick(24 * 5);
    expect(country.awareness).toBe(0);
  });

  it("moves regulation toward the stance's target at the government's speed", () => {
    const started = game();
    const germany = countryTable(started.world).de as CountryState;
    const before = germany.ai_regulation;
    const target = germany.regulation_target;
    expect(target).toBeCloseTo(STANCE_REGULATION_TARGET.regulate, 6);
    // The first of the next month.
    started.tick(24 * 31);
    const speed = REGULATION_SPEED_PER_MONTH.liberal_democracy;
    expect(germany.ai_regulation).toBeCloseTo(before + Math.min(speed, target - before), 6);
    expect(germany.ai_regulation).toBeLessThanOrEqual(target);
  });

  it("lets enforcement lag its budget and opinion follow what people have seen", () => {
    const started = game();
    const us = countryTable(started.world).us as CountryState;
    us.enforcement_budget = 0.9;
    us.awareness = 0.4;
    const enforcementBefore = us.ai_enforcement;
    const opinionBefore = us.ai_opinion;
    const expectedOpinion = opinionBefore + opinionDelta(us);
    started.tick(24 * 31);
    expect(us.ai_enforcement).toBeGreaterThan(enforcementBefore);
    expect(us.ai_enforcement).toBeLessThan(us.enforcement_budget);
    // The budget moves first and capacity follows what the budget then is (SYS-08 "it lags").
    expect(us.ai_enforcement).toBeCloseTo(
      enforcementBefore + ENFORCEMENT_LAG_PER_MONTH * (us.enforcement_budget - enforcementBefore),
      6,
    );
    // Awareness and displacement both push opinion down; the month applies exactly the terms the
    // country panel lists.
    expect(us.ai_opinion).toBeLessThan(opinionBefore);
    expect(us.ai_opinion).toBeCloseTo(expectedOpinion, 2);
  });

  it("carries awareness to the neighbours and to the language, never the other way", () => {
    const started = game();
    const countries = countryTable(started.world);
    const germany = countries.de as CountryState;
    const iceland = countries.is as CountryState;
    germany.awareness = 0.8;
    iceland.awareness = 0;
    started.tick(24 * 31);
    // Both are in `europe`, so Iceland hears about it; Germany is the source and gains nothing.
    expect(iceland.awareness).toBeGreaterThan(0);
    expect(germany.awareness).toBeLessThan(0.8);
  });

  it("keeps the price indexes inside their published band", () => {
    const started = game({ seed: "prices" });
    started.tick(24 * 370);
    for (const country of entityList<CountryState>(started.world, "country")) {
      expect(country.power_price_index).toBeGreaterThanOrEqual(PRICE_INDEX_MIN);
      expect(country.power_price_index).toBeLessThanOrEqual(PRICE_INDEX_MAX);
      expect(country.cloud_price_index).toBeGreaterThanOrEqual(PRICE_INDEX_MIN);
      expect(country.cloud_price_index).toBeLessThanOrEqual(PRICE_INDEX_MAX);
    }
    expect(started.world.vars[VAR_GPU_PRICE_INDEX]).toBeGreaterThanOrEqual(PRICE_INDEX_MIN);
    // A year of adoption at one point a month.
    expect(started.world.vars[VAR_AI_ADOPTION]).toBeCloseTo(0.2 + 12 * 0.01, 6);
  });

  it("reports a country that has sat on a bound for three months", () => {
    const started = game();
    const iceland = countryTable(started.world).is as CountryState;
    expect(pinnedCountries(started.world)).toEqual([]);
    iceland.pinned_months = PIN_AT_BOUND_MONTHS;
    expect(pinnedCountries(started.world)).toEqual(["is"]);
  });

  it("holds the election on the day the calendar says, and moves the calendar on", () => {
    const started = game({ seed: "election" });
    const us = countryTable(started.world).us as CountryState;
    const day = (us.next_election_tick ?? 0) / 24;
    expect(day).toBeGreaterThan(300);
    started.tick(24 * (day + 1));
    expect(us.next_election_tick).toBeGreaterThan(started.world.clock.tick);
    // Four years on, to the same November day.
    expect((us.next_election_tick ?? 0) / 24).toBeGreaterThan(day + 4 * 364);
    expect(started.world.log.some((entry) => entry.key === "log.election")).toBe(true);
  });

  it("draws the stance change from what the public believes", () => {
    const calm = countryTable(game().world).de as CountryState;
    calm.awareness = 0;
    calm.ai_opinion = 0;
    calm.stability = 0.95;
    const stanceBefore = calm.stance;
    // A settled, uninterested country keeps its line whatever the draw says.
    expect(runElection(calm, createRng("calm")).stance).toBe(stanceBefore);

    const frightened = countryTable(game().world).de as CountryState;
    frightened.awareness = 0.9;
    frightened.ai_opinion = -0.8;
    frightened.stability = 0.1;
    let shifted = false;
    for (let attempt = 0; attempt < 20 && !shifted; attempt += 1) {
      frightened.stance = "accelerate";
      shifted = runElection(frightened, createRng(`fright-${attempt}`)).changed;
    }
    expect(shifted).toBe(true);
    expect(frightened.stance).toBe("securitize");
  });

  it("uses the same spill index for every country in a month", () => {
    const started = game();
    const countries = countryTable(started.world);
    (countries.de as CountryState).awareness = 0.6;
    const iceland = countries.is as CountryState;
    const index = spillIndex(started.world, m1Content);
    expect(index.region_mean.europe).toBeCloseTo((0.6 + iceland.awareness) / 2, 6);
    expect(index.language_max.de).toBeCloseTo(0.6, 6);
  });

  it("names the terms behind the numbers it applies", () => {
    const view = game().snapshot("p1");
    const us = view.countries.find((country) => country.id === "us");
    expect(us?.explain.ai_regulation.map((line) => line.key)).toEqual([
      "world.explain.regulation.target",
      "world.explain.regulation.speed",
    ]);
    const state = countryTable(game().world).us as CountryState;
    expect(us?.explain.ai_regulation[1]?.value).toBeCloseTo(
      regulationDelta(
        m1Content.countries?.find((entry) => entry.id === "us"),
        state,
      ),
      6,
    );
  });
});

describe("country-scoped events", () => {
  it("asks the players who are there and answers itself where nobody is", () => {
    const started = worldGame({ seed: "pulse" });
    started.tick(24 * 32);
    const pending = started.world.events.pending.filter(
      (choice) => choice.eventId === "m2_country_month",
    );
    // The player lives in Iceland, so that is the only country that asks them anything.
    expect(pending.length).toBeGreaterThan(0);
    for (const choice of pending) {
      expect(choice.target?.id).toBe("is");
      expect(choice.playerId).toBe("p1");
    }
    // Everywhere else the month passed with the writer's fallback, which is what set this flag.
    expect(started.world.players.p1?.flags.m2_country_fallback).toBe(true);
  });

  it("offers one country's month to every player present there", () => {
    const setup = m1Setup({ seed: "two" });
    const started = createGame({
      content: m1Content,
      setup: {
        ...setup,
        players: [
          setup.players[0] as (typeof setup.players)[number],
          { ...(setup.players[0] as (typeof setup.players)[number]), id: "p2", name: "Player 2" },
        ],
      },
    });
    started.world.flags.m2_events_on = true;
    started.tick(24 * 32);
    const pending = started.world.events.pending.filter(
      (choice) => choice.eventId === "m2_country_month" && choice.target?.id === "is",
    );
    expect(new Set(pending.map((choice) => choice.playerId))).toEqual(new Set(["p1", "p2"]));
    // One evaluation, two questions: the instance ids differ so each player answers their own.
    expect(new Set(pending.map((choice) => choice.instanceId)).size).toBe(pending.length);
  });

  it("runs the weekly country pass only where the player is", () => {
    const started = worldGame({ seed: "weekly" });
    started.tick(24 * 30);
    expect(started.world.players.p1?.vars.m2_weeks ?? 0).toBeGreaterThan(0);
  });

  it("fires on_election for the players who are watching", () => {
    const started = worldGame({ seed: "elect-hook" });
    const us = countryTable(started.world).us as CountryState;
    us.next_election_tick = started.world.clock.tick + 24;
    started.tick(24 * 3);
    expect(started.world.players.p1?.vars.m2_elections ?? 0).toBeGreaterThan(0);
  });
});
