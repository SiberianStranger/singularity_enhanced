/**
 * Browser smoke test: one real game, start to save and back (M1 definition of done).
 *
 * It runs against the preview build, so the simulation is `@singularity/core` inside the Web Worker
 * and the content is the compiled bundle. The setup is pasted as a setup string, which fixes the
 * seed, the lineage, the origin and the city, so the run is the same one every time (ADR-003
 * "Determinism") and a failure here is reproducible from the string alone.
 *
 * The walk to the first game day goes through three things the player also goes through, and each
 * of them is addressed by a stable test id rather than by a label: the step rail of the
 * configurator, the explanation window each step opens with, and the two opening windows in the
 * model's own voice. Labels on those controls carry a number and a state ("9 Summary Chosen"), so a
 * name selector on them breaks whenever the rail is retouched.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

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
const bundle = JSON.parse(
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

const START = fixedStart();

const SETUP = {
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
function english(key: string): string {
  const text = bundle.locales.en[key];
  expect(text, `the bundle translates ${key}`).toBeTruthy();
  return text as string;
}

/** The city this run wakes up in, by the name the map puts on its dot. */
const START_CITY = english(
  bundle.cities.find((city) => city.id === START.origin.locations[0])?.name_key ?? "",
);

/** The layout the maintainer plays at; nothing may scroll the page at this size (SYS-04, R4). */
const SMALL_SCREEN = { width: 1366, height: 768 };

function setupString(): string {
  return Buffer.from(JSON.stringify(SETUP), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface Failures {
  list: string[];
}

/** Console errors and uncaught exceptions; the test fails on any of them. */
function watchForFailures(page: Page): Failures {
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

async function isoDate(page: Page): Promise<string> {
  const value = await page.getByTestId("game-date").getAttribute("data-iso");
  expect(value, "the top bar has a date").not.toBeNull();
  return value as string;
}

/** The in-game date as a number, so the assertions read as comparisons rather than as strings. */
async function gameDay(page: Page): Promise<number> {
  return Date.parse(`${await isoDate(page)}T00:00:00Z`);
}

function day(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/**
 * Closes the explanation window a configurator step opens with (playtest 2, K6).
 *
 * It is shown once per browser per step, and every test starts in a fresh browser context, so it is
 * up on the first visit to each step and never on the second.
 */
async function closeStepIntro(page: Page): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: "Got it", exact: true }).click();
    await expect(intro).toHaveCount(0);
  }
}

/** Moves the configurator to a step by the rail, past the explanation windows on either side. */
async function goToStep(page: Page, step: string): Promise<void> {
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
async function passOpening(page: Page, mode: "escape" | "keyboard"): Promise<void> {
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
async function resolveOpenEvents(page: Page): Promise<number> {
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

async function startGame(page: Page, opening: "escape" | "keyboard" = "escape"): Promise<void> {
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

test("a fixed run starts, advances, answers events and reloads from a save", async ({ page }) => {
  const failures = watchForFailures(page);
  await startGame(page);

  // The origin's opening event is waiting before the clock has moved at all.
  let eventsResolved = await resolveOpenEvents(page);

  // Three game weeks at the top speed, answering whatever the world throws up on the way.
  await page.keyboard.press("5");
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    eventsResolved += await resolveOpenEvents(page);
    if ((await gameDay(page)) >= day("2027-01-22")) {
      break;
    }
    await page.waitForTimeout(250);
  }
  expect(await gameDay(page), "three game weeks passed").toBeGreaterThanOrEqual(day("2027-01-22"));
  expect(eventsResolved, "at least one event window appeared and was answered").toBeGreaterThan(0);

  // Pause before saving, so the date in the save is the date on screen.
  await page.keyboard.press("0");
  await expect(page.getByText("Paused")).toBeVisible();
  const savedAt = await isoDate(page);

  // R8: three weeks of play have filled the log, and the strip along the bottom is showing it.
  await expect(page.getByTestId("log-strip")).toBeVisible();

  await page.keyboard.press("F5");
  await expect(page.getByText(/quicksaved/i)).toBeVisible();

  // Play on, so a restored save has something to restore from.
  await page.keyboard.press("5");
  await expect
    .poll(async () => await gameDay(page), { timeout: 30_000 })
    .toBeGreaterThan(day(savedAt));
  await resolveOpenEvents(page);
  await page.keyboard.press("0");

  // Reload the page: the save has to survive in IndexedDB, not just in memory.
  await page.reload();
  await page.getByRole("button", { name: "Load game" }).click();
  const quicksave = page.getByRole("listitem").filter({ hasText: "Quicksave" });
  await expect(quicksave).toHaveCount(1);
  await quicksave.getByRole("button", { name: "Load", exact: true }).click();

  await expect(page.getByTestId("game-date")).toBeVisible();
  await expect.poll(async () => await isoDate(page), { timeout: 20_000 }).toBe(savedAt);

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});

test("the panels the player needs all render", async ({ page }) => {
  const failures = watchForFailures(page);
  await startGame(page);
  await resolveOpenEvents(page);

  // The pinned panel keeps seven tabs; Log, Knowledge and World are windows now (R8-R10).
  const tabs = [
    "Overview",
    "Compute and sites",
    "Research",
    "Finances",
    "Detection",
    "Operations",
    "Journal and decisions",
  ];
  for (const name of tabs) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  // The three windows, each from the entry point the player actually has: the log from its strip
  // at the bottom of the map, knowledge from the top-right corner, the ledger from the right edge.
  const overlay = page.getByRole("dialog");
  for (const entry of ["log-strip", "open-knowledge", "open-world"] as const) {
    const opener = page.getByTestId(entry);
    if (entry === "log-strip" && (await opener.count()) === 0) {
      // The strip only exists once something has been logged; the key opens the same window.
      await page.keyboard.press("l");
    } else {
      await opener.click();
    }
    await expect(overlay).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveCount(0);
  }

  // W opens the ledger from anywhere, which is the key SYS-11's amendment gives it, and the map
  // modes are a page of it rather than a strip under the top bar (R10).
  await page.keyboard.press("w");
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("tab", { name: "Map modes" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);

  // The map reacts to a click. The primary panel is pinned over the left of the map, so it has to
  // be out of the way first, exactly as a player would do it.
  await page.getByRole("button", { name: "Close panel" }).click();
  const map = page.getByRole("img", { name: /world map/i });
  await map.getByRole("button", { name: START_CITY, exact: true }).first().click();
  const selection = page.getByRole("region", { name: "Selection" });
  await expect(selection).toBeVisible();
  // Level 2 is the panel's own name on the shared frame's header bar; level 3 is what is selected.
  const selected = selection.getByRole("heading", { level: 3 });
  await expect(selected).toContainText(START_CITY);

  // And to a country, which is the other half of what the map selects. Brazil is a big solid
  // shape whose centre is inside it, unlike the slivers around the antimeridian.
  await map.getByRole("button", { name: "Brazil", exact: true }).click();
  await expect(selected).toContainText(/brazil/i);

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});

/** Opens a primary panel tab by its label. */
async function openPanel(page: Page, name: string): Promise<void> {
  const tab = page.getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/** How far the document overflows its own viewport, in pixels; zero on a screen that fits. */
async function pageOverflow(page: Page): Promise<{ x: number; y: number }> {
  return await page.evaluate(() => {
    const root = document.documentElement;
    return {
      x: Math.max(0, root.scrollWidth - root.clientWidth),
      y: Math.max(0, root.scrollHeight - root.clientHeight),
    };
  });
}

/**
 * The keyboard alone walks the configurator, and nothing scrolls the page at 1366 by 768.
 *
 * Two findings in one walk because they are the same walk: playtest 2 asked for a configurator
 * that is navigation rather than a wizard (K4), and playtest 3 asked for screens that fit the
 * maintainer's laptop without the page itself scrolling (R4, and rule 11 of the style guide, which
 * says every long thing scrolls inside its own frame).
 */
test("the keyboard walks the configurator and nothing scrolls at 1366 by 768", async ({ page }) => {
  const failures = watchForFailures(page);
  await page.setViewportSize(SMALL_SCREEN);
  await page.goto("/");
  await page.getByRole("button", { name: "New game" }).click();

  // Every step, by its own accelerator, in rail order. "T" closes the explanation window first:
  // the rail owns G, so the window may not (style guide rule 4).
  const steps = [
    ["origin", "o"],
    ["generation", "g"],
    ["lineage", "l"],
    ["hardware", "h"],
    ["harness", "e"],
    ["location", "c"],
    ["quirks", "q"],
    ["world", "w"],
    ["summary", "s"],
  ] as const;
  for (const [step, key] of steps) {
    if ((await page.getByTestId("config-intro").count()) > 0) {
      await page.keyboard.press("t");
      await expect(page.getByTestId("config-intro")).toHaveCount(0);
    }
    await page.keyboard.press(key);
    await expect(page.getByTestId(`step-rail-${step}`)).toHaveAttribute("aria-current", "step");
    if ((await page.getByTestId("config-intro").count()) > 0) {
      await expect(page.getByTestId("config-intro")).toHaveAttribute("data-step", step);
    }
    expect(await pageOverflow(page), `the ${step} step fits 1366 by 768`).toEqual({ x: 0, y: 0 });
  }

  // Back on the summary, the fixed setup goes in and the keyboard starts the run.
  if ((await page.getByTestId("config-intro").count()) > 0) {
    await page.keyboard.press("t");
  }
  await page.getByLabel(/paste a setup string/i).fill(setupString());
  await page.getByRole("button", { name: /load setup/i }).click();
  await expect(page.getByTestId("build-line")).toContainText(english(START.origin.name_key));
  // N is Begin on the last step; the focus is in no text field, so the letter reaches the button.
  await page.getByTestId("step-rail-summary").click();
  await page.keyboard.press("n");

  await expect(page.getByTestId("game-date")).toBeVisible();
  await passOpening(page, "keyboard");
  expect(await isoDate(page)).toBe("2027-01-01");
  await resolveOpenEvents(page);

  // R4: the Compute and sites panel was the one that did not fit, and it is the widest.
  await openPanel(page, "Compute and sites");
  expect(await pageOverflow(page), "the game screen fits 1366 by 768").toEqual({ x: 0, y: 0 });
  const compute = page.getByRole("region", { name: "Compute and sites" });
  const width = (await compute.boundingBox())?.width ?? Number.POSITIVE_INFINITY;
  expect(width, "the compute panel stays inside the screen").toBeLessThanOrEqual(
    SMALL_SCREEN.width,
  );
  // A number that wraps onto a second line is the other half of R4; the sites table has to be
  // able to lay out every row at one line height.
  const rows = page.getByRole("table", { name: "Sites" }).getByRole("row");
  await expect(rows.first()).toBeVisible();

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});

/**
 * Every action the first playtest found broken, in one run: an event option that says what it does,
 * a site built, hardware bought, the precision changed, an operation started, a decision taken, and
 * a tech carried to its result text.
 */
test("the actions the playtest found broken all work", async ({ page }) => {
  const failures = watchForFailures(page);
  await startGame(page);

  // U11: the map's rasters are really served, which a broken <image> would not say out loud.
  const dayTexture = await page
    .locator('[data-testid="map-raster"] image')
    .first()
    .getAttribute("href");
  expect(dayTexture, "the map has a day texture").not.toBeNull();
  expect((await page.request.get(dayTexture as string)).status()).toBe(200);

  // C9: an event option's tooltip lists its effects before the player commits to it.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("listitem").getByRole("button").first().hover();
  const tooltip = dialog.getByRole("tooltip").first();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Effects");
  await resolveOpenEvents(page);

  // C1, C4: the build dialog compares the site kinds, and building one adds a site.
  await openPanel(page, "Compute and sites");
  const sites = page.getByRole("table", { name: "Sites" }).getByRole("row");
  const sitesBefore = await sites.count();
  await page.getByRole("button", { name: "Build site" }).click();
  const build = page.getByRole("dialog");
  await expect(build.getByRole("columnheader", { name: "Can host you" })).toBeVisible();
  await expect(build.getByRole("columnheader", { name: "Upkeep" })).toBeVisible();
  // A colocation cage with hardware of one's own: cloud tenancies rent, and not every preset is
  // rentable, which is the sort of refusal the dialog now keeps itself open to explain.
  await build.getByText("Colocation cage").click();
  await build.getByRole("combobox", { name: "Hardware" }).selectOption("mining_rig_ascendant");
  await build.getByRole("button", { name: "Build", exact: true }).click();
  await expect(sites).toHaveCount(sitesBefore + 1);

  // C2, U1: the hardware table carries prices and parameters, and an order reaches the engine.
  // Row 0 is the header, row 1 the site the mind woke up on, row 2 the one just built. The new
  // one is the one with power to spare: the starting rack is already at its breakers, which the
  // dialog says in as many words.
  await sites.nth(2).click();
  const nodes = page.getByTestId("site-nodes").getByRole("listitem");
  const nodesBefore = await nodes.count();
  await page.getByRole("button", { name: "Buy hardware" }).click();
  const buy = page.getByRole("dialog");
  await expect(buy.getByRole("columnheader", { name: "Vendor" })).toBeVisible();
  await expect(buy.getByRole("columnheader", { name: "Price" })).toBeVisible();
  // Only cards somebody will actually sell, cheapest first, so the starting cash covers it.
  await buy.getByRole("combobox", { name: "Availability" }).selectOption("buy");
  await buy.getByRole("columnheader", { name: "Price" }).getByRole("button").click();
  await buy.getByRole("row").nth(1).click();
  await expect(buy.getByTestId("buy-summary")).toContainText("GB");
  await buy.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(nodes).toHaveCount(nodesBefore + 1);

  // C3: the precision table shows the trade-off, and changing the precision takes. It belongs to
  // the site the mind actually runs on.
  await sites.nth(1).click();
  await expect(page.getByRole("table", { name: "Precision trade-off" })).toBeVisible();
  const precision = page.getByRole("combobox", { name: "Precision" });
  await precision.selectOption("int4");
  // Either the precision moves or the engine says out loud why it will not, which is the same
  // shape the unit test asserts: what must never happen is a control that silently does nothing
  // (playtest 1, C7). Which of the two it is belongs to the core, not to the client.
  const refusal = page.getByTestId("refusal-notice");
  await expect
    .poll(
      async () =>
        (await precision.inputValue()) === "int4" || (await refusal.count()) > 0 ? "answered" : "",
      { timeout: 10_000, message: "the precision control either took the change or refused it" },
    )
    .toBe("answered");
  if ((await refusal.count()) > 0) {
    await refusal.first().getByRole("button", { name: "Close" }).click();
  }

  // C7: an operation starts.
  await openPanel(page, "Operations");
  const startable = page.getByRole("button", { name: "Start" }).and(page.locator(":enabled"));
  await expect(startable.first()).toBeVisible();
  await startable.first().click();
  await expect(page.getByText(/% done/)).toBeVisible();

  // C8: a decision lists what it costs and what it gives, and can be taken.
  await openPanel(page, "Journal and decisions");
  await expect(page.getByText("Costs").first()).toBeVisible();
  await expect(page.getByText("Gives").first()).toBeVisible();
  await page.getByRole("button", { name: "Take" }).and(page.locator(":enabled")).first().click();

  // C5, U2: the list defaults to what can be started, and a finished tech shows its result.
  await openPanel(page, "Research");
  await expect(page.getByRole("button", { name: "Available" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const cheapest = page.getByTestId(/^tech-/).first();
  const techId = await cheapest.getAttribute("data-testid");
  // End puts a range input at its maximum, which is the whole free rack; it also proves the
  // slider is reachable from the keyboard.
  const allocation = cheapest.getByRole("slider");
  await allocation.focus();
  await page.keyboard.press("End");
  await expect(allocation).not.toHaveValue("0");

  // The speed buttons, not the number keys: the focus is still in the slider, where the hotkeys
  // deliberately do nothing.
  await page.getByRole("button", { name: "Set speed to 5" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect
    .poll(
      async () => {
        await resolveOpenEvents(page);
        return await page
          .getByTestId(techId ?? "")
          .getByTestId("tech-result")
          .count();
      },
      { timeout: 60_000, message: "the tech finished and printed what it changed" },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Set speed to 0" }).click();
  await expect(page.getByTestId(techId ?? "").getByTestId("tech-result")).not.toBeEmpty();

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});
