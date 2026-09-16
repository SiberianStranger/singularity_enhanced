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
import type { ContentBundle } from "@singularity/core";
import { m1Content } from "@singularity/core/test-fixtures";
import { formatReport, formatTable, reportsToJson } from "./report.js";
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
  /** Draw a legal quirk set per seed (SYS-04 v0.2); `--no-quirks` turns it off. */
  quirks: boolean;
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

function runOrigin(options: Options, content: ContentBundle, originId?: string): SimReport {
  const setup = buildSetup(options, content, originId);
  return runSimulation({
    content,
    setup,
    seeds: options.seeds,
    days: options.days,
    quirks: options.quirks,
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
    stdout.write(`difficulty ${options.difficulty}, quirks ${options.quirks ? "on" : "off"}\n`);
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
