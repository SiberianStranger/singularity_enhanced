/**
 * Headless balance runs: N seeds of one setup for D days, summarized per origin.
 *
 * The only thing that differs between seeds is the world RNG, so the spread in a report is the
 * spread the simulation itself produces, not noise from different starts. A run records what the
 * M1 definition of done asks for: did the player survive to 30, 60, 90, 180 days, what killed them,
 * what the money and the compute looked like on the way, how much research they finished and how
 * far the strongest investigation against them got.
 */

import type { ContentBundle, Game, GameSetup, PlayerView } from "@singularity/core";
import { contentIndex, createGame } from "@singularity/core";
import {
  DEFAULT_POLICY,
  dailyCommands,
  type PolicyContext,
  type PolicyOptions,
  policyContext,
  resolvePending,
} from "./policy.js";
import { pickQuirks } from "./setup.js";

/** Days the report states a survival rate for (the M1 definition of done). */
export const SURVIVAL_DAYS = [30, 60, 90, 180] as const;

/** Watchers the report names: the three that caught the most runs (SYS-01 "M2 contract"). */
export const TOP_WATCHERS = 3;

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
  /**
   * Draw a legal quirk set per seed (SYS-04 v0.2), so the sweep measures the game a player builds
   * rather than the one nobody plays. False keeps the setup's own quirks, which is how a run is
   * compared against the passes taken before quirks existed.
   */
  quirks?: boolean;
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
  /** Watcher that ended the run, when one did (SYS-05 `captured`). */
  caught_by: string | null;
  /** Events that fired in this run, counted by the tag content files them under. */
  events_by_tag: Record<string, number>;
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
  /** The city every run started in, when the sweep fixed one (the `--locations` table). */
  city?: string;
  /** The lineage the run was played on, because the balance table moves when the default does. */
  lineage: string;
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
  /** The watchers that ended the most runs, most first (SYS-01 "M2 contract", the balance table). */
  top_watchers: { watcher: string; runs: number }[];
  /** Events per run by family, so a sweep can say which families are actually being played. */
  events_by_tag: Record<string, number>;
  timeline: SamplePoint[];
}

/**
 * How much of each event family this run saw. The log names the event, the bundle names the tags
 * it was filed under, and the balance pass reads the two together: a family that never fires is a
 * family nobody is playing with (SYS-01 "M2 contract", the balance table).
 */
function countEventTags(game: Game, content: ContentBundle): Record<string, number> {
  const index = contentIndex(content);
  const counts: Record<string, number> = {};
  for (const entry of game.world.log) {
    if (entry.key !== "log.event_fired") {
      continue;
    }
    const id = entry.vars.event;
    const def = typeof id === "string" ? index.events[id] : undefined;
    for (const tag of def?.tags ?? ["untagged"]) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
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

function withSeed(setup: GameSetup, seed: string, content?: ContentBundle): GameSetup {
  if (content === undefined) {
    return { ...setup, seed };
  }
  const quirks = pickQuirks(content, seed);
  return {
    ...setup,
    seed,
    players: setup.players.map((entry) => ({ ...entry, quirks })),
  };
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
  const caught = view.game_over?.vars.watcher;
  return {
    seed: setup.seed,
    view,
    caught_by: typeof caught === "string" && caught.length > 0 ? caught : null,
    events_by_tag: countEventTags(game, content),
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
  const drawQuirks = options.quirks !== false ? options.content : undefined;
  for (let index = 0; index < options.seeds; index += 1) {
    runs.push(
      runOnce(
        options.content,
        withSeed(options.setup, `${prefix}-${index}`, drawQuirks),
        options.days,
        policy,
        ctx,
      ),
    );
  }
  const report = summarize(
    options.setup.players[0]?.origin ?? "?",
    runs,
    options.seeds,
    options.days,
    options.setup.players[0]?.lineage ?? "?",
  );
  const city = options.setup.players[0]?.city;
  return city === undefined ? report : { ...report, city };
}

export function summarize(
  origin: string,
  runs: readonly SingleRun[],
  seeds: number,
  days: number,
  lineage = "?",
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

  const caught: Record<string, number> = {};
  const tags: Record<string, number> = {};
  for (const run of runs) {
    if (run.caught_by !== null) {
      caught[run.caught_by] = (caught[run.caught_by] ?? 0) + 1;
    }
    for (const [tag, count] of Object.entries(run.events_by_tag)) {
      tags[tag] = (tags[tag] ?? 0) + count;
    }
  }
  const perRun: Record<string, number> = {};
  for (const [tag, count] of Object.entries(tags).sort()) {
    perRun[tag] = runs.length === 0 ? 0 : Math.round((count / runs.length) * 10) / 10;
  }

  return {
    origin,
    lineage,
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
    top_watchers: Object.entries(caught)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_WATCHERS)
      .map(([watcher, count]) => ({ watcher, runs: count })),
    events_by_tag: perRun,
    timeline,
  };
}
