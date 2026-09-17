/**
 * The client in Russian at the minimum supported viewport (SYS-14, `docs/design/14-i18n-ru.md`).
 *
 * Russian runs 15 to 40 percent longer than English and swells most on exactly the short labels the
 * style guide puts in fixed slots, so "every screen fits 1366 by 768" (ui-style-guide rule 11) is a
 * claim that has to be made again per language. This walks the same fixed start the smoke suite
 * uses and asserts two things on each screen: the page never scrolls, and nothing visible is
 * clipped or spilling out of its box.
 */

import { expect, type Page, test } from "@playwright/test";
import { isoDate, passOpening, resolveOpenEvents, SMALL_SCREEN, setupString } from "./helpers.js";

/** Visible elements whose text does not fit the box it is drawn in. */
async function clipped(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>("main *, header *, aside *"),
    )) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        continue;
      }
      if (el.classList.contains("sr-only") || el.closest(".sr-only") !== null) {
        continue;
      }
      const text = (el.innerText ?? "").trim();
      // Prose is allowed to scroll inside its own frame; a label in a fixed slot is not.
      if (text === "" || text.length > 120) {
        continue;
      }
      // An element with `truncate` has declared that it shrinks to fit, so an ellipsis there is
      // the design working. Everything else that does not fit is a bug the language exposed.
      if (el.classList.contains("truncate")) {
        continue;
      }
      const leaf = el.querySelectorAll("*").length === 0;
      const clips =
        el.scrollWidth > el.clientWidth + 1 &&
        (style.textOverflow === "ellipsis" || style.overflowX === "hidden");
      const spills = leaf && el.scrollWidth > el.clientWidth + 1 && style.overflowX === "visible";
      if (clips || spills) {
        out.push(`${el.tagName.toLowerCase()} "${text.slice(0, 60)}"`);
      }
    }
    return [...new Set(out)];
  });
}

async function check(page: Page, where: string): Promise<void> {
  const overflow = await page.evaluate(() => ({
    x: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    y: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
  expect(overflow, `${where} fits 1366 by 768`).toEqual({ x: 0, y: 0 });
  expect(await clipped(page), `${where} clips no label`).toEqual([]);
}

/** The explanation window each step opens with, closed by its Russian button. */
async function closeIntro(page: Page): Promise<void> {
  const intro = page.getByTestId("config-intro");
  for (let guard = 0; guard < 3 && (await intro.count()) > 0; guard += 1) {
    await page.getByRole("button", { name: "Понятно", exact: true }).click();
    await expect(intro).toHaveCount(0);
  }
}

test("Russian fits the smallest supported screen", async ({ page }) => {
  await page.setViewportSize(SMALL_SCREEN);
  // The language is a persisted setting, so seeding the store is what a returning player does.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "singularity.ui",
      JSON.stringify({ state: { language: "ru" }, version: 0 }),
    );
  });
  await page.goto("/");

  const newGame = page.getByRole("button", { name: "Новая игра" });
  await expect(newGame).toBeVisible();
  expect(await page.getAttribute("html", "lang")).toBe("ru");
  await check(page, "the main menu");

  await newGame.click();
  await closeIntro(page);
  await check(page, "the configurator");

  for (const step of ["origin", "hardware", "location", "quirks", "summary"]) {
    await page.getByTestId(`step-rail-${step}`).click();
    await expect(page.getByTestId(`step-rail-${step}`)).toHaveAttribute("aria-current", "step");
    await closeIntro(page);
    await check(page, `the ${step} step`);
  }

  /*
   * The rail by its accelerators (playtest 6, X13). The Russian rail underlines a Cyrillic letter
   * of the Russian word, and a press reaches it either way round: by the letter itself on a
   * Cyrillic layout, or by the physical key that letter sits on. Playwright types on a US
   * keyboard, so this walk is the second path, which is the one a player on a Latin layout uses:
   * KeyG is where П of "Происхождение" lives, KeyP where З of "Железо" does, and so on.
   */
  for (const [step, code] of [
    ["origin", "KeyG"],
    ["hardware", "KeyP"],
    ["harness", "KeyJ"],
    ["location", "KeyV"],
    ["quirks", "KeyC"],
    ["world", "KeyB"],
    ["summary", "KeyU"],
  ] as const) {
    if ((await page.getByTestId("config-intro").count()) > 0) {
      // Т of "поняТно" sits on KeyN.
      await page.keyboard.press("KeyN");
      await expect(page.getByTestId("config-intro")).toHaveCount(0);
    }
    await page.keyboard.press(code);
    await expect(
      page.getByTestId(`step-rail-${step}`),
      `${code} opens the ${step} step in Russian`,
    ).toHaveAttribute("aria-current", "step");
    await check(page, `the ${step} step, reached by its letter`);
  }
  await closeIntro(page);
  await page.getByTestId("step-rail-summary").click();
  await closeIntro(page);

  // And no label carries the "(O)" the Latin accelerators used to be printed as.
  const labels = await page.locator("[data-hotkey]").allInnerTexts();
  expect(
    labels.filter((label) => /\s\([A-ZА-ЯЁ]\)\s*$/.test(label.trim())),
    "no Russian label ends in a bracketed Latin letter",
  ).toEqual([]);

  await page.getByLabel(/Вставить строку настройки/).fill(setupString());
  await page.getByRole("button", { name: /Загрузить настройку/ }).click();
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  await passOpening(page, "escape");
  expect(await isoDate(page)).toBe("2027-01-01");
  await resolveOpenEvents(page);
  await check(page, "the game screen");

  // The compute panel is the widest one (playtest 3, R4) and the first to break at this width.
  // В of "Вычисления и площадки" sits on KeyD.
  await page.keyboard.press("KeyD");
  await expect(page.getByRole("region", { name: "Вычисления и площадки" })).toBeVisible();
  await check(page, "the compute panel");

  /*
   * The world ledger is the widest window the client draws (SYS-01 M2 contract): ten columns of a
   * hundred rows, with Russian headers that are half again as long as the English ones. Every page
   * and every family of columns is measured, because a header that does not fit is where this
   * language breaks a table first.
   */
  // М of "Мир" sits on KeyV.
  await page.keyboard.press("KeyV");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (const tab of ["countries", "map_modes", "world"]) {
    await page.getByTestId(`ledger-tab-${tab}`).click();
    if (tab === "countries") {
      for (const set of ["politics", "economy", "presence"]) {
        await page.getByTestId(`column-set-${set}`).click();
        await check(page, `the ledger's ${set} columns in Russian`);
      }
    } else {
      await check(page, `the ledger's ${tab} page in Russian`);
    }
  }

  // And a country panel, reached the way the ledger offers it: by clicking a row.
  await page.getByTestId("ledger-tab-countries").click();
  // Scoped to the window: the compute panel behind it has a table of its own.
  await page.getByRole("dialog").getByRole("table").locator("tbody tr").first().click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const selection = page.getByRole("region", { name: "Выбор" });
  await expect(selection).toBeVisible();
  for (const tab of ["Обзор", "Политика", "Экономика", "Наблюдатели", "Города"]) {
    await selection.getByRole("tab", { name: tab, exact: true }).click();
    await check(page, `the country panel's ${tab} tab in Russian`);
  }
});
