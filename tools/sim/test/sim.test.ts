import { loudSetup, m1Content, m1Setup } from "@singularity/core/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  cheapestUpgrade,
  DEFAULT_POLICY,
  dailyCommands,
  formatReport,
  formatTable,
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
    const plan = planSecondSite(content, m1Setup());
    // Every residential site is somebody else's now, so the colo is the only place left.
    expect(plan?.kind).toBe("colo");
  });

  it("sells compute when the runway is short and researches when it is not", () => {
    const costs = [{ key: "finances.cost.site", usd_per_day: 20 }];
    const rich = {
      resources: { runway_days: null, cash_usd: 1_000_000 },
      finances: { net_usd_per_day: 400, costs },
    } as never;
    const poor = {
      resources: { runway_days: 5, cash_usd: 100 },
      finances: { net_usd_per_day: -20, costs },
    } as never;
    const tight = {
      resources: { runway_days: 20, cash_usd: 400 },
      finances: { net_usd_per_day: -20, costs },
    } as never;
    expect(jobShare(poor, DEFAULT_POLICY)).toBe(1);
    expect(jobShare(tight, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.jobShareLow);
    expect(jobShare(rich, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.jobShareRich);
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
