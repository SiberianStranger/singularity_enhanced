import { describe, expect, it } from "vitest";
import {
  createWritablePaths,
  DslError,
  getPath,
  KERNEL_WRITABLE_PATHS,
  matchPathPattern,
  setPath,
  splitPath,
} from "../src/dsl/paths.js";

const writable = createWritablePaths([...KERNEL_WRITABLE_PATHS, "site.exposure.*", "site.**"]);

describe("paths", () => {
  it("reads nested values and undefined for missing ones", () => {
    const scope = { player: { cash: 100, vars: { risk: 0.5 } }, site: null };
    expect(getPath(scope, "player.cash")).toBe(100);
    expect(getPath(scope, "player.vars.risk")).toBe(0.5);
    expect(getPath(scope, "player.vars.missing")).toBeUndefined();
    expect(getPath(scope, "nothing.here.at.all")).toBeUndefined();
    expect(getPath(scope, "site.kind")).toBeUndefined();
    expect(() => splitPath("player..cash")).toThrow(DslError);
  });

  it("matches glob-like patterns", () => {
    expect(matchPathPattern("player.vars.*", "player.vars.risk")).toBe(true);
    expect(matchPathPattern("player.vars.*", "player.vars.a.b")).toBe(false);
    expect(matchPathPattern("site.**", "site.exposure.billing")).toBe(true);
    expect(matchPathPattern("player.cash", "player.cash")).toBe(true);
    expect(matchPathPattern("player.cash", "player.cashflow")).toBe(false);
  });

  it("writes whitelisted paths and creates missing objects", () => {
    const scope = { player: { cash: 10, vars: {} as Record<string, unknown> } };
    setPath(scope, "player.cash", 42, writable);
    setPath(scope, "player.vars.new_counter", 7, writable);
    expect(scope.player.cash).toBe(42);
    expect(scope.player.vars.new_counter).toBe(7);

    const site = { site: { id: "s1" } as Record<string, unknown> };
    setPath(site, "site.exposure.billing", 0.4, writable);
    expect(site.site.exposure).toEqual({ billing: 0.4 });
  });

  it("rejects writes outside the whitelist", () => {
    const scope = { player: { cash: 1 }, world: { secret: 1 } };
    expect(() => setPath(scope, "world.secret", 2, writable)).toThrow(DslError);
    try {
      setPath(scope, "world.secret", 2, writable);
    } catch (error) {
      expect(error).toBeInstanceOf(DslError);
      expect((error as DslError).code).toBe("dsl_unwritable_path");
    }
  });

  it("collects patterns and extends them", () => {
    const base = createWritablePaths(["a.b"]);
    expect(base.allows("a.b")).toBe(true);
    expect(base.allows("c.d")).toBe(false);
    expect(base.with(["c.*"]).allows("c.d")).toBe(true);
    expect(base.patterns()).toEqual(["a.b"]);
  });
});
