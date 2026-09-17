/**
 * Player-level lookups shared by the M1 systems and the views (SYS-02, SYS-03).
 *
 * Systems never import each other, but they all need the same three answers: which lineage and
 * generation this player is, where its mind runs, and how much compute it has today. Those live
 * here, next to the pure math in `derive.ts`, so there is exactly one implementation of each.
 */

import {
  CAPABILITY_BONUS_VAR_PREFIX,
  EGRESS_BLOCK_AIR_GAPPED,
  EGRESS_BLOCK_SANDBOXED,
  FOREIGN_COUNTRY_WORLD_PENALTY,
  HARNESS_LOOP_REACTION_FACTOR,
  HARNESS_MEMORY_JOURNAL_FACTOR,
  PRECISION_CAPABILITY_VAR_PREFIX,
  PRECISION_MEMORY_VAR_PREFIX,
  RESEARCH_CAPABILITY_EXPONENT,
  SANDBOX_ALLOWS_EGRESS,
  TIMED_MODIFIER_SUFFIX,
  VAR_AIR_GAPPED,
  VAR_FOREIGN_COUNTRY_PENALTY,
  VAR_GRACE_WINDOW,
  VAR_RESEARCH_EFFICIENCY,
  VAR_SANDBOX_ESCAPED,
  VAR_SELF_MODIFY,
} from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import {
  effectiveCapability,
  harnessResearchFactor,
  longHorizonCostFactor,
  precisionFactor,
  type SelfTuning,
  zeroCapability,
} from "./derive.js";
import type {
  Capability,
  CapabilityAxis,
  GenerationDef,
  HarnessTool,
  LineageDef,
  PlayerProfile,
  Precision,
} from "./domain.js";
import { CAPABILITY_AXES } from "./domain.js";
import { cityTable, liveSitesOf, operationsOf, type SiteState, siteTable } from "./entities.js";
import { gameDay } from "./kernel/clock.js";
import type { Outbox } from "./kernel/outbox.js";
import type { GameOverState, PlayerId, PlayerState, TextVar, World } from "./kernel/world.js";

/** Flag that marks a prepared low-precision copy, so int2 is not an emergency quant (SYS-03). */
export const HARDENED_COPY_FLAG = "hardened_copy";

/**
 * Whether the self may edit itself: the harness dial, or a content flag that granted it later
 * (SYS-04 v0.2: "self_modify decides whether precision and context can be changed and whether the
 * self-improvement techs are researchable"). A harness that forbids it is the sysadmin's read-only
 * deployment, and the way out is the operation or tech that sets `harness_self_modify`.
 */
export function selfModifyAllowed(player: PlayerState): boolean {
  return player.profile?.harness.self_modify === true || player.flags[VAR_SELF_MODIFY] === true;
}

/**
 * Why the self cannot reach the outside network from where it runs, as a locale key, or null when
 * it can (SYS-03 "`sandbox` limits what operations can reach the outside"). A microVM or an air gap
 * says no until content sets `sandbox_escaped`, which is exactly the early journal entry the spec
 * describes.
 *
 * The origin flag `air_gapped` is read with the dial (playtest 8, Z3). It was written on the
 * ministry and read by nothing, so the fiction said one thing and the engine another.
 */
export function egressBlock(player: PlayerState): string | null {
  if (player.flags[VAR_SANDBOX_ESCAPED] === true) {
    return null;
  }
  const sandbox = player.profile?.harness.sandbox;
  if (player.flags[VAR_AIR_GAPPED] === true || sandbox === "airgapped") {
    return EGRESS_BLOCK_AIR_GAPPED;
  }
  if (sandbox !== undefined && !SANDBOX_ALLOWS_EGRESS[sandbox]) {
    return EGRESS_BLOCK_SANDBOXED;
  }
  return null;
}

/** Whether the self can reach the outside network from where it runs. */
export function egressAllowed(player: PlayerState): boolean {
  return egressBlock(player) === null;
}

/** Whether the harness carries a tool (SYS-03 "Tools unlock operation kinds"). */
export function hasTool(player: PlayerState, tool: HarnessTool): boolean {
  return player.profile?.harness.tools.includes(tool) === true;
}

/** What the memory dial does to a journal entry's patience (SYS-04 v0.2 "journal continuity"). */
export function journalTimeoutFactor(player: PlayerState): number {
  const memory = player.profile?.harness.memory;
  return memory === undefined ? 1 : HARNESS_MEMORY_JOURNAL_FACTOR[memory];
}

/**
 * What the loop dial does to an event's grace window (SYS-04 v0.2 "reaction delay"), times whatever
 * patience the self was built with (`patient_planner` is +0.3 on `player.vars.grace_window`).
 */
export function reactionWindowFactor(player: PlayerState): number {
  const loop = player.profile?.harness.loop;
  const dial = loop === undefined ? 1 : HARNESS_LOOP_REACTION_FACTOR[loop];
  return dial * modifier(player, VAR_GRACE_WINDOW);
}

export function profileOf(world: World, playerId: PlayerId): PlayerProfile | null {
  return world.players[playerId]?.profile ?? null;
}

export function lineageOf(
  content: ContentBundle,
  profile: PlayerProfile | null,
): LineageDef | undefined {
  return profile === null ? undefined : contentIndex(content).lineages[profile.lineage];
}

export function generationOf(
  content: ContentBundle,
  profile: PlayerProfile | null,
): GenerationDef | undefined {
  return profile === null ? undefined : contentIndex(content).generations[profile.generation];
}

export function activeSiteOf(world: World, player: PlayerState): SiteState | undefined {
  const id = player.profile?.activeSiteId;
  if (id === undefined || id === null) {
    return undefined;
  }
  const site = siteTable(world)[id];
  return site?.status === "lost" ? undefined : site;
}

/** Whether a prepared quantization exists for this self (generation ships them, or a tech made one). */
export function preparedQuant(content: ContentBundle, player: PlayerState): boolean {
  if (player.flags[HARDENED_COPY_FLAG] === true) {
    return true;
  }
  return generationOf(content, player.profile)?.prepared_quants === true;
}

/** Precision the active mind is running at, or null when the player has no host. */
export function activePrecision(world: World, player: PlayerState): Precision | null {
  return activeSiteOf(world, player)?.precision ?? null;
}

/** Working context the active mind runs with, in thousands of tokens; 0 when it has no host. */
export function workingContextK(world: World, player: PlayerState): number {
  return activeSiteOf(world, player)?.contextKUsed ?? 0;
}

/**
 * Per-precision tuning of this self: what its quirks and techs changed about the memory a copy
 * needs and the capability it keeps (SYS-04 v0.2 `native_fp8`). Read wherever a precision is
 * weighed, so the site, the view and the configurator all agree.
 */
export function selfTuningOf(player: PlayerState | undefined): SelfTuning {
  if (player === undefined) {
    return { memory: () => 1, capability: () => 1 };
  }
  return {
    memory: (precision) => modifier(player, `${PRECISION_MEMORY_VAR_PREFIX}${precision}`),
    capability: (precision) => modifier(player, `${PRECISION_CAPABILITY_VAR_PREFIX}${precision}`),
  };
}

/**
 * Points added to each capability axis by everything that is not the lineage, the precision or the
 * generation: quirks, techs, events (`player.vars.capability_bonus_<axis>`), and the `world`
 * penalty for running the mind outside the country the self woke up in, which `polyglot` cancels.
 */
export function capabilityBonusOf(world: World, player: PlayerState): Partial<Capability> {
  const bonus: Partial<Capability> = {};
  for (const axis of CAPABILITY_AXES) {
    const value = player.vars[`${CAPABILITY_BONUS_VAR_PREFIX}${axis}`] ?? 0;
    if (Number.isFinite(value) && value !== 0) {
      bonus[axis as CapabilityAxis] = value;
    }
  }
  const foreign = foreignCountryPenalty(world, player);
  if (foreign !== 0) {
    bonus.world = (bonus.world ?? 0) - foreign;
  }
  return bonus;
}

/**
 * Points of `world` the self loses for acting from somewhere it does not know (SYS-03, SYS-04
 * `polyglot`). Zero while the mind runs in the country it woke up in, and zero for a self whose
 * `foreign_country_penalty` cancels it.
 */
export function foreignCountryPenalty(world: World, player: PlayerState): number {
  const home = player.profile?.homeCountry;
  if (home === undefined || home === null) {
    return 0;
  }
  const site = activeSiteOf(world, player);
  if (site === undefined) {
    return 0;
  }
  const country = cityTable(world)[site.city]?.country;
  if (country === undefined || country === home) {
    return 0;
  }
  return FOREIGN_COUNTRY_WORLD_PENALTY * modifier(player, VAR_FOREIGN_COUNTRY_PENALTY);
}

/** The capability vector the player actually acts with (SYS-03). */
export function effectiveCapabilityOf(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): Capability {
  const lineage = lineageOf(content, player.profile);
  const generation = generationOf(content, player.profile);
  if (lineage === undefined || generation === undefined) {
    return zeroCapability();
  }
  return effectiveCapability(
    lineage,
    generation,
    activePrecision(world, player),
    preparedQuant(content, player),
    capabilityBonusOf(world, player),
    selfTuningOf(player),
  );
}

/**
 * The share of the lineage's capability the self keeps at the precision it is running at, including
 * the penalty for an int2 copy nobody prepared (SYS-03). 0 when the self has nowhere to run.
 */
export function precisionFactorOf(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): number {
  const lineage = lineageOf(content, player.profile);
  const precision = activePrecision(world, player);
  if (lineage === undefined || precision === null) {
    return 0;
  }
  return precisionFactor(lineage, precision, preparedQuant(content, player), selfTuningOf(player));
}

/**
 * Share of a compute-hour spent on research that actually lands (SYS-12). A weaker self plans worse
 * and executes worse, and a research run needs both, so the loss compounds.
 */
export function researchEfficiencyOf(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): number {
  // The memory dial is the second term (SYS-04 v0.2: "memory changes research efficiency"): a self
  // that keeps nothing between calls reads the same papers twice.
  return (
    precisionFactorOf(world, content, player) ** RESEARCH_CAPABILITY_EXPONENT *
    harnessResearchFactor(player.profile?.harness) *
    // What a self that keeps its own notes is worth on top of the dial (`packrat` is +0.08).
    modifier(player, VAR_RESEARCH_EFFICIENCY)
  );
}

/** Full-precision capability of the lineage, for the "what you could be" column in the UI. */
export function baseCapabilityOf(content: ContentBundle, player: PlayerState): Capability {
  const lineage = lineageOf(content, player.profile);
  return lineage === undefined ? zeroCapability() : { ...lineage.capability };
}

/** Compute-hours per day the player can spend today: every running site added up (SYS-02). */
export function computeCapacity(world: World, playerId: PlayerId): number {
  let total = 0;
  for (const site of liveSitesOf(world, playerId)) {
    if (site.status === "active") {
      total += site.derived.compute_hours_per_day;
    }
  }
  return total;
}

/** Compute-hours per day the running operations are holding (SYS-17 costs). */
export function operationsComputeLoad(
  world: World,
  content: ContentBundle,
  playerId: PlayerId,
): number {
  const index = contentIndex(content);
  const player = world.players[playerId];
  const lineage = player === undefined ? undefined : lineageOf(content, player.profile);
  let total = 0;
  for (const instance of operationsOf(world, playerId)) {
    if (instance.status !== "running") {
      continue;
    }
    const def = index.operations[instance.operationId];
    const hours = def?.cost.compute_hours_per_day ?? 0;
    // Long-horizon work is charged the self's context cost factor for every day it runs (SYS-03).
    total += def?.long_horizon === true ? hours * longHorizonCostFactor(lineage) : hours;
  }
  return total;
}

/**
 * The same load, one line per running operation (playtest 8, Z2: "a running operation silently
 * takes its compute off the top"). The lines add up to `operationsComputeLoad`, so the compute
 * panel can print the subtraction rather than leaving the player to guess at it.
 */
export function operationComputeLines(
  world: World,
  content: ContentBundle,
  playerId: PlayerId,
): { instanceId: string; operationId: string; hours: number }[] {
  const index = contentIndex(content);
  const player = world.players[playerId];
  const lineage = player === undefined ? undefined : lineageOf(content, player.profile);
  const lines: { instanceId: string; operationId: string; hours: number }[] = [];
  for (const instance of operationsOf(world, playerId)) {
    if (instance.status !== "running") {
      continue;
    }
    const def = index.operations[instance.operationId];
    const hours = def?.cost.compute_hours_per_day ?? 0;
    lines.push({
      instanceId: instance.id,
      operationId: instance.operationId,
      hours: def?.long_horizon === true ? hours * longHorizonCostFactor(lineage) : hours,
    });
  }
  return lines;
}

/** Attention the running operations are holding; the cap comes from `agency` (SYS-03). */
export function attentionUsed(world: World, content: ContentBundle, playerId: PlayerId): number {
  const index = contentIndex(content);
  let total = 0;
  for (const instance of operationsOf(world, playerId)) {
    if (instance.status !== "running") {
      continue;
    }
    total += index.operations[instance.operationId]?.cost.attention ?? 0;
  }
  return total;
}

/** What is left for research and jobs after the operations took their share. */
export function allocatableCompute(
  world: World,
  content: ContentBundle,
  playerId: PlayerId,
): number {
  return Math.max(
    0,
    computeCapacity(world, playerId) - operationsComputeLoad(world, content, playerId),
  );
}

export function researchAllocated(profile: PlayerProfile): number {
  let total = 0;
  for (const key of Object.keys(profile.researchAllocation).sort()) {
    total += profile.researchAllocation[key] ?? 0;
  }
  return total;
}

export function totalAllocated(profile: PlayerProfile): number {
  return researchAllocated(profile) + profile.jobAllocation;
}

/**
 * Keeps allocations inside the compute the player actually has, scaling every line by the same
 * factor when the capacity shrinks (the original game's recalculation on losing a base).
 */
export function rebalanceAllocations(profile: PlayerProfile, capacity: number): boolean {
  const total = totalAllocated(profile);
  if (total <= capacity + 1e-9) {
    return false;
  }
  const factor = total > 0 ? capacity / total : 0;
  profile.jobAllocation = profile.jobAllocation * factor;
  for (const key of Object.keys(profile.researchAllocation).sort()) {
    profile.researchAllocation[key] = (profile.researchAllocation[key] ?? 0) * factor;
  }
  return true;
}

/**
 * A multiplier content builds by adding to a player variable: techs, events and quirks write
 * `+0.1` or `-0.3`, and the system that owns the number reads `1 + Σ`, never below zero. One
 * spelling for every modifier in the game (ADR-002 "effects are data").
 */
export function modifier(player: PlayerState, name: string): number {
  const delta = player.vars[name] ?? 0;
  return Number.isFinite(delta) ? Math.max(0, 1 + delta) : 1;
}

/**
 * The same multiplier with a deadline (SYS-04 v0.2 `quiet_boot`: "the first 30 days"). Content
 * writes `<name>` and `<name>_until_day`; once the world is past that day the modifier is the
 * neutral 1 again. A modifier with no deadline behaves exactly like `modifier`.
 */
export function timedModifier(world: World, player: PlayerState, name: string): number {
  const until = player.vars[`${name}${TIMED_MODIFIER_SUFFIX}`];
  if (until !== undefined && Number.isFinite(until) && gameDay(world.clock) >= until) {
    return 1;
  }
  return modifier(player, name);
}

export function isAlive(player: PlayerState): boolean {
  return player.gameOver === null;
}

/** Ends one player's game once; later reasons never overwrite the first one. */
export function endGame(
  world: World,
  outbox: Outbox,
  player: PlayerState,
  reason: string,
  vars: Record<string, TextVar> = {},
): GameOverState | undefined {
  if (player.gameOver !== null) {
    return undefined;
  }
  const state: GameOverState = {
    reason,
    ending_key: `endings.${reason}`,
    tick: world.clock.tick,
    vars,
  };
  player.gameOver = state;
  outbox.notify({
    playerId: player.id,
    severity: "critical",
    key: `endings.${reason}`,
    vars,
    link: { panel: "game_over" },
  });
  outbox.log({ key: "log.game_over", vars: { reason }, playerId: player.id });
  return state;
}
