import { describe, expect, it } from "vitest";
import { createGame } from "../src/index.js";
import { createTimeSystem, isValidSpeed, ticksForFrame } from "../src/systems/time/index.js";
import { bundle } from "./helpers.js";

describe("time system", () => {
  it("knows the valid speeds", () => {
    expect([0, 1, 2, 3, 4, 5].every(isValidSpeed)).toBe(true);
    expect(isValidSpeed(6)).toBe(false);
    expect(isValidSpeed(-1)).toBe(false);
    expect(isValidSpeed(1.5)).toBe(false);
  });

  it("converts frame time into ticks", () => {
    expect(ticksForFrame(0, 1000, 100)).toEqual({ ticks: 0, leftoverMs: 0 });
    expect(ticksForFrame(1, 1000, 100).ticks).toBe(1);
    expect(ticksForFrame(2, 1000, 100).ticks).toBe(6);
    expect(ticksForFrame(3, 1000, 100).ticks).toBe(24);
    expect(ticksForFrame(4, 1000, 100).ticks).toBe(100); // capped
    expect(ticksForFrame(5, 16, 200)).toEqual({ ticks: 200, leftoverMs: 0 });
    expect(ticksForFrame(1, 0, 10)).toEqual({ ticks: 0, leftoverMs: 0 });
  });

  it("carries the remainder of a partial tick", () => {
    const frame = ticksForFrame(1, 1500, 100);
    expect(frame.ticks).toBe(1);
    expect(frame.leftoverMs).toBeCloseTo(500, 6);
  });

  it("logs the turn of the year", () => {
    const game = createGame({ seed: "years", content: bundle(), systems: [createTimeSystem()] });
    const result = game.tick(24 * 365);
    const newYear = result.outbox.log.filter((entry) => entry.key === "log.new_year");
    expect(newYear).toHaveLength(1);
    expect(newYear[0]?.vars.year).toBe(2028);
  });
});
