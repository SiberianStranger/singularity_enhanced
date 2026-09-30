/**
 * Territorial control and recognition (SYS-26, `docs/design/26-territorial-control.md`), as data
 * and as the rules the map draws it by.
 *
 * A territory is never a country. Countries keep their de jure geometry, so selection, statistics
 * and a country's agencies do not change when control does; a territory is an overlay with an id
 * of its own that says who holds the land now and how far the world accepts it. The shapes below
 * are SYS-26's `TerritoryDef` exactly, so the list can move into content (and the world state)
 * without being reshaped; until then the client holds it, and `ukraine-control.ts` is where the
 * two Ukrainian territories and their sources live.
 *
 * Nothing here knows about Ukraine: the drawing rules read a status and a number, and a territory
 * a scenario adds (a Taiwan crisis, the Baltic states, an island in a strait) is drawn by the same
 * code as Crimea.
 */

import type { TFunction } from "i18next";
import { UKRAINE_LIGHT_PROFILES, UKRAINE_TERRITORIES } from "./ukraine-control.js";

/** How the world regards the holder's title (SYS-26 "The model"). */
export type RecognitionStatus =
  /** Control and title agree; drawn as the controller's own territory. */
  | "recognized"
  /** Title contested between states, control stable (for example Kashmir). */
  | "disputed"
  /** The controller claims it as its own; most of the world does not accept it. */
  | "annexed_unrecognized"
  /** Held by force, with no claim of title that others accept. */
  | "occupied"
  /** Control itself is being fought over (a front, a blockade, a landing). */
  | "contested";

export const RECOGNITION_STATUSES: readonly RecognitionStatus[] = [
  "recognized",
  "disputed",
  "annexed_unrecognized",
  "occupied",
  "contested",
];

/** A country as the core names it: the lowercase ISO 3166-1 alpha-2 code. */
export type CountryId = string;

/** Longitude and latitude, in degrees. */
export type LonLat = [number, number];

/** A GeoJSON polygon whose exterior ring is clockwise: d3-geo's small-polygon convention. */
export interface GeoPolygon {
  type: "Polygon";
  coordinates: LonLat[][];
}

/**
 * Where a territory is on the map. Authored, generalized to the world map's scale, never traced
 * from restricted maps (SYS-26). Three shapes cover what a scenario needs:
 *
 * - `atlas_part`: a polygon the world atlas already draws on its own (an island, a peninsula it
 *   separates), found by a point inside it. The atlas files it under the de jure owner; where the
 *   atlas has it elsewhere, the client moves it there before any country is drawn (Crimea).
 * - `envelope`: an authored outline of the held area, drawn as its intersection with the de jure
 *   owner's land less the parts other territories take. Its closing edges may run through sea and
 *   foreign land and carry no meaning. `as_of` dates the line.
 * - `polygon`: an authored shape drawn as it is, for land the atlas is too coarse to carry (a small
 *   island in a strait).
 */
export type TerritoryGeometry =
  | { kind: "atlas_part"; seed: LonLat }
  | { kind: "envelope"; as_of: string; polygon: GeoPolygon }
  | { kind: "polygon"; polygon: GeoPolygon };

/** SYS-26's `TerritoryDef`, field for field. */
export interface TerritoryDef {
  /** "ua_crimea", "ua_occupied_mainland", "tw_kinmen", ... */
  id: string;
  name_key: string;
  /** The state whose territory it is in international law. */
  de_jure: CountryId;
  /** The state that holds it now. */
  de_facto: CountryId;
  status: RecognitionStatus;
  /** 0..1: the share of the world that accepts the de facto holder's title. */
  recognition: number;
  /** ISO date since which the holder has held it as drawn (the control baseline). */
  since: string;
  geometry: TerritoryGeometry;
  /** Night-light factor, art tuning, 0..1; absent or 1 leaves the original lights alone. */
  light_profile?: number;
  /** Public, citable text assessments (docs/research); art tuning is labelled as such. */
  sources: string[];
}

/**
 * A finer night-light footprint inside a territory: an urban core kept brighter, a destroyed one
 * darker. Art tuning like the territory's own `light_profile`, which it replaces where it applies;
 * profiles are evaluated in order and the last one that matches wins, so a factor is never
 * multiplied into another.
 */
export interface TerritoryLightProfile {
  id: string;
  territory: string;
  factor: number;
  geometry: GeoPolygon;
}

/** Every territory the map draws. */
export const TERRITORIES: readonly TerritoryDef[] = [...UKRAINE_TERRITORIES];

/** Every finer light profile, in evaluation order. */
export const TERRITORY_LIGHT_PROFILES: readonly TerritoryLightProfile[] = [
  ...UKRAINE_LIGHT_PROFILES,
];

export function territoryById(
  id: string,
  list: readonly TerritoryDef[] = TERRITORIES,
): TerritoryDef | undefined {
  return list.find((territory) => territory.id === id);
}

/*
 * How it is drawn (SYS-26), as numbers a test can hold the renderer to.
 *
 * 1. Fill: the de facto holder's colour in the current map mode, so the territory reads as held.
 * 2. Recognition: a hatch in the de jure owner's colour over the fill, denser and more visible
 *    the lower the recognition. The status picks the tier (a light hatch for an unrecognized
 *    annexation, a denser one for an occupation, a cross-hatch while control is fought over, none
 *    for a recognized one); inside a tier the recognition figure tightens it further.
 * 3. The line: the de jure border stays solid; the edge of de facto control is dashed.
 */

export type HatchKind = "none" | "diagonal" | "cross";

export interface HatchRule {
  kind: HatchKind;
  /** Distance between two lines, in screen pixels. */
  spacing: number;
  /** Line width, in screen pixels. */
  width: number;
  opacity: number;
}

const HATCH_TIERS: Readonly<Record<RecognitionStatus, HatchRule>> = {
  recognized: { kind: "none", spacing: 0, width: 0, opacity: 0 },
  disputed: { kind: "diagonal", spacing: 11, width: 1, opacity: 0.5 },
  annexed_unrecognized: { kind: "diagonal", spacing: 8, width: 1.1, opacity: 0.62 },
  occupied: { kind: "diagonal", spacing: 4.5, width: 1.2, opacity: 0.78 },
  contested: { kind: "cross", spacing: 5.5, width: 1.2, opacity: 0.85 },
};

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * The hatch a territory is drawn with. The spacing opens by up to half again and the lines fade by
 * up to a quarter as recognition rises from none to all, so of two territories in one tier the one
 * fewer states accept is the denser.
 */
export function hatchFor(status: RecognitionStatus, recognition: number): HatchRule {
  const tier = HATCH_TIERS[status];
  if (tier.kind === "none") {
    return tier;
  }
  const accepted = clamp01(recognition);
  return {
    kind: tier.kind,
    spacing: tier.spacing * (1 + 0.5 * accepted),
    width: tier.width,
    opacity: tier.opacity * (1 - 0.25 * accepted),
  };
}

/** Whether the edge of the holder's control is drawn: a dashed line wherever it crosses land. */
export function dashedEdge(status: RecognitionStatus): boolean {
  return status !== "recognized";
}

/**
 * The colours a territory is painted in, given the fill every country gets in the current map mode.
 *
 * The fill is the holder's own. The hatch is the owner's hue, drawn solid enough to read over any
 * fill; when the owner has no hue in this mode (an unfilled country on the textured map, bare land
 * on the flat one) or shares the holder's (the same category, or any scale mode, where only the
 * intensity differs), the hatch is drawn in the map's line colour instead, so that a territory the
 * world does not accept never looks accepted because two colours happened to agree.
 */
export interface TerritoryPaint {
  fill: string;
  hatch: string;
  edge: string;
}

/** The "r g b" triplet of an `rgb(r g b / a%)` fill, or null for anything without a hue. */
export function hueOf(fill: string): string | null {
  const match = /^rgb\((\d+ \d+ \d+) \/ [\d.]+%\)$/.exec(fill.trim());
  return match?.[1] ?? null;
}

export function territoryPaint(
  ownerFill: string,
  holderFill: string,
  line: string,
): TerritoryPaint {
  const owner = hueOf(ownerFill);
  const holder = hueOf(holderFill);
  return {
    fill: holderFill,
    hatch: owner !== null && owner !== holder ? `rgb(${owner} / 92%)` : line,
    edge: line,
  };
}

/** Which recognition wording a sentence takes: almost none, a minority, most. */
export function recognitionBand(recognition: number): "none" | "few" | "most" {
  const accepted = clamp01(recognition);
  return accepted < 0.1 ? "none" : accepted < 0.5 ? "few" : "most";
}

/**
 * What the map shows, in words: the tooltip and the selection panel's line for a territory
 * (SYS-26 rule 5). The names stand in the nominative in every language, so the Russian template
 * can frame them with colons rather than ask a country's name for a case (SYS-14 ru, R4).
 */
export function territorySentence(
  t: TFunction,
  territory: TerritoryDef,
  countryName: (id: CountryId) => string,
): string {
  return t(`territory.tip.${territory.status}`, {
    name: t(territory.name_key),
    owner: countryName(territory.de_jure),
    holder: countryName(territory.de_facto),
    // A string, not a number: a number would be printed with a thousands separator.
    year: territory.since.slice(0, 4),
    band: recognitionBand(territory.recognition),
  });
}
