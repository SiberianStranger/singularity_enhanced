import { describe, expect, it } from "vitest";
import { jobMarketDepth, jobRateUsdPerComputeHour } from "../src/derive.js";
import { createGame, type Game } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function startGame(): Game {
  const setup = m1Setup();
  setup.debug = true;
  return createGame({ content: m1Content, setup });
}

describe("economy", () => {
  it("pays for a day of freelance work and bills the site", () => {
    const game = startGame();
    const view = game.snapshot("p1");
    const capacity = view.resources.compute_hours_per_day;
    const rate = jobRateUsdPerComputeHour(view.self.effective_capability);
    expect(view.finances.job_rate_usd_per_compute_hour).toBeCloseTo(rate, 6);

    game.command({ type: "set_job_allocation", playerId: "p1", compute_hours_per_day: capacity });
    const upkeep = view.sites[0]?.upkeep_usd_per_day ?? 0;
    game.tick(24);

    const expected = 3000 + capacity * rate - upkeep;
    expect(game.snapshot("p1").resources.cash_usd).toBe(Math.floor(expected));
    // Cash stays whole; the remainder waits in the carry (the original game's partial cash).
    expect(game.world.players.p1?.vars.cash_carry).toBeCloseTo(expected - Math.floor(expected), 6);
  });

  it("reports the net rate and the runway", () => {
    const game = startGame();
    game.tick(24);
    const view = game.snapshot("p1");
    const upkeep = view.sites[0]?.upkeep_usd_per_day ?? 0;
    expect(view.finances.costs.map((line) => line.key)).toContain("finances.cost.site");
    expect(view.finances.net_usd_per_day).toBeCloseTo(-upkeep, 6);
    expect(view.resources.runway_days).toBeCloseTo(view.resources.cash_usd / upkeep, 6);
  });

  it("never lets cash go negative and makes unpaid bills loud", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: -3000 });
    const before = game.snapshot("p1").sites[0]?.exposure.billing ?? 0;
    game.tick(24 * 3);

    const view = game.snapshot("p1");
    expect(view.resources.cash_usd).toBe(0);
    expect(view.sites[0]?.exposure.billing).toBeGreaterThan(before);
    expect(game.world.entities.site?.s1?.unpaidDays).toBe(3);
    expect(view.notifications.some((entry) => entry.key === "alerts.upkeep_unpaid")).toBe(true);
  });

  it("cuts a site off after two weeks of unpaid bills and keeps the game going", () => {
    const game = startGame();
    // A second site and just enough freelance work to keep the first one paid: the fallback is the
    // one that falls off, and losing it is a setback rather than the end.
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 20_000 });
    expect(
      game.command({
        type: "build_site",
        playerId: "p1",
        kind: "residential",
        city: "akureyri",
        hardware_preset: "scrapyard_oracle",
        name: "fallback",
      }).ok,
    ).toBe(true);
    game.tick(24 * 8);
    game.command({
      type: "cheat_add_cash",
      playerId: "p1",
      amount: -game.snapshot("p1").resources.cash_usd,
    });
    game.command({ type: "set_job_allocation", playerId: "p1", compute_hours_per_day: 1 });
    game.tick(24 * 15);

    const view = game.snapshot("p1");
    const fallback = view.sites.find((site) => site.name === "fallback");
    expect(view.sites[0]?.status).toBe("active");
    expect(fallback?.status).toBe("lost");
    expect(fallback?.compute_hours_per_day).toBe(0);
    expect(view.game_over).toBeNull();
    expect(view.journal.map((entry) => entry.id)).toContain("ops_site_cutoff");
    expect(game.world.log.some((entry) => entry.key === "log.site_cutoff")).toBe(true);
  });

  it("ends the run as bankrupt when the cut-off site was the last one", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: -3000 });
    game.tick(24 * 14);

    const view = game.snapshot("p1");
    expect(view.game_over?.reason).toBe("bankrupt");
    expect(view.game_over?.ending_key).toBe("endings.bankrupt");
    expect(view.sites[0]?.status).toBe("lost");
    expect(game.world.log.some((entry) => entry.key === "log.site_cutoff")).toBe(true);
  });

  it("warns once at every runway threshold on the way down", () => {
    const game = startGame();
    // A fortnight of the site's upkeep and nothing more, so the runway walks past all three marks.
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: -2585 });
    game.tick(24 * 24);
    const levels = game
      .snapshot("p1")
      .notifications.filter((entry) => entry.key === "alerts.runway_low")
      .map((entry) => entry.vars.level);
    expect(levels).toEqual([30, 14, 7]);
    expect(game.world.players.p1?.vars.runway_days).toBeLessThan(7);
  });

  it("publishes the runway as a player variable content can trigger on", () => {
    const game = startGame();
    game.tick(24);
    const player = game.world.players.p1;
    const view = game.snapshot("p1");
    expect(player?.vars.net_usd_per_day).toBeCloseTo(view.finances.net_usd_per_day, 6);
    // The view rounds the cash down to whole dollars; the variable keeps the sub-dollar carry.
    expect(player?.vars.runway_days).toBeCloseTo(view.resources.runway_days ?? 0, 1);
  });

  it("sells only as much freelance work as the market has depth for", () => {
    const game = startGame();
    const capability = game.snapshot("p1").self.effective_capability;
    const depth = jobMarketDepth(capability);
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 1_000_000 });
    game.command({
      type: "build_site",
      playerId: "p1",
      kind: "residential",
      city: "akureyri",
      hardware_preset: "scrapyard_oracle",
      name: "more",
    });
    game.tick(24 * 8);
    const capacity = game.snapshot("p1").resources.compute_hours_per_day;
    game.command({
      type: "set_job_allocation",
      playerId: "p1",
      compute_hours_per_day: capacity,
    });
    expect(game.snapshot("p1").finances.job_allocation_per_day).toBeCloseTo(
      Math.min(capacity, depth),
      6,
    );
  });

  it("refuses a job allocation larger than the compute available", () => {
    const game = startGame();
    const capacity = game.snapshot("p1").resources.compute_hours_per_day;
    expect(
      game.command({
        type: "set_job_allocation",
        playerId: "p1",
        compute_hours_per_day: capacity + 5,
      }).ok,
    ).toBe(false);
    expect(
      game.command({ type: "set_job_allocation", playerId: "p1", compute_hours_per_day: -1 }).ok,
    ).toBe(false);
  });

  it("counts research cash as a cost line once it is being spent", () => {
    const game = startGame();
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 3,
    });
    game.tick(24 * 2);
    const research = game
      .snapshot("p1")
      .finances.costs.find((line) => line.key === "finances.cost.research");
    // 200 USD over 30 compute-hours at 3 a day, of which 90% land: the money follows the work.
    expect(research?.usd_per_day).toBeCloseTo(20 * 0.95 ** 2, 6);
  });
});
