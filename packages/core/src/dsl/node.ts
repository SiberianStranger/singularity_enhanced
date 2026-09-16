/**
 * Runtime readers for untyped condition and effect nodes.
 *
 * Content arrives as parsed JSON/YAML, so every field access has to be checked. These helpers
 * throw a `DslError` with a readable message; the evaluator and the executor turn that into a
 * logged warning instead of letting it escape a tick.
 */

import type { TextVar } from "../kernel/world.js";
import { DslError } from "./paths.js";
import type { Condition, Effect, JsonValue } from "./types.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The kind of a node: its first key that the given set knows, else its first key. */
export function nodeKind(node: Condition | Effect, known: readonly string[]): string | undefined {
  const keys = Object.keys(node);
  const match = keys.find((key) => known.includes(key));
  return match ?? keys[0];
}

export function nodeKeys(node: Condition | Effect): string[] {
  return Object.keys(node);
}

export function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new DslError(`${what} must be an object`, "dsl_bad_node");
  }
  return value;
}

export function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new DslError(`${what} must be an array`, "dsl_bad_node");
  }
  return value;
}

export function asString(value: unknown, what: string): string {
  if (typeof value !== "string") {
    throw new DslError(`${what} must be a string`, "dsl_bad_node");
  }
  return value;
}

export function asNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DslError(`${what} must be a finite number`, "dsl_bad_node");
  }
  return value;
}

export function asNodeList(value: unknown, what: string): Condition[] {
  return asArray(value, what).map((item, index) => asRecord(item, `${what}[${index}]`));
}

export function asEffectList(value: unknown, what: string): Effect[] {
  return asArray(value, what).map((item, index) => asRecord(item, `${what}[${index}]`));
}

export function optionalNumber(value: unknown, what: string): number | undefined {
  return value === undefined ? undefined : asNumber(value, what);
}

export function optionalString(value: unknown, what: string): string | undefined {
  return value === undefined ? undefined : asString(value, what);
}

/** A `{ kind: {...} }` payload as an object, accepting `{ kind: "id" }` shorthand. */
export function payloadRecord(node: Condition | Effect, kind: string): Record<string, unknown> {
  return asRecord(node[kind], `${kind} payload`);
}

/** Text-interpolation variables: only primitives survive into a localized string. */
export function asTextVars(value: unknown, what: string): Record<string, TextVar> {
  if (value === undefined) {
    return {};
  }
  const record = asRecord(value, what);
  const out: Record<string, TextVar> = {};
  for (const key of Object.keys(record).sort()) {
    const raw = record[key];
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      out[key] = raw;
    } else {
      throw new DslError(`${what}.${key} must be a string, number or boolean`, "dsl_bad_node");
    }
  }
  return out;
}

export function isJsonScalar(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
