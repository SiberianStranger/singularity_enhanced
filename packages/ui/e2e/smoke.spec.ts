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

  // And to a country, which is the other half of what the map selects.
  await map.locator('[data-testid="country-paths"] [role="button"]').first().click();
  await expect(selection.getByRole("heading")).not.toContainText(/london/i);

  expect(failures.list, "no uncaught errors were logged").toEqual([]);
});
