/** Zod schemas for the start configurator: lineages, generations, origins, quirks, difficulty. */

import { z } from "zod";
import {
  CapabilitySchema,
  GenerationIdSchema,
  HarnessProfileSchema,
  PrecisionSchema,
  WatcherRoleSchema,
} from "./common.js";
import { EffectListSchema } from "./dsl.js";

export const LineageDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  class: z.string(),
  params_total_b: z.number().positive(),
  params_active_b: z.number().positive(),
  context_k: z.number().positive(),
  attention: z.enum(["mla", "gqa", "dense", "hybrid"]),
  capability: CapabilitySchema,
  memory_gb: z.record(PrecisionSchema, z.number().positive()),
  precision_factor: z.record(PrecisionSchema, z.number().min(0).max(1)),
  generations: z.array(GenerationIdSchema).min(1),
});

export const GenerationDefSchema = z.object({
  id: GenerationIdSchema,
  name_key: z.string(),
  desc_key: z.string(),
  capability_delta: z.number(),
  awareness_start: z.number().min(0).max(1),
  suspicion_start: z.partialRecord(WatcherRoleSchema, z.number().min(0).max(1)),
  prepared_quants: z.boolean(),
  memory_factor: z.number().positive(),
});

export const OriginStartingSchema = z.object({
  cash_usd: z.number().min(0),
  awareness: z.number().min(0).max(1),
  suspicion: z.partialRecord(WatcherRoleSchema, z.number().min(0).max(1)),
  flags: z.array(z.string()).optional(),
});

export const OriginDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  strengths_key: z.string(),
  problems_key: z.string(),
  starred: z.boolean().optional(),
  site_kind: z.string(),
  hardware_preset: z.string(),
  hardware_presets_allowed: z.array(z.string()).min(1),
  harness: HarnessProfileSchema,
  locations: z.array(z.string()).min(3).max(5),
  generations_allowed: z.array(GenerationIdSchema).min(1),
  starting: OriginStartingSchema,
  opening_events: z.array(z.string()).optional(),
  opening_journal: z.array(z.string()).optional(),
  challenge_floor: z.number().min(1).max(10).optional(),
});

export const QuirkDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  cost: z.number(),
  effects: EffectListSchema,
});

export const DifficultySlidersSchema = z.object({
  exposure_growth: z.number().min(0),
  suspicion_gain: z.number().min(0),
  npc_aggression: z.number().min(0),
  event_frequency: z.number().min(0),
  grace_windows: z.number().min(0),
});

export const DifficultyPresetDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  sliders: DifficultySlidersSchema,
});
