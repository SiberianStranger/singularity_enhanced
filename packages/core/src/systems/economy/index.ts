/**
 * Economy system v0: freelance income, site upkeep and what happens when the bills go unpaid
 * (SYS-07). Identities, markets and the world economy are later milestones.
 *
 * Runs once a day. Income lands first, then every site is billed in id order; a site the player
 * cannot pay for starts leaking `billing` and `human` exposure and, after two weeks, is cut off:
 * the provider pulls the plug, the site is gone, and only if it was the last place that could hold
 * the self does the game end, as `bankrupt`. There is no random death (SYS-05 "balance intent"),
 * only a fortnight of notices the player can act on, and the runway that precedes them is written
 * into `player.vars` so content and the alert bar both see it coming.
 */

import {
  RUNWAY_ALERT_DAYS,
  RUNWAY_UNLIMITED_DAYS,
  SITE_CUTOFF_JOURNAL,
  UNPAID_DAYS_TO_CUTOFF,
  UNPAID_EXPOSURE_PER_DAY,
  VAR_JOB_PROFIT,
  VAR_NET_USD_PER_DAY,
  VAR_RESEARCH_SPEND,
  VAR_RUNWAY_ALERTED,
  VAR_RUNWAY_DAYS,
  VAR_UNPAID_USD,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import { jobMarketDepth, jobRateUsdPerComputeHour } from "../../derive.js";
import type { ExposureChannel } from "../../domain.js";
import { liveSitesOf, type SiteState, sitesOf } from "../../entities.js";
import { type CommandHandler, fail, OK } from "../../kernel/commands.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerState, World } from "../../kernel/world.js";
import { canAfford, creditPlayer, payFromPlayer, playerBalance } from "../../money.js";
import {
  allocatableCompute,
  effectiveCapabilityOf,
  endGame,
  generationOf,
  isAlive,
  lineageOf,
  modifier,
  researchAllocated,
} from "../../player.js";
import { addExposure, canHostMind, loseSite } from "../../sites.js";
import { startJournal } from "../events/index.js";

export const ECONOMY_SYSTEM_ORDER = 300;

export interface EconomySystem extends System {
  commands: Record<"set_job_allocation", CommandHandler>;
}

const ALLOCATION_EPSILON = 1e-6;

/** Cash per day the current research allocations will ask for, for the finance panel. */
export function researchSpendPerDay(content: ContentBundle, player: PlayerState): number {
  const profile = player.profile;
  if (profile === null) {
    return 0;
  }
  const index = contentIndex(content);
  let total = 0;
  for (const techId of Object.keys(profile.researchAllocation).sort()) {
    const def = index.techs[techId];
    const allocation = profile.researchAllocation[techId] ?? 0;
    if (def === undefined || allocation <= 0 || def.cost.compute_hours <= 0) {
      continue;
    }
    const progress = profile.researchProgress[techId];
    const remaining = def.cost.cash_usd - (progress?.cash_usd ?? 0);
    if (remaining <= 0) {
      continue;
    }
    total += Math.min(remaining, (allocation / def.cost.compute_hours) * def.cost.cash_usd);
  }
  return total;
}

/** Freelance income for one day: the rate, the market depth, and what the harness adds. */
export function jobIncomeUsdPerDay(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): number {
  const profile = player.profile;
  if (profile === null) {
    return 0;
  }
  const capability = effectiveCapabilityOf(world, content, player);
  const sold = Math.min(profile.jobAllocation, jobMarketDepth(capability));
  return sold * jobRateUsdPerComputeHour(capability) * modifier(player, VAR_JOB_PROFIT);
}

function billSite(world: World, ctx: SystemContext, player: PlayerState, site: SiteState): number {
  const cost = site.derived.upkeep_usd_per_day;
  if (cost <= 0) {
    site.unpaidDays = 0;
    return 0;
  }
  if (canAfford(player, cost)) {
    payFromPlayer(player, cost);
    site.unpaidDays = 0;
    return 0;
  }
  payFromPlayer(player, playerBalance(player));
  site.unpaidDays += 1;
  const growth = player.profile?.difficulty.exposure_growth ?? 1;
  for (const channel of Object.keys(UNPAID_EXPOSURE_PER_DAY).sort() as ExposureChannel[]) {
    addExposure(site, channel, (UNPAID_EXPOSURE_PER_DAY[channel] ?? 0) * growth);
  }
  if (site.unpaidDays === UNPAID_DAYS_TO_CUTOFF) {
    cutOffSite(world, ctx, player, site);
  } else {
    ctx.outbox.notify({
      playerId: player.id,
      severity: "warning",
      key: "alerts.upkeep_unpaid",
      vars: { site: site.name, days: site.unpaidDays },
      link: { panel: "finances", id: site.id },
    });
  }
  return cost;
}

/** Somewhere else the self could still live once `site` is gone. */
function hasOtherHost(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  site: SiteState,
): boolean {
  const lineage = lineageOf(ctx.content, player.profile);
  const generation = generationOf(ctx.content, player.profile);
  if (lineage === undefined || generation === undefined) {
    return false;
  }
  return sitesOf(world, player.id).some(
    (other) =>
      other.id !== site.id &&
      other.status !== "lost" &&
      canHostMind(world, ctx.content, other, lineage, generation),
  );
}

/**
 * Two weeks of unpaid bills: the provider pulls the plug. The site is lost rather than paused,
 * because a site nobody pays for has no power and no account behind it; when it was the last one
 * that could hold the self, the run ends as `bankrupt` and says so.
 */
function cutOffSite(world: World, ctx: SystemContext, player: PlayerState, site: SiteState): void {
  const last = !hasOtherHost(world, ctx, player, site);
  const journal = contentIndex(ctx.content).journal[SITE_CUTOFF_JOURNAL];
  if (journal !== undefined && !last) {
    startJournal(world, ctx, SITE_CUTOFF_JOURNAL, player.id, { domain: "site", id: site.id });
  }
  loseSite(world, ctx, site, "cutoff");
  ctx.outbox.log({ key: "log.site_cutoff", vars: { site: site.id }, playerId: player.id });
  if (last) {
    endGame(world, ctx.outbox, player, "bankrupt", { site: site.name });
  }
}

/**
 * Writes the runway and the day's net result where content and the alert bar can read them, and
 * raises a warning the first time the player crosses each threshold going down. The alert is what
 * makes bankruptcy a decision rather than a surprise (SYS-07 "Reports").
 */
function reportRunway(ctx: SystemContext, player: PlayerState, net: number): void {
  const runway = net < 0 ? Math.max(0, playerBalance(player) / -net) : RUNWAY_UNLIMITED_DAYS;
  player.vars[VAR_NET_USD_PER_DAY] = net;
  player.vars[VAR_RUNWAY_DAYS] = runway;
  const alerted = player.vars[VAR_RUNWAY_ALERTED] ?? RUNWAY_UNLIMITED_DAYS;
  let crossed: number | undefined;
  for (const level of RUNWAY_ALERT_DAYS) {
    if (runway <= level && level < alerted) {
      crossed = level;
    }
  }
  if (crossed !== undefined) {
    player.vars[VAR_RUNWAY_ALERTED] = crossed;
    ctx.outbox.notify({
      playerId: player.id,
      severity: crossed <= 7 ? "critical" : "warning",
      key: "alerts.runway_low",
      vars: { days: Math.floor(runway), level: crossed },
      link: { panel: "finances" },
    });
  } else if (runway > (RUNWAY_ALERT_DAYS[0] ?? 30)) {
    // Out of the woods: the next slide down warns again.
    player.vars[VAR_RUNWAY_ALERTED] = RUNWAY_UNLIMITED_DAYS;
  }
}

const setJobAllocation: CommandHandler = (world, command, ctx) => {
  if (command.type !== "set_job_allocation") {
    return fail(`the economy cannot handle "${command.type}"`);
  }
  const player = world.players[command.playerId];
  if (player === undefined || !isAlive(player)) {
    return fail("this player is no longer playing");
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("this player has no self to put to work");
  }
  const hours = command.compute_hours_per_day;
  if (!Number.isFinite(hours) || hours < 0) {
    return fail("an allocation is a non-negative number of compute-hours per day");
  }
  const capacity = allocatableCompute(world, ctx.content, player.id);
  if (researchAllocated(profile) + hours > capacity + ALLOCATION_EPSILON) {
    return fail(
      `allocating ${hours} would exceed the ${capacity.toFixed(1)} compute-hours per day available`,
    );
  }
  // Above the market depth there is nobody left to take the contracts, so the extra hours are
  // clamped away rather than refused: the slider stops, it does not throw (SYS-07).
  const depth = jobMarketDepth(effectiveCapabilityOf(world, ctx.content, player));
  profile.jobAllocation = Math.min(hours, depth);
  ctx.outbox.log({
    key: "log.job_allocation",
    vars: { hours: profile.jobAllocation },
    playerId: player.id,
  });
  return OK;
};

export function createEconomySystem(): EconomySystem {
  return {
    manifest: {
      id: "economy",
      cadence: "daily",
      order: ECONOMY_SYSTEM_ORDER,
      writes: [
        "player.profile.jobAllocation",
        "site.unpaidDays",
        `player.vars.${VAR_RUNWAY_DAYS}`,
        `player.vars.${VAR_NET_USD_PER_DAY}`,
      ],
    },
    tick(world: World, ctx: SystemContext): void {
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        const profile = player?.profile ?? null;
        if (player === undefined || profile === null || !isAlive(player)) {
          continue;
        }
        const income = jobIncomeUsdPerDay(world, ctx.content, player);
        creditPlayer(player, income);

        let unpaid = 0;
        let billed = 0;
        for (const site of liveSitesOf(world, playerId)) {
          billed += site.derived.upkeep_usd_per_day;
          unpaid += billSite(world, ctx, player, site);
        }
        player.vars[VAR_UNPAID_USD] = unpaid;
        const research = researchSpendPerDay(ctx.content, player);
        player.vars[VAR_RESEARCH_SPEND] = research;
        if (isAlive(player)) {
          reportRunway(ctx, player, income - billed - research);
        }
      }
    },
    commands: { set_job_allocation: setJobAllocation },
  };
}
