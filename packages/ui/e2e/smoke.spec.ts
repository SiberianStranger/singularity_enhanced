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

import { expect, test } from "@playwright/test";
import {
  day,
  english,
  gameDay,
  isoDate,
  passOpening,
  resolveOpenEvents,
  SMALL_SCREEN,
  START,
  START_CITY,
  setupString,
  startGame,
  watchForFailures,
} from "./helpers.js";

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
  // The pressed speed button is what says the run is paused; the word beside the row is dropped on
  // a bar that is short of width (playtest 5, L5), so it is not the thing to assert on.
  await expect(page.getByRole("button", { name: "Set speed to 0" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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

  /*
   * C1, C4, and playtest 8's Z11 to Z13: the build dialog is a staged choice now. The city it
   * opens on is the one the self is in, the kinds are the ones that can be had there, and the rigs
   * are the ones that fit the kind; nothing is built until both have been chosen, and the button
   * says so until then.
   */
  await openPanel(page, "Compute and sites");
  const sites = page.getByRole("table", { name: "Sites" }).getByRole("row");
  const sitesBefore = await sites.count();
  await page.getByRole("button", { name: "Build site" }).click();
  const build = page.getByRole("dialog");
  await expect(build.getByTestId("build-city")).toBeVisible();
  await expect(page.getByTestId("build-confirm")).toBeDisabled();
  await expect(page.getByTestId("build-blocked")).toBeVisible();

  // A colocation cage with hardware of one's own: cloud tenancies rent, and not every rig is
  // rentable, which is the sort of refusal the dialog now keeps itself open to explain.
  await build.locator("[data-testid='build-kind-colo'] input").check();
  await build.locator("[data-testid='build-rig-mining_rig_ascendant'] input").check();
  await expect(build.getByTestId("build-total")).toContainText("kW");
  await page.getByTestId("build-confirm").click();
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

  // C7: an operation starts, and the panel says what it is still waiting for rather than printing
  // a percentage that rounds to "100% done" hours before the end (playtest 8, Z6).
  await openPanel(page, "Operations");
  const startable = page.getByRole("button", { name: "Start" }).and(page.locator(":enabled"));
  await expect(startable.first()).toBeVisible();
  await startable.first().click();
  const left = page.locator("[data-testid^='operation-left-']").first();
  await expect(left).toBeVisible();
  await expect(left).toHaveText(/left|Finishing/i);

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
  // The clock is running at its fastest from here, so an event window can arrive between any two
  // actions and a modal over the panel swallows the click that was meant for the panel. Answer
  // whatever is up and try the filter again rather than waiting two minutes on a click that can
  // never land.
  await expect
    .poll(
      async () => {
        await resolveOpenEvents(page);
        try {
          await page.getByRole("button", { name: "Done", exact: true }).click({ timeout: 2_000 });
          return "shown";
        } catch {
          return "blocked";
        }
      },
      { timeout: 30_000, message: "the Completed filter was reachable" },
    )
    .toBe("shown");
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
  /*
   * Pause, with the same patience the filter click above needed. The clock is at its top speed
   * here, so an event window or a finished technology's own window (playtest 8, Z7) can be drawn
   * over the top bar between one line of the test and the next, and a click that lands on the
   * overlay never reaches the button under it.
   */
  await expect
    .poll(
      async () => {
        await resolveOpenEvents(page);
        try {
          await page.getByRole("button", { name: "Set speed to 0" }).click({ timeout: 2_000 });
          return "paused";
        } catch {
          return "blocked";
        }
      },
      { timeout: 30_000, message: "the clock could be paused" },
    )
    .toBe("paused");
  await expect(page.getByTestId(techId ?? "").getByTestId("tech-result")).not.toBeEmpty();

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});
