/**
 * The two Ukrainian territories of SYS-26: Crimea, annexed and not recognized, and the occupied
 * mainland, with the dated line, the night-light profiles and the sources behind them.
 *
 * Frozen, authored WORLD-MAP generalization. This is not a surveyed or live front line.
 * Source facts and limits: docs/research/ukraine-map-2026-09.md.
 * No ISW/DeepState vector geometry was copied, traced or fetched into this module.
 * Sovereignty and current visual control are distinct: both territories are Ukraine's, and a click
 * on either selects Ukraine.
 */

import type { GeoPolygon, LonLat, TerritoryDef, TerritoryLightProfile } from "./territories.js";

/** The date the mainland's line describes. */
export const CONTROL_BASELINE_DATE = "2026-09-28";
export const CONTROL_GEOMETRY_KIND = "authored-generalization";
/** A point in Crimea (Simferopol) that finds the peninsula's polygon in the world atlas. */
export const CRIMEA_SEED: LonLat = [34.1, 44.95];
/** Explicit visual choice requested by the maintainer, not a measured 2026 radiance ratio. */
export const CRIMEA_LIGHT_FACTOR = 1;
/** Art tuning for the occupied mainland outside the finer profiles below, not a measurement. */
export const MAINLAND_LIGHT_FACTOR = 0.25;

const CRIMEA_ID = "ua_crimea";
const MAINLAND_ID = "ua_occupied_mainland";

const RESEARCH_NOTE = "docs/research/ukraine-map-2026-09.md";
const LIGHT_TUNING =
  "art tuning: the night-light factors are authored, not measured " +
  '(docs/research/ukraine-map-2026-09.md, "Lighting is a separate visual model")';

/**
 * Broad lower-Dnipro / southern land-corridor / eastern-Ukraine envelope.
 * Independent editorial coordinates guided by the general control facts in CTP/ISW reports
 * of 25 and 28 September 2026, not samples from the publishers' maps or shapefiles:
 * https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-25-2026
 * https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-28-2026
 *
 * The southern/eastern closing edges deliberately extend through water/foreign land. They have
 * no control meaning: the renderer intersects this envelope with Ukraine's land less Crimea.
 * Small border pockets, islands, gray zones and local changes are unresolved at this scale.
 * Coordinates between the documented city/river anchors are authored interpolation.
 */
const MAINLAND_ENVELOPE: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [31.85, 46.42],
      [32.3, 46.51],
      [32.52, 46.57],
      [32.75, 46.67],
      [33.1, 46.8],
      [33.3, 46.86],
      [34.4, 47.48],
      [34.7, 47.58],
      [35.2, 47.5],
      [35.7, 47.45],
      [36.15, 47.55],
      [36.55, 47.9],
      [36.85, 48.08],
      [37.1, 48.25],
      [37.35, 48.38],
      [37.6, 48.4],
      // Nudged north-west after the map review of 2026-09-30: the edge ran through Bakhmut and
      // just south of Soledar, both of which the dated reports place well inside.
      [37.8, 48.53],
      [38.1, 48.77],
      [38.06, 48.96],
      [37.98, 49.1],
      [38.05, 49.45],
      [37.9, 49.7],
      [38.02, 50.08],
      [40.6, 50.1],
      // The closing edge runs south of 46 N since the SYS-26 pass (2026-09-30): at 46 N it left
      // the atlas's strip of mainland beside Crimea (the Perekop and Arabat approaches, held since
      // 2022, down to 45.74 N) outside the envelope, which the new fill drew in Ukraine's colour.
      // Crimea itself is excluded by the clip, so the edge still carries no control meaning.
      [40.6, 45.6],
      [31.85, 45.6],
      [31.85, 46.42],
    ],
  ],
};

/**
 * The recognition figures are an upper bound on acceptance, not a count of formal recognitions:
 * the share of the 193 UN members that voted against the General Assembly resolution upholding
 * Ukraine's territorial integrity in each case.
 */
export const UKRAINE_TERRITORIES: readonly TerritoryDef[] = [
  {
    id: CRIMEA_ID,
    name_key: "territory.ua_crimea.name",
    de_jure: "ua",
    de_facto: "ru",
    status: "annexed_unrecognized",
    // A/RES/68/262 (27 March 2014): 100 for, 11 against, 58 abstentions; 11 / 193 = 0.057.
    recognition: 0.06,
    // The day Russia declared the annexation; it has held the peninsula since then.
    since: "2014-03-18",
    geometry: { kind: "atlas_part", seed: CRIMEA_SEED },
    light_profile: CRIMEA_LIGHT_FACTOR,
    sources: [
      RESEARCH_NOTE,
      "https://digitallibrary.un.org/record/767565",
      "https://news.un.org/en/story/2014/03/464812",
      "art tuning: Crimea keeps the original night lights at the maintainer's request " +
        `(${RESEARCH_NOTE})`,
    ],
  },
  {
    id: MAINLAND_ID,
    name_key: "territory.ua_occupied_mainland.name",
    de_jure: "ua",
    de_facto: "ru",
    status: "occupied",
    // A/RES/ES-11/4 (12 October 2022): 143 for, 5 against, 35 abstentions; 5 / 193 = 0.026.
    recognition: 0.03,
    /*
     * The full-scale invasion. One territory generalizes two histories: the Donetsk and Luhansk
     * cores have been held by Russia and its proxies since 2014, the land corridor and the rest
     * since 2022; the sentence gives the year the bulk of it was taken. A scenario that needs the
     * difference splits the envelope into two territories.
     */
    since: "2022-02-24",
    geometry: { kind: "envelope", as_of: CONTROL_BASELINE_DATE, polygon: MAINLAND_ENVELOPE },
    light_profile: MAINLAND_LIGHT_FACTOR,
    sources: [
      RESEARCH_NOTE,
      "https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-25-2026",
      "https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-28-2026",
      "https://www.gov.uk/government/news/joint-statement-on-russias-sham-elections-in-ukraines-temporarily-occupied-territories",
      "https://news.un.org/en/story/2022/10/1129492",
      LIGHT_TUNING,
    ],
  },
];

/**
 * ART TUNING, never NASA measurements. Evaluate in order: the last matching profile wins.
 * In particular, a city factor REPLACES the mainland's 0.25; multiplying them would dim it twice.
 * Every profile is restricted to its territory's drawn shape by the renderer.
 * Crimea keeps the original lights (CRIMEA_LIGHT_FACTOR) and has no finer profile.
 *
 * Urban footprints are deliberately coarse octagons around city cores. They do not depict
 * individual facilities, the exact built-up extent, or a current power-restoration survey.
 * Historical destruction motivates lower pockets (UN/OHCHR 2022 and UN 2024), but the exact
 * factors and persistence into the game's frozen baseline are authored visual choices.
 */
export const UKRAINE_LIGHT_PROFILES: readonly TerritoryLightProfile[] = [
  /*
   * The Donetsk-Luhansk industrial cluster, which the maintainer's request (2026-09-29) asks to
   * keep brighter than the rest of the occupied mainland: "approximately the Donetsk-Luhansk
   * cluster", reduced, and the rest reduced further. A coarse band around the contiguous urban
   * chain Donetsk, Makiivka, Khartsyzk, Shakhtarsk, Snizhne, Horlivka and Yenakiieve on one side
   * and Alchevsk, Kadiivka, Khrustalnyi, Rovenky, Luhansk and Sorokyne on the other, drawn from
   * those cities' public coordinates. It is a visual footprint, not the 2014-2022 line of contact
   * or any administrative boundary, and the factor is art tuning like every other one here. The
   * city-core profiles after it still replace it where they apply.
   */
  {
    id: "donetsk-luhansk-cluster",
    territory: MAINLAND_ID,
    factor: 0.45,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [37.62, 47.92],
          [37.72, 48.12],
          [37.9, 48.3],
          [38.1, 48.4],
          [38.45, 48.55],
          [38.75, 48.62],
          [39.1, 48.7],
          [39.4, 48.66],
          [39.75, 48.45],
          [40.0, 48.15],
          [39.85, 47.95],
          [39.2, 47.95],
          [38.75, 47.9],
          [38.35, 47.85],
          [37.95, 47.78],
          [37.62, 47.92],
        ],
      ],
    },
  },
  {
    id: "donetsk-makiivka-core",
    territory: MAINLAND_ID,
    factor: 0.55,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [37.6, 48.02],
          [37.69, 48.139],
          [37.9, 48.19],
          [38.11, 48.139],
          [38.2, 48.02],
          [38.11, 47.901],
          [37.9, 47.85],
          [37.69, 47.901],
          [37.6, 48.02],
        ],
      ],
    },
  },
  {
    id: "luhansk-core",
    territory: MAINLAND_ID,
    factor: 0.6,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [39.09, 48.57],
          [39.159, 48.661],
          [39.32, 48.7],
          [39.481, 48.661],
          [39.55, 48.57],
          [39.481, 48.479],
          [39.32, 48.44],
          [39.159, 48.479],
          [39.09, 48.57],
        ],
      ],
    },
  },
  {
    id: "mariupol-damaged-core",
    territory: MAINLAND_ID,
    factor: 0.12,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [37.37, 47.1],
          [37.424, 47.177],
          [37.55, 47.21],
          [37.676, 47.177],
          [37.73, 47.1],
          [37.676, 47.023],
          [37.55, 46.99],
          [37.424, 47.023],
          [37.37, 47.1],
        ],
      ],
    },
  },
  {
    id: "bakhmut-damaged-core",
    territory: MAINLAND_ID,
    factor: 0.05,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [37.91, 48.6],
          [37.94, 48.663],
          [38.01, 48.69],
          [38.08, 48.663],
          [38.11, 48.6],
          [38.08, 48.537],
          [38.01, 48.51],
          [37.94, 48.537],
          [37.91, 48.6],
        ],
      ],
    },
  },
  {
    id: "avdiivka-damaged-core",
    territory: MAINLAND_ID,
    factor: 0.05,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [37.67, 48.14],
          [37.694, 48.189],
          [37.75, 48.21],
          [37.806, 48.189],
          [37.83, 48.14],
          [37.806, 48.091],
          [37.75, 48.07],
          [37.694, 48.091],
          [37.67, 48.14],
        ],
      ],
    },
  },
];
