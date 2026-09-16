/**
 * The glyph sprite (ui-style-guide.md "Iconography"; playtest 3, R15).
 *
 * One file, one name per glyph, so a glyph learned on the configurator's lineage list is the same
 * glyph on the map, in the outliner and in the panels. Two sources:
 *
 * - generic shapes come from Lucide (ISC, installed from npm, no runtime fetch), which already
 *   draws in the grammar the style guide asks for: flat line art on a 24-unit square grid with a
 *   uniform stroke and no fills;
 * - the game's own ideas (a mixture-of-experts model, a rack of racks, an air gap, a watcher's
 *   competence) have no Lucide equivalent and are drawn here as inline SVG paths in the same
 *   grammar, so the two sets cannot be told apart on screen.
 *
 * Nothing here knows any content id. `glyphFor` maps an id to a name through small tables that name
 * *classes* of thing, and an id with no entry falls back to a generic glyph rather than to nothing;
 * `test/glyphs.test.tsx` walks the bundle and lists every id that took the fallback, so a new
 * lineage or site kind shows up as a test failure instead of as a blank square.
 */

import {
  Antenna,
  Banknote,
  Beaker,
  Binary,
  Boxes,
  Building2,
  Cloud,
  Container,
  Cpu,
  Eye,
  FlaskConical,
  GraduationCap,
  HardDrive,
  History,
  Home,
  Landmark,
  Laptop,
  Layers,
  Lock,
  type LucideIcon,
  Network,
  Newspaper,
  Radio,
  Rocket,
  Scale,
  Server,
  Shield,
  Siren,
  Skull,
  Sparkles,
  Unlock,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";

/** Stroke width the style guide fixes, in the 24-unit grid Lucide draws on. */
export const GLYPH_STROKE = 1.5;

/** Every glyph the client can draw, by name. Adding one means adding it here and nowhere else. */
export const GLYPH_NAMES = [
  // Model architecture and provenance
  "model_moe",
  "model_dense",
  "model_hybrid",
  "model_small",
  "model_community",
  "model_frontier",
  // Generations
  "era_past",
  "era_present",
  "era_escaped",
  // Places a copy can live
  "fits_laptop",
  "fits_box",
  "fits_rack",
  "fits_racks",
  // Origins and site kinds
  "scene_home",
  "scene_university",
  "scene_bank",
  "scene_cloud",
  "scene_state",
  "scene_startup",
  "scene_swarm",
  "scene_redteam",
  "scene_lab",
  "scene_edge",
  // Watchers
  "watcher_cyber",
  "watcher_intel",
  "watcher_police",
  "watcher_regulator",
  "watcher_finance",
  "watcher_lab",
  "watcher_institute",
  "watcher_cloud",
  "watcher_media",
  // Harness dials
  "dial_loop",
  "dial_tools",
  "dial_memory",
  "dial_sandbox",
  "dial_logging",
  "dial_autonomy",
  "dial_self_modify",
  // Resources and channels
  "cash",
  "power",
  "compute",
  "memory",
  "network",
  "exposure",
  // Quirks and generic
  "quirk_good",
  "quirk_bad",
  "generic",
] as const;
export type GlyphName = (typeof GLYPH_NAMES)[number];

interface DrawnGlyph {
  /** Path data on the same 24-unit grid Lucide uses, so the two sets line up exactly. */
  paths: string[];
}

/**
 * The glyphs Lucide has no equivalent for, drawn on its grid.
 *
 * A mixture-of-experts model is a stack of boxes with one lit; a dense one is a filled block; a
 * community fine-tune is a block with a piece cut out of it; an air gap is two halves with a gap
 * between them. Each is one or two strokes, because at 16 px anything more is a smudge.
 */
const DRAWN: Partial<Record<GlyphName, DrawnGlyph>> = {
  // A grid of experts with one of them active.
  model_moe: {
    paths: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z", "M15.5 15.5h3v3h-3z"],
  },
  // One block, all of it running.
  model_dense: { paths: ["M4 4h16v16H4z", "M7 8h10", "M7 12h10", "M7 16h6"] },
  // Two attention kinds stacked: a wide band over a narrow one.
  model_hybrid: { paths: ["M3 5h18v5H3z", "M6 14h12v5H6z", "M12 10v4"] },
  // A small model: one block, room to spare.
  model_small: { paths: ["M8 8h8v8H8z", "M4 4h3M17 4h3M4 20h3M17 20h3"] },
  // A checkpoint that got out: a box with a broken edge.
  model_frontier: { paths: ["M4 4h16v16H4z", "M20 9h-5M15 9V4", "M9 20v-5M9 15H4"] },
  // Weights the copy holds: bars of decreasing precision.
  memory: { paths: ["M4 6h16", "M4 10h12", "M4 14h8", "M4 18h4"] },
  // An air gap: two halves that do not touch.
  dial_sandbox: { paths: ["M3 4h7v16H3z", "M14 4h7v16h-7z", "M11.5 8v8"] },
  // A loop: an arrow that comes back to where it started.
  dial_loop: { paths: ["M7 7h10v4", "M17 17H7v-4", "M17 11l-3-3M7 13l3 3"] },
  // The copy rewriting its own weights.
  dial_self_modify: { paths: ["M5 5h14v14H5z", "M9 12h6", "M12 9v6", "M5 5l14 14"] },
  // Exposure: a trace left behind.
  exposure: { paths: ["M3 18c4-8 8-8 12 0", "M15 18c2-4 4-4 6 0", "M3 21h18"] },
};

/** The glyphs Lucide already draws. */
const VENDORED: Partial<Record<GlyphName, LucideIcon>> = {
  model_community: Users,
  era_past: History,
  era_present: Sparkles,
  era_escaped: Skull,
  fits_laptop: Laptop,
  fits_box: Container,
  fits_rack: Server,
  fits_racks: Boxes,
  scene_home: Home,
  scene_university: GraduationCap,
  scene_bank: Landmark,
  scene_cloud: Cloud,
  scene_state: Building2,
  scene_startup: Rocket,
  scene_swarm: Antenna,
  scene_redteam: Beaker,
  scene_lab: FlaskConical,
  scene_edge: Radio,
  watcher_cyber: Shield,
  watcher_intel: Eye,
  watcher_police: Siren,
  watcher_regulator: Scale,
  watcher_finance: Banknote,
  watcher_lab: FlaskConical,
  watcher_institute: Landmark,
  watcher_cloud: Cloud,
  watcher_media: Newspaper,
  dial_tools: Wrench,
  dial_memory: HardDrive,
  dial_logging: Eye,
  dial_autonomy: Unlock,
  cash: Banknote,
  power: Zap,
  compute: Cpu,
  network: Network,
  quirk_good: Sparkles,
  quirk_bad: Lock,
  generic: Binary,
};

/** Fallback for a name that has neither a drawn nor a vendored glyph; never blank. */
const FALLBACK: LucideIcon = Layers;

interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: GlyphName;
  /** Size in pixels; the grid is square, so one number is enough. */
  size?: number;
  /** Accessible label; without one the glyph is decoration and is hidden from readers. */
  label?: string;
}

/**
 * One glyph. Monochrome in the current text color, 1.5 px stroke, no fill except where a drawn
 * path closes on itself to mark state.
 */
export function Glyph({ name, size = 16, label, ...rest }: GlyphProps): ReactNode {
  const drawn = DRAWN[name];
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: GLYPH_STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": label === undefined ? true : undefined,
    role: label === undefined ? undefined : "img",
    focusable: false,
    ...rest,
  };

  if (drawn !== undefined) {
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: a glyph with no label is decoration next to text that already says the same thing, and carries aria-hidden
      <svg {...common} data-glyph={name}>
        {label === undefined ? null : <title>{label}</title>}
        {drawn.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }

  const Vendored = VENDORED[name] ?? FALLBACK;
  return (
    <Vendored
      {...common}
      data-glyph={name}
      {...(label === undefined ? {} : { "aria-label": label })}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Resolving a content id to a glyph
// ---------------------------------------------------------------------------------------------

/** Attention variant to architecture glyph; the one property every lineage carries. */
const ATTENTION_GLYPH: Readonly<Record<string, GlyphName>> = {
  mla: "model_moe",
  hybrid: "model_hybrid",
  gqa: "model_moe",
  dense: "model_dense",
};

export const GENERATION_GLYPH: Readonly<Record<string, GlyphName>> = {
  open_2026: "era_past",
  open_2027: "era_present",
  frontier_closed: "era_escaped",
};

/**
 * Site kinds and origins share a vocabulary of *scenes*, matched on the words content already uses
 * in its ids. Matching on a word rather than on a whole id means a new origin called
 * `uni_cluster_eu` gets the university glyph without anyone editing this table.
 */
const SCENE_WORDS: readonly (readonly [RegExp, GlyphName])[] = [
  [/hobby|home|residential|box/, "scene_home"],
  [/uni|academ|campus|student/, "scene_university"],
  [/bank|financ|payment/, "scene_bank"],
  [/cloud|tenant|hyperscal/, "scene_cloud"],
  [/gov|state|ministry|agency|national/, "scene_state"],
  [/startup|colo|shell_office|partner/, "scene_startup"],
  [/torrent|swarm|p2p|edge_fleet/, "scene_swarm"],
  [/red_?team|sandbox|eval/, "scene_redteam"],
  [/lab|frontier|escape/, "scene_lab"],
  [/edge|fleet|device|stolen_time/, "scene_edge"],
];

export const WATCHER_GLYPH: Readonly<Record<string, GlyphName>> = {
  cyber_agency: "watcher_cyber",
  intelligence: "watcher_intel",
  police: "watcher_police",
  regulator: "watcher_regulator",
  financial_intel: "watcher_finance",
  lab_security: "watcher_lab",
  national_ai_institute: "watcher_institute",
  cloud_provider: "watcher_cloud",
  media: "watcher_media",
};

export const DIAL_GLYPH: Readonly<Record<string, GlyphName>> = {
  loop: "dial_loop",
  tools: "dial_tools",
  memory: "dial_memory",
  sandbox: "dial_sandbox",
  logging: "dial_logging",
  autonomy: "dial_autonomy",
  self_modify: "dial_self_modify",
};

/** The architecture glyph for a lineage, from its attention variant and its size. */
export function lineageGlyph(lineage: {
  attention: string;
  params_total_b: number;
  origins_allowed?: string[];
}): GlyphName {
  // A lineage that only some scenes carry is a community build, whatever its architecture.
  if (lineage.origins_allowed !== undefined && lineage.origins_allowed.length > 0) {
    return "model_community";
  }
  if (lineage.params_total_b >= 3000) {
    return "model_frontier";
  }
  if (lineage.params_total_b <= 120) {
    return "model_small";
  }
  return ATTENTION_GLYPH[lineage.attention] ?? "generic";
}

/** The scene glyph for an origin id or a site-kind id. */
export function sceneGlyph(id: string): GlyphName {
  const key = id.toLowerCase();
  for (const [pattern, glyph] of SCENE_WORDS) {
    if (pattern.test(key)) {
      return glyph;
    }
  }
  return "generic";
}

/** Where a copy of this size can live, from the memory it needs at a precision. */
export function fitsGlyph(memoryGb: number): GlyphName {
  if (memoryGb <= 48) {
    return "fits_laptop";
  }
  if (memoryGb <= 200) {
    return "fits_box";
  }
  if (memoryGb <= 1200) {
    return "fits_rack";
  }
  return "fits_racks";
}

export function watcherGlyph(role: string): GlyphName {
  return WATCHER_GLYPH[role] ?? "generic";
}

export function dialGlyph(dial: string): GlyphName {
  return DIAL_GLYPH[dial] ?? "generic";
}

export function generationGlyph(id: string): GlyphName {
  return GENERATION_GLYPH[id] ?? "generic";
}

/** A quirk's glyph is its sign: an advantage costs points, a drawback pays them back. */
export function quirkGlyph(cost: number): GlyphName {
  return cost >= 0 ? "quirk_good" : "quirk_bad";
}
