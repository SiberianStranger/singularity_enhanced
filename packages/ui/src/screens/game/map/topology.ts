/**
 * Country outlines from `world-atlas` 110m (Natural Earth, public domain), decoded once.
 *
 * The atlas identifies countries by ISO 3166-1 numeric code; `iso.ts` maps those to the lowercase
 * alpha-2 ids the core uses for `CountryView`.
 */

import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import atlas from "world-atlas/countries-110m.json";
import { alpha2FromFeatureId } from "./iso.js";
import { type GeoGeometry, geometryToPath } from "./projection.js";
import { CRIMEA_SEED } from "./ukraine-control.js";

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

let cache: CountryShape[] | null = null;
let geometryCache: AtlasFeature[] | null = null;
let crimea: GeoGeometry | undefined;
let ukrainianMainland: GeoGeometry | undefined;
let nameCache: ReadonlyMap<string, string> | null = null;

/** All country shapes, decoded and projected once per session. */
export function countryShapes(): CountryShape[] {
  if (cache !== null) {
    return cache;
  }
  const collection = feature(atlas as never, "countries") as unknown as {
    features?: AtlasFeature[];
  };
  const decoded = collection.features ?? [];
  const russia = decoded.find((entry) => alpha2FromFeatureId(entry.id) === "ru");
  const ukraine = decoded.find((entry) => alpha2FromFeatureId(entry.id) === "ua");
  if (russia?.geometry?.type === "MultiPolygon" && ukraine?.geometry !== undefined) {
    const parts = russia.geometry.coordinates as number[][][][];
    const index = parts.findIndex(
      (coordinates) =>
        coordinates
          .flat()
          .every(
            ([lon, lat]) =>
              lon !== undefined &&
              lat !== undefined &&
              lon > 32 &&
              lon < 37 &&
              lat > 44 &&
              lat < 47,
          ) &&
        geoContains(
          { type: "Polygon", coordinates } as Parameters<typeof geoContains>[0],
          CRIMEA_SEED,
        ),
    );
    if (index < 0) {
      // A future atlas that draws Crimea differently must not stop the client from loading: the
      // map is drawn as the atlas has it and the Ukraine layers stay off (map review, 2026-09-30).
      console.warn(
        "The atlas no longer exposes Crimea as a separable polygon; the Ukraine layers are off.",
      );
    } else {
      crimea = { type: "Polygon", coordinates: parts[index] };
      ukrainianMainland = ukraine.geometry;
      russia.geometry = {
        type: "MultiPolygon",
        coordinates: parts.filter((_, part) => part !== index),
      };
      const uaParts =
        ukraine.geometry.type === "Polygon"
          ? [ukraine.geometry.coordinates]
          : (ukraine.geometry.coordinates as unknown[]);
      ukraine.geometry = { type: "MultiPolygon", coordinates: [...uaParts, crimea.coordinates] };
    }
  }
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

/** Sovereign geometry and separate visual regions share the exact same atlas coordinates. */
export function countryGeometry(id: string): GeoGeometry | undefined {
  countryShapes();
  return geometryCache?.find((entry) => alpha2FromFeatureId(entry.id) === id)?.geometry;
}
export function ukraineMapParts(): {
  mainland: GeoGeometry | undefined;
  crimea: GeoGeometry | undefined;
} {
  countryShapes();
  return { mainland: ukrainianMainland, crimea };
}
