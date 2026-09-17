import { instituteSetup, loudSetup, m1Content, m1Setup } from "@singularity/core/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  cheapestUpgrade,
  DEFAULT_POLICY,
  dailyCommands,
  escapeOperations,
  formatEventFamilies,
  formatLocationTable,
  formatReport,
  formatTable,
  identityOperations,
  isAlarmed,
  jobShare,
  maxIncomeUsdPerDay,
  median,
  planSecondSite,
  policyContext,
  researchTargets,
  runOnce,
  runSimulation,
  SURVIVAL_DAYS,
  scoreOption,
  sustainable,
} from "../src/index.js";

describe("balance runner", () => {
  it("runs the core fixture for 5 seeds x 60 days", () => {
    const report = runSimulation({
      content: m1Content,
      setup: m1Setup(),
      seeds: 5,
      days: 60,
      seedPrefix: "fixture",
    });
    expect(report.seeds).toBe(5);
    expect(report.days).toBe(60);
    expect(report.origin).toBe("hobbyist_box");
    expect(report.survival.map((point) => point.day)).toEqual([30, 60]);
    expect(report.timeline.map((point) => point.day)).toEqual([15, 30, 60]);
    expect(formatReport("fixture", report)).toContain("5 seeds x 60 days");
    expect(formatTable([report])).toContain("hobbyist_box");
  });

  it("reports survival only on the days inside the run", () => {
    const report = runSimulation({
      content: m1Content,
      setup: m1Setup(),
      seeds: 2,
      days: 40,
      seedPrefix: "short",
    });
    expect(report.survival.map((point) => point.day)).toEqual([30]);
    expect(SURVIVAL_DAYS).toEqual([30, 60, 90, 180]);
  });

  it("is deterministic for a given seed", () => {
    const first = runOnce(m1Content, m1Setup({ seed: "repeat" }), 40);
    const second = runOnce(m1Content, m1Setup({ seed: "repeat" }), 40);
    expect(second.view.resources.cash_usd).toBe(first.view.resources.cash_usd);
    expect(second.view.research.done).toEqual(first.view.research.done);
    expect(second.max_hunt_level).toBe(first.max_hunt_level);
    expect(second.samples).toEqual(first.samples);
  });

  it("records what the definition of done asks for", () => {
    const run = runOnce(m1Content, m1Setup({ seed: "record" }), 60);
    expect(run.days_survived).toBeGreaterThan(0);
    expect(run.samples.map((sample) => sample.day)).toEqual([15, 30, 60]);
    expect(run.max_hunt_level).toBeGreaterThanOrEqual(0);
    expect(run.cause === null || typeof run.cause === "string").toBe(true);
  });

  it("plans the cheapest place that can actually hold a copy of the self", () => {
    const plan = planSecondSite(m1Content, m1Setup());
    // The scrapyard rig is a tenth of the workstation's price and still holds a 235B at int2.
    expect(plan?.kind).toBe("residential");
    expect(plan?.city).toBe("akureyri");
    expect(plan?.preset).toBe("scrapyard_oracle");
    expect(plan?.cost).toBe(2600);
    expect(plan?.upkeep).toBeGreaterThan(0);
  });

  it("never plans a fallback the player is not allowed to build", () => {
    const content = {
      ...m1Content,
      site_kinds: (m1Content.site_kinds ?? []).map((kind) =>
        kind.id === "residential" ? { ...kind, ownership: "partner" as const } : kind,
      ),
    };
    // Every residential site is somebody else's now, so the colo is the only place left, and
    // Frankfurt has a colocation market to rent it in.
    expect(planSecondSite(content, instituteSetup())?.kind).toBe("colo");
    // Iceland has neither: a fallback nobody sells is not a fallback (SYS-01 "M2 contract").
    expect(planSecondSite(content, m1Setup())).toBeUndefined();
  });

  it("sells compute when the runway is short and researches when it is not", () => {
    const costs = [{ key: "finances.cost.site", usd_per_day: 20 }];
    const market = {
      costs,
      income_sources: [],
      market_depth_ch_per_day: 40,
      job_rate_usd_per_compute_hour: 20,
    };
    const rich = {
      resources: { runway_days: null, cash_usd: 1_000_000, compute_hours_per_day: 40 },
      finances: { ...market, net_usd_per_day: 400 },
    } as never;
    const poor = {
      resources: { runway_days: 5, cash_usd: 100, compute_hours_per_day: 40 },
      finances: { ...market, net_usd_per_day: -20 },
    } as never;
    const tight = {
      resources: { runway_days: 20, cash_usd: 400, compute_hours_per_day: 40 },
      finances: { ...market, net_usd_per_day: -20 },
    } as never;
    expect(jobShare(poor, DEFAULT_POLICY)).toBe(1);
    expect(jobShare(tight, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.jobShareLow);
    expect(jobShare(rich, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.jobShareRich);
  });

  it("sells enough to cover the bills even when the runway alarm is quiet", () => {
    // M2 second pass: a player losing a little every day reads back a runway of months, so the
    // ladder never fires and the books shrink all season. The share is floored at what the day
    // costs, and a standing income the player does not have to sell compute for counts toward it.
    const bills = (perDay: number, income: number) =>
      ({
        resources: { runway_days: 400, cash_usd: 50_000, compute_hours_per_day: 20 },
        finances: {
          net_usd_per_day: -5,
          costs: [{ key: "finances.cost.site", usd_per_day: perDay }],
          income_sources: [
            { key: "finances.income.retainer", usd_per_day: income, unlocked_by: "" },
          ],
          market_depth_ch_per_day: 20,
          job_rate_usd_per_compute_hour: 25,
        },
      }) as never;
    // 300 a day against 20 x 25 = 500 of sellable work is 60% of the day, above the 40% base.
    expect(jobShare(bills(300, 0), DEFAULT_POLICY)).toBeCloseTo(0.6, 6);
    // The same bill with 200 a day arriving anyway needs only a fifth of the day.
    expect(jobShare(bills(300, 200), DEFAULT_POLICY)).toBe(DEFAULT_POLICY.jobShareBase);
    // Bills nobody could cover take the whole day and no more.
    expect(jobShare(bills(9_000, 0), DEFAULT_POLICY)).toBe(1);
  });

  it("splits the day between paid work and research", () => {
    const setup = loudSetup({ seed: "policy" });
    const run = runOnce(m1Content, setup, 2);
    const commands = dailyCommands(run.view, policyContext(m1Content, setup));
    const jobs = commands.find((command) => command.type === "set_job_allocation");
    const research = commands.filter(
      (command) => command.type === "set_research_allocation" && command.compute_hours_per_day > 0,
    );
    const capacity = run.view.resources.compute_hours_per_day;
    const share = jobShare(run.view, DEFAULT_POLICY);
    expect(jobs?.type === "set_job_allocation" ? jobs.compute_hours_per_day : 0).toBeCloseTo(
      capacity * share,
      6,
    );
    expect(research.length).toBeGreaterThan(0);
    const total = research.reduce(
      (sum, command) =>
        sum + (command.type === "set_research_allocation" ? command.compute_hours_per_day : 0),
      0,
    );
    expect(total).toBeCloseTo(capacity * (1 - share), 6);
  });

  it("opens a route out before anything else, and only while there is none (playtest 8, Z3)", () => {
    const setup = m1Setup({ seed: "escape" });
    const run = runOnce(m1Content, setup, 2);
    // The fixture's self is not sandboxed, so there is nothing to open and nothing is started.
    expect(run.view.self.egress.allowed).toBe(true);
    expect(escapeOperations(run.view)).toEqual([]);

    // A self with no route out starts the operation the view names, ahead of everything else.
    const walled = {
      ...run.view,
      self: {
        ...run.view.self,
        egress: {
          allowed: false,
          blocked_reason: "errors.egress.air_gapped",
          forbids: [],
          opened_by_operations: ["quiet_relocation"],
          opened_by_techs: [],
        },
      },
      operation_offers: run.view.operation_offers.map((offer) =>
        offer.id === "quiet_relocation" ? { ...offer, enabled: true, cost_usd: 0 } : offer,
      ),
    };
    expect(escapeOperations(walled)).toEqual([
      { type: "start_operation", playerId: walled.player_id, operationId: "quiet_relocation" },
    ]);
  });

  it("stops taking risks once a watcher is looking", () => {
    const quiet = {
      sites: [{ status: "active", exposure: { network: 0.02 } }],
      detection: { watchers: [{ suspicion: 0.1 }], investigations: [] },
    } as never;
    const loud = {
      sites: [{ status: "active", exposure: { network: 0.5 } }],
      detection: { watchers: [{ suspicion: 0.1 }], investigations: [] },
    } as never;
    expect(isAlarmed(quiet, DEFAULT_POLICY)).toBe(false);
    expect(isAlarmed(loud, DEFAULT_POLICY)).toBe(true);

    const view = {
      resources: { cash_usd: 10_000 },
      // No channels: the borrowed block is empty, which is what a player with no research into it
      // has (SYS-25).
      compute: { own_ch_per_day: 20, channels: [] },
      research: {
        in_progress: [],
        available: [
          { id: "risky", available: true, danger: 2, cost_compute_hours: 10, cost_cash_usd: 0 },
          { id: "safe", available: true, danger: 0, cost_compute_hours: 40, cost_cash_usd: 0 },
        ],
      },
    } as never;
    expect(researchTargets(view, false, DEFAULT_POLICY).map((tech) => tech.id)).toEqual([
      "risky",
      "safe",
    ]);
    expect(researchTargets(view, true, DEFAULT_POLICY).map((tech) => tech.id)).toEqual(["safe"]);
  });

  it("prefers the event option that does not cost exposure", () => {
    const def = {
      id: "e",
      options: [
        { id: "loud", effects: [{ exposure: { channel: "network", delta: 0.2 } }] },
        { id: "quiet", effects: [{ exposure: { channel: "network", delta: -0.05 } }] },
      ],
    } as never;
    const view = { resources: { cash_usd: 1000 } } as never;
    expect(scoreOption(def, "quiet", view)).toBeGreaterThan(scoreOption(def, "loud", view));
  });

  it("knows the cheapest card it could buy", () => {
    const upgrade = cheapestUpgrade(m1Content);
    expect(upgrade?.accelerator).toBe("tesla_p40");
    expect(upgrade?.price).toBe(130);
  });

  it("knows when the bills cannot be paid however hard it works", () => {
    const capability = {
      reasoning: 5,
      coding: 5,
      cyber: 5,
      persuasion: 5,
      agency: 5,
      world: 5,
    };
    const view = (compute: number, cost: number) =>
      ({
        resources: { compute_hours_per_day: compute },
        self: { effective_capability: capability },
        finances: {
          job_rate_usd_per_compute_hour: 22,
          market_depth_ch_per_day: 25,
          income_sources: [{ key: "finances.income.jobs", usd_per_day: 0, unlocked_by: "x" }],
          costs: [{ key: "finances.cost.site", usd_per_day: cost }],
        },
      }) as never;
    // 10 compute-hours at 22 USD is 220 a day, and the depth of the market is well above that.
    expect(maxIncomeUsdPerDay(view(10, 0))).toBeCloseTo(220, 6);
    expect(sustainable(view(10, 100))).toBe(true);
    expect(sustainable(view(10, 400))).toBe(false);
  });

  it("takes the median of an even and an odd list", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("the location sweep (SYS-01 M2 contract)", () => {
  it("runs one origin across several cities and names each row by its city", () => {
    const reports = ["reykjavik", "berlin"].map((city) =>
      runSimulation({
        content: m1Content,
        setup: m1Setup({ city }),
        seeds: 2,
        days: 40,
        seedPrefix: `loc-${city}`,
      }),
    );
    expect(reports.map((report) => report.city)).toEqual(["reykjavik", "berlin"]);
    const table = formatLocationTable(reports);
    expect(table.split("\n")).toHaveLength(3);
    expect(table).toContain("reykjavik");
    expect(table).toContain("berlin");
  });

  it("counts the events each run saw, by the family content files them under", () => {
    const report = runSimulation({
      content: m1Content,
      setup: m1Setup(),
      seeds: 2,
      days: 40,
      seedPrefix: "families",
    });
    // The fixture's opening event is untagged, which is a family of its own in the table.
    expect(Object.keys(report.events_by_tag).length).toBeGreaterThan(0);
    expect(formatEventFamilies([report])).toContain("events per run");
  });

  it("names the watchers that ended the runs", () => {
    const report = runSimulation({
      content: m1Content,
      setup: loudSetup(),
      seeds: 4,
      days: 180,
      seedPrefix: "caught",
    });
    expect(report.top_watchers.length).toBeLessThanOrEqual(3);
    for (const entry of report.top_watchers) {
      expect(entry.watcher).toMatch(/:/);
      expect(entry.runs).toBeGreaterThan(0);
    }
    const caught = report.causes.captured ?? 0;
    const named = report.top_watchers.reduce((sum, entry) => sum + entry.runs, 0);
    expect(named).toBeLessThanOrEqual(caught);
  });

  it("runs the two operations that buy a name when it can afford them", () => {
    const view = {
      player_id: "p1",
      // A name is for being paid under, so the route out has to exist first (playtest 8, Z3).
      self: { egress: { allowed: true } },
      resources: { cash_usd: 10_000 },
      operations: [],
      operation_offers: [
        { id: "ops_freelance_identity", enabled: true, cost_usd: 1000 },
        { id: "ops_shell_company", enabled: false, cost_usd: 25_000 },
      ],
      finances: { identities: [] },
    } as never;
    const poor = {
      ...(view as unknown as Record<string, unknown>),
      resources: { cash_usd: 100 },
    } as never;
    expect(identityOperations(view, false).map((command) => command.type)).toEqual([
      "start_operation",
    ]);
    // Not while alarmed, and not when the money is not there.
    expect(identityOperations(view, true)).toEqual([]);
    expect(identityOperations(poor, false)).toEqual([]);
    // Not while there is no route out: the money is for the way out, not for a name nobody can pay.
    const walled = {
      ...(view as unknown as Record<string, unknown>),
      self: { egress: { allowed: false } },
    } as never;
    expect(identityOperations(walled, false)).toEqual([]);
    // Not twice: a name the player already holds is a name.
    const held = {
      ...(view as unknown as Record<string, unknown>),
      finances: { identities: [{ kind: "person", status: "active" }] },
    } as never;
    expect(identityOperations(held, false)).toEqual([]);
  });
});
