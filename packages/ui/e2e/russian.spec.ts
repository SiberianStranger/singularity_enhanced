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

  await page.getByLabel(/Вставить строку настройки/).fill(setupString());
  await page.getByRole("button", { name: /Загрузить настройку/ }).click();
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(page.getByTestId("game-date")).toBeVisible();
  await passOpening(page, "escape");
  expect(await isoDate(page)).toBe("2027-01-01");
  await resolveOpenEvents(page);
  await check(page, "the game screen");

  // The compute panel is the widest one (playtest 3, R4) and the first to break at this width.
  await page.keyboard.press("c");
  await expect(page.getByRole("region", { name: "Вычисления и площадки" })).toBeVisible();
  await check(page, "the compute panel");
});
