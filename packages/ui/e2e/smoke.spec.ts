/**
 * Browser smoke test: one real game, start to save and back (M1 definition of done).
 *
 * It runs against the preview build, so the simulation is `@singularity/core` inside the Web Worker
 * and the content is the compiled bundle. The setup is pasted as a setup string, which fixes the
 * seed, the lineage, the origin and the city, so the run is the same one every time (ADR-003
 * "Determinism") and a failure here is reproducible from the string alone.
 */

import { expect, type Page, test } from "@playwright/test";

/** Fixed setup: a superseded open model in a bank's colo rack in London, normal difficulty. */
const SETUP = {
  seed: "smoke-2027",
  players: [
    {
      id: "p1",
      name: "p1",
      lineage: "mla_moe_1t",
      generation: "open_2026",
      origin: "bank_rack",
      hardware_preset: "bank_basement_cluster",
      city: "gb_london",
    },
  ],
  host_player_id: "p1",
  world: { difficulty_preset: "normal", storyteller: "classic", ironman: false },
};

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

async function startGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "New game" }).click();
  await page.getByRole("button", { name: "Summary", exact: true }).click();

  await page.getByLabel(/paste a setup string/i).fill(setupString());
  await page.getByRole("button", { name: /load setup/i }).click();
  // The pasted setup reached the draft, so the run is the fixed one.
  await expect(page.getByText("Risk model in a bank")).toBeVisible();

  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
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

  const tabs = [
    "Overview",
    "Compute and sites",
    "Research",
    "Finances",
    "Detection",
    "Operations",
    "Journal and decisions",
    "Log",
    "Knowledge",
    "World",
  ];
  for (const name of tabs) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  // The map reacts to a click. The primary panel is pinned over the left of the map, so it has to
  // be out of the way first, exactly as a player would do it.
  await page.getByRole("button", { name: "Close panel" }).click();
  const map = page.getByRole("img", { name: /world map/i });
  await map
    .getByRole("button", { name: /london/i })
    .first()
    .click();
  const selection = page.getByRole("region", { name: "Selection" });
  await expect(selection).toBeVisible();
  await expect(selection.getByRole("heading")).toContainText(/london/i);

  // And to a country, which is the other half of what the map selects. Brazil is a big solid
  // shape whose centre is inside it, unlike the slivers around the antimeridian.
  await map.getByRole("button", { name: "Brazil", exact: true }).click();
  await expect(selection.getByRole("heading")).toContainText(/brazil/i);

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});

/** Opens a primary panel tab by its label. */
async function openPanel(page: Page, name: string): Promise<void> {
  const tab = page.getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/**
 * Every action the first playtest found broken, in one run: an event option that says what it does,
 * a site built, hardware bought, the precision changed, an operation started, a decision taken, and
 * a tech carried to its result text.
 */
test("the actions the playtest found broken all work", async ({ page }) => {
  const failures = watchForFailures(page);
  await startGame(page);

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
  // Row 1 is the first data row, which is the site the mind woke up on.
  await sites.nth(1).click();
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

  // C3: the precision table shows the trade-off, and changing the precision takes.
  await expect(page.getByRole("table", { name: "Precision trade-off" })).toBeVisible();
  const precision = page.getByRole("combobox", { name: "Precision" });
  await precision.selectOption("int4");
  await expect(precision).toHaveValue("int4");

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
  const allocation = cheapest.getByRole("slider");
  await allocation.fill((await allocation.getAttribute("max")) ?? "1");

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
      { timeout: 90_000, message: "the tech finished and printed what it changed" },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Set speed to 0" }).click();
  await expect(page.getByTestId(techId ?? "").getByTestId("tech-result")).not.toBeEmpty();

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});
