/**
 * Where each territory is drawn: SYS-26's authored geometry resolved against the decoded atlas.
 *
 * An atlas part is the polygon of its owner's (corrected) outline that holds its seed; an envelope
 * is clipped to its owner's land less the atlas parts other territories take, so the occupied
 * mainland never paints over Crimea; an authored polygon is drawn as it is. A territory whose
 * geometry cannot be resolved (an atlas without that part, an owner the atlas does not draw) is
 * left off with a warning, and the rest of the map, the other territories included, is drawn as
 * before: the fail-soft rule of the map review (2026-09-30), now per territory rather than for the
 * whole layer.
 */

import { geometryToPath } from "./projection.js";
import {
  type CountryId,
  TERRITORIES,
  TERRITORY_LIGHT_PROFILES,
  type TerritoryDef,
  type TerritoryLightProfile,
} from "./territories.js";
import {
  containsPoint,
  countryGeometry,
  countryShapes,
  type PolygonRings,
  polygonsOf,
} from "./topology.js";

export interface DrawnLightProfile {
  id: string;
  factor: number;
  path: string;
}

export interface DrawnTerritory {
  def: TerritoryDef;
  /** The outline filled and hit: the atlas part, the authored polygon, or the envelope. */
  path: string;
  /** Whether `path` is an envelope that has to be clipped to `landPath` to become the shape. */
  clipped: boolean;
  /**
   * The owner's land less every atlas part a territory takes: what an envelope is clipped to, and
   * where the dashed edge of control can run.
   */
  landPath: string;
  /** The owner's outline, redrawn over the territory so the de jure border stays solid. */
  ownerPath: string;
  profiles: DrawnLightProfile[];
}

const warned = new Set<string>();

function warnOnce(id: string, message: string): void {
  if (!warned.has(id)) {
    warned.add(id);
    console.warn(message);
  }
}

export function resolveTerritories(
  defs: readonly TerritoryDef[],
  profiles: readonly TerritoryLightProfile[] = TERRITORY_LIGHT_PROFILES,
): DrawnTerritory[] {
  const shapes = countryShapes();
  // The atlas parts first: they are what the envelopes of the same owner must leave alone.
  const parts = new Map<string, PolygonRings>();
  const taken = new Map<CountryId, Set<PolygonRings>>();
  for (const def of defs) {
    const geometry = def.geometry;
    if (geometry.kind !== "atlas_part") {
      continue;
    }
    const rings = polygonsOf(countryGeometry(def.de_jure)).find((entry) =>
      containsPoint(entry, geometry.seed),
    );
    if (rings === undefined) {
      warnOnce(def.id, `The atlas gives ${def.de_jure} no polygon at ${def.id}; it is not drawn.`);
      continue;
    }
    parts.set(def.id, rings);
    taken.set(def.de_jure, new Set([...(taken.get(def.de_jure) ?? []), rings]));
  }

  const drawn: DrawnTerritory[] = [];
  for (const def of defs) {
    const own = polygonsOf(countryGeometry(def.de_jure));
    const skip = taken.get(def.de_jure) ?? new Set<PolygonRings>();
    const land = own.filter((rings) => !skip.has(rings));
    const landPath = geometryToPath({ type: "MultiPolygon", coordinates: land });
    const ownerPath = shapes
      .filter((shape) => shape.id === def.de_jure)
      .map((shape) => shape.path)
      .join("");
    let path = "";
    let clipped = false;
    switch (def.geometry.kind) {
      case "atlas_part": {
        const rings = parts.get(def.id);
        path = rings === undefined ? "" : geometryToPath({ type: "Polygon", coordinates: rings });
        break;
      }
      case "envelope":
        if (landPath === "") {
          warnOnce(def.id, `The atlas has no land of ${def.de_jure} for ${def.id}; not drawn.`);
          break;
        }
        path = geometryToPath(def.geometry.polygon);
        clipped = true;
        break;
      default:
        path = geometryToPath(def.geometry.polygon);
    }
    if (path === "") {
      continue;
    }
    drawn.push({
      def,
      path,
      clipped,
      landPath,
      ownerPath,
      profiles: profiles
        .filter((profile) => profile.territory === def.id)
        .map((profile) => ({
          id: profile.id,
          factor: profile.factor,
          path: geometryToPath(profile.geometry),
        })),
    });
  }
  return drawn;
}

let resolved: DrawnTerritory[] | null = null;

/** The map's own territories, resolved once per session like the country shapes. */
export function drawnTerritories(): DrawnTerritory[] {
  resolved ??= resolveTerritories(TERRITORIES);
  return resolved;
}
