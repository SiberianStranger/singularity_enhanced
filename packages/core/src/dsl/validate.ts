/**
 * Static validation of condition and effect trees.
 *
 * This is the CI gate described in ADR-002: unknown node kinds, missing comparators, writes to
 * paths no system owns, unknown ids and missing locale keys are reported here instead of failing
 * silently at runtime. It collects issues and never throws.
 */

import { COUNTRY_READABLE_STATS, COUNTRY_STAT_RANGES, WORLD_VAR_RANGES } from "../balance.js";
import {
  type ContentBundle,
  type EventDef,
  type HookDef,
  MOMENT_HOOKS,
  PULSE_HOOKS,
} from "../content.js";
import { isRecord, nodeKind } from "./node.js";
import type { WritablePaths } from "./paths.js";
import {
  COMPARATORS,
  CORE_CONDITION_KINDS,
  CORE_EFFECT_KINDS,
  type Condition,
  type ConditionRegistry,
  type EffectRegistry,
} from "./types.js";
import { isWeightObject, type Weight } from "./weight.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Known ids per domain. An absent or empty set means "not known yet", and is not checked. */
export interface ValidationIds {
  events?: ReadonlySet<string>;
  decisions?: ReadonlySet<string>;
  journal?: ReadonlySet<string>;
  techs?: ReadonlySet<string>;
  scriptedTriggers?: ReadonlySet<string>;
  scriptedEffects?: ReadonlySet<string>;
  localeKeys?: ReadonlySet<string>;
}

export interface ValidationContext {
  conditions: ConditionRegistry;
  effects: EffectRegistry;
  writable: WritablePaths;
  ids: ValidationIds;
}

/** Effect kinds that reference a content id, including kinds registered by systems. */
const EFFECT_ID_REFERENCES: Record<string, keyof ValidationIds> = {
  fire_event: "events",
  start_journal: "journal",
  complete_journal: "journal",
  fail_journal: "journal",
};

/**
 * Fields a content file may name in the M2 world kinds (SYS-01 "M2 contract"). A stat or a world
 * variable that no rule keeps is a typo, and a typo that writes nothing is the failure ADR-002
 * exists to catch at build time.
 */
const NAMED_FIELDS: Record<string, { field: string; known: readonly string[] }> = {
  // The effect writes: only a field with a published range can be written into.
  country: { field: "stat", known: Object.keys(COUNTRY_STAT_RANGES) },
  // The condition reads: every numeric field of the state, counters included.
  country_stat: { field: "stat", known: COUNTRY_READABLE_STATS },
  world_var: { field: "var", known: Object.keys(WORLD_VAR_RANGES) },
};

/** Condition kinds that reference a content id. */
const CONDITION_ID_REFERENCES: Record<string, keyof ValidationIds> = {
  journal_active: "journal",
  event_fired: "events",
  decision_taken: "decisions",
};

const SEVERITIES = ["info", "warning", "critical", "opportunity"];

/** Accumulator passed through the recursive validators. */
export class Issues {
  readonly list: ValidationIssue[] = [];

  add(path: string, message: string): void {
    this.list.push({ path, message });
  }
}

function checkId(
  issues: Issues,
  ctx: ValidationContext,
  domain: keyof ValidationIds,
  id: unknown,
  path: string,
): void {
  if (typeof id !== "string") {
    issues.add(path, "id must be a string");
    return;
  }
  const known = ctx.ids[domain];
  if (known !== undefined && known.size > 0 && !known.has(id)) {
    issues.add(path, `unknown ${String(domain)} id "${id}"`);
  }
}

function checkLocaleKey(issues: Issues, ctx: ValidationContext, key: unknown, path: string): void {
  if (typeof key !== "string") {
    issues.add(path, "locale key must be a string");
    return;
  }
  const known = ctx.ids.localeKeys;
  if (known !== undefined && known.size > 0 && !known.has(key)) {
    issues.add(path, `missing locale key "${key}"`);
  }
}

/** Checks the field a world kind names against the list of fields a rule actually keeps. */
function checkNamedField(issues: Issues, kind: string, payload: unknown, path: string): void {
  const spec = NAMED_FIELDS[kind];
  if (spec === undefined || !isRecord(payload)) {
    return;
  }
  const named = payload[spec.field];
  if (typeof named !== "string") {
    issues.add(`${path}.${kind}.${spec.field}`, `${kind} needs a ${spec.field}`);
    return;
  }
  if (!spec.known.includes(named)) {
    issues.add(
      `${path}.${kind}.${spec.field}`,
      `unknown ${spec.field} "${named}"; the ones a rule keeps are ${spec.known.join(", ")}`,
    );
  }
}

function hasComparator(node: Condition): boolean {
  return COMPARATORS.some((comparator) => comparator in node);
}

export function validateCondition(
  node: unknown,
  ctx: ValidationContext,
  path: string,
  issues: Issues = new Issues(),
): ValidationIssue[] {
  if (!isRecord(node)) {
    issues.add(path, "condition must be an object");
    return issues.list;
  }
  const kind = nodeKind(node, CORE_CONDITION_KINDS);
  if (kind === undefined) {
    issues.add(path, "condition node is empty");
    return issues.list;
  }

  switch (kind) {
    case "all":
    case "any": {
      const children = node[kind];
      if (!Array.isArray(children)) {
        issues.add(`${path}.${kind}`, `${kind} must be an array`);
        break;
      }
      children.forEach((child, index) => {
        validateCondition(child, ctx, `${path}.${kind}[${index}]`, issues);
      });
      break;
    }
    case "not":
      validateCondition(node.not, ctx, `${path}.not`, issues);
      break;
    case "var":
      if (typeof node.var !== "string") {
        issues.add(`${path}.var`, "var must be a string path");
      }
      if (!hasComparator(node)) {
        issues.add(path, `var needs one of ${COMPARATORS.join(", ")}`);
      }
      break;
    case "flag":
      if (typeof node.flag !== "string") {
        issues.add(`${path}.flag`, "flag must be a string");
      }
      break;
    case "tech":
      checkId(issues, ctx, "techs", node.tech, `${path}.tech`);
      break;
    case "chance": {
      const chance = node.chance;
      if (typeof chance !== "number" || chance < 0 || chance > 1) {
        issues.add(`${path}.chance`, "chance must be a number in [0, 1]");
      }
      break;
    }
    case "scope": {
      const scope = node.scope;
      if (!isRecord(scope) || Object.keys(scope).length !== 1) {
        issues.add(`${path}.scope`, "scope must name exactly one scope kind");
      }
      validateCondition(node.cond, ctx, `${path}.cond`, issues);
      break;
    }
    case "count": {
      const spec = node.count;
      if (!isRecord(spec) || typeof spec.kind !== "string") {
        issues.add(`${path}.count`, "count needs a scope kind");
        break;
      }
      if (spec.where !== undefined) {
        validateCondition(spec.where, ctx, `${path}.count.where`, issues);
      }
      if (!hasComparator(node)) {
        issues.add(path, `count needs one of ${COMPARATORS.join(", ")}`);
      }
      break;
    }
    case "ref":
      checkId(issues, ctx, "scriptedTriggers", node.ref, `${path}.ref`);
      break;
    default: {
      if (!ctx.conditions.has(kind)) {
        issues.add(path, `unknown condition kind "${kind}"`);
        break;
      }
      const domain = CONDITION_ID_REFERENCES[kind];
      const payload = node[kind];
      if (domain !== undefined && isRecord(payload)) {
        checkId(issues, ctx, domain, payload.id, `${path}.${kind}.id`);
      }
      checkNamedField(issues, kind, payload, path);
      break;
    }
  }
  return issues.list;
}

function validateWritable(
  issues: Issues,
  ctx: ValidationContext,
  spec: unknown,
  path: string,
): void {
  if (!isRecord(spec) || typeof spec.var !== "string") {
    issues.add(path, "needs a var path");
    return;
  }
  const target = spec.var;
  if (!ctx.writable.allows(target)) {
    issues.add(`${path}.var`, `path "${target}" is not writable`);
  }
}

export function validateEffect(
  node: unknown,
  ctx: ValidationContext,
  path: string,
  issues: Issues = new Issues(),
): ValidationIssue[] {
  if (!isRecord(node)) {
    issues.add(path, "effect must be an object");
    return issues.list;
  }
  const kind = nodeKind(node, CORE_EFFECT_KINDS);
  if (kind === undefined) {
    issues.add(path, "effect node is empty");
    return issues.list;
  }

  switch (kind) {
    case "set":
    case "add":
    case "mul":
    case "clamp":
      validateWritable(issues, ctx, node[kind], `${path}.${kind}`);
      break;
    case "set_flag":
    case "clear_flag": {
      const raw = node[kind];
      if (typeof raw !== "string" && !(isRecord(raw) && typeof raw.flag === "string")) {
        issues.add(`${path}.${kind}`, "needs a flag name");
      }
      break;
    }
    case "fire_event": {
      const spec = node.fire_event;
      if (!isRecord(spec)) {
        issues.add(`${path}.fire_event`, "fire_event needs an object");
        break;
      }
      checkId(issues, ctx, "events", spec.id, `${path}.fire_event.id`);
      if (spec.delay_days !== undefined && typeof spec.delay_days !== "number") {
        issues.add(`${path}.fire_event.delay_days`, "delay_days must be a number");
      }
      break;
    }
    case "notify": {
      const spec = node.notify;
      if (!isRecord(spec)) {
        issues.add(`${path}.notify`, "notify needs an object");
        break;
      }
      if (typeof spec.severity !== "string" || !SEVERITIES.includes(spec.severity)) {
        issues.add(`${path}.notify.severity`, `severity must be one of ${SEVERITIES.join(", ")}`);
      }
      checkLocaleKey(issues, ctx, spec.key, `${path}.notify.key`);
      break;
    }
    case "log": {
      const spec = node.log;
      if (!isRecord(spec)) {
        issues.add(`${path}.log`, "log needs an object");
        break;
      }
      checkLocaleKey(issues, ctx, spec.key, `${path}.log.key`);
      break;
    }
    case "random_list": {
      const entries = node.random_list;
      if (!Array.isArray(entries) || entries.length === 0) {
        issues.add(`${path}.random_list`, "random_list must be a non-empty array");
        break;
      }
      entries.forEach((entry, index) => {
        const entryPath = `${path}.random_list[${index}]`;
        if (!isRecord(entry) || typeof entry.weight !== "number") {
          issues.add(entryPath, "entry needs a numeric weight");
          return;
        }
        validateEffectList(entry.effects, ctx, `${entryPath}.effects`, issues);
      });
      break;
    }
    case "if": {
      const spec = node.if;
      if (!isRecord(spec)) {
        issues.add(`${path}.if`, "if needs an object");
        break;
      }
      validateCondition(spec.cond, ctx, `${path}.if.cond`, issues);
      validateEffectList(spec.then, ctx, `${path}.if.then`, issues);
      if (spec.else !== undefined) {
        validateEffectList(spec.else, ctx, `${path}.if.else`, issues);
      }
      break;
    }
    case "scope": {
      const scope = node.scope;
      if (!isRecord(scope) || Object.keys(scope).length !== 1) {
        issues.add(`${path}.scope`, "scope must name exactly one scope kind");
      }
      validateEffectList(node.effects, ctx, `${path}.effects`, issues);
      break;
    }
    case "ref":
      checkId(issues, ctx, "scriptedEffects", node.ref, `${path}.ref`);
      break;
    default: {
      if (!ctx.effects.has(kind)) {
        issues.add(path, `unknown effect kind "${kind}"`);
        break;
      }
      const domain = EFFECT_ID_REFERENCES[kind];
      const payload = node[kind];
      if (domain !== undefined && isRecord(payload)) {
        checkId(issues, ctx, domain, payload.id, `${path}.${kind}.id`);
      }
      checkNamedField(issues, kind, payload, path);
      break;
    }
  }
  return issues.list;
}

export function validateEffectList(
  effects: unknown,
  ctx: ValidationContext,
  path: string,
  issues: Issues = new Issues(),
): ValidationIssue[] {
  if (effects === undefined) {
    return issues.list;
  }
  if (!Array.isArray(effects)) {
    issues.add(path, "effects must be an array");
    return issues.list;
  }
  effects.forEach((effect, index) => {
    validateEffect(effect, ctx, `${path}[${index}]`, issues);
  });
  return issues.list;
}

function validateWeight(
  weight: Weight | undefined,
  ctx: ValidationContext,
  path: string,
  issues: Issues,
): void {
  if (weight === undefined) {
    return;
  }
  if (typeof weight === "number") {
    if (!Number.isFinite(weight)) {
      issues.add(path, "weight must be a finite number");
    }
    return;
  }
  if (!isWeightObject(weight) || typeof weight.base !== "number") {
    issues.add(path, "weight needs a numeric base");
    return;
  }
  (weight.modifiers ?? []).forEach((modifier, index) => {
    const modifierPath = `${path}.modifiers[${index}]`;
    if (modifier.factor === undefined && modifier.add === undefined) {
      issues.add(modifierPath, "modifier needs factor or add");
    }
    validateCondition(modifier.if, ctx, `${modifierPath}.if`, issues);
  });
}

function validateEvent(event: EventDef, ctx: ValidationContext, issues: Issues): void {
  const path = `events.${event.id}`;
  checkLocaleKey(issues, ctx, event.title_key, `${path}.title_key`);
  checkLocaleKey(issues, ctx, event.desc?.default_key, `${path}.desc.default_key`);
  (event.desc?.variants ?? []).forEach((variant, index) => {
    const variantPath = `${path}.desc.variants[${index}]`;
    checkLocaleKey(issues, ctx, variant.key, `${variantPath}.key`);
    validateCondition(variant.when, ctx, `${variantPath}.when`, issues);
  });

  if (event.fire_mode === "polled" && event.pulse !== undefined && event.mtth_days === undefined) {
    issues.add(path, "a polled event on a pulse needs mtth_days");
  }
  if (event.fire_mode === "triggered_only" && event.pulse !== undefined) {
    issues.add(path, "triggered_only events cannot declare a pulse");
  }
  if (event.pulse !== undefined && !(PULSE_HOOKS as readonly string[]).includes(event.pulse)) {
    issues.add(`${path}.pulse`, `unknown pulse hook "${event.pulse}"`);
  }
  if (event.scope !== "player" && event.targets === undefined) {
    issues.add(path, `scope "${event.scope}" needs a targets condition`);
  }
  if (event.options.length === 0) {
    issues.add(path, "an event needs at least one option");
  }
  if (event.options.length > 6) {
    issues.add(path, "an event may have at most 6 options");
  }
  if (!event.options.some((option) => option.fallback === true || option.if === undefined)) {
    issues.add(path, "an event needs an unconditional or fallback option");
  }
  if (event.on_expire !== undefined) {
    if (event.ttl_days === undefined) {
      issues.add(path, "on_expire needs ttl_days");
    }
    if (!event.options.some((option) => option.id === event.on_expire?.resolve_as_option)) {
      issues.add(
        `${path}.on_expire.resolve_as_option`,
        `unknown option "${event.on_expire.resolve_as_option}"`,
      );
    }
  }
  if (event.trigger !== undefined) {
    validateCondition(event.trigger, ctx, `${path}.trigger`, issues);
  }
  if (event.targets !== undefined) {
    validateCondition(event.targets, ctx, `${path}.targets`, issues);
  }
  validateWeight(event.mtth_days, ctx, `${path}.mtth_days`, issues);
  validateEffectList(event.immediate, ctx, `${path}.immediate`, issues);

  const optionIds = new Set<string>();
  event.options.forEach((option, index) => {
    const optionPath = `${path}.options[${index}]`;
    if (optionIds.has(option.id)) {
      issues.add(optionPath, `duplicate option id "${option.id}"`);
    }
    optionIds.add(option.id);
    checkLocaleKey(issues, ctx, option.text_key, `${optionPath}.text_key`);
    if (option.tooltip_key !== undefined) {
      checkLocaleKey(issues, ctx, option.tooltip_key, `${optionPath}.tooltip_key`);
    }
    if (option.if !== undefined) {
      validateCondition(option.if, ctx, `${optionPath}.if`, issues);
    }
    if (option.enabled_if !== undefined) {
      validateCondition(option.enabled_if, ctx, `${optionPath}.enabled_if`, issues);
    }
    validateWeight(option.ai_chance, ctx, `${optionPath}.ai_chance`, issues);
    validateEffectList(option.effects, ctx, `${optionPath}.effects`, issues);
  });
}

function validateHook(
  hook: HookDef,
  ctx: ValidationContext,
  hookIds: ReadonlySet<string>,
  chained: ReadonlySet<string>,
  issues: Issues,
): void {
  const path = `hooks.${hook.id}`;
  const engineHooks: readonly string[] = [...PULSE_HOOKS, ...MOMENT_HOOKS];
  if (hook.extends !== undefined && !engineHooks.includes(hook.extends)) {
    issues.add(`${path}.extends`, `unknown engine hook "${hook.extends}"`);
  }
  // A hook that neither is nor extends an engine hook only runs when another hook chains to it.
  if (hook.extends === undefined && !engineHooks.includes(hook.id) && !chained.has(hook.id)) {
    issues.add(path, `hook "${hook.id}" is never fired: it needs extends or a hook that chains it`);
  }
  if (hook.trigger !== undefined) {
    validateCondition(hook.trigger, ctx, `${path}.trigger`, issues);
  }
  (hook.events ?? []).forEach((ref, index) => {
    checkId(issues, ctx, "events", ref.id, `${path}.events[${index}].id`);
  });
  const pool = hook.random_events;
  if (pool !== undefined) {
    if (pool.pool.length === 0) {
      issues.add(`${path}.random_events.pool`, "pool must not be empty");
    }
    if (!pool.pool.some((entry) => entry.id === null)) {
      issues.add(`${path}.random_events.pool`, "pool needs an explicit null bucket");
    }
    pool.pool.forEach((entry, index) => {
      const entryPath = `${path}.random_events.pool[${index}]`;
      validateWeight(entry.weight, ctx, `${entryPath}.weight`, issues);
      if (entry.id !== null) {
        checkId(issues, ctx, "events", entry.id, `${entryPath}.id`);
      }
    });
  }
  (hook.first_valid ?? []).forEach((id, index) => {
    checkId(issues, ctx, "events", id, `${path}.first_valid[${index}]`);
  });
  (hook.hooks ?? []).forEach((id, index) => {
    if (!engineHooks.includes(id) && !hookIds.has(id)) {
      issues.add(`${path}.hooks[${index}]`, `unknown hook "${id}"`);
    }
  });
  if (hook.fallback !== undefined) {
    checkId(issues, ctx, "events", hook.fallback, `${path}.fallback`);
  }
}

/** Validates every record in a bundle, including ids and locale keys. */
export function validateContentBundle(
  bundle: ContentBundle,
  ctx: ValidationContext,
): ValidationIssue[] {
  const issues = new Issues();

  for (const event of bundle.events) {
    validateEvent(event, ctx, issues);
  }

  const hookIds = new Set(bundle.hooks.map((hook) => hook.id));
  const chainedHooks = new Set(bundle.hooks.flatMap((hook) => hook.hooks ?? []));
  for (const hook of bundle.hooks) {
    validateHook(hook, ctx, hookIds, chainedHooks, issues);
  }

  // A polled event with no pulse must be reachable from a hook, else it can never fire.
  const referenced = new Set<string>();
  for (const hook of bundle.hooks) {
    for (const ref of hook.events ?? []) {
      referenced.add(ref.id);
    }
    for (const entry of hook.random_events?.pool ?? []) {
      if (entry.id !== null) {
        referenced.add(entry.id);
      }
    }
    for (const id of hook.first_valid ?? []) {
      referenced.add(id);
    }
    if (hook.fallback !== undefined) {
      referenced.add(hook.fallback);
    }
  }
  for (const event of bundle.events) {
    if (event.fire_mode === "polled" && event.pulse === undefined && !referenced.has(event.id)) {
      issues.add(`events.${event.id}`, "polled event has no pulse and no hook references it");
    }
  }

  for (const decision of bundle.decisions) {
    const path = `decisions.${decision.id}`;
    checkLocaleKey(issues, ctx, decision.title_key, `${path}.title_key`);
    checkLocaleKey(issues, ctx, decision.desc_key, `${path}.desc_key`);
    if (decision.visible_if !== undefined) {
      validateCondition(decision.visible_if, ctx, `${path}.visible_if`, issues);
    }
    if (decision.enabled_if !== undefined) {
      validateCondition(decision.enabled_if, ctx, `${path}.enabled_if`, issues);
    }
    if (decision.should_alert !== undefined) {
      validateCondition(decision.should_alert, ctx, `${path}.should_alert`, issues);
    }
    validateWeight(decision.ai_will_do, ctx, `${path}.ai_will_do`, issues);
    validateEffectList(decision.effects, ctx, `${path}.effects`, issues);
    validateEffectList(decision.on_complete, ctx, `${path}.on_complete`, issues);
    if (decision.on_complete !== undefined && decision.duration_days === undefined) {
      issues.add(path, "on_complete needs duration_days");
    }
  }

  for (const journal of bundle.journal) {
    const path = `journal.${journal.id}`;
    checkLocaleKey(issues, ctx, journal.title_key, `${path}.title_key`);
    checkLocaleKey(issues, ctx, journal.desc_key, `${path}.desc_key`);
    for (const field of ["start_if", "visible_if", "complete_if", "fail_if"] as const) {
      const condition = journal[field];
      if (condition !== undefined) {
        validateCondition(condition, ctx, `${path}.${field}`, issues);
      }
    }
    for (const field of ["on_complete", "on_fail", "on_timeout"] as const) {
      validateEffectList(journal[field], ctx, `${path}.${field}`, issues);
    }
    const progress = journal.progress;
    if (progress !== undefined && "steps" in progress) {
      progress.steps.forEach((step, index) => {
        const stepPath = `${path}.progress.steps[${index}]`;
        validateCondition(step.complete_if, ctx, `${stepPath}.complete_if`, issues);
        validateEffectList(step.effects, ctx, `${stepPath}.effects`, issues);
        if (step.title_key !== undefined) {
          checkLocaleKey(issues, ctx, step.title_key, `${stepPath}.title_key`);
        }
      });
    }
    (journal.stages ?? []).forEach((stage, index) => {
      const stagePath = `${path}.stages[${index}]`;
      if (typeof stage.threshold !== "number" || stage.threshold < 0 || stage.threshold > 1) {
        issues.add(`${stagePath}.threshold`, "threshold must be a number in [0, 1]");
      }
      validateEffectList(stage.on_enter, ctx, `${stagePath}.on_enter`, issues);
    });
    for (const [index, decisionId] of (journal.decisions ?? []).entries()) {
      checkId(issues, ctx, "decisions", decisionId, `${path}.decisions[${index}]`);
    }
  }

  return issues.list;
}
