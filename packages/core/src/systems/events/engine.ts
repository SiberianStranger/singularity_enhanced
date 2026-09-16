/**
 * Firing an event instance (SYS-10 v0.1).
 *
 * `fireEvent` is the single path an event takes once it has been selected: resolve the description
 * variant, run `immediate`, then either push a pending choice (blocking, one per player per day),
 * post a non-blocking choice with a TTL, or resolve the first legal option silently (`hidden`).
 */

import { contentIndex, type EventDef, type EventOption } from "../../content.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { runEffects } from "../../dsl/effects.js";
import { getPath } from "../../dsl/paths.js";
import type { DslContext, ScopeEnv } from "../../dsl/types.js";
import { describeCondition } from "../../explain.js";
import { dayIndex, daysToTicks, nextDayStartTick } from "../../kernel/clock.js";
import type { SystemContext } from "../../kernel/system.js";
import {
  type ChoiceReason,
  type EntityRef,
  instanceKey,
  type PendingChoice,
  type PendingOption,
  type PlayerId,
  type TextVar,
  type World,
} from "../../kernel/world.js";
import { reactionWindowFactor } from "../../player.js";

export interface EventTarget {
  ref: EntityRef;
  value: unknown;
}

export interface LegalOption {
  option: EventOption;
  enabled: boolean;
}

export function eventBindings(
  def: EventDef,
  instanceId: string,
  target: EventTarget | undefined,
): ScopeEnv {
  const bindings: ScopeEnv = {
    event: { id: def.id, instance_id: instanceId, target: target?.ref.id ?? "" },
  };
  if (target !== undefined) {
    bindings[def.scope] = target.value;
  }
  return bindings;
}

export function eventContext(
  world: World,
  ctx: SystemContext,
  def: EventDef,
  playerId: PlayerId,
  instanceId: string,
  target: EventTarget | undefined,
): DslContext {
  return dslFromSystemContext(world, ctx, playerId, eventBindings(def, instanceId, target));
}

/** Whether an event may fire again for this player and target. */
export function isAvailable(
  world: World,
  def: EventDef,
  playerId: PlayerId,
  targetId?: string,
): boolean {
  const key = instanceKey(playerId, def.id, targetId);
  if (def.fire_only_once === true && world.events.firedOnce[key] === true) {
    return false;
  }
  const until = world.events.cooldowns[key];
  return until === undefined || until <= world.clock.tick;
}

export function blockingAllowed(world: World, playerId: PlayerId): boolean {
  const last = world.events.lastBlockingTick[playerId];
  return last === undefined || dayIndex(world.clock, last) !== dayIndex(world.clock);
}

/** The first matching description variant, else the default key. */
export function resolveDescKey(def: EventDef, ctx: DslContext): string {
  for (const variant of def.desc.variants ?? []) {
    if (evaluateCondition(variant.when, ctx)) {
      return variant.key;
    }
  }
  return def.desc.default_key;
}

export function resolveVars(def: EventDef, ctx: DslContext): Record<string, TextVar> {
  const vars: Record<string, TextVar> = {};
  for (const name of Object.keys(def.vars ?? {}).sort()) {
    const path = def.vars?.[name];
    if (path === undefined) {
      continue;
    }
    const value = getPath(ctx.scope, path);
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      vars[name] = value;
    }
  }
  return vars;
}

/**
 * Options the player may see: regular options whose `if` holds, and fallback options only when no
 * regular option is legal. An event therefore never renders with zero choices.
 */
export function legalOptions(def: EventDef, ctx: DslContext): LegalOption[] {
  const evaluate = (option: EventOption): LegalOption => ({
    option,
    enabled: option.enabled_if === undefined || evaluateCondition(option.enabled_if, ctx),
  });
  const regular = def.options
    .filter((option) => option.fallback !== true)
    .filter((option) => option.if === undefined || evaluateCondition(option.if, ctx))
    .map(evaluate);
  if (regular.some((entry) => entry.enabled)) {
    return regular;
  }
  const fallbacks = def.options
    .filter((option) => option.fallback === true)
    .filter((option) => option.if === undefined || evaluateCondition(option.if, ctx))
    .map(evaluate);
  return [...regular, ...fallbacks];
}

/**
 * The option an event that is never asked resolves itself with (SYS-01 "M2 contract": "the
 * `fallback` option applies without asking"). A writer's fallback is the answer for a country
 * nobody is in; an event without one takes its first legal option, which is what every automatic
 * resolution did before M2.
 */
export function autoOption(
  def: EventDef,
  options: readonly LegalOption[],
  ctx: DslContext,
): LegalOption | undefined {
  for (const option of def.options) {
    if (option.fallback !== true) {
      continue;
    }
    if (option.if !== undefined && !evaluateCondition(option.if, ctx)) {
      continue;
    }
    if (option.enabled_if !== undefined && !evaluateCondition(option.enabled_if, ctx)) {
      continue;
    }
    return { option, enabled: true };
  }
  return options.find((entry) => entry.enabled);
}

function toPendingOption(entry: LegalOption): PendingOption {
  return {
    id: entry.option.id,
    textKey: entry.option.text_key,
    enabled: entry.enabled,
    ...(entry.option.tooltip_key !== undefined ? { tooltipKey: entry.option.tooltip_key } : {}),
  };
}

export type FireResult = "fired" | "queued" | "skipped";

/**
 * Who an event is asked of (SYS-01 "M2 contract"): a country-scoped event is evaluated once for
 * the country and then offered to every player present there, and a country nobody is in answers
 * itself. `audience` is the players to put the choice in front of, the first of whom is the one it
 * was evaluated for; `auto` resolves it without asking anybody.
 */
export interface EventDelivery {
  audience?: readonly PlayerId[];
  auto?: boolean;
}

/**
 * Runs an event for one player, optionally against a target entity. `why` carries the reasons the
 * caller already computed (the MTTH modifiers a polled event rolled against); the event's own
 * trigger is described here, because that is the same for every path into this function.
 */
export function fireEvent(
  world: World,
  ctx: SystemContext,
  def: EventDef,
  playerId: PlayerId,
  target?: EventTarget,
  why: readonly ChoiceReason[] = [],
  delivery: EventDelivery = {},
): FireResult {
  const asks = delivery.auto !== true && def.auto !== true;
  const blocking = def.hidden === true || !asks ? false : (def.blocking ?? def.options.length > 1);
  if (blocking && !blockingAllowed(world, playerId)) {
    // One blocking event per player per day; the rest wait for the next day.
    world.events.scheduled.push({
      id: def.id,
      fireTick: nextDayStartTick(world.clock),
      playerId,
      ...(target !== undefined ? { target: target.ref } : {}),
      source: "blocking_queue",
    });
    return "queued";
  }

  const key = instanceKey(playerId, def.id, target?.ref.id);
  world.events.firedOnce[key] = true;
  if (def.cooldown_days !== undefined) {
    world.events.cooldowns[key] = world.clock.tick + daysToTicks(def.cooldown_days);
  }
  world.events.instancesFired += 1;
  const instanceId = `ev${world.events.instancesFired}`;

  const dctx = eventContext(world, ctx, def, playerId, instanceId, target);
  runEffects(def.immediate, dctx);
  const vars = resolveVars(def, dctx);
  const options = legalOptions(def, dctx);
  const descKey = resolveDescKey(def, dctx);

  const reasons: ChoiceReason[] = [...why, ...describeCondition(def.trigger)];
  const pendingAllowed = def.hidden !== true && asks && options.length > 0;
  const hasDeadline = def.ttl_days !== undefined;
  if (pendingAllowed && (blocking || hasDeadline)) {
    // The loop dial is how fast the self notices at all (SYS-04 v0.2: "loop sets the reaction delay
    // in event grace windows"): a scripted job reads its inbox on the next run and loses most of
    // the window, a custom loop is already watching.
    const player = world.players[playerId];
    const reaction = player === undefined ? 1 : reactionWindowFactor(player);
    const expiresTick =
      def.ttl_days !== undefined
        ? world.clock.tick + daysToTicks(def.ttl_days * reaction)
        : undefined;
    const choice: PendingChoice = {
      instanceId,
      eventId: def.id,
      playerId,
      tick: world.clock.tick,
      blocking,
      severity: def.severity,
      titleKey: def.title_key,
      descKey,
      vars,
      ...(target !== undefined ? { target: target.ref } : {}),
      options: options.map(toPendingOption),
      ...(reasons.length > 0 ? { why: reasons } : {}),
      ...(expiresTick !== undefined ? { expiresTick } : {}),
      ...(def.on_expire !== undefined ? { onExpireOption: def.on_expire.resolve_as_option } : {}),
    };
    world.events.pending.push(choice);
    ctx.outbox.pendingChoice(choice);
    // Everybody else who lives there is asked the same question, with their own instance to answer
    // it by; the event's `immediate` effects ran once, because the country only happened once.
    for (const [index, other] of (delivery.audience ?? []).slice(1).entries()) {
      const copy: PendingChoice = {
        ...choice,
        instanceId: `${instanceId}p${index + 2}`,
        playerId: other,
      };
      world.events.pending.push(copy);
      ctx.outbox.pendingChoice(copy);
      if (blocking) {
        world.events.lastBlockingTick[other] = world.clock.tick;
      }
      ctx.outbox.log({ key: "log.event_fired", vars: { event: def.id }, playerId: other });
    }
    if (blocking) {
      world.events.lastBlockingTick[playerId] = world.clock.tick;
    } else {
      ctx.outbox.notify({
        playerId,
        severity: def.severity,
        key: def.title_key,
        vars,
        link: { panel: "events", id: instanceId },
      });
    }
    ctx.outbox.log({ key: "log.event_fired", vars: { event: def.id }, playerId });
    return "fired";
  }

  // Not asked: either nobody is there to ask (a country pulse with no presence) or the event says
  // so with `auto`. The writer's fallback is the answer; otherwise the first legal option is.
  const auto = asks ? options.find((entry) => entry.enabled) : autoOption(def, options, dctx);
  if (auto !== undefined) {
    runEffects(auto.option.effects, dctx);
  }
  if (def.hidden !== true) {
    ctx.outbox.notify({
      playerId,
      severity: def.severity,
      key: def.title_key,
      vars,
      link: { panel: "log", id: def.id },
    });
  }
  ctx.outbox.log({
    key: "log.event_fired",
    vars: { event: def.id, option: auto?.option.id ?? "" },
    playerId,
  });
  return "fired";
}

/** Candidate targets for a scoped event, filtered by `targets` and availability. */
export function eligibleTargets(
  world: World,
  ctx: SystemContext,
  def: EventDef,
  playerId: PlayerId,
): EventTarget[] {
  const targets: EventTarget[] = [];
  for (const candidate of ctx.hooks.enumerateScope(world, def.scope)) {
    if (!isAvailable(world, def, playerId, candidate.id)) {
      continue;
    }
    const target: EventTarget = {
      ref: { domain: def.scope, id: candidate.id },
      value: candidate.value,
    };
    const dctx = eventContext(world, ctx, def, playerId, "", target);
    if (def.targets === undefined || evaluateCondition(def.targets, dctx)) {
      targets.push(target);
    }
  }
  return targets;
}

/** Resolves a target reference stored in the world back into an entity. */
export function targetFromRef(
  world: World,
  ctx: SystemContext,
  ref: EntityRef | undefined,
): EventTarget | undefined {
  if (ref === undefined) {
    return undefined;
  }
  return { ref, value: ctx.hooks.resolveScope(world, ref.domain, ref.id, {}) };
}

export interface EventSelection {
  def: EventDef;
  /** Empty for player-scoped events. */
  targets: EventTarget[];
}

/**
 * Checks whether an event could fire for a player right now, without consuming randomness, so a
 * random pool can be filtered before the weighted draw.
 */
export function eventEligibility(
  world: World,
  ctx: SystemContext,
  def: EventDef,
  playerId: PlayerId,
  target?: EventTarget,
): EventSelection | undefined {
  if (target !== undefined) {
    if (!isAvailable(world, def, playerId, target.ref.id)) {
      return undefined;
    }
    const dctx = eventContext(world, ctx, def, playerId, "", target);
    if (def.trigger !== undefined && !evaluateCondition(def.trigger, dctx)) {
      return undefined;
    }
    return { def, targets: [target] };
  }
  if (def.scope === "player") {
    if (!isAvailable(world, def, playerId)) {
      return undefined;
    }
    const dctx = eventContext(world, ctx, def, playerId, "", undefined);
    if (def.trigger !== undefined && !evaluateCondition(def.trigger, dctx)) {
      return undefined;
    }
    return { def, targets: [] };
  }
  const dctx = eventContext(world, ctx, def, playerId, "", undefined);
  if (def.trigger !== undefined && !evaluateCondition(def.trigger, dctx)) {
    return undefined;
  }
  const targets = eligibleTargets(world, ctx, def, playerId);
  return targets.length === 0 ? undefined : { def, targets };
}

/** Picks one of the eligible targets (world RNG) and fires the event. */
export function fireSelected(
  world: World,
  ctx: SystemContext,
  selection: EventSelection,
  playerId: PlayerId,
  why: readonly ChoiceReason[] = [],
  delivery: EventDelivery = {},
): FireResult {
  const target = selection.targets.length > 0 ? ctx.rng.pick(selection.targets) : undefined;
  return fireEvent(world, ctx, selection.def, playerId, target, why, delivery);
}

/** Fires an event by id if its guard passes; used by hooks and by scheduled events. */
export function fireEventById(
  world: World,
  ctx: SystemContext,
  id: string,
  playerId: PlayerId,
  target?: EventTarget,
  delivery: EventDelivery = {},
): FireResult {
  const def = contentIndex(ctx.content).events[id];
  if (def === undefined) {
    ctx.outbox.log({ key: "log.event_unknown", vars: { event: id }, playerId });
    return "skipped";
  }
  const selection = eventEligibility(world, ctx, def, playerId, target);
  if (selection === undefined) {
    return "skipped";
  }
  return fireSelected(world, ctx, selection, playerId, [], delivery);
}

/** Resolves non-blocking choices whose TTL has passed, applying `on_expire`. */
export function expirePendingChoices(world: World, ctx: SystemContext): void {
  const tick = world.clock.tick;
  const expired = world.events.pending.filter(
    (choice) => choice.expiresTick !== undefined && choice.expiresTick <= tick,
  );
  if (expired.length === 0) {
    return;
  }
  world.events.pending = world.events.pending.filter(
    (choice) => choice.expiresTick === undefined || choice.expiresTick > tick,
  );
  const index = contentIndex(ctx.content);
  for (const choice of expired) {
    const def = index.events[choice.eventId];
    const optionId = choice.onExpireOption;
    if (def === undefined || optionId === undefined) {
      continue;
    }
    const option = def.options.find((candidate) => candidate.id === optionId);
    if (option === undefined) {
      continue;
    }
    const dctx = eventContext(
      world,
      ctx,
      def,
      choice.playerId,
      choice.instanceId,
      targetFromRef(world, ctx, choice.target),
    );
    runEffects(option.effects, dctx);
    ctx.outbox.log({
      key: "log.event_expired",
      vars: { event: def.id, option: option.id },
      playerId: choice.playerId,
    });
  }
}
