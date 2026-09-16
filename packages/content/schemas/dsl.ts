/**
 * Zod schemas for the scripting DSL (ADR-002).
 *
 * A node is one kind key plus its arguments, and systems register new kinds at runtime, so the
 * node schemas accept any object but validate the *shape of core kinds* precisely: a misspelled
 * `add.value` fails here, while `{ has_site_in: ... }` passes and is checked by the core's static
 * validator, which knows what every system registered.
 */

import type { Condition, Effect } from "@singularity/core";
import { z } from "zod";

const comparators = {
  eq: z.unknown().optional(),
  ne: z.unknown().optional(),
  lt: z.unknown().optional(),
  lte: z.unknown().optional(),
  gt: z.unknown().optional(),
  gte: z.unknown().optional(),
  in: z.array(z.unknown()).optional(),
};

const NodeRecord = z.record(z.string(), z.unknown());

const JsonScalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Arms = Record<string, z.ZodType>;

/** Validates a node against the arm matching its kind; unknown kinds pass through. */
function nodeSchema(arms: () => Arms, what: string): z.ZodType<Record<string, unknown>> {
  return NodeRecord.superRefine((value, ctx) => {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      ctx.addIssue({ code: "custom", message: `${what} node is empty` });
      return;
    }
    const table = arms();
    const kind = keys.find((key) => key in table);
    const arm = kind === undefined ? undefined : table[kind];
    if (arm === undefined) {
      return;
    }
    const result = arm.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
      }
    }
  });
}

let conditionArms: Arms | undefined;

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  nodeSchema(() => {
    conditionArms ??= {
      all: z.object({ all: z.array(ConditionSchema) }),
      any: z.object({ any: z.array(ConditionSchema) }),
      not: z.object({ not: ConditionSchema }),
      var: z.object({ var: z.string(), ...comparators }),
      flag: z.object({ flag: z.string(), value: z.boolean().optional() }),
      tech: z.object({ tech: z.string() }),
      chance: z.object({ chance: z.number().min(0).max(1) }),
      scope: z.object({ scope: z.record(z.string(), z.string()), cond: ConditionSchema }),
      count: z.object({
        count: z.object({ kind: z.string(), where: ConditionSchema.optional() }),
        ...comparators,
      }),
      ref: z.object({ ref: z.string() }),
    };
    return conditionArms;
  }, "condition"),
);

export const WeightModifierSchema = z.object({
  if: ConditionSchema,
  factor: z.number().optional(),
  add: z.number().optional(),
});

/**
 * `{ base, modifiers }` or a plain number (SYS-10 v0.1). Left unannotated because zod infers
 * optional fields as `T | undefined`, which `exactOptionalPropertyTypes` refuses as the core
 * `Weight`; `test/schemas.test.ts` checks that both types stay compatible.
 */
export const WeightSchema = z.union([
  z.number(),
  z.object({ base: z.number(), modifiers: z.array(WeightModifierSchema).optional() }),
]);

const FlagArgument = z.union([
  z.string(),
  z.object({ flag: z.string(), world: z.boolean().optional() }),
]);

let effectArms: Arms | undefined;

export const EffectSchema: z.ZodType<Effect> = z.lazy(() =>
  nodeSchema(() => {
    effectArms ??= {
      set: z.object({ set: z.object({ var: z.string(), value: JsonScalar }) }),
      add: z.object({ add: z.object({ var: z.string(), value: z.number() }) }),
      mul: z.object({ mul: z.object({ var: z.string(), value: z.number() }) }),
      clamp: z.object({
        clamp: z.object({
          var: z.string(),
          min: z.number().optional(),
          max: z.number().optional(),
        }),
      }),
      set_flag: z.object({ set_flag: FlagArgument }),
      clear_flag: z.object({ clear_flag: FlagArgument }),
      fire_event: z.object({
        fire_event: z.object({
          id: z.string(),
          delay_days: z.number().optional(),
          target: z.string().optional(),
        }),
      }),
      notify: z.object({
        notify: z.object({
          severity: z.enum(["info", "warning", "critical", "opportunity"]),
          key: z.string(),
          vars: z.record(z.string(), JsonScalar).optional(),
          link: z.object({ panel: z.string(), id: z.string().optional() }).optional(),
          expire_days: z.number().optional(),
        }),
      }),
      log: z.object({
        log: z.object({ key: z.string(), vars: z.record(z.string(), JsonScalar).optional() }),
      }),
      random_list: z.object({
        random_list: z.array(z.object({ weight: z.number(), effects: z.array(EffectSchema) })),
      }),
      if: z.object({
        if: z.object({
          cond: ConditionSchema,
          then: z.array(EffectSchema),
          else: z.array(EffectSchema).optional(),
        }),
      }),
      scope: z.object({
        scope: z.record(z.string(), z.string()),
        effects: z.array(EffectSchema),
      }),
      ref: z.object({ ref: z.string() }),
    };
    return effectArms;
  }, "effect"),
);

export const EffectListSchema = z.array(EffectSchema);
