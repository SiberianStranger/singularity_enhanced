/**
 * Where the map is looking, and the rules every change of it obeys (playtest 3, R14).
 *
 * It lives apart from `WorldMap.tsx` because the game screen draws the zoom buttons in its own
 * bottom bar rather than in the map's corner (control room, 2026-09-30): the buttons and the map
 * share the view through the UI store, and both apply the same clamp and wrap through here.
 */

import { MAP_HEIGHT, MAP_WIDTH } from "./projection.js";

export interface ViewBox {
  x: number;
  y: number;
  k: number;
}

export const INITIAL_VIEW: ViewBox = { x: 0, y: 0, k: 1 };

/** Zoom bounds; 1 is the whole world, 12 is a city block's worth of a country. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 12;

/** The factor one press of a zoom button (or of plus and minus on the map) zooms by. */
export const ZOOM_STEP = 1.4;

/**
 * Longitude wraps, so the map does too (playtest 3, R14).
 *
 * The plate carree layers tile horizontally by construction: the pixel at x = MAP_WIDTH is the
 * pixel at x = 0. Panning east past the antimeridian therefore only needs the same content drawn
 * once more, one map width to the right, and the view box's x kept inside [0, MAP_WIDTH). That is
 * what lets a player pushed off the Americas by the primary panel simply keep dragging west
 * instead of being clamped against an edge.
 */
export function wrapX(x: number): number {
  return ((x % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

/** Latitude does not wrap: the view box is clamped so the poles stay at the edges. */
export function clampY(y: number, k: number): number {
  const height = MAP_HEIGHT / k;
  return Math.min(MAP_HEIGHT - height, Math.max(0, y));
}

/** The view a writer asked for, wrapped round the antimeridian and clamped at the poles. */
export function fixView(next: ViewBox): ViewBox {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.k));
  return { k, x: wrapX(next.x), y: clampY(next.y, k) };
}

/** Zooms about the centre of what is visible, which is what the buttons and the keys do. */
export function zoomView(view: ViewBox, factor: number): ViewBox {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
  return fixView({
    k: next,
    x: view.x + (MAP_WIDTH / view.k - MAP_WIDTH / next) / 2,
    y: view.y + (MAP_HEIGHT / view.k - MAP_HEIGHT / next) / 2,
  });
}
