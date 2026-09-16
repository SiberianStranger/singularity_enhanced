/** Reading the two inputs, shared by the CLI and the test. */

import { readFile } from "node:fs/promises";
import type { Baseline } from "./baseline.js";
import { type GeneratedFiles, generate } from "./generate.js";
import { readOverrides } from "./overrides.js";
import { baselinePath, overridesPath } from "./paths.js";

export async function readWorld(): Promise<GeneratedFiles> {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as Baseline;
  const overrides = await readOverrides(overridesPath);
  return generate(baseline, overrides);
}
