/**
 * Accelerators in the language on screen (ui-style-guide.md rule 4; playtest 6, X13).
 *
 * The rule the client had until playtest 6 was "a Latin letter from a table in the code", which
 * Russian could not draw: the letter was not in the word, so `Hotkey` printed "(O)" after it and
 * the rail grew a key cap to hide the problem. The rule now is the original game's: the underlined
 * letter is a letter of the word, per language, carried in the locale at `<label key>.key`.
 *
 * Three things have to hold, and none of them can be checked by reading a table:
 *
 * - every letter a language declares occurs in the label it belongs to, so the underline lands
 *   inside the word and no label ever ends in " (X)";
 * - no two controls that can be on screen together claim the same letter, in either language;
 * - the key reaches the control from a Cyrillic and from a Latin keyboard.
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { ACCELERATOR_SUFFIX, accelerator } from "../src/lib/accelerators.js";
import { matches, physicalKey } from "../src/lib/hotkeys.js";
import uiEn from "../src/locales/en.json";
import uiRu from "../src/locales/ru.json";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import { STEP_IDS } from "../src/screens/configurator/steps.js";
import { useConfigurator } from "../src/screens/configurator/store.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { type LocalSession, startSession } from "./helpers.js";

const LOCALES: Record<string, Record<string, string>> = { en: uiEn, ru: uiRu };

let session: LocalSession | null = null;

afterEach(async () => {
  cleanup();
  session?.stop();
  session = null;
  useGameStore.getState().setOpeningPending(false);
  useUiStore.setState({ menuSection: null, overlay: null, notices: [] });
  await act(async () => {
    await i18next.changeLanguage(DEFAULT_LANGUAGE);
  });
});

describe("the letters a language declares", () => {
  for (const [language, strings] of Object.entries(LOCALES)) {
    it(`are single letters of their own label in ${language}`, () => {
      const wrong: string[] = [];
      for (const [key, value] of Object.entries(strings)) {
        if (!key.endsWith(ACCELERATOR_SUFFIX)) {
          continue;
        }
        const labelKey = key.slice(0, -ACCELERATOR_SUFFIX.length);
        const label = strings[labelKey];
        if (label === undefined) {
          wrong.push(`${key}: no ${labelKey} to underline it in`);
          continue;
        }
        if (value.length !== 1) {
          wrong.push(`${key}: "${value}" is not one letter`);
          continue;
        }
        if (!label.toLowerCase().includes(value.toLowerCase())) {
          wrong.push(`${key}: "${value}" is not in "${label}"`);
        }
        if (physicalKey(value) === undefined) {
          wrong.push(`${key}: "${value}" sits on no key this client knows`);
        }
      }
      expect(wrong).toEqual([]);
    });

    it(`declares one in ${language} wherever English declares one`, () => {
      const missing = Object.keys(uiEn)
        .filter((key) => key.endsWith(ACCELERATOR_SUFFIX))
        .filter((key) => strings[key] === undefined);
      expect(missing).toEqual([]);
    });
  }
});

/** Every accelerator on screen, in document order, with the label that claims it. */
function claims(): { letter: string; label: string }[] {
  return [...document.querySelectorAll<HTMLElement>("[data-hotkey]")].map((element) => ({
    letter: (element.getAttribute("data-hotkey") ?? "").toLowerCase(),
    label: (element.textContent ?? "").trim().slice(0, 40),
  }));
}

function duplicates(): string[] {
  const seen = new Map<string, string[]>();
  for (const claim of claims()) {
    seen.set(claim.letter, [...(seen.get(claim.letter) ?? []), claim.label]);
  }
  return [...seen.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([letter, labels]) => `${letter}: ${labels.join(" / ")}`);
}

/** The letters two controls on screen would collide on once they reach the same physical key. */
function codeDuplicates(): string[] {
  const seen = new Map<string, string[]>();
  for (const claim of claims()) {
    const code = physicalKey(claim.letter) ?? claim.letter;
    seen.set(code, [...(seen.get(code) ?? []), claim.label]);
  }
  return [...seen.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([code, labels]) => `${code}: ${labels.join(" / ")}`);
}

describe("the configurator, in both languages", () => {
  for (const language of ["en", "ru"]) {
    it(`underlines a letter of the word and never appends one in ${language}`, async () => {
      await act(async () => {
        await i18next.changeLanguage(language);
      });
      useConfigurator.getState().reset();
      useUiStore.setState({ introSeen: [] });
      render(<ConfiguratorScreen />);

      // The explanation window is up over the rail on a first visit, so both are on screen at
      // once and the rail's letters are measured against the window's.
      expect(screen.getByTestId("config-intro")).toBeInTheDocument();
      expect(claims().length).toBeGreaterThan(10);

      // Every control that claims a letter draws it underlined inside its own label.
      for (const element of document.querySelectorAll<HTMLElement>("[data-hotkey]")) {
        const letter = (element.getAttribute("data-hotkey") ?? "").toLowerCase();
        const underlined = element.querySelector("u")?.textContent?.toLowerCase() ?? "";
        expect(underlined, `${element.textContent ?? ""} in ${language}`).toBe(letter);
      }
      // ...and nothing on the screen ends in the "(X)" the old fallback printed.
      expect(document.body.textContent ?? "").not.toMatch(/\s\([A-ZА-ЯЁ]\)/);

      expect(duplicates(), language).toEqual([]);
      expect(codeDuplicates(), language).toEqual([]);
    });

    it(`keeps them unique on every step in ${language}`, async () => {
      await act(async () => {
        await i18next.changeLanguage(language);
      });
      useConfigurator.getState().reset();
      useUiStore.setState({ introSeen: [] });
      render(<ConfiguratorScreen />);
      for (let step = 0; step < STEP_IDS.length; step += 1) {
        await act(async () => {
          useConfigurator.getState().goToStep(step);
        });
        const intro = screen.queryAllByTestId("config-intro");
        if (intro.length > 0) {
          await userEvent.click(
            screen.getByRole("button", { name: i18next.t("config.intro.got_it") }),
          );
        }
        expect(duplicates(), `${language}, step ${step}`).toEqual([]);
        expect(codeDuplicates(), `${language}, step ${step}`).toEqual([]);
      }
      // Ten steps of a whole screen, in a suite where every package's tests run at once: the
      // 5 s default is not a statement about this test, it is a statement about the machine.
    }, 30_000);
  }
});

describe("the game screen, in both languages", () => {
  async function renderGame(language: string): Promise<void> {
    await act(async () => {
      await i18next.changeLanguage(language);
    });
    session = await startSession();
    render(<GameScreen />);
  }

  for (const language of ["en", "ru"]) {
    it(`keeps the map and consecutive overlay letters unique in ${language}`, async () => {
      await renderGame(language);
      expect(duplicates(), `${language}, the map`).toEqual([]);

      // Keep the transitions between overlays: uniqueness must survive one window replacing
      // another, as well as each window's initial render.
      for (const overlay of ["log", "knowledge", "world", "borrowed"] as const) {
        await act(async () => {
          useUiStore.getState().openOverlay(overlay);
        });
        expect(screen.getAllByRole("dialog").length, `${language}, ${overlay}`).toBeGreaterThan(0);
        expect(duplicates(), `${language}, ${overlay}`).toEqual([]);
        expect(codeDuplicates(), `${language}, ${overlay}`).toEqual([]);
      }
      await act(async () => {
        useUiStore.getState().closeOverlay();
      });
    }, 30_000);

    it(`keeps the menu and subsequent opening letters unique in ${language}`, async () => {
      await renderGame(language);
      await act(async () => {
        useUiStore.getState().openMenu("root");
      });
      expect(duplicates(), `${language}, the menu`).toEqual([]);
      expect(codeDuplicates(), `${language}, the menu`).toEqual([]);
      await act(async () => {
        useUiStore.getState().closeMenu();
      });

      await act(async () => {
        useGameStore.getState().setOpeningPending(true);
      });
      expect(screen.getByTestId("opening-story")).toBeInTheDocument();
      expect(duplicates(), `${language}, the opening`).toEqual([]);
      expect(codeDuplicates(), `${language}, the opening`).toEqual([]);
      await act(async () => {
        useGameStore.getState().setOpeningPending(false);
      });
    }, 30_000);

    it(`gives every button of the Sites tab a letter, and takes them back under a window in ${language}`, async () => {
      await renderGame(language);
      // The opening's blocking events are windows too: answered first, as a player would.
      for (const choice of session?.view().pending.filter((entry) => entry.blocking) ?? []) {
        const option = choice.options.find((entry) => entry.enabled);
        if (option !== undefined) {
          await act(async () => {
            await useGameStore
              .getState()
              .send({ type: "resolve_event", instanceId: choice.instanceId, optionId: option.id });
          });
        }
      }
      await act(async () => {
        useUiStore.getState().openTab("compute");
      });
      expect(screen.queryAllByRole("dialog")).toHaveLength(0);
      const ids = [
        "site-manage",
        "site-rename",
        "site-power",
        "site-build",
        "site-rent",
        "site-liquidate",
        "borrowed-details",
      ];
      for (const id of ids) {
        const button = screen.getByTestId(id);
        const letter = button.getAttribute("data-hotkey") ?? "";
        expect(letter, `${id} in ${language}`).toHaveLength(1);
        expect(button.querySelector("u")?.textContent?.toLowerCase(), id).toBe(letter);
      }
      // ...none of them shared with the strip, the top bar or the map around the tab.
      expect(duplicates(), `${language}, the Sites tab`).toEqual([]);
      expect(codeDuplicates(), `${language}, the Sites tab`).toEqual([]);
      // Hotkeys are global: under a window the tab's letters would fire along with the window's.
      await act(async () => {
        useUiStore.getState().openOverlay("log");
      });
      for (const id of ids) {
        expect(
          screen.getByTestId(id).getAttribute("data-hotkey"),
          `${id} under a window`,
        ).toBeNull();
      }
      await act(async () => {
        useUiStore.getState().closeOverlay();
      });
      expect(screen.getByTestId("site-rename").getAttribute("data-hotkey")).not.toBeNull();
    }, 30_000);

    it(`keeps the compute and subsequent journal letters unique in ${language}`, async () => {
      await renderGame(language);
      // Every tab in turn, so the panel's own buttons are measured against the strip above them.
      for (const tab of ["compute", "journal"] as const) {
        await act(async () => {
          useUiStore.getState().openTab(tab);
        });
        expect(duplicates(), `${language}, the ${tab} tab`).toEqual([]);
        expect(codeDuplicates(), `${language}, the ${tab} tab`).toEqual([]);
      }
    }, 30_000);
  }
});

describe("a press", () => {
  function press(key: string, code: string): KeyboardEvent {
    return new KeyboardEvent("keydown", { key, code });
  }

  it("reaches a Cyrillic accelerator from a Cyrillic keyboard", () => {
    expect(matches(press("п", "KeyG"), "П")).toBe(true);
  });

  it("reaches it from a Latin keyboard, by the key the letter sits on", () => {
    expect(matches(press("g", "KeyG"), "П")).toBe(true);
  });

  it("reaches a Latin accelerator from a Cyrillic keyboard the same way", () => {
    expect(matches(press("в", "KeyD"), "D")).toBe(true);
  });

  it("does not fire on a neighbouring key", () => {
    expect(matches(press("р", "KeyH"), "П")).toBe(false);
    expect(matches(press("h", "KeyH"), "D")).toBe(false);
  });

  it("knows where the Russian letters live", () => {
    expect(physicalKey("Я")).toBe("KeyZ");
    expect(physicalKey("ж")).toBe("Semicolon");
    expect(physicalKey("W")).toBe("KeyW");
    expect(physicalKey("")).toBeUndefined();
  });
});

describe("the accelerator lookup", () => {
  it("returns nothing for a label that declares none", () => {
    expect(accelerator(i18next.t.bind(i18next), "config.title")).toBeUndefined();
  });
});
