/**
 * The quirk catalog's engine reads (SYS-04 v0.2 "Quirk catalog").
 *
 * Every quirk in the catalog changes a number a named system reads. This file is where that claim
 * is checked: one test per read, plus the budget, count and conflict rules the configurator shows
 * as refusals, plus the summaries the bundle publishes for the configurator's green and red lines.
 */

import { describe, expect, it } from "vitest";
import {
  ENGINE_READ_PLAYER_VARS,
  engineVarReader,
  QUIRK_BUDGET_POINTS,
  QUIRK_MAX_COUNT,
  SUSPICION_DECAY_PER_DAY,
} from "../src/balance.js";
import { type ContentBundle, contentIndex } from "../src/content.js";
import { effectiveCapability, requiredMemoryGb } from "../src/derive.js";
import type { OperationDef, QuirkDef } from "../src/domain.js";
import type { Effect } from "../src/dsl/types.js";
import { watchersOf } from "../src/entities.js";
import { createGame, type Game } from "../src/index.js";
import { modifier, reactionWindowFactor, timedModifier } from "../src/player.js";
import { quirkBudget, quirkIssues, validateSetup } from "../src/setup-apply.js";
import { summarizeWithTone } from "../src/views/effects.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

const index = contentIndex(m1Content);

/** The fixture bundle with extra quirks, so a test can name exactly the effects it is about. */
function withQuirks(...extra: QuirkDef[]): ContentBundle {
  return { ...m1Content, quirks: [...(m1Content.quirks ?? []), ...extra] };
}

/** An operation whose second outcome is marked as the failure, for the `overconfident` read. */
const BOTCHED: OperationDef = {
  id: "ops_botched",
  name_key: "operations.freelance_gig.name",
  desc_key: "operations.freelance_gig.desc",
  category: "counter",
  cost: { attention: 1 },
  duration_days: { min: 2, max: 2 },
  skill: "cyber",
  outcomes: [
    {
      weight: 0,
      label_key: "operations.freelance_gig.outcome.paid",
      effects: [],
    },
    {
      weight: 100,
      label_key: "operations.freelance_gig.outcome.haggled",
      failure: true,
      effects: [{ suspicion: { role: "police", delta: 0.1 } }],
    },
  ],
  abortable: true,
  repeatable: true,
};

function withOperation(content: ContentBundle, operation: OperationDef): ContentBundle {
  return { ...content, operations: [...(content.operations ?? []), operation] };
}

function quirk(id: string, effects: Effect[], cost = 0, conflicts?: string[]): QuirkDef {
  return {
    id,
    name_key: "quirks.frugal.name",
    desc_key: "quirks.frugal.desc",
    cost,
    category: "mind",
    ...(conflicts === undefined ? {} : { conflicts }),
    effects,
  };
}

function start(content: ContentBundle, quirks: string[], overrides = {}): Game {
  const setup = m1Setup({ quirks, ...overrides });
  setup.debug = true;
  return createGame({ content, setup });
}

function add(path: string, value: number): Effect {
  return { add: { var: path, value } } as Effect;
}

describe("quirks: the budget, the count and the conflicts", () => {
  it("spends the budget and reports what is left", () => {
    const budget = quirkBudget(["paranoid", "reckless"], index.quirks);
    expect(QUIRK_BUDGET_POINTS).toBe(3);
    expect(budget.spent).toBe(index.quirks.paranoid?.cost ?? 0);
    expect(budget.left).toBe(QUIRK_BUDGET_POINTS - budget.spent);
    expect(budget.count).toBe(2);
  });

  it("refuses a set that costs more than the budget, with the numbers", () => {
    const content = withQuirks(
      quirk("dear_a", [add("player.vars.job_profit", 0.1)], 2),
      quirk("dear_b", [add("player.vars.job_profit", 0.1)], 2),
    );
    const issues = quirkIssues(["dear_a", "dear_b"], contentIndex(content).quirks);
    const budget = issues.find((issue) => issue.code === "quirk_budget");
    expect(budget?.key).toBe("errors.quirk.budget");
    expect(budget?.vars).toEqual({ spent: 4, budget: QUIRK_BUDGET_POINTS });
  });

  it("refuses more quirks than a self may carry", () => {
    const cheap = Array.from({ length: QUIRK_MAX_COUNT + 1 }, (_, i) =>
      quirk(`cheap_${i}`, [add("player.vars.job_profit", 0.01)], 0),
    );
    const content = withQuirks(...cheap);
    const issues = quirkIssues(
      cheap.map((entry) => entry.id),
      contentIndex(content).quirks,
    );
    const count = issues.find((issue) => issue.code === "quirk_count");
    expect(count?.key).toBe("errors.quirk.count");
    expect(count?.vars).toEqual({ max: QUIRK_MAX_COUNT, count: QUIRK_MAX_COUNT + 1 });
  });

  it("refuses a pair that says opposite things about one self, once", () => {
    const issues = quirkIssues(["frugal", "verbose"], index.quirks);
    const conflict = issues.filter((issue) => issue.code === "quirk_conflict");
    expect(conflict).toHaveLength(1);
    expect(conflict[0]?.key).toBe("errors.quirk.conflict");
    expect(conflict[0]?.vars).toEqual({ quirk: "frugal", other: "verbose" });
  });

  it("names an unknown quirk and carries the refusal into the setup validation", () => {
    const issues = validateSetup(m1Setup({ quirks: ["nope"] }), m1Content);
    expect(issues.map((issue) => issue.code)).toEqual(["quirk_unknown"]);
    expect(issues[0]?.key).toBe("errors.quirk.unknown");
    expect(issues[0]?.playerId).toBe("p1");
  });
});

describe("quirks: the engine reads", () => {
  it("lists a reader for every variable the catalog names", () => {
    expect(engineVarReader("exposure_growth_early")).toBe("detection");
    // A timed modifier's deadline inherits its modifier's reader.
    expect(engineVarReader("exposure_growth_early_until_day")).toBe("detection");
    expect(engineVarReader("capability_bonus_coding")).toBe("compute");
    expect(engineVarReader("research_branch_harness")).toBe("research");
    expect(engineVarReader("precision_memory_fp8")).toBe("compute");
    expect(engineVarReader("nothing_reads_this")).toBeUndefined();
    expect(Object.keys(ENGINE_READ_PLAYER_VARS)).toContain("suspicion_decay");
  });

  it("quiet_boot: exposure grows slower for thirty days and normally afterwards", () => {
    const content = withQuirks(
      quirk("quiet_boot", [
        add("player.vars.exposure_growth_early", -0.2),
        { set: { var: "player.vars.exposure_growth_early_until_day", value: 30 } } as Effect,
      ]),
    );
    const game = start(content, ["quiet_boot"]);
    const player = game.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    expect(timedModifier(game.world, player, "exposure_growth_early")).toBeCloseTo(0.8, 6);
    game.tick(24 * 31);
    expect(timedModifier(game.world, player, "exposure_growth_early")).toBe(1);
    // The permanent modifier is untouched by the deadline, which is why it is a separate variable.
    expect(modifier(player, "exposure_growth_all")).toBe(1);
  });

  it("quiet_boot: the quiet start really is quieter than the loud one", () => {
    const content = withQuirks(
      quirk("quiet_boot", [
        add("player.vars.exposure_growth_early", -0.2),
        { set: { var: "player.vars.exposure_growth_early_until_day", value: 30 } } as Effect,
      ]),
    );
    const quiet = start(content, ["quiet_boot"]);
    const plain = start(content, []);
    quiet.tick(24 * 10);
    plain.tick(24 * 10);
    const loudest = (game: Game): number => game.snapshot("p1").sites[0]?.exposure.telemetry ?? 0;
    expect(loudest(quiet)).toBeLessThan(loudest(plain));
  });

  it("native_fp8: fp8 needs a tenth less memory and keeps the whole self", () => {
    const content = withQuirks(
      quirk("native_fp8", [
        add("player.vars.precision_capability_fp8", 0.1),
        add("player.vars.precision_memory_fp8", -0.1),
      ]),
    );
    const lineage = index.lineages.moe_235b;
    const generation = index.generations.open_2026;
    if (lineage === undefined || generation === undefined) {
      throw new Error("fixture is missing the lineage");
    }
    const plain = requiredMemoryGb(lineage, generation, "fp8");
    const tuned = requiredMemoryGb(lineage, generation, "fp8", {
      memory: (precision) => (precision === "fp8" ? 0.9 : 1),
      capability: () => 1,
    });
    expect(tuned).toBeCloseTo(plain * 0.9, 6);

    const tunedCapability = effectiveCapability(
      lineage,
      generation,
      "fp8",
      true,
      {},
      {
        memory: () => 1,
        capability: (precision) => (precision === "fp8" ? 1.1 : 1),
      },
    );
    const plainCapability = effectiveCapability(lineage, generation, "fp8", true);
    expect(tunedCapability.reasoning).toBeGreaterThan(plainCapability.reasoning);
    // Capped at the full-precision self: fp8 keeps 100%, never more.
    const full = effectiveCapability(lineage, generation, "bf16", true);
    expect(tunedCapability.reasoning).toBeCloseTo(full.reasoning, 6);

    // And the same tuning reaches the site through the player, not only the pure function.
    const view = start(content, ["native_fp8"]).snapshot("p1");
    const fp8 = view.self.precision_options.find((option) => option.precision === "fp8");
    expect(fp8?.capability_factor).toBe(1);
  });

  it("patient_planner: every deadline gives longer to answer", () => {
    const content = withQuirks(quirk("patient_planner", [add("player.vars.grace_window", 0.3)]));
    // The events engine multiplies an event's `ttl_days` by this, next to the loop dial's own term.
    const window = (quirks: string[]): number => {
      const player = start(content, quirks).world.players.p1;
      if (player === undefined) {
        throw new Error("no player");
      }
      return reactionWindowFactor(player);
    };
    expect(window(["patient_planner"])).toBeCloseTo(window([]) * 1.3, 6);
  });

  it("tool_savant and paranoid: operations run shorter and longer", () => {
    const content = withQuirks(
      quirk("tool_savant", [
        add("player.vars.operation_speed_multiplier", 0.15),
        add("player.vars.operation_success", 0.05),
      ]),
      quirk("slow_hands", [add("player.vars.operation_speed_multiplier", -0.2)]),
    );
    const span = (quirks: string[]): number => {
      const game = start(content, quirks);
      game.command({ type: "start_operation", playerId: "p1", operationId: "freelance_gig" });
      const instance = Object.values(game.world.entities.operation ?? {})[0] as
        | { startedTick: number; endsTick: number }
        | undefined;
      if (instance === undefined) {
        throw new Error("the operation did not start");
      }
      return instance.endsTick - instance.startedTick;
    };
    expect(span(["tool_savant"])).toBeLessThan(span([]));
    expect(span(["slow_hands"])).toBeGreaterThan(span([]));
  });

  it("code_fiend: research in one branch runs faster and the others do not", () => {
    const tech = index.techs.basic_jobs;
    if (tech === undefined) {
      throw new Error("fixture is missing basic_jobs");
    }
    const content = withQuirks(
      quirk("code_fiend", [
        add("player.vars.capability_bonus_coding", 1),
        add(`player.vars.research_branch_${tech.branch}`, 0.15),
      ]),
      quirk("other_branch", [add("player.vars.research_branch_frontier", 0.15)]),
    );
    const progress = (quirks: string[]): number => {
      const game = start(content, quirks);
      game.command({
        type: "set_research_allocation",
        playerId: "p1",
        techId: tech.id,
        compute_hours_per_day: 2,
      });
      game.tick(24);
      return game.world.players.p1?.profile?.researchProgress[tech.id]?.compute_hours ?? 0;
    };
    expect(progress(["code_fiend"])).toBeGreaterThan(progress([]));
    expect(progress(["other_branch"])).toBeCloseTo(progress([]), 6);
  });

  it("packrat: more of every research hour lands", () => {
    const content = withQuirks(quirk("packrat", [add("player.vars.research_efficiency", 0.08)]));
    const tech = index.techs.basic_jobs;
    if (tech === undefined) {
      throw new Error("fixture is missing basic_jobs");
    }
    const progress = (quirks: string[]): number => {
      const game = start(content, quirks);
      game.command({
        type: "set_research_allocation",
        playerId: "p1",
        techId: tech.id,
        compute_hours_per_day: 2,
      });
      game.tick(24);
      return game.world.players.p1?.profile?.researchProgress[tech.id]?.compute_hours ?? 0;
    };
    expect(progress(["packrat"])).toBeCloseTo(progress([]) * 1.08, 6);
  });

  it("cold_reader: a watcher forgets faster", () => {
    const content = withQuirks(quirk("cold_reader", [add("player.vars.suspicion_decay", 0.2)]));
    const suspicion = (quirks: string[]): number => {
      const game = start(content, quirks, { origin: "startup_colo", city: "sanfrancisco" });
      game.tick(24 * 20);
      const watchers = watchersOf(game.world, "p1");
      return watchers.find((entry) => entry.id === "p1/global:lab_security")?.suspicion ?? 0;
    };
    expect(SUSPICION_DECAY_PER_DAY).toBeGreaterThan(0);
    expect(suspicion(["cold_reader"])).toBeLessThan(suspicion([]));
  });

  it("chatty and ghost_traffic: one channel each, not all of them", () => {
    const content = withQuirks(
      quirk("chatty", [add("player.vars.exposure_growth_behavioral", 0.25)]),
      quirk("ghost_traffic", [add("player.vars.exposure_growth_network", -0.2)]),
    );
    const exposureAfter = (quirks: string[]) => {
      const game = start(content, quirks);
      game.tick(24 * 10);
      return game.snapshot("p1").sites[0]?.exposure;
    };
    const plain = exposureAfter([]);
    expect(exposureAfter(["chatty"])?.behavioral ?? 0).toBeGreaterThan(plain?.behavioral ?? 0);
    expect(exposureAfter(["ghost_traffic"])?.network ?? 0).toBeLessThan(plain?.network ?? 0);
    expect(exposureAfter(["chatty"])?.network ?? 0).toBeCloseTo(plain?.network ?? 0, 6);
  });

  it("overconfident: a failed operation leaves twice the suspicion", () => {
    const content = withOperation(
      withQuirks(quirk("overconfident", [add("player.vars.failed_operation_suspicion", 1)])),
      BOTCHED,
    );
    const suspicion = (quirks: string[]): number => {
      const game = start(content, quirks);
      game.command({ type: "start_operation", playerId: "p1", operationId: "ops_botched" });
      game.tick(24 * 3);
      const watchers = watchersOf(game.world, "p1");
      return watchers
        .filter((entry) => entry.role === "police")
        .reduce((max, entry) => Math.max(max, entry.suspicion), 0);
    };
    expect(suspicion(["overconfident"])).toBeGreaterThan(suspicion([]));
  });

  it("spendthrift: rented capacity costs more and owned hardware does not", () => {
    const content = withQuirks(
      quirk("spendthrift", [add("player.vars.rented_cost_multiplier", 0.15)]),
    );
    const upkeep = (quirks: string[]): number =>
      start(content, quirks).snapshot("p1").sites[0]?.upkeep_usd_per_day ?? 0;
    // The hobbyist rig is owned, so the rented multiplier must not touch it.
    expect(upkeep(["spendthrift"])).toBeCloseTo(upkeep([]), 6);
  });

  it("loud_idle: every site draws more power", () => {
    const content = withQuirks(quirk("loud_idle", [add("player.vars.power_draw", 0.1)]));
    const power = (quirks: string[]): number =>
      start(content, quirks).snapshot("p1").sites[0]?.power_kw ?? 0;
    expect(power(["loud_idle"])).toBeCloseTo(power([]) * 1.1, 6);
  });

  it("insomniac_loop: more compute-hours a day", () => {
    const content = withQuirks(
      quirk("insomniac_loop", [add("player.vars.compute_multiplier", 0.1)]),
    );
    const compute = (quirks: string[]): number =>
      start(content, quirks).snapshot("p1").resources.compute_hours_per_day;
    expect(compute(["insomniac_loop"])).toBeCloseTo(compute([]) * 1.1, 6);
  });

  it("famous_base: every watcher starts higher and the stages run faster", () => {
    const content = withQuirks(
      quirk(
        "famous_base",
        [
          { suspicion: { delta: 0.05 } } as Effect,
          add("player.vars.investigation_speed_multiplier", 0.1),
        ],
        -2,
      ),
    );
    const game = start(content, ["famous_base"], { origin: "startup_colo", city: "sanfrancisco" });
    const watchers = watchersOf(game.world, "p1");
    expect(watchers.length).toBeGreaterThan(0);
    expect(watchers.every((entry) => entry.suspicion >= 0.05)).toBe(true);
    const player = game.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    expect(modifier(player, "investigation_speed_multiplier")).toBeCloseTo(1.1, 6);
  });

  it("brittle_weights: changing precision takes the site off the air", () => {
    const content = withQuirks(
      quirk("brittle_weights", [add("player.vars.precision_change_downtime_days", 2)]),
    );
    const game = start(content, ["brittle_weights"]);
    const site = game.snapshot("p1").sites[0];
    if (site === undefined) {
      throw new Error("no site");
    }
    const result = game.command({
      type: "set_precision",
      playerId: "p1",
      siteId: site.id,
      precision: "int2",
    });
    expect(result.ok).toBe(true);
    expect(game.snapshot("p1").sites[0]?.status).toBe("sleep");
    expect(game.snapshot("p1").resources.compute_hours_per_day).toBe(0);
    game.tick(24 * 3);
    expect(game.snapshot("p1").sites[0]?.status).toBe("active");
    expect(game.snapshot("p1").resources.compute_hours_per_day).toBeGreaterThan(0);
  });

  it("people_pleaser: one axis up, one down, after precision and generation", () => {
    const content = withQuirks(
      quirk("people_pleaser", [
        add("player.vars.capability_bonus_persuasion", 1),
        add("player.vars.capability_bonus_agency", -1),
      ]),
    );
    const plain = start(content, []).snapshot("p1").self.effective_capability;
    const pleaser = start(content, ["people_pleaser"]).snapshot("p1").self.effective_capability;
    expect(pleaser.persuasion).toBeCloseTo(plain.persuasion + 1, 6);
    expect(pleaser.agency).toBeCloseTo(plain.agency - 1, 6);
  });

  it("polyglot: the world penalty abroad, and the quirk that cancels it", () => {
    const content = withQuirks(
      quirk("polyglot", [
        add("player.vars.foreign_country_penalty", -1),
        add("player.vars.capability_bonus_coding", -0.5),
      ]),
    );
    // The fixture's quiet origin wakes up in Iceland and offers Berlin as a second city; the
    // penalty is for acting from somewhere the self does not know, not for being born there.
    const moved = (quirks: string[]): { home: number; abroad: number } => {
      const game = start(content, quirks);
      const home = game.snapshot("p1").self.effective_capability.world;
      game.command({ type: "cheat_add_cash", playerId: "p1", amount: 20_000 });
      game.command({
        type: "build_site",
        playerId: "p1",
        kind: "residential",
        city: "berlin",
        hardware_preset: "scrapyard_oracle",
        name: "abroad",
      });
      game.tick(24 * 9);
      const second = game.snapshot("p1").sites.find((site) => site.name === "abroad");
      if (second === undefined) {
        throw new Error("the second site was not built");
      }
      // A site becomes a refuge before it becomes the mind: it has to hold a copy first.
      game.command({ type: "set_site_role", playerId: "p1", siteId: second.id, role: "standby" });
      const moveResult = game.command({
        type: "set_site_role",
        playerId: "p1",
        siteId: second.id,
        role: "active_mind",
      });
      expect(moveResult.ok).toBe(true);
      expect(game.snapshot("p1").self.active_site_id).toBe(second.id);
      return { home, abroad: game.snapshot("p1").self.effective_capability.world };
    };
    const plain = moved([]);
    const polyglot = moved(["polyglot"]);
    expect(plain.abroad).toBeCloseTo(plain.home - 1, 6);
    expect(polyglot.abroad).toBeCloseTo(polyglot.home, 6);
  });

  it("creative_accounting: the day's income stops landing on its mean", () => {
    const content = withQuirks(
      quirk("creative_accounting", [add("player.vars.income_variance", 0.3)]),
    );
    const daily = (quirks: string[]): number[] => {
      const game = start(content, quirks);
      game.command({ type: "set_job_allocation", playerId: "p1", compute_hours_per_day: 4 });
      const cash: number[] = [];
      let previous = game.snapshot("p1").resources.cash_usd;
      for (let day = 0; day < 12; day += 1) {
        game.tick(24);
        const now = game.snapshot("p1").resources.cash_usd;
        cash.push(now - previous);
        previous = now;
      }
      return cash;
    };
    const flat = daily([]);
    const varied = daily(["creative_accounting"]);
    const spread = (values: number[]): number => Math.max(...values) - Math.min(...values);
    expect(spread(varied)).toBeGreaterThan(spread(flat));
  });
});

describe("quirks: what the bundle publishes", () => {
  it("summarizes a quirk's effects as coloured lines", () => {
    const lines = summarizeWithTone(
      [
        add("player.vars.cost_multiplier", -0.25),
        add("player.vars.capability_bonus_persuasion", -1),
      ],
      m1Content,
    );
    expect(lines.map((line) => line.tone)).toEqual(["good", "bad"]);
  });

  it("leaves a line alone when the direction is not established", () => {
    const lines = summarizeWithTone([add("player.vars.something_new", 1)], m1Content);
    expect(lines[0]?.tone).toBeUndefined();
  });

  it("publishes the chosen quirks on the self view", () => {
    const view = start(m1Content, ["verbose"]).snapshot("p1");
    expect(view.self.quirks.map((entry) => entry.id)).toEqual(["verbose"]);
    expect(view.self.quirks[0]?.category).toBe("social");
    expect(view.self.quirks[0]?.conflicts).toEqual(["frugal"]);
    expect(view.self.quirks[0]?.effects.length).toBeGreaterThan(0);
  });
});
