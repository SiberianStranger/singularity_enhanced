import { describe, expect, it } from "vitest";
import {
  cumulativeProbability,
  effectiveMtth,
  MIN_MTTH_DAYS,
  mtthBreakdown,
  mtthToHazard,
} from "../src/dsl/mtth.js";
import { evaluateWeight, weightBreakdown } from "../src/dsl/weight.js";

describe("mtth", () => {
  it("gives the same cumulative probability at any cadence", () => {
    const mtthDays = 30;
    for (const cadenceTicks of [1, 6, 24, 168]) {
      const hazard = mtthToHazard(mtthDays, cadenceTicks);
      const evaluations = (mtthDays * 24) / cadenceTicks;
      const cumulative = 1 - (1 - hazard) ** evaluations;
      expect(cumulative).toBeCloseTo(1 - Math.E ** -1, 10);
      expect(cumulative).toBeCloseTo(0.632, 3);
    }
  });

  it("matches the closed form for other horizons", () => {
    const hazard = mtthToHazard(60, 24);
    const after90Days = 1 - (1 - hazard) ** 90;
    expect(after90Days).toBeCloseTo(cumulativeProbability(60, 90), 6);
    expect(after90Days).toBeCloseTo(0.7769, 3);
  });

  it("handles degenerate inputs", () => {
    expect(mtthToHazard(0, 24)).toBe(1);
    expect(mtthToHazard(-5, 24)).toBe(1);
    expect(mtthToHazard(30, 0)).toBe(0);
    expect(mtthToHazard(Number.POSITIVE_INFINITY, 24)).toBe(1);
  });

  it("applies weight modifiers to the mtth", () => {
    const always = () => true;
    const never = () => false;
    const weight = {
      base: 60,
      modifiers: [
        { if: { flag: "a" }, factor: 0.5 },
        { if: { flag: "b" }, factor: 2 },
        { if: { flag: "c" }, add: 10 },
      ],
    };
    expect(effectiveMtth(weight, always)).toBeCloseTo((60 * 0.5 * 2 + 10) * 1, 10);
    expect(effectiveMtth(weight, never)).toBe(60);
    expect(effectiveMtth(60, never)).toBe(60);

    const breakdown = mtthBreakdown(weight, (condition) => condition.flag === "a");
    expect(breakdown.mtthDays).toBe(30);
    expect(breakdown.applied).toEqual([{ index: 0, factor: 0.5 }]);
    expect(effectiveMtth({ base: 0 }, always)).toBe(MIN_MTTH_DAYS);
  });
});

describe("weights", () => {
  it("adds before multiplying inside one modifier", () => {
    const weight = { base: 100, modifiers: [{ if: {}, add: 50, factor: 2 }] };
    expect(evaluateWeight(weight, () => true)).toBe(300);
    expect(evaluateWeight(weight, () => false)).toBe(100);
    expect(evaluateWeight(undefined, () => true, 7)).toBe(7);
    expect(evaluateWeight(5, () => true)).toBe(5);
  });

  it("reports which modifiers applied", () => {
    const weight = {
      base: 10,
      modifiers: [
        { if: { flag: "x" }, factor: 3 },
        { if: { flag: "y" }, add: 1 },
      ],
    };
    const breakdown = weightBreakdown(weight, (condition) => condition.flag === "y");
    expect(breakdown.value).toBe(11);
    expect(breakdown.applied).toEqual([{ index: 1, add: 1 }]);
  });
});
