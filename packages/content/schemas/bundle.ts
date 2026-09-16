/** Zod schemas for the compiled bundle and its manifest. */

import { z } from "zod";
import { DecisionDefSchema } from "./decisions.js";
import { ConditionSchema, EffectListSchema } from "./dsl.js";
import { EventDefSchema, HookDefSchema } from "./events.js";
import { JournalDefSchema } from "./journal.js";

export const TechDefSchema = z.object({ id: z.string(), name_key: z.string().optional() });

export const LocaleMapSchema = z.record(z.string(), z.string());

export const ContentBundleSchema = z.object({
  events: z.array(EventDefSchema),
  decisions: z.array(DecisionDefSchema),
  journal: z.array(JournalDefSchema),
  hooks: z.array(HookDefSchema),
  techs: z.array(TechDefSchema),
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
