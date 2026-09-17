/**
 * Day zero: what the setup is actually worth, computed by the engine (playtest 7, Y7).
 *
 * The maintainer's addendum: "can the configurator also compute, from the combination of
 * everything, not only the money the player starts with but the level of CH? It is one of the main
 * figures, and everything should be recomputed into it already in the configurator."
 *
 * So nothing here estimates anything. The setup the Start button would hand the host is handed to
 * `createGame` instead, with no tick, and the first `PlayerView` is read: the compute-hours a day
 * the self produces on that rig at the precision the engine picks, the cash after the country
 * factor, the day's bills and the runway they imply, the watchers the origin brings with their
 * suspicion, and the awareness the world starts at. It is the same code path the game runs, so the
 * figure on the Summary step and the figure on the first day of the run cannot disagree.
 *
 * The verdict on top of it is three classifications, each against the tertiles of the catalog
 * itself: every origin with every rig it allows is measured once, the boundaries come from that
 * sample, and there is no threshold written down in this file. A build in the bottom third of the
 * compute the game can start with is "low" because two thirds of the starts have more, not because
 * somebody chose a number of compute-hours.
 *
 * Both are cached: a setup is measured once (six milliseconds of engine), the catalog scan once.
 */

import type { GameSetup, PlayerView } from "@singularity/core";
import { createGame } from "@singularity/core";
import { contentBundle } from "../../content/bundle.js";
import { catalog, fitHardware, generationById, presetsOfOrigin } from "../../content/catalog.js";

export interface DayZero {
  /** Compute-hours a day, the headline figure (SYS-02 units). */
  computeHoursPerDay: number;
  /** Cash at the start, after the country factor the origin may or may not be scaled by. */
  cashUsd: number;
  /** What the first day costs, as a positive number. */
  billsUsdPerDay: number;
  /** Income minus costs; negative on nearly every start. */
  netUsdPerDay: number;
  /** Days until the cash is gone at that rate, or null when nothing is draining. */
  runwayDays: number | null;
  /** Watchers that already carry suspicion. */
  watchers: number;
  /** Their suspicion added up, and the same weighted by how good each one is. */
  suspicion: number;
  weightedSuspicion: number;
  /** How hard the world is looking, as the engine computes it in [0, 1]. */
  huntPressure: number;
  /** Public awareness that a rogue model exists, at the start. */
  awareness: number;
  /** Operations the self can hold at once on day one. */
  attention: number;
}

const measured = new Map<string, DayZero | null>();

/** The figures for a setup, from the engine; null when the engine refuses the setup. */
export function dayZeroOf(setup: GameSetup): DayZero | null {
  const key = JSON.stringify(setup);
  const cached = measured.get(key);
  if (cached !== undefined) {
    return cached;
  }
  let figures: DayZero | null = null;
  try {
    figures = readView(createGame({ setup, content: contentBundle }).snapshot());
  } catch {
    // A setup the engine will not take is not a day zero; the caller shows nothing rather than a
    // number it made up. `validateSetup` is what tells the player why, on the step that decided it.
    figures = null;
  }
  measured.set(key, figures);
  return figures;
}

function readView(view: PlayerView): DayZero {
  const watchers = view.detection.watchers.filter((watcher) => watcher.suspicion > 0);
  const costs = view.finances.costs.reduce((sum, line) => sum + Math.abs(line.usd_per_day), 0);
  return {
    computeHoursPerDay: view.resources.compute_hours_per_day,
    cashUsd: view.resources.cash_usd,
    billsUsdPerDay: costs,
    netUsdPerDay: view.resources.cash_delta_usd_per_day,
    runwayDays: view.resources.runway_days,
    watchers: watchers.length,
    suspicion: watchers.reduce((sum, watcher) => sum + watcher.suspicion, 0),
    weightedSuspicion: watchers.reduce(
      (sum, watcher) => sum + watcher.suspicion * watcher.competence,
      0,
    ),
    huntPressure: view.detection.hunt_pressure,
    awareness: view.detection.awareness_global,
    attention: view.resources.attention_total,
  };
}

// ---------------------------------------------------------------------------------------------
// The three axes, and the catalog's own tertiles
// ---------------------------------------------------------------------------------------------

export const COMPUTE_LEVELS = ["low", "middling", "high"] as const;
export const DANGER_LEVELS = ["calm", "watched", "hunted"] as const;
export const MONEY_LEVELS = ["short", "steady", "long"] as const;

export type ComputeLevel = (typeof COMPUTE_LEVELS)[number];
export type DangerLevel = (typeof DANGER_LEVELS)[number];
export type MoneyLevel = (typeof MONEY_LEVELS)[number];

export interface Verdict {
  compute: ComputeLevel;
  danger: DangerLevel;
  money: MoneyLevel;
}

/** Two boundaries per axis: the third and the two-thirds point of the catalog's own range. */
export interface DayZeroScale {
  compute: [number, number];
  danger: [number, number];
  runway: [number, number];
  /** The lowest and highest the catalog reaches on each axis, for the bars beside the figures. */
  range: {
    compute: [number, number];
    danger: [number, number];
    runway: [number, number];
  };
}

/**
 * How dangerous a start is, in one number.
 *
 * Three terms the addendum names, all of them read off the first view: how sure the watchers
 * already are, weighted by how good each one is at acting on it; how many of them there are at all;
 * and how hard the world is looking, which is the engine's own summary of the exposure the origin
 * brings with it. Day-zero *exposure* itself is zero by construction, because nothing has run yet.
 */
export function dangerScore(day: DayZero): number {
  return day.weightedSuspicion + WATCHER_WEIGHT * day.watchers + day.huntPressure;
}

/**
 * What one more watcher is worth next to the suspicion they already carry.
 *
 * A twentieth: five watchers who have noticed nothing are a quarter of a point, which is less than
 * one watcher who is a quarter sure. It was a tenth for one pass and it put the ministry, the
 * safest origin in the balance table, in the top third of danger on the strength of having five
 * bored auditors.
 */
const WATCHER_WEIGHT = 0.05;

/** A runway of `null` is not a long runway by luck: nothing is draining, so it is the top band. */
export function runwayScore(day: DayZero): number {
  return day.runwayDays ?? Number.POSITIVE_INFINITY;
}

/** The lowest and highest finite value of a sample; an empty one spans nothing. */
function spanOf(values: readonly number[]): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length === 0 ? [0, 1] : [Math.min(...finite), Math.max(...finite)];
}

function tertiles(values: readonly number[]): [number, number] {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return [0, 0];
  }
  const low = sorted[Math.floor(sorted.length / 3)] ?? sorted[0] ?? 0;
  const high = sorted[Math.floor((sorted.length * 2) / 3)] ?? sorted[sorted.length - 1] ?? 0;
  return [low, high];
}

/** The seed the catalog scan runs on; it decides nothing but keeps the scan reproducible. */
const SCALE_SEED = "day-zero-scale";

/**
 * Every start the game can be begun from: each origin, each rig it allows, and the largest self
 * that rig can actually hold, which is what the configurator's own repair would leave the player
 * on. A combination whose weights fit nowhere is not a start and is left out of the sample.
 */
function sampleSetups(): GameSetup[] {
  const setups: GameSetup[] = [];
  for (const origin of catalog.origins) {
    const generation = origin.generations_allowed[0];
    if (generation === undefined) {
      continue;
    }
    const generationDef = generationById.get(generation);
    for (const rig of presetsOfOrigin(origin)) {
      const lineage = catalog.lineages.find((entry) => {
        if (!entry.generations.includes(generation)) {
          return false;
        }
        if (entry.origins_allowed !== undefined && !entry.origins_allowed.includes(origin.id)) {
          return false;
        }
        if (origin.lineages_allowed !== undefined && !origin.lineages_allowed.includes(entry.id)) {
          return false;
        }
        return fitHardware(rig, entry, generationDef).precision !== null;
      });
      const city = origin.locations[0];
      if (lineage === undefined || city === undefined) {
        continue;
      }
      setups.push({
        seed: SCALE_SEED,
        players: [
          {
            id: "p1",
            name: "p1",
            lineage: lineage.id,
            generation,
            origin: origin.id,
            hardware_preset: rig.id,
            city,
          },
        ],
        host_player_id: "p1",
        world: { difficulty_preset: "normal" },
      });
    }
  }
  return setups;
}

let scale: DayZeroScale | null = null;

/** The boundaries, measured once from the bundle. Never constants: content moves them. */
export function dayZeroScale(): DayZeroScale {
  if (scale !== null) {
    return scale;
  }
  const sample = sampleSetups()
    .map((setup) => dayZeroOf(setup))
    .filter((day): day is DayZero => day !== null);
  const compute = sample.map((day) => day.computeHoursPerDay);
  const danger = sample.map((day) => dangerScore(day));
  const runway = sample.map((day) => runwayScore(day));
  scale = {
    compute: tertiles(compute),
    danger: tertiles(danger),
    runway: tertiles(runway),
    range: { compute: spanOf(compute), danger: spanOf(danger), runway: spanOf(runway) },
  };
  return scale;
}

/** How many starts the tertiles were taken from; a test asserts the sample is not a handful. */
export function dayZeroSampleSize(): number {
  return sampleSetups().length;
}

function band<T>(value: number, [low, high]: [number, number], levels: readonly T[]): T {
  const index = value < low ? 0 : value < high ? 1 : 2;
  return levels[index] as T;
}

export function verdictOf(day: DayZero, boundaries: DayZeroScale = dayZeroScale()): Verdict {
  return {
    compute: band(day.computeHoursPerDay, boundaries.compute, COMPUTE_LEVELS),
    danger: band(dangerScore(day), boundaries.danger, DANGER_LEVELS),
    money: band(runwayScore(day), boundaries.runway, MONEY_LEVELS),
  };
}

/** The locale keys the verdict is composed of: one sentence per pair, one clause per runway. */
export function verdictKeys(verdict: Verdict): { sentence: string; money: string } {
  return {
    sentence: `guidance.verdict.${verdict.compute}_${verdict.danger}`,
    money: `guidance.verdict.money.${verdict.money}`,
  };
}
