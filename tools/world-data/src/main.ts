/**
 * `pnpm --filter @singularity/world-data start` rewrites the three world data files.
 *
 * `--check` writes nothing and exits non-zero when a file on disk differs, which is what the test
 * and CI use; the default rewrites and says which files changed.
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { outputPaths, repoRoot } from "./paths.js";
import { readWorld } from "./read.js";

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const files = await readWorld();
  const changed: string[] = [];
  for (const [name, path] of Object.entries(outputPaths)) {
    const wanted = files[name as keyof typeof outputPaths];
    let current: string | null = null;
    try {
      current = await readFile(path, "utf8");
    } catch {
      current = null;
    }
    if (current === wanted) {
      continue;
    }
    changed.push(relative(repoRoot, path));
    if (!check) {
      await writeFile(path, wanted);
    }
  }
  if (changed.length === 0) {
    process.stdout.write("world data is up to date\n");
    return;
  }
  if (check) {
    process.stdout.write(`out of date: ${changed.join(", ")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`rewrote ${changed.join(", ")}\n`);
}

await main();
