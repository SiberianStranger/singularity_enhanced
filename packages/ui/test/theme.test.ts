/**
 * Theme tokens (ui-style-guide.md rule 3, SYS-11 "Accessibility").
 *
 * The three themes of the style guide are Default (the original's blue), Night (dark gray and
 * amber) and Vector (black and thin phosphor lines), with Default as the default. Two things are
 * checked: that each one defines every token the components read, so a theme cannot half-exist, and
 * that every pair the UI actually renders text in reaches 4.5:1.
 *
 * The tokens are the only place a color is written, so checking the tokens checks the client. The
 * pairs below are the ones that carry text; decorative fills (bars, map land) are not text and are
 * not held to the text ratio.
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
  // `--c-accent` is a background (header bars, the active tab); the token that carries accent
  // text on a panel is `--c-accent-line`.
  ["--c-accent-line", "--c-panel"],
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
  // Comments are stripped first: a declaration that follows one on the next line would otherwise
  // be read as part of the comment's text, and the token would silently go missing.
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens: Record<string, string> = {};
  for (const line of body.split(";")) {
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

  /** Every token a component reads; a theme that omits one renders an unstyled element. */
  const REQUIRED = [
    "--c-bg",
    "--c-panel",
    "--c-panel-2",
    "--c-line",
    "--c-line-strong",
    "--c-fg",
    "--c-muted",
    "--c-accent",
    "--c-accent-fg",
    "--c-accent-line",
    "--c-ok",
    "--c-warn",
    "--c-crit",
    "--c-info",
    "--c-opp",
    "--c-map-land",
    "--c-map-line",
  ];

  it("makes the original's blue the default theme", () => {
    // `:root` with no attribute and `:root[data-theme="default"]` are the same block, so a browser
    // that has never been told which theme to use gets the blue one (style guide rule 3).
    expect(css).toMatch(/:root,\s*\n:root\[data-theme="default"\]/);
    const tokens = tokensOf(css, ':root[data-theme="default"]');
    expect(tokens["--c-panel"]).toBe("#000032");
    expect(tokens["--c-accent"]).toBe("#000080");
  });

  it("collapses the radius and shadow scales so nothing can round or float", () => {
    // Rule 1 is flat and square, and it is enforced in the theme rather than per component.
    const theme = tokensOf(css, "@theme inline");
    for (const [token, value] of Object.entries(theme)) {
      if (token.startsWith("--radius")) {
        expect(value, token).toBe("0px");
      }
      if (token.startsWith("--shadow")) {
        expect(value, token).toBe("none");
      }
    }
  });

  for (const [name, selector] of [
    ["default", ':root[data-theme="default"]'],
    ["night", ':root[data-theme="night"]'],
    ["vector", ':root[data-theme="vector"]'],
  ] as const) {
    it(`defines every token in the ${name} theme`, () => {
      const tokens = tokensOf(css, selector);
      const missing = REQUIRED.filter((token) => tokens[token] === undefined);
      expect(missing).toEqual([]);
    });

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
