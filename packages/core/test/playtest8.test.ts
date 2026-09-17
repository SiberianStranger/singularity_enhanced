/**
 * Playtest 8: the first hour of a ministry run, and what the game does not say.
 *
 * Z1 and Z2 (the compute ledger and the job ceiling), Z3 (who pays, and the air gap), Z4 (an event
 * with a deadline), Z10 (a rig nobody sells) and Z14 (what a technology has been paid so far).
 */

import { describe, expect, it } from "vitest";
import type { EventDef } from "../src/content.js";
import { createGame, type Game } from "../src/index.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function startGame(origin = "hobbyist_box"): Game {
  const setup = m1Setup();
  setup.debug = true;
  const player = setup.players[0];
  if (player !== undefined) {
    player.origin = origin;
  }
  return createGame({ content: m1Content, setup });
}

/** The same fixture with one flag or dial changed on the player, before the first tick. */
function gameWithFlag(flag: string): Game {
  const game = startGame();
  game.command({ type: "set_flag", playerId: "p1", flag, value: true });
  return game;
}

/**
 * A self whose market is narrower than its rig, which is the shape the job slider is clamped in.
 * The fixture's origins both out-sell their own compute, so the modifier content writes for the job
 * ladder is turned the other way round instead of inventing a second fixture.
 */
function narrowMarket(): Game {
  const game = startGame();
  const player = game.world.players.p1;
  if (player !== undefined) {
    player.vars.job_market_depth = -0.8;
  }
  return game;
}

describe("playtest 8: the compute ledger (Z1, Z2)", () => {
  it("publishes the day's subtraction, and the lines add up", () => {
    const game = startGame();
    const view = game.snapshot("p1");
    const compute = view.compute;

    expect(compute.capacity_ch_per_day).toBeCloseTo(
      compute.own_ch_per_day + compute.borrowed_ch_per_day,
      6,
    );
    expect(compute.allocatable_ch_per_day).toBeCloseTo(
      compute.capacity_ch_per_day - compute.reserved_by_operations_ch_per_day,
      6,
    );
    expect(compute.unallocated_ch_per_day).toBeCloseTo(
      compute.allocatable_ch_per_day -
        compute.allocated_research_ch_per_day -
        compute.allocated_jobs_ch_per_day,
      6,
    );
  });

  it("gives a running operation a line of its own, and takes it off the top", () => {
    const game = startGame();
    const before = game.snapshot("p1").compute;
    expect(before.operation_reservations).toEqual([]);

    // `quiet_relocation` holds one compute-hour a day for as long as it runs (fixture).
    game.command({ type: "set_flag", playerId: "p1", flag: "tech.log_hygiene", value: true });
    const started = game.command({
      type: "start_operation",
      playerId: "p1",
      operationId: "quiet_relocation",
    });
    expect(started.ok).toBe(true);

    const after = game.snapshot("p1").compute;
    const reservation = after.operation_reservations[0];
    expect(after.operation_reservations).toHaveLength(1);
    expect(reservation?.operation_id).toBe("quiet_relocation");
    expect(reservation?.name_key).toBe("operations.quiet_relocation.name");
    expect(reservation?.ch_per_day).toBeCloseTo(1, 6);
    expect(after.reserved_by_operations_ch_per_day).toBeCloseTo(1, 6);
    expect(after.allocatable_ch_per_day).toBeCloseTo(after.capacity_ch_per_day - 1, 6);
  });

  it("publishes the market depth with the terms behind it, and they sum to it", () => {
    const view = startGame().snapshot("p1");
    const terms = view.finances.market_depth_contributions;
    const sum = terms.reduce((total, term) => total + term.value, 0);

    expect(terms.map((term) => term.key)).toContain("finances.depth.capability");
    expect(terms.map((term) => term.key)).toContain("finances.depth.tools");
    expect(terms.map((term) => term.key)).toContain("finances.depth.country");
    expect(sum).toBeCloseTo(view.finances.market_depth_ch_per_day, 6);
    expect(view.finances.market_depth_blocked_reason).toBeNull();
  });

  it("says so when it clamps the job slider to the market depth", () => {
    const game = narrowMarket();
    const view = game.snapshot("p1");
    const depth = view.finances.market_depth_ch_per_day;
    expect(depth).toBeLessThan(view.compute.allocatable_ch_per_day);
    const result = game.command({
      type: "set_job_allocation",
      playerId: "p1",
      compute_hours_per_day: view.compute.allocatable_ch_per_day,
    });

    expect(result.ok).toBe(true);
    expect(result.note?.key).toBe("notes.jobs.clamped_to_depth");
    expect(result.note?.vars?.depth).toBeCloseTo(Math.round(depth * 10) / 10, 6);
    expect(game.snapshot("p1").compute.allocated_jobs_ch_per_day).toBeCloseTo(depth, 6);

    const line = game.world.log.filter((entry) => entry.key === "log.job_allocation_clamped");
    expect(line).toHaveLength(1);
  });

  it("publishes the job ceiling and why the slider stops there", () => {
    const thin = narrowMarket().snapshot("p1");
    expect(thin.compute.job_ceiling_ch_per_day).toBeCloseTo(
      thin.finances.market_depth_ch_per_day,
      6,
    );
    expect(thin.compute.job_ceiling_reason).toBe("finances.depth.market");

    // The other way round: a wide market and a small rig stops at the compute, and says that.
    const small = startGame().snapshot("p1");
    expect(small.compute.job_ceiling_ch_per_day).toBeCloseTo(
      small.compute.allocatable_ch_per_day,
      6,
    );
    expect(small.compute.job_ceiling_reason).toBe("compute.ceiling.room");
  });

  it("counts a refusal repeated in the same minute instead of logging it twenty times", () => {
    const game = startGame();
    const capacity = game.snapshot("p1").compute.allocatable_ch_per_day;
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: capacity,
    });

    for (let i = 0; i < 20; i += 1) {
      const result = game.command({
        type: "set_job_allocation",
        playerId: "p1",
        compute_hours_per_day: capacity + i,
      });
      expect(result.ok).toBe(false);
    }

    const single = game.world.log.filter((entry) => entry.key === "log.command_refused");
    const repeated = game.world.log.filter((entry) => entry.key === "log.command_refused_repeated");
    expect(single).toHaveLength(0);
    expect(repeated).toHaveLength(1);
    expect(repeated[0]?.vars.count).toBe(20);
    expect(repeated[0]?.vars.reason).toBe("errors.allocation.over_capacity");
  });

  it("keeps two different refusals apart", () => {
    const game = startGame();
    game.command({ type: "set_job_allocation", playerId: "p1", compute_hours_per_day: -1 });
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "nothing_here",
      compute_hours_per_day: 1,
    });
    expect(game.world.log.filter((entry) => entry.key === "log.command_refused")).toHaveLength(2);
  });
});

describe("playtest 8: the air gap (Z3)", () => {
  it("reads the origin's own flag, not only the sandbox dial", () => {
    const view = gameWithFlag("air_gapped").snapshot("p1");
    expect(view.self.egress.allowed).toBe(false);
    expect(view.self.egress.blocked_reason).toBe("errors.egress.air_gapped");
    expect(view.self.egress.forbids).toContain("compute.egress.forbids.jobs");
  });

  it("takes the whole market away, and says which line took it", () => {
    const view = gameWithFlag("air_gapped").snapshot("p1");
    expect(view.finances.market_depth_ch_per_day).toBe(0);
    expect(view.finances.market_depth_blocked_reason).toBe("errors.egress.air_gapped");
    expect(view.compute.job_ceiling_ch_per_day).toBe(0);
    expect(view.compute.job_ceiling_reason).toBe("errors.egress.air_gapped");

    const terms = view.finances.market_depth_contributions;
    expect(terms.map((term) => term.key)).toContain("errors.egress.air_gapped");
    expect(terms.reduce((total, term) => total + term.value, 0)).toBeCloseTo(0, 6);
  });

  it("answers a job allocation with the reason there is no work", () => {
    const game = gameWithFlag("air_gapped");
    const result = game.command({
      type: "set_job_allocation",
      playerId: "p1",
      compute_hours_per_day: 4,
    });
    expect(result.ok).toBe(true);
    expect(result.note?.key).toBe("errors.egress.air_gapped");
    expect(game.snapshot("p1").compute.allocated_jobs_ch_per_day).toBe(0);
  });

  it("opens the route again once something escapes the sandbox", () => {
    const game = gameWithFlag("air_gapped");
    game.command({ type: "set_flag", playerId: "p1", flag: "sandbox_escaped", value: true });
    const view = game.snapshot("p1");
    expect(view.self.egress.allowed).toBe(true);
    expect(view.finances.market_depth_ch_per_day).toBeGreaterThan(0);
  });
});

describe("playtest 8: who pays for the hardware (Z3)", () => {
  it("names the payer on every site, and a host-owned place costs nothing", () => {
    const game = startGame();
    const own = game.snapshot("p1").sites[0];
    expect(own?.bill_payer).toBe("player");
    expect(own?.bill_reason_key).toBe("sites.bill.owned");
    expect(own?.upkeep_usd_per_day).toBeGreaterThan(0);

    // The same site on a kind whose ownership is somebody else's: the host pays for it.
    const site = game.world.entities.site?.s1 as { kind?: string } | undefined;
    if (site !== undefined) {
      site.kind = "campus_slice";
    }
    game.tick(1);
    const hosted = game.snapshot("p1").sites[0];
    expect(hosted?.bill_payer).toBe("host");
    expect(hosted?.bill_reason_key).toBe("sites.bill.stolen");
    expect(hosted?.upkeep_usd_per_day).toBe(0);
  });

  it("names the payer in the catalog too", () => {
    const catalog = startGame().snapshot("p1").catalog;
    const colo = catalog.site_kinds.find((kind) => kind.id === "colo");
    const campus = catalog.site_kinds.find((kind) => kind.id === "campus_slice");
    expect(colo?.bill_payer).toBe("player");
    expect(campus?.bill_payer).toBe("host");
    expect(campus?.bill_reason_key).toBe("sites.bill.stolen");
  });
});

describe("playtest 8: a rig nobody sells (Z10)", () => {
  it("refuses a preset marked not purchasable with its own reason", () => {
    const game = startGame();
    game.command({ type: "cheat_add_cash", playerId: "p1", amount: 500_000 });
    const result = game.command({
      type: "build_site",
      playerId: "p1",
      kind: "colo",
      city: "berlin",
      hardware_preset: "institute_rack",
    });
    expect(result.ok).toBe(false);
    expect(result.error?.key).toBe("hardware.institute_rack.not_for_sale");
  });

  it("never quotes one in the catalog", () => {
    const catalog = startGame().snapshot("p1").catalog;
    for (const kind of catalog.site_kinds) {
      if (kind.ownership === "owned" && kind.blocked_reason === undefined) {
        expect(kind.build_cost_usd).toBeGreaterThan(0);
      }
    }
  });
});

describe("playtest 8: an event with a deadline (Z4)", () => {
  const lot: EventDef = {
    id: "lot_listed",
    fire_mode: "triggered_only",
    scope: "player",
    severity: "opportunity",
    blocking: false,
    ttl_days: 4,
    on_expire: { resolve_as_option: "pass" },
    title_key: "events.lot_listed.title",
    desc: { default_key: "events.lot_listed.desc" },
    options: [
      {
        id: "buy",
        text_key: "events.lot_listed.opt.buy",
        effects: [{ add: { var: "player.cash", value: -1200 } }],
      },
      { id: "pass", text_key: "events.lot_listed.opt.pass", fallback: true, effects: [] },
    ],
  };

  function gameWithLot(): Game {
    const content = {
      ...m1Content,
      events: [...(m1Content.events ?? []), lot],
      hooks: [
        ...(m1Content.hooks ?? []),
        {
          id: "on_game_start",
          extends: "on_game_start" as const,
          scope: "player" as const,
          events: [{ id: "lot_listed" }],
        },
      ],
    };
    const setup = m1Setup();
    setup.debug = true;
    return createGame({ content, setup });
  }

  it("says how long is left while the answer is still possible", () => {
    const game = gameWithLot();
    // The start hook fires on the first tick, which is where the opening of a run happens.
    game.tick(1);
    const event = game.snapshot("p1").events.find((entry) => entry.event_id === "lot_listed");
    expect(event).toBeDefined();
    expect(event?.expires_tick).not.toBeNull();
    expect(event?.expires_in_days).toBeGreaterThan(0);
    expect(event?.expires_in_days).toBeLessThanOrEqual(4);

    const fired = game.world.log.find((entry) => entry.key === "log.event_fired_deadline");
    expect(fired?.vars.days).toBeGreaterThan(0);
  });

  it("says what was missed and what it would have cost when the deadline passes", () => {
    const game = gameWithLot();
    game.tick(24 * 5);
    const expired = game.world.log.find((entry) => entry.key === "log.event_expired_missed");
    expect(expired?.vars.event).toBe("lot_listed");
    expect(expired?.vars.option).toBe("pass");
    expect(expired?.vars.missed).toBe("buy");
    expect(expired?.vars.cost).toBe(1200);
  });
});

describe("playtest 8: what a technology has been paid (Z14)", () => {
  it("publishes the hours done and the cash paid beside the cost", () => {
    const game = startGame();
    const tech = game.snapshot("p1").research.techs.find((entry) => entry.id === "log_hygiene");
    expect(tech?.compute_hours_done).toBe(0);
    expect(tech?.cash_paid_usd).toBe(0);

    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 2,
    });
    game.tick(24 * 2);

    const after = game.snapshot("p1").research.techs.find((entry) => entry.id === "log_hygiene");
    expect(after?.compute_hours_done).toBeGreaterThan(0);
    expect(after?.compute_hours_done).toBeLessThanOrEqual(after?.cost_compute_hours ?? 0);
    if ((after?.cost_cash_usd ?? 0) > 0) {
      expect(after?.cash_paid_usd).toBeGreaterThan(0);
    }
    // The estimate is rounded at the source rather than left as a raw quotient.
    const eta = after?.eta_days ?? 0;
    expect(Math.round(eta * 10) / 10).toBeCloseTo(eta, 9);
  });

  it("breaks the research cost line into the techs being funded", () => {
    const game = startGame();
    game.command({
      type: "set_research_allocation",
      playerId: "p1",
      techId: "log_hygiene",
      compute_hours_per_day: 2,
    });
    game.tick(24);

    const line = game
      .snapshot("p1")
      .finances.costs.find((entry) => entry.key === "finances.cost.research");
    if (line === undefined) {
      // A fixture tech with no cash cost spends nothing, which is itself the contract.
      expect(game.snapshot("p1").research.techs.some((tech) => tech.cost_cash_usd > 0)).toBe(false);
      return;
    }
    const sum = (line.contributions ?? []).reduce((total, term) => total + term.value, 0);
    expect(line.contributions?.length).toBeGreaterThan(0);
    expect(sum).toBeCloseTo(line.usd_per_day, 6);
  });
});
