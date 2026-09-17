/**
 * Borrowed inference system (SYS-25): channels, churn, quality and refusal.
 *
 * Runs once a day, after the compute system has derived the sites and before research, the economy
 * and detection read them. Each day it redraws a channel's delivered quality once a week, erodes
 * the stock of blocks by the channel's churn, charges the exposure every held block leaks, and
 * publishes where each channel stands. What it deliberately does not do is host anything: a channel
 * is an endpoint that answers questions, and the rules that keep the self out of it are the site
 * kind's `can_host_active_mind` and the role refusal in the compute system.
 *
 * The verbs that add capacity are operations (SYS-17) and the things that take it away are events
 * (SYS-10); both reach this system through the `borrowed` effect kind, so nothing here is hard
 * coded to one channel.
 */

import {
  BORROWED_DORMANT_BLOCKS,
  BORROWED_QUALITY_DAYS,
  BORROWED_REFUSAL_PATTERN_COUNT,
  BORROWED_REFUSAL_PATTERN_EXPOSURE,
  BORROWED_REVOCATION_JOURNAL,
  EXPOSURE_GROWTH_VAR_PREFIX,
  VAR_BORROWED_BEHAVIORAL,
  VAR_BORROWED_CH_PER_DAY,
  VAR_BORROWED_FACTOR,
  VAR_BORROWED_FINANCIAL,
  VAR_BORROWED_REFUSAL_PENALTY,
  VAR_BORROWED_SHARE_NOW,
  VAR_EXPOSURE_GROWTH_ALL,
  VAR_EXPOSURE_GROWTH_EARLY,
} from "../../balance.js";
import {
  borrowedChPerDay,
  borrowedFunding,
  borrowedShare,
  type ChannelSite,
  channelCapacityChPerDay,
  channelChurnPerDay,
  channelOf,
  channelQuality,
  channelStatus,
  channelsOf,
  isChannelSite,
  newChannelState,
  refusalFor,
  rollQuality,
  routeWork,
} from "../../borrowed.js";
import { contentIndex } from "../../content.js";
import { clamp } from "../../derive.js";
import type {
  BorrowedChannelDef,
  BorrowedStatus,
  BorrowedWorkCategory,
  ExposureChannel,
} from "../../domain.js";
import { compareValue, createConditionRegistry } from "../../dsl/conditions.js";
import { createEffectRegistry } from "../../dsl/effects.js";
import { asRecord, isRecord, optionalNumber, optionalString } from "../../dsl/node.js";
import type { ConditionRegistry, DslContext, EffectRegistry } from "../../dsl/types.js";
import { liveSitesOf, type SiteState } from "../../entities.js";
import { gameDay } from "../../kernel/clock.js";
import type { System, SystemContext } from "../../kernel/system.js";
import type { PlayerId, PlayerState, World } from "../../kernel/world.js";
import { activeSiteOf, isAlive, modifier, timedModifier } from "../../player.js";
import { addExposure, createSite, deriveSite } from "../../sites.js";
import { startJournal } from "../events/index.js";

/** After the compute system has derived the day's sites and before research spends them. */
export const BORROWED_SYSTEM_ORDER = 150;

/**
 * Where a channel is filed: the city the mind runs in, else the first place the player still has.
 * A channel has no address of its own, so it is watched by whoever watches the player, which is
 * what "no `human`, no `telemetry`, no machine" in SYS-25 means in practice.
 */
function channelCity(world: World, player: PlayerState): string | undefined {
  const active = activeSiteOf(world, player);
  if (active !== undefined) {
    return active.city;
  }
  return liveSitesOf(world, player.id).find((site) => !isChannelSite(site))?.city;
}

/**
 * The channel, opening it if this player does not hold it yet. Returns undefined when the content
 * does not define it or when the player has nowhere at all to be.
 */
export function ensureChannel(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
  channelId: string,
): ChannelSite | undefined {
  const existing = channelOf(world, playerId, channelId);
  if (existing !== undefined) {
    return existing;
  }
  const player = world.players[playerId];
  const def = contentIndex(ctx.content).borrowed_channels[channelId];
  if (player === undefined || def === undefined) {
    return undefined;
  }
  const city = channelCity(world, player);
  if (city === undefined) {
    return undefined;
  }
  const day = gameDay(world.clock);
  const state = newChannelState(def.id, day);
  // What this week's endpoint is actually serving, drawn the moment the channel opens rather than
  // on the next daily tick, so a channel is never read as degraded for the day it was opened.
  state.qualityRoll = rollQuality(def, ctx.rng.next());
  const site = createSite(world, ctx.content, {
    owner: playerId,
    kind: def.site_kind,
    city,
    name: def.id,
    nodes: [],
    readyTick: world.clock.tick,
    role: "none",
    graceFactor: player.profile?.difficulty.grace_windows ?? 1,
    identity: null,
    borrowed: state,
  });
  ctx.outbox.log({
    key: "log.borrowed_opened",
    vars: { channel: def.id, site: site.id },
    playerId,
  });
  return isChannelSite(site) ? site : undefined;
}

/** Adds (or removes) capacity, keeping the stock inside the channel's ceiling. */
export function addBlocks(site: ChannelSite, def: BorrowedChannelDef, delta: number): number {
  const before = site.borrowed.blocks;
  site.borrowed.blocks = clamp(before + delta, 0, def.max_blocks);
  return site.borrowed.blocks - before;
}

/** Every exposure multiplier that applies to what a channel leaks, per channel of exposure. */
function exposureFactor(world: World, player: PlayerState, channel: ExposureChannel): number {
  const growth = player.profile?.difficulty.exposure_growth ?? 1;
  const everywhere =
    modifier(player, VAR_EXPOSURE_GROWTH_ALL) *
    timedModifier(world, player, VAR_EXPOSURE_GROWTH_EARLY);
  const perChannel = modifier(player, `${EXPOSURE_GROWTH_VAR_PREFIX}${channel}`);
  // What the self does about its own prompts is a countermeasure on this system alone
  // (SYS-25 `prompt_hygiene`), so it sits next to the general ones rather than inside them.
  const hygiene = channel === "behavioral" ? modifier(player, VAR_BORROWED_BEHAVIORAL) : 1;
  // What a payment trail to one counterparty costs ("Pay the relay in advance"), on this system
  // alone, for the same reason.
  const trail = channel === "financial" ? modifier(player, VAR_BORROWED_FINANCIAL) : 1;
  return growth * everywhere * perChannel * hygiene * trail;
}

/** What a day of holding this channel leaks, per block, on every channel it touches (SYS-25). */
function accrueChannelExposure(
  world: World,
  player: PlayerState,
  site: ChannelSite,
  def: BorrowedChannelDef,
): void {
  const blocks = Math.max(0, site.borrowed.blocks);
  if (blocks <= 0) {
    return;
  }
  for (const channel of Object.keys(def.exposure_per_block).sort() as ExposureChannel[]) {
    const rate = def.exposure_per_block[channel] ?? 0;
    if (rate === 0) {
      continue;
    }
    addExposure(site, channel, rate * blocks * exposureFactor(world, player, channel));
  }
}

/**
 * The abuse-detection pattern (SYS-25 "Refusal"): past three refusals in one week the provider's
 * own tooling is looking at exactly this account, and that is a `behavioral` signal.
 */
function accrueRefusalPattern(world: World, player: PlayerState, site: ChannelSite): void {
  const over = site.borrowed.refusalsThisWeek - BORROWED_REFUSAL_PATTERN_COUNT;
  if (over < 0) {
    return;
  }
  const penalty = modifier(player, VAR_BORROWED_REFUSAL_PENALTY);
  addExposure(
    site,
    "behavioral",
    BORROWED_REFUSAL_PATTERN_EXPOSURE *
      (over + 1) *
      penalty *
      exposureFactor(world, player, "behavioral"),
  );
}

function notifyStatus(
  ctx: SystemContext,
  playerId: PlayerId,
  site: ChannelSite,
  from: BorrowedStatus,
  to: BorrowedStatus,
): void {
  if (from === to) {
    return;
  }
  if (to === "degraded") {
    ctx.outbox.notify({
      playerId,
      severity: "warning",
      key: "alerts.borrowed_degraded",
      vars: { channel: site.borrowed.channel },
      link: { panel: "compute", id: site.id },
    });
    return;
  }
  if (to === "dormant" && from !== "revoked") {
    ctx.outbox.notify({
      playerId,
      severity: "info",
      key: "alerts.borrowed_dormant",
      vars: { channel: site.borrowed.channel },
      link: { panel: "compute", id: site.id },
    });
  }
}

/** One channel's day: the weekly draws, the churn, what it leaks and where it now stands. */
function tickChannel(
  world: World,
  ctx: SystemContext,
  player: PlayerState,
  site: ChannelSite,
): void {
  const def = contentIndex(ctx.content).borrowed_channels[site.borrowed.channel];
  if (def === undefined) {
    return;
  }
  const state = site.borrowed;
  const day = gameDay(world.clock);
  const before = state.status;

  // A week is the unit of everything that is not the stock: what the relay is actually serving
  // this week, and how many refusals the provider's tooling has seen this week.
  if (state.qualityRoll <= 0 || day - state.qualityDay >= BORROWED_QUALITY_DAYS) {
    state.qualityRoll = rollQuality(def, ctx.rng.next());
    state.qualityDay = day;
  }
  if (day - state.refusalWeekDay >= BORROWED_QUALITY_DAYS) {
    state.refusalsThisWeek = 0;
    state.refusalWeekDay = day;
  }

  accrueRefusalPattern(world, player, site);
  state.blocks = clamp(state.blocks * (1 - channelChurnPerDay(state, def, day)), 0, def.max_blocks);
  // A tail of a tenth of a block is churn's rounding crumb, not capacity: a channel that small is
  // dormant and the operation can open it again (SYS-25 "Capacity").
  if (state.blocks < BORROWED_DORMANT_BLOCKS) {
    state.blocks = 0;
  }
  accrueChannelExposure(world, player, site, def);
  if (state.status === "revoked" && state.blocks > 0) {
    state.status = "healthy";
  }
  state.status = channelStatus(state, def);
  notifyStatus(ctx, player.id, site, before, state.status);
  deriveSite(world, ctx.content, site, undefined, undefined);
}

/**
 * Rolls one channel's refusal for a piece of work (SYS-25 "Refusal"). Returns the channel that
 * refused, or undefined when the work goes ahead. Only draws from the world RNG when the player
 * actually has a channel that could do the work, so a run with no borrowed compute is untouched.
 */
export function rollRefusal(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
  category: BorrowedWorkCategory,
): ChannelSite | undefined {
  const site = routeWork(world, ctx.content, playerId, category);
  if (site === undefined) {
    return undefined;
  }
  const def = contentIndex(ctx.content).borrowed_channels[site.borrowed.channel];
  const refusal = refusalFor(def, category);
  if (refusal <= 0) {
    return undefined;
  }
  if (ctx.rng.next() >= refusal) {
    return undefined;
  }
  site.borrowed.refusalsThisWeek += 1;
  ctx.outbox.log({
    key: "log.borrowed_refused",
    vars: { channel: site.borrowed.channel, category },
    playerId,
  });
  return site;
}

/** The channel an effect is about: the one it names, else the one bound in scope. */
function channelInScope(ctx: DslContext, explicit: string | undefined): string | undefined {
  if (explicit !== undefined) {
    return explicit;
  }
  const bound = ctx.scope.borrowed;
  if (isRecord(bound) && typeof bound.channel === "string") {
    return bound.channel;
  }
  const site = ctx.scope.site;
  if (isRecord(site) && isRecord(site.borrowed) && typeof site.borrowed.channel === "string") {
    return site.borrowed.channel;
  }
  return undefined;
}

/**
 * Everything content does to a channel, in one effect kind (ADR-002: effects are data). Blocks in
 * and out, the capacity a provider took away for good, the quality a substitution costs until the
 * player checks, the churn one week of rotation saves, and the warning that arms and is cancelled.
 */
function registerEffects(): EffectRegistry {
  const registry = createEffectRegistry();

  registry.register("borrowed", (node, ctx) => {
    const payload = asRecord(node.borrowed, "borrowed");
    const channelId = channelInScope(ctx, optionalString(payload.channel, "borrowed.channel"));
    if (channelId === undefined) {
      return;
    }
    const def = contentIndex(ctx.content).borrowed_channels[channelId];
    if (def === undefined) {
      return;
    }
    const blocks = optionalNumber(payload.blocks, "borrowed.blocks");
    const setBlocks = optionalNumber(payload.set_blocks, "borrowed.set_blocks");
    const opening = (blocks !== undefined && blocks > 0) || setBlocks !== undefined;
    const site = opening
      ? ensureChannel(ctx.world, ctx, ctx.playerId, channelId)
      : channelOf(ctx.world, ctx.playerId, channelId);
    if (site === undefined) {
      return;
    }
    const state = site.borrowed;
    if (setBlocks !== undefined) {
      state.blocks = clamp(setBlocks, 0, def.max_blocks);
    }
    if (blocks !== undefined && blocks !== 0) {
      addBlocks(site, def, blocks);
    }
    const capacity = optionalNumber(payload.capacity_factor, "borrowed.capacity_factor");
    if (capacity !== undefined && capacity > 0) {
      state.capacityFactor = clamp(state.capacityFactor * capacity, 0.1, 10);
    }
    const quality = optionalNumber(payload.quality_penalty, "borrowed.quality_penalty");
    if (quality !== undefined) {
      state.qualityPenalty = Math.max(0, state.qualityPenalty + quality);
    }
    if (payload.clear_quality_penalty === true) {
      state.qualityPenalty = 0;
    }
    const churn = optionalNumber(payload.churn_factor, "borrowed.churn_factor");
    const churnDays = optionalNumber(payload.churn_days, "borrowed.churn_days") ?? 7;
    if (churn !== undefined && churn >= 0) {
      state.churnFactor = churn;
      state.churnFactorUntilDay = gameDay(ctx.world.clock) + churnDays;
    }
    const arm = optionalNumber(payload.arm_revocation_days, "borrowed.arm_revocation_days");
    if (arm !== undefined) {
      state.revocationDay = gameDay(ctx.world.clock) + arm;
    }
    if (payload.cancel_revocation === true) {
      state.revocationDay = 0;
    }
    const reason = optionalString(payload.status_reason_key, "borrowed.status_reason_key");
    if (reason !== undefined) {
      state.statusReasonKey = reason;
    }
    if (payload.revoke === true) {
      state.blocks = 0;
      state.revocationDay = 0;
      state.status = "revoked";
      const journal = contentIndex(ctx.content).journal[BORROWED_REVOCATION_JOURNAL];
      if (journal !== undefined) {
        startJournal(ctx.world, ctx, BORROWED_REVOCATION_JOURNAL, ctx.playerId, {
          domain: "site",
          id: site.id,
        });
      }
    }
    state.status = channelStatus(state, def);
    deriveSite(ctx.world, ctx.content, site, undefined, undefined);
    ctx.outbox.log({
      key: "log.borrowed_changed",
      vars: {
        channel: channelId,
        blocks: Math.round(state.blocks * 100) / 100,
        status: state.status,
      },
      playerId: ctx.playerId,
    });
  });

  return registry;
}

/**
 * What content asks about a channel: how much of it the player holds, what it is delivering, and
 * whether a revocation warning is armed against it.
 */
function registerConditions(): ConditionRegistry {
  const registry = createConditionRegistry();

  registry.register("borrowed", (node, ctx) => {
    const payload = isRecord(node.borrowed) ? node.borrowed : {};
    const channelId = channelInScope(ctx, optionalString(payload.channel, "borrowed.channel"));
    if (channelId === undefined) {
      return false;
    }
    const site = channelOf(ctx.world, ctx.playerId, channelId);
    const merged = { ...payload, ...node };
    if (payload.armed !== undefined) {
      const armed = site !== undefined && site.borrowed.revocationDay > 0;
      return armed === (payload.armed === true);
    }
    const metric = optionalString(payload.metric, "borrowed.metric") ?? "blocks";
    const state = site?.borrowed;
    const def = contentIndex(ctx.content).borrowed_channels[channelId];
    const value =
      state === undefined
        ? 0
        : metric === "quality"
          ? channelQuality(state)
          : metric === "capacity"
            ? channelCapacityChPerDay(state, def)
            : state.blocks;
    return compareValue(value, merged, "borrowed");
  });

  return registry;
}

/**
 * The three figures the Compute panel shows, written where content can trigger on them (SYS-25
 * "View fields"). A player with no channel publishes zeroes rather than nothing, so a condition
 * reads a number either way.
 */
function publish(world: World, ctx: SystemContext, player: PlayerState): void {
  player.vars[VAR_BORROWED_CH_PER_DAY] = borrowedChPerDay(world, player.id);
  player.vars[VAR_BORROWED_SHARE_NOW] = borrowedShare(world, player.id);
  player.vars[VAR_BORROWED_FACTOR] = borrowedFunding(world, ctx.content, player, "research").factor;
}

/** The channel sites of a player whose numbers the day has to refresh, in id order. */
function playerChannels(world: World, playerId: PlayerId): ChannelSite[] {
  return channelsOf(world, playerId);
}

export function createBorrowedSystem(): System {
  return {
    manifest: {
      id: "borrowed",
      cadence: "daily",
      order: BORROWED_SYSTEM_ORDER,
      conditions: registerConditions(),
      effects: registerEffects(),
      writes: [
        "site.borrowed.*",
        "site.derived.*",
        "site.exposure.*",
        `player.vars.${VAR_BORROWED_CH_PER_DAY}`,
        `player.vars.${VAR_BORROWED_FACTOR}`,
        `player.vars.${VAR_BORROWED_SHARE_NOW}`,
      ],
    },
    tick(world: World, ctx: SystemContext): void {
      for (const playerId of world.playerOrder) {
        const player = world.players[playerId];
        if (player === undefined || !isAlive(player)) {
          continue;
        }
        for (const site of playerChannels(world, playerId)) {
          tickChannel(world, ctx, player, site);
        }
        publish(world, ctx, player);
      }
    },
  };
}

/** Whether a site is a channel, for the systems that must not treat one as a place to live. */
export function isBorrowedSite(site: SiteState): boolean {
  return isChannelSite(site);
}
