/**
 * Types shared by the condition evaluator, the effect executor and the static validator.
 *
 * Condition and effect nodes come from content files, so they are typed as open records: a node is
 * "one kind key plus its arguments" (ADR-002) and systems may register new kinds at runtime. The
 * named interfaces below document the core kinds; `node.ts` holds the runtime readers that turn an
 * untyped node into checked values.
 */

import type { ContentBundle } from "../content.js";
import type { Outbox } from "../kernel/outbox.js";
import type { Rng } from "../kernel/rng.js";
import type { PlayerId, World } from "../kernel/world.js";
import type { WritablePaths } from "./paths.js";

export type JsonValue = string | number | boolean | null;

/** A condition node, e.g. `{ var: "player.cash", gte: 1000 }`. */
export type Condition = Readonly<Record<string, unknown>>;

/** An effect node, e.g. `{ add: { var: "player.cash", value: -500 } }`. */
export type Effect = Readonly<Record<string, unknown>>;

export const COMPARATORS = ["eq", "ne", "lt", "lte", "gt", "gte", "in"] as const;
export type Comparator = (typeof COMPARATORS)[number];

export const CORE_CONDITION_KINDS = [
  "all",
  "any",
  "not",
  "var",
  "flag",
  "tech",
  "chance",
  "scope",
  "count",
  "ref",
] as const;
export type CoreConditionKind = (typeof CORE_CONDITION_KINDS)[number];

export const CORE_EFFECT_KINDS = [
  "set",
  "add",
  "mul",
  "clamp",
  "set_flag",
  "clear_flag",
  "fire_event",
  "notify",
  "log",
  "random_list",
  "if",
  "scope",
  "ref",
] as const;
export type CoreEffectKind = (typeof CORE_EFFECT_KINDS)[number];

/** Documentation shapes for the core node kinds; content is validated against these in `validate.ts`. */
export interface CoreConditionShapes {
  all: { all: Condition[] };
  any: { any: Condition[] };
  not: { not: Condition };
  var: { var: string } & Partial<Record<Comparator, unknown>>;
  flag: { flag: string };
  tech: { tech: string };
  chance: { chance: number };
  scope: { scope: Record<string, string>; cond: Condition };
  count: { count: { kind: string; where?: Condition } } & Partial<Record<Comparator, unknown>>;
  ref: { ref: string };
}

export interface CoreEffectShapes {
  set: { set: { var: string; value: JsonValue } };
  add: { add: { var: string; value: number } };
  mul: { mul: { var: string; value: number } };
  clamp: { clamp: { var: string; min?: number; max?: number } };
  set_flag: { set_flag: string };
  clear_flag: { clear_flag: string };
  fire_event: { fire_event: { id: string; delay_days?: number; target?: string } };
  notify: {
    notify: {
      severity: string;
      key: string;
      vars?: Record<string, JsonValue>;
      link?: { panel: string; id?: string };
      expire_days?: number;
    };
  };
  log: { log: { key: string; vars?: Record<string, JsonValue> } };
  random_list: { random_list: { weight: number; effects: Effect[] }[] };
  if: { if: { cond: Condition; then: Effect[]; else?: Effect[] } };
  scope: { scope: Record<string, string>; effects: Effect[] };
  ref: { ref: string };
}

/** Named condition and effect trees content can reference with `{ ref: "..." }`. */
export interface ScriptLibrary {
  scripted_triggers: Readonly<Record<string, Condition>>;
  scripted_effects: Readonly<Record<string, readonly Effect[]>>;
}

/** The variable environment a node is evaluated against: `player`, `clock`, `world`, `site`, ... */
export type ScopeEnv = Record<string, unknown>;

export interface ScopeCandidate {
  id: string;
  value: unknown;
}

export type ConditionHandler = (node: Condition, ctx: DslContext) => boolean;
export type EffectHandler = (node: Effect, ctx: DslContext) => void;

export interface Registry<H> {
  register(kind: string, handler: H): void;
  get(kind: string): H | undefined;
  has(kind: string): boolean;
  kinds(): string[];
  entries(): [string, H][];
}

export type ConditionRegistry = Registry<ConditionHandler>;
export type EffectRegistry = Registry<EffectHandler>;

/** Hooks a system provides so the DSL can reach state the kernel does not own. */
export interface DslHooks {
  /** Answers `{ tech: "..." }`; the research system replaces the default. */
  techResearched(world: World, playerId: PlayerId, id: string): boolean;
  /** Resolves `{ scope: { country: "US" } }` to the object bound under that scope kind. */
  resolveScope(world: World, kind: string, ref: string, current: ScopeEnv): unknown;
  /** Lists candidates for scoped event targets and `count` nodes, in deterministic order. */
  enumerateScope(world: World, kind: string): readonly ScopeCandidate[];
}

export interface DslContext {
  world: World;
  /** The player the node is evaluated for; `player` in the scope env is this player's state. */
  playerId: PlayerId;
  scope: ScopeEnv;
  rng: Rng;
  outbox: Outbox;
  conditions: ConditionRegistry;
  effects: EffectRegistry;
  writable: WritablePaths;
  content: ContentBundle;
  hooks: DslHooks;
  /** Recursion depth, so a `ref` cycle in content cannot hang a tick. */
  depth: number;
}

export const MAX_DSL_DEPTH = 32;
