import { describe, expect, it } from "vitest";
import {
  createRng,
  createRngFromState,
  fnv1a32,
  RngError,
  seedToState,
} from "../src/kernel/rng.js";

describe("rng", () => {
  it("produces a fixed sequence for a fixed seed", () => {
    // Cross-checked against a reference xoshiro128** with splitmix32 seeding.
    const rng = createRng(12345);
    expect(rng.getState()).toEqual([3283241497, 613117429, 2940958500, 516375437]);
    const values = [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()];
    expect(values.map((value) => Number(value.toFixed(9)))).toEqual([
      0.254547816, 0.047265402, 0.871101761, 0.885623777, 0.972938412,
    ]);
    // The same seed replays exactly.
    expect(createRng(12345).next()).toBeCloseTo(values[0] as number, 12);
  });

  it("hashes string seeds with FNV-1a", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(seedToState("seed-a")).not.toEqual(seedToState("seed-b"));
    expect(createRng("abc").next()).toBe(createRng(fnv1a32("abc")).next());
  });

  it("round-trips its state", () => {
    const rng = createRng("round-trip");
    rng.next();
    const saved = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];

    rng.setState(saved);
    expect([rng.next(), rng.next(), rng.next()]).toEqual(expected);

    const clone = createRngFromState([...saved]);
    expect([clone.next(), clone.next(), clone.next()]).toEqual(expected);
  });

  it("writes its state back into the bound array", () => {
    const state = seedToState(7);
    const rng = createRngFromState(state);
    rng.next();
    expect(state).toEqual(rng.getState());
  });

  it("keeps draws inside their bounds", () => {
    const rng = createRng("bounds");
    for (let i = 0; i < 500; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const int = rng.int(6);
      expect(int).toBeGreaterThanOrEqual(0);
      expect(int).toBeLessThan(6);
    }
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it("picks, weights and shuffles deterministically", () => {
    const rng = createRng("pick");
    const items = ["a", "b", "c", "d"];
    expect(items).toContain(rng.pick(items));

    const shuffled = rng.shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
    expect(items).toEqual(["a", "b", "c", "d"]);

    const weighted = { zero: 0, one: 0 };
    const pool = [
      { weight: 0, id: "zero" },
      { weight: 1, id: "one" },
    ];
    for (let i = 0; i < 50; i += 1) {
      weighted[rng.weighted(pool).id as "zero" | "one"] += 1;
    }
    expect(weighted.zero).toBe(0);
    expect(weighted.one).toBe(50);
  });

  it("rejects impossible draws", () => {
    const rng = createRng(1);
    expect(() => rng.pick([])).toThrow(RngError);
    expect(() => rng.int(0)).toThrow(RngError);
    expect(() => rng.weighted([{ weight: 0 }])).toThrow(RngError);
    expect(() => createRngFromState([0, 0, 0, 0])).toThrow(RngError);
    expect(() => createRngFromState([1, 2])).toThrow(RngError);
  });
});
