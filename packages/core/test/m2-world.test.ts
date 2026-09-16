/**
 * M2 world: the country model v0.2, identities, the save migration and the view contract
 * (SYS-01 "M2 contract", SYS-04 v0.3 rules C and H).
 */

import { describe, expect, it } from "vitest";
import {
  CASH_FACTOR_MIN,
  DEFAULT_KYC_STRENGTH,
  DEFAULT_STABILITY,
  GRAY_HARDWARE_SUSPICION,
  HARDWARE_AVAILABILITY_BY_CHIP_ACCESS,
  STARTING_AI_DISPLACEMENT,
  STARTING_UNEMPLOYMENT,
  VAR_GRAY_HARDWARE_FLAG,
} from "../src/balance.js";
import { countryCashFactor } from "../src/derive.js";
import { countryTable, identityTable } from "../src/entities.js";
import { createGame, loadGame } from "../src/index.js";
import { serialize } from "../src/kernel/save.js";
import { SCHEMA_VERSION } from "../src/kernel/world.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function game(overrides: Parameters<typeof m1Setup>[0] = {}) {
  return createGame({ content: m1Content, setup: m1Setup(overrides) });
}

describe("country model v0.2", () => {
  it("seeds the state from the bundle and falls back to the documented defaults", () => {
    const world = game().world;
    const us = countryTable(world).us;
    const iceland = countryTable(world).is;
    expect(us?.stance).toBe("accelerate");
    expect(us?.stability).toBeCloseTo(0.72, 6);
    expect(us?.kyc_strength).toBeCloseTo(0.8, 6);
    expect(us?.hardware_availability).toBeCloseTo(0.95, 6);
    // Iceland carries one v0.2 field; everything else is the default a pre-M2 bundle plays with.
    expect(iceland?.stance).toBe("ignore");
    expect(iceland?.stability).toBeCloseTo(DEFAULT_STABILITY, 6);
    expect(iceland?.kyc_strength).toBeCloseTo(DEFAULT_KYC_STRENGTH, 6);
    expect(iceland?.hardware_availability).toBeCloseTo(
      HARDWARE_AVAILABILITY_BY_CHIP_ACCESS.unrestricted,
      6,
    );
    expect(iceland?.unemployment).toBeCloseTo(STARTING_UNEMPLOYMENT, 6);
    expect(iceland?.ai_displacement).toBeCloseTo(STARTING_AI_DISPLACEMENT, 6);
    expect(iceland?.power_price_index).toBe(1);
    expect(iceland?.next_election_tick).toBeNull();
  });

  it("schedules the first election from the country's own calendar", () => {
    const world = game().world;
    const us = countryTable(world).us;
    // 2027-11-02 is 305 days after the 2027-01-01 start.
    expect(us?.next_election_tick).toBe(305 * 24);
    expect(us?.next_election_kind).toBe("general");
  });

  it("publishes the country and city views the client renders", () => {
    const view = game().snapshot("p1");
    const us = view.countries.find((country) => country.id === "us");
    expect(us?.name_key).toBe("countries.us");
    expect(us?.government).toBe("liberal_democracy");
    expect(us?.cloud_availability).toBeCloseTo(0.95, 6);
    expect(us?.chip_access).toBe("unrestricted");
    expect(us?.engineer_pool).toBe(900_000);
    expect(us?.market_factor).toBeGreaterThan(0.3);
    expect(us?.explain.awareness.length).toBeGreaterThan(0);
    const iceland = view.countries.find((country) => country.id === "is");
    expect(iceland?.cloud_availability).toBeCloseTo(0.1, 6);
    expect(iceland?.colo_availability).toBeCloseTo(0.12, 6);

    const reykjavik = view.cities.find((city) => city.id === "reykjavik");
    expect(reykjavik?.name_key).toBe("cities.reykjavik");
    expect(reykjavik?.population).toBe(140_000);
    expect(reykjavik?.local_heat).toBeGreaterThan(1);
    // A cage cannot be rented where there is no colocation floor (SYS-01 M2 contract).
    const colo = reykjavik?.site_kinds.find((entry) => entry.kind === "colo");
    expect(colo?.blocked_reason?.key).toBe("errors.site.unavailable_in");
    expect(colo?.blocked_reason?.vars?.country).toBe("is");
    const residential = reykjavik?.site_kinds.find((entry) => entry.kind === "residential");
    expect(residential?.blocked_reason).toBeNull();
  });

  it("publishes the world clocks and the market variables", () => {
    const view = game().snapshot("p1");
    expect(view.world.ai_adoption).toBeCloseTo(0.2, 6);
    expect(view.world.gpu_price_index).toBe(1);
    expect(view.world.cloud_demand_index).toBe(1);
    expect(view.world.awareness_presence).toBeGreaterThanOrEqual(0);
    expect(view.world.treaties).toEqual([]);
    expect(view.detection.hunt_pressure).toBeGreaterThanOrEqual(0);
    expect(view.finances.identities).toEqual([]);
    expect(view.finances.market_factor_contributions.length).toBeGreaterThan(0);
  });
});

describe("starting cash and gray hardware (SYS-04 v0.3)", () => {
  it("scales the starting cash by the country's cash factor", () => {
    const rich = game({ city: "reykjavik" }).snapshot("p1").resources.cash_usd;
    const factor = countryCashFactor(m1Content.countries?.find((entry) => entry.id === "is"));
    expect(rich).toBeCloseTo(3000 * factor, 6);
    expect(factor).toBeGreaterThan(CASH_FACTOR_MIN);
  });

  it("leaves an origin whose money is not the country's alone", () => {
    const view = createGame({
      content: m1Content,
      setup: m1Setup({ origin: "state_lab", hardware_preset: "institute_rack", city: "berlin" }),
    }).snapshot("p1");
    expect(view.resources.cash_usd).toBeCloseTo(25_000, 6);
  });

  it("does not flag gray hardware where the cards are legal", () => {
    const world = game().world;
    expect(world.players.p1?.flags[VAR_GRAY_HARDWARE_FLAG]).toBeUndefined();
    expect(GRAY_HARDWARE_SUSPICION).toBeGreaterThan(0);
  });
});

describe("saves", () => {
  it("loads an M1 save and keeps playing", () => {
    const before = game();
    before.tick(24 * 3);
    // An M1 save is a schema-2 world: no identity table, no v0.2 country fields, no market vars.
    const save = JSON.parse(serialize(before.world)) as Record<string, unknown>;
    (save.meta as Record<string, unknown>).schemaVersion = 2;
    save.vars = {};
    delete (save.counters as Record<string, unknown>).identities;
    const countries = (save.entities as Record<string, Record<string, Record<string, unknown>>>)
      .country as Record<string, Record<string, unknown>>;
    for (const country of Object.values(countries)) {
      for (const field of [
        "stance",
        "stability",
        "regulation_target",
        "enforcement_budget",
        "unemployment",
        "ai_displacement",
        "power_price_index",
        "cloud_price_index",
        "hardware_availability",
        "kyc_strength",
        "next_election_tick",
        "next_election_kind",
        "incidents_30d",
        "incident_ticks",
        "pinned_months",
      ]) {
        delete country[field];
      }
    }
    const sites = (save.entities as Record<string, Record<string, Record<string, unknown>>>)
      .site as Record<string, Record<string, unknown>>;
    for (const site of Object.values(sites)) {
      delete site.identity;
    }

    const loaded = loadGame({ content: m1Content, save: JSON.stringify(save) });
    expect(loaded.world.meta.schemaVersion).toBe(SCHEMA_VERSION);
    const iceland = countryTable(loaded.world).is;
    expect(iceland?.stance).toBe("ignore");
    expect(iceland?.power_price_index).toBe(1);
    expect(iceland?.incident_ticks).toEqual([]);
    expect(identityTable(loaded.world)).toEqual({});
    expect(loaded.world.vars.ai_adoption).toBeCloseTo(0.2, 6);
    loaded.tick(24 * 10);
    expect(loaded.snapshot("p1").game_over).toBeNull();
  });
});
