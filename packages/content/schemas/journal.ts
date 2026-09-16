/** Zod schema for journal entries (SYS-10 v0.1). */

import { z } from "zod";
import { ConditionSchema, EffectListSchema } from "./dsl.js";

export const JournalStepSchema = z.object({
  id: z.string(),
  title_key: z.string().optional(),
  complete_if: ConditionSchema,
  effects: EffectListSchema.optional(),
});

export const JournalProgressSchema = z.union([
  z.object({ var: z.string(), max: z.number() }),
  z.object({ steps: z.array(JournalStepSchema) }),
]);

export const JournalStageSchema = z.object({
  threshold: z.number().min(0).max(1),
  on_enter: EffectListSchema.optional(),
  modifiers: z.array(z.string()).optional(),
});

export const JournalDefSchema = z.object({
  id: z.string(),
  title_key: z.string(),
  desc_key: z.string(),
  scope: z.enum(["player", "actor", "country", "site"]),
  start_if: ConditionSchema.optional(),
  visible_if: ConditionSchema.optional(),
  progress: JournalProgressSchema.optional(),
  stages: z.array(JournalStageSchema).optional(),
  timeout_days: z.number().optional(),
  complete_if: ConditionSchema.optional(),
  fail_if: ConditionSchema.optional(),
  on_complete: EffectListSchema.optional(),
  on_fail: EffectListSchema.optional(),
  on_timeout: EffectListSchema.optional(),
  decisions: z.array(z.string()).optional(),
  alert: z.enum(["pinned", "normal", "silent"]),
});
