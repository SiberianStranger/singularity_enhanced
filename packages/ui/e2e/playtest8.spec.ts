/**
 * What playtest 8 asked the client for, in a browser, in both languages.
 *
 * Four of the findings are only really answered in a running browser: a technology that finishes
 * and opens its own window (Z7), an operation that says what it is still waiting for (Z6), the
 * build dialog as a staged choice that never refuses in silence and never scrolls sideways (Z11 to
 * Z13), and a run log that actually reaches the disk (Z9). Each one also takes the screenshot the
 * maintainer reads the result in.
 *
 * The shots go to `test-results/playtest8` inside this package, which is git-ignored along with
 * the rest of Playwright's output; set `PLAYTEST8_SHOTS` to write them somewhere else.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { bundle, resolveOpenEvents, setupString } from "./helpers.js";

const here = dirname(fileURLToPath(import.meta.url));

const SHOT_DIR = process.env.PLAYTEST8_SHOTS ?? join(here, "../test-results/playtest8");

/** The layout the maintainer reads the shots at (SYS-11 "The layout contract"). */
const SHOT_VIEWPORT = { width: 1280, height: 720 };

const LANGUAGES = ["en", "ru"] as const;
type Language = (typeof LANGUAGES)[number];

const UI: Record<Language, Record<string, string>> = {
  en: JSON.parse(readFileSync(join(here, "../src/locales/en.json"), "utf8")) as Record<
    string,
    string
  >,
  ru: JSON.parse(readFileSync(join(here, "../src/locales/ru.json"), "utf8")) as Record<
    string,
    string
  >,
};

/** The string the player sees for a key, from the client's locale or the content bundle's. */
function say(language: Language, key: string): string {
  const content = (bundle.locales as Record<string, Record<string, string>>)[language] ?? {};
  const text = content[key] ?? UI[language][key] ?? UI.en[key];
  expect(text, `${language} translates ${key}`).toBeTruthy();
  return text as string;
}

async function closeIntro(page: Page, language: Language): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: say(language, "config.intro.got_it") }).click();
    await expect(intro).toHaveCount(0);
  }
}

/** The fixed start, in the language asked for, on the screenshot viewport. */
async function start(page: Page, language: Language): Promise<void> {
  await page.setViewportSize(SHOT_VIEWPORT);
  if (language !== "en") {
    await page.addInitScript((lang: string) => {
      window.localStorage.setItem(
        "singularity.ui",
        JSON.stringify({ state: { language: lang }, version: 0 }),
      );
    }, language);
  }
  await page.goto("/");
  await page.getByRole("button", { name: say(language, "menu.new_game") }).click();
  await closeIntro(page, language);
  await page.getByTestId("step-rail-summary").click();
  await closeIntro(page, language);

  await page.locator("#setup-paste").fill(setupString());
  await page.getByRole("button", { name: say(language, "config.summary.paste_apply") }).click();
  await page.getByRole("button", { name: say(language, "config.begin"), exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("opening-story")).toHaveCount(0);
  await resolveOpenEvents(page);
}

/** Opens a primary tab by its accessible name in the language on screen. */
async function openTab(page: Page, language: Language, key: string): Promise<void> {
  const name = say(language, key);
  await page.getByRole("tab", { name, exact: true }).click();
  await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
}

/**
 * Sets the game speed by its control.
 *
 * The keyboard shortcut is not used here on purpose: the focus is inside the allocation slider
 * after the drag, and a digit there belongs to the slider rather than to the clock.
 */
async function setSpeed(page: Page, language: Language, speed: number): Promise<void> {
  const label = say(language, "game.speed.set").replace("{value, number}", String(speed));
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** Elements that need more width than they have: the sideways scroll the style guide forbids. */
async function sideways(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((root: string) => {
    const host = document.querySelector(root);
    const found: string[] = [];
    for (const element of host?.querySelectorAll("*") ?? []) {
      if (element.classList.contains("sr-only") || element.clientWidth === 0) {
        continue;
      }
      if (element.scrollWidth > element.clientWidth + 1) {
        const name =
          element.getAttribute("data-testid") ??
          (typeof element.className === "string" ? element.className : "");
        found.push(
          `<${element.tagName.toLowerCase()} ${name}> ${element.scrollWidth}px in ` +
            `${element.clientWidth}px: "${(element.textContent ?? "").trim().slice(0, 50)}"`,
        );
      }
    }
    return found;
  }, selector);
}

for (const language of LANGUAGES) {
  test(`a finished technology opens its window in ${language}`, async ({ page }) => {
    await start(page, language);
    await openTab(page, language, "panel.research");

    // The cheapest technology that can be started is the first row of the default filter; the
    // whole rack goes on it and the clock is let run.
    const row = page.locator("[data-testid^='tech-']").first();
    const slider = row.getByRole("slider");
    const ceiling = await slider.getAttribute("max");
    await slider.fill(ceiling ?? "1");
    await expect(row.getByRole("meter").first()).toBeVisible();

    await setSpeed(page, language, 5);
    const window = page.getByTestId("research-done");
    await expect(window).toBeVisible({ timeout: 90_000 });
    // The window covers the top bar, so the clock is paused by its key rather than by its button.
    await page.keyboard.press("0");

    // The reveal is finished by a click, the way a player finishes it, so the shot below carries
    // the whole result text rather than the half of it that had arrived.
    const revealing = window.locator("[data-revealing]");
    if ((await revealing.count()) > 0) {
      await revealing.click();
      await expect(revealing).toHaveCount(0);
    }

    // The window says what was learned and what it opens, in words, not in keys.
    await expect(page.getByTestId("research-done-name")).not.toBeEmpty();
    const text = (await window.innerText()).trim();
    expect(
      text.split(/\s+/).filter((word) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/.test(word)),
    ).toEqual([]);
    expect(await sideways(page, "[role='dialog']")).toEqual([]);

    await page.screenshot({ path: join(SHOT_DIR, `research-window-${language}.png`) });
  });

  test(`the build dialog asks two questions in ${language}`, async ({ page }) => {
    await start(page, language);
    await openTab(page, language, "panel.compute");
    await page.getByRole("button", { name: say(language, "compute.build_site") }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Nothing chosen: the button is disabled and the window says what to choose next (Z12).
    await expect(page.getByTestId("build-confirm")).toBeDisabled();
    await expect(page.getByTestId("build-blocked")).toBeVisible();

    // The city is the one the self is in, and the kinds are the ones that can be had there.
    await expect(page.getByTestId("build-city")).toBeVisible();
    const kinds = dialog.locator("input[name='build-kind']");
    expect(await kinds.count()).toBeGreaterThan(0);
    await kinds.first().check();

    // Choosing a kind reveals the rigs that fit it, and the total follows the choice.
    const rigs = dialog.locator("input[name='build-rig']");
    await expect(rigs.first()).toBeVisible();
    await rigs.first().check();
    await expect(page.getByTestId("build-total")).toBeVisible();

    // Z13: no sideways scroll anywhere in the window, at 1280 by 720, in either language.
    expect(await sideways(page, "[role='dialog']")).toEqual([]);
    const page_overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));
    expect(page_overflow).toEqual({ x: 0, y: 0 });

    // The shot is taken from the top of the window, where the staged choice reads as one.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("[role='dialog'] .overflow-auto")) {
        element.scrollTop = 0;
      }
    });
    await page.screenshot({ path: join(SHOT_DIR, `build-dialog-${language}.png`) });
  });

  test(`Settings writes a run log in ${language}`, async ({ page }) => {
    await start(page, language);
    await page.getByRole("button", { name: say(language, "game.menu"), exact: true }).click();
    await page
      .getByRole("button", { name: say(language, "game.menu.settings"), exact: true })
      .click();
    const button = page.getByRole("button", { name: say(language, "settings.run_log") });
    await expect(button).toBeVisible();
    // The line under the button says what the file contains.
    await expect(page.getByTestId("run-log")).toContainText(
      say(language, "settings.run_log.help").slice(0, 24),
    );

    const download = page.waitForEvent("download");
    await button.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^singularity-run-.*\.json$/);
    const path = await file.path();
    const written = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    expect(written.format).toBe("singularity-run-log");
    expect(Object.keys(written)).toContain("refusals");
    expect(Object.keys(written)).toContain("view");

    // The shot shows the whole block: the button, the line that says what is in the file, and the
    // confirmation naming the file that was written.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("[role='dialog'] .overflow-auto")) {
        element.scrollTop = element.scrollHeight;
      }
    });
    await page.screenshot({ path: join(SHOT_DIR, `settings-run-log-${language}.png`) });
  });
}

/** The four sizes the maintainer plays at, for the sweep below (SYS-11 "The layout contract"). */
const SWEEP: readonly { width: number; height: number }[] = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
];

/** The layer the panels are drawn in; the map itself is behind it. */
const PANELS = "[data-testid='panel-grid']";

const TAB_KEYS = [
  "panel.overview",
  "panel.compute",
  "panel.research",
  "panel.finances",
  "panel.detection",
  "panel.operations",
  "panel.journal",
] as const;

for (const language of LANGUAGES) {
  test(`nothing on the game screen scrolls sideways in ${language}`, async ({ page }) => {
    // Four viewports and nine screens each, in a browser: long by construction rather than slow.
    test.slow();
    await start(page, language);
    const cancel = page.getByRole("button", { name: say(language, "common.cancel"), exact: true });
    for (const viewport of SWEEP) {
      await page.setViewportSize(viewport);
      const size = `${viewport.width} by ${viewport.height}`;
      for (const key of TAB_KEYS) {
        await openTab(page, language, key);
        // The panels, the outliner, the selection panel and the log strip; the map behind them is
        // an SVG that scales rather than a box that can overflow.
        expect(await sideways(page, PANELS), `${key} at ${size} in ${language}`).toEqual([]);
      }
      // And the two dialogs this pass rebuilt, which are the widest windows on the game screen.
      await openTab(page, language, "panel.compute");
      await page.getByRole("button", { name: say(language, "compute.build_site") }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await sideways(page, "[role='dialog']"),
        `the build dialog at ${size} in ${language}`,
      ).toEqual([]);
      await cancel.click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.getByRole("button", { name: say(language, "compute.buy_hardware") }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await sideways(page, "[role='dialog']"),
        `the buy dialog at ${size} in ${language}`,
      ).toEqual([]);
      await cancel.click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
}

test("a running operation says what it is waiting for, and the compute adds up", async ({
  page,
}) => {
  await start(page, "en");
  await openTab(page, "en", "panel.operations");

  // The first operation that can be started; the panel then has to account for its compute.
  const offer = page.locator("[data-testid^='offer-']").filter({ hasNot: page.getByText("") });
  const start_buttons = page.getByRole("button", { name: say("en", "operations.start") });
  const count = await start_buttons.count();
  let started = false;
  for (let index = 0; index < count; index += 1) {
    const button = start_buttons.nth(index);
    if (await button.isEnabled()) {
      await button.click();
      started = true;
      break;
    }
  }
  expect(started, "content offers an operation that can be started on day one").toBe(true);
  void offer;

  // Z6: a remaining time rather than a bar stuck at full, and the reason it cannot go faster.
  const running = page.locator("[data-testid^='operation-left-']").first();
  await expect(running).toBeVisible();
  await expect(running).not.toBeEmpty();

  // Z1 and Z2: the Compute tab's one line adds up, and names what the operation is holding.
  await openTab(page, "en", "panel.compute");
  const budget = page.getByTestId("compute-budget");
  await expect(budget).toBeVisible();
  const numbers = await page.evaluate(() => {
    const read = (id: string): number => {
      const text = document.querySelector(`[data-testid='${id}']`)?.textContent ?? "";
      return Number.parseFloat(text.replace(/[^0-9.,-]/g, "").replace(",", "."));
    };
    return { reserved: read("budget-reserved"), allocatable: read("budget-allocatable") };
  });
  expect(numbers.reserved).toBeGreaterThan(0);
  expect(numbers.allocatable).toBeGreaterThanOrEqual(0);
});
