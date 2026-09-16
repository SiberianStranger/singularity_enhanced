/**
 * Events system: hooks, events, decisions and journal entries (SYS-10 v0.1).
 *
 * Per tick the system fires due scheduled events, expires timed choices, completes decisions and
 * fires the engine hooks whose moment has come. Blocking events become pending choices answered
 * with the `resolve_event` command; `take_decision` starts a decision.
 */

import { contentIndex } from "../../content.js";
import { createConditionRegistry, evaluateCondition } from "../../dsl/conditions.js";
import { createEffectRegistry, runEffects } from "../../dsl/effects.js";
import { asRecord, asString, isRecord, optionalString } from "../../dsl/node.js";
import type { Condition, Effect } from "../../dsl/types.js";
import { isDayStart, isMonthStart, isWeekStart } from "../../kernel/clock.js";
import {
  type CommandContext,
  type CommandHandler,
  type CommandResult,
  fail,
  OK,
  type PlayerCommand,
} from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import { instanceKey, type World } from "../../kernel/world.js";
import { alertDecisions, takeDecisionCommand, tickDecisions } from "./decisions.js";
import { eventContext, expirePendingChoices, fireEvent, targetFromRef } from "./engine.js";
import { fireEntityPulse, fireHook, firePlayerPulse } from "./hooks.js";
import {
  autoStartJournals,
  finishJournal,
  journalStateFor,
  startJournal,
  tickJournals,
} from "./journal.js";

export const EVENTS_SYSTEM_ORDER = 800;

export const EVENT_CONDITION_KINDS = ["journal_active", "event_fired", "decision_taken"] as const;
export const EVENT_EFFECT_KINDS = ["start_journal", "complete_journal", "fail_journal"] as const;

/** World flag that marks `on_game_start` as fired, so a loaded save does not fire it again. */
const GAME_START_FLAG = "hook.on_game_start";

export interface EventsSystem extends System {
  /** Command handlers the engine registers with the command registry. */
  commands: Record<"resolve_event" | "take_decision", CommandHandler>;
}

function payloadId(node: Condition | Effect, kind: string): string {
  const raw = node[kind];
  if (typeof raw === "string") {
    return raw;
  }
  return asString(asRecord(raw, kind).id, `${kind}.id`);
}

function processScheduled(world: World, ctx: SystemContext): void {
  const tick = world.clock.tick;
  const due = world.events.scheduled.filter((entry) => entry.fireTick <= tick);
  if (due.length === 0) {
    return;
  }
  world.events.scheduled = world.events.scheduled.filter((entry) => entry.fireTick > tick);
  const index = contentIndex(ctx.content);
  for (const entry of due) {
    const def = index.events[entry.id];
    if (def === undefined) {
      ctx.outbox.log({
        key: "log.event_unknown",
        vars: { event: entry.id },
        playerId: entry.playerId,
      });
      continue;
    }
    const target = targetFromRef(world, ctx, entry.target);
    const dctx = eventContext(world, ctx, def, entry.playerId, "", target);
    if (def.trigger !== undefined && !evaluateCondition(def.trigger, dctx)) {
      ctx.outbox.log({
        key: "log.event_skipped",
        vars: { event: def.id },
        playerId: entry.playerId,
      });
      continue;
    }
    fireEvent(world, ctx, def, entry.playerId, target);
  }
}

/** Handles the `resolve_event` command. */
export function resolveEventCommand(
  world: World,
  command: PlayerCommand,
  ctx: CommandContext,
): CommandResult {
  if (command.type !== "resolve_event") {
    return fail(`the event engine cannot handle "${command.type}"`);
  }
  const index = world.events.pending.findIndex(
    (choice) => choice.instanceId === command.instanceId,
  );
  const choice = world.events.pending[index];
  if (choice === undefined) {
    return fail(`no pending event "${command.instanceId}"`);
  }
  if (choice.playerId !== command.playerId) {
    return fail(`event "${command.instanceId}" belongs to another player`);
  }
  const def = contentIndex(ctx.content).events[choice.eventId];
  if (def === undefined) {
    return fail(`unknown event "${choice.eventId}"`);
  }
  const option = def.options.find((candidate) => candidate.id === command.optionId);
  if (option === undefined) {
    return fail(`unknown option "${command.optionId}" for event "${def.id}"`);
  }

  const target = targetFromRef(world, ctx, choice.target);
  const dctx = eventContext(world, ctx, def, choice.playerId, choice.instanceId, target);
  if (option.if !== undefined && option.fallback !== true && !evaluateCondition(option.if, dctx)) {
    return fail(`option "${option.id}" is not available`);
  }
  if (option.enabled_if !== undefined && !evaluateCondition(option.enabled_if, dctx)) {
    return fail(`option "${option.id}" is not enabled`);
  }

  world.events.pending.splice(index, 1);
  runEffects(option.effects, dctx);
  ctx.outbox.log({
    key: "log.event_resolved",
    vars: { event: def.id, option: option.id },
    playerId: choice.playerId,
  });
  fireHook(world, ctx, "on_event_option", choice.playerId, {
    bindings: { event: { id: def.id, instance_id: choice.instanceId, option: option.id } },
  });
  return OK;
}

function registerConditions(): ReturnType<typeof createConditionRegistry> {
  const registry = createConditionRegistry();

  registry.register("journal_active", (node, ctx) => {
    const state = journalStateFor(ctx.world, ctx.playerId, payloadId(node, "journal_active"));
    return state?.status === "active";
  });

  registry.register("event_fired", (node, ctx) => {
    const id = payloadId(node, "event_fired");
    const payload = node.event_fired;
    const targetId = isRecord(payload)
      ? optionalString(payload.target, "event_fired.target")
      : undefined;
    return ctx.world.events.firedOnce[instanceKey(ctx.playerId, id, targetId)] === true;
  });

  registry.register("decision_taken", (node, ctx) => {
    const id = payloadId(node, "decision_taken");
    return (ctx.world.decisions.taken[instanceKey(ctx.playerId, id)] ?? 0) > 0;
  });

  return registry;
}

function registerEffects(): ReturnType<typeof createEffectRegistry> {
  const registry = createEffectRegistry();

  registry.register("start_journal", (node, ctx) => {
    const payload = node.start_journal;
    const targetName = isRecord(payload)
      ? optionalString(payload.target, "start_journal.target")
      : undefined;
    const bound = targetName === undefined ? undefined : ctx.scope[targetName];
    const target =
      targetName !== undefined && isRecord(bound) && typeof bound.id === "string"
        ? { domain: targetName, id: bound.id }
        : undefined;
    startJournal(ctx.world, ctx, payloadId(node, "start_journal"), ctx.playerId, target);
  });

  registry.register("complete_journal", (node, ctx) => {
    const state = journalStateFor(ctx.world, ctx.playerId, payloadId(node, "complete_journal"));
    if (state !== undefined && state.status === "active") {
      finishJournal(ctx.world, ctx, state, "complete");
    }
  });

  registry.register("fail_journal", (node, ctx) => {
    const state = journalStateFor(ctx.world, ctx.playerId, payloadId(node, "fail_journal"));
    if (state !== undefined && state.status === "active") {
      finishJournal(ctx.world, ctx, state, "failed");
    }
  });

  return registry;
}

export function createEventsSystem(): EventsSystem {
  return {
    manifest: {
      id: "events",
      cadence: "hourly",
      order: EVENTS_SYSTEM_ORDER,
      writes: [],
      conditions: registerConditions(),
      effects: registerEffects(),
    },
    tick(world: World, ctx: SystemContext): void {
      processScheduled(world, ctx);
      expirePendingChoices(world, ctx);
      tickDecisions(world, ctx);

      if (world.flags[GAME_START_FLAG] !== true) {
        world.flags[GAME_START_FLAG] = true;
        for (const playerId of world.playerOrder) {
          fireHook(world, ctx, "on_game_start", playerId);
        }
      }

      firePlayerPulse(world, ctx, "on_player_hour");
      if (isDayStart(world.clock)) {
        firePlayerPulse(world, ctx, "on_player_day");
        fireEntityPulse(world, ctx, "on_actor_day", "actor");
        autoStartJournals(world, ctx);
        tickJournals(world, ctx);
        alertDecisions(world, ctx);
      }
      if (isWeekStart(world.clock)) {
        firePlayerPulse(world, ctx, "on_player_week");
      }
      if (isMonthStart(world.clock)) {
        firePlayerPulse(world, ctx, "on_player_month");
        fireEntityPulse(world, ctx, "on_country_month", "country");
      }
    },
    commands: {
      resolve_event: resolveEventCommand,
      take_decision: takeDecisionCommand,
    },
  };
}

export { alertDecisions, decisionStatus, takeDecisionCommand, tickDecisions } from "./decisions.js";
export {
  eventEligibility,
  fireEvent,
  fireEventById,
  fireSelected,
  isAvailable,
  legalOptions,
} from "./engine.js";
export { fireHook, firePlayerPulse, pulseCadenceTicks } from "./hooks.js";
export { autoStartJournals, journalStateFor, startJournal, tickJournals } from "./journal.js";
