/**
 * Theme contrast (SYS-11 "Accessibility"): minimum 4.5:1 in both themes.
 *
 * The tokens are the only place a color is written, so checking the tokens checks the client. The
 * pairs below are the ones that actually carry text; decorative fills (bars, map land) are not text
 * and are not held to the text ratio.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CSS = join(dirname(fileURLToPath(import.meta.url)), "../src/styles/index.css");

/** Foreground token, background token: every combination the UI renders text in. */
const TEXT_PAIRS: [string, string][] = [
  ["--c-fg", "--c-bg"],
  ["--c-fg", "--c-panel"],
  ["--c-fg", "--c-panel-2"],
  ["--c-muted", "--c-bg"],
  ["--c-muted", "--c-panel"],
  ["--c-muted", "--c-panel-2"],
  ["--c-accent", "--c-panel"],
  ["--c-accent-fg", "--c-accent"],
  ["--c-ok", "--c-panel"],
  ["--c-warn", "--c-panel"],
  ["--c-crit", "--c-panel"],
  ["--c-info", "--c-panel"],
  ["--c-opp", "--c-panel"],
];

function tokensOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) {
    throw new Error(`no ${selector} block in the stylesheet`);
  }
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const tokens: Record<string, string> = {};
  for (const line of css.slice(open + 1, close).split(";")) {
    const [name, value] = line.split(":");
    if (name !== undefined && value !== undefined && name.trim().startsWith("--")) {
      tokens[name.trim()] = value.trim();
    }
  }
  return tokens;
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? [...clean].map((digit) => digit + digit).join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

describe("theme contrast", () => {
  const css = readFileSync(CSS, "utf8");

  it("computes a known ratio", () => {
    // A guard on the maths itself: black on white is 21:1.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  for (const [name, selector] of [
    ["dark", ':root[data-theme="dark"]'],
    ["light", ':root[data-theme="light"]'],
  ] as const) {
    it(`keeps text at 4.5:1 or better in the ${name} theme`, () => {
      const tokens = tokensOf(css, selector);
      const failures: string[] = [];
      for (const [foreground, background] of TEXT_PAIRS) {
        const front = tokens[foreground];
        const back = tokens[background];
        expect(front, `${foreground} missing in ${name}`).toBeDefined();
        expect(back, `${background} missing in ${name}`).toBeDefined();
        const ratio = contrastRatio(front ?? "#000", back ?? "#fff");
        if (ratio < 4.5) {
          failures.push(`${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
