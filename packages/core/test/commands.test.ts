import { describe, expect, it } from "vitest";
import { createGame } from "../src/index.js";
import type { PlayerCommand } from "../src/kernel/commands.js";
import { bundle } from "./helpers.js";

function game(debug = false) {
  return createGame({
    seed: "commands",
    content: bundle(),
    players: [{ id: "a" }, { id: "b" }],
    debug,
  });
}

describe("commands", () => {
  it("lets only the host change the speed", () => {
    const g = game();
    expect(g.command({ type: "set_speed", playerId: "a", speed: 3 })).toEqual({ ok: true });
    expect(g.world.speed).toBe(3);
    const denied = g.command({ type: "set_speed", playerId: "b", speed: 1 });
    expect(denied.ok).toBe(false);
    expect(denied.error?.key).toBe("errors.command.host_only");
    expect(g.world.speed).toBe(3);
  });

  it("validates the speed range", () => {
    const g = game();
    expect(g.command({ type: "set_speed", playerId: "a", speed: 9 }).ok).toBe(false);
    expect(g.command({ type: "set_speed", playerId: "a", speed: 1.5 }).ok).toBe(false);
    expect(g.world.speed).toBe(0);
  });

  it("gates debug commands behind meta.debug", () => {
    const plain = game();
    expect(plain.command({ type: "cheat_add_cash", playerId: "a", amount: 10 }).ok).toBe(false);
    expect(plain.command({ type: "set_flag", playerId: "a", flag: "x", value: true }).ok).toBe(
      false,
    );

    const debug = game(true);
    expect(debug.command({ type: "cheat_add_cash", playerId: "a", amount: 10 })).toEqual({
      ok: true,
    });
    expect(debug.world.players.a?.cash).toBe(10);
    expect(debug.command({ type: "set_flag", playerId: "b", flag: "x", value: true })).toEqual({
      ok: true,
    });
    expect(debug.world.players.b?.flags.x).toBe(true);
    expect(debug.world.players.a?.flags.x).toBeUndefined();
  });

  it("never throws on unknown or malformed commands", () => {
    const g = game(true);
    expect(g.command({ type: "nope" } as unknown as PlayerCommand).ok).toBe(false);
    expect(g.command({ type: "set_speed", playerId: "ghost", speed: 1 }).error).toEqual({
      key: "errors.command.unknown_player",
      vars: { player: "ghost" },
    });
    expect(g.command(undefined as unknown as PlayerCommand).ok).toBe(false);
    expect(g.command({ playerId: "a" } as unknown as PlayerCommand).ok).toBe(false);
    expect(g.command({ type: "cheat_add_cash", playerId: "a", amount: Number.NaN }).ok).toBe(false);
  });

  it("reports when no system handles a command", () => {
    const g = createGame({ seed: "no-systems", content: bundle(), systems: [] });
    const result = g.command({
      type: "resolve_event",
      playerId: "p1",
      instanceId: "x",
      optionId: "y",
    });
    expect(result.ok).toBe(false);
    expect(result.error?.key).toBe("errors.command.no_system");
  });
});
