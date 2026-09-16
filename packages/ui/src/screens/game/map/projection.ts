/**
 * Equirectangular projection and SVG path building.
 *
 * The map is a plate carree: longitude maps linearly to x, latitude to y. It keeps the day/night
 * terminator a simple curve, makes city markers exact without a projection library, and costs
 * nothing to zoom, which is what a strategy map needs.
 */

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export interface Point {
  x: number;
  y: number;
}

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

type Position = readonly number[];
type Ring = readonly Position[];

export interface GeoGeometry {
  type: string;
  coordinates: unknown;
}

function ringToPath(ring: Ring): string {
  let path = "";
  for (const [index, position] of ring.entries()) {
    const lon = position[0];
    const lat = position[1];
    if (lon === undefined || lat === undefined) {
      continue;
    }
    const point = project(lon, lat);
    path += `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return path === "" ? "" : `${path}Z`;
}

/** SVG path for a GeoJSON Polygon or MultiPolygon; other geometry types produce an empty path. */
export function geometryToPath(geometry: GeoGeometry | null | undefined): string {
  if (geometry == null) {
    return "";
  }
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as Ring[]).map(ringToPath).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as Ring[][])
      .map((polygon) => polygon.map(ringToPath).join(""))
      .join("");
  }
  return "";
}
