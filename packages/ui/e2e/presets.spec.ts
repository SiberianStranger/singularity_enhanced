/**
 * The presets track, in a real browser, in both languages (SYS-04 "Configurator v0.4"; playtest 7,
 * Y5, Y6, Y7).
 *
 * The finding this suite exists for is not a layout one: "my brain freezes on the configurator and
 * I cannot get to the game". So the test is the walk a player who does not want to read nine
 * screens does. Open the configurator, read the first thing on it, press one row, press Start, and
 * be in the game. Twice, because a Russian player has the same problem and the same right to the
 * short way through.
 *
 * It also holds the two measurements the design response promised: the World step does not scroll
 * at 1280 by 720 in either language, and the day-zero figures the configurator prints are the ones
 * the game shows on its first day.
 */

import { expect, type Page, test } from "@playwright/test";
import { bundle, passOpening, resolveOpenEvents, watchForFailures } from "./helpers.js";

interface Words {
  newGame: string;
  gotIt: string;
  start: string;
  fullSetup: string;
}

const LANGUAGES: Record<string, Words> = {
  en: {
    newGame: "New game",
    gotIt: "Got it",
    start: "Start the game",
    fullSetup: "Full setup",
  },
  ru: {
    newGame: "Новая игра",
    gotIt: "Понятно",
    start: "Начать игру",
    fullSetup: "Полная настройка",
  },
};

/** The ids of the presets the bundle ships, in the order the step lists them. */
const PRESETS = ((bundle as unknown as { presets?: { id: string }[] }).presets ?? []).map(
  (preset) => preset.id,
);

async function closeIntro(page: Page, gotIt: string): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: gotIt, exact: true }).click();
    await expect(intro).toHaveCount(0);
  }
}

async function pageOverflow(page: Page): Promise<{ x: number; y: number }> {
  return await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
}

for (const [language, words] of Object.entries(LANGUAGES)) {
  test(`a preset starts a game in ${language}`, async ({ page }) => {
    const failures = watchForFailures(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript((lang: string) => {
      window.localStorage.setItem(
        "singularity.ui",
        JSON.stringify({ state: { language: lang }, version: 5 }),
      );
    }, language);
    await page.goto("/");
    await page.getByRole("button", { name: words.newGame }).click();

    // The configurator opens on the presets, above a rail headed "Full setup".
    await expect(page.getByTestId("step-rail-presets")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("rail-full-setup")).toHaveText(words.fullSetup);
    await closeIntro(page, words.gotIt);

    expect(PRESETS.length, "the bundle ships presets").toBeGreaterThan(5);
    const third = PRESETS[2] as string;
    await page.getByTestId(`list-entry-${third}`).click();

    // The card says what this start is worth on its first day, in words and in figures.
    await expect(page.getByTestId("preset-for")).not.toBeEmpty();
    await expect(page.getByTestId("preset-verdict")).not.toBeEmpty();
    const detail = page.getByTestId("step-detail");
    await expect(detail.locator("[data-line='compute']")).toHaveCount(1);
    await expect(detail.locator("[data-line='runway']")).toHaveCount(1);

    // Every other step is filled in, and the footer says which preset this build is.
    await expect(page.getByTestId("build-line")).not.toBeEmpty();
    await expect(page.getByTestId("step-rail-presets")).toContainText("+");

    // And the game starts from here, with no walk through the rail.
    await page.getByTestId("preset-start").click();
    await expect(page.getByTestId("game-date")).toBeVisible();
    await passOpening(page, "escape");
    expect(await page.getByTestId("game-date").getAttribute("data-iso")).toBe("2027-01-01");
    expect(failures.list, "no uncaught errors were logged").toEqual([]);
  });

  test(`the world step fits 1280 by 720 in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript((lang: string) => {
      window.localStorage.setItem(
        "singularity.ui",
        JSON.stringify({ state: { language: lang }, version: 5 }),
      );
    }, language);
    await page.goto("/");
    await page.getByRole("button", { name: words.newGame }).click();
    await closeIntro(page, words.gotIt);
    await page.getByTestId("step-rail-world").click();
    await closeIntro(page, words.gotIt);

    // Y5: the step used to scroll. Neither the page nor the step's own frame does now.
    expect(await pageOverflow(page), `the page scrolls on the world step in ${language}`).toEqual({
      x: 0,
      y: 0,
    });
    const detail = page.getByTestId("step-detail");
    const scroll = await detail.evaluate((element) => ({
      x: element.scrollWidth - element.clientWidth,
      y: element.scrollHeight - element.clientHeight,
    }));
    expect(scroll, `the world step's own frame scrolls in ${language}`).toEqual({ x: 0, y: 0 });

    // The advanced settings are behind the toggle, and they come back when it is pressed.
    await expect(page.getByTestId("world-advanced-panel")).toHaveCount(0);
    await page.getByTestId("world-advanced").click();
    await expect(page.getByTestId("world-advanced-panel")).toBeVisible();
  });
}

test("the configurator's day zero is the game's first day", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "New game" }).click();
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: "Got it", exact: true }).click();
  }
  await page.getByTestId(`list-entry-${PRESETS[1] as string}`).click();
  await page.getByTestId("step-rail-summary").click();
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: "Got it", exact: true }).click();
  }

  // What the configurator promises: the compute-hours a day, read off the day-zero block.
  const promised = await page
    .getByTestId("day-zero")
    .locator("[data-line='compute'] dd")
    .innerText();

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  await passOpening(page, "escape");
  // An origin's opening event is a window over the map, and a window intercepts a click on a tab.
  await resolveOpenEvents(page);

  // And what the game says on the first day, from the same view. The block prints the band's word
  // beside the value ("HIGH 100.7 CH/day"), so the comparison is on the figure itself.
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  const overview = await page.getByRole("region", { name: "Overview" }).innerText();
  const figure = /[\d][\d.,]*/.exec(promised.replace(/\s+/g, " "))?.[0] ?? "";
  expect(figure.length, `the day-zero block printed a figure, not "${promised}"`).toBeGreaterThan(
    0,
  );
  expect(overview.replace(/\s+/g, " "), `the overview prints ${figure} CH/day`).toContain(figure);
});
