/**
 * Explaining an unmet requirement (SYS-12 `blocked_by`, SYS-17 operation offers).
 *
 * The UI shows why something cannot be started as a list of locale keys. This walks a condition
 * tree, keeps only the leaves that are actually false, and names each one: a missing tech is the
 * tech's own name key, everything else gets a `requirements.*` key the locale files fill in.
 */

import { evaluateCondition } from "./dsl/conditions.js";
import { isRecord } from "./dsl/node.js";
import type { Condition, DslContext } from "./dsl/types.js";

const MAX_DEPTH = 8;

function leafKey(node: Condition): string {
  if (typeof node.tech === "string") {
    return `techs.${node.tech}.name`;
  }
  if (typeof node.flag === "string") {
    return `requirements.flag.${node.flag}`;
  }
  if (typeof node.var === "string") {
    return `requirements.var.${node.var}`;
  }
  const kind = Object.keys(node)[0];
  return `requirements.${kind ?? "unknown"}`;
}

function collect(node: Condition, ctx: DslContext, depth: number, out: string[]): void {
  if (depth > MAX_DEPTH || evaluateCondition(node, ctx)) {
    return;
  }
  const all = node.all;
  if (Array.isArray(all)) {
    for (const child of all) {
      if (isRecord(child)) {
        collect(child, ctx, depth + 1, out);
      }
    }
    return;
  }
  const any = node.any;
  if (Array.isArray(any)) {
    for (const child of any) {
      if (isRecord(child)) {
        collect(child, ctx, depth + 1, out);
      }
    }
    return;
  }
  const key = leafKey(node);
  if (!out.includes(key)) {
    out.push(key);
  }
}

/** Locale keys of everything in `condition` that is currently false; empty when it is satisfied. */
export function blockedBy(condition: Condition | undefined, ctx: DslContext): string[] {
  if (condition === undefined) {
    return [];
  }
  const out: string[] = [];
  collect(condition, ctx, 0, out);
  return out;
}
