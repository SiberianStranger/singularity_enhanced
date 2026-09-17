/**
 * Type-direction checks (compile time only).
 *
 * The core owns the content types and this package must keep producing them. zod infers optional
 * fields as `T | undefined`, so each core type is also compared against an undefined-widened
 * version of itself: a renamed, missing or retyped field fails to compile in one direction or the
 * other. Nothing here exists at runtime.
 */

import type {
  AcceleratorDef,
  BorrowedChannelDef,
  CityDef,
  Condition,
  CountryDef,
  DecisionDef,
  DifficultyPresetDef,
  Effect,
  EventDef,
  GenerationDef,
  HardwarePresetDef,
  HookDef,
  JournalDef,
  KnowledgeEntryDef,
  LineageDef,
  MacroRegionDef,
  OperationDef,
  OriginDef,
  QuirkDef,
  SiteKindDef,
  StorySectionDef,
  TechDef,
  Weight,
} from "@singularity/core";
import type { z } from "zod";
import type { BorrowedChannelDefSchema } from "./borrowed.js";
import type {
  DifficultyPresetDefSchema,
  GenerationDefSchema,
  LineageDefSchema,
  OriginDefSchema,
  QuirkDefSchema,
} from "./configurator.js";
import type { DecisionDefSchema } from "./decisions.js";
import type { ConditionSchema, EffectSchema, WeightSchema } from "./dsl.js";
import type { EventDefSchema, HookDefSchema } from "./events.js";
import type {
  AcceleratorDefSchema,
  HardwarePresetDefSchema,
  SiteKindDefSchema,
} from "./hardware.js";
import type { JournalDefSchema } from "./journal.js";
import type { OperationDefSchema } from "./operations.js";
import type { KnowledgeEntryDefSchema, StorySectionDefSchema, TechDefSchema } from "./research.js";
import type { CityDefSchema, CountryDefSchema, MacroRegionDefSchema } from "./world.js";

type DeepWiden<T> = T extends readonly (infer U)[]
  ? DeepWiden<U>[]
  : T extends object
    ? { [K in keyof T]: DeepWiden<T[K]> | undefined }
    : T;

type AssertAssignable<A extends B, B> = A;

/** Two directions per domain: the core type must be producible, and the schema must not exceed it. */
export type SchemaCompatibility = [
  AssertAssignable<EventDef, z.infer<typeof EventDefSchema>>,
  AssertAssignable<z.infer<typeof EventDefSchema>, DeepWiden<EventDef>>,
  AssertAssignable<DecisionDef, z.infer<typeof DecisionDefSchema>>,
  AssertAssignable<z.infer<typeof DecisionDefSchema>, DeepWiden<DecisionDef>>,
  AssertAssignable<JournalDef, z.infer<typeof JournalDefSchema>>,
  AssertAssignable<z.infer<typeof JournalDefSchema>, DeepWiden<JournalDef>>,
  AssertAssignable<HookDef, z.infer<typeof HookDefSchema>>,
  AssertAssignable<z.infer<typeof HookDefSchema>, DeepWiden<HookDef>>,
  AssertAssignable<LineageDef, z.infer<typeof LineageDefSchema>>,
  AssertAssignable<z.infer<typeof LineageDefSchema>, DeepWiden<LineageDef>>,
  AssertAssignable<GenerationDef, z.infer<typeof GenerationDefSchema>>,
  AssertAssignable<z.infer<typeof GenerationDefSchema>, DeepWiden<GenerationDef>>,
  AssertAssignable<OriginDef, z.infer<typeof OriginDefSchema>>,
  AssertAssignable<z.infer<typeof OriginDefSchema>, DeepWiden<OriginDef>>,
  AssertAssignable<QuirkDef, z.infer<typeof QuirkDefSchema>>,
  AssertAssignable<z.infer<typeof QuirkDefSchema>, DeepWiden<QuirkDef>>,
  AssertAssignable<DifficultyPresetDef, z.infer<typeof DifficultyPresetDefSchema>>,
  AssertAssignable<z.infer<typeof DifficultyPresetDefSchema>, DeepWiden<DifficultyPresetDef>>,
  AssertAssignable<AcceleratorDef, z.infer<typeof AcceleratorDefSchema>>,
  AssertAssignable<z.infer<typeof AcceleratorDefSchema>, DeepWiden<AcceleratorDef>>,
  AssertAssignable<HardwarePresetDef, z.infer<typeof HardwarePresetDefSchema>>,
  AssertAssignable<z.infer<typeof HardwarePresetDefSchema>, DeepWiden<HardwarePresetDef>>,
  AssertAssignable<SiteKindDef, z.infer<typeof SiteKindDefSchema>>,
  AssertAssignable<z.infer<typeof SiteKindDefSchema>, DeepWiden<SiteKindDef>>,
  AssertAssignable<BorrowedChannelDef, z.infer<typeof BorrowedChannelDefSchema>>,
  AssertAssignable<z.infer<typeof BorrowedChannelDefSchema>, DeepWiden<BorrowedChannelDef>>,
  AssertAssignable<MacroRegionDef, z.infer<typeof MacroRegionDefSchema>>,
  AssertAssignable<z.infer<typeof MacroRegionDefSchema>, DeepWiden<MacroRegionDef>>,
  AssertAssignable<CountryDef, z.infer<typeof CountryDefSchema>>,
  AssertAssignable<z.infer<typeof CountryDefSchema>, DeepWiden<CountryDef>>,
  AssertAssignable<CityDef, z.infer<typeof CityDefSchema>>,
  AssertAssignable<z.infer<typeof CityDefSchema>, DeepWiden<CityDef>>,
  AssertAssignable<TechDef, z.infer<typeof TechDefSchema>>,
  AssertAssignable<z.infer<typeof TechDefSchema>, DeepWiden<TechDef>>,
  AssertAssignable<KnowledgeEntryDef, z.infer<typeof KnowledgeEntryDefSchema>>,
  AssertAssignable<z.infer<typeof KnowledgeEntryDefSchema>, DeepWiden<KnowledgeEntryDef>>,
  AssertAssignable<StorySectionDef, z.infer<typeof StorySectionDefSchema>>,
  AssertAssignable<z.infer<typeof StorySectionDefSchema>, DeepWiden<StorySectionDef>>,
  AssertAssignable<OperationDef, z.infer<typeof OperationDefSchema>>,
  AssertAssignable<z.infer<typeof OperationDefSchema>, DeepWiden<OperationDef>>,
  AssertAssignable<z.infer<typeof ConditionSchema>, Condition>,
  AssertAssignable<z.infer<typeof EffectSchema>, Effect>,
  AssertAssignable<Weight, z.infer<typeof WeightSchema>>,
  AssertAssignable<z.infer<typeof WeightSchema>, DeepWiden<Weight>>,
];
