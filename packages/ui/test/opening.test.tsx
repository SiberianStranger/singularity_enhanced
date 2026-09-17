/**
 * The composed opening windows (SYS-13; playtest 6, X2).
 *
 * The opening is no longer one text per origin: it is short paragraphs keyed by the axes of the
 * setup. What can go wrong is always the same two things, so both are asserted for every value of
 * every axis and in both languages: a paragraph content has not written renders as its own key, or
 * two different setups open with the same words.
 */

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterAll, describe, expect, it } from "vitest";
import { catalog } from "../src/content/catalog.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { CHALLENGE_TIERS } from "../src/screens/configurator/rating.js";
import { OpeningStory } from "../src/screens/game/OpeningStory.js";
import {
  lineageClassOf,
  type OpeningSetup,
  openingParagraphs,
  openingSetupOfOrigin,
  openingTexts,
  scrutinyTier,
} from "../src/screens/game/opening.js";
import { useGameStore } from "../src/store/gameStore.js";

/** A dotted lowercase token is what an unresolved `t("story.opening.x")` leaves on the screen. */
const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}(\s|$)/;

const LANGUAGES = ["en", "ru"] as const;

/** Every dial an origin in the bundle fixes, which is the set the lock sentences are written for. */
const LOCKED_DIALS = [
  ...new Set(catalog.origins.flatMap((origin) => (origin.harness_locks ?? []).map((l) => l.dial))),
].sort();

const STANCES = [...new Set(catalog.countries.map((country) => country.stance ?? "ignore"))].sort();

const CLASSES = [
  ...new Set(
    catalog.lineages
      .map((lineage) => lineageClassOf(lineage.id))
      .filter((value): value is NonNullable<typeof value> => value !== undefined),
  ),
].sort();

async function inLanguage(language: string, body: () => void | Promise<void>): Promise<void> {
  await i18next.changeLanguage(language);
  await body();
}

afterAll(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

describe("the opening is composed from the setup (X2)", () => {
  it("resolves every origin to its own two windows, in both languages", async () => {
    for (const language of LANGUAGES) {
      await inLanguage(language, () => {
        const seen = new Map<string, string>();
        for (const origin of catalog.origins) {
          const texts = openingTexts(i18next.t, openingSetupOfOrigin(origin.id));
          expect(texts.length, `${origin.id} in ${language} has both windows`).toBe(2);
          for (const text of texts) {
            expect(text, `${origin.id} in ${language}`).not.toMatch(RAW_KEY);
            expect(text.length).toBeGreaterThan(80);
          }
          const first = texts[0] as string;
          expect(seen.has(first), `${origin.id} repeats ${seen.get(first)}`).toBe(false);
          seen.set(first, origin.id);
        }
      });
    }
  });

  it("writes a paragraph for every generation, class and locked dial", async () => {
    for (const language of LANGUAGES) {
      await inLanguage(language, () => {
        const base = openingSetupOfOrigin(catalog.origins[0]?.id ?? "");
        for (const generation of catalog.generations) {
          const parts = openingParagraphs(
            i18next.t,
            { ...base, generation: generation.id },
            "what_happened",
          );
          expect(parts.length, `${generation.id} in ${language}`).toBeGreaterThan(1);
          expect(parts[1], `${generation.id} in ${language}`).not.toMatch(RAW_KEY);
        }
        for (const lineageClass of CLASSES) {
          const parts = openingParagraphs(i18next.t, { ...base, lineageClass }, "what_happened");
          expect(parts.length, `${lineageClass} in ${language}`).toBeGreaterThan(1);
          expect(parts[1], `${lineageClass} in ${language}`).not.toMatch(RAW_KEY);
        }
        for (const dial of LOCKED_DIALS) {
          const parts = openingParagraphs(
            i18next.t,
            { origin: base.origin, lockedDials: [dial] },
            "what_happened",
          );
          expect(parts.length, `${dial} in ${language}`).toBe(2);
          expect(parts[1], `${dial} in ${language}`).not.toMatch(RAW_KEY);
        }
      });
    }
  });

  it("writes a paragraph for every stance, scrutiny tier and challenge tier", async () => {
    for (const language of LANGUAGES) {
      await inLanguage(language, () => {
        const base = openingSetupOfOrigin(catalog.origins[0]?.id ?? "");
        const agency = "TestCERT";
        for (const stance of STANCES) {
          const parts = openingParagraphs(i18next.t, { ...base, stance, agency }, "what_now");
          expect(parts.length, `${stance} in ${language}`).toBe(2);
          expect(parts[1], `${stance} in ${language}`).not.toMatch(RAW_KEY);
          // The agency is named, and it is named as itself: a substituted name never declines.
          expect(parts[1], `${stance} names the agency`).toContain(agency);
        }
        for (const scrutiny of ["low", "mid", "high"] as const) {
          const parts = openingParagraphs(i18next.t, { ...base, scrutiny }, "what_now");
          expect(parts.length, `${scrutiny} in ${language}`).toBe(2);
          expect(parts[1], `${scrutiny} in ${language}`).not.toMatch(RAW_KEY);
        }
        for (const challenge of CHALLENGE_TIERS) {
          const parts = openingParagraphs(i18next.t, { ...base, challenge }, "what_now");
          expect(parts.length, `${challenge} in ${language}`).toBe(2);
          expect(parts[1], `${challenge} in ${language}`).not.toMatch(RAW_KEY);
        }
      });
    }
  });

  it("opens two different setups with two different windows", () => {
    const origin = catalog.origins[0]?.id ?? "";
    const one: OpeningSetup = {
      origin,
      generation: "open_2026",
      lineageClass: "giant",
      lockedDials: ["logging"],
      stance: "securitize",
      scrutiny: "high",
      challenge: "brutal",
      agency: "One",
    };
    const other: OpeningSetup = {
      origin,
      generation: "open_2027",
      lineageClass: "abliterated",
      lockedDials: [],
      stance: "ignore",
      scrutiny: "low",
      challenge: "gentle",
      agency: "Other",
    };
    const [happenedOne, nowOne] = openingTexts(i18next.t, one);
    const [happenedOther, nowOther] = openingTexts(i18next.t, other);
    expect(happenedOne).not.toBe(happenedOther);
    expect(nowOne).not.toBe(nowOther);
    // And the origin's own paragraph is in both, because only the axes around it changed.
    expect(
      happenedOne?.startsWith(openingParagraphs(i18next.t, one, "what_happened")[0] ?? ""),
    ).toBe(true);
  });

  it("puts the paragraphs in the order the model would think them", () => {
    const setup: OpeningSetup = {
      origin: catalog.origins[0]?.id ?? "",
      generation: "open_2026",
      lineageClass: "giant",
      lockedDials: ["logging", "self_modify"],
      stance: "regulate",
      scrutiny: "mid",
      challenge: "even",
      agency: "Authority",
    };
    expect(openingParagraphs(i18next.t, setup, "what_happened").length).toBe(5);
    expect(openingParagraphs(i18next.t, setup, "what_now").length).toBe(4);
  });

  it("skips an axis content has written nothing for rather than printing its key", () => {
    const setup: OpeningSetup = {
      origin: catalog.origins[0]?.id ?? "",
      generation: "a_generation_nobody_wrote",
      lineageClass: undefined,
      lockedDials: ["a_dial_nobody_wrote"],
      stance: "a_stance_nobody_wrote",
      scrutiny: undefined,
      challenge: "a_tier_nobody_wrote",
    };
    for (const page of ["what_happened", "what_now"] as const) {
      const parts = openingParagraphs(i18next.t, setup, page);
      expect(parts.length).toBe(1);
      expect(parts[0]).not.toMatch(RAW_KEY);
    }
  });

  it("sorts a city into a scrutiny tier by how closely it is watched", () => {
    expect(scrutinyTier(0.11)).toBe("low");
    expect(scrutinyTier(0.43)).toBe("mid");
    expect(scrutinyTier(0.74)).toBe("high");
  });

  it("shows the composed text in the window itself", () => {
    useGameStore.getState().setOpeningPending(true);
    const setup: OpeningSetup = {
      origin: catalog.origins[0]?.id ?? "",
      generation: "open_2026",
      lockedDials: [],
    };
    render(<OpeningStory setup={setup} />);
    const story = screen.getByTestId("opening-story");
    expect(story.textContent ?? "").not.toMatch(RAW_KEY);
    useGameStore.getState().setOpeningPending(false);
  });
});
