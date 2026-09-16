/**
 * The configurator's prose belongs to content, and all of it is used (playtest 3, continuation 4).
 *
 * The bundle publishes the step explanations and the sentences behind the "what this means in the
 * game" terms under `configurator.*`. Two failures are possible and both are silent: the client can
 * go on printing English of its own while the content key sits unread, and content can write a
 * string for a screen that never asks for it. This test closes both directions by reading the
 * client's sources for the keys it can produce, template literals included, and comparing that with
 * what the bundle publishes.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { bundleKey, hasBundleKey } from "../src/content/strings.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

function sourceFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Every `configurator.*` key the client can ask for, as regular expressions.
 *
 * A key written as a template literal (`configurator.intro.${step}`) becomes a pattern with the
 * expression standing for an id, so the nine step explanations are matched by the one line of
 * source that asks for them.
 */
function requestedPatterns(): RegExp[] {
  const patterns: RegExp[] = [];
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/["'`](configurator\.[^"'`]*)["'`]/g)) {
      const raw = match[1];
      if (raw === undefined) {
        continue;
      }
      const escaped = raw
        .split(/\$\{[^}]*\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[A-Za-z0-9_.]+");
      patterns.push(new RegExp(`^${escaped}$`));
    }
  }
  return patterns;
}

const published = Object.keys(contentBundle.locales.en)
  .filter((key) => key.startsWith("configurator."))
  .sort();

describe("the configurator strings the bundle publishes", () => {
  it("has some, so the test is not passing vacuously", () => {
    expect(published.length).toBeGreaterThan(10);
  });

  it("is referenced in full by the client", () => {
    const patterns = requestedPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    const unused = published.filter((key) => !patterns.some((pattern) => pattern.test(key)));
    expect(unused, "content wrote these and no screen asks for them").toEqual([]);
  });

  it("wins over the client's own string for the same idea", () => {
    // `bundleKey` is the one place the choice is made, so the rule is asserted on it rather than
    // on every call site.
    expect(bundleKey("configurator.intro.lineage", "config.intro.lineage")).toBe(
      "configurator.intro.lineage",
    );
    expect(hasBundleKey("configurator.intro.lineage")).toBe(true);
  });

  it("falls back to the client's own key for a string content has not written", () => {
    expect(hasBundleKey("configurator.nothing.here")).toBe(false);
    expect(bundleKey("configurator.nothing.here", "config.title")).toBe("config.title");
  });
});
