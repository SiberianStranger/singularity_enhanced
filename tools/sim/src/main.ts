/**
 * `pnpm --filter @singularity/sim start -- [options]`
 *
 * Runs the scripted policy over many seeds and prints the outcome distribution. With no `--bundle`
 * it uses the core's M1 test fixture, so the runner works before the real content bundle is built.
 * With `--all` it runs every origin in the bundle and prints the balance table the tuning pass is
 * read from.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv, exit, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import type { ContentBundle, OriginDef } from "@singularity/core";
import { m1Content } from "@singularity/core/test-fixtures";
import {
  formatEventFamilies,
  formatLocationTable,
  formatReport,
  formatTable,
  reportsToJson,
} from "./report.js";
import { runSimulation, type SimReport } from "./run.js";
import { buildSetup, type SetupOptions } from "./setup.js";

interface Options extends SetupOptions {
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
  /** Run every origin across its own `locations` list (SYS-01 "M2 contract", "Balance"). */
  locations: boolean;
  /** Run one origin across these cities. */
  cities?: string[];
  /** Draw a legal quirk set per seed (SYS-04 v0.2); `--no-quirks` turns it off. */
  quirks: boolean;
}

const USAGE = `usage: sim [options]
  --bundle <path>       compiled content bundle (default: the core M1 test fixture)
  --all                 run every origin in the bundle and print the balance table
  --locations           run every origin across its own locations list, one row per city
  --cities a,b,c        run one origin across these cities (with --origin)
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
  --no-quirks           do not draw a quirk set per seed (the pre-quirk baseline)
  --json <path>         also write the reports as JSON`;

function parseArgs(args: readonly string[]): Options {
  const options: Options = {
    seeds: 20,
    days: 180,
    seed: "sim",
    difficulty: "normal",
    all: false,
    detail: false,
    locations: false,
    quirks: true,
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
    if (flag === "--locations") {
      options.locations = true;
      continue;
    }
    if (flag === "--detail") {
      options.detail = true;
      continue;
    }
    if (flag === "--no-quirks") {
      options.quirks = false;
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
      case "--cities":
        options.cities = value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry !== "");
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

/**
 * Reads a compiled bundle. A relative path is tried against the working directory first and then
 * against the workspace root, because `pnpm --filter @singularity/sim start` runs with the tool's
 * own directory as the working directory and the path everyone types is the repository one.
 */
function loadBundle(path: string | undefined): ContentBundle {
  if (path === undefined) {
    return m1Content;
  }
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  for (const candidate of [path, resolve(workspaceRoot, path)]) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, "utf8")) as ContentBundle;
    }
  }
  throw new Error(`no content bundle at "${path}"`);
}

function runOrigin(
  options: Options,
  content: ContentBundle,
  originId?: string,
  city?: string,
): SimReport {
  const setup = buildSetup(city === undefined ? options : { ...options, city }, content, originId);
  return runSimulation({
    content,
    setup,
    seeds: options.seeds,
    days: options.days,
    quirks: options.quirks,
    seedPrefix: `${options.seed}-${originId ?? options.origin ?? "fixture"}${
      city === undefined ? "" : `-${city}`
    }`,
  });
}

/**
 * The cities one origin is run across (SYS-01 "M2 contract", "Balance"): the ones the command line
 * named, else the origin's own typical list, which after SYS-04 v0.3 is six to eight cities rather
 * than the places the origin is allowed to be.
 */
function citiesFor(options: Options, origin: OriginDef): string[] {
  return options.cities ?? [...origin.locations];
}

function main(): void {
  const options = parseArgs(argv.slice(2));
  const content = loadBundle(options.bundle);
  const reports: SimReport[] = [];

  const origins = [...(content.origins ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const byLocation = options.locations || options.cities !== undefined;
  if (byLocation) {
    const wanted =
      options.origin === undefined ? origins : origins.filter((def) => def.id === options.origin);
    for (const origin of wanted) {
      for (const city of citiesFor(options, origin)) {
        reports.push(runOrigin(options, content, origin.id, city));
      }
    }
  } else if (options.all) {
    for (const origin of origins) {
      reports.push(runOrigin(options, content, origin.id));
    }
  } else {
    reports.push(runOrigin(options, content));
  }

  if (byLocation) {
    stdout.write(`difficulty ${options.difficulty}, quirks ${options.quirks ? "on" : "off"}\n`);
    stdout.write(`${formatLocationTable(reports)}\n`);
    stdout.write(`${formatEventFamilies(reports)}\n`);
  } else if (options.all || reports.length > 1) {
    stdout.write(`difficulty ${options.difficulty}, quirks ${options.quirks ? "on" : "off"}\n`);
    stdout.write(`${formatTable(reports)}\n`);
    stdout.write(`${formatEventFamilies(reports)}\n`);
  }
  if ((!options.all && !byLocation) || options.detail) {
    for (const report of reports) {
      stdout.write(`\n${formatReport(report.origin, report)}\n`);
    }
  }
  if (options.json !== undefined) {
    writeFileSync(options.json, reportsToJson(reports), "utf8");
  }
}

main();
