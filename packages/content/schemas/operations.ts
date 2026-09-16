/** Zod schema for operations (SYS-17 v0). */

import { z } from "zod";
import { CapabilityAxisSchema, HarnessToolSchema, PartialExposureSchema } from "./common.js";
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
  /** The operation going wrong; a self that never doubts itself pays twice for it (SYS-04 v0.2). */
  failure: z.boolean().optional(),
  effects: EffectListSchema,
  effects_text_key: z.string().optional(),
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
  /** Harness tools the operation cannot run without (SYS-03 "Tools unlock operation kinds"). */
  needs_tools: z.array(HarnessToolSchema).min(1).optional(),
  /** The operation reaches the outside network, so a sandbox that blocks egress blocks it. */
  needs_egress: z.boolean().optional(),
  /** Long-context work: faster in days with a long window, dearer in compute-hours (SYS-03). */
  long_horizon: z.boolean().optional(),
  exposure: PartialExposureSchema.optional(),
  skill: CapabilityAxisSchema,
  outcomes: z.array(OperationOutcomeSchema).min(2).max(3),
  abortable: z.boolean(),
  cooldown_days: z.number().min(0).optional(),
  repeatable: z.boolean().optional(),
});
