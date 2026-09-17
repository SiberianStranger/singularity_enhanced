/** Zod schemas for accelerators, hardware presets and site kinds (SYS-02). */

import { z } from "zod";
import { InterconnectSchema, PartialExposureSchema, ThroughputClassSchema } from "./common.js";

export const AcceleratorDefSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  name: z.string(),
  arch: z.string().optional(),
  launch_year: z.number().int().optional(),
  memory_gb: z.number().positive(),
  memory_bandwidth_gbs: z.number().positive(),
  tflops_fp16: z.number().positive().nullable(),
  tdp_w: z.number().positive(),
  form_factor: z.string().optional(),
  interconnect: z.object({ type: z.string(), gbs: z.number().positive().nullable() }),
  price_usd_new: z.number().positive().nullable(),
  price_usd_used: z.number().positive().nullable(),
  export_control_to_china: z
    .enum(["unrestricted", "restricted", "banned", "china_variant"])
    .optional(),
  availability: z.array(z.enum(["cloud", "enterprise", "retail", "used", "gray", "china_only"])),
  cloud_usd_per_hour: z.object({ low: z.number(), high: z.number() }).nullable(),
  source_id: z.string().optional(),
});

export const NodeSpecSchema = z.object({
  accelerator: z.string(),
  count: z.number().int().positive(),
  ram_gb: z.number().positive(),
  interconnect: InterconnectSchema,
});

export const HardwarePresetDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  drawback_key: z.string(),
  nodes: z.array(NodeSpecSchema).min(1),
  cost_usd: z.number().min(0),
  power_kw: z.number().min(0),
  class: ThroughputClassSchema,
});

export const SiteKindDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  ownership: z.enum(["stolen", "rented", "owned", "partner"]),
  grace_days: z.number().min(0),
  base_exposure: PartialExposureSchema,
  power_cap_kw: z.number().positive().nullable(),
  power_exposure: z.number().min(0),
  upkeep_factor: z.number().min(0),
  can_host_active_mind: z.boolean(),
  /**
   * Non-negative rather than positive since SYS-25: a borrowed channel has no nodes at all, and a
   * placeholder node would lie in the sites table.
   */
  max_nodes: z.number().int().min(0),
  /** Where the compute-hours come from; `declared` is a channel with no hardware (SYS-25). */
  compute_source: z.enum(["accelerators", "declared"]).optional(),
});
