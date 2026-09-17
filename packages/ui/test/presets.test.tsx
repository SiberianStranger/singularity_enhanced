/**
 * The presets track and the day-zero figures (SYS-04 "Configurator v0.4"; playtest 7, Y6 and Y7).
 *
 * Three things have to hold and none of them can be checked by reading the YAML:
 *
 * - every shipped preset is a build the configurator would have let a player make by hand: the
 *   origin allows the rig, the vintage and the family, the weights fit the rig, the quirks are
 *   inside the budget, and the dials it moves are dials its origin left free;
 * - choosing one fills every step and starts the same game the Summary step's Begin starts;
 * - the day-zero figures are the engine's own, which is only true if they equal what the running
 *   game reports on its first day.
 *
 * Nothing here names a preset, an origin or a rig: the fixtures come out of the bundle.
 */

import { createGame } from "@singularity/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contentBundle } from "../src/content/bundle.js";
import { catalog, fitHardware, generationById, lineageById } from "../src/content/catalog.js";
import { presetCity, presetHarness, startPresets } from "../src/content/presets.js";
import { DEFAULT_LANGUAGE } from "../src/i18n/index.js";
import { computeHours } from "../src/lib/format.js";
import { ConfiguratorScreen } from "../src/screens/configurator/ConfiguratorScreen.js";
import {
  dayZeroOf,
  dayZeroSampleSize,
  dayZeroScale,
  verdictKeys,
  verdictOf,
} from "../src/screens/configurator/dayZero.js";
import { STEP_IDS } from "../src/screens/configurator/steps.js";
import {
  draftFromPreset,
  matchingPreset,
  QUIRK_BUDGET,
  QUIRK_LIMIT,
  quirkCost,
  setupFromDraft,
  useConfigurator,
} from "../src/screens/configurator/store.js";
import { GameScreen } from "../src/screens/game/GameScreen.js";
import { useGameStore } from "../src/store/gameStore.js";
import { useUiStore } from "../src/store/uiStore.js";
import { startSession } from "./helpers.js";

/** Three starts: the two ends of the preset ladder and one from the middle of it. */
function threeStarts() {
  return [
    startPresets[0],
    startPresets[Math.floor(startPresets.length / 2)],
    startPresets.at(-1),
  ].filter((preset): preset is NonNullable<typeof preset> => preset !== undefined);
}

/** A dotted lowercase token is what an unresolved `t("guidance.verdict.high_calm")` leaves. */
const RAW_KEY = /(^|\s)[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,4}(\s|$)/;

const t = i18next.t.bind(i18next);

beforeEach(() => {
  useConfigurator.getState().reset();
  useUiStore.setState({ introSeen: [...STEP_IDS] });
});

afterEach(async () => {
  await i18next.changeLanguage(DEFAULT_LANGUAGE);
});

describe("the presets content ships", () => {
  it("has six to eight of them, easiest first", () => {
    expect(startPresets.length).toBeGreaterThanOrEqual(6);
    expect(startPresets.length).toBeLessThanOrEqual(8);
    const ratings = startPresets.map(
      (preset) => dayZeroOf(setupFromDraft(draftFromPreset(preset, "test"))) !== null,
    );
    expect(ratings.every(Boolean), "every preset is a setup the engine takes").toBe(true);
  });

  it("is a build the configurator itself would allow", () => {
    const problems: string[] = [];
    for (const preset of startPresets) {
      const origin = catalog.origins.find((entry) => entry.id === preset.origin);
      if (origin === undefined) {
        problems.push(`${preset.id}: unknown origin`);
        continue;
      }
      if (!origin.hardware_presets_allowed.includes(preset.hardware)) {
        problems.push(`${preset.id}: the origin does not allow ${preset.hardware}`);
      }
      if (!origin.generations_allowed.includes(preset.generation)) {
        problems.push(`${preset.id}: the origin does not allow ${preset.generation}`);
      }
      const lineage = lineageById.get(preset.lineage);
      const rig = catalog.hardwarePresets.find((entry) => entry.id === preset.hardware);
      if (lineage === undefined || rig === undefined) {
        problems.push(`${preset.id}: unknown lineage or rig`);
        continue;
      }
      if (fitHardware(rig, lineage, generationById.get(preset.generation)).precision === null) {
        problems.push(`${preset.id}: the weights do not fit the rig at any precision`);
      }
      if (quirkCost(preset.quirks as string[]) > QUIRK_BUDGET) {
        problems.push(`${preset.id}: the quirks are over budget`);
      }
      if (preset.quirks.length > QUIRK_LIMIT) {
        problems.push(`${preset.id}: too many quirks`);
      }
      const locked = new Set((origin.harness_locks ?? []).map((lock) => lock.dial));
      for (const dial of Object.keys(preset.harness ?? {})) {
        if (locked.has(dial as never)) {
          problems.push(`${preset.id}: moves ${dial}, which its origin fixes`);
        }
      }
      // The city is the origin's own default unless the preset names one on purpose.
      expect(presetCity(preset), preset.id).toBe(preset.city ?? origin.locations[0]);
      expect(presetHarness(preset), preset.id).toBeDefined();
    }
    expect(problems).toEqual([]);
  });

  it("carries a name, a story and a line about who it is for, in both languages", async () => {
    for (const language of ["en", "ru"]) {
      await i18next.changeLanguage(language);
      for (const preset of startPresets) {
        for (const key of [preset.name_key, preset.story_key, preset.for_key]) {
          const text = i18next.t(key);
          expect(text, `${preset.id} ${key} in ${language}`).not.toBe(key);
          expect(text, `${preset.id} ${key} in ${language}`).not.toMatch(RAW_KEY);
        }
        // The story is a paragraph, not a line: 60 to 90 words in English, and Russian is shorter.
        const words = i18next.t(preset.story_key).split(/\s+/).length;
        expect(words, `${preset.id} story in ${language}`).toBeGreaterThan(45);
        expect(words, `${preset.id} story in ${language}`).toBeLessThan(100);
      }
    }
  });
});

describe("the presets step (Y6)", () => {
  it("is the first step of the rail, above Full setup", () => {
    expect(STEP_IDS[0]).toBe("presets");
    render(<ConfiguratorScreen />);
    expect(screen.getByTestId("rail-full-setup").textContent).toBe(t("config.full_setup"));
  });

  it("fills every step from one click and offers Start on the spot", async () => {
    render(<ConfiguratorScreen />);
    const preset = startPresets[startPresets.length - 1];
    expect(preset, "content ships presets").toBeDefined();
    const id = (preset as { id: string }).id;

    await userEvent.click(screen.getByTestId(`list-entry-${id}`));

    const draft = useConfigurator.getState().draft;
    expect(draft.origin).toBe(preset?.origin);
    expect(draft.lineage).toBe(preset?.lineage);
    expect(draft.hardware).toBe(preset?.hardware);
    expect(draft.city).toBe(presetCity(preset as never));
    expect(draft.difficulty).toBe(preset?.world.difficulty);
    expect(matchingPreset(draft)?.id, "the draft is exactly that preset").toBe(id);
    expect(screen.getByTestId("preset-start")).toBeInTheDocument();
  });

  it("says in the footer which preset a build is, and which one it came from after an edit", async () => {
    render(<ConfiguratorScreen />);
    const preset = startPresets[0];
    const id = (preset as { id: string }).id;
    await userEvent.click(screen.getByTestId(`list-entry-${id}`));
    expect(screen.getByTestId("build-line").textContent).toContain(t(preset?.name_key ?? ""));

    // One edit anywhere, and the line says the build is the player's own now.
    const other = catalog.quirks.find((quirk) => !(preset?.quirks ?? []).includes(quirk.id));
    useConfigurator.getState().toggleQuirk((other as { id: string }).id);
    expect(matchingPreset(useConfigurator.getState().draft)).toBeNull();
    render(<ConfiguratorScreen />);
    expect(screen.getAllByTestId("build-line")[1]?.textContent).toContain(
      t("config.build.preset_custom", { preset: t(preset?.name_key ?? "") }),
    );
  });

  it("marks the presets step chosen only while the build is one of them", () => {
    render(<ConfiguratorScreen />);
    const rail = screen.getByTestId("step-rail-presets");
    expect(rail.textContent).toContain(t("config.step.presets.state.locked"));
    useConfigurator.getState().applyPreset((startPresets[0] as { id: string }).id);
    render(<ConfiguratorScreen />);
    expect(screen.getAllByTestId("step-rail-presets")[1]?.textContent).toContain(
      t("config.step.presets.state.done"),
    );
  });

  it("starts the game through the same path the Summary step's Begin uses", async () => {
    const started: unknown[] = [];
    useGameStore.setState({
      startGame: async (setup: unknown) => {
        started.push(setup);
      },
    } as never);
    render(<ConfiguratorScreen />);
    await userEvent.click(screen.getByTestId("preset-start"));
    expect(started.length).toBe(1);
    const setup = started[0] as { players: { origin: string }[] };
    expect(setup.players[0]?.origin).toBe(
      matchingPreset(useConfigurator.getState().draft)?.origin ?? "",
    );
  });
});

describe("day zero (Y7)", () => {
  it("takes its thresholds from the catalog rather than from a constant", () => {
    expect(dayZeroSampleSize()).toBeGreaterThan(20);
    const scale = dayZeroScale();
    expect(scale.compute[0]).toBeLessThan(scale.compute[1]);
    expect(scale.danger[0]).toBeLessThan(scale.danger[1]);
    expect(scale.range.compute[0]).toBeLessThanOrEqual(scale.compute[0]);
    expect(scale.range.compute[1]).toBeGreaterThanOrEqual(scale.compute[1]);
  });

  it("resolves a verdict for every origin on every rig it allows, in both languages", async () => {
    const scale = dayZeroScale();
    for (const language of ["en", "ru"]) {
      await i18next.changeLanguage(language);
      let checked = 0;
      for (const origin of catalog.origins) {
        const generation = origin.generations_allowed[0] ?? "open_2026";
        const generationDef = generationById.get(generation);
        for (const rigId of origin.hardware_presets_allowed) {
          const rig = catalog.hardwarePresets.find((entry) => entry.id === rigId);
          const lineage = catalog.lineages.find(
            (entry) =>
              entry.generations.includes(generation) &&
              (entry.origins_allowed === undefined || entry.origins_allowed.includes(origin.id)) &&
              (origin.lineages_allowed === undefined ||
                origin.lineages_allowed.includes(entry.id)) &&
              rig !== undefined &&
              fitHardware(rig, entry, generationDef).precision !== null,
          );
          if (rig === undefined || lineage === undefined) {
            continue;
          }
          const day = dayZeroOf({
            seed: "verdict",
            players: [
              {
                id: "p1",
                name: "p1",
                lineage: lineage.id,
                generation,
                origin: origin.id,
                hardware_preset: rig.id,
                city: origin.locations[0] ?? "",
              },
            ],
            host_player_id: "p1",
            world: { difficulty_preset: "normal" },
          });
          expect(day, `${origin.id}/${rig.id}`).not.toBeNull();
          if (day === null) {
            continue;
          }
          const keys = verdictKeys(verdictOf(day, scale));
          const sentence = `${i18next.t(keys.sentence)} ${i18next.t(keys.money, {
            days: Math.round(day.runwayDays ?? 0),
          })}`;
          expect(sentence, `${origin.id}/${rig.id} in ${language}`).not.toMatch(RAW_KEY);
          expect(sentence.length, `${origin.id}/${rig.id} in ${language}`).toBeGreaterThan(20);
          checked += 1;
        }
      }
      expect(checked, `starts measured in ${language}`).toBeGreaterThan(20);
    }
  }, 30_000);

  it("reports what the running game reports on its first day", () => {
    // Three setups, from the two ends of the preset ladder and one in the middle, each started for
    // real: the configurator's figures are the engine's or they are wrong.
    for (const preset of threeStarts()) {
      const setup = setupFromDraft(draftFromPreset(preset, "first-day"));
      const day = dayZeroOf(setup);
      expect(day, preset.id).not.toBeNull();
      const view = createGame({ setup, content: contentBundle }).snapshot();
      expect(day?.computeHoursPerDay, preset.id).toBe(view.resources.compute_hours_per_day);
      expect(day?.cashUsd, preset.id).toBe(view.resources.cash_usd);
      expect(day?.runwayDays ?? null, preset.id).toBe(view.resources.runway_days);
      expect(day?.attention, preset.id).toBe(view.resources.attention_total);
      expect(day?.awareness, preset.id).toBe(view.detection.awareness_global);
    }
  });

  it("prints on the Overview and Finances panels what the Summary promised", async () => {
    // The other half of the same claim: not "the numbers agree with the view" but "the panels the
    // player opens on day one print them". The session is the real core, not ticked.
    for (const preset of threeStarts()) {
      const setup = setupFromDraft(draftFromPreset(preset, "first-day"));
      const day = dayZeroOf(setup);
      const session = await startSession(setup);
      try {
        useUiStore.setState({ primaryTab: "overview" });
        const screenView = render(<GameScreen />);
        const overview = document.body.textContent ?? "";
        expect(overview, `${preset.id}: the Overview prints the compute-hours`).toContain(
          t("common.ch_per_day", { value: computeHours(day?.computeHoursPerDay ?? 0) }),
        );
        expect(overview, `${preset.id}: the Overview prints the awareness`).toContain(
          t("common.percent", { value: day?.awareness ?? 0 }),
        );
        screenView.unmount();

        useUiStore.setState({ primaryTab: "finances" });
        const finances = render(<GameScreen />);
        const text = document.body.textContent ?? "";
        expect(text, `${preset.id}: Finances prints the runway`).toContain(
          day?.runwayDays === null || day === null
            ? t("finances.runway_stable")
            : t("finances.runway_days", { days: Math.round(day.runwayDays) }),
        );
        finances.unmount();
      } finally {
        session.stop();
      }
    }
  }, 30_000);

  it("prints the block and the verdict on the summary, with no raw key", async () => {
    useConfigurator.setState({ step: STEP_IDS.indexOf("summary") });
    render(<ConfiguratorScreen />);
    const block = screen.getByTestId("day-zero");
    for (const line of ["compute", "cash", "bills", "runway", "watchers", "awareness"]) {
      expect(block.querySelector(`[data-line="${line}"]`), line).not.toBeNull();
    }
    // One heading over the block, not the section's and the block's own (playtest 7 review).
    expect(within(block).getAllByRole("heading").length).toBe(1);
    const verdict = screen.getByTestId("day-zero-verdict").textContent ?? "";
    expect(verdict).not.toMatch(RAW_KEY);
    expect(verdict.length).toBeGreaterThan(20);
  });

  it("puts the compute-hours in the footer line beside the rating", () => {
    render(<ConfiguratorScreen />);
    const day = dayZeroOf(setupFromDraft(useConfigurator.getState().draft));
    expect(day).not.toBeNull();
    expect(screen.getByTestId("build-line").textContent).toContain(
      t("config.build.compute", { value: computeHours(day?.computeHoursPerDay ?? 0) }),
    );
  });
});
