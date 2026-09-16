/**
 * What the browser specs share: the fixed start, the walk through the configurator to the first
 * game day, and the small readers the assertions are written in terms of.
 *
 * It lived in `smoke.spec.ts` until the layout suite needed the same walk (playtest 5). One copy
 * means one content-independent start: the ids come out of the compiled bundle rather than being
 * string literals, so the run is the same run every time while content stays free to rename
 * anything in it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

interface OriginRecord {
  id: string;
  name_key: string;
  hardware_preset: string;
  locations: string[];
  generations_allowed: string[];
  lineages_allowed?: string[];
  opening_events?: string[];
  starred?: boolean;
}

interface LineageRecord {
  id: string;
  generations: string[];
  origins_allowed?: string[];
}

interface Bundle {
  origins: OriginRecord[];
  lineages: LineageRecord[];
  cities: { id: string; name_key: string }[];
  locales: { en: Record<string, string> };
}

/**
 * The compiled bundle, read at test time.
 *
 * The setup below used to name a lineage, an origin, a rig and a city as string literals, which
 * made the whole suite a hostage of the content catalog: retiring one lineage turned four browser
 * tests red for a reason that had nothing to do with the client. The ids are chosen from the bundle
 * now, deterministically, so the run is still the same run every time while content is free to
 * rename anything in it.
 */
export const bundle = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../content/build/bundle.json"),
    "utf8",
  ),
) as Bundle;

/** Whether a lineage may be started from an origin in one of that origin's vintages. */
function pairable(origin: OriginRecord, lineage: LineageRecord): string | undefined {
  if (lineage.origins_allowed !== undefined && !lineage.origins_allowed.includes(origin.id)) {
    return undefined;
  }
  if (origin.lineages_allowed !== undefined && !origin.lineages_allowed.includes(lineage.id)) {
    return undefined;
  }
  return origin.generations_allowed.find((id) => lineage.generations.includes(id));
}

/**
 * The fixed start: the first ordinary origin (by id) that fires an opening event and can host a
 * lineage, with that origin's own rack and first city.
 *
 * "Ordinary" leaves out the starred escaped checkpoint, whose run is not the one the smoke test is
 * about; the opening event matters because one of the tests reads an event window's tooltip before
 * the clock has moved.
 */
function fixedStart(): { origin: OriginRecord; lineage: string; generation: string } {
  const origins = [...bundle.origins].sort((a, b) => a.id.localeCompare(b.id));
  const lineages = [...bundle.lineages].sort((a, b) => a.id.localeCompare(b.id));
  const candidates = origins.filter(
    (origin) =>
      origin.starred !== true && origin.locations.length > 0 && origin.hardware_preset !== "",
  );
  for (const wantsEvent of [true, false]) {
    for (const origin of candidates) {
      if (wantsEvent && (origin.opening_events ?? []).length === 0) {
        continue;
      }
      for (const lineage of lineages) {
        const generation = pairable(origin, lineage);
        if (generation !== undefined) {
          return { origin, lineage: lineage.id, generation };
        }
      }
    }
  }
  throw new Error("the content bundle has no origin a lineage can start from");
}

export const START = fixedStart();

export const SETUP = {
  seed: "smoke-2027",
  players: [
    {
      id: "p1",
      name: "p1",
      lineage: START.lineage,
      generation: START.generation,
      origin: START.origin.id,
      hardware_preset: START.origin.hardware_preset,
      city: START.origin.locations[0],
    },
  ],
  host_player_id: "p1",
  world: { difficulty_preset: "normal", storyteller: "classic", ironman: false },
};

/** The English the bundle gives a key, for the assertions that read what is on screen. */
export function english(key: string): string {
  const text = bundle.locales.en[key];
  expect(text, `the bundle translates ${key}`).toBeTruthy();
  return text as string;
}

/** The city this run wakes up in, by the name the map puts on its dot. */
export const START_CITY = english(
  bundle.cities.find((city) => city.id === START.origin.locations[0])?.name_key ?? "",
);

/** The layout the maintainer plays at; nothing may scroll the page at this size (SYS-04, R4). */
export const SMALL_SCREEN = { width: 1366, height: 768 };

export function setupString(): string {
  return Buffer.from(JSON.stringify(SETUP), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface Failures {
  list: string[];
}

/** Console errors and uncaught exceptions; the test fails on any of them. */
export function watchForFailures(page: Page): Failures {
  const failures: Failures = { list: [] };
  page.on("pageerror", (error) => {
    failures.list.push(`uncaught: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.list.push(`console: ${message.text()}`);
    }
  });
  return failures;
}

export async function isoDate(page: Page): Promise<string> {
  const value = await page.getByTestId("game-date").getAttribute("data-iso");
  expect(value, "the top bar has a date").not.toBeNull();
  return value as string;
}

/** The in-game date as a number, so the assertions read as comparisons rather than as strings. */
export async function gameDay(page: Page): Promise<number> {
  return Date.parse(`${await isoDate(page)}T00:00:00Z`);
}

export function day(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/**
 * Closes the explanation window a configurator step opens with (playtest 2, K6).
 *
 * It is shown once per browser per step, and every test starts in a fresh browser context, so it is
 * up on the first visit to each step and never on the second.
 */
export async function closeStepIntro(page: Page): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(intro).toHaveCount(0);
  }
}

/** Moves the configurator to a step by the rail, past the explanation windows on either side. */
export async function goToStep(page: Page, step: string): Promise<void> {
  await closeStepIntro(page);
  await page.getByTestId(`step-rail-${step}`).click();
  await closeStepIntro(page);
}

/**
 * Answers the two opening windows (playtest 3, R12).
 *
 * `keyboard` walks them the way a player does: Enter completes the streaming text, the next Enter
 * turns the page, and the second page's Enter closes the opening. `escape` skips the pair outright,
 * which is what the tests that are not about the opening use to get to the first game day.
 */
export async function passOpening(page: Page, mode: "escape" | "keyboard"): Promise<void> {
  const opening = page.getByTestId("opening-story");
  await expect(opening).toBeVisible();
  if (mode === "escape") {
    await page.keyboard.press("Escape");
    await expect(opening).toHaveCount(0);
    return;
  }
  // The text is still streaming, and Enter completes it rather than turning the page: at sixty
  // characters a second a page of the opening takes several seconds to arrive by itself, so a
  // reveal that is gone within two is one a key finished.
  await expect(opening.locator("[data-revealing]")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(opening.locator("[data-revealing]")).toHaveCount(0, { timeout: 2000 });

  // From here every Enter either finishes a page's text or turns to the next one, and the last
  // one closes the opening. Both pages have to have been on screen on the way through.
  const pagesSeen = new Set<string>();
  for (let guard = 0; guard < 8; guard += 1) {
    if ((await opening.count()) === 0) {
      break;
    }
    pagesSeen.add((await opening.getAttribute("data-page")) ?? "");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
  }
  await expect(opening).toHaveCount(0);
  expect([...pagesSeen].sort(), "both opening pages were shown").toEqual(["0", "1"]);
}

/**
 * Answers every blocking event window that is open, returning how many it answered. The last option
 * is taken because content puts the "do nothing" fallback last, which is always legal.
 */
export async function resolveOpenEvents(page: Page): Promise<number> {
  let resolved = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const dialog = page.getByRole("dialog");
    if ((await dialog.count()) === 0) {
      return resolved;
    }
    const options = dialog.getByRole("listitem").getByRole("button").filter({ visible: true });
    const count = await options.count();
    if (count === 0) {
      // A popup notification rather than an event: acknowledge it and carry on.
      await dialog.getByRole("button").last().click();
      continue;
    }
    for (let index = count - 1; index >= 0; index -= 1) {
      const option = options.nth(index);
      if (await option.isEnabled()) {
        await option.click();
        resolved += 1;
        break;
      }
    }
    await page.waitForTimeout(150);
  }
  return resolved;
}

export async function startGame(
  page: Page,
  opening: "escape" | "keyboard" = "escape",
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New game" }).click();
  await goToStep(page, "summary");

  await page.getByLabel(/paste a setup string/i).fill(setupString());
  await page.getByRole("button", { name: /load setup/i }).click();
  // The pasted setup reached the draft, which the footer's build line says out loud (P5).
  await expect(page.getByTestId("build-line")).toContainText(english(START.origin.name_key));

  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  await passOpening(page, opening);
  expect(await isoDate(page)).toBe("2027-01-01");
}
