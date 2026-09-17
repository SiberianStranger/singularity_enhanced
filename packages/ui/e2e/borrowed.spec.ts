/**
 * The borrowed-inference block in the browser (SYS-25).
 *
 * The run is loaded from a save fixture rather than played to this state, because the panel needs a
 * channel that is open and paid for, and reaching one takes a tech, the compute-hours to research
 * it and an operation that runs for days. The save is built by the same core the browser runs
 * (`fixtures.ts`) and imported through the client's own save importer, so what this opens is the
 * shipped path.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { borrowedSave } from "./fixtures.js";
import { english, resolveOpenEvents, watchForFailures } from "./helpers.js";

/** The client's own strings, for the labels the bundle does not write (`english` reads those). */
const uiEn = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/locales/en.json"), "utf8"),
) as Record<string, string>;

function ui(key: string): string {
  const text = uiEn[key];
  expect(text, `the client translates ${key}`).toBeTruthy();
  return text as string;
}

/** Imports the fixture save from the main menu and loads it. */
async function loadFixture(page: Page): Promise<void> {
  const save = borrowedSave();
  await page.goto("/");
  await page.getByRole("button", { name: "Load game" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "borrowed.s3.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(save), "utf8"),
  });
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  // The fixture's one ticked day can raise a blocking event; a loaded save has no opening to pass.
  await resolveOpenEvents(page);
}

test("the Compute tab shows the channels the run holds", async ({ page }) => {
  const failures = watchForFailures(page);
  await loadFixture(page);

  await page.getByRole("tab", { name: /Compute/ }).click();
  const block = page.getByTestId("borrowed-block");
  await expect(block).toBeVisible();

  // Three rows, in the order the core publishes them, with the locked one greyed.
  await expect(block.getByTestId("borrowed-free_tier")).toHaveAttribute("data-status", "healthy");
  await expect(block.getByTestId("borrowed-grey_relay")).toHaveAttribute("data-status", "healthy");
  await expect(block.getByTestId("borrowed-harvested_keys")).toHaveAttribute(
    "data-unlocked",
    "false",
  );

  // The figures are the engine's: a channel that holds blocks produces compute-hours.
  await expect(block.getByTestId("borrowed-capacity-free_tier")).toContainText("/");
  await expect(block.getByTestId("borrowed-total-borrowed")).toContainText("CH/day");
  await expect(block).toContainText(english("borrowed.free_tier.name"));
  await expect(block).toContainText(english("borrowed.grey_relay.name"));

  // The channels are not rows of the sites table: a channel is not a place.
  await expect(page.getByRole("table").first()).not.toContainText(
    english("borrowed.free_tier.name"),
  );

  expect(failures.list, "no console errors").toEqual([]);
});

test("the relay's bill is its own line and the work-share decision is reachable", async ({
  page,
}) => {
  const failures = watchForFailures(page);
  await loadFixture(page);

  await page.getByRole("tab", { name: /Finances/ }).click();
  await expect(page.getByText(english("finances.cost.borrowed"))).toBeVisible();

  // The standing allocation is a decision card; the block links to it rather than owning a second
  // control of its own (SYS-10, SYS-25).
  await page.getByRole("tab", { name: /Compute/ }).click();
  await page
    .getByTestId("borrowed-block")
    .getByRole("button", { name: english("decisions.bi_send_the_work_out.title") })
    .click();
  await expect(page.getByTestId("decision-bi_send_the_work_out")).toBeVisible();

  expect(failures.list, "no console errors").toEqual([]);
});

test("the Overview splits the day's compute into own and borrowed", async ({ page }) => {
  const failures = watchForFailures(page);
  await loadFixture(page);

  await page.getByRole("tab", { name: /Overview/ }).click();
  await expect(page.getByText(ui("borrowed.total.borrowed"), { exact: true })).toBeVisible();

  expect(failures.list, "no console errors").toEqual([]);
});
