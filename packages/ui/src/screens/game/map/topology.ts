/**
 * Country outlines from `world-atlas` 110m (Natural Earth, public domain), decoded once.
 *
 * The atlas identifies countries by ISO 3166-1 numeric code; `iso.ts` maps those to the lowercase
 * alpha-2 ids the core uses for `CountryView`.
 */

import { geoArea, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import atlas from "world-atlas/countries-110m.json";
import { alpha2FromFeatureId } from "./iso.js";
import { type GeoGeometry, geometryToPath } from "./projection.js";
import { type LonLat, TERRITORIES, type TerritoryDef } from "./territories.js";

export interface CountryShape {
  /** Feature id from the atlas (ISO numeric), unique within the map. */
  featureId: string;
  /** Lowercase alpha-2 code, or null when the atlas has no code for this shape. */
  id: string | null;
  /** English name from the atlas, used only as a fallback label. */
  name: string;
  path: string;
}

interface AtlasFeature {
  id?: string | number;
  properties?: { name?: string };
  geometry?: GeoGeometry;
}

/** The rings of one polygon, as the atlas stores them. */
export type PolygonRings = number[][][];

let cache: CountryShape[] | null = null;
let geometryCache: AtlasFeature[] | null = null;
let nameCache: ReadonlyMap<string, string> | null = null;

/** The polygons of a Polygon or MultiPolygon geometry; empty for anything else. */
export function polygonsOf(geometry: GeoGeometry | undefined): PolygonRings[] {
  if (geometry?.type === "Polygon") {
    return [geometry.coordinates as PolygonRings];
  }
  if (geometry?.type === "MultiPolygon") {
    return [...(geometry.coordinates as PolygonRings[])];
  }
  return [];
}

function polygon(rings: PolygonRings): { type: "Polygon"; coordinates: PolygonRings } {
  return { type: "Polygon", coordinates: rings };
}

export function containsPoint(rings: PolygonRings, point: LonLat): boolean {
  return geoContains(polygon(rings) as Parameters<typeof geoContains>[0], point);
}

function areaOf(rings: PolygonRings): number {
  return geoArea(polygon(rings) as Parameters<typeof geoArea>[0]);
}

/**
 * Gives a territory's atlas part to its de jure owner (SYS-26: "Countries keep their de jure
 * geometry"). Natural Earth files Crimea under Russia; the correction moves the polygon before
 * any path is drawn, so hovering and selecting the peninsula name Ukraine, and so does any other
 * atlas part a territory names by a point inside it.
 *
 * It refuses to move a country's largest polygon, which is what a later atlas that merged the part
 * into its holder's mainland would ask for: the map is then drawn as the atlas has it and that one
 * territory stays off, with a warning, rather than stopping the map from loading (map review,
 * 2026-09-30).
 */
function giveAtlasPartsToOwners(decoded: AtlasFeature[], territories: readonly TerritoryDef[]) {
  for (const territory of territories) {
    const geometry = territory.geometry;
    if (geometry.kind !== "atlas_part") {
      continue;
    }
    const owner = decoded.find((entry) => alpha2FromFeatureId(entry.id) === territory.de_jure);
    if (owner?.geometry === undefined) {
      console.warn(`The atlas has no country ${territory.de_jure}; ${territory.id} is not drawn.`);
      continue;
    }
    if (polygonsOf(owner.geometry).some((rings) => containsPoint(rings, geometry.seed))) {
      continue;
    }
    let moved = false;
    for (const entry of decoded) {
      if (entry === owner) {
        continue;
      }
      const parts = polygonsOf(entry.geometry);
      const index = parts.findIndex((rings) => containsPoint(rings, geometry.seed));
      const part = parts[index];
      if (part === undefined) {
        continue;
      }
      const largest = parts.every(
        (rings, other) => other === index || areaOf(rings) < areaOf(part),
      );
      if (!largest) {
        entry.geometry = {
          type: "MultiPolygon",
          coordinates: parts.filter((_, other) => other !== index),
        };
        owner.geometry = {
          type: "MultiPolygon",
          coordinates: [...polygonsOf(owner.geometry), part],
        };
        moved = true;
      }
      break;
    }
    if (!moved) {
      console.warn(
        `The atlas no longer exposes ${territory.id} as a separable polygon; it is not drawn.`,
      );
    }
  }
}

/** All country shapes, decoded and projected once per session. */
export function countryShapes(): CountryShape[] {
  if (cache !== null) {
    return cache;
  }
  const collection = feature(atlas as never, "countries") as unknown as {
    features?: AtlasFeature[];
  };
  const decoded = collection.features ?? [];
  giveAtlasPartsToOwners(decoded, TERRITORIES);
  geometryCache = decoded;
  cache = decoded
    .map((entry, index) => ({
      featureId: String(entry.id ?? `shape_${index}`),
      id: alpha2FromFeatureId(entry.id),
      name: entry.properties?.name ?? "",
      path: geometryToPath(entry.geometry),
    }))
    .filter((shape) => shape.path !== "");
  return cache;
}

/**
 * English names for every shape on the map, keyed by the lowercase alpha-2 id (playtest 3, R6).
 *
 * The content bundle carries 105 countries; the atlas draws about 170. The rest used to show their
 * own id as their name, so Libya read "ly" in the selection panel. Natural Earth already ships the
 * English name for every shape, so the map itself is the fallback table, and no list of country
 * names is hand-maintained anywhere in the client.
 */
export function atlasNames(): ReadonlyMap<string, string> {
  if (nameCache !== null) {
    return nameCache;
  }
  const map = new Map<string, string>();
  for (const shape of countryShapes()) {
    if (shape.id !== null && shape.name !== "") {
      map.set(shape.id, shape.name);
    }
  }
  nameCache = map;
  return map;
}

/** A country's de jure geometry: the atlas's, with the territories' parts given to their owners. */
export function countryGeometry(id: string): GeoGeometry | undefined {
  countryShapes();
  return geometryCache?.find((entry) => alpha2FromFeatureId(entry.id) === id)?.geometry;
}
