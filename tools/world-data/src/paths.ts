/** Where the generator reads from and writes to, relative to the repository root. */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const baselinePath = join(repoRoot, "docs", "research", "world-baseline-2026.json");

export const worldDataDir = join(repoRoot, "packages", "content", "data", "world");

export const overridesPath = join(worldDataDir, "overrides.yaml");

export const outputPaths = {
  countries: join(worldDataDir, "countries.yaml"),
  cities: join(worldDataDir, "cities.yaml"),
  macro_regions: join(worldDataDir, "macro_regions.yaml"),
} as const;
