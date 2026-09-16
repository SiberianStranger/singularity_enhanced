/**
 * "Why did this happen" (SYS-10, SYS-11).
 *
 * Every event window carries the reasons it fired: the base mean time to happen and the modifiers
 * that were applied to it, plus the trigger the event required. Reasons are data, not prose: each
 * one names a locale key and keeps a raw text form, so a client can render a translated line where
 * one exists and still show something exact where it does not.
 *
 * Nothing here evaluates a condition. The applied modifiers are handed in from the evaluation that
 * already happened, and the trigger is described structurally, so building an explanation never
 * draws from the world RNG and never changes the course of a game.
 */

import type { MtthBreakdown } from "./dsl/mtth.js";
import { isRecord } from "./dsl/node.js";
import { COMPARATORS, type Comparator, type Condition } from "./dsl/types.js";
import { isWeightObject, type Weight } from "./dsl/weight.js";
import type { ChoiceReason } from "./kernel/world.js";

/** Condition trees deeper than this are summarized rather than listed leaf by leaf. */
const MAX_EXPLAIN_DEPTH = 4;

const COMPARATOR_TEXT: Record<Comparator, string> = {
  eq: "=",
  ne: "!=",
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
  in: "in",
};

function comparatorText(node: Condition): string {
  const parts: string[] = [];
  for (const comparator of COMPARATORS) {
    if (!(comparator in node)) {
      continue;
    }
    const value = node[comparator];
    parts.push(`${COMPARATOR_TEXT[comparator]} ${Array.isArray(value) ? value.join("/") : value}`);
  }
  return parts.join(" ");
}

/**
 * Names one condition leaf. The key convention matches `requirements.ts`, so a locale file that
 * explains a requirement explains the same thing in an event window.
 */
export function describeLeaf(node: Condition, negated: boolean): ChoiceReason {
  const prefix = negated ? "not " : "";
  if (typeof node.tech === "string") {
    return { key: `techs.${node.tech}.name`, text: `${prefix}tech ${node.tech}` };
  }
  if (typeof node.flag === "string") {
    return { key: `requirements.flag.${node.flag}`, text: `${prefix}flag ${node.flag}` };
  }
  if (typeof node.var === "string") {
    return {
      key: `requirements.var.${node.var}`,
      text: `${prefix}${node.var} ${comparatorText(node)}`.trim(),
    };
  }
  const kind = Object.keys(node).find((key) => !(COMPARATORS as readonly string[]).includes(key));
  const compared = comparatorText(node);
  return {
    key: `requirements.${kind ?? "unknown"}`,
    text: `${prefix}${kind ?? "condition"}${compared === "" ? "" : ` ${compared}`}`,
  };
}

function collect(node: Condition, negated: boolean, depth: number, out: ChoiceReason[]): void {
  if (depth > MAX_EXPLAIN_DEPTH || out.length >= 12) {
    return;
  }
  const children = node.all ?? node.any;
  if (Array.isArray(children)) {
    for (const child of children) {
      if (isRecord(child)) {
        collect(child, negated, depth + 1, out);
      }
    }
    return;
  }
  if (isRecord(node.not)) {
    collect(node.not, !negated, depth + 1, out);
    return;
  }
  const reason = describeLeaf(node, negated);
  if (!out.some((entry) => entry.key === reason.key && entry.text === reason.text)) {
    out.push(reason);
  }
}

/** The leaves of a condition tree, as the reasons an event was allowed to fire at all. */
export function describeCondition(condition: Condition | undefined): ChoiceReason[] {
  if (condition === undefined) {
    return [];
  }
  const out: ChoiceReason[] = [];
  collect(condition, false, 0, out);
  return out;
}

/**
 * The mean time to happen that was rolled, as a base line plus one line per modifier that fired.
 * `breakdown.applied` indexes into the weight's own modifier list, which is where the condition
 * that made each one apply comes from.
 */
export function describeMtth(weight: Weight | undefined, breakdown: MtthBreakdown): ChoiceReason[] {
  const reasons: ChoiceReason[] = [
    {
      key: "events.why.mtth_base",
      text: `base ${breakdown.base} days`,
      vars: { days: breakdown.base },
    },
  ];
  const modifiers = weight !== undefined && isWeightObject(weight) ? (weight.modifiers ?? []) : [];
  for (const entry of breakdown.applied) {
    const modifier = modifiers[entry.index];
    const described =
      modifier === undefined
        ? { key: "events.why.modifier", text: `modifier ${entry.index}` }
        : describeLeaf(modifier.if, false);
    reasons.push({
      ...described,
      ...(entry.factor !== undefined ? { factor: entry.factor } : {}),
      ...(entry.add !== undefined ? { add: entry.add } : {}),
    });
  }
  reasons.push({
    key: "events.why.mtth_effective",
    text: `effective ${Math.round(breakdown.mtthDays * 100) / 100} days`,
    vars: { days: Math.round(breakdown.mtthDays * 100) / 100 },
  });
  return reasons;
}
