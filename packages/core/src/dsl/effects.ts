/**
 * Ordered effect lists (ADR-002).
 *
 * Effects run in order. A failing effect is logged through the outbox and execution continues with
 * the next one, so bad content degrades a single line instead of aborting a tick.
 */

import { daysToTicks } from "../kernel/clock.js";
import type { EntityRef, NotificationLink, Severity, TextVar } from "../kernel/world.js";
import { evaluateCondition } from "./conditions.js";
import { deeper, withScope } from "./context.js";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  asTextVars,
  isJsonScalar,
  isRecord,
  nodeKind,
  optionalNumber,
  optionalString,
} from "./node.js";
import { DslError, getPath, setPath } from "./paths.js";
import {
  CORE_EFFECT_KINDS,
  type DslContext,
  type Effect,
  type EffectHandler,
  type EffectRegistry,
  MAX_DSL_DEPTH,
} from "./types.js";

const SEVERITIES: readonly Severity[] = ["info", "warning", "critical", "opportunity"];

export function createEffectRegistry(): EffectRegistry {
  const handlers = new Map<string, EffectHandler>();
  return {
    register(kind: string, handler: EffectHandler): void {
      if (handlers.has(kind)) {
        throw new DslError(`effect kind "${kind}" is already registered`, "dsl_duplicate_kind");
      }
      if ((CORE_EFFECT_KINDS as readonly string[]).includes(kind)) {
        throw new DslError(`effect kind "${kind}" is a core kind`, "dsl_duplicate_kind");
      }
      handlers.set(kind, handler);
    },
    get: (kind) => handlers.get(kind),
    has: (kind) => handlers.has(kind),
    kinds: () => [...handlers.keys()].sort(),
    entries: () => [...handlers.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

function numberAt(ctx: DslContext, path: string): number {
  const current = getPath(ctx.scope, path);
  if (current === undefined || current === null) {
    return 0;
  }
  if (typeof current === "number" && Number.isFinite(current)) {
    return current;
  }
  throw new DslError(`"${path}" is not a number`, "dsl_bad_value");
}

function asSeverity(value: unknown, what: string): Severity {
  const text = asString(value, what);
  const severity = SEVERITIES.find((candidate) => candidate === text);
  if (severity === undefined) {
    throw new DslError(`${what} must be one of ${SEVERITIES.join(", ")}`, "dsl_bad_node");
  }
  return severity;
}

function asLink(value: unknown, what: string): NotificationLink | undefined {
  if (value === undefined) {
    return undefined;
  }
  const record = asRecord(value, what);
  const id = optionalString(record.id, `${what}.id`);
  return { panel: asString(record.panel, `${what}.panel`), ...(id !== undefined ? { id } : {}) };
}

/**
 * Resolves the `target` field of `fire_event`: either "domain:id" or the name of a binding in the
 * current scope (`"site"` uses the site currently in scope).
 */
function resolveTargetRef(ctx: DslContext, target: string | undefined): EntityRef | undefined {
  if (target === undefined) {
    return undefined;
  }
  const [domain, id] = target.includes(":") ? target.split(":", 2) : [target, undefined];
  if (domain === undefined || domain.length === 0) {
    throw new DslError(`invalid target "${target}"`, "dsl_bad_node");
  }
  if (id !== undefined) {
    return { domain, id };
  }
  const bound = ctx.scope[domain];
  if (!isRecord(bound) || typeof bound.id !== "string") {
    throw new DslError(`target "${target}" is not in scope`, "dsl_bad_node");
  }
  return { domain, id: bound.id };
}

function setFlag(ctx: DslContext, node: Effect, kind: "set_flag" | "clear_flag"): void {
  const raw = node[kind];
  const value = kind === "set_flag";
  if (typeof raw === "string") {
    const player = ctx.world.players[ctx.playerId];
    if (player === undefined) {
      throw new DslError(`unknown player "${ctx.playerId}"`, "dsl_bad_scope");
    }
    player.flags[raw] = value;
    return;
  }
  const record = asRecord(raw, kind);
  const name = asString(record.flag, `${kind}.flag`);
  if (record.world === true) {
    ctx.world.flags[name] = value;
    return;
  }
  const player = ctx.world.players[ctx.playerId];
  if (player === undefined) {
    throw new DslError(`unknown player "${ctx.playerId}"`, "dsl_bad_scope");
  }
  player.flags[name] = value;
}

function scopeEntry(node: Effect): [string, string] {
  const record = asRecord(node.scope, "scope");
  const keys = Object.keys(record);
  const kind = keys[0];
  if (keys.length !== 1 || kind === undefined) {
    throw new DslError("scope must name exactly one scope kind", "dsl_bad_node");
  }
  return [kind, asString(record[kind], `scope.${kind}`)];
}

function runNode(node: Effect, ctx: DslContext): void {
  if (ctx.depth > MAX_DSL_DEPTH) {
    throw new DslError("effect nesting too deep", "dsl_depth");
  }
  const kind = nodeKind(node, CORE_EFFECT_KINDS);
  if (kind === undefined) {
    throw new DslError("empty effect node", "dsl_bad_node");
  }

  switch (kind) {
    case "set": {
      const spec = asRecord(node.set, "set");
      const value = spec.value;
      if (!isJsonScalar(value)) {
        throw new DslError("set.value must be a string, number, boolean or null", "dsl_bad_node");
      }
      setPath(ctx.scope, asString(spec.var, "set.var"), value, ctx.writable);
      return;
    }
    case "add": {
      const spec = asRecord(node.add, "add");
      const path = asString(spec.var, "add.var");
      setPath(
        ctx.scope,
        path,
        numberAt(ctx, path) + asNumber(spec.value, "add.value"),
        ctx.writable,
      );
      return;
    }
    case "mul": {
      const spec = asRecord(node.mul, "mul");
      const path = asString(spec.var, "mul.var");
      setPath(
        ctx.scope,
        path,
        numberAt(ctx, path) * asNumber(spec.value, "mul.value"),
        ctx.writable,
      );
      return;
    }
    case "clamp": {
      const spec = asRecord(node.clamp, "clamp");
      const path = asString(spec.var, "clamp.var");
      const min = optionalNumber(spec.min, "clamp.min");
      const max = optionalNumber(spec.max, "clamp.max");
      let value = numberAt(ctx, path);
      if (min !== undefined) {
        value = Math.max(min, value);
      }
      if (max !== undefined) {
        value = Math.min(max, value);
      }
      setPath(ctx.scope, path, value, ctx.writable);
      return;
    }
    case "set_flag":
    case "clear_flag":
      setFlag(ctx, node, kind);
      return;
    case "fire_event": {
      const spec = asRecord(node.fire_event, "fire_event");
      const delayDays = optionalNumber(spec.delay_days, "fire_event.delay_days") ?? 0;
      const target = resolveTargetRef(ctx, optionalString(spec.target, "fire_event.target"));
      ctx.world.events.scheduled.push({
        id: asString(spec.id, "fire_event.id"),
        fireTick: ctx.world.clock.tick + daysToTicks(delayDays),
        playerId: ctx.playerId,
        ...(target !== undefined ? { target } : {}),
      });
      return;
    }
    case "notify": {
      const spec = asRecord(node.notify, "notify");
      const link = asLink(spec.link, "notify.link");
      const expireDays = optionalNumber(spec.expire_days, "notify.expire_days");
      ctx.outbox.notify({
        playerId: ctx.playerId,
        severity: asSeverity(spec.severity, "notify.severity"),
        key: asString(spec.key, "notify.key"),
        vars: asTextVars(spec.vars, "notify.vars"),
        ...(link !== undefined ? { link } : {}),
        ...(expireDays !== undefined ? { expire_days: expireDays } : {}),
      });
      return;
    }
    case "log": {
      const spec = asRecord(node.log, "log");
      ctx.outbox.log({
        key: asString(spec.key, "log.key"),
        vars: asTextVars(spec.vars, "log.vars"),
        playerId: ctx.playerId,
      });
      return;
    }
    case "random_list": {
      const entries = asArray(node.random_list, "random_list").map((entry, index) => {
        const record = asRecord(entry, `random_list[${index}]`);
        return {
          weight: asNumber(record.weight, `random_list[${index}].weight`),
          effects: asArray(record.effects, `random_list[${index}].effects`),
        };
      });
      if (entries.length === 0) {
        throw new DslError("random_list must have at least one entry", "dsl_bad_node");
      }
      const chosen = ctx.rng.weighted(entries);
      runEffects(
        chosen.effects.map((item) => asRecord(item, "random_list effect")),
        deeper(ctx),
      );
      return;
    }
    case "if": {
      const spec = asRecord(node.if, "if");
      const branch = evaluateCondition(asRecord(spec.cond, "if.cond"), deeper(ctx))
        ? spec.then
        : spec.else;
      if (branch === undefined) {
        return;
      }
      runEffects(
        asArray(branch, "if branch").map((item) => asRecord(item, "if branch effect")),
        deeper(ctx),
      );
      return;
    }
    case "scope": {
      const [scopeKind, ref] = scopeEntry(node);
      const target = ctx.hooks.resolveScope(ctx.world, scopeKind, ref, ctx.scope);
      if (target === undefined || target === null) {
        throw new DslError(`scope "${scopeKind}: ${ref}" resolved to nothing`, "dsl_bad_scope");
      }
      runEffects(
        asArray(node.effects, "scope.effects").map((item) => asRecord(item, "scope effect")),
        withScope(ctx, scopeKind, target),
      );
      return;
    }
    case "ref": {
      const id = asString(node.ref, "ref");
      const referenced = ctx.content.scripted_effects?.[id];
      if (referenced === undefined) {
        throw new DslError(`unknown scripted effect "${id}"`, "dsl_unknown_ref");
      }
      runEffects(referenced, deeper(ctx));
      return;
    }
    default: {
      const handler = ctx.effects.get(kind);
      if (handler === undefined) {
        throw new DslError(`unknown effect kind "${kind}"`, "dsl_unknown_kind");
      }
      handler(node, ctx);
    }
  }
}

/** Runs an effect list in order; failures are logged and never abort the list. */
export function runEffects(effects: readonly Effect[] | undefined, ctx: DslContext): void {
  if (effects === undefined) {
    return;
  }
  for (const effect of effects) {
    try {
      if (!isRecord(effect)) {
        throw new DslError("effect must be an object", "dsl_bad_node");
      }
      runNode(effect, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const vars: Record<string, TextVar> = {
        kind: (isRecord(effect) ? nodeKind(effect, CORE_EFFECT_KINDS) : undefined) ?? "unknown",
        message,
      };
      ctx.outbox.log({ key: "dsl.effect_failed", vars, playerId: ctx.playerId });
    }
  }
}

/** The core or registered kind a node declares, used by the validator and by tests. */
export function effectKindOf(node: Effect): string | undefined {
  return nodeKind(node, CORE_EFFECT_KINDS);
}
