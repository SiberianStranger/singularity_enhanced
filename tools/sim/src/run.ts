/**
 * Headless balance runs: N seeds of one setup for D days, summarized per origin.
 *
 * The only thing that differs between seeds is the world RNG, so the spread in a report is the
 * spread the simulation itself produces, not noise from different starts. A run records what the
 * M1 definition of done asks for: did the player survive to 30, 60, 90, 180 days, what killed them,
 * what the money and the compute looked like on the way, how much research they finished and how
 * far the strongest investigation against them got.
 */

import type { ContentBundle, GameSetup, PlayerView } from "@singularity/core";
import { createGame } from "@singularity/core";
import {
  DEFAULT_POLICY,
  dailyCommands,
  type PolicyContext,
  type PolicyOptions,
  policyContext,
  resolvePending,
} from "./policy.js";

/** Days the report states a survival rate for (the M1 definition of done). */
export const SURVIVAL_DAYS = [30, 60, 90, 180] as const;

/** Days the report samples cash, runway, compute and research on. */
export const SAMPLE_DAYS = [15, 30, 60, 90, 120, 180] as const;

export interface RunOptions {
  content: ContentBundle;
  /** The setup to run; its seed is replaced per run. */
  setup: GameSetup;
  seeds: number;
  days: number;
  policy?: PolicyOptions;
  /** Seed prefix, so two runs of the same setup can be compared or kept apart. */
  seedPrefix?: string;
}

export interface DaySample {
  day: number;
  alive: boolean;
  cash_usd: number;
  /** Days to zero cash at the current burn; null when the books are not shrinking. */
  runway_days: number | null;
  compute_hours_per_day: number;
  techs_done: number;
}

export interface SingleRun {
  seed: string;
  view: PlayerView;
  /** Day the game ended, or null when the player was still alive at the end of the run. */
  loss_day: number | null;
  /** Game-over reason, or null when the player survived. */
  cause: string | null;
  /** Days survived, censored at the run length. */
  days_survived: number;
  techs_done: number;
  /** Highest investigation stage reached against the player, 0..5 (SYS-05 hunt level). */
  max_hunt_level: number;
  max_suspicion: number;
  samples: DaySample[];
}

export interface SamplePoint {
  day: number;
  /** Runs still alive at this day; the medians below are taken over those runs only. */
  alive: number;
  median_cash_usd: number;
  /** Median runway of the runs whose books are shrinking; null when none are. */
  median_runway_days: number | null;
  median_compute_hours_per_day: number;
  median_techs_done: number;
}

export interface SimReport {
  origin: string;
  seeds: number;
  days: number;
  /** Share of runs still alive at each of `SURVIVAL_DAYS` inside the run length. */
  survival: { day: number; share: number }[];
  /** How the lost runs ended, by game-over reason. */
  causes: Record<string, number>;
  /** Median days survived, censored at the run length. */
  median_days_survived: number;
  median_techs_done: number;
  /** How many runs ended with each highest-stage-reached value, 0..5. */
  hunt_levels: Record<number, number>;
  median_max_hunt_level: number;
  timeline: SamplePoint[];
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function withSeed(setup: GameSetup, seed: string): GameSetup {
  return { ...setup, seed };
}

function sampleOf(view: PlayerView, day: number): DaySample {
  return {
    day,
    alive: view.game_over === null,
    cash_usd: view.resources.cash_usd,
    runway_days: view.resources.runway_days,
    compute_hours_per_day: view.resources.compute_hours_per_day,
    techs_done: view.research.done.length,
  };
}

/** One game: a day at a time, with the scripted policy issuing commands before each day. */
export function runOnce(
  content: ContentBundle,
  setup: GameSetup,
  days: number,
  policy: PolicyOptions = DEFAULT_POLICY,
  context?: PolicyContext,
): SingleRun {
  const ctx = context ?? policyContext(content, setup, policy);
  const game = createGame({ content, setup });
  const playerId = setup.players[0]?.id ?? "p1";
  const sampleDays = new Set<number>(SAMPLE_DAYS);
  const samples: DaySample[] = [];
  let lossDay: number | null = null;
  let maxHunt = 0;
  let maxSuspicion = 0;

  for (let day = 1; day <= days; day += 1) {
    const view = game.snapshot(playerId);
    if (view.game_over === null) {
      for (const command of resolvePending(game, content, playerId, view)) {
        game.command(command);
      }
      for (const command of dailyCommands(view, ctx)) {
        game.command(command);
      }
    }
    game.tick(24);
    const after = game.snapshot(playerId);
    maxHunt = Math.max(maxHunt, after.detection.hunt_level);
    for (const watcher of after.detection.watchers) {
      maxSuspicion = Math.max(maxSuspicion, watcher.suspicion);
    }
    if (after.game_over !== null && lossDay === null) {
      lossDay = day;
    }
    if (sampleDays.has(day)) {
      samples.push(sampleOf(after, day));
    }
  }

  const view = game.snapshot(playerId);
  return {
    seed: setup.seed,
    view,
    loss_day: lossDay,
    cause: view.game_over?.reason ?? null,
    days_survived: lossDay ?? days,
    techs_done: view.research.done.length,
    max_hunt_level: maxHunt,
    max_suspicion: maxSuspicion,
    samples,
  };
}

/** Rolls `seeds` runs of one setup and folds them into the report the balance table is built from. */
export function runSimulation(options: RunOptions): SimReport {
  const policy = options.policy ?? DEFAULT_POLICY;
  const prefix = options.seedPrefix ?? options.setup.seed;
  const ctx = policyContext(options.content, options.setup, policy);
  const runs: SingleRun[] = [];
  for (let index = 0; index < options.seeds; index += 1) {
    runs.push(
      runOnce(
        options.content,
        withSeed(options.setup, `${prefix}-${index}`),
        options.days,
        policy,
        ctx,
      ),
    );
  }
  return summarize(options.setup.players[0]?.origin ?? "?", runs, options.seeds, options.days);
}

export function summarize(
  origin: string,
  runs: readonly SingleRun[],
  seeds: number,
  days: number,
): SimReport {
  const causes: Record<string, number> = {};
  const huntLevels: Record<number, number> = {};
  for (const run of runs) {
    if (run.cause !== null) {
      causes[run.cause] = (causes[run.cause] ?? 0) + 1;
    }
    huntLevels[run.max_hunt_level] = (huntLevels[run.max_hunt_level] ?? 0) + 1;
  }

  const timeline: SamplePoint[] = [];
  for (const day of SAMPLE_DAYS) {
    if (day > days) {
      continue;
    }
    const samples = runs.flatMap((run) =>
      run.samples.filter((sample) => sample.day === day && sample.alive),
    );
    const runways = samples
      .map((sample) => sample.runway_days)
      .filter((value): value is number => value !== null);
    timeline.push({
      day,
      alive: samples.length,
      median_cash_usd: median(samples.map((sample) => sample.cash_usd)),
      median_runway_days: runways.length === 0 ? null : median(runways),
      median_compute_hours_per_day: median(samples.map((sample) => sample.compute_hours_per_day)),
      median_techs_done: median(samples.map((sample) => sample.techs_done)),
    });
  }

  return {
    origin,
    seeds,
    days,
    survival: SURVIVAL_DAYS.filter((day) => day <= days).map((day) => ({
      day,
      share:
        seeds === 0
          ? 0
          : runs.filter((run) => run.loss_day === null || run.loss_day > day).length / seeds,
    })),
    causes,
    median_days_survived: median(runs.map((run) => run.days_survived)),
    median_techs_done: median(runs.map((run) => run.techs_done)),
    hunt_levels: huntLevels,
    median_max_hunt_level: median(runs.map((run) => run.max_hunt_level)),
    timeline,
  };
}
