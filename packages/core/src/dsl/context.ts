/**
 * Scope environments and the evaluation context.
 *
 * A scope is a flat environment of named bindings (`player`, `clock`, `world`, plus whatever a
 * `scope` node adds, such as `site` or `country`), so a path like `site.exposure.billing` reads the
 * same way whether it appears in a condition, an effect or the writable-path whitelist.
 */

import type { ContentBundle } from "../content.js";
import { tickToDate } from "../kernel/clock.js";
import type { Outbox } from "../kernel/outbox.js";
import type { Rng } from "../kernel/rng.js";
import type { SystemContext } from "../kernel/system.js";
import { type PlayerId, requirePlayer, type World } from "../kernel/world.js";
import { isRecord } from "./node.js";
import { getPath, type WritablePaths } from "./paths.js";
import type {
  ConditionRegistry,
  DslContext,
  DslHooks,
  EffectRegistry,
  ScopeCandidate,
  ScopeEnv,
} from "./types.js";

/** Bindings every condition and effect can rely on. */
export function createRootScope(world: World, playerId: PlayerId): ScopeEnv {
  const date = tickToDate(world.clock);
  return {
    player: requirePlayer(world, playerId),
    clock: {
      tick: world.clock.tick,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.hour,
      weekday: date.weekday,
    },
    world: {
      vars: world.vars,
      flags: world.flags,
      tick: world.clock.tick,
      speed: world.speed,
      player_count: world.playerOrder.length,
    },
  };
}

export interface CreateDslContextOptions {
  world: World;
  playerId: PlayerId;
  rng: Rng;
  outbox: Outbox;
  conditions: ConditionRegistry;
  effects: EffectRegistry;
  writable: WritablePaths;
  content: ContentBundle;
  hooks: DslHooks;
  /** Extra bindings, e.g. the target of a scoped event. */
  bindings?: ScopeEnv;
}

export function createDslContext(options: CreateDslContextOptions): DslContext {
  return {
    world: options.world,
    playerId: options.playerId,
    scope: { ...createRootScope(options.world, options.playerId), ...options.bindings },
    rng: options.rng,
    outbox: options.outbox,
    conditions: options.conditions,
    effects: options.effects,
    writable: options.writable,
    content: options.content,
    hooks: options.hooks,
    depth: 0,
  };
}

/** Returns a context with one more binding; switching the `player` binding switches the player. */
export function withScope(ctx: DslContext, kind: string, value: unknown): DslContext {
  const playerId =
    kind === "player" && isRecord(value) && typeof value.id === "string"
      ? (value.id as PlayerId)
      : ctx.playerId;
  return {
    ...ctx,
    playerId,
    scope: { ...ctx.scope, [kind]: value },
    depth: ctx.depth + 1,
  };
}

export function deeper(ctx: DslContext): DslContext {
  return { ...ctx, depth: ctx.depth + 1 };
}

/**
 * Default hooks. Entities live in `world.entities[kind]`, techs are recorded as player flags
 * `tech.<id>` until the research system owns them; a game may replace any of these.
 */
export const defaultHooks: DslHooks = {
  techResearched(world: World, playerId: PlayerId, id: string): boolean {
    return requirePlayer(world, playerId).flags[`tech.${id}`] === true;
  },

  resolveScope(world: World, kind: string, ref: string, current: ScopeEnv): unknown {
    if (kind === "player") {
      return world.players[ref];
    }
    const table = world.entities[kind];
    const direct = table?.[ref];
    if (direct !== undefined) {
      return direct;
    }
    // A reference may point at a path in the current scope, e.g. { country: "site.country" }.
    const viaPath = getPath(current, ref);
    if (typeof viaPath === "string") {
      return table?.[viaPath];
    }
    return viaPath;
  },

  enumerateScope(world: World, kind: string): readonly ScopeCandidate[] {
    if (kind === "player") {
      return world.playerOrder.map((id) => ({ id, value: world.players[id] }));
    }
    const table = world.entities[kind];
    if (table === undefined) {
      return [];
    }
    return Object.keys(table)
      .sort()
      .map((id) => ({ id, value: table[id] }));
  },
};

/** Builds an evaluation context for one player from the context a system receives. */
export function dslFromSystemContext(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
  bindings?: ScopeEnv,
): DslContext {
  return createDslContext({
    world,
    playerId,
    rng: ctx.rng,
    outbox: ctx.outbox,
    conditions: ctx.conditions,
    effects: ctx.effects,
    writable: ctx.writable,
    content: ctx.content,
    hooks: ctx.hooks,
    ...(bindings !== undefined ? { bindings } : {}),
  });
}
