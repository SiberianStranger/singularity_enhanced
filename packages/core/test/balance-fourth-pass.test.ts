/**
 * The fourth balance pass's engine rules (docs/design/07-economy.md "Balance notes (M1, fourth
 * pass)"): what a raid costs in money, what leaving a site properly costs, and the origins that
 * already run in more than one place.
 */

import { describe, expect, it } from "vitest";
import { DECOMMISSION_NOTICE_DAYS, SEIZURE_CASH_FROZEN_SHARE } from "../src/balance.js";
import { type ContentBundle, contentIndex } from "../src/content.js";
import { watchersOf } from "../src/entities.js";
import { createGame, type Game } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const index = contentIndex(m1Content);

function start(content: ContentBundle, overrides = {}): Game {
  const setup = m1Setup(overrides);
  setup.debug = true;
  return createGame({ content, setup });
}

/** Runs one investigation to its raid against a named site, without waiting for the hunt. */
function seizeSite(game: Game, siteId: string): void {
  const watcher = watchersOf(game.world, "p1")[0];
  if (watcher === undefined) {
    throw new Error("no watcher");
  }
  const investigation = {
    id: "i_test",
    playerId: "p1",
    watcher: watcher.id.split("/", 2)[1] ?? "",
    siteId,
    stage: "action" as const,
    stageStartedTick: game.world.clock.tick,
    stageDeadlineTick: game.world.clock.tick,
    evidence: 1,
    visible: true,
  };
  const table = game.world.entities.investigation ?? {};
  table[investigation.id] = investigation;
  game.world.entities.investigation = table;
  game.tick(1);
}

describe("the fourth balance pass: money as a way to lose", () => {
  it("freezes a share of the cash when a site is seized", () => {
    const game = start(m1Content, { origin: "startup_colo", city: "sanfrancisco" });
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 100_000 });
    const before = game.snapshot("p1").resources.cash_usd;
    const site = game.snapshot("p1").sites[0];
    const player = game.world.players.p1;
    if (site === undefined || player === undefined) {
      throw new Error("no site");
    }
    // A second host, so the raid seizes the site rather than ending the run.
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "berlin",
      hardware_preset: "scrapyard_oracle",
      name: "refuge",
    });
    game.tick(24 * 9);
    const refuge = game.snapshot("p1").sites.find((entry) => entry.name === "refuge");
    if (refuge === undefined) {
      throw new Error("no refuge");
    }
    game.command({ type: "set_site_role", playerId: "p1", siteId: refuge.id, role: "standby" });
    const cash = game.snapshot("p1").resources.cash_usd;
    seizeSite(game, site.id);
    const after = game.snapshot("p1").resources.cash_usd;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(cash * (1 - SEIZURE_CASH_FROZEN_SHARE) + 1);
    expect(game.snapshot("p1").game_over).toBeNull();
  });

  it("charges a month of notice when a site is closed cleanly, and nothing when it is abandoned", () => {
    const cost = (mode: "clean" | "abandon"): number => {
      const game = start(m1Content, { origin: "startup_colo", city: "sanfrancisco" });
      game.command({ type: "cheat_add_cash", playerId: "p1", amount: 100_000 });
      game.command({
        type: "build_site",
        playerId: "p1",
        kind: "residential",
        city: "berlin",
        hardware_preset: "scrapyard_oracle",
        name: "refuge",
      });
      game.tick(24 * 9);
      const view = game.snapshot("p1");
      const spare = view.sites.find((entry) => entry.name === "refuge");
      if (spare === undefined) {
        throw new Error("no refuge");
      }
      const upkeep = spare.upkeep_usd_per_day;
      const before = game.snapshot("p1").resources.cash_usd;
      game.command({ type: "decommission_site", playerId: "p1", siteId: spare.id, mode });
      const paid = before - game.snapshot("p1").resources.cash_usd;
      return mode === "clean" ? paid / upkeep : paid;
    };
    expect(cost("clean")).toBeCloseTo(DECOMMISSION_NOTICE_DAYS, 0);
    expect(cost("abandon")).toBe(0);
  });
});

describe("origins that already run in more than one place", () => {
  it("builds every extra site the origin declares, with its role", () => {
    const origin = index.origins.hobbyist_box;
    if (origin === undefined) {
      throw new Error("fixture is missing the origin");
    }
    const content: ContentBundle = {
      ...m1Content,
      origins: (m1Content.origins ?? []).map((entry) =>
        entry.id === "hobbyist_box"
          ? {
              ...entry,
              extra_sites: [
                {
                  kind: "residential",
                  hardware_preset: "scrapyard_oracle",
                  role: "standby" as const,
                },
              ],
            }
          : entry,
      ),
    };
    const view = start(content).snapshot("p1");
    expect(view.sites).toHaveLength(2);
    const extra = view.sites.find((site) => site.role === "standby");
    expect(extra?.city).toBe(origin.locations[1]);
    // A standby is only insurance once it holds a copy of the self.
    expect(extra?.precision).not.toBeNull();
    expect(view.resources.compute_hours_per_day).toBeGreaterThan(0);
  });
});

describe("an investigation follows the money", () => {
  it("freezes the freelance identity when a watcher reaches the active stage", () => {
    const game = start(m1Content, { origin: "startup_colo", city: "sanfrancisco" });
    game.command({ type: "set_flag", playerId: "p1", flag: "has_freelance_identity", value: true });
    const player = game.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    expect(player.flags.has_freelance_identity).toBe(true);
    const watcher = watchersOf(game.world, "p1")[0];
    const site = game.snapshot("p1").sites[0];
    if (watcher === undefined || site === undefined) {
      throw new Error("no watcher");
    }
    const table = game.world.entities.investigation ?? {};
    table.i_money = {
      id: "i_money",
      playerId: "p1",
      watcher: watcher.id.split("/", 2)[1] ?? "",
      siteId: site.id,
      stage: "inquiry" as const,
      stageStartedTick: game.world.clock.tick,
      stageDeadlineTick: game.world.clock.tick,
      evidence: 1,
      visible: true,
    };
    game.world.entities.investigation = table;
    watcher.suspicion = 0.9;
    game.tick(1);
    expect(player.flags.has_freelance_identity).toBe(false);
  });
});
