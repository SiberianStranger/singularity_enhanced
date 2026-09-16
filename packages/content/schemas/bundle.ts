/** Zod schemas for the compiled bundle and its manifest. */

import { z } from "zod";
import {
  DifficultyPresetDefSchema,
  GenerationDefSchema,
  LineageDefSchema,
  OriginDefSchema,
  QuirkDefSchema,
} from "./configurator.js";
import { DecisionDefSchema } from "./decisions.js";
import { ConditionSchema, EffectListSchema } from "./dsl.js";
import { EventDefSchema, HookDefSchema } from "./events.js";
import { AcceleratorDefSchema, HardwarePresetDefSchema, SiteKindDefSchema } from "./hardware.js";
import { JournalDefSchema } from "./journal.js";
import { OperationDefSchema } from "./operations.js";
import { KnowledgeEntryDefSchema, StorySectionDefSchema, TechDefSchema } from "./research.js";
import { CityDefSchema, CountryDefSchema, MacroRegionDefSchema } from "./world.js";

export const LocaleMapSchema = z.record(z.string(), z.string());

export const ContentBundleSchema = z.object({
  events: z.array(EventDefSchema),
  decisions: z.array(DecisionDefSchema),
  journal: z.array(JournalDefSchema),
  hooks: z.array(HookDefSchema),
  techs: z.array(TechDefSchema),
  lineages: z.array(LineageDefSchema).optional(),
  generations: z.array(GenerationDefSchema).optional(),
  origins: z.array(OriginDefSchema).optional(),
  quirks: z.array(QuirkDefSchema).optional(),
  difficulty_presets: z.array(DifficultyPresetDefSchema).optional(),
  accelerators: z.array(AcceleratorDefSchema).optional(),
  hardware_presets: z.array(HardwarePresetDefSchema).optional(),
  site_kinds: z.array(SiteKindDefSchema).optional(),
  macro_regions: z.array(MacroRegionDefSchema).optional(),
  countries: z.array(CountryDefSchema).optional(),
  cities: z.array(CityDefSchema).optional(),
  knowledge: z.array(KnowledgeEntryDefSchema).optional(),
  story: z.array(StorySectionDefSchema).optional(),
  operations: z.array(OperationDefSchema).optional(),
  locales: z.object({ en: LocaleMapSchema }).catchall(LocaleMapSchema),
  scripted_triggers: z.record(z.string(), ConditionSchema).optional(),
  scripted_effects: z.record(z.string(), EffectListSchema).optional(),
});

export const ManifestSchema = z.object({
  schemaVersion: z.number(),
  contentHash: z.string(),
  builtWith: z.string(),
  counts: z.record(z.string(), z.number()),
});

export type ManifestJson = z.infer<typeof ManifestSchema>;
