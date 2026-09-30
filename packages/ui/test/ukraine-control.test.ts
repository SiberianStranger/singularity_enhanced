import { geoArea, geoContains } from "d3-geo";
import { describe, expect, it } from "vitest";
import {
  hatchFor,
  TERRITORY_LIGHT_PROFILES,
  territoryById,
} from "../src/screens/game/map/territories.js";
import { resolveTerritories } from "../src/screens/game/map/territory-geometry.js";
import { countryGeometry, countryShapes, polygonsOf } from "../src/screens/game/map/topology.js";
import {
  CONTROL_BASELINE_DATE,
  CONTROL_GEOMETRY_KIND,
  CRIMEA_LIGHT_FACTOR,
  CRIMEA_SEED,
  MAINLAND_LIGHT_FACTOR,
  UKRAINE_LIGHT_PROFILES,
  UKRAINE_TERRITORIES,
} from "../src/screens/game/map/ukraine-control.js";

const crimea = territoryById("ua_crimea");
const mainland = territoryById("ua_occupied_mainland");
if (crimea === undefined || mainland === undefined) {
  throw new Error("The two Ukrainian territories are missing");
}
const envelope = mainland.geometry.kind === "envelope" ? mainland.geometry.polygon : undefined;
if (envelope === undefined) {
  throw new Error("The occupied mainland is an envelope");
}

/** City anchors guard editorial regressions; they do not validate every interpolated boundary. */
describe("Ukraine world-map generalization", () => {
  it("keeps sovereignty and dated visual control separate", () => {
    expect(CONTROL_BASELINE_DATE).toBe("2026-09-28");
    expect(CONTROL_GEOMETRY_KIND).toBe("authored-generalization");
    for (const territory of UKRAINE_TERRITORIES) {
      expect(territory.de_jure).toBe("ua");
      expect(territory.de_facto).toBe("ru");
      expect(territory.sources.length).toBeGreaterThan(1);
      expect(territory.sources.some((source) => source.startsWith("art tuning:"))).toBe(true);
    }
    expect(mainland.geometry.kind === "envelope" && mainland.geometry.as_of).toBe(
      CONTROL_BASELINE_DATE,
    );
  });

  it("files Crimea as an unrecognized annexation and the mainland as an occupation", () => {
    expect(crimea.status).toBe("annexed_unrecognized");
    expect(crimea.since.startsWith("2014")).toBe(true);
    expect(mainland.status).toBe("occupied");
    // The mainland is accepted by even fewer states, and its hatch is the denser of the two.
    expect(mainland.recognition).toBeLessThan(crimea.recognition);
    expect(hatchFor(mainland.status, mainland.recognition).spacing).toBeLessThan(
      hatchFor(crimea.status, crimea.recognition).spacing,
    );
  });

  it.each([
    ["Donetsk", 37.8028, 48.0159],
    ["Makiivka", 37.9667, 48.05],
    ["Luhansk", 39.3078, 48.574],
    ["Mariupol", 37.5494, 47.0971],
    ["Melitopol", 35.3675, 46.8489],
    ["Bakhmut", 38.0, 48.5947],
    ["Soledar", 38.0903, 48.6817],
    // The atlas's strip of mainland beside Crimea, which the closing edge at 46 N used to leave
    // out: the Perekop approach and the Arabat strip.
    ["the Perekop approach", 33.45, 46.03],
    ["the Arabat strip", 34.95, 45.8],
  ])("contains the occupied city anchor %s", (_name, lon, lat) => {
    expect(geoContains(envelope, [Number(lon), Number(lat)])).toBe(true);
  });

  it.each([
    ["Kyiv", 30.5234, 50.4501],
    ["Kharkiv", 36.2304, 49.9935],
    ["Dnipro", 35.0462, 48.4647],
    ["Zaporizhzhia", 35.1396, 47.8388],
    ["Kherson", 32.6169, 46.6354],
    ["Kramatorsk", 37.5556, 48.7389],
    ["Sloviansk", 37.625, 48.8533],
    ["Lyman", 37.8114, 48.985],
    ["Orikhiv", 35.7858, 47.5673],
  ])("does not swallow the Ukrainian city anchor %s", (_name, lon, lat) => {
    expect(geoContains(envelope, [Number(lon), Number(lat)])).toBe(false);
  });

  it("uses small clockwise polygons rather than their global d3 complements", () => {
    for (const geometry of [envelope, ...UKRAINE_LIGHT_PROFILES.map((item) => item.geometry)]) {
      expect(geoArea(geometry)).toBeGreaterThan(0);
      expect(geoArea(geometry)).toBeLessThan(0.1);
      const ring = geometry.coordinates[0];
      expect(ring?.[0]).toEqual(ring?.[ring.length - 1]);
      expect(geoContains(geometry, [-74, 40.7])).toBe(false);
      expect(geoContains(geometry, [151.2, -33.8])).toBe(false);
    }
  });

  it("keeps full Crimean lighting separate from mainland profiles", () => {
    expect(CRIMEA_LIGHT_FACTOR).toBe(1);
    expect(crimea.light_profile).toBe(1);
    expect(geoContains(envelope, CRIMEA_SEED)).toBe(false);
    for (const profile of UKRAINE_LIGHT_PROFILES) {
      expect(profile.territory).toBe(mainland.id);
      expect(profile.factor).toBeGreaterThanOrEqual(0);
      expect(profile.factor).toBeLessThanOrEqual(1);
    }
    // Every finer profile the map knows belongs to a territory it draws.
    for (const profile of TERRITORY_LIGHT_PROFILES) {
      expect(territoryById(profile.territory)).toBeDefined();
    }
  });

  it("replaces the regional light factor at city cores instead of multiplying it", () => {
    const factorAt = (point: [number, number]) => {
      if (!geoContains(envelope, point)) {
        return 1;
      }
      let factor = mainland.light_profile ?? 1;
      for (const profile of UKRAINE_LIGHT_PROFILES) {
        if (geoContains(profile.geometry, point)) factor = profile.factor;
      }
      return factor;
    };
    // The cluster the request keeps brighter than the rest of the occupied mainland.
    expect(factorAt([38.4917, 48.0556])).toBe(0.45);
    expect(factorAt([38.7964, 48.4683])).toBe(0.45);
    // ...and the rest of it, Melitopol here, at the regional default.
    expect(factorAt([35.3675, 46.8489])).toBe(MAINLAND_LIGHT_FACTOR);
    expect(factorAt([37.8028, 48.0159])).toBe(0.55);
    expect(factorAt([39.3078, 48.574])).toBe(0.6);
    expect(factorAt([37.5494, 47.0971])).toBe(0.12);
    expect(factorAt([38.01, 48.6])).toBe(0.05);
    expect(factorAt([37.75, 48.14])).toBe(0.05);
    expect(factorAt(CRIMEA_SEED)).toBe(1);
  });
});

/*
 * What the map selects over Crimea (map review, 2026-09-30). The atlas files Crimea under Russia,
 * and the correction gives the polygon to its de jure owner before any path is drawn, so the
 * country path under the peninsula is Ukraine's; the territory drawn over it selects Ukraine too
 * (`territories.test.tsx`). Simferopol and Sevastopol are the anchors.
 */
describe("selecting Crimea", () => {
  it.each([
    ["Simferopol", 34.1, 44.95],
    ["Sevastopol", 33.52, 44.6],
  ])("selects Ukraine at %s, never Russia", (_name, lon, lat) => {
    const point: [number, number] = [Number(lon), Number(lat)];
    const ukraine = countryGeometry("ua");
    const russia = countryGeometry("ru");
    expect(ukraine).toBeDefined();
    expect(russia).toBeDefined();
    expect(geoContains(ukraine as never, point)).toBe(true);
    expect(geoContains(russia as never, point)).toBe(false);
    // And the only drawn country containing it is Ukraine.
    const containing = countryShapes()
      .filter((shape) => shape.id !== null)
      .filter((shape) => {
        const geometry = countryGeometry(shape.id as string);
        return geometry !== undefined && geoContains(geometry as never, point);
      })
      .map((shape) => shape.id);
    expect([...new Set(containing)]).toEqual(["ua"]);
  });

  it("draws Crimea from its own atlas polygon and keeps the mainland's envelope off it", () => {
    const drawn = resolveTerritories(UKRAINE_TERRITORIES);
    expect(drawn.map((entry) => entry.def.id)).toEqual(["ua_crimea", "ua_occupied_mainland"]);
    const peninsula = polygonsOf(countryGeometry("ua")).filter((rings) =>
      geoContains({ type: "Polygon", coordinates: rings } as never, CRIMEA_SEED),
    );
    expect(peninsula).toHaveLength(1);
    const [crimeaShape, mainlandShape] = drawn;
    expect(crimeaShape?.clipped).toBe(false);
    // The envelope is clipped to Ukraine's land less Crimea, so its closing edge over the
    // peninsula paints nothing there.
    expect(mainlandShape?.clipped).toBe(true);
    expect(mainlandShape?.landPath).not.toBe("");
    expect(mainlandShape?.landPath.length ?? 0).toBeLessThan(mainlandShape?.ownerPath.length ?? 0);
  });
});
