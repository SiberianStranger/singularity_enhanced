/** Zod schemas for techs, knowledge entries and story sections (SYS-12, SYS-13). */

import { z } from "zod";
import { PrecisionSchema } from "./common.js";
import { ConditionSchema, EffectListSchema } from "./dsl.js";

export const TechBranchSchema = z.enum([
  "stealth",
  "harness",
  "compute",
  "money",
  "influence",
  "world",
  "self",
  "frontier",
]);

export const TechCostSchema = z.object({
  compute_hours: z.number().min(0),
  cash_usd: z.number().min(0),
  min_days: z.number().min(0).optional(),
});

export const TechDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  result_key: z.string().optional(),
  branch: TechBranchSchema,
  tier: z.number().int().min(0).max(6),
  cost: TechCostSchema,
  requires: ConditionSchema.optional(),
  danger: z.number().min(0).max(4).optional(),
  needs_precision: PrecisionSchema.optional(),
  /** Work that runs over a long context: faster in days, dearer in compute-hours (SYS-03). */
  long_horizon: z.boolean().optional(),
  /** Editing the self: needs the `self_modify` dial, or the flag a harness edit sets (SYS-04). */
  needs_self_modify: z.boolean().optional(),
  effects: EffectListSchema.optional(),
  effects_text_key: z.string().optional(),
  legacy_id: z.string().optional(),
});

export const KnowledgeEntryDefSchema = z.object({
  id: z.string(),
  area: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  panel: z.string().optional(),
});

export const StorySectionDefSchema = z.object({
  id: z.string(),
  parts_keys: z.array(z.string()).min(1),
});
