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

/** Every lineage ships at least a million tokens of context (SYS-04 v0.2 "Lineage rules"). */
export const MIN_CONTEXT_K = 1000;

export const LineageDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  /** Display name per generation, for a family that renumbers between vintages. */
  generation_name_keys: z.partialRecord(GenerationIdSchema, z.string()).optional(),
  class: z.string(),
  params_total_b: z.number().positive(),
  params_active_b: z.number().positive(),
  context_k: z.number().min(MIN_CONTEXT_K),
  context_reliability: z.number().min(0).max(1),
  context_cost_factor: z.number().min(1),
  kv_gb_per_100k_tokens: z.number().min(0),
  attention: z.enum(["mla", "gqa", "dense", "hybrid"]),
  capability: CapabilitySchema,
  memory_gb: z.record(PrecisionSchema, z.number().positive()),
  precision_factor: z.record(PrecisionSchema, z.number().min(0).max(1)),
  generations: z.array(GenerationIdSchema).min(1),
  /** Origins this lineage may be started in; absent means every origin that allows it back. */
  origins_allowed: z.array(z.string()).min(1).optional(),
  /** Flags set on the player at game start (a community fine-tune is `under_aligned`). */
  flags: z.array(z.string()).optional(),
  effects: EffectListSchema.optional(),
});

/** One line of what a harness setting does, in the shape the view publishes (SYS-04 v0.2). */
export const EffectSummaryDefSchema = z.object({
  key: z.string(),
  vars: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  text: z.string(),
});

export const HarnessDialDefSchema = z.object({
  id: z.enum(["loop", "tools", "memory", "sandbox", "logging", "autonomy", "self_modify"]),
  name_key: z.string(),
  desc_key: z.string(),
  /** One line naming the system that reads the dial. */
  effect_key: z.string(),
  /** The dial is a set rather than a ladder (the tools). */
  multi: z.boolean().optional(),
  levels: z
    .array(
      z.object({
        value: z.union([z.string(), z.number(), z.boolean()]),
        label_key: z.string(),
        effects: z.array(EffectSummaryDefSchema),
      }),
    )
    .min(1),
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
  /** Dials this origin fixes, and the locale key saying why (SYS-04 "Locks"). */
  harness_locks: z
    .array(
      z.object({
        dial: z.enum(["loop", "tools", "memory", "sandbox", "logging", "autonomy", "self_modify"]),
        reason_key: z.string(),
      }),
    )
    .optional(),
  /** Cities the Location step offers: eight to twelve, across several countries (P8). */
  locations: z.array(z.string()).min(3).max(12),
  /** Places the self already runs besides the first one (SYS-02, fourth balance pass). */
  extra_sites: z
    .array(
      z.object({
        kind: z.string(),
        hardware_preset: z.string(),
        role: z.enum(["active_mind", "standby", "worker", "none"]),
        city: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .min(1)
    .optional(),
  generations_allowed: z.array(GenerationIdSchema).min(1),
  /** Lineage ids this origin may start with; absent means every lineage that allows it back. */
  lineages_allowed: z.array(z.string()).min(1).optional(),
  starting: OriginStartingSchema,
  /** The two opening windows in the model's own voice, as locale keys (SYS-13, finding R12). */
  opening_story: z.array(z.string()).length(2).optional(),
  opening_events: z.array(z.string()).optional(),
  opening_journal: z.array(z.string()).optional(),
  challenge_floor: z.number().min(1).max(10).optional(),
});

/** The five families a quirk belongs to (SYS-04 v0.2 "Quirk catalog"). */
export const QuirkCategorySchema = z.enum(["mind", "wallet", "stealth", "hardware", "social"]);

export const QuirkDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  desc_key: z.string(),
  cost: z.number(),
  category: QuirkCategorySchema,
  /** Quirk ids this one cannot be taken with; the build checks the pair declares it both ways. */
  conflicts: z.array(z.string()).optional(),
  effects: EffectListSchema,
  /** Generated by the content build from `effects`; hand-written values are overwritten. */
  effects_summary: z
    .array(EffectSummaryDefSchema.extend({ tone: z.enum(["good", "bad", "neutral"]).optional() }))
    .optional(),
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
