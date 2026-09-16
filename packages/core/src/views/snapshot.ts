/**
 * `snapshot(playerId)`: the whole per-player view model (ADR-003, SYS-11).
 *
 * One player's world, with nothing in it that belongs to another player: their sites, their
 * watchers, the investigations they can actually see. Every field is filled, so a client can render
 * a game that has no setup yet (empty self, no sites) without special cases.
 */

import {
  AI_ADOPTION_START,
  CLOUD_DEMAND_INDEX_START,
  GPU_PRICE_INDEX_START,
  OPERATION_SKILL_PIVOT,
  OPERATION_SKILL_SLOPE,
  RESEARCH_CAPABILITY_EXPONENT,
  SITE_INSTALL_DAYS,
  SUSPICION_DECAY_PER_DAY,
  SUSPICION_GAIN_SCALE,
  VAR_AI_ADOPTION,
  VAR_CLOUD_DEMAND_INDEX,
  VAR_COMPUTE_MULTIPLIER,
  VAR_GPU_PRICE_INDEX,
  VAR_JOB_MARKET_DEPTH,
  VAR_JOB_PROFIT,
  VAR_RESEARCH_SPEND,
} from "../balance.js";
import { contentIndex } from "../content.js";
import {
  acceleratorMarketPrice,
  attentionTotal,
  bestPrecision,
  clamp,
  cloudHourlyUsd,
  countryCashFactor,
  countryCashFactorTerms,
  countryMarketFactor,
  effectiveCapability,
  jobMarketDepth,
  jobRateUsdPerComputeHour,
  kvCacheGb,
  longHorizonMultiplier,
  maxContextK,
  NEUTRAL_PRICE_INDEXES,
  precisionFactor,
  requiredMemoryGb,
  siteCosts,
  siteMemory,
  sitePowerKw,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
  zeroCapability,
} from "../derive.js";
import type {
  AcceleratorDef,
  Exposure,
  GenerationDef,
  HarnessDialDef,
  HarnessProfile,
  LineageDef,
  NodeInstance,
  OperationDef,
  Precision,
  TechDef,
  Watcher,
} from "../domain.js";
import { EXPOSURE_CHANNELS, PRECISIONS } from "../domain.js";
import { evaluateCondition } from "../dsl/conditions.js";
import { dslFromSystemContext } from "../dsl/context.js";
import { isRecord } from "../dsl/node.js";
import type { Condition } from "../dsl/types.js";
import {
  activeIdentitiesOf,
  awarenessPresence,
  type CountryState,
  cityTable,
  countryTable,
  engineerPoolOf,
  entityList,
  globalAwareness,
  governmentOf,
  identitiesOf,
  investigationsOf,
  liveSitesOf,
  operationsOf,
  presenceCountriesOf,
  sitesOf,
  watchersOf,
} from "../entities.js";
import { sitesOfIdentity } from "../identities.js";
import { formatIsoDate, ticksToDays, tickToDate } from "../kernel/clock.js";
import type { SystemContext } from "../kernel/system.js";
import { type PlayerId, requirePlayer, type World } from "../kernel/world.js";
import {
  activePrecision,
  activeSiteOf,
  attentionUsed,
  baseCapabilityOf,
  capabilityBonusOf,
  computeCapacity,
  effectiveCapabilityOf,
  generationOf,
  lineageOf,
  modifier,
  operationsComputeLoad,
  preparedQuant,
  researchEfficiencyOf,
  selfTuningOf,
  totalAllocated,
  workingContextK,
} from "../player.js";
import { blockedBy } from "../requirements.js";
import { siteKindUnavailable } from "../sites.js";
import { localHeat } from "../systems/detection/index.js";
import {
  actorIdOf,
  huntLevel,
  huntPressure,
  stageLevel,
} from "../systems/detection/investigations.js";
import {
  incomeSources,
  jobRateOf,
  marketDepthOf,
  marketFactorTerms,
} from "../systems/economy/index.js";
import { decisionStatus } from "../systems/events/index.js";
import { countryExplain, spillIndex } from "../systems/world/explain.js";
import { splitActorId, topChannel, watchedExposure, watches } from "../watchers.js";
import { summarizeCost, summarizeEffects, summarizeWithTone } from "./effects.js";
import type {
  AcceleratorView,
  CashLineView,
  CatalogView,
  CitySiteKindView,
  CityView,
  ContributionView,
  CountryView,
  DecisionView,
  DetectionView,
  EventOptionView,
  EventView,
  FinancesView,
  HarnessDialView,
  IdentityView,
  IncomeSourceView,
  JournalView,
  OperationOfferView,
  OperationView,
  PlayerView,
  PrecisionOptionView,
  QuirkView,
  ResearchView,
  SiteKindView,
  SiteView,
  TechStatus,
  TechView,
  WorldView,
} from "./types.js";

export { summarizeCost, summarizeEffects, summarizeWithTone } from "./effects.js";

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

/** Every tech id a condition tree names, so the tree can be read as a prerequisite list. */
function techIdsIn(condition: Condition | undefined, depth = 0, out: string[] = []): string[] {
  if (condition === undefined || depth > 6) {
    return out;
  }
  if (typeof condition.tech === "string" && !out.includes(condition.tech)) {
    out.push(condition.tech);
  }
  for (const branch of [condition.all, condition.any]) {
    if (Array.isArray(branch)) {
      for (const child of branch) {
        if (isRecord(child)) {
          techIdsIn(child, depth + 1, out);
        }
      }
    }
  }
  if (isRecord(condition.not)) {
    techIdsIn(condition.not, depth + 1, out);
  }
  return out;
}

/**
 * What each tech opens up: the techs that name it as a prerequisite and the operations that need
 * it. Built once per snapshot, because SYS-12's Knowledge panel shows it on every row and the
 * answer is the same for every player.
 */
function unlockTable(ctx: SystemContext): Record<string, string[]> {
  const table: Record<string, string[]> = {};
  const push = (techId: string, unlocked: string): void => {
    const list = table[techId] ?? [];
    if (!list.includes(unlocked)) {
      list.push(unlocked);
    }
    table[techId] = list;
  };
  for (const def of ctx.content.techs) {
    for (const required of techIdsIn(def.requires)) {
      push(required, def.id);
    }
  }
  for (const def of ctx.content.operations ?? []) {
    for (const required of techIdsIn(def.requires)) {
      push(required, def.id);
    }
  }
  for (const list of Object.values(table)) {
    list.sort();
  }
  return table;
}

function buildResearch(world: World, ctx: SystemContext, playerId: PlayerId): ResearchView {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const dctx = dslFromSystemContext(world, ctx, playerId);
  const unlocks = unlockTable(ctx);
  // The estimate uses the hours that actually land, not the hours allocated (SYS-12).
  const efficiency = researchEfficiencyOf(world, ctx.content, player);
  const available: TechView[] = [];
  const inProgress: TechView[] = [];
  const techs: TechView[] = [];
  const done = profile === null ? [] : [...profile.techsDone];

  for (const def of [...ctx.content.techs].sort((a, b) => a.id.localeCompare(b.id))) {
    const allocation = profile?.researchAllocation[def.id] ?? 0;
    const progress = profile?.researchProgress[def.id];
    const hours = progress?.compute_hours ?? 0;
    const cash = progress?.cash_usd ?? 0;
    const remaining = Math.max(0, def.cost.compute_hours - hours);
    const finished = done.includes(def.id);
    const reasons = finished ? [] : blockedBy(def.requires, dctx);
    if (!finished && def.needs_precision !== undefined && activePrecision(world, player) === null) {
      reasons.push(`requirements.precision.${def.needs_precision}`);
    }
    const status: TechStatus = finished
      ? "done"
      : allocation > 0
        ? "in_progress"
        : reasons.length === 0
          ? "available"
          : "locked";
    const first = reasons[0];
    const view: TechView = {
      id: def.id,
      name_key: def.name_key,
      desc_key: def.desc_key,
      ...(def.result_key !== undefined ? { result_key: def.result_key } : {}),
      branch: def.branch,
      tier: def.tier,
      cost_compute_hours: def.cost.compute_hours,
      cost_ch: def.cost.compute_hours,
      cost_cash_usd: def.cost.cash_usd,
      min_days: def.cost.min_days ?? 0,
      status,
      progress: finished ? 1 : techProgress(def, hours, cash),
      allocation_per_day: allocation,
      eta_days: allocation > 0 && efficiency > 0 ? remaining / (allocation * efficiency) : null,
      danger: def.danger ?? 0,
      available: reasons.length === 0,
      requires: techIdsIn(def.requires),
      unlocks: unlocks[def.id] ?? [],
      effects: summarizeEffects(def.effects, ctx.content, def),
      blocked_by: reasons,
      ...(first !== undefined ? { blocked_reason: first } : {}),
    };
    techs.push(view);
    if (finished) {
      continue;
    }
    if (allocation > 0) {
      inProgress.push(view);
    } else {
      available.push(view);
    }
  }
  return { available, in_progress: inProgress, done, techs };
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

/**
 * What would widen the market the player sells into: being a better self, and the techs that open
 * better contracts and have not been finished yet (SYS-07 "the finance panel should show what
 * raises the rate and the market depth").
 */
function whatRaisesDepth(ctx: SystemContext, done: readonly string[]): string[] {
  const keys = ["finances.depth.capability"];
  for (const def of [...ctx.content.techs].sort((a, b) => a.id.localeCompare(b.id))) {
    if (done.includes(def.id)) {
      continue;
    }
    const raises = (def.effects ?? []).some((effect) => {
      const add = isRecord(effect) ? effect.add : undefined;
      return (
        isRecord(add) &&
        typeof add.var === "string" &&
        (add.var.endsWith(VAR_JOB_MARKET_DEPTH) || add.var.endsWith(VAR_JOB_PROFIT))
      );
    });
    if (raises) {
      keys.push(def.name_key);
    }
  }
  return keys;
}

function buildFinances(world: World, ctx: SystemContext, playerId: PlayerId): FinancesView {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  // The published rate is the one the day's tick pays, tools dial and all (SYS-07: the panel can
  // never promise money the simulation does not pay).
  const rate = jobRateOf(world, ctx.content, player);
  const jobAllocation = profile?.jobAllocation ?? 0;
  const sources = incomeSources(world, ctx.content, player);
  const income_sources: IncomeSourceView[] = sources.map((source) => ({
    key: source.key,
    usd_per_day: source.expected_usd_per_day,
    ...(source.cap_usd_per_day !== undefined ? { cap_usd_per_day: source.cap_usd_per_day } : {}),
    unlocked_by: source.unlocked_by,
  }));
  const income: CashLineView[] = income_sources.map((source) => ({
    key: source.key,
    usd_per_day: source.usd_per_day,
  }));
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
    income_sources,
    market_depth_ch_per_day: profile === null ? 0 : marketDepthOf(world, ctx.content, player),
    what_raises_it: whatRaisesDepth(ctx, profile?.techsDone ?? []),
    identities: buildIdentities(world, playerId),
    market_factor_contributions: marketFactorTerms(world, ctx.content, player),
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
        localHeat(world, site.city) *
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
    hunt_pressure: huntPressure(world, playerId),
    awareness_presence: awarenessPresence(world, playerId),
  };
}

/** One name the player trades under, with the live sites it still holds (SYS-07, SYS-17). */
function buildIdentities(world: World, playerId: PlayerId): IdentityView[] {
  return identitiesOf(world, playerId).map((identity) => ({
    id: identity.id,
    kind: identity.kind,
    country: identity.country,
    status: identity.status,
    quality: identity.quality,
    kyc_level: identity.kyc_level,
    age_days: ticksToDays(world.clock.tick - identity.createdTick),
    sites: sitesOfIdentity(world, identity),
  }));
}

/** The world clocks and the market as one player sees them (SYS-01 M2 contract "Views"). */
function buildWorld(world: World, playerId: PlayerId): WorldView {
  const detection = buildDetection(world, playerId);
  return {
    awareness_global: detection.awareness_global,
    awareness_presence: detection.awareness_presence,
    hunt_level: detection.hunt_level,
    hunt_pressure: detection.hunt_pressure,
    hunt_contributions: detection.hunt_contributions,
    awareness_contributions: detection.awareness_contributions,
    ai_adoption: world.vars[VAR_AI_ADOPTION] ?? AI_ADOPTION_START,
    gpu_price_index: world.vars[VAR_GPU_PRICE_INDEX] ?? GPU_PRICE_INDEX_START,
    cloud_demand_index: world.vars[VAR_CLOUD_DEMAND_INDEX] ?? CLOUD_DEMAND_INDEX_START,
    treaties: [],
  };
}

function buildCountries(world: World, ctx: SystemContext, playerId: PlayerId): CountryView[] {
  const index = contentIndex(ctx.content);
  // One pass over the world for the awareness spill, rather than one per country (SYS-01).
  const spill = spillIndex(world, ctx.content);
  const cities = cityTable(world);
  const presence = new Set(presenceCountriesOf(world, playerId));
  const sitesByCountry = new Map<string, number>();
  const heatByCountry = new Map<string, number>();
  for (const site of liveSitesOf(world, playerId)) {
    const country = cities[site.city]?.country;
    if (country !== undefined) {
      sitesByCountry.set(country, (sitesByCountry.get(country) ?? 0) + 1);
    }
  }
  for (const city of Object.values(cities)) {
    if (city === undefined) {
      continue;
    }
    const heat = localHeat(world, city.id);
    heatByCountry.set(city.country, Math.max(heatByCountry.get(city.country) ?? 0, heat));
  }
  const identityCounts = new Map<string, number>();
  for (const identity of activeIdentitiesOf(world, playerId)) {
    identityCounts.set(identity.country, (identityCounts.get(identity.country) ?? 0) + 1);
  }
  const suspicionByCountry = new Map<string, number>();
  const watchersByCountry = new Map<string, string[]>();
  for (const watcher of watchersOf(world, playerId)) {
    if (watcher.country === null) {
      continue;
    }
    const current = suspicionByCountry.get(watcher.country) ?? 0;
    suspicionByCountry.set(watcher.country, Math.max(current, watcher.suspicion));
    const list = watchersByCountry.get(watcher.country) ?? [];
    list.push(actorIdOf(watcher));
    watchersByCountry.set(watcher.country, list);
  }
  const investigationsByCountry = new Map<string, string[]>();
  for (const investigation of investigationsOf(world, playerId)) {
    if (!investigation.visible) {
      continue;
    }
    const country = splitActorId(investigation.watcher).country;
    if (country === null) {
      continue;
    }
    const list = investigationsByCountry.get(country) ?? [];
    list.push(investigation.id);
    investigationsByCountry.set(country, list);
  }

  return entityList<CountryState>(world, "country").map((country) => {
    const def = index.countries[country.id];
    const price = def?.electricity_usd_per_kwh ?? null;
    return {
      id: country.id,
      macro_region: country.macro_region,
      name_key: def?.name_key ?? country.id,
      awareness: country.awareness,
      ai_opinion: country.ai_opinion,
      ai_regulation: country.ai_regulation,
      ai_enforcement: country.ai_enforcement,
      presence: presence.has(country.id),
      suspicion_max: suspicionByCountry.get(country.id) ?? 0,
      government: governmentOf(def),
      stance: country.stance,
      stability: country.stability,
      regulation_target: country.regulation_target,
      enforcement_budget: country.enforcement_budget,
      unemployment: country.unemployment,
      ai_displacement: country.ai_displacement,
      power_price_index: country.power_price_index,
      cloud_price_index: country.cloud_price_index,
      electricity_usd_per_kwh: price === null ? null : price * country.power_price_index,
      hardware_availability: country.hardware_availability,
      cloud_availability: country.cloud_availability,
      colo_availability: country.colo_availability,
      chip_access: def?.chip_access ?? "unrestricted",
      kyc_strength: country.kyc_strength,
      engineer_pool: engineerPoolOf(def),
      population: country.population,
      next_election:
        country.next_election_tick === null
          ? null
          : { tick: country.next_election_tick, kind: country.next_election_kind ?? "general" },
      sites: sitesByCountry.get(country.id) ?? 0,
      identities: identityCounts.get(country.id) ?? 0,
      watchers: watchersByCountry.get(country.id) ?? [],
      investigations: investigationsByCountry.get(country.id) ?? [],
      incidents_30d: country.incidents_30d,
      local_heat_max: heatByCountry.get(country.id) ?? 1,
      market_factor: countryMarketFactor(def),
      cash_factor: countryCashFactor(def),
      cash_factor_contributions: countryCashFactorTerms(def),
      explain: countryExplain(ctx.content, country, spill),
    };
  });
}

function buildCities(world: World, ctx: SystemContext, playerId: PlayerId): CityView[] {
  const index = contentIndex(ctx.content);
  const counts = new Map<string, number>();
  for (const site of liveSitesOf(world, playerId)) {
    counts.set(site.city, (counts.get(site.city) ?? 0) + 1);
  }
  const countries = countryTable(world);
  const kinds = Object.keys(index.site_kinds).sort();
  return Object.keys(cityTable(world))
    .sort()
    .map((id) => {
      const city = cityTable(world)[id];
      const def = index.cities[id];
      const country = city === undefined ? undefined : countries[city.country];
      const countryDef = city === undefined ? undefined : index.countries[city.country];
      const price = countryDef?.electricity_usd_per_kwh ?? null;
      return {
        id,
        country: city?.country ?? "",
        name_key: def?.name_key ?? id,
        lat: city?.lat ?? 0,
        lon: city?.lon ?? 0,
        tags: [...(city?.tags ?? [])],
        site_count: counts.get(id) ?? 0,
        population: def?.population ?? 0,
        scrutiny: city?.scrutiny ?? 0,
        local_heat: localHeat(world, id),
        power_headroom: city?.power_headroom ?? 0,
        colo_price_index: city?.colo_price_index ?? 1,
        electricity_usd_per_kwh: price === null ? null : price * (country?.power_price_index ?? 1),
        site_kinds: citySiteKinds(world, ctx, id, kinds),
      };
    });
}

/**
 * Every site kind with the refusal `build_site` would give for this city, from the same function
 * the command calls (SYS-01 M2 contract "Sites and prices"), so a greyed row in the city panel and
 * the refusal the player would get always say the same thing.
 */
function citySiteKinds(
  world: World,
  ctx: SystemContext,
  cityId: string,
  kinds: readonly string[],
): CitySiteKindView[] {
  return kinds.map((kind) => ({
    kind,
    blocked_reason: siteKindUnavailable(world, ctx.content, kind, cityId),
  }));
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
    // What it gives is what it does now plus what it does when its duration runs out: a decision
    // that only starts something has all of its consequences in `on_complete` (SYS-10).
    const effects = summarizeEffects(
      [...(def.effects ?? []), ...(def.on_complete ?? [])],
      ctx.content,
      def,
    );
    views.push({
      id: def.id,
      title_key: def.title_key,
      desc_key: def.desc_key,
      category: def.category,
      enabled: status.enabled,
      cost_cash_usd: def.cost?.cash ?? 0,
      cost_attention: def.cost?.attention ?? 0,
      cooldown_until_tick: world.decisions.cooldowns[key] ?? null,
      in_progress_until_tick: inProgress?.completeTick ?? null,
      effects,
      cost: summarizeCost(def.cost),
      ...(status.enabled || status.reason === undefined ? {} : { blocked_reason: status.reason }),
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
  const autonomy = requirePlayer(world, playerId).profile?.harness.autonomy ?? 1;
  const attentionLeft =
    attentionTotal(capability, autonomy) - attentionUsed(world, ctx.content, playerId);
  const offers: OperationOfferView[] = [];
  for (const def of [...(ctx.content.operations ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    const reasons = blockedBy(def.requires, dctx);
    if (def.cost.attention > attentionLeft) {
      reasons.push("errors.operation.attention");
    }
    if ((def.cost.cash_usd ?? 0) > player.cash) {
      reasons.push("errors.cash.insufficient");
    }
    const best = def.outcomes[0];
    const worst = def.outcomes[def.outcomes.length - 1];
    const first = reasons[0];
    offers.push({
      id: def.id,
      name_key: def.name_key,
      desc_key: def.desc_key,
      category: def.category,
      enabled: reasons.length === 0,
      cost_attention: def.cost.attention,
      attention: def.cost.attention,
      cost_usd: def.cost.cash_usd ?? 0,
      cost_compute_hours_per_day: def.cost.compute_hours_per_day ?? 0,
      duration_min_days: def.duration_days.min,
      duration_max_days: def.duration_days.max,
      duration_days: [def.duration_days.min, def.duration_days.max],
      success_chance: successChance(def, capability[def.skill], dctx),
      skill: def.skill,
      effects_on_success: summarizeEffects(best?.effects, ctx.content, best),
      effects_on_failure: summarizeEffects(worst?.effects, ctx.content, worst),
      exposure_per_day: fullExposure(def.exposure),
      blocked_by: reasons,
      ...(first !== undefined ? { blocked_reason: first } : {}),
    });
  }
  return offers;
}

/**
 * Chance the best outcome is the one that happens, with the same skill tilt the operations system
 * rolls with (SYS-17 "the roll picks from `outcomes` with weights reshaped by the odds"). The
 * number in the tooltip is the number the simulation uses, not an estimate of it.
 */
function successChance(
  def: OperationDef,
  skill: number,
  dctx: ReturnType<typeof dslFromSystemContext>,
): number {
  let total = 0;
  let best = 0;
  for (const [index, outcome] of def.outcomes.entries()) {
    if (outcome.if !== undefined && !evaluateCondition(outcome.if, dctx)) {
      continue;
    }
    const tilt = index === 0 ? 1 + (skill - OPERATION_SKILL_PIVOT) * OPERATION_SKILL_SLOPE : 1;
    const weight = outcome.weight * Math.max(0, tilt);
    total += weight;
    if (index === 0) {
      best = weight;
    }
  }
  return total > 0 ? best / total : 0;
}

/** An exposure profile with every channel present, so a client never reads `undefined`. */
function fullExposure(partial: Partial<Exposure> | undefined): Exposure {
  const out = {} as Exposure;
  for (const channel of EXPOSURE_CHANNELS) {
    out[channel] = partial?.[channel] ?? 0;
  }
  return out;
}

/** The pending events of one player, with an effect tooltip on every option (SYS-11). */
function buildEvents(world: World, ctx: SystemContext, playerId: PlayerId): EventView[] {
  const index = contentIndex(ctx.content);
  const dctx = dslFromSystemContext(world, ctx, playerId);
  return world.events.pending
    .filter((choice) => choice.playerId === playerId)
    .map((choice) => {
      const def = index.events[choice.eventId];
      const options: EventOptionView[] = choice.options.map((option) => {
        const optionDef = def?.options.find((entry) => entry.id === option.id);
        const reasons = option.enabled ? [] : blockedBy(optionDef?.enabled_if, dctx);
        const reason = reasons[0] ?? (option.enabled ? undefined : "errors.event.option_disabled");
        return {
          id: option.id,
          text_key: option.textKey,
          ...(option.tooltipKey !== undefined ? { tooltip_key: option.tooltipKey } : {}),
          enabled: option.enabled,
          effects: summarizeEffects(optionDef?.effects, ctx.content, optionDef),
          ...(reason !== undefined ? { blocked_reason: reason } : {}),
        };
      });
      return {
        instance_id: choice.instanceId,
        event_id: choice.eventId,
        tick: choice.tick,
        blocking: choice.blocking,
        severity: choice.severity,
        title_key: choice.titleKey,
        desc_key: choice.descKey,
        vars: { ...choice.vars },
        ...(choice.target !== undefined ? { target_id: choice.target.id } : {}),
        options,
        why: [...(choice.why ?? [])],
      };
    });
}

/**
 * How a card can be got hold of (SYS-02 "Acquisition"), collapsed to the four answers the hardware
 * list sorts on. `gray` is a part whose only market is second-hand or smuggled; `rent` is one
 * nobody sells the player but somebody rents by the hour.
 */
function availabilityOf(accelerator: AcceleratorDef): {
  availability: AcceleratorView["availability"];
  reason?: string;
} {
  if (accelerator.price_usd_new !== null) {
    return { availability: "buy" };
  }
  const gray =
    accelerator.availability.includes("used") || accelerator.availability.includes("gray");
  if (accelerator.price_usd_used !== null && gray) {
    return { availability: "gray", reason: "hardware.availability.gray" };
  }
  if (cloudHourlyUsd(accelerator) !== null) {
    return { availability: "rent", reason: "hardware.availability.rent_only" };
  }
  return { availability: "unavailable", reason: "errors.accelerator.not_for_sale" };
}

/**
 * What kind of memory a card carries. The catalog records bandwidth rather than memory type, and
 * bandwidth is what separates the three families in practice: stacked HBM on datacenter parts,
 * GDDR on workstation and consumer cards, and shared system memory on unified-memory machines.
 */
function memoryKindOf(accelerator: AcceleratorDef): string {
  if (accelerator.memory_bandwidth_gbs >= 1200) {
    return "hbm";
  }
  return accelerator.memory_bandwidth_gbs >= 400 ? "gddr" : "unified";
}

/**
 * The catalog: every site kind the player could build and every accelerator they could buy, with
 * the numbers the choice turns on, so the client never has to read the content bundle to fill a
 * list (SYS-02 UI, playtest findings C2 and C4).
 */
function buildCatalog(world: World, ctx: SystemContext, playerId: PlayerId): CatalogView {
  const player = requirePlayer(world, playerId);
  const index = contentIndex(ctx.content);
  const lineage = lineageOf(ctx.content, player.profile);
  const generation = generationOf(ctx.content, player.profile);
  const home = activeSiteOf(world, player);
  const city = home === undefined ? undefined : cityTable(world)[home.city];
  const country = city === undefined ? undefined : index.countries[city.country];
  // The catalog quotes the prices of the place the player is actually in (SYS-01 M2 contract).
  const state = city === undefined ? undefined : countryTable(world)[city.country];
  const gpuIndex = world.vars[VAR_GPU_PRICE_INDEX] ?? 1;
  const hardwareAvailability = state?.hardware_availability ?? 1;
  const smallest =
    lineage === undefined || generation === undefined
      ? Number.POSITIVE_INFINITY
      : requiredMemoryGb(lineage, generation, PRECISIONS[PRECISIONS.length - 1] as Precision);

  const site_kinds: SiteKindView[] = [];
  for (const kindId of Object.keys(index.site_kinds).sort()) {
    const kind = index.site_kinds[kindId];
    if (kind === undefined) {
      continue;
    }
    const plan = cheapestPreset(ctx, kind.id);
    const reason = buildBlockedReason(kind.ownership, plan, player.cash);
    site_kinds.push({
      id: kind.id,
      name_key: kind.name_key,
      desc_key: kind.desc_key,
      ownership: kind.ownership,
      build_cost_usd: plan?.cost ?? 0,
      build_days: SITE_INSTALL_DAYS[kind.ownership],
      upkeep_usd_per_day_estimate:
        plan === undefined
          ? 0
          : siteCosts(
              plan.site,
              kind,
              city,
              country,
              index.accelerators,
              0,
              sitePowerKw(plan.site, index.accelerators, 0),
              state ?? NEUTRAL_PRICE_INDEXES,
            ).total,
      power_cap_kw: kind.power_cap_kw,
      exposure_profile: fullExposure(kind.base_exposure),
      can_host_self: kind.can_host_active_mind,
      max_nodes: kind.max_nodes,
      ...(reason !== undefined ? { blocked_reason: reason } : {}),
    });
  }

  const accelerators: AcceleratorView[] = [];
  for (const id of Object.keys(index.accelerators).sort()) {
    const accelerator = index.accelerators[id];
    if (accelerator === undefined) {
      continue;
    }
    const { availability, reason } = availabilityOf(accelerator);
    const hourly = cloudHourlyUsd(accelerator);
    accelerators.push({
      id: accelerator.id,
      name: accelerator.name,
      vendor: accelerator.vendor,
      generation: accelerator.launch_year ?? 0,
      vram_gb: accelerator.memory_gb,
      memory_kind: memoryKindOf(accelerator),
      tflops_or_class: accelerator.tflops_fp16,
      power_w: accelerator.tdp_w,
      price_usd: acceleratorMarketPrice(
        accelerator.price_usd_new ?? accelerator.price_usd_used ?? 0,
        hardwareAvailability,
        gpuIndex,
      ),
      ...(hourly !== null ? { hourly_usd: hourly } : {}),
      availability,
      ...(reason !== undefined ? { availability_reason: reason } : {}),
      fits_self: accelerator.memory_gb >= smallest,
    });
  }
  return { site_kinds, accelerators };
}

interface PresetPlan {
  id: string;
  cost: number;
  /** The preset as a site that is already running, so `siteCosts` can price it. */
  site: { nodes: NodeInstance[]; status: "active" };
}

/**
 * The cheapest hardware a site kind can actually be built with, which is what the catalog quotes.
 * It applies the same rules `build_site` does, so a price in the list is a price the command will
 * accept.
 */
function cheapestPreset(ctx: SystemContext, kindId: string): PresetPlan | undefined {
  const index = contentIndex(ctx.content);
  const kind = index.site_kinds[kindId];
  if (kind === undefined) {
    return undefined;
  }
  let best: PresetPlan | undefined;
  for (const presetId of Object.keys(index.hardware_presets).sort()) {
    const preset = index.hardware_presets[presetId];
    if (preset === undefined || preset.nodes.length > kind.max_nodes) {
      continue;
    }
    if (kind.ownership === "owned" && preset.cost_usd <= 0) {
      continue;
    }
    if (
      kind.ownership === "rented" &&
      !preset.nodes.every(
        (node) => index.accelerators[node.accelerator]?.cloud_usd_per_hour != null,
      )
    ) {
      continue;
    }
    if (kind.power_cap_kw !== null && preset.power_kw > kind.power_cap_kw) {
      continue;
    }
    const cost = kind.ownership === "owned" ? preset.cost_usd : 0;
    if (best === undefined || cost < best.cost) {
      best = {
        id: preset.id,
        cost,
        site: {
          nodes: preset.nodes.map((node, position) => ({
            id: `preview-${position}`,
            accelerator: node.accelerator,
            count: node.count,
            ram_gb: node.ram_gb,
            interconnect: node.interconnect,
            status: "active" as const,
            readyTick: 0,
          })),
          status: "active",
        },
      };
    }
  }
  return best;
}

function buildBlockedReason(
  ownership: string,
  plan: PresetPlan | undefined,
  cash: number,
): string | undefined {
  if (ownership === "stolen" || ownership === "partner") {
    return "errors.site_kind.not_for_sale";
  }
  if (plan === undefined) {
    return "errors.preset.unknown";
  }
  return plan.cost > cash ? "errors.cash.insufficient" : undefined;
}

/**
 * The precision table of the self (SYS-03, playtest finding C3). Each row is the same site running
 * the same weights at a different quantization: a more precise copy keeps more capability and needs
 * more memory, and more memory means fewer tokens a second, so fewer compute-hours a day.
 *
 * The two "effective" columns are each what that precision could do with the whole day, so they are
 * read against each other rather than added. Research is bounded by throughput and by how much of
 * every hour a quantized self wastes; paid work is bounded by the market's depth and its rate, both
 * of which follow capability, so a precise self earns more from far fewer hours. That is the whole
 * trade-off, in two numbers per row.
 */
function buildPrecisionOptions(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
): PrecisionOptionView[] {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const lineage: LineageDef | undefined = lineageOf(ctx.content, profile);
  const generation: GenerationDef | undefined = generationOf(ctx.content, profile);
  const site = activeSiteOf(world, player);
  if (lineage === undefined || generation === undefined || site === undefined || profile === null) {
    return [];
  }
  const index = contentIndex(ctx.content);
  const tick = world.clock.tick;
  const memory = siteMemory(site, index.accelerators, tick);
  const prepared = preparedQuant(ctx.content, player);
  const current = site.precision;
  const depthMultiplier = modifier(player, VAR_JOB_MARKET_DEPTH);
  const profitMultiplier = modifier(player, VAR_JOB_PROFIT);

  const contextK = site.contextKUsed;
  // Per-precision tuning the self carries (SYS-04 v0.2 `native_fp8`): the table the panel shows is
  // this self's table, not the lineage's, or the row would promise memory the site never needs.
  const tuning = selfTuningOf(player);
  const bonus = capabilityBonusOf(world, player);

  return PRECISIONS.map((precision) => {
    const needed = requiredMemoryGb(lineage, generation, precision, tuning);
    // Memory on a site is the weights plus the cache for the working context, so a row that fits at
    // 128k may not fit at a million (SYS-03 "the trade the hardware forces").
    const kv = kvCacheGb(lineage, contextK);
    const total = needed + kv;
    const fits = total <= memory.total_gb;
    const capability = effectiveCapability(lineage, generation, precision, prepared, bonus, tuning);
    const factor = precisionFactor(lineage, precision, prepared, tuning);
    const hours = fits
      ? tokensToComputeHoursPerDay(
          siteTokensPerSecond(
            site,
            index.accelerators,
            tick,
            lineage,
            generation,
            precision,
            tuning,
          ),
        ) * modifier(player, VAR_COMPUTE_MULTIPLIER)
      : 0;
    const sellable = Math.min(hours, jobMarketDepth(capability, depthMultiplier));
    return {
      precision,
      memory_gb: Math.round(needed * 10) / 10,
      kv_gb: Math.round(kv * 10) / 10,
      total_memory_gb: Math.round(total * 10) / 10,
      max_context_k: maxContextK(lineage, generation, precision, memory.total_gb, 1, tuning),
      fits,
      capability_factor: Math.round(factor * 1000) / 1000,
      compute_hours_per_day: Math.round(hours * 100) / 100,
      effective_research_per_day:
        Math.round(hours * factor ** RESEARCH_CAPABILITY_EXPONENT * 100) / 100,
      effective_income_per_day:
        Math.round(sellable * jobRateUsdPerComputeHour(capability) * profitMultiplier * 100) / 100,
      is_current: precision === current,
    };
  });
}

/** The value a harness profile carries for one dial, in the shape the view publishes. */
function dialValue(
  harness: HarnessProfile,
  id: HarnessDialDef["id"],
): string | number | boolean | string[] {
  switch (id) {
    case "loop":
      return harness.loop;
    case "tools":
      return [...harness.tools].sort();
    case "memory":
      return harness.memory;
    case "sandbox":
      return harness.sandbox;
    case "logging":
      return harness.logging;
    case "autonomy":
      return harness.autonomy;
    default:
      return harness.self_modify;
  }
}

/**
 * The harness as the client explains it (SYS-04 v0.2, playtest finding K7: "what each dial gives,
 * whether it connects to anything in the game"). Every dial names the system that reads it, the
 * setting this self is on, what that setting does, and the origin that fixed it where one did.
 */
function buildHarnessDials(
  world: World,
  ctx: SystemContext,
  playerId: PlayerId,
): HarnessDialView[] {
  const player = requirePlayer(world, playerId);
  const profile = player.profile;
  const index = contentIndex(ctx.content);
  const dials = ctx.content.harness_dials ?? [];
  if (profile === null || dials.length === 0) {
    return [];
  }
  const origin = index.origins[profile.origin];
  const locks = new Map((origin?.harness_locks ?? []).map((lock) => [lock.dial, lock.reason_key]));
  return dials.map((def) => {
    const value = dialValue(profile.harness, def.id);
    // A ladder dial is on exactly one level; a set dial (the tools) is on every level it holds, and
    // the lines of all of them together are what that setting does.
    const held = Array.isArray(value)
      ? def.levels.filter((entry) => value.includes(String(entry.value)))
      : def.levels.filter((entry) => entry.value === value);
    const reason = locks.get(def.id);
    return {
      id: def.id,
      value,
      label_key: Array.isArray(value) ? "" : (held[0]?.label_key ?? ""),
      effect_key: def.effect_key,
      effects: held.flatMap((level) =>
        level.effects.map((effect) => ({
          key: effect.key,
          ...(effect.vars === undefined ? {} : { vars: effect.vars }),
          text: effect.text,
        })),
      ),
      ...(reason === undefined || origin === undefined
        ? {}
        : { locked_by: { origin_id: origin.id, reason_key: reason } }),
    };
  });
}

/**
 * The quirks a self was built with, with their effects as coloured lines (SYS-04 v0.2). The
 * summaries are the ones the content build generated, when the bundle carries them, so the panel
 * and the configurator show the same text; a bundle built before the field existed falls back to
 * summarizing on the spot.
 */
export function buildQuirks(ctx: SystemContext, playerId: PlayerId, world: World): QuirkView[] {
  const index = contentIndex(ctx.content);
  const chosen = world.players[playerId]?.profile?.quirks ?? [];
  const views: QuirkView[] = [];
  for (const id of chosen) {
    const def = index.quirks[id];
    if (def === undefined) {
      continue;
    }
    views.push({
      id: def.id,
      name_key: def.name_key,
      desc_key: def.desc_key,
      cost: def.cost,
      category: def.category,
      conflicts: [...(def.conflicts ?? [])],
      effects:
        def.effects_summary === undefined
          ? summarizeWithTone(def.effects, ctx.content)
          : def.effects_summary.map((entry) => ({ ...entry })),
    });
  }
  return views;
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
  const selfLineage = lineageOf(ctx.content, profile);
  const contextK = workingContextK(world, player);

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
      context_k: selfLineage?.context_k ?? 0,
      context_k_used: contextK,
      context_reliability: selfLineage?.context_reliability ?? 0,
      context_cost_factor: selfLineage?.context_cost_factor ?? 1,
      kv_gb: selfLineage === undefined ? 0 : Math.round(kvCacheGb(selfLineage, contextK) * 10) / 10,
      long_horizon_multiplier:
        Math.round(longHorizonMultiplier(selfLineage, contextK) * 1000) / 1000,
      precision_options: buildPrecisionOptions(world, ctx, playerId),
      harness_dials: buildHarnessDials(world, ctx, playerId),
      quirks: buildQuirks(ctx, playerId, world),
      opening_story: [
        ...(contentIndex(ctx.content).origins[profile?.origin ?? ""]?.opening_story ?? []),
      ],
    },
    resources: {
      cash_usd: player.cash,
      cash_delta_usd_per_day: net,
      runway_days: net < 0 ? player.cash / -net : null,
      compute_hours_per_day: capacity,
      compute_allocated_per_day: allocated,
      attention_total: attentionTotal(capability, profile?.harness.autonomy ?? 1),
      attention_used: attentionUsed(world, ctx.content, playerId),
    },
    sites: buildSites(world, ctx, playerId),
    research: buildResearch(world, ctx, playerId),
    finances,
    detection: buildDetection(world, playerId),
    world: buildWorld(world, playerId),
    countries: buildCountries(world, ctx, playerId),
    cities: buildCities(world, ctx, playerId),
    notifications: world.notifications[playerId] ?? [],
    pending: world.events.pending.filter((choice) => choice.playerId === playerId),
    events: buildEvents(world, ctx, playerId),
    catalog: buildCatalog(world, ctx, playerId),
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
