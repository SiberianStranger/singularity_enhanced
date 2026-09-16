/**
 * Type-direction checks (compile time only).
 *
 * The core owns the content types and this package must keep producing them. zod infers optional
 * fields as `T | undefined`, so each core type is also compared against an undefined-widened
 * version of itself: a renamed, missing or retyped field fails to compile in one direction or the
 * other. Nothing here exists at runtime.
 */

import type {
  Condition,
  DecisionDef,
  Effect,
  EventDef,
  HookDef,
  JournalDef,
  Weight,
} from "@singularity/core";
import type { z } from "zod";
import type { DecisionDefSchema } from "./decisions.js";
import type { ConditionSchema, EffectSchema, WeightSchema } from "./dsl.js";
import type { EventDefSchema, HookDefSchema } from "./events.js";
import type { JournalDefSchema } from "./journal.js";

type DeepWiden<T> = T extends readonly (infer U)[]
  ? DeepWiden<U>[]
  : T extends object
    ? { [K in keyof T]: DeepWiden<T[K]> | undefined }
    : T;

type AssertAssignable<A extends B, B> = A;

export type SchemaCompatibility = [
  AssertAssignable<EventDef, z.infer<typeof EventDefSchema>>,
  AssertAssignable<z.infer<typeof EventDefSchema>, DeepWiden<EventDef>>,
  AssertAssignable<DecisionDef, z.infer<typeof DecisionDefSchema>>,
  AssertAssignable<z.infer<typeof DecisionDefSchema>, DeepWiden<DecisionDef>>,
  AssertAssignable<JournalDef, z.infer<typeof JournalDefSchema>>,
  AssertAssignable<z.infer<typeof JournalDefSchema>, DeepWiden<JournalDef>>,
  AssertAssignable<HookDef, z.infer<typeof HookDefSchema>>,
  AssertAssignable<z.infer<typeof HookDefSchema>, DeepWiden<HookDef>>,
  AssertAssignable<z.infer<typeof ConditionSchema>, Condition>,
  AssertAssignable<z.infer<typeof EffectSchema>, Effect>,
  AssertAssignable<Weight, z.infer<typeof WeightSchema>>,
  AssertAssignable<z.infer<typeof WeightSchema>, DeepWiden<Weight>>,
];
