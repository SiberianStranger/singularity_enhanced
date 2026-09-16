/** Zod schema for decision records (SYS-10 v0.1). */

import { z } from "zod";
import { ConditionSchema, EffectListSchema, WeightSchema } from "./dsl.js";

export const DecisionCategorySchema = z.enum([
  "operations",
  "finance",
  "influence",
  "security",
  "research",
  "diplomacy",
]);

export const DecisionDefSchema = z.object({
  id: z.string(),
  title_key: z.string(),
  desc_key: z.string(),
  category: DecisionCategorySchema,
  visible_if: ConditionSchema.optional(),
  enabled_if: ConditionSchema.optional(),
  should_alert: ConditionSchema.optional(),
  cost: z
    .object({
      cash: z.number().optional(),
      compute_hours: z.number().optional(),
      attention: z.number().optional(),
    })
    .optional(),
  cooldown_days: z.number().optional(),
  repeatable: z.boolean().optional(),
  effects: EffectListSchema.optional(),
  duration_days: z.number().optional(),
  on_complete: EffectListSchema.optional(),
  ai_will_do: WeightSchema.optional(),
});
