/** Zod schema for event records (SYS-10 v0.1). */

import { z } from "zod";
import { ConditionSchema, EffectListSchema, WeightSchema } from "./dsl.js";

export const EventSeveritySchema = z.enum(["info", "warning", "critical", "opportunity"]);
export const EventScopeSchema = z.enum(["player", "site", "country", "actor"]);
export const PulseHookSchema = z.enum([
  "on_player_hour",
  "on_player_day",
  "on_player_week",
  "on_player_month",
  "on_country_month",
  "on_actor_day",
]);

export const EngineHookSchema = z.enum([
  "on_player_hour",
  "on_player_day",
  "on_player_week",
  "on_player_month",
  "on_country_month",
  "on_actor_day",
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
]);

export const EventOptionSchema = z.object({
  id: z.string(),
  text_key: z.string(),
  if: ConditionSchema.optional(),
  enabled_if: ConditionSchema.optional(),
  fallback: z.boolean().optional(),
  effects: EffectListSchema.optional(),
  ai_chance: WeightSchema.optional(),
  tooltip_key: z.string().optional(),
});

export const EventDescriptionSchema = z.object({
  default_key: z.string(),
  variants: z.array(z.object({ when: ConditionSchema, key: z.string() })).optional(),
});

export const EventDefSchema = z.object({
  id: z.string(),
  fire_mode: z.enum(["polled", "triggered_only"]),
  pulse: PulseHookSchema.optional(),
  scope: EventScopeSchema,
  title_key: z.string(),
  desc: EventDescriptionSchema,
  image: z.string().optional(),
  blocking: z.boolean().optional(),
  severity: EventSeveritySchema,
  trigger: ConditionSchema.optional(),
  mtth_days: WeightSchema.optional(),
  fire_only_once: z.boolean().optional(),
  cooldown_days: z.number().optional(),
  ttl_days: z.number().optional(),
  on_expire: z.object({ resolve_as_option: z.string() }).optional(),
  targets: ConditionSchema.optional(),
  immediate: EffectListSchema.optional(),
  options: z.array(EventOptionSchema).min(1).max(6),
  hidden: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  vars: z.record(z.string(), z.string()).optional(),
});

export const HookDefSchema = z.object({
  id: z.string(),
  extends: EngineHookSchema.optional(),
  scope: EventScopeSchema,
  trigger: ConditionSchema.optional(),
  events: z.array(z.object({ id: z.string(), delay_days: z.number().optional() })).optional(),
  random_events: z
    .object({
      chance_to_happen: z.number().min(0).max(1).optional(),
      pool: z.array(z.object({ weight: WeightSchema, id: z.string().nullable() })),
    })
    .optional(),
  first_valid: z.array(z.string()).optional(),
  hooks: z.array(z.string()).optional(),
  fallback: z.string().optional(),
});
