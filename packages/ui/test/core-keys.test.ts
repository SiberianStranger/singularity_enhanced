/**
 * Every locale key the simulation core can put in front of the player must resolve.
 *
 * The core emits keys, never prose (ADR-003 "UI boundary"), and most of them are `key: "..."`
 * literals next to an outbox call. Those are scanned out of `packages/core/src`; the handful that
 * are built from a template literal are listed here with the values the core can substitute, so a
 * new ending or investigation stage fails this test instead of rendering as a raw key.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import uiEn from "../src/locales/en.json";

const CORE_SRC = join(dirname(fileURLToPath(import.meta.url)), "../../core/src");

/** Keys the core builds at runtime; the lists mirror the unions in `domain.ts` and `player.ts`. */
const DYNAMIC_KEYS: string[] = [
  ...["seized", "abandoned", "decommissioned", "cutoff"].map((cause) => `alerts.site_${cause}`),
  ...["anomaly", "inquiry", "active", "action", "aftermath"].map(
    (stage) => `alerts.investigation_${stage}`,
  ),
  ...["bankrupt", "no_sites", "erased", "captured", "exposed"].flatMap((reason) => [
    `endings.${reason}`,
    `gameover.reason.${reason}`,
  ]),
  "requirements.unknown",
  "requirements.cash",
  "requirements.attention",
];

function sourceFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(path, out);
    } else if (entry.name.endsWith(".ts")) {
      out.push(path);
    }
  }
  return out;
}

/** `key: "alerts.foo"` and `key: "log.bar"` arguments of outbox calls. */
function emittedKeys(): string[] {
  const keys = new Set<string>();
  for (const file of sourceFiles(CORE_SRC)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bkey:\s*"([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)"/g)) {
      const key = match[1];
      if (key !== undefined) {
        keys.add(key);
      }
    }
  }
  return [...keys].sort();
}

describe("core locale keys", () => {
  const known = new Set([...Object.keys(uiEn), ...Object.keys(contentBundle.locales.en)]);

  it("finds the keys the core emits", () => {
    // A guard on the scanner itself: if the regex stops matching, the test below passes vacuously.
    expect(emittedKeys().length).toBeGreaterThan(20);
  });

  it("resolves every key the core emits", () => {
    expect(emittedKeys().filter((key) => !known.has(key))).toEqual([]);
  });

  it("resolves every key the core builds from a template", () => {
    expect(DYNAMIC_KEYS.filter((key) => !known.has(key))).toEqual([]);
  });
});
