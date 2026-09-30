import { describe, expect, it } from "vitest";
import {
  type ComputeAllocationPlanInput,
  planComputeAllocation,
} from "../src/compute-allocation-plan.js";

const baseline: ComputeAllocationPlanInput = {
  capacity: 100,
  jobsLimit: 100,
  research: { beta: 10, alpha: 30 },
  jobs: 20,
  target: "research",
  value: 60,
};

describe("linked compute allocation plan", () => {
  it("scales the other two shares and preserves each research project's proportion", () => {
    const research = planComputeAllocation(baseline);
    expect(research.research).toEqual({ alpha: 45, beta: 15 });
    expect(research.jobs).toBeCloseTo(40 / 3);
    expect(research.free).toBeCloseTo(80 / 3);
    const jobs = planComputeAllocation({ ...baseline, target: "jobs", value: 70 });
    expect(jobs).toEqual({ research: { alpha: 11.25, beta: 3.75 }, jobs: 70, free: 15 });
  });

  it("lets paid work take currently researched capacity but never operation reservations", () => {
    const total = 140;
    const reserved = 40;
    const plan = planComputeAllocation({
      ...baseline,
      capacity: total - reserved,
      research: { alpha: 100 },
      jobs: 0,
      target: "jobs",
      value: 140,
    });
    expect(plan).toEqual({ research: { alpha: 0 }, jobs: 100, free: 0 });
    expect(plan.jobs + (plan.research.alpha ?? 0) + plan.free + reserved).toBe(total);
  });

  it("puts excess paid work into free compute unless the free slider is the chosen target", () => {
    const research = planComputeAllocation({ ...baseline, jobsLimit: 2, value: 90 });
    expect(research).toEqual({ research: { alpha: 67.5, beta: 22.5 }, jobs: 2, free: 8 });
    const free = planComputeAllocation({ ...baseline, jobsLimit: 20, target: "free", value: 10 });
    expect(free).toEqual({ research: { alpha: 52.5, beta: 17.5 }, jobs: 20, free: 10 });
  });

  it("never invents a research project when the chosen split cannot use the whole pool", () => {
    expect(planComputeAllocation({ ...baseline, research: {}, value: 70 })).toEqual({
      research: {},
      jobs: 20,
      free: 80,
    });
    expect(
      planComputeAllocation({
        ...baseline,
        research: {},
        jobsLimit: 30,
        target: "free",
        value: 10,
      }),
    ).toEqual({ research: {}, jobs: 30, free: 70 });
    expect(
      planComputeAllocation({
        ...baseline,
        research: {},
        jobsLimit: 0,
        target: "jobs",
        value: 100,
      }),
    ).toEqual({ research: {}, jobs: 0, free: 100 });
  });

  it("retains explicit selections at zero and divides a restarted zero-weight pool equally", () => {
    const stopped = planComputeAllocation({ ...baseline, value: 0 });
    expect(stopped.research).toEqual({ alpha: 0, beta: 0 });
    const restarted = planComputeAllocation({
      ...baseline,
      research: stopped.research,
      jobs: stopped.jobs,
      value: 60,
    });
    expect(restarted.research).toEqual({ alpha: 30, beta: 30 });
    expect(Object.keys(restarted.research)).toEqual(["alpha", "beta"]);
    expect(
      planComputeAllocation({ ...baseline, research: { paused: 0, active: 3 }, value: 60 })
        .research,
    ).toEqual({ active: 60, paused: 0 });
  });

  it("falls back to idle when the remaining sliders have no weights", () => {
    expect(
      planComputeAllocation({ ...baseline, research: { alpha: 100 }, jobs: 0, value: 40 }),
    ).toEqual({ research: { alpha: 40 }, jobs: 0, free: 60 });
    expect(
      planComputeAllocation({ ...baseline, research: {}, jobs: 100, target: "jobs", value: 40 }),
    ).toEqual({ research: {}, jobs: 40, free: 60 });
  });

  it("lowers a wholly free pool into paid work first and then explicitly selected research", () => {
    expect(
      planComputeAllocation({
        ...baseline,
        research: { beta: 0, alpha: 0 },
        jobs: 0,
        jobsLimit: 30,
        target: "free",
        value: 10,
      }),
    ).toEqual({ research: { alpha: 30, beta: 30 }, jobs: 30, free: 10 });
    expect(
      planComputeAllocation({
        ...baseline,
        research: {},
        jobs: 0,
        jobsLimit: 30,
        target: "free",
        value: 10,
      }),
    ).toEqual({ research: {}, jobs: 30, free: 70 });
  });

  it("sanitizes nonfinite and negative values without dropping the selected keys", () => {
    const plan = planComputeAllocation({
      ...baseline,
      capacity: Number.POSITIVE_INFINITY,
      jobs: Number.NaN,
      jobsLimit: -3,
      research: { negative: -1, infinite: Number.POSITIVE_INFINITY, nan: Number.NaN },
      value: Number.NaN,
    });
    expect(plan).toEqual({ research: { infinite: 0, nan: 0, negative: 0 }, jobs: 0, free: 0 });
    expect(planComputeAllocation({ ...baseline, value: -1 }).research).toEqual({
      alpha: 0,
      beta: 0,
    });
  });

  it("is immutable and independent of the insertion order of project IDs", () => {
    const input = Object.freeze({ ...baseline, research: Object.freeze({ beta: 10, alpha: 30 }) });
    const actual = planComputeAllocation(input);
    expect(actual.research).not.toBe(input.research);
    expect(input.research).toEqual({ beta: 10, alpha: 30 });
    expect(JSON.stringify(actual)).toBe(
      JSON.stringify(planComputeAllocation({ ...baseline, research: { alpha: 30, beta: 10 } })),
    );
  });

  it("keeps capacity, market and selection invariants across ordinary, stale and extreme inputs", () => {
    const capacities = [0, 0.000000001, 1, 100, 1e9, Number.MAX_VALUE];
    const fractions = [0, 0.1, 0.5, 1, 2];
    const invalid = [Number.NaN, Number.POSITIVE_INFINITY, -10];
    for (let i = 0; i < 300; i += 1) {
      const capacity = capacities[i % capacities.length] ?? 0;
      const jobsLimit = capacity * (fractions[Math.floor(i / 6) % fractions.length] ?? 0);
      const jobs = capacity * (fractions[Math.floor(i / 30) % fractions.length] ?? 0);
      const research: Record<string, number> =
        i % 4 === 0
          ? {}
          : i % 4 === 1
            ? { alpha: 0, beta: 0 }
            : i % 4 === 2
              ? { alpha: capacity * 0.7, beta: capacity * 0.3 }
              : { alpha: Number.MAX_VALUE, beta: invalid[i % invalid.length] ?? 0 };
      const value =
        i % 7 === 0
          ? (invalid[i % invalid.length] ?? 0)
          : capacity * (fractions[i % fractions.length] ?? 0);
      for (const target of ["research", "jobs", "free"] as const) {
        const plan = planComputeAllocation({ capacity, jobsLimit, jobs, research, target, value });
        const values = [...Object.values(plan.research), plan.jobs, plan.free];
        expect(values.every((amount) => Number.isFinite(amount) && amount >= 0)).toBe(true);
        expect(Object.keys(plan.research)).toEqual(Object.keys(research).sort());
        const market = Math.min(capacity, Number.isFinite(jobsLimit) ? jobsLimit : 0);
        expect(plan.jobs).toBeLessThanOrEqual(market);
        if (capacity === 0) expect(values).toEqual(values.map(() => 0));
        else expect(values.reduce((sum, amount) => sum + amount / capacity, 0)).toBeCloseTo(1, 12);
      }
    }
  });
});
