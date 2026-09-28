/** The shipped worker: bounded archetypes, six slots and an actual owned-site order in EN/RU. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { bundle, resolveOpenEvents, setupString, watchForFailures } from "./helpers.js";

for (const language of ["en", "ru"] as const) {
  test(`equipment workshop is legible and orders a configuration in ${language}`, async ({
    page,
  }) => {
    const failures = watchForFailures(page);
    const ui = JSON.parse(
      readFileSync(join(process.cwd(), `src/locales/${language}.json`), "utf8"),
    ) as Record<string, string>;
    const content = (bundle.locales as Record<string, Record<string, string>>)[language] ?? {};
    const text = (key: string): string => content[key] ?? ui[key] ?? key;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript((lang) => {
      localStorage.setItem(
        "singularity.ui",
        JSON.stringify({ state: { language: lang }, version: 0 }),
      );
    }, language);
    await page.goto("/");
    await page.getByRole("button", { name: text("menu.new_game") }).click();
    const intro = page.getByTestId("config-intro");
    if (await intro.count())
      await page.getByRole("button", { name: text("config.intro.got_it") }).click();
    await page.getByTestId("step-rail-summary").click();
    if (await intro.count())
      await page.getByRole("button", { name: text("config.intro.got_it") }).click();
    await page.locator("#setup-paste").fill(setupString());
    await page.getByRole("button", { name: text("config.summary.paste_apply") }).click();
    await page.getByRole("button", { name: text("config.begin"), exact: true }).click();
    await expect(page.getByTestId("game-date")).toBeVisible();
    await page.keyboard.press("Escape");
    await resolveOpenEvents(page);
    await page.getByRole("tab", { name: text("panel.compute"), exact: true }).click();
    await expect(page.locator("[data-testid^='equipment-slot-']")).toHaveCount(6);
    await page.getByRole("button", { name: text("compute.buy_hardware"), exact: true }).click();
    const workshop = page.getByTestId("equipment-dialog");
    await expect(workshop.getByRole("radio")).toHaveCount(4);
    await page.screenshot({ path: `test-results/equipment/archetypes-${language}.png` });
    await workshop.getByTestId("equipment-archetype-server_vintage").click();
    await expect(page.getByTestId("equipment-preview")).toContainText(/GB|ГБ/);
    await expect(page.getByTestId("equipment-confirm")).toBeDisabled();
    expect(await workshop.innerText()).not.toMatch(/equipment(?:_ui)?\.[a-z_]+/);
    await workshop.getByText(text("equipment_ui.basis"), { exact: true }).click();
    await expect(workshop).toContainText("P40");
    const overflow = await page
      .getByRole("dialog")
      .evaluate((root) =>
        [...root.querySelectorAll("*")]
          .filter(
            (e) =>
              e.clientWidth > 0 &&
              !e.classList.contains("sr-only") &&
              e.scrollWidth > e.clientWidth + 1,
          )
          .map((e) => e.tagName),
      );
    expect(overflow).toEqual([]);
    await page.screenshot({ path: `test-results/equipment/workshop-${language}.png` });
    await page.keyboard.press("Escape");

    // Start owns its cash but not its host's rack. Build an ordinary owned place first.
    await page.getByRole("button", { name: text("compute.build_site"), exact: true }).click();
    await page.getByTestId("build-kind-residential").getByRole("radio").check();
    await page.getByTestId("build-rig-avito_rig").getByRole("radio").check();
    await expect(page.getByTestId("build-confirm")).toBeEnabled();
    await page.getByTestId("build-confirm").click();
    await expect(page.getByTestId("build-confirm")).toHaveCount(0);
    const sites = page.getByRole("table", { name: text("compute.sites") });
    await expect(sites.getByRole("row")).toHaveCount(3);
    await sites.getByRole("row").last().click();
    await page.getByRole("button", { name: text("compute.buy_hardware"), exact: true }).click();
    await page.getByTestId("equipment-archetype-server_vintage").click();
    await expect(page.getByTestId("equipment-confirm")).toBeEnabled();
    await page.getByTestId("equipment-confirm").click();
    await expect(page.getByTestId("equipment-dialog")).toHaveCount(0);
    await expect(page.getByTestId("equipment-orders")).toContainText(
      text("equipment.archetype.server_vintage"),
    );
    await page.getByTestId("equipment-orders").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/equipment/ordered-${language}.png` });
    expect(failures.list).toEqual([]);
  });
}
