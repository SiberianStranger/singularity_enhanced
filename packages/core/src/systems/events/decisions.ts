/**
 * Decisions: player-initiated actions with visibility, cost, cooldown and optional duration.
 *
 * v0 only charges the `cash` part of a cost; `compute_hours` and `attention` are recorded in the
 * schema and become payable when the compute and detection systems land.
 */

import { contentIndex, type DecisionDef } from "../../content.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { runEffects } from "../../dsl/effects.js";
import { daysToTicks } from "../../kernel/clock.js";
import {
  type CommandContext,
  type CommandResult,
  fail,
  OK,
  type PlayerCommand,
  wrongCommand,
} from "../../kernel/commands.js";
import type { SystemContext } from "../../kernel/system.js";
import { instanceKey, type PlayerId, requirePlayer, type World } from "../../kernel/world.js";
import { fireHook } from "./hooks.js";

/**
 * Whether a decision is offered and, when it is not, the locale key that says why. The key is the
 * same one `take_decision` refuses with, so the greyed-out tooltip and the refusal read alike.
 */
export interface DecisionStatus {
  visible: boolean;
  enabled: boolean;
  reason?: string;
}

function decisionKey(playerId: PlayerId, id: string): string {
  return instanceKey(playerId, id);
}

/** Whether a decision shows up for a player and whether it can be taken right now. */
export function decisionStatus(
  world: World,
  ctx: SystemContext,
  def: DecisionDef,
  playerId: PlayerId,
): DecisionStatus {
  const dctx = dslFromSystemContext(world, ctx, playerId);
  if (def.visible_if !== undefined && !evaluateCondition(def.visible_if, dctx)) {
    return { visible: false, enabled: false, reason: "errors.decision.not_visible" };
  }
  const key = decisionKey(playerId, def.id);
  const taken = world.decisions.taken[key] ?? 0;
  if (taken > 0 && def.repeatable !== true) {
    return { visible: true, enabled: false, reason: "errors.decision.already_taken" };
  }
  const cooldownUntil = world.decisions.cooldowns[key];
  if (cooldownUntil !== undefined && cooldownUntil > world.clock.tick) {
    return { visible: true, enabled: false, reason: "errors.decision.on_cooldown" };
  }
  if (
    world.decisions.inProgress.some((entry) => entry.id === def.id && entry.playerId === playerId)
  ) {
    return { visible: true, enabled: false, reason: "errors.decision.in_progress" };
  }
  const cashCost = def.cost?.cash ?? 0;
  if (cashCost > 0 && requirePlayer(world, playerId).cash < cashCost) {
    return { visible: true, enabled: false, reason: "errors.decision.cannot_afford" };
  }
  if (def.enabled_if !== undefined && !evaluateCondition(def.enabled_if, dctx)) {
    return { visible: true, enabled: false, reason: "errors.decision.not_enabled" };
  }
  return { visible: true, enabled: true };
}

/** Handles the `take_decision` command. */
export function takeDecisionCommand(
  world: World,
  command: PlayerCommand,
  ctx: CommandContext,
): CommandResult {
  if (command.type !== "take_decision") {
    return wrongCommand("decisions", command.type);
  }
  const def = contentIndex(ctx.content).decisions[command.id];
  if (def === undefined) {
    return fail("errors.decision.unknown", { decision: command.id });
  }
  const playerId = command.playerId;
  const status = decisionStatus(world, ctx, def, playerId);
  if (!status.visible) {
    return fail("errors.decision.not_visible", { decision: def.id });
  }
  if (!status.enabled) {
    return fail(status.reason ?? "errors.decision.not_enabled", { decision: def.id });
  }

  const key = decisionKey(playerId, def.id);
  const cashCost = def.cost?.cash ?? 0;
  if (cashCost > 0) {
    requirePlayer(world, playerId).cash -= cashCost;
  }
  world.decisions.taken[key] = (world.decisions.taken[key] ?? 0) + 1;
  if (def.cooldown_days !== undefined) {
    world.decisions.cooldowns[key] = world.clock.tick + daysToTicks(def.cooldown_days);
  }

  const dctx = dslFromSystemContext(world, ctx, playerId, { decision: { id: def.id } });
  runEffects(def.effects, dctx);
  ctx.outbox.log({ key: "log.decision_taken", vars: { decision: def.id }, playerId });
  fireHook(world, ctx, "on_decision_taken", playerId, { bindings: { decision: { id: def.id } } });

  if (def.duration_days !== undefined) {
    world.decisions.inProgress.push({
      id: def.id,
      playerId,
      startedTick: world.clock.tick,
      completeTick: world.clock.tick + daysToTicks(def.duration_days),
    });
  }
  return OK;
}

/** Completes decisions whose duration has elapsed. */
export function tickDecisions(world: World, ctx: SystemContext): void {
  const index = contentIndex(ctx.content);
  const due = world.decisions.inProgress.filter((entry) => entry.completeTick <= world.clock.tick);
  if (due.length === 0) {
    return;
  }
  world.decisions.inProgress = world.decisions.inProgress.filter(
    (entry) => entry.completeTick > world.clock.tick,
  );
  for (const entry of due) {
    const def = index.decisions[entry.id];
    if (def === undefined) {
      continue;
    }
    const dctx = dslFromSystemContext(world, ctx, entry.playerId, { decision: { id: def.id } });
    runEffects(def.on_complete, dctx);
    ctx.outbox.log({
      key: "log.decision_completed",
      vars: { decision: def.id },
      playerId: entry.playerId,
    });
  }
}

/** Daily: alerts each player once about a decision that just became available. */
export function alertDecisions(world: World, ctx: SystemContext): void {
  const defs = [...ctx.content.decisions].sort((a, b) => a.id.localeCompare(b.id));
  for (const playerId of world.playerOrder) {
    for (const def of defs) {
      if (def.should_alert === undefined) {
        continue;
      }
      const key = decisionKey(playerId, def.id);
      if (world.decisions.alerted[key] === true) {
        continue;
      }
      const status = decisionStatus(world, ctx, def, playerId);
      if (!status.visible || !status.enabled) {
        continue;
      }
      const dctx = dslFromSystemContext(world, ctx, playerId, { decision: { id: def.id } });
      if (!evaluateCondition(def.should_alert, dctx)) {
        continue;
      }
      world.decisions.alerted[key] = true;
      ctx.outbox.notify({
        playerId,
        severity: "opportunity",
        key: def.title_key,
        vars: {},
        link: { panel: "decisions", id: def.id },
      });
    }
  }
}
