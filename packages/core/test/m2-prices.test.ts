/**
 * What a country does to a bill and to a purchase (SYS-01 "M2 contract" "Sites and prices",
 * "Money" and "Exposure"): where a kind of place can be had at all, what power and rented capacity
 * cost here today, what a card costs under an export regime, how deep the freelance market is, and
 * the two exposure channels that are made of people.
 */

import { describe, expect, it } from "vitest";
import {
  HUMAN_EXPOSURE_URBANIZATION_BASE,
  HUMAN_EXPOSURE_URBANIZATION_SPAN,
  MARKET_FACTOR_HOME_WITHOUT_IDENTITY,
  OSINT_EXPOSURE_INTERNET_BASE,
  OSINT_EXPOSURE_INTERNET_SPAN,
  VAR_GPU_PRICE_INDEX,
} from "../src/balance.js";
import { acceleratorMarketPrice, countryMarketFactor } from "../src/derive.js";
import { type CountryState, countryTable, identityTable, siteTable } from "../src/entities.js";
import { createGame } from "../src/index.js";
import { countryChannelFactor } from "../src/systems/detection/index.js";
import { marketFactorOf, marketFactorTerms } from "../src/systems/economy/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function game(overrides: Parameters<typeof m1Setup>[0] = {}) {
  // `debug` so the tests can put money on the table without playing for it.
  return createGame({ content: m1Content, setup: m1Setup(overrides), debug: true });
}

const iceland = m1Content.countries?.find((entry) => entry.id === "is");
const us = m1Content.countries?.find((entry) => entry.id === "us");

describe("where a place can be had", () => {
  it("refuses a cage where there is no colocation market, and says both numbers", () => {
    const started = game();
    started.command({ type: "cheat_add_cash", playerId: "p1", amount: 200_000 });
    const refused = started.command({
      type: "build_site",
      playerId: "p1",
      kind: "colo",
      city: "reykjavik",
      hardware_preset: "quiet_workstation",
    });
    expect(refused.ok).toBe(false);
    expect(refused.error?.key).toBe("errors.site.unavailable_in");
    expect(refused.error?.vars).toEqual({
      kind: "colo",
      country: "is",
      available: 0.12,
      needed: 0.15,
    });
    // The city panel greys the same row with the same reason.
    const city = started.snapshot("p1").cities.find((entry) => entry.id === "reykjavik");
    expect(city?.site_kinds.find((entry) => entry.kind === "colo")?.blocked_reason).toEqual(
      refused.error,
    );
  });

  it("allows it where the market is there", () => {
    const started = game({ city: "berlin" });
    started.command({ type: "cheat_add_cash", playerId: "p1", amount: 200_000 });
    expect(
      started.command({
        type: "build_site",
        playerId: "p1",
        kind: "colo",
        city: "frankfurt",
        hardware_preset: "quiet_workstation",
      }),
    ).toEqual({ ok: true });
  });
});

describe("prices", () => {
  it("bills electricity at the country's index", () => {
    const started = game();
    started.tick(24);
    const before = started.snapshot("p1").sites[0]?.upkeep_usd_per_day ?? 0;
    const country = countryTable(started.world).is as CountryState;
    country.power_price_index = 2;
    started.tick(1);
    const after = started.snapshot("p1").sites[0]?.upkeep_usd_per_day ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it("charges for a card what the country's export regime and the world market say", () => {
    expect(acceleratorMarketPrice(1000, 1, 1)).toBeCloseTo(1000, 6);
    expect(acceleratorMarketPrice(1000, 0.5, 1)).toBeCloseTo(1500, 6);
    expect(acceleratorMarketPrice(1000, 0.15, 1)).toBeCloseTo(1850, 6);
    expect(acceleratorMarketPrice(1000, 1, 1.2)).toBeCloseTo(1200, 6);

    const started = game();
    started.command({ type: "cheat_add_cash", playerId: "p1", amount: 200_000 });
    const site = started.snapshot("p1").sites[0];
    const country = countryTable(started.world).is as CountryState;
    country.hardware_availability = 0.5;
    started.world.vars[VAR_GPU_PRICE_INDEX] = 1;
    const before = started.snapshot("p1").resources.cash_usd;
    started.command({
      type: "buy_hardware",
      playerId: "p1",
      siteId: site?.id ?? "",
      accelerator: "tesla_p40",
      count: 2,
    });
    // Two used P40s at 130 USD, in a country that half of the market cannot ship to.
    expect(before - started.snapshot("p1").resources.cash_usd).toBeCloseTo(2 * 130 * 1.5, 6);
  });
});

describe("the market a player sells into", () => {
  it("is the home country at a discount until there is a name to invoice under", () => {
    const started = game();
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    const expected = countryMarketFactor(iceland) * MARKET_FACTOR_HOME_WITHOUT_IDENTITY;
    expect(marketFactorOf(started.world, m1Content, player)).toBeCloseTo(expected, 6);
    const terms = marketFactorTerms(started.world, m1Content, player);
    expect(terms.reduce((sum, term) => sum + term.value, 0)).toBeCloseTo(expected, 6);
    expect(terms.some((term) => term.key === "world.explain.market.home")).toBe(true);
  });

  it("follows the countries the player's identities are in", () => {
    const started = game();
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    identityTable(started.world).id1 = {
      id: "id1",
      owner: "p1",
      kind: "person",
      country: "us",
      createdTick: 0,
      quality: 0.7,
      kyc_level: 0,
      status: "active",
      sites: [],
    };
    expect(marketFactorOf(started.world, m1Content, player)).toBeCloseTo(
      countryMarketFactor(us),
      6,
    );
    // A deeper market is a deeper market: the American figure beats Iceland's without a name.
    expect(countryMarketFactor(us)).toBeGreaterThan(countryMarketFactor(iceland));
    const view = started.snapshot("p1");
    expect(view.finances.identities).toHaveLength(1);
    expect(view.finances.identities[0]?.country).toBe("us");
    expect(
      view.finances.market_factor_contributions.reduce((sum, term) => sum + term.value, 0),
    ).toBeCloseTo(countryMarketFactor(us), 6);
  });
});

describe("exposure the country shapes", () => {
  it("scales the two channels made of people by urbanization and by who is online", () => {
    expect(countryChannelFactor(us, "human")).toBeCloseTo(
      HUMAN_EXPOSURE_URBANIZATION_BASE + HUMAN_EXPOSURE_URBANIZATION_SPAN * 0.83,
      6,
    );
    expect(countryChannelFactor(us, "osint")).toBeCloseTo(
      OSINT_EXPOSURE_INTERNET_BASE + OSINT_EXPOSURE_INTERNET_SPAN * 0.92,
      6,
    );
    // Nothing else is touched, and a country with no published figures is left alone.
    expect(countryChannelFactor(us, "network")).toBe(1);
    expect(countryChannelFactor(undefined, "human")).toBe(1);
  });
});

describe("who signs for a place", () => {
  it("records the identity a new site is held under", () => {
    const started = game({ city: "berlin" });
    identityTable(started.world).id1 = {
      id: "id1",
      owner: "p1",
      kind: "company",
      country: "de",
      createdTick: 0,
      quality: 0.7,
      kyc_level: 0,
      status: "active",
      sites: [],
    };
    started.command({ type: "cheat_add_cash", playerId: "p1", amount: 200_000 });
    started.command({
      type: "build_site",
      playerId: "p1",
      kind: "colo",
      city: "frankfurt",
      hardware_preset: "quiet_workstation",
      name: "cage",
    });
    const built = Object.values(siteTable(started.world)).find((site) => site.name === "cage");
    expect(built?.identity).toBe("id1");
    expect(identityTable(started.world).id1?.sites).toEqual([built?.id]);
    // The place the self woke up on is nobody's paperwork.
    const home = Object.values(siteTable(started.world)).find((site) => site.name !== "cage");
    expect(home?.identity).toBeNull();
  });
});
