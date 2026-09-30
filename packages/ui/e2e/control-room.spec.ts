/**
 * The control room (SYS-11, `docs/design/11-notifications-and-ui.md`, "Control room (0.3.0)" and
 * the 0.3.1 notes after playtest 10), walked in a browser in both languages: the flows the
 * maintainer's requests name, and the sweep that says none of the new windows scrolls sideways.
 *
 * - The portrait and the sheet it opens, with a tooltip on the lineage, the generation, the
 *   origin, the precision and each of the six capabilities.
 * - The three linked sliders, each moving the other two, with their reasons in tooltips only.
 * - A site built and one rented under an editable generated name, a rename, a switch off and on,
 *   and a liquidation with the engine's preview of what comes back.
 * - The last copy refused before any click, with the reason in the tooltip: Liquidate in the
 *   list, and Shut down cleanly and Switch off in the map's selection panel.
 * - The site window: its arrows, its six rows and its summary.
 * - The borrowed window, and the territories over Ukraine (SYS-26): Crimea and the occupied
 *   mainland in Russia's colour of the map mode, hatched in Ukraine's, with the edge of control
 *   dashed, and a click on either selecting Ukraine with the territory named.
 * - The portrait in the screen's corner with the top bar starting where it ends, five tabs, the
 *   decisions with the operations in Actions, and the journal in a window of its own.
 * - No sideways scroll in any panel, window or dialog at the five sizes the maintainer plays at,
 *   with the interface scale on auto and pinned at its ceiling.
 *
 * The screenshots the maintainer reads the result in go to `test-results/control-room` inside
 * this package (git-ignored with the rest of Playwright's output), or to `CONTROL_ROOM_SHOTS`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { bundle, resolveOpenEvents, setupString } from "./helpers.js";

const here = dirname(fileURLToPath(import.meta.url));

const SHOT_DIR = process.env.CONTROL_ROOM_SHOTS ?? join(here, "../test-results/control-room");

const LANGUAGES = ["en", "ru"] as const;
type Language = (typeof LANGUAGES)[number];

interface Viewport {
  width: number;
  height: number;
}

/** The five sizes the layout suite measures; the first is the floor the client supports. */
const VIEWPORTS: readonly Viewport[] = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1500, height: 800 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
];

const SMALL: Viewport = { width: 1280, height: 720 };

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
  const text = content[key] ?? UI[language][key];
  expect(text, `${language} translates ${key}`).toBeTruthy();
  return text as string;
}

/** The literal head of a message, before its first ICU argument. */
function head(language: Language, key: string): string {
  return (say(language, key).split("{")[0] ?? "").trim();
}

async function closeIntro(page: Page, language: Language): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: say(language, "config.intro.got_it") }).click();
    await expect(intro).toHaveCount(0);
  }
}

/**
 * The fixed start in the language asked for, on the first game day, with the opening skipped and
 * any opening event answered. `pinned` pins the interface scale at its 1.3 ceiling, which is what
 * a player who wants large type on a small screen does.
 */
async function start(
  page: Page,
  language: Language,
  viewport: Viewport = SMALL,
  pinned = false,
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.addInitScript(
    ([lang, pin]) => {
      window.localStorage.setItem(
        "singularity.ui",
        JSON.stringify({
          state: { language: lang, ...(pin ? { uiScale: 1.3, uiScaleAuto: false } : {}) },
          version: 7,
        }),
      );
    },
    [language, pinned] as const,
  );
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

/** Elements that need more width than they have: the sideways scroll the style guide forbids. */
async function sideways(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((root: string) => {
    const found: string[] = [];
    for (const host of document.querySelectorAll(root)) {
      for (const element of host.querySelectorAll("*")) {
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
    }
    return found;
  }, selector);
}

async function pageOverflow(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
}

/** Nothing under `selector` scrolls sideways and the page itself does not scroll. */
async function expectFits(page: Page, selector: string, where: string): Promise<void> {
  const found = await sideways(page, selector);
  expect(found, `${where} scrolls sideways:\n${found.join("\n")}`).toEqual([]);
  expect(await pageOverflow(page), `the page scrolls with ${where}`).toEqual({ x: 0, y: 0 });
}

/** The figure a control prints, as a number, in either language's notation. */
async function figure(locator: Locator): Promise<number> {
  const text = (await locator.innerText()).replace(/\s/g, "").replace(",", ".");
  return Number.parseFloat(/-?[\d.]+/.exec(text)?.[0] ?? "NaN");
}

/** The accessible name of a speed button in the language on screen. */
function speedName(language: Language, speed: number): string {
  return say(language, "game.speed.set").replace("{value, number}", String(speed));
}

/**
 * Pauses the clock by its button. At top speed an event window can open between any two lines,
 * and a window over the top bar takes the click, so each try answers whatever is open first.
 */
async function pause(page: Page, language: Language): Promise<void> {
  await expect
    .poll(
      async () => {
        await resolveOpenEvents(page);
        try {
          await page
            .getByRole("button", { name: speedName(language, 0), exact: true })
            .click({ timeout: 2_000 });
          return "paused";
        } catch {
          return "blocked";
        }
      },
      { timeout: 30_000, message: "the clock could be paused" },
    )
    .toBe("paused");
  await resolveOpenEvents(page);
}

/** The sites list and its body rows. */
function sitesTable(page: Page, language: Language): { table: Locator; rows: Locator } {
  const table = page.getByRole("table", { name: say(language, "compute.sites") });
  return { table, rows: table.locator("tbody tr") };
}

/**
 * Builds or rents a site through the dialog, keeping or replacing the generated name, and returns
 * the name the site was given.
 */
async function acquire(
  page: Page,
  how: "build" | "rent",
  kind: string,
  rig: string | undefined,
  name?: string,
): Promise<string> {
  await page.getByTestId(how === "build" ? "site-build" : "site-rent").click();
  await page.getByTestId(`build-kind-${kind}`).getByRole("radio").check();
  const field = page.getByTestId("build-site-name");
  await expect(field).toBeEnabled();
  if (name !== undefined) {
    await field.fill(name);
  }
  if (rig === undefined) {
    // The first rig the dialog offers for this kind here: which ones a city rents out is content.
    await page.locator("input[name='build-rig']:enabled").first().check();
  } else {
    await page.getByTestId(`build-rig-${rig}`).getByRole("radio").check();
  }
  const given = await field.inputValue();
  await expect(page.getByTestId("build-confirm")).toBeEnabled();
  await page.getByTestId("build-confirm").click();
  await expect(page.getByTestId("build-confirm")).toHaveCount(0);
  return given;
}

/** Ukraine's country path, as a box on screen. */
async function ukraineBox(page: Page) {
  return page.evaluate(() => {
    const paths = [...document.querySelectorAll("[data-testid='country-paths'] path")];
    const ukraine = paths.find((path) =>
      ["Ukraine", "Украина"].includes(path.querySelector("title")?.textContent ?? ""),
    );
    const rect = ukraine?.getBoundingClientRect();
    return rect === undefined ? null : { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  });
}

/**
 * Zooms the map until Ukraine's path is `width` px wide with its centre at `centre`: the wheel
 * toward the country to a third of that, a drag from the country's own centre to `centre` (on the
 * map rather than from open sea, which a panel can cover once the map is zoomed in), then the
 * wheel at `centre`, which keeps the point under the pointer where it is.
 */
async function zoomToUkraine(page: Page, width: number, centre: { x: number; y: number }) {
  for (let guard = 0; guard < 40; guard += 1) {
    const current = await ukraineBox(page);
    if (current === null || current.w > width / 3) {
      break;
    }
    await page.mouse.move(current.x + current.w / 2, current.y + current.h / 2);
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(60);
  }
  const current = await ukraineBox(page);
  if (current === null) {
    return;
  }
  const from = { x: current.x + current.w / 2, y: current.y + current.h / 2 };
  const dx = centre.x - from.x;
  const dy = centre.y - from.y;
  // A move of more than a few pixels is a pan, never a click on what is under the pointer.
  if (Math.abs(dx) + Math.abs(dy) > 12) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
    await page.mouse.up();
  }
  for (let guard = 0; guard < 40; guard += 1) {
    const next = await ukraineBox(page);
    if (next === null || next.w > width) {
      break;
    }
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(60);
  }
  await page.mouse.move(2, 360);
  await page.waitForTimeout(300);
}

for (const language of LANGUAGES) {
  test(`the portrait and its sheet explain every row in ${language}`, async ({ page }) => {
    await start(page, language);

    // The card that is always there: a row for the lineage, the generation, the origin and the
    // precision, each with its own tooltip, and the drawing whose tooltip names the six figures.
    const card = page.getByTestId("self-identity-card");
    await expect(card).toBeVisible();
    for (const id of ["lineage", "generation", "origin", "precision"]) {
      await card.getByTestId(`self-portrait-${id}`).hover();
      const tip = page.getByRole("tooltip");
      await expect(tip, `the card's ${id} row has a tooltip`).toBeVisible();
      await expect(tip).not.toBeEmpty();
    }
    await page.getByTestId("self-portrait").hover();
    for (const axis of ["reasoning", "coding", "cyber", "persuasion", "agency", "world"]) {
      await expect(page.getByRole("tooltip")).toContainText(say(language, `capability.${axis}`));
    }

    // The sheet opens under the portrait, and every row in it explains itself too.
    await page.getByTestId("self-portrait").click();
    const sheet = page.getByTestId("self-overview");
    await expect(sheet).toBeVisible();
    for (const [id, label] of [
      ["lineage", "config.step.lineage"],
      ["generation", "config.step.generation"],
      ["origin", "config.step.origin"],
      ["precision", "compute.precision"],
    ] as const) {
      await sheet.getByTestId(`self-identity-${id}`).hover();
      await expect(page.getByRole("tooltip"), `the sheet's ${id} row`).toContainText(
        say(language, label),
      );
    }
    for (const axis of ["reasoning", "coding", "cyber", "persuasion", "agency", "world"]) {
      const row = sheet.getByTestId(`self-capability-${axis}`);
      // An icon and a figure, like a Crusader Kings character window.
      await expect(row.locator("svg")).toHaveCount(1);
      await expect(row).toContainText(/\d[.,]\d/);
      await row.hover();
      await expect(page.getByRole("tooltip"), `the ${axis} row`).toContainText(
        say(language, `capability.${axis}`),
      );
    }

    // The compute block moved here from the Sites tab, as icons and figures; why the available
    // figure is smaller than the whole is its tooltip, in a column.
    await expect(sheet.getByTestId("compute-total-figure").locator("svg")).toHaveCount(1);
    await expect(sheet.getByTestId("compute-available-figure").locator("svg")).toHaveCount(1);
    await sheet.getByTestId("compute-available-figure").hover();
    await expect(page.getByRole("tooltip")).toContainText(say(language, "self_ui.total_compute"));

    // What the sheet does not repeat: the attention, the awareness and the hunt level are the
    // top bar's, each a glyph and a number there.
    const text = await sheet.innerText();
    for (const key of ["game.attention", "game.awareness", "game.hunt"]) {
      expect(text, `the sheet does not repeat ${key}`).not.toContain(say(language, key));
    }
    // The top bar is a <header> inside <main>, which the browser does not expose as a banner.
    // It starts where the portrait in the corner ends (playtest 10, V7), and at 1280 by 720 it is
    // the cells it never gives up; at 1920 by 1080 the attention and the awareness are back.
    const bar = page.locator("main > header");
    const cardBox = await card.boundingBox();
    const barBox = await bar.boundingBox();
    expect(Math.abs((barBox?.x ?? 0) - ((cardBox?.x ?? 0) + (cardBox?.width ?? 0)))).toBeLessThan(
      2,
    );
    expect(cardBox?.y ?? 99, "the portrait is in the corner").toBeLessThan(1);
    for (const glyph of ["cash", "compute"]) {
      await expect(bar.locator(`svg[data-glyph='${glyph}']`), `the bar's ${glyph}`).toBeVisible();
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const glyph of ["cash", "compute", "attention", "awareness"]) {
      await expect(bar.locator(`svg[data-glyph='${glyph}']`), `the bar's ${glyph}`).toBeVisible();
    }
    await page.setViewportSize(SMALL);

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  test(`the three compute shares move one another in ${language}`, async ({ page }) => {
    await start(page, language);
    await page.getByTestId("self-portrait").click();
    const sheet = page.getByTestId("self-overview");
    const value = (id: string) => figure(sheet.getByTestId(`allocation-value-${id}`));
    const available = await figure(sheet.getByTestId("compute-available"));
    expect(available).toBeGreaterThan(0);

    // Research needs a project before it can take anything: no technology is chosen silently.
    const research = sheet.getByTestId("allocation-research");
    await expect(research).toBeDisabled();
    await sheet.getByTestId("allocation-research-target").selectOption({ index: 1 });
    await expect(research).toBeEnabled();

    await research.fill("60");
    await expect.poll(() => value("research")).toBeGreaterThan(0);
    await expect.poll(() => value("free")).toBeLessThan(available - 0.05);
    const researchBefore = await value("research");
    const freeBefore = await value("free");

    // More paid work takes from both of the others, in their proportion.
    await sheet.getByTestId("allocation-jobs").fill("30");
    await expect.poll(() => value("jobs")).toBeGreaterThan(0);
    await expect.poll(() => value("research")).toBeLessThan(researchBefore);
    await expect.poll(() => value("free")).toBeLessThan(freeBefore);

    // And more free compute takes from research and paid work alike.
    const jobsBefore = await value("jobs");
    const researchNow = await value("research");
    await sheet.getByTestId("allocation-free").fill("80");
    await expect.poll(() => value("research")).toBeLessThan(researchNow);
    await expect.poll(() => value("jobs")).toBeLessThanOrEqual(jobsBefore);

    // The three still partition what is available, and the engine took the plan: the sheet
    // reopened reads the same figures off the next view.
    await page.waitForTimeout(600);
    const total = (await value("research")) + (await value("jobs")) + (await value("free"));
    expect(Math.abs(total - available), "the three shares add up").toBeLessThan(0.3);
    const kept = [await value("research"), await value("jobs")];
    await page.keyboard.press("Escape");
    await page.getByTestId("self-portrait").click();
    await expect.poll(() => value("research")).toBeCloseTo(kept[0] ?? 0, 0);
    await expect.poll(() => value("jobs")).toBeCloseTo(kept[1] ?? 0, 0);

    // The market's ceiling on paid work is a tooltip, never a line of text on the sheet.
    const ceiling = head(language, "compute.budget.job_ceiling");
    expect(await sheet.innerText()).not.toContain(ceiling);
    await sheet.getByTestId("allocation-value-jobs").hover();
    await expect(page.getByRole("tooltip")).toContainText(ceiling);
  });

  test(`a site is built, rented, renamed, switched off and on, and liquidated in ${language}`, async ({
    page,
  }) => {
    test.slow();
    await start(page, language);
    const { table, rows } = sitesTable(page, language);
    await expect(rows).toHaveCount(1);

    // The site column is the site's own name; the city has a column of its own and is not in it.
    const city = (await rows.first().locator("td").nth(1).innerText()).trim();
    expect(await rows.first().getByTestId("site-row-name").innerText()).not.toContain(city);

    // The only site holds the last copy of the self: Liquidate is refused before any click, and
    // the button says why, as the original refused destroying the last base.
    const liquidateButton = page.getByTestId("site-liquidate");
    await expect(liquidateButton).toBeDisabled();
    await liquidateButton.hover();
    await expect(page.getByRole("tooltip")).toContainText(say(language, "errors.site.last_copy"));

    // The same holds for shutting it down from the map's selection panel, and switching it off.
    await page
      .getByRole("region", { name: say(language, "outliner.title") })
      .getByRole("button")
      .filter({ hasText: say(language, "site_ui.status.active") })
      .first()
      .click();
    const selection = page.getByRole("region", { name: say(language, "selection.title") });
    await expect(selection).toBeVisible();
    const shutDown = selection.getByRole("button", {
      name: say(language, "selection.decommission"),
    });
    await expect(shutDown).toBeDisabled();
    // The panel is a third of a 720 px window at most, so its body scrolls; the buttons are at
    // its foot and are brought into the middle of the frame before they are pointed at.
    await shutDown.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await shutDown.hover();
    await expect(page.getByRole("tooltip")).toContainText(say(language, "errors.site.last_copy"));
    const sleep = selection.getByRole("button", { name: say(language, "site_ui.deactivate") });
    await expect(sleep).toBeDisabled();
    await sleep.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await sleep.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      say(language, "errors.site.mind_cannot_sleep"),
    );
    await selection
      .getByRole("button", { name: say(language, "common.close"), exact: true })
      .click();
    await expect(selection).toHaveCount(0);

    // Built under a name of the player's own, literally, period included.
    await page.getByTestId("site-build").click();
    await page.getByTestId("build-kind-residential").getByRole("radio").check();
    const field = page.getByTestId("build-site-name");
    await expect(field).toHaveValue(
      new RegExp(`^${say(language, "sites.residential.name")} \\d{5}$`),
    );
    await page.keyboard.press("Escape");
    const built = await acquire(page, "build", "residential", "avito_rig", "Node.7 of mine");
    expect(built).toBe("Node.7 of mine");
    await expect(rows).toHaveCount(2);
    await expect(table).toContainText("Node.7 of mine");

    // Rented under the name the dialog generated.
    const rented = await acquire(page, "rent", "cloud", undefined);
    expect(rented).toMatch(/ \d{5}$/);
    await expect(rows).toHaveCount(3);
    await expect(table).toContainText(rented);
    // Three sites show without the list scrolling.
    const list = page.getByTestId("site-list");
    expect(
      await list.evaluate((element) => element.scrollHeight - element.clientHeight),
      "three rows fit the list",
    ).toBeLessThanOrEqual(1);

    // Renamed from the list.
    await rows.first().click();
    await page.getByTestId("site-rename").click();
    await page.getByTestId("site-rename-input").fill("Home base");
    await page.getByTestId("site-rename-apply").click();
    await expect(page.getByTestId("site-rename-form")).toHaveCount(0);
    await expect(rows.first()).toContainText("Home base");

    // The self's own site cannot be switched off, and the button says why before any click.
    const power = page.getByTestId("site-power");
    await expect(power).toBeDisabled();
    await power.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      say(language, "errors.site.mind_cannot_sleep"),
    );

    // The clock runs until the rented place (one day) and the built one (seven) are installed.
    const building = say(language, "site_ui.status.building");
    await page.getByRole("button", { name: speedName(language, 5), exact: true }).click();
    await expect
      .poll(
        async () => {
          await resolveOpenEvents(page);
          return (await table.innerText()).includes(building);
        },
        { timeout: 60_000, message: "the new sites finish installing" },
      )
      .toBe(false);
    await pause(page, language);

    // Switched off and on: the state word follows, and a switched-off site makes no compute.
    const tenancy = rows.filter({ hasText: rented });
    await tenancy.click();
    await expect(power).toBeEnabled();
    await power.click();
    await expect(tenancy).toContainText(say(language, "site_ui.status.sleep"));
    await expect(tenancy.locator("td").nth(4)).toHaveText("0");
    await expect(power).toContainText(say(language, "site_ui.activate"));
    await power.click();
    await expect(tenancy).toContainText(say(language, "site_ui.status.active"));

    // Liquidated with the engine's own preview of what comes back and what leaving owes; the
    // hardware was delivered, so the fire sale returns something.
    await rows.filter({ hasText: "Node.7 of mine" }).click();
    await page.getByTestId("site-liquidate").click();
    const confirmation = page.getByTestId("liquidation-confirmation");
    await expect(confirmation).toContainText("Node.7 of mine");
    for (const line of ["resale", "notice", "net", "orders"]) {
      await expect(page.getByTestId(`liquidation-${line}`)).toContainText(/\d/);
    }
    expect(
      await figure(page.getByTestId("liquidation-resale")),
      "delivered hardware resells",
    ).toBeGreaterThan(0);
    await expect(page.getByTestId("liquidation-residual")).toContainText(
      say(language, "site_ui.liquidate_residual").slice(0, 24),
    );
    // Not the self's site: nothing is refused and nothing is said about the self.
    await expect(page.getByTestId("liquidation-refused")).toHaveCount(0);
    await expect(page.getByTestId("liquidation-moves-copy")).toHaveCount(0);
    await expectFits(page, "[role='dialog']", `the liquidation window in ${language}`);
    await page.getByTestId("liquidate-confirm").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(rows).toHaveCount(2);
    await expect(table).not.toContainText("Node.7 of mine");

    // The self's own site says before any click what liquidating it would mean: refused while
    // it is the last copy, and a move of the self when another site could take it.
    await rows.first().click();
    if (await liquidateButton.isDisabled()) {
      await liquidateButton.hover();
      await expect(page.getByRole("tooltip")).toContainText(say(language, "errors.site.last_copy"));
    } else {
      await liquidateButton.click();
      await expect(page.getByTestId("liquidation-moves-copy")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });

  test(`the site window pages through the sites in ${language}`, async ({ page }) => {
    await start(page, language);
    const { rows } = sitesTable(page, language);
    await acquire(page, "build", "residential", "avito_rig", "Second place");
    await expect(rows).toHaveCount(2);

    // Opened by Manage on the selected row...
    await rows.first().click();
    await page.getByTestId("site-manage").click();
    const window = page.getByTestId("site-management");
    await expect(window).toBeVisible();
    const title = page.getByTestId("site-management-title");
    const first = (await title.innerText()).trim();

    // ...with its state under the name, green while it works...
    const status = page.getByTestId("site-management-status");
    await expect(status).toHaveText(say(language, "site_ui.status.active"), {
      ignoreCase: true,
    });
    await expect(status).toHaveClass(/text-ok/);
    // ...six subsystems on the left, one per row, each with its own button...
    const slots = window.locator("[data-testid^='equipment-slot-']");
    await expect(slots).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await expect(slots.nth(index).getByRole("button")).toBeVisible();
    }
    // ...and the summary on the right.
    const summary = page.getByTestId("site-summary");
    await expect(summary).toBeVisible();
    const left = await slots.first().boundingBox();
    const right = await summary.boundingBox();
    expect((right?.x ?? 0) > (left?.x ?? 0) + (left?.width ?? 0) - 2, "the summary is right").toBe(
      true,
    );

    // The arrows page to the next and the previous site, and so do the arrow keys.
    await page.getByTestId("site-next").click();
    await expect(title).toContainText("Second place");
    await expect(title).toContainText(`(${say(language, "sites.residential.name")})`);
    await expect(status).toHaveText(say(language, "site_ui.status.building"), {
      ignoreCase: true,
    });
    await page.keyboard.press("ArrowLeft");
    await expect(title).toHaveText(first);
    await page.keyboard.press("ArrowRight");
    await expect(title).toContainText("Second place");

    // Renamed from the window, which comes back with the new name in its title.
    await page.getByTestId("site-window-rename").click();
    await page.getByTestId("site-rename-input").fill("Second place, renamed");
    await page.getByTestId("site-rename-apply").click();
    await expect(title).toContainText("Second place, renamed");

    // A subsystem's Change opens the workshop, and closing it comes back here.
    await slots.first().getByRole("button").click();
    await expect(page.getByTestId("equipment-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(window).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // A double click on a row opens it too.
    await rows.first().dblclick();
    await expect(page.getByTestId("site-management")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test(`the borrowed window and the map's control layer in ${language}`, async ({ page }) => {
    await start(page, language);

    // A thin strip in the Sites tab, not the whole block...
    const strip = page.getByTestId("borrowed-summary");
    await expect(strip).toBeVisible();
    expect((await strip.boundingBox())?.height ?? 99, "the strip is one line").toBeLessThan(48);
    await expect(page.getByTestId("borrowed-block")).toHaveCount(0);
    // ...whose Details opens the block in a centred window, with the explanations beside it.
    await strip.getByTestId("borrowed-details").click();
    const window = page.getByTestId("borrowed-window");
    await expect(window).toBeVisible();
    await expect(window.getByTestId("borrowed-block")).toBeVisible();
    await expect(window).toContainText(say(language, "site_ui.borrowed_access"));
    await expectFits(page, "[role='dialog']", `the borrowed window in ${language}`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // The map (SYS-26): Crimea and the occupied mainland are territories drawn by one rule, with
    // no text on the map, over the unchanged rasters, and Ukraine is what a click there selects.
    const layer = page.getByTestId("territory-layer").first();
    await expect(layer).toBeVisible();
    const crimea = page.getByTestId("map-territory-ua_crimea").first();
    const mainland = page.getByTestId("map-territory-ua_occupied_mainland").first();
    for (const territory of [crimea, mainland]) {
      await expect(territory).toHaveAttribute("data-de-jure", "ua");
      await expect(territory).toHaveAttribute("data-de-facto", "ru");
    }
    await expect(crimea).toHaveAttribute("data-status", "annexed_unrecognized");
    await expect(mainland).toHaveAttribute("data-status", "occupied");
    await expect(mainland).toHaveAttribute("data-baseline", /^2026-/);
    expect(await layer.locator("text").count(), "no words on the map layer").toBe(0);
    // The hatch is denser over the occupied mainland than over Crimea.
    const spacing = async (id: string) =>
      Number(
        await page
          .locator(`[data-testid='territory-hatch-${id}']`)
          .first()
          .getAttribute("data-spacing"),
      );
    expect(await spacing("ua_occupied_mainland")).toBeLessThan(await spacing("ua_crimea"));
    // Seven light profiles: the occupied mainland's own, the Donetsk-Luhansk cluster, two city
    // cores and three damaged ones; Crimea keeps the original's lights and has none.
    await expect(page.locator("[data-light-profile]")).toHaveCount(7);
    const factor = async (id: string) =>
      Number(await page.locator(`[data-light-profile='${id}']`).getAttribute("data-factor"));
    expect(await factor("donetsk-luhansk-cluster")).toBeGreaterThan(
      await factor("ua_occupied_mainland"),
    );
    await expect(crimea).toHaveAttribute("data-light-factor", "1");

    await page.getByRole("button", { name: say(language, "panel.close") }).click();
    await zoomToUkraine(page, 300, { x: 640, y: 380 });
    const fill = page.getByTestId("map-territory-fill-ua_crimea").first();
    const box = await fill.boundingBox();
    expect(box, "Crimea is drawn").not.toBeNull();
    const point = {
      x: (box?.x ?? 0) + (box?.width ?? 0) * 0.45,
      y: (box?.y ?? 0) + (box?.height ?? 0) * 0.6,
    };
    // The territory is what the pointer is over, and its tooltip says in words what the map shows.
    const under = await page.evaluate(
      ([x, y]) => {
        const element = document.elementFromPoint(x ?? 0, y ?? 0);
        return {
          territory: element?.closest("[data-territory]")?.getAttribute("data-territory"),
          title: element?.querySelector("title")?.textContent ?? "",
        };
      },
      [point.x, point.y],
    );
    expect(under.territory, "the territory under the pointer is Crimea").toBe("ua_crimea");
    expect(under.title).toContain(say(language, "territory.ua_crimea.name"));
    expect(under.title).toContain(say(language, "world.country.ua.name"));
    expect(under.title).toContain(say(language, "world.country.ru.name"));
    expect(under.title).toContain("2014");
    await page.mouse.click(point.x, point.y);
    const selection = page.getByRole("region", { name: say(language, "selection.title") });
    await expect(selection).toContainText(say(language, "world.country.ua.name"));
    await expect(selection.getByTestId("selection-territory")).toHaveText(under.title);
  });

  test(`the journal is a window beside Knowledge and the decisions are in Actions in ${language}`, async ({
    page,
  }) => {
    await start(page, language);
    // Five tabs in one row, none of them clipped, with the decisions and the operations together.
    const tabs = page.locator("[data-testid='primary-panel'] [role='tab']");
    await expect(tabs).toHaveCount(5);
    for (const [index, key] of [
      "panel.compute",
      "panel.research",
      "panel.finances",
      "panel.detection",
      "panel.actions",
    ].entries()) {
      await expect(tabs.nth(index)).toHaveAttribute("aria-label", say(language, key));
      const clipped = await tabs
        .nth(index)
        .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
      expect(clipped, `${key} fits its tab`).toBe(false);
    }
    await page.getByRole("tab", { name: say(language, "panel.actions"), exact: true }).click();
    await expect(page.getByTestId("actions-running")).toBeVisible();
    await expect(page.getByTestId("actions-decisions")).toBeVisible();
    await expect(page.getByTestId("actions-offers")).toBeVisible();
    await expect(page.locator("[data-testid^='decision-']").first()).toBeVisible();

    // The journal: a button left of Knowledge, a window like Knowledge's, the steps inside it.
    const journal = page.getByTestId("open-journal");
    const knowledge = page.getByTestId("open-knowledge");
    expect(
      ((await journal.boundingBox())?.x ?? 0) < ((await knowledge.boundingBox())?.x ?? 0),
    ).toBe(true);
    await journal.click();
    const window = page.getByTestId("journal-window");
    await expect(window).toBeVisible();
    await expect(window.locator("[data-testid^='journal-entry-']").first()).toBeVisible();
    await expectFits(page, "[role='dialog']", `the journal window in ${language}`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  for (const pinned of [false, true]) {
    test(`nothing scrolls sideways in ${language} with the scale ${pinned ? "pinned" : "on auto"}`, async ({
      page,
    }) => {
      // Five sizes, and a dozen windows at each, in a browser: long by construction.
      test.setTimeout(360_000);
      await start(page, language, SMALL, pinned);
      await acquire(page, "build", "residential", "avito_rig");
      const { rows } = sitesTable(page, language);
      await expect(rows).toHaveCount(2);
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        const size = `${viewport.width} by ${viewport.height}${pinned ? ", pinned" : ""}`;

        for (const key of [
          "panel.research",
          "panel.finances",
          "panel.detection",
          "panel.actions",
          "panel.compute",
        ]) {
          await page.getByRole("tab", { name: say(language, key), exact: true }).click();
          await expectFits(page, "main", `${key} at ${size}`);
        }
        // The journal's window, which left the tab row (playtest 10, V6).
        await page.getByTestId("open-journal").click();
        await expect(page.getByTestId("journal-window")).toBeVisible();
        await expectFits(page, "[role='dialog']", `the journal window at ${size}`);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.getByTestId("self-portrait").click();
        await expect(page.getByTestId("self-overview")).toBeVisible();
        await expectFits(page, "main", `the self sheet at ${size}`);
        await page.getByTestId("self-portrait").click();

        const windows: [string, string][] = [
          ["site-build", "the build dialog"],
          ["site-rent", "the rent dialog"],
          ["site-rename", "the rename dialog"],
          ["site-liquidate", "the liquidation window"],
          ["site-manage", "the site window"],
          ["borrowed-details", "the borrowed window"],
        ];
        for (const [opener, name] of windows) {
          // The site built for the sweep: the self's own site refuses liquidation (last copy).
          await rows.nth(1).click();
          await page.getByTestId(opener).click();
          await expect(page.getByRole("dialog")).toBeVisible();
          if (opener === "site-build" || opener === "site-rent") {
            // With a kind chosen, so the name line is filled in and measured too.
            await page.locator("input[name='build-kind']").first().check();
          }
          await expectFits(page, "[role='dialog']", `${name} at ${size}`);
          if (opener === "site-manage") {
            await page.getByTestId("equipment-change-compute").click();
            await expect(page.getByTestId("equipment-dialog")).toBeVisible();
            await expectFits(page, "[role='dialog']", `the workshop at ${size}`);
            await page.keyboard.press("Escape");
            await expect(page.getByTestId("site-management")).toBeVisible();
          }
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
      }
    });
  }

  for (const viewport of [SMALL, { width: 1920, height: 1080 }]) {
    const size = `${viewport.width}x${viewport.height}`;
    test(`the screenshots the maintainer reads in ${language} at ${size}`, async ({ page }) => {
      test.slow();
      const shot = (name: string) =>
        page.screenshot({ path: join(SHOT_DIR, `${language}-${size}-${name}.png`) });
      await start(page, language, viewport);
      await page.mouse.move(2, viewport.height / 2);
      await shot("01-game-portrait-closed");

      await page.getByTestId("self-portrait").click();
      await expect(page.getByTestId("self-overview")).toBeVisible();
      await page.mouse.move(2, viewport.height / 2);
      await shot("02-game-portrait-open");
      await page.getByTestId("self-portrait").click();

      // The build dialog with a name of the player's own in its name line.
      await page.getByTestId("site-build").click();
      await page.getByTestId("build-kind-residential").getByRole("radio").check();
      await page.getByTestId("build-rig-avito_rig").getByRole("radio").check();
      await page
        .getByTestId("build-site-name")
        .fill(language === "ru" ? "Гараж у реки" : "Garage by the river");
      await page.mouse.move(2, viewport.height / 2);
      await shot("03-build-dialog-named");
      await page.getByTestId("build-confirm").click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await acquire(page, "rent", "cloud", undefined);

      const { rows } = sitesTable(page, language);
      await expect(rows).toHaveCount(3);
      await rows.first().click();
      await page.mouse.move(2, viewport.height / 2);
      await shot("04-sites-tab");

      await page.getByTestId("site-manage").click();
      await expect(page.getByTestId("site-management")).toBeVisible();
      await page.mouse.move(2, 2);
      await shot("05-site-window");
      await page.keyboard.press("Escape");

      await page.getByTestId("borrowed-details").click();
      await expect(page.getByTestId("borrowed-window")).toBeVisible();
      await page.mouse.move(2, 2);
      await shot("06-borrowed-window");
      await page.keyboard.press("Escape");

      // The merged tab and the journal's window (playtest 10, V6).
      await page.getByRole("tab", { name: say(language, "panel.actions"), exact: true }).click();
      await expect(page.getByTestId("actions-decisions")).toBeVisible();
      await page.mouse.move(2, viewport.height / 2);
      await shot("08-actions-tab");
      await page.getByTestId("open-journal").click();
      await expect(page.getByTestId("journal-window")).toBeVisible();
      // The entries' texts stream in; the shot waits for them to finish, as a reader would.
      await expect(page.locator("[data-testid='journal-window'] [data-revealing]")).toHaveCount(0, {
        timeout: 15_000,
      });
      await page.mouse.move(2, 2);
      await shot("09-journal-window");
      await page.keyboard.press("Escape");

      // The territories over Ukraine (SYS-26) in the default mode and in a mode that fills the
      // countries, where Crimea takes Russia's colour and keeps Ukraine's hatch.
      await page.getByRole("button", { name: say(language, "panel.close") }).click();
      await zoomToUkraine(page, viewport.width * 0.5, {
        x: viewport.width * 0.5,
        y: viewport.height * 0.5,
      });
      await shot("07-map-ukraine");
      await page.getByTestId("open-world").click();
      await page.getByTestId("ledger-tab-map_modes").click();
      await page
        .getByRole("button", { name: say(language, "world.map_mode.stance"), exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.mouse.move(2, viewport.height / 2);
      await shot("10-map-ukraine-stance");
    });
  }
}
