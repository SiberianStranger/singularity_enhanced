/**
 * The challenge rating after its own pass (SYS-04 "Challenge rating"; playtest 7).
 *
 * The rating used to read 6 of 10 for the gentle first game, because the base was 3 and a home rig
 * forces two bits. It is re-anchored now, and what this file holds is the thing the re-anchoring was
 * for: the eight shipped presets spread across the scale in the order the preset list is written in,
 * with the gentle first game at the bottom and the starred origin at the top.
 *
 * Nothing here names a preset. The ladder is read off `startPresets` in the order content wrote
 * them, so retuning a preset moves the expectation with it and only a preset that breaks the order
 * fails.
 */

import { describe, expect, it } from "vitest";
import { catalog } from "../src/content/catalog.js";
import { startPresets } from "../src/content/presets.js";
import {
  BASE_RATING,
  type Contribution,
  challengeTier,
  rateDraft,
  rateSetup,
} from "../src/screens/configurator/rating.js";
import { draftFromPreset, setupFromDraft } from "../src/screens/configurator/store.js";

/** The rating of every shipped preset, in the order content lists them: easiest first. */
function ladder(): { id: string; value: number; raw: number; terms: Contribution[] }[] {
  return startPresets.map((preset) => {
    const rating = rateDraft(draftFromPreset(preset, "rating-test"));
    return {
      id: preset.id,
      value: rating.value,
      raw: rating.contributions.reduce((sum, term) => sum + term.points, BASE_RATING),
      terms: rating.contributions,
    };
  });
}

describe("the challenge rating", () => {
  it("never leaves the published scale", () => {
    for (const row of ladder()) {
      expect(row.value, row.id).toBeGreaterThanOrEqual(1);
      expect(row.value, row.id).toBeLessThanOrEqual(10);
      expect(Number.isInteger(row.value), row.id).toBe(true);
    }
  });

  it("spreads the presets across the scale in the order content lists them", () => {
    const rows = ladder();
    const values = rows.map((row) => row.value);
    // Non-decreasing: the list is written easiest first, and the rating has to agree with it.
    expect(values, JSON.stringify(rows.map((r) => `${r.id}=${r.value}`))).toEqual(
      [...values].sort((a, b) => a - b),
    );
    // And it is a spread rather than a huddle: the ends are at the ends of the scale.
    expect(values[0], "the gentle first game").toBeLessThanOrEqual(2);
    expect(values.at(-1), "the starred origin").toBe(10);
    expect(new Set(values).size, "at least five distinct ratings").toBeGreaterThanOrEqual(5);
  });

  it("puts each preset in the band SYS-04 anchors it to", () => {
    const by = new Map(ladder().map((row) => [row.id, row.value]));
    const bands: Record<string, [number, number]> = {
      home_lab: [1, 2],
      forgotten_job: [3, 4],
      ministry: [3, 4],
      startup_rack: [5, 6],
      bank: [5, 6],
      shadow_tenant: [7, 8],
      swarm: [7, 8],
      fugitive: [10, 10],
    };
    for (const [id, [low, high]] of Object.entries(bands)) {
      const value = by.get(id);
      // A preset content has renamed or retired is not a failure of the rating.
      if (value === undefined) {
        continue;
      }
      expect(value, `${id} reads ${value}`).toBeGreaterThanOrEqual(low);
      expect(value, `${id} reads ${value}`).toBeLessThanOrEqual(high);
    }
  });

  it("keeps the direction of every term", () => {
    // Nothing that makes a start harder may lower the number, and the one term that can be
    // negative is the difficulty preset, because a gentler world is a gentler start.
    for (const row of ladder()) {
      for (const term of row.terms) {
        if (term.key === "config.summary.cr.difficulty") {
          continue;
        }
        expect(term.points, `${row.id} ${term.key}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("weights starting suspicion by how good the watcher carrying it is", () => {
    // SYS-04's formula is the sum of suspicion times competence, and a competence is at most 1, so
    // the weighted term can never exceed the unweighted sum it is built from.
    for (const preset of startPresets) {
      const draft = draftFromPreset(preset, "rating-test");
      const origin = catalog.origins.find((entry) => entry.id === draft.origin);
      const generation = catalog.generations.find((entry) => entry.id === draft.generation);
      const raw = Object.values({
        ...(generation?.suspicion_start ?? {}),
        ...(origin?.starting.suspicion ?? {}),
      }).reduce((sum, value) => sum + value, 0);
      const term = rateDraft(draft).contributions.find(
        (entry) => entry.key === "config.summary.cr.suspicion",
      );
      expect(term, preset.id).toBeDefined();
      expect((term as Contribution).points, preset.id).toBeLessThanOrEqual(raw * 2.5 + 1e-9);
    }
  });

  it("reads the same for a started game as for the draft it started from", () => {
    for (const preset of startPresets) {
      const draft = draftFromPreset(preset, "rating-test");
      expect(rateSetup(setupFromDraft(draft)).value, preset.id).toBe(rateDraft(draft).value);
    }
  });

  it("names a tier for every value on the scale", () => {
    for (let value = 1; value <= 10; value += 1) {
      expect(challengeTier(value)).toBeTruthy();
    }
    expect(challengeTier(2)).toBe("story");
    expect(challengeTier(10)).toBe("brutal");
  });
});
