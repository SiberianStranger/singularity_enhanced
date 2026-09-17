/**
 * Zod schema for the start presets (SYS-04 "Configurator v0.4", playtest 7 finding Y6).
 *
 * A preset is a whole setup written down: the origin and everything the origin narrows, the dial
 * positions it recommends where the origin left them free, the quirks it takes and the world it
 * asks for. It carries no numbers of its own. The challenge rating printed beside it is computed
 * by the configurator from the same setup, so a preset cannot promise a difficulty the build does
 * not have, and the city is left out wherever the origin's own default is the one the preset
 * means, so a preset never pins a city content is still moving.
 *
 * Everything the record names is checked against the rest of the bundle by the content build
 * (`crossReferences` in `src/build.ts`): an unknown origin, lineage, rig, city, quirk, difficulty
 * preset or generation fails the build, as does a preset that sets a dial its own origin locks.
 */

import { z } from "zod";
import { GenerationIdSchema, HarnessProfileSchema } from "./common.js";

/** Pacing personalities (SYS-04 "three independent layers"); ids travel in `WorldSetup`. */
export const StorytellerSchema = z.enum(["slow_burn", "classic", "relentless"]);

/** The world half of a preset: the difficulty preset it starts from and what it does to it. */
export const StartPresetWorldSchema = z.object({
  /** Id of a record in `difficulty_presets`; its sliders are what the preset starts from. */
  difficulty: z.string(),
  storyteller: StorytellerSchema,
  /** Disclosed challenge modifiers, by id (SYS-04 "Three independent layers"). */
  modifiers: z.array(z.string()).optional(),
  ironman: z.boolean().optional(),
});

export const StartPresetDefSchema = z.object({
  id: z.string(),
  name_key: z.string(),
  /** One paragraph in the model's voice, 60 to 90 words. */
  story_key: z.string(),
  /** The "for a player who ..." line. */
  for_key: z.string(),
  origin: z.string(),
  generation: GenerationIdSchema,
  lineage: z.string(),
  /** Hardware preset id; it must be one the origin allows. */
  hardware: z.string(),
  /** A city other than the origin's default; absent means the origin's first location. */
  city: z.string().optional(),
  /** Dial positions the preset recommends, for the dials the origin has not fixed. */
  harness: HarnessProfileSchema.partial().optional(),
  quirks: z.array(z.string()).optional(),
  world: StartPresetWorldSchema,
});

export type StartPresetDef = z.infer<typeof StartPresetDefSchema>;
