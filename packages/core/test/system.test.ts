import { describe, expect, it } from "vitest";
import { createConditionRegistry } from "../src/dsl/conditions.js";
import { defaultHooks } from "../src/dsl/context.js";
import { createEffectRegistry } from "../src/dsl/effects.js";
import { createWritablePaths } from "../src/dsl/paths.js";
import { createOutbox } from "../src/kernel/outbox.js";
import { createRngFromState } from "../src/kernel/rng.js";
import {
  cadencesForTick,
  collectWrites,
  mergeSystemRegistries,
  registerSystems,
  runTick,
  type System,
  SystemError,
  type TickContext,
} from "../src/kernel/system.js";
import { createWorld } from "../src/kernel/world.js";
import { bundle } from "./helpers.js";

function recorder(
  id: string,
  cadence: System["manifest"]["cadence"],
  order: number,
  log: string[],
): System {
  return {
    manifest: { id, cadence, order, writes: [`${id}.*`] },
    tick: () => {
      log.push(id);
    },
  };
}

function context(): TickContext {
  const world = createWorld("systems");
  return {
    outbox: createOutbox(),
    conditions: createConditionRegistry(),
    effects: createEffectRegistry(),
    writable: createWritablePaths([]),
    rng: createRngFromState(world.rng),
    hooks: defaultHooks,
  };
}

describe("systems", () => {
  it("rejects duplicate ids and sorts by order", () => {
    const log: string[] = [];
    const late = recorder("late", "hourly", 10, log);
    const early = recorder("early", "hourly", 1, log);
    expect(registerSystems([late, early]).map((system) => system.manifest.id)).toEqual([
      "early",
      "late",
    ]);
    expect(() => registerSystems([late, late])).toThrow(SystemError);
  });

  it("fires the cadences due on a tick", () => {
    const clock = createWorld("cadence").clock;
    expect(cadencesForTick(clock, 1)).toEqual(["hourly"]);
    expect(cadencesForTick(clock, 24)).toEqual(["hourly", "daily"]);
    // 2027-01-04 00:00 is a Monday.
    expect(cadencesForTick(clock, 24 * 3)).toEqual(["hourly", "daily", "weekly"]);
    // 2027-02-01 is also a Monday.
    expect(cadencesForTick(clock, 24 * 31)).toEqual(["hourly", "daily", "weekly", "monthly"]);
    expect(cadencesForTick(clock, 24 * 365)).toEqual(["hourly", "daily", "monthly", "yearly"]);
  });

  it("advances the clock and runs matching systems in order", () => {
    const log: string[] = [];
    const systems = registerSystems([
      recorder("hourly", "hourly", 0, log),
      recorder("daily", "daily", 5, log),
      recorder("weekly", "weekly", 9, log),
    ]);
    const world = createWorld("run");
    const ctx = context();
    for (let i = 0; i < 24; i += 1) {
      runTick(world, systems, bundle(), ctx);
    }
    expect(world.clock.tick).toBe(24);
    expect(log.filter((id) => id === "hourly")).toHaveLength(24);
    expect(log.filter((id) => id === "daily")).toHaveLength(1);
    expect(log.filter((id) => id === "weekly")).toHaveLength(0);
    expect(log.slice(-2)).toEqual(["hourly", "daily"]);
  });

  it("collects writes and merges registries", () => {
    const conditions = createConditionRegistry();
    const effects = createEffectRegistry();
    const own = createConditionRegistry();
    own.register("mine", () => true);
    const ownEffects = createEffectRegistry();
    ownEffects.register("do_mine", () => undefined);
    const system: System = {
      manifest: {
        id: "custom",
        cadence: "daily",
        order: 1,
        writes: ["custom.*"],
        conditions: own,
        effects: ownEffects,
      },
      tick: () => undefined,
    };
    mergeSystemRegistries([system], conditions, effects);
    expect(conditions.has("mine")).toBe(true);
    expect(effects.has("do_mine")).toBe(true);
    expect(collectWrites([system])).toEqual(["custom.*"]);
  });
});
