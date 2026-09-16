import { describe, expect, it } from "vitest";
import {
  createWorld,
  getPlayer,
  instanceKey,
  MAX_PLAYERS,
  playerNotifications,
  requirePlayer,
  SCHEMA_VERSION,
  WorldError,
} from "../src/kernel/world.js";

describe("world", () => {
  it("creates a single-player world by default", () => {
    const world = createWorld("seed-1");
    expect(world.meta).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      seed: "seed-1",
      debug: false,
      hostPlayerId: "p1",
    });
    expect(world.playerOrder).toEqual(["p1"]);
    expect(world.players.p1).toMatchObject({ id: "p1", name: "Player 1", cash: 0 });
    expect(world.clock.tick).toBe(0);
    expect(world.rng).toHaveLength(4);
    expect(world.notifications.p1).toEqual([]);
    expect(world.events.pending).toEqual([]);
  });

  it("creates a co-op world with a host", () => {
    const world = createWorld(1, {
      players: [
        { id: "a", name: "Ada" },
        { id: "b", name: "Bob", cash: 500 },
      ],
      hostPlayerId: "b",
      debug: true,
    });
    expect(world.playerOrder).toEqual(["a", "b"]);
    expect(world.players.b?.cash).toBe(500);
    expect(world.meta.hostPlayerId).toBe("b");
    expect(world.meta.debug).toBe(true);
    expect(Object.keys(world.notifications).sort()).toEqual(["a", "b"]);
  });

  it("rejects invalid player lists", () => {
    expect(() => createWorld(1, { players: [] })).toThrow(WorldError);
    expect(() => createWorld(1, { players: [{ id: "x" }, { id: "x" }] })).toThrow(WorldError);
    expect(() =>
      createWorld(1, {
        players: Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => ({ id: `p${i}` })),
      }),
    ).toThrow(WorldError);
    expect(() => createWorld(1, { hostPlayerId: "nobody" })).toThrow(WorldError);
  });

  it("runs the setup callback", () => {
    const world = createWorld("setup", {
      setup: (draft) => {
        draft.entities.site = { s1: { id: "s1", kind: "cloud" } };
        const player = draft.players.p1;
        if (player !== undefined) {
          player.cash = 10_000;
        }
      },
    });
    expect(world.entities.site?.s1).toMatchObject({ kind: "cloud" });
    expect(world.players.p1?.cash).toBe(10_000);
  });

  it("looks players up", () => {
    const world = createWorld(1);
    expect(getPlayer(world, "p1")?.id).toBe("p1");
    expect(getPlayer(world, "nobody")).toBeUndefined();
    expect(() => requirePlayer(world, "nobody")).toThrow(WorldError);
    expect(playerNotifications(world, "late")).toEqual([]);
    expect(world.notifications.late).toEqual([]);
  });

  it("builds composite keys", () => {
    expect(instanceKey("p1", "ev")).toBe("p1/ev");
    expect(instanceKey("p1", "ev", "s1")).toBe("p1/ev/s1");
  });
});
