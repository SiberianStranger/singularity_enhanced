/**
 * The curated start presets the configurator's first step offers (SYS-04 "Configurator v0.4";
 * playtest 7, Y6).
 *
 * A preset is content (`packages/content/data/presets/presets.yaml`), validated against the rest
 * of the bundle by the content build. It is read from the raw bundle here rather than through
 * `ContentBundle`, because the engine has no use for it: nothing in the core ever sees a preset,
 * the client turns one into an ordinary draft and the game starts from the same `GameSetup` the
 * Summary step builds. That is also why a preset carries no numbers of its own; the challenge
 * rating beside it is computed by `rating.ts` from the draft it produces.
 *
 * The city is the one field with a rule behind it: a preset names one only when it wants a city
 * other than its origin's default, and none of the eight shipped presets does, so the city comes
 * from `origins.yaml` at run time and a balance pass that moves an origin's default city moves the
 * preset with it (SYS-04 v0.3 rule L).
 */

import raw from "@content/bundle";
import type { GenerationId, HarnessProfile } from "@singularity/core";
import { originById } from "./catalog.js";

/** Pacing personality; the same three ids `WorldSetup.storyteller` takes. */
export type PresetStoryteller = "slow_burn" | "classic" | "relentless";

export interface StartPreset {
  id: string;
  name_key: string;
  /** One paragraph in the model's voice. */
  story_key: string;
  /** The "for a player who ..." line. */
  for_key: string;
  origin: string;
  generation: GenerationId;
  lineage: string;
  hardware: string;
  /** Only when the preset wants a city other than the origin's default. */
  city?: string;
  /** Dial positions the preset recommends, for the dials the origin has not fixed. */
  harness?: Partial<HarnessProfile>;
  quirks: readonly string[];
  world: {
    difficulty: string;
    storyteller: PresetStoryteller;
    modifiers: readonly string[];
    ironman: boolean;
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function list(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** Narrows one record of the `presets` domain; a field the schema requires is present by then. */
function toPreset(value: unknown): StartPreset | null {
  const source = record(value);
  const id = text(source.id);
  if (id === "") {
    return null;
  }
  const world = record(source.world);
  const harness = record(source.harness);
  const city = text(source.city);
  return {
    id,
    name_key: text(source.name_key, `presets.${id}.name`),
    story_key: text(source.story_key, `presets.${id}.story`),
    for_key: text(source.for_key, `presets.${id}.for`),
    origin: text(source.origin),
    generation: text(source.generation, "open_2026") as GenerationId,
    lineage: text(source.lineage),
    hardware: text(source.hardware),
    ...(city === "" ? {} : { city }),
    ...(Object.keys(harness).length === 0 ? {} : { harness: harness as Partial<HarnessProfile> }),
    quirks: list(source.quirks),
    world: {
      difficulty: text(world.difficulty, "normal"),
      storyteller: text(world.storyteller, "classic") as PresetStoryteller,
      modifiers: list(world.modifiers),
      ironman: world.ironman === true,
    },
  };
}

/** The presets the bundle carries, in the order content wrote them: easiest first. */
export const startPresets: readonly StartPreset[] = Array.isArray(record(raw).presets)
  ? (record(raw).presets as unknown[])
      .map(toPreset)
      .filter((preset): preset is StartPreset => preset !== null)
  : [];

export const presetById: ReadonlyMap<string, StartPreset> = new Map(
  startPresets.map((preset) => [preset.id, preset]),
);

/**
 * The city a preset starts in: its own when it names one, and otherwise the origin's default,
 * which is the first entry of `locations` (SYS-04 v0.3 rule L).
 */
export function presetCity(preset: StartPreset): string {
  return preset.city ?? originById.get(preset.origin)?.locations[0] ?? "";
}

/**
 * The harness a preset asks for: the origin's own profile with the dials the preset moves.
 *
 * It is also what the Harness step marks as recommended, so a dial the preset does not name is
 * recommended at the position the origin left it, and there is always a position to mark.
 */
export function presetHarness(preset: StartPreset): HarnessProfile | undefined {
  const origin = originById.get(preset.origin);
  if (origin === undefined) {
    return undefined;
  }
  return {
    ...origin.harness,
    tools: [...origin.harness.tools],
    ...(preset.harness ?? {}),
  };
}
