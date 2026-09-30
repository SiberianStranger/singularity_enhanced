/**
 * Frozen, authored WORLD-MAP generalization. This is not a surveyed or live front line.
 * Source facts and limits: docs/research/ukraine-map-2026-09.md.
 * No ISW/DeepState vector geometry was copied, traced or fetched into this module.
 * Sovereignty and current visual control are distinct: every region here selects Ukraine.
 */
export const CONTROL_BASELINE_DATE = "2026-09-28";
export const CONTROL_GEOMETRY_KIND = "authored-generalization";
export const CRIMEA_SEED: [number, number] = [34.1, 44.95];
/** Explicit visual choice requested by the maintainer, not a measured 2026 radiance ratio. */
export const CRIMEA_LIGHT_FACTOR = 1;

export interface UkrainePolygon {
  type: "Polygon";
  /** Longitude/latitude, clockwise exterior for d3-geo's small-polygon convention. */
  coordinates: [number, number][][];
}

export interface UkraineControlRegion {
  id: string;
  countryId: "ua";
  controllerId: "ru";
  baselineDate: typeof CONTROL_BASELINE_DATE;
  geometryKind: typeof CONTROL_GEOMETRY_KIND;
  /** Must be clipped to Ukraine's mainland land path, excluding the separate Crimea path. */
  geometry: UkrainePolygon;
}

export interface UkraineLightProfile {
  id: string;
  /** Absolute brightness relative to the original night lights; not a demographic ratio. */
  factor: number;
  /** A visual footprint, not an administrative, control or surveyed built-up boundary. */
  geometry: UkrainePolygon;
}

/**
 * Broad lower-Dnipro / southern land-corridor / eastern-Ukraine envelope.
 * Independent editorial coordinates guided by the general control facts in CTP/ISW reports
 * of 25 and 28 September 2026, not samples from the publishers' maps or shapefiles:
 * https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-25-2026
 * https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-september-28-2026
 *
 * The southern/eastern closing edges deliberately extend through water/foreign land. They have
 * no control meaning: the renderer MUST intersect this envelope with the Ukraine mainland.
 * Small border pockets, islands, gray zones and local changes are unresolved at this scale.
 * Coordinates between the documented city/river anchors are authored interpolation.
 */
const mainlandEnvelope: UkrainePolygon = {
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
      [40.6, 46],
      [31.85, 46],
      [31.85, 46.42],
    ],
  ],
};

export const UKRAINE_CONTROL_REGIONS: readonly UkraineControlRegion[] = [
  {
    id: "ua-occupied-mainland",
    countryId: "ua",
    controllerId: "ru",
    baselineDate: CONTROL_BASELINE_DATE,
    geometryKind: CONTROL_GEOMETRY_KIND,
    geometry: mainlandEnvelope,
  },
];
/**
 * ART TUNING, never NASA measurements. Evaluate in order: the last matching profile wins.
 * In particular, a city factor REPLACES 0.25; multiplying them would dim it twice.
 * All profiles are restricted to the control envelope AND Ukraine mainland by the renderer.
 * Crimea is handled separately with CRIMEA_LIGHT_FACTOR and its atlas-derived geometry.
 *
 * Urban footprints are deliberately coarse octagons around city cores. They do not depict
 * individual facilities, the exact built-up extent, or a current power-restoration survey.
 * Historical destruction motivates lower pockets (UN/OHCHR 2022 and UN 2024), but the exact
 * factors and persistence into the game's frozen baseline are authored visual choices.
 */
export const UKRAINE_LIGHT_PROFILES: readonly UkraineLightProfile[] = [
  { id: "mainland-default", factor: 0.25, geometry: mainlandEnvelope },
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
