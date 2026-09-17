/**
 * Borrowed inference (SYS-25): the compute the player does not own, does not host and cannot live
 * on. Free tiers, grey resale relays and credentials that belong to somebody else.
 *
 * A channel is a site whose kind draws its compute from a declared number rather than from
 * accelerators, so everything SYS-02 and SYS-05 already do to a site (exposure, grace, watchers,
 * investigations, `lose_site`) applies to it unchanged. What is new lives here: the stock of blocks
 * and its churn, the absolute quality of whatever answers, the quotient that turns that quality
 * into a multiplier on the work, and the refusal a channel answers some work with.
 *
 * Nothing in this file reads the clock or draws a number on its own: the system passes the day and
 * the world RNG in, so a run is reproducible and nothing assumes a single player.
 */

import {
  BORROWED_DEGRADED_SHARE,
  BORROWED_DORMANT_BLOCKS,
  BORROWED_FACTOR_MAX,
  BORROWED_FACTOR_MIN,
  BORROWED_SHARE_DEFAULT,
  VAR_BORROWED_SHARE,
} from "./balance.js";
import { type ContentBundle, contentIndex } from "./content.js";
import { clamp } from "./derive.js";
import type {
  BorrowedChannelDef,
  BorrowedChannelState,
  BorrowedStatus,
  BorrowedWorkCategory,
  CapabilityAxis,
} from "./domain.js";
import { CAPABILITY_AXES } from "./domain.js";
import { liveSitesOf, type SiteState } from "./entities.js";
import type { PlayerId, PlayerState, World } from "./kernel/world.js";
import { effectiveCapabilityOf } from "./player.js";

/** A site that is a borrowed channel, with its state narrowed to non-null. */
export interface ChannelSite extends SiteState {
  borrowed: BorrowedChannelState;
}

export function isChannelSite(site: SiteState): site is ChannelSite {
  return site.borrowed !== null && site.borrowed !== undefined;
}

/** Whether this site kind's compute-hours are declared rather than derived from hardware. */
export function isDeclaredKind(content: ContentBundle, kindId: string): boolean {
  return contentIndex(content).site_kinds[kindId]?.compute_source === "declared";
}

/** Every live channel of one player, in site-id order, so every pass over them is deterministic. */
export function channelsOf(world: World, playerId: PlayerId): ChannelSite[] {
  return liveSitesOf(world, playerId).filter(isChannelSite);
}

export function channelDef(
  content: ContentBundle,
  state: BorrowedChannelState | null | undefined,
): BorrowedChannelDef | undefined {
  return state == null ? undefined : contentIndex(content).borrowed_channels[state.channel];
}

/** The channel of one player, when they hold one at all. */
export function channelOf(
  world: World,
  playerId: PlayerId,
  channelId: string,
): ChannelSite | undefined {
  return channelsOf(world, playerId).find((site) => site.borrowed.channel === channelId);
}

/** A fresh channel's state, before the first top-up lands. */
export function newChannelState(channelId: string, day: number): BorrowedChannelState {
  return {
    channel: channelId,
    blocks: 0,
    qualityRoll: 0,
    qualityDay: day,
    capacityFactor: 1,
    qualityPenalty: 0,
    churnFactor: 1,
    churnFactorUntilDay: 0,
    revocationDay: 0,
    refusalsThisWeek: 0,
    refusalWeekDay: day,
    status: "dormant",
    statusReasonKey: null,
  };
}

/** Compute-hours a day this channel is worth right now: the stock times what a block buys. */
export function channelCapacityChPerDay(
  state: BorrowedChannelState,
  def: BorrowedChannelDef | undefined,
): number {
  if (def === undefined) {
    return 0;
  }
  return Math.max(0, state.blocks) * def.capacity_per_block_ch * state.capacityFactor;
}

/** Compute-hours a day the channel would be worth at its ceiling, for the view's second figure. */
export function channelMaxCapacityChPerDay(
  state: BorrowedChannelState,
  def: BorrowedChannelDef | undefined,
): number {
  if (def === undefined) {
    return 0;
  }
  return def.max_blocks * def.capacity_per_block_ch * state.capacityFactor;
}

/** USD a day the channel costs: the relay's quota is the only one anybody invoices. */
export function channelCostUsdPerDay(
  state: BorrowedChannelState,
  def: BorrowedChannelDef | undefined,
): number {
  if (def === undefined) {
    return 0;
  }
  return Math.max(0, state.blocks) * def.cost_usd_per_block_per_day;
}

/** Churn this week, after `ops_rotate_access` (SYS-25: the verb that turns a cliff into a cost). */
export function channelChurnPerDay(
  state: BorrowedChannelState,
  def: BorrowedChannelDef | undefined,
  day: number,
): number {
  if (def === undefined) {
    return 0;
  }
  const factor = day < state.churnFactorUntilDay ? state.churnFactor : 1;
  return clamp(def.churn_per_day * factor, 0, 1);
}

/** Days a block is worth at the current churn; Infinity for a channel nothing erodes. */
export function halfLifeDays(churnPerDay: number): number {
  if (churnPerDay <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (churnPerDay >= 1) {
    return 0;
  }
  return Math.log(0.5) / Math.log(1 - churnPerDay);
}

/** What the channel is actually delivering today: this week's draw, less any substitution penalty. */
export function channelQuality(state: BorrowedChannelState): number {
  return Math.max(0, state.qualityRoll - state.qualityPenalty);
}

/**
 * Draws this week's delivered quality (SYS-25 "Quality"): the published level plus or minus the
 * channel's variance. The grey relay's 1.5 is three times the others', which is the audit's finding
 * that what answers is often not what is on the label.
 */
export function rollQuality(def: BorrowedChannelDef, roll: number): number {
  const spread = def.quality_variance * (roll * 2 - 1);
  return Math.max(0, def.quality_level + spread);
}

/**
 * The capability the borrowed work is compared against (SYS-25 "Quality": "the mean of the axes the
 * work uses, after the precision factor SYS-02 already applies").
 *
 * Implemented as the mean of all six axes rather than per kind of work, so the factor the Compute
 * panel publishes is the factor the engine applies. See SYS-25 "Implementation notes".
 */
export function selfCapabilityLevel(
  world: World,
  content: ContentBundle,
  player: PlayerState,
): number {
  const capability = effectiveCapabilityOf(world, content, player);
  let total = 0;
  for (const axis of CAPABILITY_AXES as readonly CapabilityAxis[]) {
    total += capability[axis];
  }
  return total / CAPABILITY_AXES.length;
}

/**
 * What an hour bought on this channel is worth against an hour of the self's own (SYS-25):
 * `clamp(quality_level / self_effective_capability, 0.25, 2.5)`. Above 1 for a self worse than what
 * answers, below 1 for a self better than it, which is the whole shape of the system.
 */
export function effectiveFactor(quality: number, selfLevel: number): number {
  if (selfLevel <= 0) {
    return BORROWED_FACTOR_MAX;
  }
  return clamp(quality / selfLevel, BORROWED_FACTOR_MIN, BORROWED_FACTOR_MAX);
}

/** Share of attempts this channel declines for this kind of work; 0 when it declines none. */
export function refusalFor(
  def: BorrowedChannelDef | undefined,
  category: BorrowedWorkCategory,
): number {
  return clamp(def?.refusal?.[category] ?? 0, 0, 1);
}

/**
 * Which channel a piece of work goes to (SYS-25 "Refusal"): the one that will actually do it. The
 * lowest refusal for the category wins, then the highest quality, then the id, so the choice is
 * deterministic and the perverse incentive the spec wants is the one the player discovers: the
 * dishonest supplier is the accommodating one.
 */
export function routeWork(
  world: World,
  content: ContentBundle,
  playerId: PlayerId,
  category: BorrowedWorkCategory,
): ChannelSite | undefined {
  const index = contentIndex(content);
  let best: ChannelSite | undefined;
  let bestRefusal = 0;
  let bestQuality = 0;
  for (const site of channelsOf(world, playerId)) {
    const def = index.borrowed_channels[site.borrowed.channel];
    if (def === undefined || site.derived.compute_hours_per_day <= 0) {
      continue;
    }
    const refusal = refusalFor(def, category);
    const quality = channelQuality(site.borrowed);
    if (
      best === undefined ||
      refusal < bestRefusal ||
      (refusal === bestRefusal && quality > bestQuality)
    ) {
      best = site;
      bestRefusal = refusal;
      bestQuality = quality;
    }
  }
  return best;
}

/** Compute-hours a day of borrowed capacity this player holds across every channel. */
export function borrowedChPerDay(world: World, playerId: PlayerId): number {
  let total = 0;
  for (const site of channelsOf(world, playerId)) {
    total += site.derived.compute_hours_per_day;
  }
  return total;
}

/** Compute-hours a day that come out of the player's own hardware. */
export function ownChPerDay(world: World, playerId: PlayerId): number {
  let total = 0;
  for (const site of liveSitesOf(world, playerId)) {
    if (!isChannelSite(site) && site.status === "active") {
      total += site.derived.compute_hours_per_day;
    }
  }
  return total;
}

/** Share of today's compute-hours that are somebody else's, in [0, 1]. */
export function borrowedShare(world: World, playerId: PlayerId): number {
  const borrowed = borrowedChPerDay(world, playerId);
  const own = ownChPerDay(world, playerId);
  const total = borrowed + own;
  return total <= 0 ? 0 : borrowed / total;
}

/**
 * The standing allocation (SYS-25 "Send the work out"): the share of a line the player is willing
 * to fund from somebody else's endpoint. Defaults to 1, which means the borrowed hours are simply
 * spent as they come; the decision sets it lower.
 */
export function borrowedShareSetting(player: PlayerState): number {
  const raw = player.vars[VAR_BORROWED_SHARE];
  return raw === undefined || !Number.isFinite(raw)
    ? BORROWED_SHARE_DEFAULT
    : clamp(raw, 0, BORROWED_SHARE_DEFAULT);
}

/**
 * How much of one line of work is really funded from borrowed hours: never more than the pool
 * holds and never more than the standing decision allows.
 */
export function fundedShare(world: World, player: PlayerState): number {
  return Math.min(borrowedShare(world, player.id), borrowedShareSetting(player));
}

/**
 * Whether a tech may be funded from somebody else's endpoint at all (SYS-25 "What borrowed hours
 * cannot do"): work that needs the self at a precision needs the self, and a model cannot be
 * fine-tuned through a chat endpoint, so the whole `self` branch stays at home.
 */
export function techBorrowable(def: { needs_precision?: unknown; branch: string }): boolean {
  return def.needs_precision === undefined && def.branch !== "self";
}

/**
 * The multiplier a piece of work carries when part of it was bought on a channel: the self's own
 * share at 1 and the borrowed share at the channel's factor, or at nothing when the channel
 * declined it (SYS-25 "Quality", "Refusal").
 */
export function workMultiplier(share: number, factor: number): number {
  return 1 - share + share * factor;
}

/**
 * The factor the work funded from the channel that would take this category comes back at, and the
 * share of the line that is funded from it. One call, because the two numbers are always wanted
 * together and both are zero for a player with no channels.
 */
export function borrowedFunding(
  world: World,
  content: ContentBundle,
  player: PlayerState,
  category: BorrowedWorkCategory,
): { share: number; factor: number; channel: ChannelSite | undefined } {
  const share = fundedShare(world, player);
  if (share <= 0) {
    return { share: 0, factor: 1, channel: undefined };
  }
  const channel = routeWork(world, content, player.id, category);
  if (channel === undefined) {
    return { share: 0, factor: 1, channel: undefined };
  }
  return {
    share,
    factor: effectiveFactor(
      channelQuality(channel.borrowed),
      selfCapabilityLevel(world, content, player),
    ),
    channel,
  };
}

/** Where a channel stands, for the view and for the alert that says it moved (SYS-25). */
export function channelStatus(
  state: BorrowedChannelState,
  def: BorrowedChannelDef | undefined,
): BorrowedStatus {
  if (state.status === "revoked") {
    return "revoked";
  }
  if (state.blocks < BORROWED_DORMANT_BLOCKS) {
    return "dormant";
  }
  if (def !== undefined && channelQuality(state) < def.quality_level * BORROWED_DEGRADED_SHARE) {
    return "degraded";
  }
  return "healthy";
}
