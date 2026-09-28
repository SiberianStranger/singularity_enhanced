/** Configurations, deliberate variants and five supporting site subsystems. */
import { z } from "zod";
import { NodeSpecSchema } from "./hardware.js";

export const EquipmentDefSchema = z.object({
  id: z.string(),
  acquisition: z.enum(["purchase", "rental"]).optional(),
  slot: z.enum(["compute", "power", "cooling", "network", "interconnect", "security"]),
  archetype: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  tradeoff_key: z.string(),
  variant_key: z.string().optional(),
  basis: z.array(z.string()),
  stage: z.number().int().min(0).max(7),
  requires: z.array(z.string()),
  reveal_after: z.array(z.string()),
  available_year: z.number().int().optional(),
  site_kinds: z.array(z.string()).min(1),
  cost_usd: z.number().nonnegative(),
  upkeep_usd_per_day: z.number().nonnegative(),
  install_days: z.number().positive(),
  prototype_days: z.number().positive().optional(),
  prototype_cost_usd: z.number().nonnegative().optional(),
  requires_company: z.boolean().optional(),
  min_interconnect_tier: z.number().int().min(0).max(3).optional(),
  nodes: z
    .array(NodeSpecSchema.extend({ ram_gb: z.number().nonnegative() }))
    .min(1)
    .optional(),
  effects: z
    .object({
      power_capacity_kw: z.number().positive().optional(),
      cooling_capacity_kw: z.number().positive().optional(),
      power_factor: z.number().min(0.85).max(2).optional(),
      interconnect_tier: z.number().int().min(0).max(3).optional(),
      parallel_factor: z.number().min(1).max(2).optional(),
      network_mbps: z.number().nonnegative().optional(),
      network_egress: z.boolean().optional(),
      external_work_factor: z.number().min(0).max(1.5).optional(),
      exposure_factors: z
        .object({
          network: z.number().min(0.1).max(3).optional(),
          billing: z.number().min(0.1).max(3).optional(),
          telemetry: z.number().min(0.1).max(3).optional(),
          behavioral: z.number().min(0.1).max(3).optional(),
          human: z.number().min(0.1).max(3).optional(),
          financial: z.number().min(0.1).max(3).optional(),
          osint: z.number().min(0.1).max(3).optional(),
        })
        .optional(),
    })
    .optional(),
});
