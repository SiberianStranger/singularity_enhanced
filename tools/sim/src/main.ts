/**
 * `pnpm --filter @singularity/sim start -- [options]`
 *
 * Runs the scripted policy over many seeds and prints the outcome distribution. With no `--bundle`
 * it uses the core's M1 test fixture, so the runner works before the real content bundle is built.
 * With `--all` it runs every origin in the bundle and prints the balance table the tuning pass is
 * read from.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";
import type { ContentBundle, GameSetup, OriginDef } from "@singularity/core";
import {
  CAPABILITY_AXES,
  contentIndex,
  effectiveCapability,
  preferredPrecision,
  siteMemory,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
} from "@singularity/core";
import { m1Content, m1Setup } from "@singularity/core/test-fixtures";
import { formatReport, formatTable, reportsToJson } from "./report.js";
import { runSimulation, type SimReport } from "./run.js";

interface Options {
  bundle?: string;
  origin?: string;
  lineage?: string;
  generation?: string;
  city?: string;
  preset?: string;
  difficulty: string;
  seeds: number;
  days: number;
  seed: string;
  all: boolean;
  json?: string;
  detail: boolean;
}

const USAGE = `usage: sim [options]
  --bundle <path>       compiled content bundle (default: the core M1 test fixture)
  --all                 run every origin in the bundle and print the balance table
  --origin <id>         origin id
  --lineage <id>        lineage id (default: the first the origin's generation allows)
  --generation <id>     generation id
  --city <id>           starting city id
  --preset <id>         hardware preset id
  --difficulty <id>     difficulty preset id (default: normal)
  --seeds <n>           seeds per origin (default: 20)
  --days <n>            days per run (default: 180)
  --seed <text>         seed prefix (default: "sim")
  --detail              print the per-origin block as well as the table
  --json <path>         also write the reports as JSON`;

function parseArgs(args: readonly string[]): Options {
  const options: Options = {
    seeds: 20,
    days: 180,
    seed: "sim",
    difficulty: "normal",
    all: false,
    detail: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    const value = args[i + 1];
    if (flag === "--help" || flag === "-h") {
      stdout.write(`${USAGE}\n`);
      exit(0);
    }
    if (flag === "--all") {
      options.all = true;
      continue;
    }
    if (flag === "--detail") {
      options.detail = true;
      continue;
    }
    // `pnpm start -- --days 30` passes a bare separator through; ignore it.
    if (flag === undefined || flag === "--" || !flag.startsWith("--") || value === undefined) {
      continue;
    }
    i += 1;
    switch (flag) {
      case "--bundle":
        options.bundle = value;
        break;
      case "--origin":
        options.origin = value;
        break;
      case "--lineage":
        options.lineage = value;
        break;
      case "--generation":
        options.generation = value;
        break;
      case "--city":
        options.city = value;
        break;
      case "--preset":
        options.preset = value;
        break;
      case "--difficulty":
        options.difficulty = value;
        break;
      case "--seeds":
        options.seeds = Number.parseInt(value, 10);
        break;
      case "--days":
        options.days = Number.parseInt(value, 10);
        break;
      case "--seed":
        options.seed = value;
        break;
      case "--json":
        options.json = value;
        break;
      default:
        break;
    }
  }
  return options;
}

function loadBundle(path: string | undefined): ContentBundle {
  return path === undefined ? m1Content : (JSON.parse(readFileSync(path, "utf8")) as ContentBundle);
}

/** Compute-hours a day below which a self is not doing useful work, whatever it knows. */
const MIN_USABLE_COMPUTE_HOURS = 5;

/**
 * The lineage a new player would pick for an origin: the strongest self that still gets real work
 * done on the origin's starting hardware. The configurator's summary screen shows compute-hours per
 * day next to the capability vector, and this is how a player reads the pair. It is why a four-box
 * swarm picks a mid-sized self it can hold in one box rather than a giant one split over ethernet,
 * and why a bank rack picks the giant.
 */
function defaultLineage(content: ContentBundle, origin: OriginDef, generation: string): string {
  const index = contentIndex(content);
  const preset = index.hardware_presets[origin.hardware_preset];
  const generationDef = index.generations[generation];
  const candidates = (content.lineages ?? [])
    .filter((lineage) => lineage.generations.includes(generation as never))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (preset === undefined || generationDef === undefined) {
    return candidates[0]?.id ?? "";
  }
  const nodes = preset.nodes.map((node, position) => ({
    id: `p${position}`,
    accelerator: node.accelerator,
    count: node.count,
    ram_gb: node.ram_gb,
    interconnect: node.interconnect,
    status: "active" as const,
    readyTick: 0,
  }));
  const site = { nodes, status: "active" as const };
  const memory = siteMemory(site, index.accelerators, 0);

  const scored = candidates.flatMap((lineage) => {
    const precision = preferredPrecision(lineage, generationDef, memory);
    if (precision === null) {
      return [];
    }
    const compute = tokensToComputeHoursPerDay(
      siteTokensPerSecond(site, index.accelerators, 0, lineage, generationDef, precision),
    );
    const capability = effectiveCapability(
      lineage,
      generationDef,
      precision,
      generationDef.prepared_quants,
    );
    const mean =
      CAPABILITY_AXES.reduce((sum, axis) => sum + capability[axis], 0) / CAPABILITY_AXES.length;
    return [{ id: lineage.id, compute, mean }];
  });
  const usable = scored.filter((entry) => entry.compute >= MIN_USABLE_COMPUTE_HOURS);
  const pool = usable.length > 0 ? usable : scored;
  const ranked = [...pool].sort(
    (a, b) => b.mean - a.mean || b.compute - a.compute || a.id.localeCompare(b.id),
  );
  return ranked[0]?.id ?? candidates[0]?.id ?? "";
}

/** Fills the setup from the flags, falling back to the fixture's quiet start. */
function buildSetup(options: Options, content: ContentBundle, originId?: string): GameSetup {
  const base = m1Setup({ seed: options.seed });
  const entry = base.players[0];
  if (entry === undefined) {
    throw new Error("the base setup has no players");
  }
  const wanted = originId ?? options.origin;
  const origin =
    wanted === undefined ? undefined : (content.origins ?? []).find((def) => def.id === wanted);
  const generation =
    options.generation ?? origin?.generations_allowed[0] ?? (entry.generation as string);
  const lineage =
    options.lineage ??
    (origin === undefined ? entry.lineage : defaultLineage(content, origin, generation));
  return {
    ...base,
    players: [
      {
        ...entry,
        lineage,
        generation: generation as typeof entry.generation,
        ...(origin !== undefined ? { origin: origin.id } : {}),
        ...(options.preset !== undefined
          ? { hardware_preset: options.preset }
          : origin !== undefined
            ? { hardware_preset: origin.hardware_preset }
            : {}),
        ...(options.city !== undefined
          ? { city: options.city }
          : origin !== undefined
            ? { city: origin.locations[0] ?? entry.city }
            : {}),
      },
    ],
    world: { ...base.world, difficulty_preset: options.difficulty },
  };
}

function runOrigin(options: Options, content: ContentBundle, originId?: string): SimReport {
  const setup = buildSetup(options, content, originId);
  return runSimulation({
    content,
    setup,
    seeds: options.seeds,
    days: options.days,
    seedPrefix: `${options.seed}-${originId ?? options.origin ?? "fixture"}`,
  });
}

function main(): void {
  const options = parseArgs(argv.slice(2));
  const content = loadBundle(options.bundle);
  const reports: SimReport[] = [];

  if (options.all) {
    for (const origin of [...(content.origins ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
      reports.push(runOrigin(options, content, origin.id));
    }
  } else {
    reports.push(runOrigin(options, content));
  }

  if (options.all || reports.length > 1) {
    stdout.write(`difficulty ${options.difficulty}\n`);
    stdout.write(`${formatTable(reports)}\n`);
  }
  if (!options.all || options.detail) {
    for (const report of reports) {
      stdout.write(`\n${formatReport(report.origin, report)}\n`);
    }
  }
  if (options.json !== undefined) {
    writeFileSync(options.json, reportsToJson(reports), "utf8");
  }
}

main();
