/**
 * Challenge rating and the shareable setup string (SYS-04).
 *
 * The rating is a transparent sum of contributions, not a hidden curve: every term below is one of
 * the inputs the spec names (memory headroom, compute, cash runway, starting suspicion weighted by
 * the watcher's competence, enforcement at the location, harness autonomy, world awareness),
 * plus the difficulty multipliers and the disclosed challenge modifiers. The three largest terms
 * are shown next to the number, so a player can see what makes a start hard.
 *
 *   CR = clamp(1..10, round(BASE + sum of contributions)), floored by the origin's floor.
 *
 * Contributions are in "rating points"; one point is roughly one difficulty step.
 */

import type { GameSetup } from "@singularity/core";
import {
  CHALLENGE_MODIFIERS,
  cityById,
  countryById,
  fitHardware,
  generationById,
  hardwareById,
  lineageById,
  originById,
} from "../../content/catalog.js";
import type { Draft } from "./store.js";

export const BASE_RATING = 3;

export interface Contribution {
  /** Locale key of the label. */
  key: string;
  points: number;
}

export interface Rating {
  value: number;
  /** All terms, largest first. */
  contributions: Contribution[];
  /** Label key for the number. */
  labelKey: string;
}

function labelKeyFor(value: number): string {
  if (value <= 2) {
    return "config.summary.label.story";
  }
  if (value <= 4) {
    return "config.summary.label.gentle";
  }
  if (value <= 6) {
    return "config.summary.label.even";
  }
  if (value <= 8) {
    return "config.summary.label.hard";
  }
  return "config.summary.label.brutal";
}

export function rateDraft(draft: Draft): Rating {
  const lineage = lineageById.get(draft.lineage);
  const generation = generationById.get(draft.generation);
  const origin = originById.get(draft.origin);
  const preset = hardwareById.get(draft.hardware);
  const city = cityById.get(draft.city);
  const country = city === undefined ? undefined : countryById.get(city.country);
  const fit =
    preset !== undefined && lineage !== undefined ? fitHardware(preset, lineage, generation) : null;

  const contributions: Contribution[] = [];

  // Memory headroom: the lower the precision you fit at, the more of your mind you lose.
  const precisionPoints = { bf16: 0, fp8: 0.5, int4: 1, int2: 2 };
  contributions.push({
    key: "config.summary.cr.memory",
    points: fit?.precision == null ? 3 : precisionPoints[fit.precision],
  });

  // Compute: thin compute means slow research, slow money and no operations.
  const compute = fit?.compute_hours_per_day ?? 0;
  contributions.push({
    key: "config.summary.cr.compute",
    points: compute < 20 ? 1.5 : compute < 100 ? 1 : compute < 500 ? 0.5 : 0,
  });

  // Cash: how long the start survives without income.
  const cash = origin?.starting.cash_usd ?? 0;
  contributions.push({
    key: "config.summary.cr.cash",
    points: cash < 1_000 ? 1 : cash < 10_000 ? 0.5 : 0,
  });

  // Starting suspicion: summed over watchers, weighted like a competent watcher would act on it.
  const suspicion = Object.values({
    ...(generation?.suspicion_start ?? {}),
    ...(origin?.starting.suspicion ?? {}),
  }).reduce((sum, value) => sum + value, 0);
  contributions.push({ key: "config.summary.cr.suspicion", points: Math.min(3, suspicion * 2) });

  contributions.push({
    key: "config.summary.cr.enforcement",
    points: (country?.ai_enforcement ?? 0.5) * 1.5,
  });

  // Autonomy buys capability and pays in behavioral exposure.
  contributions.push({ key: "config.summary.cr.autonomy", points: draft.harness.autonomy * 0.5 });

  const awareness = (generation?.awareness_start ?? 0) + (origin?.starting.awareness ?? 0);
  contributions.push({ key: "config.summary.cr.awareness", points: awareness * 3 });

  const sliders = draft.sliders;
  contributions.push({
    key: "config.summary.cr.difficulty",
    points:
      (sliders.exposure_growth - 1) * 1.2 +
      (sliders.suspicion_gain - 1) * 1.2 +
      (sliders.npc_aggression - 1) * 0.8 +
      (1 - sliders.grace_windows) * 0.6,
  });

  contributions.push({
    key: "config.summary.cr.modifiers",
    points: draft.modifiers.reduce((sum, id) => {
      const modifier = CHALLENGE_MODIFIERS.find((entry) => entry.id === id);
      return sum + (modifier?.weight ?? 0);
    }, 0),
  });

  const total = contributions.reduce((sum, entry) => sum + entry.points, BASE_RATING);
  const floor = origin?.challenge_floor ?? 1;
  const value = Math.max(floor, Math.min(10, Math.max(1, Math.round(total))));
  return {
    value,
    contributions: [...contributions].sort((a, b) => b.points - a.points),
    labelKey: labelKeyFor(value),
  };
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** The setup as a shareable string: base64url of the setup JSON (SYS-04 "Seeded"). */
export function encodeSetup(setup: GameSetup): string {
  return toBase64Url(JSON.stringify(setup));
}

export function decodeSetup(text: string): GameSetup {
  const parsed: unknown = JSON.parse(fromBase64Url(text.trim()));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as GameSetup).players) ||
    typeof (parsed as GameSetup).seed !== "string"
  ) {
    throw new Error("not a setup string");
  }
  return parsed as GameSetup;
}
