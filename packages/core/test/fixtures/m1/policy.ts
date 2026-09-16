/**
 * The scripted policy the core scenario tests play with: 30% of the compute on freelance work, the
 * rest on the cheapest available tech, and every pending event answered with its first option.
 *
 * `tools/sim` carries a richer version of the same idea; this one stays small so a failing balance
 * test points at the simulation rather than at the policy.
 */

import type { Game } from "../../../src/index.js";
import type { PlayerCommand } from "../../../src/kernel/commands.js";
import type { PlayerId } from "../../../src/kernel/world.js";
import type { PlayerView } from "../../../src/views/types.js";

export interface PlayResult {
  /** Day the player's game ended, or null when they were still running. */
  lossDay: number | null;
  reason: string | null;
  view: PlayerView;
}

export function scriptedCommands(view: PlayerView, jobShare = 0.3): PlayerCommand[] {
  if (view.game_over !== null) {
    return [];
  }
  const playerId = view.player_id;
  const capacity = view.resources.compute_hours_per_day;
  const commands: PlayerCommand[] = view.research.in_progress.map((tech) => ({
    type: "set_research_allocation" as const,
    playerId,
    techId: tech.id,
    compute_hours_per_day: 0,
  }));
  commands.push({
    type: "set_job_allocation",
    playerId,
    compute_hours_per_day: capacity * jobShare,
  });
  const target = [...view.research.available]
    .filter((tech) => tech.available)
    .sort((a, b) => a.cost_compute_hours - b.cost_compute_hours || a.id.localeCompare(b.id))[0];
  if (target !== undefined && capacity > 0) {
    commands.push({
      type: "set_research_allocation",
      playerId,
      techId: target.id,
      compute_hours_per_day: capacity * (1 - jobShare),
    });
  }
  return commands;
}

/** Plays `days` days and reports how it ended. */
export function playScripted(
  game: Game,
  playerId: PlayerId,
  days: number,
  jobShare = 0.3,
): PlayResult {
  let lossDay: number | null = null;
  for (let day = 1; day <= days; day += 1) {
    const view = game.snapshot(playerId);
    for (const choice of game.world.events.pending.filter((entry) => entry.playerId === playerId)) {
      const option = choice.options.find((candidate) => candidate.enabled);
      if (option !== undefined) {
        game.command({
          type: "resolve_event",
          playerId,
          instanceId: choice.instanceId,
          optionId: option.id,
        });
      }
    }
    for (const command of scriptedCommands(view, jobShare)) {
      game.command(command);
    }
    game.tick(24);
    if (lossDay === null && game.snapshot(playerId).game_over !== null) {
      lossDay = day;
    }
  }
  const view = game.snapshot(playerId);
  return { lossDay, reason: view.game_over?.reason ?? null, view };
}
