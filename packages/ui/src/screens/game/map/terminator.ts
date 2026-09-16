/**
 * Day and night terminator (kept from the original game).
 *
 * The subsolar point is approximated: declination from the day of the year and the subsolar
 * longitude from the UTC hour. That is within a few degrees of the true position, which is far
 * inside the width of the line we draw, and it needs no ephemeris.
 */

import type { DateView } from "@singularity/core";
import { MAP_HEIGHT, MAP_WIDTH, project } from "./projection.js";

const DEG = Math.PI / 180;

function dayOfYear(date: DateView): number {
  const start = Date.UTC(date.year, 0, 0);
  const now = Date.UTC(date.year, date.month - 1, date.day);
  return Math.floor((now - start) / 86_400_000);
}

/** Solar declination in degrees, positive in the northern summer. */
export function declination(date: DateView): number {
  return -23.44 * Math.cos(DEG * ((360 / 365) * (dayOfYear(date) + 10)));
}

/** Longitude the sun stands over, in degrees, normalized to [-180, 180). */
export function subsolarLongitude(date: DateView): number {
  const longitude = (12 - date.hour) * 15;
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/**
 * The night side as one SVG path: the terminator curve closed along the pole that is in darkness.
 * An empty string means the whole map is lit or dark, which this approximation never produces.
 */
export function nightPath(date: DateView): string {
  const dec = declination(date);
  const sunLon = subsolarLongitude(date);
  const tanDec = Math.tan(dec * DEG);
  const safeTan = Math.abs(tanDec) < 1e-4 ? (tanDec < 0 ? -1e-4 : 1e-4) : tanDec;
  const points: string[] = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const hourAngle = (lon - sunLon) * DEG;
    const lat = Math.atan(-Math.cos(hourAngle) / safeTan) / DEG;
    const point = project(lon, Math.max(-89.9, Math.min(89.9, lat)));
    points.push(`${points.length === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
  }
  // The lit pole is the one the sun leans toward; the other one is inside the night polygon.
  const closingY = dec > 0 ? MAP_HEIGHT : 0;
  points.push(`L${MAP_WIDTH} ${closingY}`, `L0 ${closingY}`, "Z");
  return points.join("");
}
