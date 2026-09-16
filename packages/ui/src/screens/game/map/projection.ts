/**
 * Equirectangular projection and SVG path building.
 *
 * The map is a plate carree: longitude maps linearly to x, latitude to y. It keeps the day/night
 * terminator a simple curve, makes city markers exact, costs nothing to zoom, and is the projection
 * the Blue Marble rasters under the vector layer are already in, so the two line up pixel for pixel
 * without resampling anything.
 *
 * Paths go through d3-geo's path generator rather than a hand-written loop. The loop drew every
 * ring straight from longitude to x, so a polygon crossing the antimeridian (Russia, Fiji, the
 * Aleutians, Chukotka, Antarctica) came back as a band straight across the map: the playtest's
 * "broken over Russia". d3-geo clips at the antimeridian first and closes the pieces along it,
 * which is the standard fix. `precision(0)` turns adaptive resampling off: the source data is
 * already dense, and in a plate carree its segments are meant to be straight lines.
 */

import { geoEquirectangular, geoPath } from "d3-geo";

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export interface Point {
  x: number;
  y: number;
}

/**
 * The same plate carree the analytic helpers below implement: at this scale and translation
 * d3's projection and `project()` agree to the last decimal, so markers, the terminator and the
 * country outlines share one coordinate system.
 */
export const projection = geoEquirectangular()
  .scale(MAP_WIDTH / (2 * Math.PI))
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
  .precision(0);

const path = geoPath(projection);

export function project(lon: number, lat: number): Point {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

export function unproject(x: number, y: number): { lon: number; lat: number } {
  return {
    lon: (x / MAP_WIDTH) * 360 - 180,
    lat: 90 - (y / MAP_HEIGHT) * 180,
  };
}

export interface GeoGeometry {
  type: string;
  coordinates: unknown;
}

/** SVG path for a GeoJSON geometry, clipped at the antimeridian; empty when nothing projects. */
export function geometryToPath(geometry: GeoGeometry | null | undefined): string {
  if (geometry == null) {
    return "";
  }
  return path(geometry as Parameters<typeof path>[0]) ?? "";
}
