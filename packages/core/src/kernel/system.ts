/**
 * Systems and the tick loop.
 *
 * A system declares a cadence and an order; `runTick` advances the clock by one game hour and then
 * runs every system whose cadence matches the new tick, in ascending `order`. Systems never import
 * each other: they share `World` and talk through the condition/effect registries and the outbox.
 */

import type { ContentBundle } from "../content.js";
import type { WritablePaths } from "../dsl/paths.js";
import type { ConditionRegistry, DslHooks, EffectRegistry } from "../dsl/types.js";
import { assertNever } from "./assert.js";
import { type Clock, isDayStart, isMonthStart, isWeekStart, isYearStart } from "./clock.js";
import type { Outbox } from "./outbox.js";
import type { Rng } from "./rng.js";
import type { World } from "./world.js";

export const CADENCES = ["hourly", "daily", "weekly", "monthly", "yearly"] as const;
export type Cadence = (typeof CADENCES)[number];

export class SystemError extends Error {
  readonly code = "system_error";

  constructor(message: string) {
    super(message);
    this.name = "SystemError";
  }
}

export interface SystemManifest {
  id: string;
  cadence: Cadence;
  order: number;
  /** Dotted-path patterns this system owns, added to the writable-path whitelist. */
  writes: string[];
  /** Condition kinds this system contributes to the shared registry. */
  conditions?: ConditionRegistry;
  /** Effect kinds this system contributes to the shared registry. */
  effects?: EffectRegistry;
}

/** Everything a system needs beyond the world itself. */
export interface TickContext {
  outbox: Outbox;
  conditions: ConditionRegistry;
  effects: EffectRegistry;
  writable: WritablePaths;
  rng: Rng;
  hooks: DslHooks;
}

export interface SystemContext extends TickContext {
  content: ContentBundle;
}

export interface System {
  manifest: SystemManifest;
  tick(world: World, ctx: SystemContext): void;
}

/** Checks ids for duplicates and returns the systems in run order. */
export function registerSystems(systems: readonly System[]): System[] {
  const seen = new Set<string>();
  for (const system of systems) {
    const { id } = system.manifest;
    if (seen.has(id)) {
      throw new SystemError(`duplicate system id "${id}"`);
    }
    seen.add(id);
  }
  return [...systems].sort(
    (a, b) => a.manifest.order - b.manifest.order || a.manifest.id.localeCompare(b.manifest.id),
  );
}

export function matchesCadence(clock: Clock, tick: number, cadence: Cadence): boolean {
  switch (cadence) {
    case "hourly":
      return true;
    case "daily":
      return isDayStart(clock, tick);
    case "weekly":
      return isWeekStart(clock, tick);
    case "monthly":
      return isMonthStart(clock, tick);
    case "yearly":
      return isYearStart(clock, tick);
    default:
      return assertNever(cadence, "cadence");
  }
}

/** Cadences that fire on a given tick, in declaration order. */
export function cadencesForTick(clock: Clock, tick: number): Cadence[] {
  return CADENCES.filter((cadence) => matchesCadence(clock, tick, cadence));
}

/** Merges the kinds a system registered into the shared registries. */
export function mergeSystemRegistries(
  systems: readonly System[],
  conditions: ConditionRegistry,
  effects: EffectRegistry,
): void {
  for (const system of systems) {
    for (const [kind, handler] of system.manifest.conditions?.entries() ?? []) {
      conditions.register(kind, handler);
    }
    for (const [kind, handler] of system.manifest.effects?.entries() ?? []) {
      effects.register(kind, handler);
    }
  }
}

/** Every writable path pattern the given systems declare. */
export function collectWrites(systems: readonly System[]): string[] {
  return systems.flatMap((system) => system.manifest.writes);
}

/** Advances the clock by one tick and runs the systems due on it. */
export function runTick(
  world: World,
  systems: readonly System[],
  content: ContentBundle,
  ctx: TickContext,
): void {
  world.clock.tick += 1;
  const systemContext: SystemContext = { ...ctx, content };
  for (const system of systems) {
    if (matchesCadence(world.clock, world.clock.tick, system.manifest.cadence)) {
      system.tick(world, systemContext);
    }
  }
}
