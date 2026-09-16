import { describe, expect, it } from "vitest";
import {
  deserialize,
  type Migration,
  SaveError,
  SaveMigrationError,
  SaveVersionError,
  serialize,
  stableStringify,
} from "../src/kernel/save.js";
import { createWorld, requirePlayer, SCHEMA_VERSION } from "../src/kernel/world.js";

describe("save", () => {
  it("round-trips a world", () => {
    const world = createWorld("round", { players: [{ id: "a" }, { id: "b" }] });
    world.clock.tick = 123;
    requirePlayer(world, "a").cash = 42;
    world.events.scheduled.push({ id: "later", fireTick: 200, playerId: "a" });
    world.log.push({ tick: 1, key: "log.x", vars: { n: 1 }, playerId: "a" });

    const json = serialize(world);
    const loaded = deserialize(json);
    expect(loaded).toEqual(world);
    expect(serialize(loaded)).toBe(json);
  });

  it("writes keys in a stable order", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, 1] } })).toBe('{"a":{"c":[3,1],"d":2},"b":1}');
    expect(stableStringify({ a: undefined, b: 1 })).toBe('{"b":1}');
    const one = { x: 1, y: [{ b: 1, a: 2 }] };
    const other = { y: [{ a: 2, b: 1 }], x: 1 };
    expect(stableStringify(one)).toBe(stableStringify(other));
  });

  it("refuses non-finite numbers", () => {
    expect(() => stableStringify({ x: Number.POSITIVE_INFINITY })).toThrow(SaveError);
  });

  it("applies migrations in order", () => {
    const world = createWorld("migrate");
    const save = JSON.parse(serialize(world)) as Record<string, unknown>;
    (save.meta as Record<string, unknown>).schemaVersion = SCHEMA_VERSION - 2;
    const order: number[] = [];
    const migrations: Migration[] = [
      {
        from: SCHEMA_VERSION - 1,
        to: SCHEMA_VERSION,
        migrate: (draft) => {
          order.push(2);
          return { ...draft, second: true };
        },
      },
      {
        from: SCHEMA_VERSION - 2,
        to: SCHEMA_VERSION - 1,
        migrate: (draft) => {
          order.push(1);
          return { ...draft, first: true };
        },
      },
    ];
    const loaded = deserialize(JSON.stringify(save), migrations) as unknown as Record<
      string,
      unknown
    >;
    expect(order).toEqual([1, 2]);
    expect(loaded.first).toBe(true);
    expect(loaded.second).toBe(true);
    expect(loaded.meta).toMatchObject({ schemaVersion: SCHEMA_VERSION });
  });

  it("rejects newer saves with a typed error", () => {
    const world = createWorld("newer");
    world.meta.schemaVersion = SCHEMA_VERSION + 1;
    try {
      deserialize(serialize(world));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SaveVersionError);
      expect((error as SaveVersionError).code).toBe("save_version_too_new");
      expect((error as SaveVersionError).fromVersion).toBe(SCHEMA_VERSION + 1);
    }
  });

  it("rejects gaps in the migration chain", () => {
    const world = createWorld("gap");
    const save = JSON.parse(serialize(world)) as Record<string, unknown>;
    (save.meta as Record<string, unknown>).schemaVersion = SCHEMA_VERSION - 1;
    expect(() => deserialize(JSON.stringify(save))).toThrow(SaveMigrationError);
  });

  it("rejects malformed saves", () => {
    expect(() => deserialize("not json")).toThrow(SaveError);
    expect(() => deserialize("[]")).toThrow(SaveError);
    expect(() => deserialize("{}")).toThrow(SaveError);
    expect(() => deserialize(JSON.stringify({ meta: { schemaVersion: SCHEMA_VERSION } }))).toThrow(
      /missing "clock"/,
    );
  });
});
