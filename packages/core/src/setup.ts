/**
 * `GameSetup`: the configurator's output and the input of a new game (SYS-04).
 *
 * The same setup plus the same seed is the same game (ADR-003). Setups are plain data so they can
 * be encoded as a shareable string by the client.
 */

import type { DifficultySliders, GenerationId, HarnessProfile } from "./domain.js";
import type { DateSpec } from "./kernel/clock.js";
import type { PlayerId } from "./kernel/world.js";

export interface PlayerSetupEntry {
  id: PlayerId;
  name: string;
  lineage: string;
  generation: GenerationId;
  origin: string;
  hardware_preset: string;
  /** Overrides on the origin's harness preset, within the origin's limits. */
  harness?: Partial<HarnessProfile>;
  /** City id from the origin's location list. */
  city: string;
  quirks?: string[];
}

export interface WorldSetup {
  difficulty_preset: string;
  /** Overrides on the preset's sliders. */
  sliders?: Partial<DifficultySliders>;
  /** Pacing personality: "slow_burn" | "classic" | "relentless". */
  storyteller?: string;
  /** Disclosed challenge modifier ids. */
  challenge_modifiers?: string[];
  npc_ai_count?: number;
  ironman?: boolean;
}

export interface GameSetup {
  seed: string;
  players: PlayerSetupEntry[];
  host_player_id?: PlayerId;
  world: WorldSetup;
  start?: DateSpec;
  debug?: boolean;
}

export const DEFAULT_DIFFICULTY_SLIDERS: DifficultySliders = {
  exposure_growth: 1,
  suspicion_gain: 1,
  npc_aggression: 1,
  event_frequency: 1,
  grace_windows: 1,
};
