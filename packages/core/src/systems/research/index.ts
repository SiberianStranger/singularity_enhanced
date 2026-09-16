/**
 * Research system: the tech tree and what the player spends compute on (SYS-12).
 *
 * Runs hourly: each tech with an allocation takes its share of the day's compute-hours and its
 * proportional share of the cash, respects `min_days` and `needs_precision`, and pays for itself in
 * exposure while `danger` is above zero. Completion runs the tech's effects and fires
 * `on_tech_researched`, so content can hang events off any finished research.
 */

import { RESEARCH_DANGER_EXPOSURE_PER_DAY } from "../../balance.js";
import { contentIndex } from "../../content.js";
import { precisionAtLeast } from "../../derive.js";
import type { ExposureChannel, TechDef } from "../../domain.js";
import { evaluateCondition } from "../../dsl/conditions.js";
import { dslFromSystemContext } from "../../dsl/context.js";
import { runEffects } from "../../dsl/effects.js";
import { siteTable } from "../../entities.js";
import { isDayStart, TICKS_PER_DAY } from "../../kernel/clock.js";
import { type CommandHandler, fail, OK, wrongCommand } from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerState, World } from "../../kernel/world.js";
import { payFromPlayer } from "../../money.js";
import {
  activePrecision,
  allocatableCompute,
  isAlive,
  researchAllocated,
  researchEfficiencyOf,
} from "../../player.js";
import { addExposure } from "../../sites.js";
import { fireHook } from "../events/index.js";

export const RESEARCH_SYSTEM_ORDER = 200;

export interface ResearchSystem extends System {
  commands: Record<"set_research_allocation", CommandHandler>;
}

/** Floating-point slack so a full allocation is never rejected by a rounding crumb. */
const ALLOCATION_EPSILON = 1e-6;

/** The same slack on the finish line: 144 ticks of `5 / 24` must count as 30 compute-hours. */
const PROGRESS_EPSILON = 1e-9;

export function techRequirementsMet(
  world: World,
  ctx: SystemContext,
  def: TechDef,
  playerId: string,
): boolean {
  if (def.requires === undefined) {
    return true;
  }
  return evaluateCondition(def.requires, dslFromSystemContext(world, ctx, playerId));
}

/** Whether the self runs precisely enough for this tech right now (SYS-12). */
export function precisionAllows(world: World, player: PlayerState, def: TechDef): boolean {
  if (def.needs_precision === undefined) {
    return true;
  }
  const precision = activePrecision(world, player);
  return precision !== null && precisionAtLeast(precision, def.needs_precision);
}

function completeTech(world: World, ctx: SystemContext, player: PlayerState, def: TechDef): void {
  const profile = player.profile;
  if (profile === null) {
    return;
  }
  profile.techsDone.push(def.id);
  delete profile.researchAllocation[def.id];
  delete profile.researchProgress[def.id];
  const dctx = dslFromSystemContext(world, ctx, player.id, { tech: { id: def.id } });
  runEffects(def.effects, dctx);
  // The notification carries the tech's own name and result keys, so the completion message says
  // what changed rather than printing an id (SYS-12 "result_key", playtest finding C5).
  ctx.outbox.notify({
    playerId: player.id,
    severity: "opportunity",
    key: "alerts.tech_researched",
    vars: {
      tech: def.id,
      tech_key: def.name_key,
      result_key: def.result_key ?? "",
    },
    link: { panel: "research", id: def.id },
  });
  ctx.outbox.log({
    key: "log.tech_researched",
    vars: { tech: def.id, tech_key: def.name_key, result_key: def.result_key ?? "" },
    playerId: player.id,
  });
  fireHook(world, ctx, "on_tech_researched", player.id, { bindings: { tech: { id: def.id } } });
}

function advanceTech(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  def: TechDef,
  allocation: number,
): void {
  const profile = player.profile;
  if (profile === null) {
    return;
  }
  const progress = profile.researchProgress[def.id] ?? {
    compute_hours: 0,
    cash_usd: 0,
    startedTick: world.clock.tick,
  };
  profile.researchProgress[def.id] = progress;

  // What the self actually gets done with the hours it spent: a quantized copy plans worse and
  // executes worse, and a research run needs both (SYS-03, `RESEARCH_CAPABILITY_EXPONENT`).
  const hours = (allocation / TICKS_PER_DAY) * researchEfficiencyOf(world, ctx.content, player);
  progress.compute_hours += hours;

  const cashCost = def.cost.cash_usd;
  if (cashCost > 0 && progress.cash_usd < cashCost) {
    const share = def.cost.compute_hours > 0 ? hours / def.cost.compute_hours : 1;
    const due = Math.min(cashCost * share, cashCost - progress.cash_usd);
    const paid = payFromPlayer(player, due);
    progress.cash_usd += paid;
  }

  const days = (world.clock.tick - progress.startedTick) / TICKS_PER_DAY;
  const ready =
    progress.compute_hours + PROGRESS_EPSILON >= def.cost.compute_hours &&
    progress.cash_usd + PROGRESS_EPSILON >= cashCost &&
    days + PROGRESS_EPSILON >= (def.cost.min_days ?? 0);
  if (ready) {
    completeTech(world, ctx, player, def);
  }
}

/** Dangerous research leaves traces on the site running it (SYS-05 activity exposure). */
function applyDangerExposure(world: World, player: PlayerState, danger: number): void {
  const profile = player.profile;
  if (profile === null || profile.activeSiteId === null || danger <= 0) {
    return;
  }
  const site = siteTable(world)[profile.activeSiteId];
  if (site === undefined || site.status === "lost") {
    return;
  }
  const growth = profile.difficulty.exposure_growth;
  for (const channel of Object.keys(RESEARCH_DANGER_EXPOSURE_PER_DAY).sort() as ExposureChannel[]) {
    const rate = RESEARCH_DANGER_EXPOSURE_PER_DAY[channel] ?? 0;
    addExposure(site, channel, rate * danger * growth);
  }
}

const setResearchAllocation: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_research_allocation") {
    return wrongCommand("research", command.type);
  }
  const player = world.players[command.playerId];
  if (player === undefined || !isAlive(player)) {
    return fail("errors.player.not_playing");
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("errors.player.no_self");
  }
  const def = contentIndex(ctx.content).techs[command.techId];
  if (def === undefined) {
    return fail("errors.tech.unknown", { tech: command.techId });
  }
  if (profile.techsDone.includes(def.id)) {
    return fail("errors.tech.already_done", { tech: def.id });
  }
  const hours = command.compute_hours_per_day;
  if (!Number.isFinite(hours) || hours < 0) {
    return fail("errors.allocation.not_a_number");
  }
  if (hours > 0 && !techRequirementsMet(world, ctx, def, player.id)) {
    return fail("errors.tech.locked", { tech: def.id });
  }
  const others = researchAllocated(profile) - (profile.researchAllocation[def.id] ?? 0);
  const capacity = allocatableCompute(world, ctx.content, player.id);
  if (others + profile.jobAllocation + hours > capacity + ALLOCATION_EPSILON) {
    return fail("errors.allocation.over_capacity", {
      hours: Math.round(hours * 10) / 10,
      capacity: Math.round(capacity * 10) / 10,
    });
  }
  if (hours === 0) {
    delete profile.researchAllocation[def.id];
  } else {
    profile.researchAllocation[def.id] = hours;
  }
  return OK;
};

export function createResearchSystem(): ResearchSystem {
  return {
    manifest: {
      id: "research",
      cadence: "hourly",
      order: RESEARCH_SYSTEM_ORDER,
      writes: ["player.profile.researchAllocation.*", "player.profile.jobAllocation"],
    },
    tick(world: World, ctx: SystemContext): void {
      const index = contentIndex(ctx.content);
      const dayStart = isDayStart(world.clock);
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        const profile = player?.profile ?? null;
        if (player === undefined || profile === null || !isAlive(player)) {
          continue;
        }
        for (const techId of Object.keys(profile.researchAllocation).sort()) {
          const allocation = profile.researchAllocation[techId] ?? 0;
          const def = index.techs[techId];
          if (def === undefined || profile.techsDone.includes(techId)) {
            delete profile.researchAllocation[techId];
            continue;
          }
          if (allocation <= 0) {
            continue;
          }
          if (
            !techRequirementsMet(world, ctx, def, playerId) ||
            !precisionAllows(world, player, def)
          ) {
            continue;
          }
          advanceTech(world, ctx, player, def, allocation);
          if (dayStart && profile.researchAllocation[techId] !== undefined) {
            applyDangerExposure(world, player, def.danger ?? 0);
          }
        }
      }
    },
    commands: { set_research_allocation: setResearchAllocation },
  };
}
