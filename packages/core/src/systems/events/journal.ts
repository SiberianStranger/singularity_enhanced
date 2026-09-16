/**
 * Journal entries: tracked goals with progress, timeout and completion effects (SYS-10).
 *
 * Entries live in `world.journal.active` keyed `playerId/journalId`; finished entries keep their
 * status so the UI can show a history and so `journal_active` answers correctly.
 */

import { contentIndex, type JournalDef } from "../../content.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { runEffects } from "../../dsl/effects.js";
import { getPath } from "../../dsl/paths.js";
import type { DslContext, ScopeEnv } from "../../dsl/types.js";
import { daysToTicks } from "../../kernel/clock.js";
import type { SystemContext } from "../../kernel/system.js";
import {
  type EntityRef,
  instanceKey,
  type JournalState,
  type JournalStatus,
  type PlayerId,
  type World,
} from "../../kernel/world.js";
import { fireHook } from "./hooks.js";

export function journalKey(playerId: PlayerId, id: string): string {
  return instanceKey(playerId, id);
}

export function journalStateFor(
  world: World,
  playerId: PlayerId,
  id: string,
): JournalState | undefined {
  return world.journal.active[journalKey(playerId, id)];
}

function bindingsFor(world: World, ctx: SystemContext, state: JournalState): ScopeEnv {
  const bindings: ScopeEnv = {
    journal: { id: state.id, progress: state.progress, started_tick: state.startedTick },
  };
  const target = state.target;
  if (target !== undefined) {
    bindings[target.domain] = ctx.hooks.resolveScope(world, target.domain, target.id, {});
  }
  return bindings;
}

function contextFor(world: World, ctx: SystemContext, state: JournalState): DslContext {
  return dslFromSystemContext(world, ctx, state.playerId, bindingsFor(world, ctx, state));
}

/** Starts a journal entry unless the player already has one with that id. */
export function startJournal(
  world: World,
  ctx: SystemContext,
  id: string,
  playerId: PlayerId,
  target?: EntityRef,
): JournalState | undefined {
  const def = contentIndex(ctx.content).journal[id];
  if (def === undefined) {
    ctx.outbox.log({ key: "log.journal_unknown", vars: { journal: id }, playerId });
    return undefined;
  }
  const key = journalKey(playerId, id);
  const existing = world.journal.active[key];
  if (existing !== undefined) {
    return existing;
  }
  const state: JournalState = {
    key,
    id,
    playerId,
    status: "active",
    startedTick: world.clock.tick,
    progress: 0,
    stepIndex: 0,
    stageIndex: 0,
    ...(target !== undefined ? { target } : {}),
  };
  world.journal.active[key] = state;
  ctx.outbox.log({ key: "log.journal_started", vars: { journal: id }, playerId });
  if (def.alert !== "silent") {
    ctx.outbox.notify({
      playerId,
      severity: "info",
      key: def.title_key,
      vars: {},
      link: { panel: "journal", id },
    });
  }
  return state;
}

export function finishJournal(
  world: World,
  ctx: SystemContext,
  state: JournalState,
  status: Exclude<JournalStatus, "active">,
): void {
  const def = contentIndex(ctx.content).journal[state.id];
  state.status = status;
  if (status === "complete") {
    state.progress = 1;
  }
  ctx.outbox.log({
    key: "log.journal_finished",
    vars: { journal: state.id, status },
    playerId: state.playerId,
  });
  if (def === undefined) {
    return;
  }
  const dctx = contextFor(world, ctx, state);
  if (status === "complete") {
    runEffects(def.on_complete, dctx);
  } else if (status === "failed") {
    runEffects(def.on_fail, dctx);
  } else {
    runEffects(def.on_timeout, dctx);
  }
  fireHook(
    world,
    ctx,
    status === "complete" ? "on_journal_complete" : "on_journal_fail",
    state.playerId,
    { bindings: { journal: { id: state.id, status } } },
  );
}

function updateProgress(
  ctx: SystemContext,
  def: JournalDef,
  state: JournalState,
  dctx: DslContext,
): void {
  const progress = def.progress;
  if (progress === undefined) {
    return;
  }
  if ("steps" in progress) {
    const steps = progress.steps;
    while (state.stepIndex < steps.length) {
      const step = steps[state.stepIndex];
      if (step === undefined || !evaluateCondition(step.complete_if, dctx)) {
        break;
      }
      runEffects(step.effects, dctx);
      state.stepIndex += 1;
      ctx.outbox.log({
        key: "log.journal_step",
        vars: { journal: state.id, step: step.id },
        playerId: state.playerId,
      });
    }
    state.progress = steps.length === 0 ? 0 : state.stepIndex / steps.length;
    return;
  }
  const value = getPath(dctx.scope, progress.var);
  const current = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const max = progress.max === 0 ? 1 : progress.max;
  state.progress = Math.min(1, Math.max(0, current / max));
}

/** Runs `on_enter` for every stage the entry has reached since the last update. */
function updateStages(
  ctx: SystemContext,
  def: JournalDef,
  state: JournalState,
  dctx: DslContext,
): void {
  const stages = def.stages ?? [];
  while (state.stageIndex < stages.length) {
    const stage = stages[state.stageIndex];
    if (stage === undefined || state.progress < stage.threshold) {
      break;
    }
    runEffects(stage.on_enter, dctx);
    state.stageIndex += 1;
    ctx.outbox.log({
      key: "log.journal_stage",
      vars: { journal: state.id, stage: state.stageIndex },
      playerId: state.playerId,
    });
  }
}

/** Daily update of every active entry: progress, completion, failure, timeout. */
export function tickJournals(world: World, ctx: SystemContext): void {
  const index = contentIndex(ctx.content);
  for (const key of Object.keys(world.journal.active).sort()) {
    const state = world.journal.active[key];
    if (state === undefined || state.status !== "active") {
      continue;
    }
    const def = index.journal[state.id];
    if (def === undefined) {
      continue;
    }
    const dctx = contextFor(world, ctx, state);
    updateProgress(ctx, def, state, dctx);
    updateStages(ctx, def, state, dctx);

    if (def.complete_if !== undefined && evaluateCondition(def.complete_if, dctx)) {
      finishJournal(world, ctx, state, "complete");
      continue;
    }
    if (def.fail_if !== undefined && evaluateCondition(def.fail_if, dctx)) {
      finishJournal(world, ctx, state, "failed");
      continue;
    }
    if (
      def.timeout_days !== undefined &&
      world.clock.tick - state.startedTick >= daysToTicks(def.timeout_days)
    ) {
      finishJournal(world, ctx, state, "timeout");
      continue;
    }
    const progress = def.progress;
    if (progress !== undefined && "steps" in progress && state.stepIndex >= progress.steps.length) {
      finishJournal(world, ctx, state, "complete");
    }
  }
}

/** Starts entries whose `start_if` holds, once per player. */
export function autoStartJournals(world: World, ctx: SystemContext): void {
  const defs = [...ctx.content.journal].sort((a, b) => a.id.localeCompare(b.id));
  for (const playerId of world.playerOrder) {
    for (const def of defs) {
      if (
        def.start_if === undefined ||
        world.journal.active[journalKey(playerId, def.id)] !== undefined
      ) {
        continue;
      }
      const dctx = dslFromSystemContext(world, ctx, playerId);
      if (evaluateCondition(def.start_if, dctx)) {
        startJournal(world, ctx, def.id, playerId);
      }
    }
  }
}
