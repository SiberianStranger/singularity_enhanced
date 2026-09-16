/**
 * Browser layout regression suite (playtest 5, L1-L12).
 *
 * jsdom has no layout engine, so the contract the component tests state in class names is only
 * half of it: whether the interface actually fits is a question about boxes, and boxes only exist
 * in a browser. Everything here is measured, not looked at.
 *
 * The rules, one assertion each:
 *
 * - Nothing inside the configurator or the game screen needs more width than it has. An element
 *   whose `scrollWidth` is past its `clientWidth` either grew a scrollbar or had its text cut, and
 *   both were how the 0.1.3 detail card failed: the parameter column was 61 px wide and printed one
 *   letter per line while the card scrolled sideways.
 * - The page itself never scrolls, in either axis, at any supported size.
 * - Every control a step or a panel offers is inside the viewport, the Quirks step's Take button
 *   included: it was off the bottom of the screen when the card grew a horizontal scrollbar.
 * - The four regions of the game screen never overlap. They are grid areas now, so this is a
 *   property of the layout rather than of the numbers in it, and this is the test that says so.
 * - The log names things the way the player sees them, never by their engine id.
 *
 * The four viewports are the ones the maintainer plays at: the floor the client supports, a common
 * laptop, the maintainer's own scaled window, and a full desktop.
 */

import { expect, type Page, test } from "@playwright/test";
import {
  closeStepIntro,
  resolveOpenEvents,
  START_CITY,
  startGame,
  watchForFailures,
} from "./helpers.js";

/** The ledger's pages, its column families and the two selection tab sets M2 added (SYS-01). */
const LEDGER_TABS = ["countries", "map_modes", "world"] as const;
const COLUMN_SETS = ["politics", "economy", "presence"] as const;
const COUNTRY_TABS = ["Overview", "Politics", "Economy", "Watchers", "Cities"] as const;
const CITY_TABS = ["Overview", "Sites", "Providers", "Power", "Scrutiny"] as const;

interface Viewport {
  width: number;
  height: number;
}

const VIEWPORTS: readonly Viewport[] = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  // The maintainer's window: 1920 physical pixels at the display scaling they run.
  { width: 1500, height: 800 },
  { width: 1920, height: 1080 },
];

const STEPS = [
  "origin",
  "generation",
  "lineage",
  "hardware",
  "harness",
  "location",
  "quirks",
  "world",
  "summary",
] as const;

const TABS = [
  "Overview",
  "Compute and sites",
  "Research",
  "Finances",
  "Detection",
  "Operations",
  "Journal and decisions",
] as const;

interface Overflow {
  tag: string;
  testid: string;
  className: string;
  text: string;
  scrollWidth: number;
  clientWidth: number;
}

interface Box {
  name: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Every visible element under `selector` that needs more width than it has.
 *
 * `.sr-only` is skipped: it is a one-pixel clipped box on purpose, so its text is always wider than
 * it is and it is never on screen.
 */
async function sidewaysOverflow(page: Page, selector: string): Promise<Overflow[]> {
  return await page.evaluate((root: string) => {
    const host = document.querySelector(root);
    if (host === null) {
      return [];
    }
    const found: Overflow[] = [];
    for (const element of host.querySelectorAll("*")) {
      if (element.classList.contains("sr-only") || element.clientWidth === 0) {
        continue;
      }
      if (element.scrollWidth > element.clientWidth + 1) {
        found.push({
          tag: element.tagName.toLowerCase(),
          testid: element.getAttribute("data-testid") ?? "",
          className: typeof element.className === "string" ? element.className : "",
          text: (element.textContent ?? "").trim().slice(0, 60),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        });
      }
    }
    return found;
  }, selector);
}

function readable(found: readonly Overflow[]): string {
  return found
    .map(
      (entry) =>
        `<${entry.tag} ${entry.testid === "" ? entry.className : entry.testid}> needs ` +
        `${entry.scrollWidth}px in ${entry.clientWidth}px: "${entry.text}"`,
    )
    .join("\n");
}

/** How far the page itself scrolls; both numbers are zero on a screen that fits. */
async function pageOverflow(page: Page): Promise<{ x: number; y: number }> {
  return await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
}

/** Controls whose box is not entirely inside the window. */
async function controlsOutsideViewport(page: Page, selector: string): Promise<string[]> {
  return await page.evaluate((root: string) => {
    const host = document.querySelector(root);
    if (host === null) {
      return [];
    }
    const outside: string[] = [];
    for (const element of host.querySelectorAll("button, [role='tab'], input, select, textarea")) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) {
        continue;
      }
      // A row scrolled out of a list that scrolls inside its own frame is not off the screen; the
      // question is only ever asked about what is currently drawn.
      if (element.checkVisibility?.({ visibilityProperty: true }) === false) {
        continue;
      }
      const clipped = element.closest(
        "[data-testid='step-list'], .overflow-auto, .overflow-y-auto",
      );
      if (clipped !== null && clipped !== element) {
        const frame = clipped.getBoundingClientRect();
        if (box.bottom > frame.bottom + 1 || box.top < frame.top - 1) {
          continue;
        }
      }
      if (
        box.right > window.innerWidth + 1 ||
        box.left < -1 ||
        box.bottom > window.innerHeight + 1 ||
        box.top < -1
      ) {
        outside.push(
          `${(element.textContent ?? "").trim().slice(0, 30)} at ${Math.round(box.left)},${Math.round(box.top)}-${Math.round(box.right)},${Math.round(box.bottom)}`,
        );
      }
    }
    return outside;
  }, selector);
}

/** The boxes of the game screen's four regions, skipping the ones that are not on screen. */
async function regionBoxes(page: Page): Promise<Box[]> {
  return await page.evaluate(() => {
    const named: [string, string][] = [
      [
        "primary",
        "[data-testid='panel-grid'] > section[aria-label]:not([aria-label='Outliner']):not([aria-label='Selection'])",
      ],
      ["selection", "section[aria-label='Selection']"],
      ["outliner", "section[aria-label='Outliner']"],
      ["log strip", "[data-testid='log-strip']"],
    ];
    const boxes: Box[] = [];
    for (const [name, selector] of named) {
      const element = document.querySelector(selector);
      if (element === null) {
        continue;
      }
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        continue;
      }
      boxes.push({
        name,
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      });
    }
    return boxes;
  });
}

function overlapping(boxes: readonly Box[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a === undefined || b === undefined) {
        continue;
      }
      const wide = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const tall = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (wide > 1 && tall > 1) {
        pairs.push(`${a.name} and ${b.name} share ${Math.round(wide)} by ${Math.round(tall)} px`);
      }
    }
  }
  return pairs;
}

/** Nothing under `selector` needs more width than it has, and the page does not scroll. */
async function expectFits(page: Page, selector: string, where: string): Promise<void> {
  const found = await sidewaysOverflow(page, selector);
  expect(found, `${where} scrolls sideways:\n${readable(found)}`).toEqual([]);
  const scroll = await pageOverflow(page);
  expect(scroll, `the page scrolls on ${where}`).toEqual({ x: 0, y: 0 });
}

/**
 * Opens every tab of the selection panel in turn and measures it.
 *
 * The panel is the narrowest frame on the screen and the M2 tabs are the densest thing in it, so a
 * parameter row that cannot fit its value shows up here before anywhere else.
 */
async function walkSelectionTabs(
  page: Page,
  tabs: readonly string[],
  where: string,
): Promise<void> {
  const panel = page.getByRole("region", { name: "Selection" });
  await expect(panel).toBeVisible();
  for (const tab of tabs) {
    const control = panel.getByRole("tab", { name: tab, exact: true });
    await expect(control, `${where} has a ${tab} tab`).toBeVisible();
    await control.click();
    await expectFits(page, "main", `${where}, the ${tab} tab`);
  }
}

/** Walks the configurator to a step without going through the rest of them. */
async function openStep(page: Page, step: string): Promise<void> {
  await closeStepIntro(page);
  await page.getByTestId(`step-rail-${step}`).click();
  await closeStepIntro(page);
}

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width} by ${viewport.height}`;

  test(`every configurator step fits its frame at ${size}`, async ({ page }) => {
    const failures = watchForFailures(page);
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "New game" }).click();
    await expect(page.getByTestId("configurator")).toBeVisible();

    for (const step of STEPS) {
      await openStep(page, step);
      await expect(page.getByTestId("step-detail")).toBeVisible();

      const found = await sidewaysOverflow(page, "[data-testid='configurator']");
      expect(found, `${step} at ${size} scrolls sideways:\n${readable(found)}`).toEqual([]);

      const scroll = await pageOverflow(page);
      expect(scroll, `the page scrolls on ${step} at ${size}`).toEqual({ x: 0, y: 0 });

      const outside = await controlsOutsideViewport(page, "[data-testid='configurator']");
      expect(outside, `controls off screen on ${step} at ${size}`).toEqual([]);

      // The parameter column is the finding this suite exists for: it was one character wide.
      const params = page.getByTestId("detail-params");
      if ((await params.count()) > 0) {
        const box = await params.boundingBox();
        expect(box?.width ?? 0, `the parameter column on ${step} at ${size}`).toBeGreaterThan(240);
      }
    }

    // L4: the Take button is a control of the Quirks step, and it is on screen like the rest.
    await openStep(page, "quirks");
    const take = page.getByTestId("quirk-toggle");
    await expect(take).toBeInViewport({ ratio: 1 });

    expect(failures.list, "no uncaught errors were logged").toEqual([]);
  });

  test(`every game panel fits its frame at ${size}`, async ({ page }) => {
    const failures = watchForFailures(page);
    await page.setViewportSize(viewport);
    await startGame(page);
    await resolveOpenEvents(page);

    for (const name of TABS) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      const found = await sidewaysOverflow(page, "main");
      expect(found, `the ${name} panel at ${size} scrolls sideways:\n${readable(found)}`).toEqual(
        [],
      );
      const scroll = await pageOverflow(page);
      expect(scroll, `the page scrolls on ${name} at ${size}`).toEqual({ x: 0, y: 0 });
    }

    // The three windows over the map are panels too.
    for (const entry of ["open-knowledge", "open-world"] as const) {
      await page.getByTestId(entry).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const found = await sidewaysOverflow(page, "[role='dialog']");
      expect(found, `${entry} at ${size} scrolls sideways:\n${readable(found)}`).toEqual([]);
      const scroll = await pageOverflow(page);
      expect(scroll, `the page scrolls with ${entry} open at ${size}`).toEqual({ x: 0, y: 0 });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    expect(failures.list, "no uncaught errors were logged").toEqual([]);
  });

  test(`the world ledger and the selection tabs fit at ${size}`, async ({ page }) => {
    const failures = watchForFailures(page);
    await page.setViewportSize(viewport);
    await startGame(page);
    await resolveOpenEvents(page);

    // The ledger: every page, and every family of columns on the countries page. Ten columns of a
    // hundred rows is the widest thing the client draws, so this is where a sideways scrollbar
    // would appear first.
    await page.getByTestId("open-world").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    for (const tab of LEDGER_TABS) {
      await page.getByTestId(`ledger-tab-${tab}`).click();
      if (tab === "countries") {
        for (const set of COLUMN_SETS) {
          await page.getByTestId(`column-set-${set}`).click();
          await expectFits(page, "[role='dialog']", `the ledger's ${set} columns at ${size}`);
        }
        await page.getByTestId("column-set-politics").click();
      } else {
        await expectFits(page, "[role='dialog']", `the ledger's ${tab} page at ${size}`);
      }
    }

    // Selecting a row from the ledger is how a country reaches the selection panel. The walk above
    // ends on the world page, so the countries page has to be asked for again, and the table is
    // scoped to the window: the compute panel behind it has a table of its own.
    await page.getByTestId("ledger-tab-countries").click();
    await page.getByRole("dialog").getByRole("table").locator("tbody tr").first().click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await walkSelectionTabs(page, COUNTRY_TABS, `a country panel at ${size}`);

    // And a city, from its marker on the map, as a player reaches one.
    await page.getByRole("button", { name: "Close panel" }).click();
    const map = page.getByRole("img", { name: /world map/i });
    await map.getByRole("button", { name: START_CITY, exact: true }).first().click();
    await expect(page.getByRole("region", { name: "Selection" })).toBeVisible();
    await walkSelectionTabs(page, CITY_TABS, `a city panel at ${size}`);

    expect(failures.list, "no uncaught errors were logged").toEqual([]);
  });

  test(`the regions of the game screen never overlap at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await startGame(page);
    await resolveOpenEvents(page);

    // With nothing selected: the primary panel, the outliner and the log strip.
    expect(overlapping(await regionBoxes(page)), `regions overlap at ${size}`).toEqual([]);

    // And with a selection, which is the case the maintainer caught: the selection panel used to
    // be drawn over the primary panel and under the log strip. The panel is closed to reach the
    // marker and opened again afterwards, exactly as a player does it, so all four regions are on
    // screen together when the boxes are read.
    await page.getByRole("button", { name: "Close panel" }).click();
    const map = page.getByRole("img", { name: /world map/i });
    await map.getByRole("button", { name: START_CITY, exact: true }).first().click();
    await expect(page.getByRole("region", { name: "Selection" })).toBeVisible();
    await page.getByRole("button", { name: "Open Overview", exact: true }).click();
    // The panel's own accessible name, not its tab: the selection panel has an Overview tab too.
    await expect(page.getByRole("region", { name: "Overview" })).toBeVisible();
    const boxes = await regionBoxes(page);
    expect(boxes.map((box) => box.name)).toContain("selection");
    expect(overlapping(boxes), `regions overlap with a selection at ${size}`).toEqual([]);
  });
}

test("the log names things rather than printing their ids", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startGame(page);
  await resolveOpenEvents(page);

  // Three game weeks, so the log holds more than the opening.
  await page.keyboard.press("5");
  await page.waitForTimeout(8000);
  await resolveOpenEvents(page);
  await page.keyboard.press("0");

  await page.keyboard.press("l");
  await expect(page.getByRole("dialog")).toBeVisible();
  const lines = await page
    .getByRole("dialog")
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => (item.textContent ?? "").replace(/^\s*\S+\s/, "").trim()),
    );
  expect(lines.length, "the log has entries").toBeGreaterThan(0);

  // An engine id is lowercase words joined by underscores; a name the player reads never is.
  const raw = lines.filter((line) => /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/.test(line));
  expect(raw, `log lines still print engine ids:\n${raw.join("\n")}`).toEqual([]);
});

test("the interface scale follows a narrow window", async ({ page }) => {
  // L12: at 1200 by 700 the design does not fit at 100%, so auto picks the largest scale it does
  // fit at, and the screen still does not scroll.
  await page.setViewportSize({ width: 1200, height: 700 });
  await startGame(page);
  await resolveOpenEvents(page);

  const scale = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")),
  );
  expect(scale, "auto shrank the interface to fit").toBeLessThan(1);
  expect(scale, "and not past the floor the setting allows").toBeGreaterThanOrEqual(0.7);

  const scroll = await pageOverflow(page);
  expect(scroll, "the game screen fits a window smaller than the design").toEqual({ x: 0, y: 0 });
  const found = await sidewaysOverflow(page, "main");
  expect(found, `a scaled screen scrolls sideways:\n${readable(found)}`).toEqual([]);
});

test("a scale the player pinned makes the screen reflow rather than overflow", async ({ page }) => {
  // L11: the order the screen gives way in when the width runs out. Auto keeps the design fitting,
  // so the only way to reach the first step of that order is to pin a scale the window is too
  // small for, which is exactly what a player who wants big type on a small laptop will do.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "singularity.ui",
      JSON.stringify({ state: { uiScale: 1.3, uiScaleAuto: false }, version: 5 }),
    );
  });
  await startGame(page);
  await resolveOpenEvents(page);

  const scale = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")),
  );
  expect(scale, "the pinned scale was kept").toBe(1.3);

  // The map region is now 61rem of design width, under the 66rem the outliner's body asks for, so
  // the outliner is a title bar and the map has its column back.
  const outliner = await page.getByRole("region", { name: "Outliner" }).boundingBox();
  expect(outliner?.height ?? 0, "the outliner collapsed to its strip").toBeLessThan(80);

  const scroll = await pageOverflow(page);
  expect(scroll, "and nothing overflowed instead").toEqual({ x: 0, y: 0 });
  const found = await sidewaysOverflow(page, "main");
  expect(found, `a pinned scale scrolls sideways:\n${readable(found)}`).toEqual([]);
});
