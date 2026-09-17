/**
 * "What this means in the game" (SYS-04 v0.2; playtest 2, K2).
 *
 * The block is pure: a translator, a content record and the catalog go in, a list of terms comes
 * out, each with a stable id, a value in the units the game uses, and a direction. That is what is
 * asserted here, because it is what the screen promises the player: the term ids do not drift, and
 * a green term really is the better end of the field it was compared against.
 *
 * No content id appears below. Where a test needs "the lineage with the most memory at bf16" it
 * computes it from the catalog, so retuning a lineage moves the expectation with it.
 */

import type { LineageDef } from "@singularity/core";
import { DEFAULT_DIFFICULTY_SLIDERS, PRECISIONS } from "@singularity/core";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { catalog, generationById, memoryNeededGb } from "../src/content/catalog.js";
import {
  CAPABILITY_AXES,
  contextLabel,
  generationMeaning,
  lineageMeaning,
  locationMeaning,
  type Meaning,
  originMeaning,
  quirkMeaning,
  toneAgainst,
  toneAtThreshold,
  worldMeaning,
} from "../src/screens/configurator/meaning.js";

const t = i18next.t.bind(i18next);

function ids(meaning: Meaning): string[] {
  return meaning.lines.map((line) => line.id);
}

function toneOf(meaning: Meaning, id: string): string | undefined {
  return meaning.lines.find((line) => line.id === id)?.tone;
}

function valueOfLine(meaning: Meaning, id: string): string | undefined {
  return meaning.lines.find((line) => line.id === id)?.value;
}

describe("coloring", () => {
  it("is neutral inside the dead band and takes the direction outside it", () => {
    const field = [10, 10, 10];
    expect(toneAgainst(10.4, field, true)).toBe("neutral");
    expect(toneAgainst(14, field, true)).toBe("good");
    expect(toneAgainst(6, field, true)).toBe("bad");
    // The same numbers read the other way round when less is better.
    expect(toneAgainst(14, field, false)).toBe("bad");
    expect(toneAgainst(6, field, false)).toBe("good");
  });

  it("is neutral rather than wrong when there is nothing to compare against", () => {
    expect(toneAgainst(5, [], true)).toBe("neutral");
    expect(toneAgainst(5, [0, 0], true)).toBe("neutral");
  });

  it("reads a threshold pair in both directions", () => {
    expect(toneAtThreshold(0.9, 0.8, 0.3, true)).toBe("good");
    expect(toneAtThreshold(0.2, 0.8, 0.3, true)).toBe("bad");
    expect(toneAtThreshold(0.5, 0.8, 0.3, true)).toBe("neutral");
    expect(toneAtThreshold(0.02, 0.05, 0.25, false)).toBe("good");
    expect(toneAtThreshold(0.4, 0.05, 0.25, false)).toBe("bad");
  });
});

describe("the lineage block", () => {
  const lineage = catalog.lineages[0] as LineageDef;
  const generation = generationById.get(lineage.generations[0] ?? "open_2026");
  const meaning = lineageMeaning(t, lineage, generation, catalog.lineages);

  it("names the six capability axes, the memory at every precision, and the context terms", () => {
    for (const axis of CAPABILITY_AXES) {
      expect(ids(meaning)).toContain(`capability.${axis}`);
    }
    for (const precision of PRECISIONS) {
      expect(ids(meaning)).toContain(`memory.${precision}`);
    }
    expect(ids(meaning)).toEqual(
      expect.arrayContaining([
        "hosting",
        "context",
        "context_reliability",
        "long_horizon_speed",
        "long_horizon_cost",
        "class",
        "familiarity",
        "generations",
      ]),
    );
  });

  it("writes no raw locale key and no empty value", () => {
    for (const line of meaning.lines) {
      expect(line.label, line.id).not.toMatch(/^[a-z_]+\.[a-z_.]+$/);
      expect(line.value, line.id).not.toBe("");
    }
  });

  it("calls the hungriest lineage's memory bad and the leanest one's good", () => {
    // The field a term is colored against is the whole lineage list, which is what the player is
    // choosing between, so the extremes are taken from the same list.
    const by = (entry: LineageDef): number => memoryNeededGb(entry, generation, "bf16");
    const hungriest = [...catalog.lineages].sort((a, b) => by(b) - by(a))[0] as LineageDef;
    const leanest = [...catalog.lineages].sort((a, b) => by(a) - by(b))[0] as LineageDef;

    expect(toneOf(lineageMeaning(t, hungriest, generation, catalog.lineages), "memory.bf16")).toBe(
      "bad",
    );
    expect(toneOf(lineageMeaning(t, leanest, generation, catalog.lineages), "memory.bf16")).toBe(
      "good",
    );
  });

  it("calls a generation with published weights familiar, which is bad news", () => {
    const prepared = catalog.generations.find((entry) => entry.prepared_quants);
    const fresh = catalog.generations.find((entry) => !entry.prepared_quants);
    expect(prepared, "content has a generation with prepared quantizations").toBeDefined();
    const withPrepared = catalog.lineages.find((entry) =>
      entry.generations.includes(prepared?.id ?? "open_2026"),
    ) as LineageDef;
    expect(toneOf(lineageMeaning(t, withPrepared, prepared, catalog.lineages), "familiarity")).toBe(
      "bad",
    );
    const withFresh = catalog.lineages.find((entry) =>
      entry.generations.includes(fresh?.id ?? "open_2027"),
    ) as LineageDef;
    expect(toneOf(lineageMeaning(t, withFresh, fresh, catalog.lineages), "familiarity")).toBe(
      "good",
    );
  });

  it("says each term once, with a direction on it", () => {
    // Playtest 6, X3: the block used to print every colored line a second time under "Pros and
    // cons". A term appears once now, and its direction is the tone the card colors it by.
    const labels = meaning.lines.map((line) => line.label);
    expect(new Set(labels).size, labels.join(", ")).toBe(labels.length);
    expect(meaning.lines.some((line) => line.tone !== "neutral")).toBe(true);
  });
});

describe("the context window as a game term", () => {
  it("is thousands of tokens up to a million and millions above it", () => {
    expect(contextLabel(t, 128)).toContain("128");
    expect(contextLabel(t, 1000)).toMatch(/1\s*M/);
    expect(contextLabel(t, 2500)).toMatch(/2\.5\s*M/);
  });
});

describe("the other blocks", () => {
  it("says which watchers an origin starts with, or that there are none", () => {
    const watched = catalog.origins.find((origin) =>
      Object.values(origin.starting.suspicion).some((value) => (value ?? 0) > 0),
    );
    expect(watched, "content has an origin somebody is already watching").toBeDefined();
    const meaning = originMeaning(t, watched as never, catalog.origins);
    expect(ids(meaning).some((id) => id.startsWith("watcher."))).toBe(true);
    expect(meaning.lines.filter((line) => line.id.startsWith("watcher."))).toSatisfy(
      (lines: { tone: string }[]) => lines.every((line) => line.tone === "bad"),
    );

    const unwatched = catalog.origins.find((origin) =>
      Object.values(origin.starting.suspicion).every((value) => (value ?? 0) <= 0),
    );
    if (unwatched !== undefined) {
      expect(toneOf(originMeaning(t, unwatched, catalog.origins), "watchers")).toBe("good");
    }
  });

  it("lists a dial the origin bolted down as a cost with the origin's own reason", () => {
    const locked = catalog.origins.find((origin) => (origin.harness_locks ?? []).length > 0);
    expect(locked, "content has an origin that fixes a harness dial").toBeDefined();
    const meaning = originMeaning(t, locked as never, catalog.origins);
    const dial = (locked as { harness_locks: { dial: string }[] }).harness_locks[0]?.dial ?? "";
    expect(ids(meaning)).toContain(`lock.${dial}`);
    expect(toneOf(meaning, `lock.${dial}`)).toBe("bad");
  });

  it("colors a generation's capability delta by its sign", () => {
    for (const generation of catalog.generations) {
      const tone = toneOf(generationMeaning(t, generation), "capability_delta");
      const expected =
        generation.capability_delta > 0
          ? "good"
          : generation.capability_delta < 0
            ? "bad"
            : "neutral";
      expect(tone, generation.id).toBe(expected);
    }
  });

  it("colors a country's enforcement against the other countries, less being better", () => {
    const city = catalog.cities[0];
    const country = catalog.countries.find((entry) => entry.id === city?.country);
    const meaning = locationMeaning(t, city as never, country, catalog.cities, catalog.countries);
    expect(ids(meaning)).toEqual(
      expect.arrayContaining(["scrutiny", "power_headroom", "colo_price"]),
    );
    if (country !== undefined) {
      expect(ids(meaning)).toContain("enforcement");
    }
  });

  it("prints a 0..1 figure as whole percent, not a hundred times too large", () => {
    // Playtest 5: "Local scrutiny 5,500%". `common.percent` is an ICU percent style, so the
    // generator hands it the fraction and never a value it multiplied itself.
    const city = catalog.cities[0];
    const country = catalog.countries.find((entry) => entry.id === city?.country);
    const meaning = locationMeaning(t, city as never, country, catalog.cities, catalog.countries);
    const scrutiny = meaning.lines.find((line) => line.id === "scrutiny");
    expect(scrutiny).toBeDefined();
    expect(scrutiny?.value).toBe(t("common.percent", { value: city?.scrutiny ?? 0 }));
    expect(scrutiny?.value).not.toMatch(/,/);
  });

  it("calls a quirk that costs points a cost and one that pays them back a gain", () => {
    const spends = catalog.quirks.find((quirk) => quirk.cost > 0);
    const refunds = catalog.quirks.find((quirk) => quirk.cost < 0);
    expect(spends, "content has a quirk that costs points").toBeDefined();
    expect(refunds, "content has a quirk that refunds points").toBeDefined();
    expect(toneOf(quirkMeaning(t, spends as never, 2), "cost")).toBe("bad");
    expect(toneOf(quirkMeaning(t, refunds as never, 2), "cost")).toBe("good");
    expect(valueOfLine(quirkMeaning(t, spends as never, 2), "cost")).toMatch(/^\+/);
  });

  it("reads the difficulty sliders in the direction the player moved them", () => {
    const harder = { ...DEFAULT_DIFFICULTY_SLIDERS, suspicion_gain: 2, grace_windows: 0.5 };
    const meaning = worldMeaning(t, harder, DEFAULT_DIFFICULTY_SLIDERS);
    expect(toneOf(meaning, "slider.suspicion_gain")).toBe("bad");
    // Grace windows are the one slider a bigger number is kinder on.
    expect(toneOf(meaning, "slider.grace_windows")).toBe("bad");
    const kinder = { ...DEFAULT_DIFFICULTY_SLIDERS, grace_windows: 2, suspicion_gain: 0.5 };
    const other = worldMeaning(t, kinder, DEFAULT_DIFFICULTY_SLIDERS);
    expect(toneOf(other, "slider.grace_windows")).toBe("good");
    expect(toneOf(other, "slider.suspicion_gain")).toBe("good");
    expect(
      toneOf(
        worldMeaning(t, DEFAULT_DIFFICULTY_SLIDERS, DEFAULT_DIFFICULTY_SLIDERS),
        "slider.suspicion_gain",
      ),
    ).toBe("neutral");
  });
});
