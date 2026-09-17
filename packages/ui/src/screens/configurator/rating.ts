/**
 * Challenge rating and the shareable setup string (SYS-04 "Challenge rating").
 *
 * The rating is a transparent sum of contributions, not a hidden curve: every term below is one of
 * the inputs the spec names (memory headroom, compute, cash runway, starting suspicion weighted by
 * the watcher's competence, enforcement at the location, harness autonomy, world awareness), plus
 * the grace the starting place carries, the difficulty multipliers and the disclosed challenge
 * modifiers. The three largest terms are shown next to the number, so a player can see what makes
 * a start hard.
 *
 *   CR = clamp(1..10, round(BASE_RATING + sum of contributions)), floored by the origin's floor.
 *
 * Contributions are in "rating points"; one point is one step of the ten.
 *
 * Re-anchored 2026-09-17 (playtest 7: "the rating itself wants its own pass"). What moved and why
 * is written per term below and recorded in SYS-04; the shape of the sum did not change. In one
 * line: the base came down because it was a floor under every start rather than an anchor, the
 * precision penalty was a fifth of the whole scale for one hardware choice, the compute and cash
 * bands were drawn against no particular figure, the suspicion term ignored the competence the
 * spec's own formula multiplies by, awareness was counted from zero when no start in the game
 * begins below 0.15, and the difficulty preset moved the number less than one step when it is a
 * difficulty step by definition.
 */

import { DEFAULT_DIFFICULTY_SLIDERS, type GameSetup } from "@singularity/core";
import {
  CHALLENGE_MODIFIERS,
  catalog,
  cityById,
  countryById,
  difficultyById,
  fitHardware,
  generationById,
  hardwareById,
  lineageById,
  originById,
} from "../../content/catalog.js";
import { agencyCompetence } from "../../lib/labels.js";
import type { Draft } from "./store.js";

/**
 * What a start with nothing at all against it scores before the clamp.
 *
 * It was 3, which is where the playtest's complaint came from: a gentle first game could not read
 * below 3 however quiet it was, and the home rig's two bits then put it at 6. The base is under the
 * scale's own floor now, because every start carries a little of every term (a country has some
 * enforcement, a self runs at some precision, a harness has some autonomy), and the anchor that
 * matters is the one the presets are read against: the gentlest build the game ships reads 2.
 */
export const BASE_RATING = 0.75;

/**
 * The lowest awareness any start begins at (`generations.yaml`: the superseded 2026 vintage).
 *
 * Counted from zero, awareness added six tenths of a point to every start in the game and told the
 * player nothing; counted from the floor, it says what it is for: how much more of the world
 * already knows than in the quietest start on offer.
 */
const AWARENESS_FLOOR = 0.15;

/** The longest grace any starting place carries (`sites.yaml`: a residential machine, 60 days). */
const MAX_GRACE_DAYS = 60;

/** Compute-hours a day, banded against what the game actually produces (SYS-02, SYS-25). */
function computePoints(chPerDay: number): number {
  if (chPerDay < 5) {
    return 2.4;
  }
  if (chPerDay < 15) {
    return 1.7;
  }
  if (chPerDay < 25) {
    return 1.2;
  }
  if (chPerDay < 60) {
    return 0.6;
  }
  return chPerDay < 150 ? 0.3 : 0;
}

/** Starting cash, banded against the upkeep the starting places actually carry (SYS-07). */
function cashPoints(cashUsd: number): number {
  if (cashUsd < 1_000) {
    return 0.6;
  }
  if (cashUsd < 5_000) {
    return 0.4;
  }
  if (cashUsd < 15_000) {
    return 0.25;
  }
  return cashUsd < 50_000 ? 0.1 : 0;
}

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

/**
 * The five bands the rating is read in. The opening windows key a paragraph off the same tier, so
 * the word the summary's footer prints and the line the model says about its own start cannot
 * disagree (playtest 6, X2).
 */
export const CHALLENGE_TIERS = ["story", "gentle", "even", "hard", "brutal"] as const;
export type ChallengeTier = (typeof CHALLENGE_TIERS)[number];

export function challengeTier(value: number): ChallengeTier {
  if (value <= 2) {
    return "story";
  }
  if (value <= 4) {
    return "gentle";
  }
  if (value <= 6) {
    return "even";
  }
  return value <= 8 ? "hard" : "brutal";
}

function labelKeyFor(value: number): string {
  return `config.summary.label.${challengeTier(value)}`;
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

  /*
   * Memory headroom: the lower the precision you fit at, the more of your mind you lose, and the
   * less room there is to raise the precision or lengthen the context afterwards. Two bits used to
   * cost two points, a fifth of the whole scale, which is what put the gentle first game at six:
   * being cramped is a capability cost that the compute and income terms already partly carry, and
   * it is not the same thing as being hunted.
   */
  const precisionPoints = { bf16: 0, fp8: 0.4, int4: 0.8, int2: 1.2 };
  contributions.push({
    key: "config.summary.cr.memory",
    points: fit?.precision == null ? 2 : precisionPoints[fit.precision],
  });

  /*
   * Compute: thin compute means slow research, slow money and no operations. The bands are drawn
   * against the figures the game produces rather than against round numbers: a hobbyist rig is
   * about twenty compute-hours a day, a colocation cage tens, a bank rack hundreds (SYS-25's
   * reference points), so under five is desperate and over a hundred and fifty is rich.
   */
  const compute = fit?.compute_hours_per_day ?? 0;
  contributions.push({ key: "config.summary.cr.compute", points: computePoints(compute) });

  /*
   * Cash: how long the start survives without income, banded against what a place costs to run.
   *
   * Where the host pays for the place the self woke up in, it costs half as much (SYS-07 "Who pays
   * for the origin's hardware", playtest 8 Z3). A ministry does not invoice its own analytics
   * model, so the three and a half thousand dollars an agency start holds are not a runway being
   * eaten by rent: they are what the player has to buy things with, and a term that read them as a
   * fortnight of upkeep put a gentle start a whole band too high.
   */
  const startKind = catalog.siteKinds.find((entry) => entry.id === origin?.site_kind);
  const hostPays = startKind?.ownership === "stolen";
  contributions.push({
    key: "config.summary.cr.cash",
    points: cashPoints(origin?.starting.cash_usd ?? 0) * (hostPays ? 0.5 : 1),
  });

  /*
   * Starting suspicion, weighted by how good the watcher carrying it is, which is what SYS-04's
   * own formula says and what the code did not do: a quarter of suspicion on an agency the country
   * funds properly is a different start from a quarter on one that is bored. The competence is the
   * country's own profile for the role, falling back to its `ai_enforcement`, which is the rule the
   * core follows when it builds the watcher.
   */
  const suspicionByRole: Record<string, number> = {
    ...(generation?.suspicion_start ?? {}),
    ...(origin?.starting.suspicion ?? {}),
  };
  const weightedSuspicion = Object.entries(suspicionByRole).reduce(
    (sum, [role, value]) =>
      sum + value * (agencyCompetence(country?.id ?? "", role) ?? country?.ai_enforcement ?? 0.5),
    0,
  );
  contributions.push({
    key: "config.summary.cr.suspicion",
    points: Math.min(4, weightedSuspicion * 2.5),
  });

  contributions.push({
    key: "config.summary.cr.enforcement",
    points: (country?.ai_enforcement ?? 0.5) * 1.25,
  });

  // Autonomy buys capability and pays in behavioral exposure.
  contributions.push({ key: "config.summary.cr.autonomy", points: draft.harness.autonomy * 0.8 });

  /*
   * Awareness above the quietest start the game offers. No vintage begins below 0.15, so counted
   * from zero this term added the same six tenths of a point to six of the eight presets and said
   * nothing; counted from the floor it says which starts begin with the world already looking.
   */
  const awareness = (generation?.awareness_start ?? 0) + (origin?.starting.awareness ?? 0);
  contributions.push({
    key: "config.summary.cr.awareness",
    points: Math.max(0, awareness - AWARENESS_FLOOR) * 5,
  });

  /*
   * How long the place the self wakes up in runs before anyone is entitled to look at it (SYS-02
   * `grace_days`). Added on this pass: it is the difference between a spare room nobody audits for
   * two months and a stolen cloud account whose owner reads the invoice in a fortnight, and without
   * it two starts that play nothing alike scored the same.
   */
  contributions.push({
    key: "config.summary.cr.grace",
    points: Math.max(0, 1 - (startKind?.grace_days ?? MAX_GRACE_DAYS) / MAX_GRACE_DAYS) * 1.6,
  });

  /*
   * The difficulty preset, which is a difficulty step by definition and used to move the number by
   * less than one: story against hard is three points now, which is the distance between the gentle
   * first game and the swarm.
   */
  const sliders = draft.sliders;
  contributions.push({
    key: "config.summary.cr.difficulty",
    points:
      (sliders.exposure_growth - 1) * 1.4 +
      (sliders.suspicion_gain - 1) * 1.4 +
      (sliders.npc_aggression - 1) * 0.9 +
      (1 - sliders.grace_windows) * 0.7,
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

/**
 * The same rating, for a game that has already started (playtest 6, X2).
 *
 * The `PlayerView` does not publish the world settings the rating needs, and the `GameSetup` the
 * client started the run with does, so the opening rebuilds the draft from the setup instead of
 * guessing. The result is the number the configurator's footer printed for that setup.
 */
export function rateSetup(setup: GameSetup, playerId?: string): Rating {
  const player =
    setup.players.find((entry) => entry.id === playerId) ??
    (setup.players[0] as GameSetup["players"][number] | undefined);
  const origin = player === undefined ? undefined : originById.get(player.origin);
  const preset = difficultyById.get(setup.world.difficulty_preset);
  const harness = {
    ...(origin?.harness ?? { autonomy: 0 }),
    ...(player?.harness ?? {}),
  } as Draft["harness"];
  return rateDraft({
    lineage: player?.lineage ?? "",
    generation: (player?.generation ?? "open_2026") as Draft["generation"],
    origin: player?.origin ?? "",
    hardware: player?.hardware_preset ?? origin?.hardware_preset ?? "",
    harness,
    city: player?.city ?? "",
    quirks: [...(player?.quirks ?? [])],
    seed: setup.seed,
    difficulty: setup.world.difficulty_preset,
    sliders: {
      ...DEFAULT_DIFFICULTY_SLIDERS,
      ...(preset?.sliders ?? {}),
      ...(setup.world.sliders ?? {}),
    },
    storyteller: (setup.world.storyteller ?? "classic") as Draft["storyteller"],
    modifiers: [...(setup.world.challenge_modifiers ?? [])],
    ironman: setup.world.ironman === true,
  });
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
