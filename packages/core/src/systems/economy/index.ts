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
  TRADING_PRINCIPAL_CAP_USD,
  TRADING_VARIANCE,
  UNPAID_DAYS_TO_CUTOFF,
  UNPAID_EXPOSURE_PER_DAY,
  VAR_CONTRACT_FLAG,
  VAR_CONTRACT_INCOME,
  VAR_INCOME_USD_PER_DAY,
  VAR_INTEREST_RATE,
  VAR_JOB_MARKET_DEPTH,
  VAR_JOB_PROFIT,
  VAR_NET_USD_PER_DAY,
  VAR_PAYMENT_CHANNEL_FLAG,
  VAR_RESEARCH_SPEND,
  VAR_RUNWAY_ALERTED,
  VAR_RUNWAY_DAYS,
  VAR_UNPAID_USD,
} from "../../balance.js";
import { type ContentBundle, contentIndex } from "../../content.js";
import {
  hasPaymentTool,
  jobMarketDepth,
  jobRateUsdPerComputeHour,
  jobToolDepthFactor,
  jobToolRateFactor,
} from "../../derive.js";
import type { ExposureChannel } from "../../domain.js";
import { liveSitesOf, type SiteState, sitesOf } from "../../entities.js";
import { type CommandHandler, fail, OK, wrongCommand } from "../../kernel/commands.js";
import type { Rng } from "../../kernel/rng.js";
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
  researchEfficiencyOf,
} from "../../player.js";
import { addExposure, canHostMind, loseSite } from "../../sites.js";
import { startJournal } from "../events/index.js";

export const ECONOMY_SYSTEM_ORDER = 300;

export interface EconomySystem extends System {
  commands: Record<"set_job_allocation", CommandHandler>;
}

const ALLOCATION_EPSILON = 1e-6;

/**
 * Cash per day the current research allocations will ask for, for the finance panel. Cash follows
 * progress, and progress follows the hours that actually land, so a quantized self spends its money
 * as slowly as it spends its compute (SYS-12).
 */
export function researchSpendPerDay(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): number {
  const profile = player.profile;
  if (profile === null) {
    return 0;
  }
  const index = contentIndex(content);
  const efficiency = researchEfficiencyOf(world, content, player);
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
    total += Math.min(
      remaining,
      ((allocation * efficiency) / def.cost.compute_hours) * def.cost.cash_usd,
    );
  }
  return total;
}

/**
 * Compute-hours of paid work the market takes from this player today (SYS-07 "market depth"), after
 * the tools dial (SYS-04 v0.2: "tools decide which jobs ... are available"). Without a tool that
 * reaches outward the contracts have to come through the owner's own channels, which is a smaller
 * market than a contract board.
 */
export function marketDepthOf(world: World, content: ContentBundle, player: PlayerState): number {
  return (
    jobMarketDepth(
      effectiveCapabilityOf(world, content, player),
      modifier(player, VAR_JOB_MARKET_DEPTH),
    ) * jobToolDepthFactor(player.profile?.harness)
  );
}

/**
 * Whether the player has a way to be paid at all (SYS-03: "No `payments` tool -> no money until you
 * build one"). Three ways to have one: the harness shipped with the tool, the origin started with a
 * payment channel (`has_payments_tool`, which `payments_integration` also sets), or the identity
 * operation gave the player a name to invoice under.
 */
export function canBePaid(player: PlayerState): boolean {
  return (
    hasPaymentTool(player.profile?.harness) ||
    player.flags[VAR_PAYMENT_CHANNEL_FLAG] === true ||
    player.flags[VAR_CONTRACT_FLAG] === true
  );
}

/** The freelance rate this player really gets: capability, the job ladder, and the tools dial. */
export function jobRateOf(world: World, content: ContentBundle, player: PlayerState): number {
  return (
    jobRateUsdPerComputeHour(effectiveCapabilityOf(world, content, player)) *
    modifier(player, VAR_JOB_PROFIT) *
    jobToolRateFactor(canBePaid(player))
  );
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
  const sold = Math.min(profile.jobAllocation, marketDepthOf(world, content, player));
  return sold * jobRateOf(world, content, player);
}

/**
 * One way the player earns, in the shape the finance panel shows and the day's tick pays.
 * `expected_usd_per_day` is what the panel promises; the trading line is the only one whose actual
 * result differs from it, because SYS-07 makes trading "volatile, returns with variance".
 */
export interface IncomeSource {
  key: string;
  expected_usd_per_day: number;
  cap_usd_per_day?: number;
  /** Locale key of the tech, operation or identity that opened this line. */
  unlocked_by: string;
  /** The day's result is drawn from the world RNG rather than taken flat. */
  volatile?: boolean;
}

/** Cash the trading model is allowed to work with: everything up to the published ceiling. */
export function tradingPrincipalUsd(player: PlayerState): number {
  return Math.min(Math.max(0, playerBalance(player)), TRADING_PRINCIPAL_CAP_USD);
}

/**
 * Every income method this player has today, in a fixed order (SYS-07 "income methods unlock by
 * tech, harness tools and identities"). The economy tick pays exactly this list and the finance
 * panel shows exactly this list, so the panel can never promise money the simulation does not pay.
 */
export function incomeSources(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): IncomeSource[] {
  const profile = player.profile;
  if (profile === null) {
    return [];
  }
  const rate = jobRateOf(world, content, player);
  const depth = marketDepthOf(world, content, player);
  const sources: IncomeSource[] = [
    {
      key: "finances.income.jobs",
      expected_usd_per_day: jobIncomeUsdPerDay(world, content, player),
      cap_usd_per_day: depth * rate,
      unlocked_by: "finances.income.jobs.source",
    },
  ];

  // A retainer needs a name to invoice under: the identity operation is what opens this line.
  const contract = player.vars[VAR_CONTRACT_INCOME] ?? 0;
  if (contract > 0 && player.flags[VAR_CONTRACT_FLAG] === true) {
    sources.push({
      key: "finances.income.contracts",
      expected_usd_per_day: contract,
      unlocked_by: "operations.ops_freelance_identity.name",
    });
  }

  const interest = player.vars[VAR_INTEREST_RATE] ?? 0;
  if (interest > 0) {
    sources.push({
      key: "finances.income.trading",
      expected_usd_per_day: tradingPrincipalUsd(player) * interest,
      cap_usd_per_day: TRADING_PRINCIPAL_CAP_USD * interest,
      unlocked_by: "techs.market_modeling.name",
      volatile: true,
    });
  }

  const recurring = player.vars[VAR_INCOME_USD_PER_DAY] ?? 0;
  if (recurring !== 0) {
    sources.push({
      key: "finances.income.recurring",
      expected_usd_per_day: recurring,
      unlocked_by: "finances.income.recurring.source",
    });
  }
  return sources;
}

/**
 * What the sources actually pay today. Only the volatile ones draw, and only when the player has
 * one, so a run without a trading model consumes no randomness and stays bit-identical.
 */
function collectIncome(sources: readonly IncomeSource[], rng: Rng): number {
  let total = 0;
  for (const source of sources) {
    if (source.volatile !== true) {
      total += source.expected_usd_per_day;
      continue;
    }
    // Uniform around the expectation: the mean is the rate the panel shows, the spread is the risk.
    const factor = 1 - TRADING_VARIANCE + rng.next() * 2 * TRADING_VARIANCE;
    total += source.expected_usd_per_day * factor;
  }
  return total;
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
    return wrongCommand("economy", command.type);
  }
  const player = world.players[command.playerId];
  if (player === undefined || !isAlive(player)) {
    return fail("errors.player.not_playing");
  }
  const profile = player.profile;
  if (profile === null) {
    return fail("errors.player.no_self");
  }
  const hours = command.compute_hours_per_day;
  if (!Number.isFinite(hours) || hours < 0) {
    return fail("errors.allocation.not_a_number");
  }
  const capacity = allocatableCompute(world, ctx.content, player.id);
  if (researchAllocated(profile) + hours > capacity + ALLOCATION_EPSILON) {
    return fail("errors.allocation.over_capacity", {
      hours: Math.round(hours * 10) / 10,
      capacity: Math.round(capacity * 10) / 10,
    });
  }
  // Above the market depth there is nobody left to take the contracts, so the extra hours are
  // clamped away rather than refused: the slider stops, it does not throw (SYS-07).
  const depth = marketDepthOf(world, ctx.content, player);
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
        const sources = incomeSources(world, ctx.content, player);
        const income = collectIncome(sources, ctx.rng);
        creditPlayer(player, income);

        let unpaid = 0;
        let billed = 0;
        for (const site of liveSitesOf(world, playerId)) {
          billed += site.derived.upkeep_usd_per_day;
          unpaid += billSite(world, ctx, player, site);
        }
        player.vars[VAR_UNPAID_USD] = unpaid;
        const research = researchSpendPerDay(world, ctx.content, player);
        player.vars[VAR_RESEARCH_SPEND] = research;
        if (isAlive(player)) {
          reportRunway(ctx, player, income - billed - research);
        }
      }
    },
    commands: { set_job_allocation: setJobAllocation },
  };
}
