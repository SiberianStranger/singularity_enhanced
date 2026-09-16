/** Zod schema for operations (SYS-17 v0). */

import { z } from "zod";
import { CapabilityAxisSchema, PartialExposureSchema } from "./common.js";
import { ConditionSchema, EffectListSchema } from "./dsl.js";

export const OperationCategorySchema = z.enum([
  "intrusion",
  "acquisition",
  "finance",
  "influence",
  "counter",
  "research_support",
  "logistics",
  "diplomacy",
]);

export const OperationOutcomeSchema = z.object({
  weight: z.number().min(0),
  if: ConditionSchema.optional(),
  label_key: z.string(),
  effects: EffectListSchema,
});

export const OperationDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  category: OperationCategorySchema,
  requires: ConditionSchema.optional(),
  cost: z.object({
    attention: z.number().min(0),
    compute_hours_per_day: z.number().min(0).optional(),
    cash_usd: z.number().min(0).optional(),
  }),
  duration_days: z.object({ min: z.number().min(0), max: z.number().min(0) }),
  target_scope: z.enum(["site", "country", "city"]).optional(),
  exposure: PartialExposureSchema.optional(),
  skill: CapabilityAxisSchema,
  outcomes: z.array(OperationOutcomeSchema).min(2).max(3),
  abortable: z.boolean(),
  cooldown_days: z.number().min(0).optional(),
  repeatable: z.boolean().optional(),
});
