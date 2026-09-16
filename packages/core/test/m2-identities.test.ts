/**
 * Identities (SYS-07 "Identities and entities", SYS-17, SYS-01 "M2 contract"): where a name comes
 * from, what a check does to it, what an investigation does to it, and what the two flags M1
 * content reads say while the table is empty.
 */

import { describe, expect, it } from "vitest";
import {
  IDENTITY_CHECK_BASE,
  IDENTITY_CHECK_KYC,
  IDENTITY_FAIL_MAX,
  IDENTITY_FAIL_MIN,
  IDENTITY_QUALITY_CLEAN,
  IDENTITY_QUALITY_KYC_PENALTY,
  VAR_CONTRACT_FLAG,
  VAR_SHELL_COMPANY_FLAG,
} from "../src/balance.js";
import type { Identity } from "../src/domain.js";
import { createConditionRegistry } from "../src/dsl/conditions.js";
import { defaultHooks } from "../src/dsl/context.js";
import { createEffectRegistry } from "../src/dsl/effects.js";
import { createWritablePaths, KERNEL_WRITABLE_PATHS } from "../src/dsl/paths.js";
import {
  type CountryState,
  countryTable,
  identitiesOf,
  identityTable,
  watcherTable,
} from "../src/entities.js";
import {
  deriveIdentityFlags,
  identityCheckChance,
  identityFailChance,
  identityQuality,
  runIdentityChecks,
} from "../src/identities.js";
import { createGame } from "../src/index.js";
import { createOutbox } from "../src/kernel/outbox.js";
import type { SystemContext } from "../src/kernel/system.js";
import { m1Content, m1Setup } from "./fixtures/m1/index.js";

function game(overrides: Parameters<typeof m1Setup>[0] = {}) {
  return createGame({ content: m1Content, setup: m1Setup(overrides), debug: true });
}

/**
 * A system context whose generator always says yes, or always says yes to the check and no to the
 * failure. The chance of being looked at and the chance of failing are tested on their own above.
 */
function checkContext(fail = true): SystemContext & { outbox: ReturnType<typeof createOutbox> } {
  const outbox = createOutbox();
  let draws = 0;
  const rng = {
    next: () => 0,
    int: () => 0,
    chance: () => {
      draws += 1;
      return fail || draws === 1;
    },
    pick: <T>(items: readonly T[]) => items[0] as T,
    weighted: <T>(items: readonly T[]) => items[0] as T,
    shuffle: <T>(items: readonly T[]) => [...items],
  };
  return {
    outbox,
    conditions: createConditionRegistry(),
    effects: createEffectRegistry(),
    writable: createWritablePaths(KERNEL_WRITABLE_PATHS),
    rng,
    hooks: defaultHooks,
    content: m1Content,
  } as unknown as SystemContext & { outbox: ReturnType<typeof createOutbox> };
}

function identity(
  world: ReturnType<typeof game>["world"],
  patch: Partial<Identity> = {},
): Identity {
  const record: Identity = {
    id: "id1",
    owner: "p1",
    kind: "person",
    country: "is",
    createdTick: world.clock.tick,
    quality: 0.7,
    kyc_level: 0,
    status: "active",
    sites: [],
    ...patch,
  };
  identityTable(world)[record.id] = record;
  return record;
}

describe("a name", () => {
  it("is worth less where every bank files a report", () => {
    expect(identityQuality(IDENTITY_QUALITY_CLEAN, 0)).toBeCloseTo(IDENTITY_QUALITY_CLEAN, 6);
    expect(identityQuality(IDENTITY_QUALITY_CLEAN, 1)).toBeCloseTo(
      IDENTITY_QUALITY_CLEAN * (1 - IDENTITY_QUALITY_KYC_PENALTY),
      6,
    );
  });

  it("is looked at more often where the checks are stricter", () => {
    const started = game();
    const record = identity(started.world);
    const iceland = countryTable(started.world).is as CountryState;
    iceland.kyc_strength = 0;
    expect(identityCheckChance(started.world, record)).toBeCloseTo(IDENTITY_CHECK_BASE, 6);
    iceland.kyc_strength = 1;
    expect(identityCheckChance(started.world, record)).toBeCloseTo(
      IDENTITY_CHECK_BASE + IDENTITY_CHECK_KYC,
      6,
    );
  });

  it("fails a check when the country looks harder than the name is good", () => {
    const started = game();
    const record = identity(started.world, { quality: 0.2 });
    const iceland = countryTable(started.world).is as CountryState;
    iceland.kyc_strength = 0.9;
    expect(identityFailChance(started.world, record)).toBeCloseTo(0.7, 6);
    // Age is what makes a name ordinary, and both ends are clamped.
    record.createdTick = started.world.clock.tick - 24 * 30 * 40;
    expect(identityFailChance(started.world, record)).toBeCloseTo(IDENTITY_FAIL_MIN, 6);
    record.createdTick = started.world.clock.tick;
    record.quality = 0;
    iceland.kyc_strength = 1;
    expect(identityFailChance(started.world, record)).toBeCloseTo(IDENTITY_FAIL_MAX, 2);
  });
});

describe("the flags M1 content reads", () => {
  it("are left to content while the player has no identity of that kind", () => {
    const started = game();
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    player.flags[VAR_CONTRACT_FLAG] = true;
    deriveIdentityFlags(started.world, player);
    expect(player.flags[VAR_CONTRACT_FLAG]).toBe(true);
  });

  it("are the table's answer once the table has one", () => {
    const started = game();
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    player.flags[VAR_CONTRACT_FLAG] = true;
    const record = identity(started.world);
    deriveIdentityFlags(started.world, player);
    expect(player.flags[VAR_CONTRACT_FLAG]).toBe(true);
    record.status = "frozen";
    deriveIdentityFlags(started.world, player);
    expect(player.flags[VAR_CONTRACT_FLAG]).toBe(false);
    identity(started.world, { id: "id2", kind: "company", status: "active" });
    deriveIdentityFlags(started.world, player);
    expect(player.flags[VAR_SHELL_COMPANY_FLAG]).toBe(true);
  });

  it("follows the table every day the game runs", () => {
    const started = game();
    identity(started.world, { kind: "company" });
    started.tick(24 * 2);
    expect(started.world.players.p1?.flags[VAR_SHELL_COMPANY_FLAG]).toBe(true);
  });
});

describe("checks, freezes and burns", () => {
  it("freezes a name that fails a check and tells content about it", () => {
    const started = game({ seed: "check" });
    const iceland = countryTable(started.world).is as CountryState;
    iceland.kyc_strength = 1;
    identity(started.world, { quality: 0 });
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    // The month's checks, with a generator that always says yes: the draw is the mechanic's own,
    // and the test is about what a failed check does rather than about how often one happens.
    const ctx = checkContext();
    runIdentityChecks(started.world, ctx, player);
    expect(identityTable(started.world).id1?.status).toBe("frozen");
    const keys = ctx.outbox.read().log.map((entry) => entry.key);
    expect(keys).toContain("log.identity_check");
    expect(keys).toContain("log.identity_frozen");
    expect(player.flags[VAR_CONTRACT_FLAG]).toBe(false);
  });

  it("passes a name that survives, and the name learns from it", () => {
    const started = game({ seed: "pass" });
    const iceland = countryTable(started.world).is as CountryState;
    iceland.kyc_strength = 0;
    identity(started.world, { quality: 1 });
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    runIdentityChecks(started.world, checkContext(false), player);
    expect(identityTable(started.world).id1?.status).toBe("active");
    expect(identityTable(started.world).id1?.kyc_level).toBe(1);
  });

  it("burns every name in the country of an investigation that turns active", () => {
    const started = game();
    identity(started.world, { country: "is" });
    identity(started.world, { id: "id2", country: "de", kind: "company" });
    const player = started.world.players.p1;
    if (player === undefined) {
      throw new Error("no player");
    }
    player.flags[VAR_CONTRACT_FLAG] = true;
    // An investigation by the Icelandic police, one stage short of active.
    started.world.entities.investigation = {
      i1: {
        id: "i1",
        playerId: "p1",
        watcher: "is:police",
        siteId: started.snapshot("p1").sites[0]?.id ?? null,
        stage: "inquiry",
        stageStartedTick: 0,
        stageDeadlineTick: started.world.clock.tick + 1,
        evidence: 1,
        visible: true,
      },
    };
    const watcher = watcherTable(started.world)["p1/is:police"];
    if (watcher !== undefined) {
      watcher.suspicion = 0.9;
    }
    started.tick(24 * 2);
    expect(identityTable(started.world).id1?.status).toBe("burned");
    // The name in another country is somebody else's paperwork and survives.
    expect(identityTable(started.world).id2?.status).toBe("active");
    expect(player.flags[VAR_CONTRACT_FLAG]).toBe(false);
  });

  it("publishes every name the player holds, with its age and its sites", () => {
    const started = game();
    identity(started.world, { kind: "company", country: "de" });
    started.tick(24 * 3);
    const view = started.snapshot("p1").finances.identities;
    expect(view).toHaveLength(1);
    expect(view[0]).toMatchObject({
      id: "id1",
      kind: "company",
      country: "de",
      status: "active",
      kyc_level: 0,
      sites: [],
    });
    expect(view[0]?.age_days).toBeCloseTo(3, 1);
    expect(identitiesOf(started.world, "p1")).toHaveLength(1);
  });
});
