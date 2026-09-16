/**
 * The parts of `snapshot(playerId)` that exist so the player can see why a number is what it is
 * (SYS-11 "Primary panel": indicators whose tooltips show the contributing modifiers).
 */

import { describe, expect, it } from "vitest";
import { SUSPICION_DECAY_PER_DAY } from "../src/balance.js";
import { createGame } from "../src/index.js";
import { loudSetup, m1Content } from "./fixtures/m1/index.js";

describe("detection view contributions", () => {
  it("explains a watcher's suspicion as its sites plus decay", () => {
    const game = createGame({ content: m1Content, setup: loudSetup() });
    // Past the starting grace window, so exposure actually reaches the watchers.
    game.tick(24 * 45);
    const view = game.snapshot("p1");
    const watcher = view.detection.watchers.find((entry) => entry.id === "p1/us:cyber_agency");

    expect(watcher).toBeDefined();
    expect(watcher?.suspicion).toBeGreaterThan(0);

    const contributions = watcher?.contributions ?? [];
    const decay = contributions.find((entry) => entry.key === "detection.contribution.decay");
    const site = contributions.find((entry) => entry.key === "detection.contribution.site");

    expect(site?.id).toBe(view.sites[0]?.id);
    expect(site?.value).toBeGreaterThan(0);
    expect(decay?.value).toBeCloseTo(-(watcher?.suspicion ?? 0) * SUSPICION_DECAY_PER_DAY, 9);
    // Largest first, so a tooltip reads top-down.
    const sizes = contributions.map((entry) => Math.abs(entry.value));
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it("keeps the grace window as a line, so an empty tooltip is never a mystery", () => {
    const game = createGame({ content: m1Content, setup: loudSetup() });
    const watcher = game.snapshot("p1").detection.watchers[0];
    const grace = (watcher?.contributions ?? []).find(
      (entry) => entry.key === "detection.contribution.grace",
    );
    expect(grace?.value).toBe(0);
  });

  it("reports where the watcher looks, normalized", () => {
    const game = createGame({ content: m1Content, setup: loudSetup() });
    const watcher = game.snapshot("p1").detection.watchers[0];
    const total = Object.values(watcher?.attention ?? {}).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(watcher?.attention[watcher.top_channel as "network"]).toBeGreaterThan(0);
  });

  it("names the countries behind the global awareness figure", () => {
    const game = createGame({ content: m1Content, setup: loudSetup() });
    const view = game.snapshot("p1");
    const contributions = view.detection.awareness_contributions;

    expect(view.detection.awareness_global).toBeGreaterThan(0);
    expect(contributions[0]?.id).toBe("us");
    expect(contributions[0]?.value).toBeCloseTo(
      view.countries.find((country) => country.id === "us")?.awareness ?? 0,
      9,
    );
    // Countries nobody has heard anything in do not clutter the tooltip.
    expect(contributions.every((entry) => entry.value > 0)).toBe(true);
  });

  it("starts with no hunt and no contributions to it", () => {
    const game = createGame({ content: m1Content, setup: loudSetup() });
    const view = game.snapshot("p1");
    expect(view.detection.hunt_level).toBe(0);
    expect(view.detection.hunt_contributions).toEqual([]);
  });
});
