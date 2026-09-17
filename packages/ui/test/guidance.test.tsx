/**
 * The guidance layer (SYS-04 "Configurator v0.4"; playtest 7, Y2, Y3, Y4).
 *
 * The finding was that the cards are a wall of numbers with nothing to decide on. So this walks
 * what the player would walk: every origin, generation, lineage, rig and quirk, in both languages,
 * and fails on an entry with no guidance, on a sentence that is still a locale key, and on a
 * capability figure without a band and a word. It also checks the two places the words are not on
 * an entry at all: the axis tooltips and the harness dials.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalog, generationById, lineageById } from "../src/content/catalog.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import {
  axisHint,
  bandOf,
  dialWords,
  type GuidanceKind,
  generationWords,
  guidanceFor,
  harnessIntro,
  hasGuidance,
} from "../src/screens/configurator/guidance.js";
import {
  CAPABILITY_AXES,
  generationMeaning,
  lineageMeaning,
} from "../src/screens/configurator/meaning.js";
import { STEP_IDS } from "../src/screens/configurator/steps.js";
import { useConfigurator } from "../src/screens/configurator/store.js";
import { useUiStore } from "../src/store/uiStore.js";

const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}(\s|$)/;
const LANGUAGES = ["en", "ru"] as const;

/** Every entry that can be chosen, by the kind its guidance is keyed under. */
function entries(): { kind: GuidanceKind; id: string }[] {
  return [
    ...catalog.origins.map((entry) => ({ kind: "origin" as const, id: entry.id })),
    ...catalog.generations.map((entry) => ({ kind: "generation" as const, id: entry.id })),
    ...catalog.lineages.map((entry) => ({ kind: "lineage" as const, id: entry.id })),
    ...catalog.hardwarePresets.map((entry) => ({ kind: "hardware" as const, id: entry.id })),
    ...catalog.quirks.map((entry) => ({ kind: "quirk" as const, id: entry.id })),
  ];
}

beforeEach(() => {
  useConfigurator.getState().reset();
  useUiStore.setState({ introSeen: [...STEP_IDS] });
});

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

describe("pick, avoid and compare", () => {
  for (const language of LANGUAGES) {
    it(`is written for every entry the player chooses between, in ${language}`, async () => {
      await i18next.changeLanguage(language);
      const t = i18next.t.bind(i18next);
      const missing: string[] = [];
      const raw: string[] = [];
      for (const entry of entries()) {
        const guidance = guidanceFor(t, entry.kind, entry.id);
        if (!hasGuidance(guidance)) {
          missing.push(`${entry.kind}.${entry.id}: nothing at all`);
          continue;
        }
        for (const [name, sentence] of Object.entries(guidance)) {
          if (sentence === undefined) {
            missing.push(`${entry.kind}.${entry.id}.${name}`);
            continue;
          }
          if (RAW_KEY.test(sentence) || sentence.length < 20) {
            raw.push(`${entry.kind}.${entry.id}.${name}: ${sentence}`);
          }
        }
        // All three, not one or two: the block is an answer to "which of these do I take".
        for (const name of ["pick", "avoid", "compare"] as const) {
          if (guidance[name] === undefined) {
            missing.push(`${entry.kind}.${entry.id}.${name}`);
          }
        }
      }
      expect(missing, `entries with no guidance in ${language}`).toEqual([]);
      expect(raw, `sentences that are still keys in ${language}`).toEqual([]);
    });
  }

  it("is drawn under the description on every step that offers a choice", async () => {
    render(<ConfiguratorScreen />);
    for (const step of ["origin", "generation", "lineage", "hardware", "quirks"]) {
      await userEvent.click(screen.getByTestId(`step-rail-${step}`));
      const block = screen.getByTestId("guidance-block");
      expect(block.getAttribute("data-guidance-kind"), step).toBeTruthy();
      for (const which of ["pick_if", "avoid_if", "compare"]) {
        expect(
          block.querySelector(`[data-guidance="${which}"]`),
          `${step} ${which}`,
        ).not.toBeNull();
      }
    }
  }, 20_000);
});

describe("numbers with meaning (Y3)", () => {
  it("bands a value against the range it is compared with", () => {
    expect(bandOf(1, [1, 2, 3]).word).toBe("low");
    expect(bandOf(3, [1, 2, 3]).word).toBe("frontier");
    expect(bandOf(2, [1, 2, 3]).share).toBeCloseTo(0.5, 5);
    // A field with no spread at all is not a comparison; the bar is full rather than empty.
    expect(bandOf(5, [5, 5]).share).toBe(1);
  });

  for (const language of LANGUAGES) {
    it(`tells every axis what it changes in the game, in ${language}`, async () => {
      await i18next.changeLanguage(language);
      const t = i18next.t.bind(i18next);
      for (const axis of CAPABILITY_AXES) {
        const hint = axisHint(t, axis);
        expect(hint, `${axis} in ${language}`).toBeTruthy();
        expect(hint ?? "", `${axis} in ${language}`).not.toMatch(RAW_KEY);
      }
    });

    it(`says what each vintage's ceiling and trade are, in ${language}`, async () => {
      await i18next.changeLanguage(language);
      const t = i18next.t.bind(i18next);
      for (const generation of catalog.generations) {
        const words = generationWords(t, generation.id);
        expect(words.ceiling, `${generation.id} ceiling in ${language}`).toBeTruthy();
        expect(words.give, `${generation.id} give in ${language}`).toBeTruthy();
        expect(words.get, `${generation.id} get in ${language}`).toBeTruthy();
        const meaning = generationMeaning(t, generation, catalog.generations);
        const ids = meaning.lines.map((line) => line.id);
        expect(ids, generation.id).toContain("trade_give");
        expect(ids, generation.id).toContain("trade_get");
        expect(meaning.lines.find((line) => line.id === "capability_delta")?.bar).toBeDefined();
      }
    });
  }

  it("prints one size on the cards, with the rigs it fits", () => {
    const t = i18next.t.bind(i18next);
    const lineage = lineageById.get(catalog.lineages[0]?.id ?? "");
    const generation = generationById.get(lineage?.generations[0] ?? "open_2026");
    const meaning = lineageMeaning(t, lineage as never, generation, catalog.lineages, {
      preset: catalog.hardwarePresets[0],
      allowed: catalog.hardwarePresets.slice(0, 4),
    });
    const size = meaning.lines.find((line) => line.id === "size_on_cards");
    expect(size?.value).toMatch(/\d/);
    expect(size?.hint ?? "").not.toBe("");
    expect(meaning.lines.find((line) => line.id === "fits_in")).toBeDefined();
  });
});

describe("the harness in words (Y4)", () => {
  for (const language of LANGUAGES) {
    it(`says what moving each dial does and when a fixed one opens, in ${language}`, async () => {
      await i18next.changeLanguage(language);
      const t = i18next.t.bind(i18next);
      expect(harnessIntro(t), language).toBeTruthy();
      for (const dial of catalog.harnessDials) {
        const words = dialWords(t, dial.id);
        expect(words.moving, `${dial.id} in ${language}`).toBeTruthy();
        expect(words.unlock, `${dial.id} in ${language}`).toBeTruthy();
        expect(words.moving ?? "", `${dial.id} in ${language}`).not.toMatch(RAW_KEY);
      }
    });
  }

  it("says when a fixed dial opens, on the dial the origin fixed", async () => {
    // The origin the draft opens on, and the first dial it bolted down.
    const origin = catalog.origins.find(
      (entry) => entry.id === useConfigurator.getState().draft.origin,
    );
    const locked = (origin?.harness_locks ?? [])[0];
    expect(locked, "the opening origin fixes a dial").toBeDefined();
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId("step-rail-harness"));
    await userEvent.click(screen.getByTestId(`list-entry-${locked?.dial ?? ""}`));

    // The lock's own reason, from the origin, and the sentence that says when it opens.
    expect(screen.getByTestId("lock-note").textContent ?? "").not.toBe("");
    const unlock = screen.getByTestId("harness-unlock").textContent ?? "";
    expect(unlock).toBe(dialWords(i18next.t.bind(i18next), locked?.dial ?? "").unlock);
    const block = screen.getByTestId("meaning-block");
    expect(block.querySelector('[data-line="unlock"]')).not.toBeNull();
  }, 20_000);

  it("shows the intro, the sentence and the recommended position on the step", async () => {
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId("step-rail-harness"));
    expect(screen.getByTestId("harness-intro").textContent ?? "").not.toBe("");
    expect(screen.getByTestId("harness-moving").textContent ?? "").not.toBe("");
    const dial = catalog.harnessDials[0]?.id ?? "";
    expect(screen.getByTestId(`harness-recommended-${dial}`).textContent ?? "").toContain(
      i18next.t("config.harness.recommended", { value: "" }).split("{")[0]?.trim() ?? "",
    );
  });
});

describe("the site kind explains itself (Y1)", () => {
  it("carries the kind's own description on the value in the origin card", async () => {
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId("step-rail-origin"));
    const value = screen.getByTestId("value-hint-site_kind");
    await userEvent.hover(value);
    const tip = await screen.findByRole("tooltip");
    const origin = catalog.origins.find(
      (entry) => entry.id === useConfigurator.getState().draft.origin,
    );
    expect(tip.textContent).toBe(i18next.t(`sites.${origin?.site_kind ?? ""}.desc`));
  });
});
