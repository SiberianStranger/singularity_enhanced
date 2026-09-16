/**
 * What a translated language owes the source language (SYS-14, `docs/design/14-i18n-ru.md`).
 *
 * Both string sources are checked together, because the player meets them together: the content
 * bundle's `locales.<lang>` and this package's `src/locales/<lang>.json`. The rules are the same for
 * every language that ships, so nothing here names Russian except the list of languages it finds.
 *
 * A missing key is not an error: it falls back to English at runtime and the coverage report below
 * says how many there are. An extra key, a broken ICU message or a changed placeholder set is,
 * because each of those is a string the game cannot render correctly.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";

const UI_LOCALE_DIR = join("src", "locales");

function uiLocale(language: string): Record<string, string> {
  return JSON.parse(readFileSync(join(UI_LOCALE_DIR, `${language}.json`), "utf8")) as Record<
    string,
    string
  >;
}

/** Every language with a client locale file, the source language last so it is checked first. */
const UI_LANGUAGES = readdirSync(UI_LOCALE_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));

const TRANSLATED_UI = UI_LANGUAGES.filter((language) => language !== DEFAULT_LANGUAGE);
const TRANSLATED_CONTENT = Object.keys(contentBundle.locales).filter(
  (language) => language !== DEFAULT_LANGUAGE,
);

/**
 * The named arguments an ICU message uses, however deeply they are nested.
 *
 * A plural or select branch is itself a message, so a naive scan of `{name` would count the branch
 * names (`one`, `other`, `=0`) as arguments and report a difference on every plural the two
 * languages spell differently, which is all of them. Walking the parsed AST counts what the runtime
 * will actually be asked for, which is the thing that has to match.
 */
function argumentsOf(message: string, locale: string): Set<string> {
  const found = new Set<string>();
  const walk = (parts: unknown): void => {
    if (!Array.isArray(parts)) {
      return;
    }
    for (const part of parts as { type: number; value?: string; options?: unknown }[]) {
      // TYPE.literal is 0; every other element carries the argument name in `value`.
      if (part.type !== 0 && typeof part.value === "string") {
        found.add(part.value);
      }
      const options = part.options as Record<string, { value?: unknown }> | undefined;
      if (options !== undefined) {
        for (const option of Object.values(options)) {
          walk(option.value);
        }
      }
    }
  };
  walk(new IntlMessageFormat(message, locale).getAst());
  return found;
}

function describeLanguage(
  language: string,
  source: Record<string, string>,
  target: Record<string, string>,
  label: string,
): void {
  describe(`${label} in ${language}`, () => {
    it("parses every message as ICU", () => {
      const broken: string[] = [];
      for (const [key, message] of Object.entries(target)) {
        try {
          new IntlMessageFormat(message, language);
        } catch (error) {
          broken.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      expect(broken).toEqual([]);
    });

    it("carries no key the source language lacks", () => {
      expect(Object.keys(target).filter((key) => source[key] === undefined)).toEqual([]);
    });

    it("asks the runtime for exactly the arguments the source message asks for", () => {
      const different: string[] = [];
      for (const [key, message] of Object.entries(target)) {
        const original = source[key];
        if (original === undefined) {
          continue;
        }
        const from = [...argumentsOf(original, DEFAULT_LANGUAGE)].sort();
        const to = [...argumentsOf(message, language)].sort();
        if (from.join(",") !== to.join(",")) {
          different.push(`${key}: [${from.join(", ")}] -> [${to.join(", ")}]`);
        }
      }
      expect(different).toEqual([]);
    });

    it("declines every count through an ICU plural", () => {
      // A Russian noun after a number always declines, so a count glued to a word is a bug even
      // when the English original got away with it (SYS-14 ru, section 4). The source message is
      // what decides: a key that is a plural in English has to be a plural here.
      const flat: string[] = [];
      for (const [key, message] of Object.entries(target)) {
        const original = source[key];
        if (original !== undefined && /,\s*plural\s*,/.test(original)) {
          if (!/,\s*plural\s*,/.test(message)) {
            flat.push(key);
          }
        }
      }
      expect(flat).toEqual([]);
    });
  });
}

for (const language of TRANSLATED_CONTENT) {
  describeLanguage(
    language,
    contentBundle.locales[DEFAULT_LANGUAGE] ?? {},
    contentBundle.locales[language] ?? {},
    "content strings",
  );
}

for (const language of TRANSLATED_UI) {
  describeLanguage(language, uiLocale(DEFAULT_LANGUAGE), uiLocale(language), "client strings");
}

describe("russian plural categories", () => {
  // Russian CLDR needs one/few/many and uses `other` for fractions, where the form is the genitive
  // singular rather than the genitive plural. A message that skips `few` or `many` renders "2 день".
  const REQUIRED = ["one", "few", "many", "other"];
  const sources: [string, Record<string, string>][] = [
    ["content", contentBundle.locales.ru ?? {}],
    ["client", UI_LANGUAGES.includes("ru") ? uiLocale("ru") : {}],
  ];

  for (const [label, strings] of sources) {
    it(`gives every ${label} plural all four categories`, () => {
      const incomplete: string[] = [];
      for (const [key, message] of Object.entries(strings)) {
        for (const block of message.matchAll(/,\s*plural\s*,([\s\S]*)$/g)) {
          const body = block[1] ?? "";
          const missing = REQUIRED.filter(
            (category) => !new RegExp(`(^|[\\s{])${category}\\s*\\{`).test(body),
          );
          if (missing.length > 0) {
            incomplete.push(`${key}: missing ${missing.join(", ")}`);
          }
        }
      }
      expect(incomplete).toEqual([]);
    });
  }
});

describe("coverage", () => {
  it("reports translated keys per domain", () => {
    const source = { ...contentBundle.locales[DEFAULT_LANGUAGE], ...uiLocale(DEFAULT_LANGUAGE) };
    const lines: string[] = [];
    for (const language of [...new Set([...TRANSLATED_CONTENT, ...TRANSLATED_UI])].sort()) {
      const target = {
        ...(contentBundle.locales[language] ?? {}),
        ...(UI_LANGUAGES.includes(language) ? uiLocale(language) : {}),
      };
      const domains = new Map<string, { total: number; done: number }>();
      for (const key of Object.keys(source)) {
        const domain = key.split(".")[0] ?? key;
        const row = domains.get(domain) ?? { total: 0, done: 0 };
        row.total += 1;
        if (target[key] !== undefined) {
          row.done += 1;
        }
        domains.set(domain, row);
      }
      const total = Object.keys(source).length;
      const done = Object.keys(source).filter((key) => target[key] !== undefined).length;
      lines.push(`${language}: ${done}/${total} (${Math.round((done / total) * 100)}%)`);
      for (const [domain, row] of [...domains].sort()) {
        lines.push(
          `  ${domain.padEnd(16)} ${String(row.done).padStart(4)}/${String(row.total).padEnd(4)} ${Math.round((row.done / row.total) * 100)}%`,
        );
      }
      // Every language that ships is complete; an incomplete one falls back and is reported by the
      // content build as a warning rather than failing here.
      expect(done, `${language} coverage`).toBeGreaterThan(0);
    }
    process.stdout.write(`locale coverage\n${lines.join("\n")}\n`);
  });
});
