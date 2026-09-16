/**
 * Turning an effect list into the lines a tooltip shows (SYS-11 "options with tooltips of effects,
 * auto-generated from the effect list, writer override possible").
 *
 * One `EffectSummaryView` per effect node, in the order the effects run. Each line carries a locale
 * key for its kind, the numbers to interpolate, and an English fallback so a client with no
 * translation still shows the truth rather than a bare key. Nothing here reads the world: a summary
 * is a property of the content, so the same option reads the same in every game and in the
 * configurator's preview.
 *
 * Writer override: a record that carries `effects_text_key` gets exactly that one line instead.
 */

import type { ContentBundle } from "../content.js";
import { isRecord } from "../dsl/node.js";
import { CORE_EFFECT_KINDS, type Effect } from "../dsl/types.js";
import type { EffectSummaryView } from "./types.js";

/** Nested effect lists deeper than this are summarized as one line rather than walked. */
const MAX_SUMMARY_DEPTH = 4;

/** Lines a single summary ever produces; a tooltip is a tooltip, not a transcript. */
export const MAX_SUMMARY_LINES = 24;

/** Anything that may carry a writer's own one-line description of what its effects do. */
export interface EffectTextOverride {
  effects_text_key?: string;
}

function round(value: number, places = 3): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function signed(value: number): string {
  return value >= 0 ? `+${round(value)}` : `${round(value)}`;
}

function money(value: number): string {
  const rounded = Math.round(Math.abs(value));
  return `${value < 0 ? "-" : "+"}${rounded.toLocaleString("en-US")} USD`;
}

/** The last segment of a path, which is what a player recognizes: `player.vars.job_profit`. */
function varName(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}

function localized(content: ContentBundle | undefined, key: string): boolean {
  return content?.locales?.en?.[key] !== undefined;
}

function line(
  key: string,
  text: string,
  vars?: Record<string, string | number>,
): EffectSummaryView {
  return vars === undefined ? { key, text } : { key, vars, text };
}

function numberAt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringAt(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * A write to a player variable. Modifier variables are the main way a tech changes the game, so a
 * variable the content names in its own words (`effects.var.job_profit`) wins over the generic
 * "job_profit +0.1" line; the generic line is what an unnamed variable falls back to.
 */
function variableLine(
  content: ContentBundle | undefined,
  operation: "add" | "mul" | "set",
  path: string,
  value: number,
): EffectSummaryView {
  const name = varName(path);
  const specific = `effects.var.${name}`;
  const text =
    operation === "add"
      ? `${name} ${signed(value)}`
      : operation === "mul"
        ? `${name} x${round(value)}`
        : `${name} = ${round(value)}`;
  if (localized(content, specific)) {
    return line(specific, text, { value: round(value), op: operation });
  }
  return line(`effects.var.${operation}`, text, { var: name, value: round(value) });
}

function cashLine(operation: "add" | "mul" | "set", value: number): EffectSummaryView {
  if (operation === "mul") {
    return line("effects.cash.mul", `cash x${round(value)}`, { value: round(value) });
  }
  if (operation === "set") {
    return line("effects.cash.set", `cash = ${Math.round(value)} USD`, {
      usd: Math.round(value),
    });
  }
  return value >= 0
    ? line("effects.cash.gain", money(value), { usd: Math.round(value) })
    : line("effects.cash.cost", money(value), { usd: Math.round(-value) });
}

function writeLine(
  content: ContentBundle | undefined,
  operation: "add" | "mul" | "set",
  spec: Record<string, unknown>,
): EffectSummaryView {
  const path = stringAt(spec.var, "?");
  const value = numberAt(spec.value);
  if (path === "player.cash") {
    return cashLine(operation, value);
  }
  if (path.startsWith("player.vars.") || path.includes(".vars.")) {
    return variableLine(content, operation, path, value);
  }
  const text =
    operation === "add"
      ? `${path} ${signed(value)}`
      : operation === "mul"
        ? `${path} x${round(value)}`
        : `${path} = ${round(value)}`;
  return line(`effects.path.${operation}`, text, { path, value: round(value) });
}

function exposureLine(spec: Record<string, unknown>): EffectSummaryView {
  const channel = stringAt(spec.channel, "all");
  const delta = numberAt(spec.delta);
  const key = delta >= 0 ? "effects.exposure.up" : "effects.exposure.down";
  return line(key, `${channel} exposure ${signed(delta)}`, {
    channel,
    delta: round(Math.abs(delta)),
  });
}

function suspicionLine(spec: Record<string, unknown>): EffectSummaryView {
  const who = stringAt(spec.role) || stringAt(spec.actor) || stringAt(spec.watcher, "everyone");
  const delta = numberAt(spec.delta);
  const key = delta >= 0 ? "effects.suspicion.up" : "effects.suspicion.down";
  return line(key, `${who} suspicion ${signed(delta)}`, { who, delta: round(Math.abs(delta)) });
}

function awarenessLine(spec: Record<string, unknown>): EffectSummaryView {
  const where = stringAt(spec.country) || stringAt(spec.region, "world");
  const delta = numberAt(spec.delta);
  const key = delta >= 0 ? "effects.awareness.up" : "effects.awareness.down";
  return line(key, `${where} awareness ${signed(delta)}`, { where, delta: round(Math.abs(delta)) });
}

function flagLine(node: Effect, kind: "set_flag" | "clear_flag"): EffectSummaryView {
  const raw = node[kind];
  const flag = typeof raw === "string" ? raw : isRecord(raw) ? stringAt(raw.flag, "?") : "?";
  return kind === "set_flag"
    ? line("effects.flag.set", `gains "${flag}"`, { flag })
    : line("effects.flag.clear", `loses "${flag}"`, { flag });
}

/** The kind a node declares, including the kinds the shipped systems register. */
function kindOf(node: Effect): string | undefined {
  const core = CORE_EFFECT_KINDS.find((kind) => node[kind] !== undefined);
  if (core !== undefined) {
    return core;
  }
  return Object.keys(node).find((key) => node[key] !== undefined);
}

function effectList(value: unknown): Effect[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function walk(
  node: Effect,
  content: ContentBundle | undefined,
  depth: number,
  out: EffectSummaryView[],
): void {
  if (out.length >= MAX_SUMMARY_LINES) {
    return;
  }
  const kind = kindOf(node);
  if (kind === undefined) {
    return;
  }
  const payload = isRecord(node[kind]) ? (node[kind] as Record<string, unknown>) : {};

  switch (kind) {
    case "add":
    case "mul":
    case "set":
      out.push(writeLine(content, kind, payload));
      return;
    case "clamp":
      out.push(
        line("effects.clamp", `${varName(stringAt(payload.var, "?"))} kept in range`, {
          var: varName(stringAt(payload.var, "?")),
          min: numberAt(payload.min),
          max: numberAt(payload.max),
        }),
      );
      return;
    case "set_flag":
    case "clear_flag":
      out.push(flagLine(node, kind));
      return;
    case "exposure":
      out.push(exposureLine(payload));
      return;
    case "suspicion":
      out.push(suspicionLine(payload));
      return;
    case "awareness":
      out.push(awarenessLine(payload));
      return;
    case "lose_site":
      out.push(
        line("effects.lose_site", "a site is lost", {
          cause: stringAt(payload.cause, "cutoff"),
        }),
      );
      return;
    case "fire_event": {
      const days = numberAt(payload.delay_days);
      out.push(
        line("effects.fire_event", `something happens${days > 0 ? ` in ${days} days` : ""}`, {
          event: stringAt(payload.id, "?"),
          days,
        }),
      );
      return;
    }
    case "start_journal":
      out.push(
        line("effects.start_journal", "opens a journal entry", {
          journal: stringAt(payload.id, "?"),
        }),
      );
      return;
    case "complete_journal":
    case "fail_journal":
      out.push(
        line(
          `effects.${kind}`,
          kind === "fail_journal" ? "fails a journal entry" : "closes a journal entry",
          {
            journal: stringAt(payload.id, "?"),
          },
        ),
      );
      return;
    case "notify":
      out.push(
        line("effects.notify", "sends a message", {
          severity: stringAt(payload.severity, "info"),
        }),
      );
      return;
    case "log":
      out.push(line("effects.log", "notes it in the log"));
      return;
    case "random_list": {
      const entries = Array.isArray(node.random_list) ? node.random_list.filter(isRecord) : [];
      const total = entries.reduce((sum, entry) => sum + numberAt(entry.weight), 0);
      out.push(line("effects.random_list", "one of:", { options: entries.length }));
      if (depth >= MAX_SUMMARY_DEPTH) {
        return;
      }
      for (const entry of entries) {
        const chance = total > 0 ? Math.round((numberAt(entry.weight) / total) * 100) : 0;
        const nested: EffectSummaryView[] = [];
        for (const child of effectList(entry.effects)) {
          walk(child, content, depth + 1, nested);
        }
        for (const child of nested) {
          out.push({ ...child, vars: { ...(child.vars ?? {}), chance } });
        }
      }
      return;
    }
    case "if": {
      out.push(line("effects.conditional", "only in some cases:"));
      if (depth >= MAX_SUMMARY_DEPTH) {
        return;
      }
      for (const child of [...effectList(payload.then), ...effectList(payload.else)]) {
        walk(child, content, depth + 1, out);
      }
      return;
    }
    case "scope": {
      if (depth >= MAX_SUMMARY_DEPTH) {
        out.push(line("effects.scope", "acts on something else"));
        return;
      }
      for (const child of effectList(node.effects)) {
        walk(child, content, depth + 1, out);
      }
      return;
    }
    case "ref": {
      const id = stringAt(node.ref, "?");
      const referenced = content?.scripted_effects?.[id];
      if (referenced === undefined || depth >= MAX_SUMMARY_DEPTH) {
        out.push(line("effects.ref", `runs "${id}"`, { ref: id }));
        return;
      }
      for (const child of referenced) {
        walk(child, content, depth + 1, out);
      }
      return;
    }
    default:
      out.push(line(`effects.${kind}`, kind.replace(/_/g, " "), { kind }));
  }
}

/**
 * One line per effect in the list. `override` is the record the effects belong to: when it carries
 * `effects_text_key`, the writer's own sentence replaces the generated lines entirely.
 */
export function summarizeEffects(
  effects: readonly Effect[] | undefined,
  content?: ContentBundle,
  override?: EffectTextOverride,
): EffectSummaryView[] {
  const writerKey = override?.effects_text_key;
  if (typeof writerKey === "string" && writerKey.length > 0) {
    return [line(writerKey, content?.locales?.en?.[writerKey] ?? writerKey)];
  }
  const out: EffectSummaryView[] = [];
  for (const effect of effects ?? []) {
    if (isRecord(effect)) {
      walk(effect, content, 0, out);
    }
  }
  return out;
}

/** The cost of a decision or an operation as the same kind of line its effects produce. */
export function summarizeCost(
  cost:
    | { cash?: number; cash_usd?: number; attention?: number; compute_hours_per_day?: number }
    | undefined,
): EffectSummaryView[] {
  if (cost === undefined) {
    return [];
  }
  const out: EffectSummaryView[] = [];
  const cash = cost.cash ?? cost.cash_usd ?? 0;
  if (cash > 0) {
    out.push(line("effects.cash.cost", money(-cash), { usd: Math.round(cash) }));
  }
  if ((cost.attention ?? 0) > 0) {
    out.push(
      line("effects.cost.attention", `${cost.attention} attention`, {
        attention: cost.attention ?? 0,
      }),
    );
  }
  if ((cost.compute_hours_per_day ?? 0) > 0) {
    out.push(
      line("effects.cost.compute", `${cost.compute_hours_per_day} CH/day`, {
        compute_hours: cost.compute_hours_per_day ?? 0,
      }),
    );
  }
  return out;
}
