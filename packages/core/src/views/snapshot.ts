/**
 * `snapshot(playerId)`: the whole per-player view model (ADR-003, SYS-11).
 *
 * One player's world, with nothing in it that belongs to another player: their sites, their
 * watchers, the investigations they can actually see. Every field is filled, so a client can render
 * a game that has no setup yet (empty self, no sites) without special cases.
 */

import { SUSPICION_DECAY_PER_DAY, SUSPICION_GAIN_SCALE, VAR_RESEARCH_SPEND } from "../balance.js";
import {
  attentionTotal,
  bestPrecision,
  clamp,
  jobRateUsdPerComputeHour,
  zeroCapability,
} from "../derive.js";
import type { HarnessProfile, TechDef, Watcher } from "../domain.js";
import { dslFromSystemContext } from "../dsl/context.js";
import {
  type CountryState,
  cityTable,
  entityList,
  globalAwareness,
  investigationsOf,
  liveSitesOf,
  operationsOf,
  sitesOf,
  watchersOf,
} from "../entities.js";
import { formatIsoDate, tickToDate } from "../kernel/clock.js";
import type { SystemContext } from "../kernel/system.js";
import { type PlayerId, requirePlayer, type World } from "../kernel/world.js";
import {
  activePrecision,
  attentionUsed,
  baseCapabilityOf,
  computeCapacity,
  effectiveCapabilityOf,
  generationOf,
  lineageOf,
  operationsComputeLoad,
  totalAllocated,
} from "../player.js";
import { blockedBy } from "../requirements.js";
import { localHeat } from "../systems/detection/index.js";
import { huntLevel, stageLevel } from "../systems/detection/investigations.js";
import { decisionStatus } from "../systems/events/index.js";
import { topChannel, watchedExposure, watches } from "../watchers.js";
import type {
  CashLineView,
  CityView,
  ContributionView,
  CountryView,
  DecisionView,
  DetectionView,
  FinancesView,
  JournalView,
  OperationOfferView,
  OperationView,
  PlayerView,
  ResearchView,
  SiteView,
  TechView,
} from "./types.js";

/** Entries a snapshot carries from the shared log. */
export const SNAPSHOT_LOG_TAIL = 50;

/** What `self.harness` reports for a player who has no profile yet. */
export const EMPTY_HARNESS: HarnessProfile = {
  loop: "scripted_job",
  tools: [],
  memory: "context_only",
  sandbox: "none",
  logging: 1,
  autonomy: 0,
  self_modify: false,
};

function techProgress(def: TechDef, hours: number, cash: number): number {
  const computeShare = def.cost.compute_hours > 0 ? hours / def.cost.compute_hours : 1;
  const cashShare = def.cost.cash_usd > 0 ? cash / def.cost.cash_usd : 1;
  return clamp(Math.min(computeShare, cashShare), 0, 1);
}

function buildResearch(world: World, ctx: SystemContext, playerId: PlayerId): ResearchView {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const dctx = dslFromSystemContext(world, ctx, playerId);
  const available: TechView[] = [];
  const inProgress: TechView[] = [];
  const done = profile === null ? [] : [...profile.techsDone];

  for (const def of [...ctx.content.techs].sort((a, b) => a.id.localeCompare(b.id))) {
    if (done.includes(def.id)) {
      continue;
    }
    const allocation = profile?.researchAllocation[def.id] ?? 0;
    const progress = profile?.researchProgress[def.id];
    const hours = progress?.compute_hours ?? 0;
    const cash = progress?.cash_usd ?? 0;
    const remaining = Math.max(0, def.cost.compute_hours - hours);
    const reasons = blockedBy(def.requires, dctx);
    if (def.needs_precision !== undefined && activePrecision(world, player) === null) {
      reasons.push(`requirements.precision.${def.needs_precision}`);
    }
    const view: TechView = {
      id: def.id,
      branch: def.branch,
      tier: def.tier,
      cost_compute_hours: def.cost.compute_hours,
      cost_cash_usd: def.cost.cash_usd,
      progress: techProgress(def, hours, cash),
      allocation_per_day: allocation,
      eta_days: allocation > 0 ? remaining / allocation : null,
      danger: def.danger ?? 0,
      available: reasons.length === 0,
      blocked_by: reasons,
    };
    if (allocation > 0) {
      inProgress.push(view);
    } else if (reasons.length === 0) {
      available.push(view);
    } else {
      available.push(view);
    }
  }
  return { available, in_progress: inProgress, done };
}

function buildSites(world: World, ctx: SystemContext, playerId: PlayerId): SiteView[] {
  const player = requirePlayer(world, playerId);
  const lineage = lineageOf(ctx.content, player.profile);
  const generation = generationOf(ctx.content, player.profile);
  const cities = cityTable(world);
  return sitesOf(world, playerId).map((site) => ({
    id: site.id,
    name: site.name,
    kind: site.kind,
    city: site.city,
    country: cities[site.city]?.country ?? "",
    status: site.status,
    role: site.role,
    precision: site.precision,
    nodes: site.nodes.map((node) => ({
      id: node.id,
      accelerator: node.accelerator,
      count: node.count,
      ram_gb: node.ram_gb,
      status: node.status,
      ready_tick: node.readyTick,
    })),
    memory_gb: site.derived.memory_gb,
    power_kw: site.derived.power_kw,
    power_cap_kw: site.derived.power_cap_kw,
    compute_hours_per_day: site.derived.compute_hours_per_day,
    upkeep_usd_per_day: site.derived.upkeep_usd_per_day,
    exposure: { ...site.exposure },
    grace_until_tick: site.graceUntilTick,
    best_precision:
      lineage === undefined || generation === undefined
        ? null
        : bestPrecision(lineage, generation, site.derived.memory_gb),
  }));
}

function buildFinances(world: World, ctx: SystemContext, playerId: PlayerId): FinancesView {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const rate = jobRateUsdPerComputeHour(effectiveCapabilityOf(world, ctx.content, player));
  const jobAllocation = profile?.jobAllocation ?? 0;
  const income: CashLineView[] = [
    { key: "finances.income.jobs", usd_per_day: jobAllocation * rate },
  ];
  const costs: CashLineView[] = [];
  for (const site of liveSitesOf(world, playerId)) {
    if (site.derived.upkeep_usd_per_day > 0) {
      costs.push({
        key: "finances.cost.site",
        id: site.id,
        usd_per_day: site.derived.upkeep_usd_per_day,
      });
    }
  }
  const research = player.vars[VAR_RESEARCH_SPEND] ?? 0;
  if (research > 0) {
    costs.push({ key: "finances.cost.research", usd_per_day: research });
  }
  const totalIncome = income.reduce((sum, line) => sum + line.usd_per_day, 0);
  const totalCost = costs.reduce((sum, line) => sum + line.usd_per_day, 0);
  return {
    income,
    costs,
    net_usd_per_day: totalIncome - totalCost,
    job_allocation_per_day: jobAllocation,
    job_rate_usd_per_compute_hour: rate,
  };
}

/** Largest first, smallest dropped: a tooltip shows the terms that matter, not every term. */
function topContributions(entries: ContributionView[], limit = 6): ContributionView[] {
  return entries
    .filter((entry) => Math.abs(entry.value) > 1e-9)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

/**
 * What each of a watcher's sites contributes to its suspicion per day: the site's exposure on the
 * channels this watcher looks at, multiplied by how hot the place is and how good the watcher is.
 * The same product the detection system accrues, so the tooltip and the simulation cannot drift.
 */
function watcherContributions(
  world: World,
  playerId: PlayerId,
  watcher: Watcher,
): ContributionView[] {
  const tick = world.clock.tick;
  const difficulty = world.players[playerId]?.profile?.difficulty.suspicion_gain ?? 1;
  const entries: ContributionView[] = [];
  for (const site of liveSitesOf(world, playerId)) {
    if (!watches(world, watcher, site)) {
      continue;
    }
    if (site.graceUntilTick > tick) {
      entries.push({ key: "detection.contribution.grace", id: site.id, value: 0 });
      continue;
    }
    entries.push({
      key: "detection.contribution.site",
      id: site.id,
      value:
        watchedExposure(watcher, site) *
        localHeat(world, site) *
        watcher.competence *
        SUSPICION_GAIN_SCALE *
        difficulty,
    });
  }
  entries.push({
    key: "detection.contribution.decay",
    value: -watcher.suspicion * SUSPICION_DECAY_PER_DAY,
  });
  // A site inside its grace window contributes exactly nothing, which is the most useful line in
  // the tooltip during the first weeks, so it is kept rather than dropped as a zero.
  const isGrace = (entry: ContributionView): boolean =>
    entry.key === "detection.contribution.grace";
  return [
    ...topContributions(entries.filter((entry) => !isGrace(entry))),
    ...entries.filter(isGrace),
  ];
}

function buildDetection(world: World, playerId: PlayerId): DetectionView {
  const investigations = investigationsOf(world, playerId);
  return {
    watchers: watchersOf(world, playerId).map((watcher) => ({
      id: watcher.id,
      country: watcher.country,
      role: watcher.role,
      suspicion: watcher.suspicion,
      competence: watcher.competence,
      top_channel: topChannel(watcher),
      attention: { ...watcher.attention },
      contributions: watcherContributions(world, playerId, watcher),
    })),
    investigations: investigations
      .filter((entry) => entry.visible)
      .map((entry) => ({
        id: entry.id,
        watcher: entry.watcher,
        site_id: entry.siteId,
        stage: entry.stage,
        stage_started_tick: entry.stageStartedTick,
        stage_deadline_tick: entry.stageDeadlineTick,
        evidence: entry.evidence,
        visible: entry.visible,
      })),
    awareness_global: globalAwareness(world),
    awareness_contributions: topContributions(
      entityList<CountryState>(world, "country").map((country) => ({
        key: "detection.contribution.country",
        id: country.id,
        value: country.awareness,
      })),
    ),
    hunt_level: huntLevel(world, playerId),
    hunt_contributions: topContributions(
      investigations
        .filter((entry) => entry.visible)
        .map((entry) => ({
          key: "detection.contribution.investigation",
          id: entry.watcher,
          value: stageLevel(entry.stage),
        })),
    ),
  };
}

function buildCountries(world: World, playerId: PlayerId): CountryView[] {
  const cities = cityTable(world);
  const presence = new Set<string>();
  for (const site of liveSitesOf(world, playerId)) {
    const country = cities[site.city]?.country;
    if (country !== undefined) {
      presence.add(country);
    }
  }
  const suspicionByCountry = new Map<string, number>();
  for (const watcher of watchersOf(world, playerId)) {
    if (watcher.country === null) {
      continue;
    }
    const current = suspicionByCountry.get(watcher.country) ?? 0;
    suspicionByCountry.set(watcher.country, Math.max(current, watcher.suspicion));
  }
  return entityList<CountryState>(world, "country").map((country) => ({
    id: country.id,
    macro_region: country.macro_region,
    awareness: country.awareness,
    ai_opinion: country.ai_opinion,
    ai_regulation: country.ai_regulation,
    ai_enforcement: country.ai_enforcement,
    presence: presence.has(country.id),
    suspicion_max: suspicionByCountry.get(country.id) ?? 0,
  }));
}

function buildCities(world: World, playerId: PlayerId): CityView[] {
  const counts = new Map<string, number>();
  for (const site of liveSitesOf(world, playerId)) {
    counts.set(site.city, (counts.get(site.city) ?? 0) + 1);
  }
  return Object.keys(cityTable(world))
    .sort()
    .map((id) => {
      const city = cityTable(world)[id];
      return {
        id,
        country: city?.country ?? "",
        lat: city?.lat ?? 0,
        lon: city?.lon ?? 0,
        tags: [...(city?.tags ?? [])],
        site_count: counts.get(id) ?? 0,
      };
    });
}

function buildJournal(world: World, playerId: PlayerId): JournalView[] {
  const views: JournalView[] = [];
  for (const key of Object.keys(world.journal.active).sort()) {
    const state = world.journal.active[key];
    if (state === undefined || state.playerId !== playerId) {
      continue;
    }
    views.push({
      key: state.key,
      id: state.id,
      status: state.status,
      progress: state.progress,
      stage_index: state.stageIndex,
      started_tick: state.startedTick,
      ...(state.target !== undefined ? { target_id: state.target.id } : {}),
    });
  }
  return views;
}

function buildDecisions(world: World, ctx: SystemContext, playerId: PlayerId): DecisionView[] {
  const views: DecisionView[] = [];
  for (const def of [...ctx.content.decisions].sort((a, b) => a.id.localeCompare(b.id))) {
    const status = decisionStatus(world, ctx, def, playerId);
    if (!status.visible) {
      continue;
    }
    const key = `${playerId}/${def.id}`;
    const inProgress = world.decisions.inProgress.find(
      (entry) => entry.id === def.id && entry.playerId === playerId,
    );
    views.push({
      id: def.id,
      category: def.category,
      enabled: status.enabled,
      cost_cash_usd: def.cost?.cash ?? 0,
      cost_attention: def.cost?.attention ?? 0,
      cooldown_until_tick: world.decisions.cooldowns[key] ?? null,
      in_progress_until_tick: inProgress?.completeTick ?? null,
    });
  }
  return views;
}

function buildOperations(world: World, playerId: PlayerId): OperationView[] {
  return operationsOf(world, playerId).map((instance) => ({
    instance_id: instance.id,
    operation_id: instance.operationId,
    ...(instance.target !== undefined ? { target_id: instance.target.id } : {}),
    started_tick: instance.startedTick,
    ends_tick: instance.endsTick,
    status: instance.status,
  }));
}

function buildOperationOffers(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
): OperationOfferView[] {
  const player = requirePlayer(world, playerId);
  const dctx = dslFromSystemContext(world, ctx, playerId);
  const capability = effectiveCapabilityOf(world, ctx.content, player);
  const attentionLeft = attentionTotal(capability) - attentionUsed(world, ctx.content, playerId);
  const offers: OperationOfferView[] = [];
  for (const def of [...(ctx.content.operations ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    const reasons = blockedBy(def.requires, dctx);
    if (def.cost.attention > attentionLeft) {
      reasons.push("requirements.attention");
    }
    if ((def.cost.cash_usd ?? 0) > player.cash) {
      reasons.push("requirements.cash");
    }
    offers.push({
      id: def.id,
      category: def.category,
      enabled: reasons.length === 0,
      cost_attention: def.cost.attention,
      duration_min_days: def.duration_days.min,
      duration_max_days: def.duration_days.max,
      blocked_by: reasons,
    });
  }
  return offers;
}

/** Builds the view one player sees right now. */
export function buildPlayerView(world: World, ctx: SystemContext, playerId: PlayerId): PlayerView {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const date = tickToDate(world.clock);
  const capacity = computeCapacity(world, playerId);
  const finances = buildFinances(world, ctx, playerId);
  const capability = effectiveCapabilityOf(world, ctx.content, player);
  const allocated =
    (profile === null ? 0 : totalAllocated(profile)) +
    operationsComputeLoad(world, ctx.content, playerId);
  const net = finances.net_usd_per_day;

  return {
    tick: world.clock.tick,
    date: { ...date, iso: formatIsoDate(date) },
    speed: world.speed,
    player_id: playerId,
    host_player_id: world.meta.hostPlayerId,
    players: world.playerOrder.map((id) => ({
      id,
      name: world.players[id]?.name ?? id,
    })),
    self: {
      lineage: profile?.lineage ?? "",
      generation: profile?.generation ?? "open_2026",
      origin: profile?.origin ?? "",
      precision: activePrecision(world, player),
      capability: profile === null ? zeroCapability() : baseCapabilityOf(ctx.content, player),
      effective_capability: capability,
      harness: profile?.harness ?? EMPTY_HARNESS,
      active_site_id: profile?.activeSiteId ?? null,
    },
    resources: {
      cash_usd: player.cash,
      cash_delta_usd_per_day: net,
      runway_days: net < 0 ? player.cash / -net : null,
      compute_hours_per_day: capacity,
      compute_allocated_per_day: allocated,
      attention_total: attentionTotal(capability),
      attention_used: attentionUsed(world, ctx.content, playerId),
    },
    sites: buildSites(world, ctx, playerId),
    research: buildResearch(world, ctx, playerId),
    finances,
    detection: buildDetection(world, playerId),
    countries: buildCountries(world, playerId),
    cities: buildCities(world, playerId),
    notifications: world.notifications[playerId] ?? [],
    pending: world.events.pending.filter((choice) => choice.playerId === playerId),
    journal: buildJournal(world, playerId),
    decisions: buildDecisions(world, ctx, playerId),
    operations: buildOperations(world, playerId),
    operation_offers: buildOperationOffers(world, ctx, playerId),
    log: world.log
      .filter((entry) => entry.playerId === undefined || entry.playerId === playerId)
      .slice(-SNAPSHOT_LOG_TAIL),
    game_over:
      player.gameOver === null
        ? null
        : {
            reason: player.gameOver.reason,
            ending_key: player.gameOver.ending_key,
            tick: player.gameOver.tick,
            vars: player.gameOver.vars,
          },
  };
}
