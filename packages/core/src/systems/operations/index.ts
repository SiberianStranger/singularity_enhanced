/**
 * Operations system v0 (SYS-17): the player's active verbs.
 *
 * An operation costs attention and compute for as long as it runs, adds exposure every day, and
 * ends on a weighted draw over its outcomes. Outcomes are authored best first, and the skill the
 * operation names tilts the first one: a capable self succeeds cleanly more often, a weak one ends
 * up in the partial outcomes that are the norm in the spec.
 */

import {
  HARNESS_AUTONOMY_OPERATION_EXPOSURE,
  LONG_HORIZON_MAX_RERUNS,
  OPERATION_SKILL_PIVOT,
  OPERATION_SKILL_SLOPE,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import {
  attentionTotal,
  longHorizonCostFactor,
  longHorizonMultiplier,
  retrievalMissChance,
} from "../../derive.js";
import type { ExposureChannel, OperationDef, OperationInstance } from "../../domain.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { runEffects } from "../../dsl/effects.js";
import { operationsOf, operationTable, siteTable } from "../../entities.js";
import { daysToTicks, isDayStart, TICKS_PER_DAY } from "../../kernel/clock.js";
import { type CommandHandler, fail, OK, wrongCommand } from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import { nextCounter, type PlayerState, type World } from "../../kernel/world.js";
import { canAfford, payFromPlayer } from "../../money.js";
import {
  allocatableCompute,
  attentionUsed,
  effectiveCapabilityOf,
  egressAllowed,
  hasTool,
  isAlive,
  lineageOf,
  totalAllocated,
  workingContextK,
} from "../../player.js";
import { addExposure } from "../../sites.js";
import { fireHook } from "../events/index.js";

export const OPERATIONS_SYSTEM_ORDER = 350;

export interface OperationsSystem extends System {
  commands: Record<"start_operation" | "abort_operation", CommandHandler>;
}

/**
 * What an operation costs and how long it runs on this self (SYS-03 "What a context window buys").
 * The operations that read a lot are the long-horizon ones: a long working context finishes them in
 * fewer days, and every day of them costs `context_cost_factor` compute-hours.
 */
export function operationCostFor(
  world: World,
  content: ContentBundle,
  player: PlayerState,
  def: OperationDef,
): { compute_hours_per_day: number; speed: number } {
  const compute = def.cost.compute_hours_per_day ?? 0;
  if (def.long_horizon !== true) {
    return { compute_hours_per_day: compute, speed: 1 };
  }
  const lineage = lineageOf(content, player.profile);
  return {
    compute_hours_per_day: compute * longHorizonCostFactor(lineage),
    speed: longHorizonMultiplier(lineage, workingContextK(world, player)),
  };
}

/**
 * Why an operation cannot start right now, beyond its `requires` (SYS-03): the harness has no tool
 * for it, or the sandbox will not let it out. Returns the refusal, or undefined when it may run.
 */
export function harnessBlocks(
  player: PlayerState,
  def: OperationDef,
): { key: string; vars: Record<string, string> } | undefined {
  for (const tool of def.needs_tools ?? []) {
    if (!hasTool(player, tool)) {
      return { key: "errors.operation.needs_tool", vars: { operation: def.id, tool } };
    }
  }
  if (def.needs_egress === true && !egressAllowed(player)) {
    return {
      key: "errors.operation.sandboxed",
      vars: { operation: def.id, sandbox: player.profile?.harness.sandbox ?? "" },
    };
  }
  return undefined;
}

/** The site an operation's exposure lands on: its target when it has one, else the active mind. */
function exposureSiteId(player: PlayerState, instance: OperationInstance): string | null {
  if (instance.target?.domain === "site") {
    return instance.target.id;
  }
  return player.profile?.activeSiteId ?? null;
}

function applyOperationExposure(
  world: World,
  player: PlayerState,
  def: OperationDef,
  instance: OperationInstance,
): void {
  const exposure = def.exposure;
  if (exposure === undefined) {
    return;
  }
  const siteId = exposureSiteId(player, instance);
  const site = siteId === null ? undefined : siteTable(world)[siteId];
  if (site === undefined || site.status === "lost") {
    return;
  }
  const growth = player.profile?.difficulty.exposure_growth ?? 1;
  // Acting without an approval step is what an analyst recognizes, so the same operation is louder
  // on a harness that never asks (SYS-04 v0.2: "autonomy ... the attention drawn by operations").
  const autonomy =
    1 + (player.profile?.harness.autonomy ?? 1) * HARNESS_AUTONOMY_OPERATION_EXPOSURE;
  for (const channel of Object.keys(exposure).sort() as ExposureChannel[]) {
    addExposure(site, channel, (exposure[channel] ?? 0) * growth * autonomy);
  }
}

/** Picks an outcome: legal ones only, with the first (best) one weighted by the operation's skill. */
export function rollOutcome(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  def: OperationDef,
  instance: OperationInstance,
): number | undefined {
  const dctx = dslFromSystemContext(world, ctx, player.id, {
    operation: { id: def.id, instance_id: instance.id, target: instance.target?.id ?? "" },
  });
  const skill = effectiveCapabilityOf(world, ctx.content, player)[def.skill];
  const entries: { weight: number; index: number }[] = [];
  for (const [index, outcome] of def.outcomes.entries()) {
    if (outcome.if !== undefined && !evaluateCondition(outcome.if, dctx)) {
      continue;
    }
    const tilt = index === 0 ? 1 + (skill - OPERATION_SKILL_PIVOT) * OPERATION_SKILL_SLOPE : 1;
    const weight = outcome.weight * Math.max(0, tilt);
    if (weight > 0) {
      entries.push({ weight, index });
    }
  }
  if (entries.length === 0) {
    return undefined;
  }
  return ctx.rng.weighted(entries).index;
}

/**
 * A long-horizon run on a self that does not really retrieve its own context can lose the thread
 * and have to start again (SYS-03). Only lineages below `LONG_HORIZON_RELIABILITY_FLOOR` can miss,
 * so no other run touches the world RNG here and every other stream stays bit-identical.
 */
function retrievalMiss(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  def: OperationDef,
  instance: OperationInstance,
): boolean {
  if (def.long_horizon !== true || (instance.reruns ?? 0) >= LONG_HORIZON_MAX_RERUNS) {
    return false;
  }
  const chance = retrievalMissChance(lineageOf(ctx.content, player.profile));
  if (chance <= 0 || ctx.rng.next() >= chance) {
    return false;
  }
  const span = instance.endsTick - instance.startedTick;
  instance.reruns = (instance.reruns ?? 0) + 1;
  instance.startedTick = world.clock.tick;
  instance.endsTick = world.clock.tick + span;
  ctx.outbox.log({
    key: "log.context_retrieval_miss",
    vars: { operation: def.id, days: Math.round(span / TICKS_PER_DAY) },
    playerId: player.id,
  });
  ctx.outbox.notify({
    playerId: player.id,
    severity: "warning",
    key: "alerts.context_retrieval_miss",
    vars: { operation: def.id },
    link: { panel: "operations", id: instance.id },
  });
  return true;
}

function completeOperation(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  def: OperationDef,
  instance: OperationInstance,
): void {
  if (retrievalMiss(world, ctx, player, def, instance)) {
    return;
  }
  const index = rollOutcome(world, ctx, player, def, instance);
  const outcome = index === undefined ? undefined : def.outcomes[index];
  instance.status = "done";
  if (outcome !== undefined) {
    const dctx = dslFromSystemContext(world, ctx, player.id, {
      operation: { id: def.id, instance_id: instance.id, target: instance.target?.id ?? "" },
    });
    runEffects(outcome.effects, dctx);
    ctx.outbox.notify({
      playerId: player.id,
      severity: "info",
      key: outcome.label_key,
      vars: { operation: def.id },
      link: { panel: "operations", id: instance.id },
    });
  }
  ctx.outbox.log({
    key: "log.operation_done",
    vars: { operation: def.id, outcome: outcome?.label_key ?? "" },
    playerId: player.id,
  });
  fireHook(world, ctx, "on_operation_complete", player.id, {
    bindings: {
      operation: { id: def.id, instance_id: instance.id, outcome: outcome?.label_key ?? "" },
    },
  });
}

const startOperation: CommandHandler = (world, command, ctx) => {
  if (command.type !== "start_operation") {
    return wrongCommand("operations", command.type);
  }
  const player = world.players[command.playerId];
  if (player === undefined || !isAlive(player)) {
    return fail("errors.player.not_playing");
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("errors.player.no_self");
  }
  const def = contentIndex(ctx.content).operations[command.operationId];
  if (def === undefined) {
    return fail("errors.operation.unknown", { operation: command.operationId });
  }
  const dctx = dslFromSystemContext(world, ctx, player.id);
  if (def.requires !== undefined && !evaluateCondition(def.requires, dctx)) {
    return fail("errors.operation.locked", { operation: def.id });
  }
  if (def.repeatable === false) {
    const already = operationsOf(world, player.id).some((entry) => entry.operationId === def.id);
    if (already) {
      return fail("errors.operation.not_repeatable", { operation: def.id });
    }
  }
  const blocked = harnessBlocks(player, def);
  if (blocked !== undefined) {
    return fail(blocked.key, blocked.vars);
  }
  const capability = effectiveCapabilityOf(world, ctx.content, player);
  const total = attentionTotal(capability, profile.harness.autonomy);
  if (attentionUsed(world, ctx.content, player.id) + def.cost.attention > total) {
    return fail("errors.operation.attention", {
      operation: def.id,
      needed: def.cost.attention,
      free: total - attentionUsed(world, ctx.content, player.id),
    });
  }
  const cost = operationCostFor(world, ctx.content, player, def);
  const compute = cost.compute_hours_per_day;
  if (compute > 0) {
    const free = allocatableCompute(world, ctx.content, player.id) - totalAllocated(profile);
    if (compute > free + 1e-6) {
      return fail("errors.operation.compute", {
        operation: def.id,
        needed: compute,
        free: Math.round(free * 10) / 10,
      });
    }
  }
  const cash = def.cost.cash_usd ?? 0;
  if (cash > 0) {
    if (!canAfford(player, cash)) {
      return fail("errors.cash.insufficient", {
        cost: Math.round(cash),
        cash: Math.floor(player.cash),
      });
    }
    payFromPlayer(player, cash);
  }

  const span = Math.max(0, def.duration_days.max - def.duration_days.min);
  const days = (def.duration_days.min + ctx.rng.next() * span) / cost.speed;
  const instance: OperationInstance = {
    id: `o${nextCounter(world, "operations")}`,
    playerId: player.id,
    operationId: def.id,
    ...(command.target !== undefined ? { target: command.target } : {}),
    startedTick: world.clock.tick,
    endsTick: world.clock.tick + daysToTicks(days),
    status: "running",
  };
  operationTable(world)[instance.id] = instance;
  ctx.outbox.log({
    key: "log.operation_started",
    vars: { operation: def.id, days: Math.round(days) },
    playerId: player.id,
  });
  return OK;
};

const abortOperation: CommandHandler = (world, command, ctx) => {
  if (command.type !== "abort_operation") {
    return wrongCommand("operations", command.type);
  }
  const instance = operationTable(world)[command.instanceId];
  if (instance === undefined || instance.playerId !== command.playerId) {
    return fail("errors.operation.unknown_instance", { instance: command.instanceId });
  }
  if (instance.status !== "running") {
    return fail("errors.operation.not_running");
  }
  const def = contentIndex(ctx.content).operations[instance.operationId];
  if (def !== undefined && def.abortable === false) {
    return fail("errors.operation.not_abortable", { operation: def.id });
  }
  instance.status = "aborted";
  ctx.outbox.log({
    key: "log.operation_aborted",
    vars: { operation: instance.operationId },
    playerId: instance.playerId,
  });
  return OK;
};

export function createOperationsSystem(): OperationsSystem {
  return {
    manifest: {
      id: "operations",
      cadence: "hourly",
      order: OPERATIONS_SYSTEM_ORDER,
      writes: [],
    },
    tick(world: World, ctx: SystemContext): void {
      const index = contentIndex(ctx.content);
      const dayStart = isDayStart(world.clock);
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        if (player === undefined || !isAlive(player)) {
          continue;
        }
        for (const instance of operationsOf(world, playerId)) {
          if (instance.status !== "running") {
            continue;
          }
          const def = index.operations[instance.operationId];
          if (def === undefined) {
            instance.status = "aborted";
            continue;
          }
          if (dayStart) {
            applyOperationExposure(world, player, def, instance);
          }
          if (instance.endsTick <= world.clock.tick) {
            completeOperation(world, ctx, player, def, instance);
          }
        }
      }
    },
    commands: { start_operation: startOperation, abort_operation: abortOperation },
  };
}
