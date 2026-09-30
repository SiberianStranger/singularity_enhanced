/**
 * Territorial control and recognition (SYS-26): the rules the map draws any territory by, and a
 * territory the game does not ship drawn by the same code as Crimea.
 */

import type { CountryView } from "@singularity/core";
import { act, fireEvent, render } from "@testing-library/react";
import i18next from "i18next";
import { afterAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import {
  dashedEdge,
  hatchFor,
  hueOf,
  RECOGNITION_STATUSES,
  recognitionBand,
  type TerritoryDef,
  territoryById,
  territoryPaint,
  territorySentence,
} from "../src/screens/game/map/territories.js";
import { WorldMap } from "../src/screens/game/map/WorldMap.js";

afterAll(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

/** A country view with every figure the map reads, at nothing unless the test says otherwise. */
function country(id: string, overrides: Partial<CountryView> = {}): CountryView {
  return {
    id,
    macro_region: "",
    name_key: `world.country.${id}.name`,
    awareness: 0,
    ai_opinion: 0,
    ai_regulation: 0,
    ai_enforcement: 0,
    presence: false,
    suspicion_max: 0,
    government: "hybrid",
    stance: "ignore",
    stability: 0,
    regulation_target: 0,
    enforcement_budget: 0,
    unemployment: 0,
    ai_displacement: 0,
    power_price_index: 1,
    cloud_price_index: 1,
    electricity_usd_per_kwh: null,
    hardware_availability: 0,
    cloud_availability: 0,
    colo_availability: 0,
    chip_access: "",
    kyc_strength: 0,
    engineer_pool: 0,
    population: 0,
    next_election: null,
    sites: 0,
    identities: 0,
    watchers: [],
    investigations: [],
    incidents_30d: 0,
    local_heat_max: 0,
    market_factor: 1,
    cash_factor: 1,
    cash_factor_contributions: [],
    explain: { awareness: [], ai_opinion: [], ai_regulation: [], ai_enforcement: [] },
    ...overrides,
  };
}

/**
 * A test-only island in the Taiwan Strait, held by one state and claimed by another: small enough
 * that the world atlas does not draw it, so it is an authored polygon (an octagon around Kinmen's
 * coordinates). The game ships no such territory; the point is that nothing in the renderer knows
 * Ukraine.
 */
const STRAIT_ISLAND: TerritoryDef = {
  id: "test_strait_island",
  name_key: "territory.test_strait_island.name",
  de_jure: "cn",
  de_facto: "tw",
  status: "disputed",
  recognition: 0.2,
  since: "1949-10-25",
  geometry: {
    kind: "polygon",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [118.2, 24.44],
          [118.244, 24.546],
          [118.35, 24.59],
          [118.456, 24.546],
          [118.5, 24.44],
          [118.456, 24.334],
          [118.35, 24.29],
          [118.244, 24.334],
          [118.2, 24.44],
        ],
      ],
    },
  },
  sources: ["test only"],
};

describe("the drawing rules per status", () => {
  it("hatches nothing that is recognized, and everything else by its tier", () => {
    expect(hatchFor("recognized", 1).kind).toBe("none");
    expect(hatchFor("recognized", 0).kind).toBe("none");
    expect(hatchFor("disputed", 0.3).kind).toBe("diagonal");
    expect(hatchFor("annexed_unrecognized", 0.06).kind).toBe("diagonal");
    expect(hatchFor("occupied", 0.03).kind).toBe("diagonal");
    expect(hatchFor("contested", 0).kind).toBe("cross");
  });

  it("draws the hatch denser and more visible as recognition falls", () => {
    // Down the tiers at the same figure: an unrecognized annexation is a light hatch, an
    // occupation a denser one.
    const tiers = ["disputed", "annexed_unrecognized", "occupied"] as const;
    for (let index = 1; index < tiers.length; index += 1) {
      const looser = hatchFor(tiers[index - 1] ?? "disputed", 0.1);
      const denser = hatchFor(tiers[index] ?? "occupied", 0.1);
      expect(denser.spacing).toBeLessThan(looser.spacing);
      expect(denser.opacity).toBeGreaterThan(looser.opacity);
    }
    // Inside one tier, the figure: fewer states accepting it is a denser hatch.
    for (const status of RECOGNITION_STATUSES.filter((entry) => entry !== "recognized")) {
      const rare = hatchFor(status, 0.02);
      const common = hatchFor(status, 0.8);
      expect(rare.spacing, status).toBeLessThan(common.spacing);
      expect(rare.opacity, status).toBeGreaterThan(common.opacity);
    }
  });

  it("dashes the edge of control unless control and title agree", () => {
    expect(dashedEdge("recognized")).toBe(false);
    for (const status of RECOGNITION_STATUSES.filter((entry) => entry !== "recognized")) {
      expect(dashedEdge(status), status).toBe(true);
    }
  });

  it("fills with the holder's colour and hatches in the owner's hue", () => {
    const line = "var(--c-map-border)";
    // Two categories: the holder's fill, the owner's hue drawn solid.
    expect(territoryPaint("rgb(124 214 209 / 60%)", "rgb(255 112 98 / 60%)", line)).toEqual({
      fill: "rgb(255 112 98 / 60%)",
      hatch: "rgb(124 214 209 / 92%)",
      edge: line,
    });
    // The owner unfilled (the textured map's default): the hatch falls back to the line colour.
    expect(territoryPaint("transparent", "rgb(87 168 255 / 70%)", line).hatch).toBe(line);
    // The same hue at two intensities (any scale mode): still the line colour, never invisible.
    expect(territoryPaint("rgb(237 184 74 / 16%)", "rgb(237 184 74 / 32%)", line).hatch).toBe(line);
    expect(hueOf("var(--c-map-land)")).toBeNull();
  });

  it("puts a recognition figure into a band of words", () => {
    expect(recognitionBand(0.03)).toBe("none");
    expect(recognitionBand(0.3)).toBe("few");
    expect(recognitionBand(0.7)).toBe("most");
  });
});

describe("the words for a territory", () => {
  const crimea = territoryById("ua_crimea");
  const mainland = territoryById("ua_occupied_mainland");
  const names: Record<string, Record<string, string>> = {
    en: { ua: "Ukraine", ru: "Russia" },
    ru: { ua: "Украина", ru: "Россия" },
  };

  it("says in English whose land it is, who holds it and how few accept it", async () => {
    await act(async () => {
      await i18next.changeLanguage("en");
    });
    const t = i18next.t.bind(i18next);
    expect(crimea).toBeDefined();
    expect(mainland).toBeDefined();
    const name = (id: string) => names.en?.[id] ?? id;
    expect(territorySentence(t, crimea as TerritoryDef, name)).toBe(
      "Crimea: territory of Ukraine, held by Russia since 2014; the annexation is recognized by almost no state.",
    );
    expect(territorySentence(t, mainland as TerritoryDef, name)).toBe(
      "The occupied south and east: territory of Ukraine, occupied by Russia since 2022; almost no state accepts the occupier's claim.",
    );
  });

  it("says the same in Russian, with every name in the nominative", async () => {
    await act(async () => {
      await i18next.changeLanguage("ru");
    });
    const t = i18next.t.bind(i18next);
    const name = (id: string) => names.ru?.[id] ?? id;
    expect(territorySentence(t, crimea as TerritoryDef, name)).toBe(
      "Крым. Территория: Украина. Под контролем: Россия, с 2014 года. Аннексию признают лишь единичные государства.",
    );
    expect(territorySentence(t, mainland as TerritoryDef, name)).toBe(
      "Оккупированные юг и восток. Территория: Украина. Под оккупацией с 2022 года. Оккупант: Россия. Права оккупанта признают лишь единичные государства.",
    );
    await act(async () => {
      await i18next.changeLanguage("en");
    });
  });
});

describe("the map's territories", () => {
  it("draws Crimea and the occupied mainland by their statuses, with no text", () => {
    const { container } = render(
      <WorldMap countries={[country("ua"), country("ru")]} onSelect={() => undefined} />,
    );
    const layer = container.querySelector("[data-testid='territory-layer']");
    expect(layer).not.toBeNull();
    expect(layer?.querySelectorAll("text")).toHaveLength(0);
    const crimea = container.querySelector("[data-testid='map-territory-ua_crimea']");
    const mainland = container.querySelector("[data-testid='map-territory-ua_occupied_mainland']");
    expect(crimea?.getAttribute("data-status")).toBe("annexed_unrecognized");
    expect(crimea?.getAttribute("data-hatch")).toBe("diagonal");
    expect(crimea?.getAttribute("data-light-factor")).toBe("1");
    expect(mainland?.getAttribute("data-status")).toBe("occupied");
    expect(mainland?.getAttribute("data-baseline")).toBe("2026-09-28");
    // The occupied mainland is the denser hatch.
    const spacing = (id: string) =>
      Number(
        container
          .querySelector(`[data-testid='territory-hatch-${id}']`)
          ?.getAttribute("data-spacing"),
      );
    expect(spacing("ua_occupied_mainland")).toBeLessThan(spacing("ua_crimea"));
    // Both have a dashed edge of control and the owner's border is drawn again over them.
    expect(container.querySelector("[data-testid='map-territory-edge-ua_crimea']")).not.toBeNull();
    expect(
      container
        .querySelector("[data-testid='map-territory-edge-ua_occupied_mainland']")
        ?.getAttribute("stroke-dasharray"),
    ).toBe("4 3");
    expect(container.querySelector("[data-testid='map-territory-border-ua']")).not.toBeNull();
    // Ukraine's own fill is cut out of its territories, so the holder's colour is not tinted.
    const ukraine = [...container.querySelectorAll("[data-testid='country-paths'] path")].find(
      (path) => path.querySelector("title")?.textContent === "Ukraine",
    );
    expect(ukraine?.getAttribute("mask")).toMatch(/^url\(#territory-holes-ua-/);
    const russia = [...container.querySelectorAll("[data-testid='country-paths'] path")].find(
      (path) => path.querySelector("title")?.textContent === "Russia",
    );
    expect(russia?.getAttribute("mask")).toBeNull();
  });

  it("selects Ukraine from Crimea and names the territory", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <WorldMap countries={[country("ua"), country("ru")]} onSelect={onSelect} />,
    );
    const fill = container.querySelector("[data-testid='map-territory-fill-ua_crimea']");
    expect(fill?.querySelector("title")?.textContent).toBe(
      "Crimea: territory of Ukraine, held by Russia since 2014; the annexation is recognized by almost no state.",
    );
    fireEvent.click(fill as Element);
    expect(onSelect).toHaveBeenCalledWith({ kind: "country", id: "ua", territory: "ua_crimea" });
    fireEvent.keyDown(
      container.querySelector("[data-testid='map-territory-fill-ua_occupied_mainland']") as Element,
      { key: "Enter" },
    );
    expect(onSelect).toHaveBeenLastCalledWith({
      kind: "country",
      id: "ua",
      territory: "ua_occupied_mainland",
    });
  });

  it("paints Crimea in Russia's colour of the mode and hatches it in Ukraine's", () => {
    const { container } = render(
      <WorldMap
        mode="stance"
        countries={[
          country("ua", { stance: "accelerate" }),
          country("ru", { stance: "securitize" }),
        ]}
      />,
    );
    const russia = [...container.querySelectorAll("[data-testid='country-paths'] path")].find(
      (path) => path.querySelector("title")?.textContent === "Russia",
    );
    const fill = container.querySelector("[data-testid='map-territory-fill-ua_crimea']");
    expect(fill?.getAttribute("fill")).toBe(russia?.getAttribute("fill"));
    expect(
      container
        .querySelector("[data-testid='territory-hatch-ua_crimea']")
        ?.getAttribute("data-color"),
    ).toBe("rgb(124 214 209 / 92%)");
  });

  it("draws a territory the game does not ship by the same code path", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <WorldMap
        mode="stance"
        territories={[STRAIT_ISLAND]}
        countries={[
          country("cn", { stance: "securitize" }),
          country("tw", { stance: "accelerate" }),
        ]}
        onSelect={onSelect}
      />,
    );
    // Only the territories it was given.
    expect(container.querySelector("[data-testid='map-territory-ua_crimea']")).toBeNull();
    const island = container.querySelector("[data-testid='map-territory-test_strait_island']");
    expect(island?.getAttribute("data-de-jure")).toBe("cn");
    expect(island?.getAttribute("data-de-facto")).toBe("tw");
    expect(island?.getAttribute("data-hatch")).toBe("diagonal");
    // Held by Taiwan: its fill is Taiwan's colour in this mode; claimed by China: China's hatch.
    const fill = container.querySelector("[data-testid='map-territory-fill-test_strait_island']");
    expect(fill?.getAttribute("fill")).toBe("rgb(124 214 209 / 60%)");
    const hatch = container.querySelector("[data-testid='territory-hatch-test_strait_island']");
    expect(hatch?.getAttribute("data-color")).toBe("rgb(255 112 98 / 92%)");
    expect(Number(hatch?.getAttribute("data-spacing"))).toBeCloseTo(
      hatchFor("disputed", 0.2).spacing,
      2,
    );
    // A click selects the owner, as over Crimea, and China's own path is cut under the island.
    fireEvent.click(fill as Element);
    expect(onSelect).toHaveBeenCalledWith({
      kind: "country",
      id: "cn",
      territory: "test_strait_island",
    });
    const china = [...container.querySelectorAll("[data-testid='country-paths'] path")].find(
      (path) => path.querySelector("title")?.textContent === "China",
    );
    expect(china?.getAttribute("mask")).toMatch(/^url\(#territory-holes-cn-/);
  });
});
