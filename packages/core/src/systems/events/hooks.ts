/**
 * Hooks (SYS-10 v0.1).
 *
 * A hook is a named game moment. The engine fires a fixed set (`on_player_day`, `on_game_start`,
 * `on_decision_taken`, ...); content appends to them with `extends`. Events are evaluated when a
 * hook fires, not by polling every event every tick: a polled event declares the pulse it rides on,
 * a pool event is drawn from a hook's `random_events` bucket (including the explicit `null` bucket).
 */

import { contentIndex, type EventDef, type HookDef, type PulseHook } from "../../content.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { mtthBreakdown, mtthToHazard } from "../../dsl/mtth.js";
import type { ScopeEnv } from "../../dsl/types.js";
import { evaluateWeight } from "../../dsl/weight.js";
import { describeMtth } from "../../explain.js";
import {
  daysFromCivil,
  daysToTicks,
  HOURS_PER_DAY,
  TICKS_PER_DAY,
  tickToDate,
} from "../../kernel/clock.js";
import type { SystemContext } from "../../kernel/system.js";
import type { PlayerId, World } from "../../kernel/world.js";
import {
  eventContext,
  eventEligibility,
  type FireResult,
  fireEventById,
  fireSelected,
} from "./engine.js";

/** Guards against a cycle in content `hooks:` chains. */
export const MAX_HOOK_DEPTH = 8;

export interface HookOptions {
  /** Extra scope bindings, e.g. the country a `on_country_month` hook runs for. */
  bindings?: ScopeEnv;
  /** Ticks between two firings of this hook; used to convert MTTH into a hazard. */
  cadenceTicks?: number;
  depth?: number;
}

/** How many ticks pass between two firings of a pulse hook. */
export function pulseCadenceTicks(world: World, pulse: PulseHook): number {
  switch (pulse) {
    case "on_player_hour":
      return 1;
    case "on_player_day":
    case "on_actor_day":
      return TICKS_PER_DAY;
    case "on_player_week":
      return 7 * TICKS_PER_DAY;
    case "on_player_month":
    case "on_country_month": {
      const date = tickToDate(world.clock);
      const previousYear = date.month === 1 ? date.year - 1 : date.year;
      const previousMonth = date.month === 1 ? 12 : date.month - 1;
      const days =
        daysFromCivil(date.year, date.month, 1) - daysFromCivil(previousYear, previousMonth, 1);
      return days * HOURS_PER_DAY;
    }
    default:
      return TICKS_PER_DAY;
  }
}

function fired(result: FireResult): boolean {
  return result === "fired" || result === "queued";
}

/** Rolls the MTTH hazard of a polled event attached to this pulse. */
function pollEvent(
  world: World,
  ctx: SystemContext,
  def: EventDef,
  playerId: PlayerId,
  cadenceTicks: number,
): boolean {
  const selection = eventEligibility(world, ctx, def, playerId);
  if (selection === undefined) {
    return false;
  }
  const target = selection.targets.length > 0 ? ctx.rng.pick(selection.targets) : undefined;
  const dctx = eventContext(world, ctx, def, playerId, "", target);
  const weight = def.mtth_days ?? 0;
  const breakdown = mtthBreakdown(weight, (condition) => evaluateCondition(condition, dctx));
  if (!ctx.rng.chance(mtthToHazard(breakdown.mtthDays, cadenceTicks))) {
    return false;
  }
  // The modifiers that were just applied are the ones the event window explains (SYS-11).
  return fired(
    fireSelected(
      world,
      ctx,
      { def: selection.def, targets: target ? [target] : [] },
      playerId,
      describeMtth(weight, breakdown),
    ),
  );
}

function runRandomPool(
  world: World,
  ctx: SystemContext,
  hook: HookDef,
  playerId: PlayerId,
  bindings: ScopeEnv | undefined,
): boolean {
  const pool = hook.random_events;
  if (pool === undefined || pool.pool.length === 0) {
    return false;
  }
  const dctx = dslFromSystemContext(world, ctx, playerId, bindings);
  if (!ctx.rng.chance(pool.chance_to_happen ?? 1)) {
    return false;
  }
  const index = contentIndex(ctx.content);
  const entries: { weight: number; id: string | null }[] = [];
  for (const entry of pool.pool) {
    const weight = evaluateWeight(entry.weight, (condition) => evaluateCondition(condition, dctx));
    if (weight <= 0) {
      continue;
    }
    if (entry.id === null) {
      entries.push({ weight, id: null });
      continue;
    }
    const def = index.events[entry.id];
    if (def !== undefined && eventEligibility(world, ctx, def, playerId) !== undefined) {
      entries.push({ weight, id: entry.id });
    }
  }
  if (entries.length === 0) {
    return false;
  }
  const chosen = ctx.rng.weighted(entries);
  if (chosen.id === null) {
    return false;
  }
  return fired(fireEventById(world, ctx, chosen.id, playerId));
}

function runHookDef(
  world: World,
  ctx: SystemContext,
  hook: HookDef,
  playerId: PlayerId,
  options: HookOptions,
): boolean {
  const dctx = dslFromSystemContext(world, ctx, playerId, options.bindings);
  if (hook.trigger !== undefined && !evaluateCondition(hook.trigger, dctx)) {
    return false;
  }

  let anyFired = false;
  for (const ref of hook.events ?? []) {
    if (ref.delay_days !== undefined && ref.delay_days > 0) {
      world.events.scheduled.push({
        id: ref.id,
        fireTick: world.clock.tick + daysToTicks(ref.delay_days),
        playerId,
        source: hook.id,
      });
      anyFired = true;
      continue;
    }
    anyFired = fired(fireEventById(world, ctx, ref.id, playerId)) || anyFired;
  }

  anyFired = runRandomPool(world, ctx, hook, playerId, options.bindings) || anyFired;

  const index = contentIndex(ctx.content);
  for (const id of hook.first_valid ?? []) {
    const def = index.events[id];
    if (def === undefined) {
      continue;
    }
    const selection = eventEligibility(world, ctx, def, playerId);
    if (selection !== undefined) {
      anyFired = fired(fireSelected(world, ctx, selection, playerId)) || anyFired;
      break;
    }
  }

  for (const childId of hook.hooks ?? []) {
    anyFired =
      fireHook(world, ctx, childId, playerId, {
        ...options,
        depth: (options.depth ?? 0) + 1,
      }) || anyFired;
  }

  if (!anyFired && hook.fallback !== undefined) {
    anyFired = fired(fireEventById(world, ctx, hook.fallback, playerId));
  }
  return anyFired;
}

/** Fires one hook: its polled events first, then every content hook attached to it. */
export function fireHook(
  world: World,
  ctx: SystemContext,
  hookId: string,
  playerId: PlayerId,
  options: HookOptions = {},
): boolean {
  if ((options.depth ?? 0) > MAX_HOOK_DEPTH) {
    ctx.outbox.log({ key: "log.hook_too_deep", vars: { hook: hookId }, playerId });
    return false;
  }
  const index = contentIndex(ctx.content);
  const cadenceTicks = options.cadenceTicks ?? TICKS_PER_DAY;
  let anyFired = false;

  for (const def of index.polledByPulse[hookId] ?? []) {
    anyFired = pollEvent(world, ctx, def, playerId, cadenceTicks) || anyFired;
  }
  const attached = index.hooksByEngineHook[hookId] ?? [];
  const named = index.hooksById[hookId];
  const defs = named !== undefined && !attached.includes(named) ? [...attached, named] : attached;
  for (const hook of defs) {
    anyFired = runHookDef(world, ctx, hook, playerId, options) || anyFired;
  }
  return anyFired;
}

/** Fires a pulse hook for every player in turn. */
export function firePlayerPulse(world: World, ctx: SystemContext, pulse: PulseHook): void {
  const cadenceTicks = pulseCadenceTicks(world, pulse);
  for (const playerId of world.playerOrder) {
    fireHook(world, ctx, pulse, playerId, { cadenceTicks });
  }
}

/**
 * Fires a pulse hook for every entity of a domain. The evaluation still needs a player binding for
 * `player.*` paths, so it runs for the host player; per-country ownership arrives with SYS-11.
 */
export function fireEntityPulse(
  world: World,
  ctx: SystemContext,
  pulse: PulseHook,
  domain: string,
): void {
  const cadenceTicks = pulseCadenceTicks(world, pulse);
  const hostPlayerId = world.meta.hostPlayerId;
  for (const candidate of ctx.hooks.enumerateScope(world, domain)) {
    fireHook(world, ctx, pulse, hostPlayerId, {
      cadenceTicks,
      bindings: { [domain]: candidate.value },
    });
  }
}
