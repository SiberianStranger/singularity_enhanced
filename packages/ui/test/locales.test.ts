import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import uiEn from "../src/locales/en.json";
import fallbackEn from "../src/locales/en-fallback.json";

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

const known = new Set([
  ...Object.keys(uiEn),
  ...Object.keys(fallbackEn),
  ...Object.keys(contentBundle.locales.en),
]);

describe("locale resources", () => {
  it("resolves every static t() key used in the client", () => {
    const missing: string[] = [];
    for (const file of sourceFiles("src")) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bt\(\s*"([^"]+)"/g)) {
        const key = match[1];
        if (key !== undefined && !known.has(key)) {
          missing.push(`${key} (${file})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("parses every English message as ICU", () => {
    const broken: string[] = [];
    for (const [key, message] of Object.entries({ ...uiEn, ...fallbackEn })) {
      try {
        new IntlMessageFormat(message, "en");
      } catch (error) {
        broken.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("keeps user-visible strings out of components", () => {
    // A cheap guard for the "no literals in JSX" rule: text nodes between tags must be
    // expressions, not prose.
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      if (!file.endsWith(".tsx")) {
        continue;
      }
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/>\s*([A-Za-z][A-Za-z ,.'-]{3,})\s*</g)) {
        offenders.push(`${file}: ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
