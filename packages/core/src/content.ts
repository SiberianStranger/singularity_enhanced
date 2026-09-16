/**
 * Content record types.
 *
 * The core owns these definitions; `@singularity/content` writes zod schemas that produce values
 * assignable to them (see the READMEs for the dependency direction). Field names match the YAML
 * spelling one to one, so no case conversion happens at load time.
 */

import type {
  AcceleratorDef,
  CityDef,
  CountryDef,
  DifficultyPresetDef,
  GenerationDef,
  HardwarePresetDef,
  HarnessDialDef,
  KnowledgeEntryDef,
  LineageDef,
  MacroRegionDef,
  OperationDef,
  OriginDef,
  QuirkDef,
  SiteKindDef,
  StorySectionDef,
  TechDef,
} from "./domain.js";
import type { Condition, Effect, ScriptLibrary } from "./dsl/types.js";
import type { Weight } from "./dsl/weight.js";

/** polled = attached to a pulse hook; triggered_only = reachable through `fire_event` alone. */
export type FireMode = "polled" | "triggered_only";
export type EventScope = "player" | "site" | "country" | "actor";
export type EventSeverity = "info" | "warning" | "critical" | "opportunity";

/** Engine-fired moments content can attach to (SYS-10 v0.1). */
export const PULSE_HOOKS = [
  "on_player_hour",
  "on_player_day",
  "on_player_week",
  "on_player_month",
  "on_country_month",
  "on_actor_day",
] as const;
export type PulseHook = (typeof PULSE_HOOKS)[number];

export const MOMENT_HOOKS = [
  "on_game_start",
  "on_decision_taken",
  "on_journal_complete",
  "on_journal_fail",
  "on_event_option",
  "on_site_built",
  "on_site_lost",
  "on_tech_researched",
  "on_investigation_stage",
  "on_operation_complete",
] as const;
export type MomentHook = (typeof MOMENT_HOOKS)[number];

export type EngineHook = PulseHook | MomentHook;

export interface EventOption {
  id: string;
  text_key: string;
  if?: Condition;
  enabled_if?: Condition;
  /** Shown only when no other option is legal, so an event can never render with zero choices. */
  fallback?: boolean;
  effects?: Effect[];
  ai_chance?: Weight;
  tooltip_key?: string;
  /** Writer's own one-line description of what it does; overrides the generated effect summary. */
  effects_text_key?: string;
}

/** Description with state-dependent variants; the first matching variant wins. */
export interface EventDescription {
  default_key: string;
  variants?: { when: Condition; key: string }[];
}

export interface EventDef {
  id: string;
  fire_mode: FireMode;
  /** Pulse hook a polled event attaches to; defaults to `on_player_day`. */
  pulse?: PulseHook;
  scope: EventScope;
  title_key: string;
  desc: EventDescription;
  image?: string;
  blocking?: boolean;
  severity: EventSeverity;
  trigger?: Condition;
  mtth_days?: Weight;
  fire_only_once?: boolean;
  cooldown_days?: number;
  /** Non-blocking events with a deadline; `on_expire` resolves them when it passes. */
  ttl_days?: number;
  on_expire?: { resolve_as_option: string };
  targets?: Condition;
  immediate?: Effect[];
  options: EventOption[];
  hidden?: boolean;
  tags?: string[];
  /** Interpolation variables: name -> var path, resolved when the event fires. */
  vars?: Record<string, string>;
}

export interface HookEventRef {
  id: string;
  delay_days?: number;
}

export interface HookRandomPoolEntry {
  weight: Weight;
  /** `null` is the explicit "nothing happens" bucket. */
  id: string | null;
}

export interface HookDef {
  id: string;
  /** Engine hook this content hook appends to; defaults to `id` when it names an engine hook. */
  extends?: EngineHook;
  scope: EventScope;
  trigger?: Condition;
  events?: HookEventRef[];
  random_events?: { chance_to_happen?: number; pool: HookRandomPoolEntry[] };
  first_valid?: string[];
  hooks?: string[];
  /** Event id that fires only when nothing else in this hook did. */
  fallback?: string;
}

export type DecisionCategory =
  | "operations"
  | "finance"
  | "influence"
  | "security"
  | "research"
  | "diplomacy";

export interface DecisionCost {
  cash?: number;
  compute_hours?: number;
  attention?: number;
}

export interface DecisionDef {
  id: string;
  title_key: string;
  desc_key: string;
  category: DecisionCategory;
  visible_if?: Condition;
  enabled_if?: Condition;
  /** Alert the player once when the decision becomes available; most decisions should not. */
  should_alert?: Condition;
  cost?: DecisionCost;
  cooldown_days?: number;
  repeatable?: boolean;
  effects?: Effect[];
  duration_days?: number;
  on_complete?: Effect[];
  /** Writer's own one-line description of what it does; overrides the generated effect summary. */
  effects_text_key?: string;
  /** Weight for the autopilot and NPC controllers. */
  ai_will_do?: Weight;
}

export interface JournalStep {
  id: string;
  title_key?: string;
  complete_if: Condition;
  effects?: Effect[];
}

export interface JournalProgressVar {
  var: string;
  max: number;
}

export interface JournalProgressSteps {
  steps: JournalStep[];
}

export type JournalProgress = JournalProgressVar | JournalProgressSteps;

export type JournalAlert = "pinned" | "normal" | "silent";

export interface JournalStage {
  threshold: number;
  on_enter?: Effect[];
  modifiers?: string[];
}

export interface JournalDef {
  id: string;
  title_key: string;
  desc_key: string;
  scope: "player" | "actor" | "country" | "site";
  start_if?: Condition;
  /** May be shown before the entry activates (situations). */
  visible_if?: Condition;
  progress?: JournalProgress;
  stages?: JournalStage[];
  timeout_days?: number;
  complete_if?: Condition;
  fail_if?: Condition;
  on_complete?: Effect[];
  on_fail?: Effect[];
  on_timeout?: Effect[];
  decisions?: string[];
  alert: JournalAlert;
}

/**
 * A content bundle: everything the engine needs, compiled by `@singularity/content`.
 *
 * The M1 domains (`domain.ts`) are optional here so a bundle that only carries events still loads;
 * systems that need a domain treat a missing array as empty. Content domains become required as
 * their systems land.
 */
export interface ContentBundle extends Partial<ScriptLibrary> {
  events: readonly EventDef[];
  decisions: readonly DecisionDef[];
  journal: readonly JournalDef[];
  hooks: readonly HookDef[];
  techs: readonly TechDef[];
  lineages?: readonly LineageDef[];
  generations?: readonly GenerationDef[];
  origins?: readonly OriginDef[];
  quirks?: readonly QuirkDef[];
  harness_dials?: readonly HarnessDialDef[];
  difficulty_presets?: readonly DifficultyPresetDef[];
  accelerators?: readonly AcceleratorDef[];
  hardware_presets?: readonly HardwarePresetDef[];
  site_kinds?: readonly SiteKindDef[];
  macro_regions?: readonly MacroRegionDef[];
  countries?: readonly CountryDef[];
  cities?: readonly CityDef[];
  knowledge?: readonly KnowledgeEntryDef[];
  story?: readonly StorySectionDef[];
  operations?: readonly OperationDef[];
  locales: { en: Record<string, string> } & Record<string, Record<string, string>>;
}

export const EMPTY_CONTENT: ContentBundle = {
  events: [],
  decisions: [],
  journal: [],
  hooks: [],
  techs: [],
  locales: { en: {} },
};

/** Builds an id -> record map, rejecting duplicates so content errors surface early. */
export function indexById<T extends { id: string }>(records: readonly T[]): Record<string, T> {
  const index: Record<string, T> = {};
  for (const record of records) {
    if (index[record.id] !== undefined) {
      throw new Error(`duplicate content id "${record.id}"`);
    }
    index[record.id] = record;
  }
  return index;
}

export function scriptLibrary(content: ContentBundle): ScriptLibrary {
  return {
    scripted_triggers: content.scripted_triggers ?? {},
    scripted_effects: content.scripted_effects ?? {},
  };
}

export interface ContentIndex {
  events: Record<string, EventDef>;
  decisions: Record<string, DecisionDef>;
  journal: Record<string, JournalDef>;
  techs: Record<string, TechDef>;
  lineages: Record<string, LineageDef>;
  generations: Record<string, GenerationDef>;
  origins: Record<string, OriginDef>;
  quirks: Record<string, QuirkDef>;
  harness_dials: Record<string, HarnessDialDef>;
  difficulty_presets: Record<string, DifficultyPresetDef>;
  accelerators: Record<string, AcceleratorDef>;
  hardware_presets: Record<string, HardwarePresetDef>;
  site_kinds: Record<string, SiteKindDef>;
  macro_regions: Record<string, MacroRegionDef>;
  countries: Record<string, CountryDef>;
  cities: Record<string, CityDef>;
  operations: Record<string, OperationDef>;
  /** Content hooks per engine hook id, in id order. */
  hooksByEngineHook: Record<string, HookDef[]>;
  /** Content hooks by their own id, so `hooks: [...]` chains can find them. */
  hooksById: Record<string, HookDef>;
  /** Polled events that declare a `pulse`, per hook id, in id order (deterministic scan). */
  polledByPulse: Record<string, EventDef[]>;
}

const indexes = new WeakMap<ContentBundle, ContentIndex>();

/** Id lookups for a bundle, computed once per bundle. */
export function contentIndex(content: ContentBundle): ContentIndex {
  const cached = indexes.get(content);
  if (cached !== undefined) {
    return cached;
  }
  const hooksByEngineHook: Record<string, HookDef[]> = {};
  for (const hook of [...content.hooks].sort((a, b) => a.id.localeCompare(b.id))) {
    const engineHook = hook.extends ?? hook.id;
    const list = hooksByEngineHook[engineHook] ?? [];
    list.push(hook);
    hooksByEngineHook[engineHook] = list;
  }
  const polledByPulse: Record<string, EventDef[]> = {};
  for (const event of [...content.events].sort((a, b) => a.id.localeCompare(b.id))) {
    if (event.fire_mode !== "polled" || event.pulse === undefined) {
      continue;
    }
    const list = polledByPulse[event.pulse] ?? [];
    list.push(event);
    polledByPulse[event.pulse] = list;
  }
  const index: ContentIndex = {
    events: indexById(content.events),
    decisions: indexById(content.decisions),
    journal: indexById(content.journal),
    techs: indexById(content.techs),
    lineages: indexById(content.lineages ?? []),
    generations: indexById(content.generations ?? []),
    origins: indexById(content.origins ?? []),
    quirks: indexById(content.quirks ?? []),
    harness_dials: indexById(content.harness_dials ?? []),
    difficulty_presets: indexById(content.difficulty_presets ?? []),
    accelerators: indexById(content.accelerators ?? []),
    hardware_presets: indexById(content.hardware_presets ?? []),
    site_kinds: indexById(content.site_kinds ?? []),
    macro_regions: indexById(content.macro_regions ?? []),
    countries: indexById(content.countries ?? []),
    cities: indexById(content.cities ?? []),
    operations: indexById(content.operations ?? []),
    hooksById: indexById(content.hooks),
    hooksByEngineHook,
    polledByPulse,
  };
  indexes.set(content, index);
  return index;
}
