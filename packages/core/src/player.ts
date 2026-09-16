/**
 * Player-level lookups shared by the M1 systems and the views (SYS-02, SYS-03).
 *
 * Systems never import each other, but they all need the same three answers: which lineage and
 * generation this player is, where its mind runs, and how much compute it has today. Those live
 * here, next to the pure math in `derive.ts`, so there is exactly one implementation of each.
 */

import { EMERGENCY_INT2_FACTOR, RESEARCH_CAPABILITY_EXPONENT } from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import { effectiveCapability, zeroCapability } from "./derive.js";
import type { Capability, GenerationDef, LineageDef, PlayerProfile, Precision } from "./domain.js";
import { liveSitesOf, operationsOf, type SiteState, siteTable } from "./entities.js";
import type { Outbox } from "./kernel/outbox.js";
import type { GameOverState, PlayerId, PlayerState, TextVar, World } from "./kernel/world.js";

/** Flag that marks a prepared low-precision copy, so int2 is not an emergency quant (SYS-03). */
export const HARDENED_COPY_FLAG = "hardened_copy";

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
  const emergency = precision === "int2" && !preparedQuant(content, player);
  return lineage.precision_factor[precision] * (emergency ? EMERGENCY_INT2_FACTOR : 1);
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
  return precisionFactorOf(world, content, player) ** RESEARCH_CAPABILITY_EXPONENT;
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
  let total = 0;
  for (const instance of operationsOf(world, playerId)) {
    if (instance.status !== "running") {
      continue;
    }
    total += index.operations[instance.operationId]?.cost.compute_hours_per_day ?? 0;
  }
  return total;
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
