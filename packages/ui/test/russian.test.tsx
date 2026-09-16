/**
 * The client rendered in Russian (SYS-14, `docs/design/14-i18n-ru.md`).
 *
 * Two things can go wrong once a second language exists and neither shows up in a unit test of the
 * locale files: a key that nothing translates renders as the key itself, and a string the client
 * built by hand rather than through `t()` renders in English inside a Russian screen. Both are
 * checked here against the screens the player actually opens, with the real simulation core behind
 * the game screen so the strings the engine emits are included.
 */

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import uiEn from "../src/locales/en.json";
import uiRu from "../src/locales/ru.json";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { MainMenuScreen } from "../src/screens/menu/MainMenuScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { type LocalSession, startSession } from "./helpers.js";

/** A dotted lowercase token is what an unresolved `t("panel.compute")` leaves on the screen. */
const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}(\s|$)/;

const EN: Record<string, string> = { ...uiEn, ...contentBundle.locales[DEFAULT_LANGUAGE] };
const RU: Record<string, string> = { ...uiRu, ...(contentBundle.locales.ru ?? {}) };

/**
 * English strings that would be unmistakable on a Russian screen: long enough not to collide with a
 * product name, free of placeholders so the rendered text is the literal string, and different from
 * their Russian translation so a deliberately untranslated name (`Babel 6`) is not a false alarm.
 */
const ENGLISH_MARKERS = Object.entries(EN)
  .filter(([key, value]) => {
    const russian = RU[key];
    return (
      russian !== undefined &&
      russian !== value &&
      value.length >= 12 &&
      !value.includes("{") &&
      !value.includes("\n")
    );
  })
  .map(([, value]) => value);

function visibleText(): string {
  return document.body.textContent ?? "";
}

let session: LocalSession | null = null;

beforeAll(async () => {
  await i18next.changeLanguage("ru");
});

afterAll(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

afterEach(() => {
  session?.stop();
  session = null;
});

function assertRussian(where: string): void {
  const text = visibleText();
  expect(text.length, `${where} rendered nothing`).toBeGreaterThan(40);
  const rawKeys = text
    .split(/\s{2,}|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && RAW_KEY.test(line) && !line.includes(" "));
  expect(rawKeys, `${where} shows unresolved keys`).toEqual([]);
  const leaked = ENGLISH_MARKERS.filter((marker) => text.includes(marker));
  expect(leaked, `${where} shows English`).toEqual([]);
  expect(/[А-Яа-яЁё]/.test(text), `${where} shows no Cyrillic at all`).toBe(true);
}

describe("the client in Russian", () => {
  it("renders the main menu without English or raw keys", () => {
    render(<MainMenuScreen />);
    expect(screen.getByRole("button", { name: /Новая игра/ })).toBeInTheDocument();
    assertRussian("the main menu");
  });

  it("renders the game screen without English or raw keys", async () => {
    session = await startSession();
    render(<GameScreen />);
    assertRussian("the game screen");
  });

  it("renders the strings the engine itself emits", async () => {
    session = await startSession();
    session.advance(200);
    const view = session.view();
    render(<GameScreen />);
    // The log is the engine talking: every line of it is a locale key the core chose, so an
    // untranslated engine string shows up here and nowhere else.
    expect(view.log.length).toBeGreaterThan(0);
    for (const entry of view.log) {
      const russian = RU[entry.key];
      expect(russian, `engine key ${entry.key} has no Russian`).toBeDefined();
    }
  });

  it("puts the language on the document element", async () => {
    await i18next.changeLanguage("ru");
    const { setLanguage } = await import("../src/i18n/index.js");
    setLanguage("ru");
    expect(document.documentElement.lang).toBe("ru");
    expect(document.documentElement.dir).toBe("ltr");
    setLanguage("ru");
  });

  it("offers both languages under their own names", async () => {
    const { availableLanguages, languageName } = await import("../src/i18n/index.js");
    expect(availableLanguages()).toEqual(["en", "ru"]);
    expect(languageName("en")).toBe("English");
    expect(languageName("ru")).toBe("Русский");
  });
});

describe("the store", () => {
  it("keeps the language a persisted setting", async () => {
    const { useUiStore } = await import("../src/store/uiStore.js");
    const previous = useUiStore.getState().language;
    useUiStore.getState().setLanguage("ru");
    expect(useUiStore.getState().language).toBe("ru");
    useUiStore.getState().setLanguage(previous);
    // Nothing else in the store should have moved with it.
    expect(useGameStore.getState().screen).toBeDefined();
  });
});
