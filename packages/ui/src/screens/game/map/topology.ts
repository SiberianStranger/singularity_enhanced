/**
 * Country outlines from `world-atlas` 110m (Natural Earth, public domain), decoded once.
 *
 * The atlas identifies countries by ISO 3166-1 numeric code; `iso.ts` maps those to the lowercase
 * alpha-2 ids the core uses for `CountryView`.
 */

import { feature } from "topojson-client";
import atlas from "world-atlas/countries-110m.json";
import { alpha2FromFeatureId } from "./iso.js";
import { type GeoGeometry, geometryToPath } from "./projection.js";

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
let nameCache: ReadonlyMap<string, string> | null = null;

/** All country shapes, decoded and projected once per session. */
export function countryShapes(): CountryShape[] {
  if (cache !== null) {
    return cache;
  }
  const collection = feature(atlas as never, "countries") as unknown as {
    features?: AtlasFeature[];
  };
  cache = (collection.features ?? [])
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
