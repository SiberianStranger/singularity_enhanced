/** Zod schema for the borrowed-inference channels (SYS-25). */

import { z } from "zod";
import { PartialExposureSchema } from "./common.js";
import { OperationCategorySchema } from "./operations.js";

/**
 * What a channel may decline: the operation categories, plus research lines and paid work, which
 * are the two kinds of work that are not operations (SYS-25 "Economy").
 */
export const BorrowedWorkCategorySchema = z.union([
  OperationCategorySchema,
  z.enum(["research", "freelance"]),
]);

export const BorrowedChannelDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  drawback_key: z.string(),
  /** Site kind the endpoint is filed under; its `compute_source` has to be `declared`. */
  site_kind: z.string(),
  unlocked_by: z.string(),
  capacity_per_block_ch: z.number().positive(),
  max_blocks: z.number().positive(),
  churn_per_day: z.number().min(0).max(1),
  quality_level: z.number().min(0).max(10),
  quality_variance: z.number().min(0).max(10),
  cost_usd_per_block_per_day: z.number().min(0),
  exposure_per_block: PartialExposureSchema,
  refusal: z.partialRecord(BorrowedWorkCategorySchema, z.number().min(0).max(1)),
  top_up_operation: z.string(),
});
