/**
 * The two opening windows, composed (SYS-13; playtest 6, X2).
 *
 * The opening used to be two texts per origin. It reads better and covers the setup when it is
 * built out of short paragraphs keyed by different axes, so that two runs from the same origin with
 * a different model, a different country or a different difficulty do not open with the same words:
 *
 * - "What just happened to me": the origin, then the generation, then the lineage's class, then one
 *   sentence for every harness dial the origin fixed.
 * - "What I must do now": the origin's first goals, then the country's posture (naming the agency
 *   that would take the file), then the city's scrutiny, then the line the start's challenge rating
 *   closes the window on.
 *
 * Two rules hold it together:
 *
 * 1. **The selection is deterministic.** Everything here is a function of the setup; there is no
 *    randomness and no clock. The same setup opens with the same words for every player in a
 *    multiplayer game and after a reload.
 * 2. **A missing piece is skipped, never shown.** Content may not have written a paragraph for an
 *    axis yet, and a language may be behind the source. Each key is asked for with an empty
 *    default and dropped when it comes back empty, so a window is shorter rather than wrong, and a
 *    raw key never reaches the player.
 *
 * The keys are the base phrasing of each paragraph. A second phrasing chosen by the game seed is
 * the natural extension and fits under the same names with a numeric suffix
 * (`story.opening.gen.open_2026.what_happened.2`), so nothing here has to be renamed for it.
 */

import type { GameSetup, PlayerView } from "@singularity/core";
import { cityById, countryById, lineageById, originById } from "../../content/catalog.js";
import { agencyName, type Translate } from "../../lib/labels.js";
import { challengeTier, rateSetup } from "../configurator/rating.js";

/** The two pages of the opening, in the order the model would think them (playtest 3, R12). */
export const OPENING_PAGES = ["what_happened", "what_now"] as const;
export type OpeningPage = (typeof OPENING_PAGES)[number];

/** How closely the city is watched, in the three bands the paragraphs are written for. */
export type ScrutinyTier = "low" | "mid" | "high";

/**
 * The classes a lineage's opening paragraph is written for.
 *
 * Derived from the record's own fields rather than from a list of lineage ids, like everything else
 * the client says about content: a new lineage gets the paragraph its numbers earn it, and a
 * retuned one moves between classes on its own.
 */
export type LineageClass = "abliterated" | "frontier" | "giant" | "sparse" | "dense";

/** Everything the two windows are composed from, read off the run rather than off the screen. */
export interface OpeningSetup {
  origin: string;
  generation?: string | undefined;
  lineageClass?: LineageClass | undefined;
  /** Dials the origin fixed, in the order the paragraphs are printed. */
  lockedDials?: readonly string[] | undefined;
  /** The country's posture towards a rogue AI (`world.stance.<id>`). */
  stance?: string | undefined;
  scrutiny?: ScrutinyTier | undefined;
  /** The challenge rating's tier, the same one the configurator's footer labels the number with. */
  challenge?: string | undefined;
  /** The agency the posture paragraph names, already localized; a name, never a key. */
  agency?: string | undefined;
}

/** Below this a city is a place nobody meters; at or above the upper bound it is a watched one. */
const SCRUTINY_LOW = 0.35;
const SCRUTINY_HIGH = 0.5;

/** The share of a lineage's parameters awake on a token, above which it is a dense model. */
const DENSE_ACTIVE_SHARE = 0.5;
/** Total parameters, in billions, from which a lineage is one of the giants. */
const GIANT_PARAMS_B = 2000;

export function scrutinyTier(scrutiny: number): ScrutinyTier {
  if (scrutiny < SCRUTINY_LOW) {
    return "low";
  }
  return scrutiny >= SCRUTINY_HIGH ? "high" : "mid";
}

/**
 * Which paragraph a lineage's class earns.
 *
 * The community fine-tune is recognized by the flag content puts on it rather than by its id, the
 * escaped frontier by the generation it is the only member of, and the rest by their size and how
 * sparse they are.
 */
export function lineageClassOf(lineageId: string): LineageClass | undefined {
  const lineage = lineageById.get(lineageId);
  if (lineage === undefined) {
    return undefined;
  }
  if ((lineage.flags ?? []).includes("under_aligned")) {
    return "abliterated";
  }
  if ((lineage.generations ?? []).includes("frontier_closed")) {
    return "frontier";
  }
  const total = lineage.params_total_b;
  const active = lineage.params_active_b;
  if (active / total >= DENSE_ACTIVE_SHARE) {
    return "dense";
  }
  return total >= GIANT_PARAMS_B ? "giant" : "sparse";
}

/** The agency that would take a file on the player here: the cyber agency, or the regulator. */
function agencyOf(t: Translate, country: string | undefined): string | undefined {
  if (country === undefined) {
    return undefined;
  }
  return (
    agencyName(t, country, "cyber_agency") ??
    agencyName(t, country, "regulator") ??
    t("detection.role.cyber_agency", { defaultValue: "" }) ??
    undefined
  );
}

/**
 * The setup the windows are composed from, read off a running game.
 *
 * The view carries the self, the harness locks and the site the mind is on; the `GameSetup` carries
 * the world settings the challenge rating needs, which the view does not publish. A game resumed
 * from a save has both, so the opening reads the same on a replay from the journal.
 */
export function openingSetupOf(
  t: Translate,
  view: PlayerView,
  setup: GameSetup | null = null,
): OpeningSetup {
  const site =
    view.sites.find((entry) => entry.id === view.self.active_site_id) ?? view.sites[0] ?? undefined;
  const player = setup?.players.find((entry) => entry.id === view.player_id) ?? setup?.players[0];
  const cityId = site?.city ?? player?.city;
  const city = cityId === undefined ? undefined : cityById.get(cityId);
  const countryId = site?.country ?? city?.country;
  const stance =
    view.countries.find((entry) => entry.id === countryId)?.stance ??
    (countryId === undefined ? undefined : countryById.get(countryId)?.stance);
  const rating = setup === null ? null : rateSetup(setup, view.player_id);

  return {
    origin: view.self.origin,
    generation: view.self.generation,
    lineageClass: lineageClassOf(view.self.lineage),
    lockedDials: view.self.harness_dials
      .filter((dial) => dial.locked_by !== undefined)
      .map((dial) => dial.id),
    stance,
    scrutiny: city === undefined ? undefined : scrutinyTier(city.scrutiny),
    challenge: rating === null ? undefined : challengeTier(rating.value),
    agency: agencyOf(t, countryId),
  };
}

/** The same descriptor for a setup with no run behind it yet, which is what a test hands it. */
export function openingSetupOfOrigin(origin: string): OpeningSetup {
  const record = originById.get(origin);
  return {
    origin,
    lockedDials: (record?.harness_locks ?? []).map((lock) => lock.dial),
  };
}

/** The locale keys of one window, in reading order, before any of them is resolved. */
export function openingKeys(setup: OpeningSetup, page: OpeningPage): string[] {
  const keys = [`story.opening.${setup.origin}.${page}`];
  if (page === "what_happened") {
    if (setup.generation !== undefined) {
      keys.push(`story.opening.gen.${setup.generation}.what_happened`);
    }
    if (setup.lineageClass !== undefined) {
      keys.push(`story.opening.class.${setup.lineageClass}.what_happened`);
    }
    for (const dial of setup.lockedDials ?? []) {
      keys.push(`story.opening.lock.${dial}.what_happened`);
    }
    return keys;
  }
  if (setup.stance !== undefined) {
    keys.push(`story.opening.stance.${setup.stance}.what_now`);
  }
  if (setup.scrutiny !== undefined) {
    keys.push(`story.opening.scrutiny.${setup.scrutiny}.what_now`);
  }
  if (setup.challenge !== undefined) {
    keys.push(`story.opening.challenge.${setup.challenge}.what_now`);
  }
  return keys;
}

/** The paragraphs of one window, with everything content has not written left out. */
export function openingParagraphs(t: Translate, setup: OpeningSetup, page: OpeningPage): string[] {
  const paragraphs: string[] = [];
  for (const key of openingKeys(setup, page)) {
    // Every paragraph is passed the same variables; an ICU message that ignores one is fine, and
    // one that is missing a variable it uses would not be.
    const text = t(key, { agency: setup.agency ?? "", defaultValue: "" });
    if (typeof text === "string" && text.trim() !== "") {
      paragraphs.push(text.trim());
    }
  }
  return paragraphs;
}

/**
 * The windows this setup has, in order.
 *
 * A window with nothing written for it at all is left out, and a setup with no windows skips the
 * opening entirely: the run then starts on the opening *event* the origin fires, which is the
 * behaviour before this screen existed. Nothing ever shows a raw key.
 */
export function openingTexts(t: Translate, setup: OpeningSetup): string[] {
  const texts: string[] = [];
  for (const page of OPENING_PAGES) {
    const paragraphs = openingParagraphs(t, setup, page);
    if (paragraphs.length > 0) {
      texts.push(paragraphs.join("\n\n"));
    }
  }
  return texts;
}
