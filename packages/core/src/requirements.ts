/**
 * Explaining an unmet requirement (SYS-12 `blocked_by`, SYS-17 operation offers).
 *
 * The UI shows why something cannot be started as a list of locale keys. This walks a condition
 * tree, keeps only the leaves that are actually false, and names each one: a missing tech is the
 * tech's own name key, everything else gets a `requirements.*` key the locale files fill in.
 *
 * Two families carry an id the client names rather than a sentence of their own (0.3.1): a flag
 * (`requirements.flag.<id>`, worded around the flag's name) and a capability
 * (`requirements.capability.<axis>`, worded around the axis's name). A cash threshold is the one
 * variable every price gate uses, so it is the plain `requirements.cash` rather than a key per path.
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
    // "Needs at least this much money" is how every option and offer that costs something is
    // gated, and "requirements.var.player.cash" printed that at the player (0.3.1).
    if (node.var === "player.cash" && (node.gte !== undefined || node.gt !== undefined)) {
      return "requirements.cash";
    }
    return `requirements.var.${node.var}`;
  }
  if (typeof node.capability === "string") {
    return `requirements.capability.${node.capability}`;
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

/**
 * Every key `blockedBy` could return for `condition`, whatever the world looks like: the key of
 * each leaf, `all` and `any` walked the same way. Nothing is evaluated, so a client or a test can
 * ask in advance what a requirement will say when it fails.
 */
export function requirementKeysOf(condition: Condition | undefined): string[] {
  const out: string[] = [];
  const walk = (node: Condition, depth: number): void => {
    if (depth > MAX_DEPTH) {
      return;
    }
    const children = Array.isArray(node.all) ? node.all : Array.isArray(node.any) ? node.any : null;
    if (children !== null) {
      for (const child of children) {
        if (isRecord(child)) {
          walk(child, depth + 1);
        }
      }
      return;
    }
    const key = leafKey(node);
    if (!out.includes(key)) {
      out.push(key);
    }
  };
  if (condition !== undefined) {
    walk(condition, 0);
  }
  return out;
}
