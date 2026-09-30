/** Coordinates two system-owned allocations in one validated transaction. */
import { type ContentBundle, contentIndex } from "./content.js";
import type { TechDef } from "./domain.js";
import { isRecord } from "./dsl/node.js";
import { type CommandHandler, fail, OK, okWith } from "./kernel/commands.js";
import type { SystemContext } from "./kernel/system.js";
import type { PlayerState, World } from "./kernel/world.js";
import { allocatableCompute, egressBlock, isAlive } from "./player.js";

interface AllocationRules {
  marketDepth(world: World, content: ContentBundle, player: PlayerState): number;
  researchAllowed(
    world: World,
    context: SystemContext,
    definition: TechDef,
    playerId: string,
  ): boolean;
  selfModifyAllows(player: PlayerState, definition: TechDef): boolean;
}

/** Dependencies are supplied by the composition root; research and economy remain independent. */
export function createComputeAllocationHandler(rules: AllocationRules): CommandHandler {
  return (world, command, ctx) => {
    if (command.type !== "set_compute_allocations") return fail("errors.command.malformed");
    const player = world.players[command.playerId];
    if (player === undefined || !isAlive(player)) return fail("errors.player.not_playing");
    const profile = player.profile;
    if (profile === null) return fail("errors.player.no_self");
    if (
      !isRecord(command.research_ch_per_day) ||
      !Number.isFinite(command.jobs_ch_per_day) ||
      command.jobs_ch_per_day < 0
    )
      return fail("errors.allocation.not_a_number");
    const index = contentIndex(ctx.content);
    const selected: Record<string, number> = {};
    let requested = command.jobs_ch_per_day;
    for (const id of Object.keys(command.research_ch_per_day).sort()) {
      const hours = command.research_ch_per_day[id];
      if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0)
        return fail("errors.allocation.not_a_number");
      const tech = Object.hasOwn(index.techs, id) ? index.techs[id] : undefined;
      if (tech === undefined) return fail("errors.tech.unknown", { tech: id });
      if (profile.techsDone.includes(id)) return fail("errors.tech.already_done", { tech: id });
      if (!rules.researchAllowed(world, ctx, tech, player.id))
        return fail("errors.tech.locked", { tech: id });
      if (!rules.selfModifyAllows(player, tech))
        return fail("errors.tech.self_modify_locked", { tech: id });
      selected[id] = hours;
      requested += hours;
    }
    const capacity = allocatableCompute(world, ctx.content, player.id);
    if (!Number.isFinite(requested)) return fail("errors.allocation.not_a_number");
    if (requested > capacity + 1e-6)
      return fail("errors.allocation.over_capacity", { hours: requested, capacity });
    const jobs = Math.min(
      command.jobs_ch_per_day,
      Math.max(0, rules.marketDepth(world, ctx.content, player)),
    );
    // Keeping explicitly selected zero entries lets the portfolio return from zero after save/load.
    profile.researchAllocation = selected;
    profile.jobAllocation = jobs;
    // Rounded at the source to a tenth of a compute-hour, like every other allocation line, so the
    // log never prints the float remainder of a linked-slider split.
    const tenth = (value: number): number => Math.round(value * 10) / 10;
    ctx.outbox.log({
      playerId: player.id,
      key: "log.compute_allocations",
      vars: {
        research: tenth(requested - command.jobs_ch_per_day),
        jobs: tenth(jobs),
        free: tenth(Math.max(0, capacity - requested + command.jobs_ch_per_day - jobs)),
      },
    });
    return jobs + 1e-6 < command.jobs_ch_per_day
      ? okWith(egressBlock(player) ?? "notes.jobs.clamped_to_depth", {
          hours: jobs,
          asked: command.jobs_ch_per_day,
          depth: jobs,
        })
      : OK;
  };
}
