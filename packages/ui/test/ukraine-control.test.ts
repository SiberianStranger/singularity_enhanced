import { geoArea, geoContains } from "d3-geo";
import { describe, expect, it } from "vitest";
import {
  countryGeometry,
  countryShapes,
  ukraineMapParts,
} from "../src/screens/game/map/topology.js";
import {
  CONTROL_BASELINE_DATE,
  CONTROL_GEOMETRY_KIND,
  CRIMEA_LIGHT_FACTOR,
  CRIMEA_SEED,
  UKRAINE_CONTROL_REGIONS,
  UKRAINE_LIGHT_PROFILES,
} from "../src/screens/game/map/ukraine-control.js";

/** City anchors guard editorial regressions; they do not validate every interpolated boundary. */
describe("Ukraine world-map generalization", () => {
  const mainland = UKRAINE_CONTROL_REGIONS[0];
  if (mainland === undefined) throw new Error("Missing mainland region");

  it("keeps sovereignty and dated visual control separate", () => {
    expect(CONTROL_BASELINE_DATE).toBe("2026-09-28");
    expect(CONTROL_GEOMETRY_KIND).toBe("authored-generalization");
    expect(mainland.countryId).toBe("ua");
    expect(mainland.controllerId).toBe("ru");
  });

  it.each([
    ["Donetsk", 37.8028, 48.0159],
    ["Makiivka", 37.9667, 48.05],
    ["Luhansk", 39.3078, 48.574],
    ["Mariupol", 37.5494, 47.0971],
    ["Melitopol", 35.3675, 46.8489],
    ["Bakhmut", 38.0, 48.5947],
    ["Soledar", 38.0903, 48.6817],
  ])("contains the occupied city anchor %s", (_name, lon, lat) => {
    expect(geoContains(mainland.geometry, [Number(lon), Number(lat)])).toBe(true);
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
    expect(geoContains(mainland.geometry, [Number(lon), Number(lat)])).toBe(false);
  });

  it("uses small clockwise polygons rather than their global d3 complements", () => {
    for (const item of [...UKRAINE_CONTROL_REGIONS, ...UKRAINE_LIGHT_PROFILES]) {
      expect(geoArea(item.geometry)).toBeGreaterThan(0);
      expect(geoArea(item.geometry)).toBeLessThan(0.1);
      const ring = item.geometry.coordinates[0];
      expect(ring?.[0]).toEqual(ring?.[ring.length - 1]);
      expect(geoContains(item.geometry, [-74, 40.7])).toBe(false);
      expect(geoContains(item.geometry, [151.2, -33.8])).toBe(false);
    }
  });

  it("keeps full Crimean lighting separate from mainland profiles", () => {
    expect(CRIMEA_LIGHT_FACTOR).toBe(1);
    expect(geoContains(mainland.geometry, CRIMEA_SEED)).toBe(false);
    for (const profile of UKRAINE_LIGHT_PROFILES) {
      expect(profile.factor).toBeGreaterThanOrEqual(0);
      expect(profile.factor).toBeLessThanOrEqual(1);
    }
  });

  it("replaces the regional light factor at city cores instead of multiplying it", () => {
    const factorAt = (point: [number, number]) => {
      let factor = 1;
      for (const profile of UKRAINE_LIGHT_PROFILES) {
        if (geoContains(profile.geometry, point)) factor = profile.factor;
      }
      return factor;
    };
    // The cluster the request keeps brighter than the rest of the occupied mainland.
    expect(factorAt([38.4917, 48.0556])).toBe(0.45);
    expect(factorAt([38.7964, 48.4683])).toBe(0.45);
    // ...and the rest of it, Melitopol here, at the regional default.
    expect(factorAt([35.3675, 46.8489])).toBe(0.25);
    expect(factorAt([37.8028, 48.0159])).toBe(0.55);
    expect(factorAt([39.3078, 48.574])).toBe(0.6);
    expect(factorAt([37.5494, 47.0971])).toBe(0.12);
    expect(factorAt([38.01, 48.6])).toBe(0.05);
    expect(factorAt([37.75, 48.14])).toBe(0.05);
    expect(factorAt(CRIMEA_SEED)).toBe(1);
  });
});

/*
 * What the map selects over Crimea (map review, 2026-09-30). The control layer draws no target of
 * its own, so a click there reaches the country path under it, and that path has to be Ukraine's:
 * the atlas files Crimea under Russia, and the correction moves the polygon before any path is
 * drawn. Simferopol and Sevastopol are the anchors.
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

  it("keeps the separate Crimea and mainland parts the layers are drawn from", () => {
    const parts = ukraineMapParts();
    expect(parts.crimea).toBeDefined();
    expect(parts.mainland).toBeDefined();
    expect(geoContains(parts.crimea as never, CRIMEA_SEED)).toBe(true);
    expect(geoContains(parts.mainland as never, CRIMEA_SEED)).toBe(false);
  });
});
