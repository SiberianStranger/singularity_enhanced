/**
 * Boolean condition trees (ADR-002).
 *
 * The evaluator never throws during a tick: a malformed or unknown node logs a warning through the
 * outbox and evaluates to `false`. Content problems are meant to be caught by `validate.ts` in CI,
 * so a runtime warning always indicates content that skipped validation.
 */

import { assertNever } from "../kernel/assert.js";
import { deeper, withScope } from "./context.js";
import { asArray, asNumber, asRecord, asString, isRecord, nodeKeys, nodeKind } from "./node.js";
import { DslError, getPath } from "./paths.js";
import {
  COMPARATORS,
  CORE_CONDITION_KINDS,
  type Comparator,
  type Condition,
  type ConditionHandler,
  type ConditionRegistry,
  type DslContext,
  MAX_DSL_DEPTH,
} from "./types.js";

export function createConditionRegistry(): ConditionRegistry {
  const handlers = new Map<string, ConditionHandler>();
  return {
    register(kind: string, handler: ConditionHandler): void {
      if (handlers.has(kind)) {
        throw new DslError(`condition kind "${kind}" is already registered`, "dsl_duplicate_kind");
      }
      if ((CORE_CONDITION_KINDS as readonly string[]).includes(kind)) {
        throw new DslError(`condition kind "${kind}" is a core kind`, "dsl_duplicate_kind");
      }
      handlers.set(kind, handler);
    },
    get: (kind) => handlers.get(kind),
    has: (kind) => handlers.has(kind),
    kinds: () => [...handlers.keys()].sort(),
    entries: () => [...handlers.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

function warn(ctx: DslContext, message: string): void {
  ctx.outbox.log({ key: "dsl.condition_failed", vars: { message }, playerId: ctx.playerId });
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return undefined;
}

function sameValue(actual: unknown, expected: unknown): boolean {
  if (actual === expected) {
    return true;
  }
  const a = toNumber(actual);
  const b = toNumber(expected);
  return a !== undefined && b !== undefined && a === b;
}

/** Applies every comparator present on the node; they are combined with AND. */
export function compareValue(actual: unknown, node: Condition, what: string): boolean {
  let compared = false;
  for (const comparator of COMPARATORS) {
    if (!(comparator in node)) {
      continue;
    }
    compared = true;
    const expected = node[comparator];
    if (!applyComparator(comparator, actual, expected, what)) {
      return false;
    }
  }
  if (!compared) {
    throw new DslError(`${what} needs one of ${COMPARATORS.join(", ")}`, "dsl_missing_comparator");
  }
  return true;
}

function applyComparator(
  comparator: Comparator,
  actual: unknown,
  expected: unknown,
  what: string,
): boolean {
  switch (comparator) {
    case "eq":
      return sameValue(actual, expected);
    case "ne":
      return !sameValue(actual, expected);
    case "in":
      return asArray(expected, `${what}.in`).some((item) => sameValue(actual, item));
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const left = toNumber(actual);
      const right = asNumber(expected, `${what}.${comparator}`);
      if (left === undefined) {
        return false;
      }
      switch (comparator) {
        case "lt":
          return left < right;
        case "lte":
          return left <= right;
        case "gt":
          return left > right;
        case "gte":
          return left >= right;
        default:
          return assertNever(comparator, "comparator");
      }
    }
    default:
      return assertNever(comparator, "comparator");
  }
}

function singleScopeEntry(node: Condition, field: string): [string, string] {
  const record = asRecord(node[field], `${field}`);
  const keys = Object.keys(record);
  const kind = keys[0];
  if (keys.length !== 1 || kind === undefined) {
    throw new DslError(`${field} must name exactly one scope kind`, "dsl_bad_node");
  }
  return [kind, asString(record[kind], `${field}.${kind}`)];
}

function evaluateNode(node: Condition, ctx: DslContext): boolean {
  if (ctx.depth > MAX_DSL_DEPTH) {
    throw new DslError("condition nesting too deep", "dsl_depth");
  }
  const kind = nodeKind(node, CORE_CONDITION_KINDS);
  if (kind === undefined) {
    throw new DslError("empty condition node", "dsl_bad_node");
  }

  switch (kind) {
    case "all":
      return asArray(node.all, "all").every((child) =>
        evaluateNode(asRecord(child, "all child"), deeper(ctx)),
      );
    case "any":
      return asArray(node.any, "any").some((child) =>
        evaluateNode(asRecord(child, "any child"), deeper(ctx)),
      );
    case "not":
      return !evaluateNode(asRecord(node.not, "not"), deeper(ctx));
    case "var":
      return compareValue(getPath(ctx.scope, asString(node.var, "var")), node, "var");
    case "flag": {
      const name = asString(node.flag, "flag");
      const player = ctx.world.players[ctx.playerId];
      const value = player?.flags[name] ?? ctx.world.flags[name] ?? false;
      const expected = node.value;
      return typeof expected === "boolean" ? value === expected : value;
    }
    case "tech":
      return ctx.hooks.techResearched(ctx.world, ctx.playerId, asString(node.tech, "tech"));
    case "chance":
      return ctx.rng.chance(asNumber(node.chance, "chance"));
    case "scope": {
      const [scopeKind, ref] = singleScopeEntry(node, "scope");
      const target = ctx.hooks.resolveScope(ctx.world, scopeKind, ref, ctx.scope);
      if (target === undefined || target === null) {
        return false;
      }
      return evaluateNode(asRecord(node.cond, "scope.cond"), withScope(ctx, scopeKind, target));
    }
    case "count": {
      const spec = asRecord(node.count, "count");
      const scopeKind = asString(spec.kind, "count.kind");
      const where = spec.where;
      const candidates = ctx.hooks.enumerateScope(ctx.world, scopeKind);
      let matches = 0;
      for (const candidate of candidates) {
        if (where === undefined) {
          matches += 1;
          continue;
        }
        if (
          evaluateNode(asRecord(where, "count.where"), withScope(ctx, scopeKind, candidate.value))
        ) {
          matches += 1;
        }
      }
      return compareValue(matches, node, "count");
    }
    case "ref": {
      const id = asString(node.ref, "ref");
      const referenced = ctx.content.scripted_triggers?.[id];
      if (referenced === undefined) {
        throw new DslError(`unknown scripted trigger "${id}"`, "dsl_unknown_ref");
      }
      return evaluateNode(referenced, deeper(ctx));
    }
    default: {
      const handler = ctx.conditions.get(kind);
      if (handler === undefined) {
        throw new DslError(
          `unknown condition kind "${kind}" (node keys: ${nodeKeys(node).join(", ")})`,
          "dsl_unknown_kind",
        );
      }
      return handler(node, ctx);
    }
  }
}

/** Evaluates a condition tree; a missing condition is `true` (no restriction). */
export function evaluateCondition(node: Condition | undefined, ctx: DslContext): boolean {
  if (node === undefined) {
    return true;
  }
  if (!isRecord(node)) {
    warn(ctx, "condition must be an object");
    return false;
  }
  try {
    return evaluateNode(node, ctx);
  } catch (error) {
    warn(ctx, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/** The core or registered kind a node declares, used by the validator and by tests. */
export function conditionKindOf(node: Condition): string | undefined {
  return nodeKind(node, CORE_CONDITION_KINDS);
}
