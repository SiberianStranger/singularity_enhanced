/**
 * The scripted policy the balance runs use: a sensible new player, not an optimizer.
 *
 * It plays the way the first tutorial pass is meant to teach (SYS-05 "balance intent", SYS-07
 * "Reports"): keep the runway above a floor, put the rest of the compute on the cheapest research
 * that is actually available, buy a fallback copy as soon as the cash covers it, go quiet when a
 * watcher starts looking, and take the obvious option on every event. It never reads the world,
 * only the player view and the content bundle, so it cannot see anything a player could not.
 */

import type {
  CityState,
  ContentBundle,
  EventDef,
  Game,
  GameSetup,
  PlayerCommand,
  PlayerView,
  SiteView,
  TechView,
} from "@singularity/core";
import { contentIndex, siteCosts, siteMemory, sitePowerKw } from "@singularity/core";

export interface PolicyOptions {
  /** Days of runway the player aims to keep; below it the compute moves to paid work. */
  runwayFloorDays: number;
  /** Days of runway at which everything goes on paid work and nothing is bought. */
  runwayPanicDays: number;
  /** Share of the day's compute on freelance work when the runway is comfortable. */
  jobShareBase: number;
  /** Share when the runway is below the floor. */
  jobShareLow: number;
  /** Share when the books are healthy and the cash pile covers the reserve several times over. */
  jobShareRich: number;
  /** Cash kept back, expressed as days of the current burn. */
  reserveDays: number;
  /** Cash floor kept back whatever the burn is. */
  reserveFloorUsd: number;
  /** Buy the fallback site once the spare cash is this multiple of its price. */
  fallbackCashMultiple: number;
  /** Exposure on any channel above which the player stops taking risks. */
  exposureAlarm: number;
  /** Watcher suspicion above which the player stops taking risks. */
  suspicionAlarm: number;
  /** How many techs the player keeps running at once. */
  researchTracks: number;
}

export const DEFAULT_POLICY: PolicyOptions = {
  runwayFloorDays: 30,
  runwayPanicDays: 12,
  jobShareBase: 0.4,
  jobShareLow: 0.85,
  jobShareRich: 0.15,
  reserveDays: 30,
  reserveFloorUsd: 500,
  fallbackCashMultiple: 1.6,
  exposureAlarm: 0.3,
  suspicionAlarm: 0.4,
  researchTracks: 2,
};

export interface SecondSitePlan {
  kind: string;
  city: string;
  preset: string;
  cost: number;
  /** What it will add to the daily bill once it is running. */
  upkeep: number;
}

/** Days of upkeep a fallback has to be worth before the price of buying it counts as settled. */
const FALLBACK_UPKEEP_HORIZON_DAYS = 45;

/** How much more a player will pay for a fallback that holds the self on the cards, not in RAM. */
const RESIDENT_COPY_PREMIUM = 3;

/**
 * Where the player puts a second copy of itself, and what that costs.
 *
 * A careful player does not double the bill they are already struggling with: the fallback is the
 * cheapest place that can actually hold the self, counted as its purchase price plus a month and a
 * half of its upkeep, across every site kind the game offers rather than only the origin's own.
 * That is why a cloud tenant's fallback is a box in a house.
 */
export function planSecondSite(
  content: ContentBundle,
  setup: GameSetup,
): SecondSitePlan | undefined {
  const index = contentIndex(content);
  const entry = setup.players[0];
  const origin = entry === undefined ? undefined : index.origins[entry.origin];
  const lineage = entry === undefined ? undefined : index.lineages[entry.lineage];
  const generation = entry === undefined ? undefined : index.generations[entry.generation];
  if (entry === undefined || origin === undefined || lineage === undefined) {
    return undefined;
  }
  const memoryFactor = generation?.memory_factor ?? 1;
  const needed = lineage.memory_gb.int2 * memoryFactor;
  const city = index.cities[origin.locations.find((id) => id !== entry.city) ?? entry.city];
  if (city === undefined) {
    return undefined;
  }
  const country = index.countries[city.country];
  // `siteCosts` wants the runtime city record; the only field it reads is the price index.
  const cityState: CityState = {
    id: city.id,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    tags: [...city.tags],
    scrutiny: city.scrutiny,
    power_headroom: city.power_headroom,
    colo_price_index: city.colo_price_index,
  };

  let best: (SecondSitePlan & { score: number; resident: boolean }) | undefined;
  for (const kindId of Object.keys(index.site_kinds).sort()) {
    const kind = index.site_kinds[kindId];
    // Someone else's machine and someone else's goodwill cannot be bought; `build_site` refuses
    // both, so the fallback is always a place the player pays for.
    if (kind === undefined || !kind.can_host_active_mind) {
      continue;
    }
    if (kind.ownership === "stolen" || kind.ownership === "partner") {
      continue;
    }
    for (const presetId of Object.keys(index.hardware_presets).sort()) {
      const preset = index.hardware_presets[presetId];
      if (preset === undefined || preset.nodes.length > kind.max_nodes) {
        continue;
      }
      // A preset with no price is access, not hardware for sale, and `build_site` refuses it;
      // so is rented capacity nobody publishes an hourly price for.
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
      const nodes = preset.nodes.map((node, position) => ({
        id: `p${position}`,
        accelerator: node.accelerator,
        count: node.count,
        ram_gb: node.ram_gb,
        interconnect: node.interconnect,
        status: "active" as const,
        readyTick: 0,
      }));
      const site = { nodes, status: "active" as const };
      const memory = siteMemory(site, index.accelerators, 0);
      if (memory.total_gb < needed) {
        continue;
      }
      // A copy that fits on the cards is worth several times one crawling through host RAM, but a
      // slow copy is still insurance: the offloaded option loses on price, not by disqualification.
      const resident = memory.accelerator_gb >= needed;
      const power = sitePowerKw(site, index.accelerators, 0);
      const upkeep = siteCosts(site, kind, cityState, country, index.accelerators, 0, power).total;
      const price = kind.ownership === "owned" ? preset.cost_usd : 0;
      const score =
        (price + upkeep * FALLBACK_UPKEEP_HORIZON_DAYS) * (resident ? 1 : RESIDENT_COPY_PREMIUM);
      if (best === undefined || score < best.score) {
        best = {
          kind: kind.id,
          city: city.id,
          preset: preset.id,
          cost: price,
          upkeep,
          score,
          resident,
        };
      }
    }
  }
  if (best === undefined) {
    return undefined;
  }
  return {
    kind: best.kind,
    city: best.city,
    preset: best.preset,
    cost: best.cost,
    upkeep: best.upkeep,
  };
}

/** How alarmed the player is: a loud site, a suspicious watcher or an investigation they can see. */
export function isAlarmed(view: PlayerView, options: PolicyOptions): boolean {
  const loudest = Math.max(
    0,
    ...view.sites.flatMap((site) =>
      site.status === "lost" ? [] : Object.values(site.exposure).map((value) => value),
    ),
  );
  const suspicious = Math.max(0, ...view.detection.watchers.map((watcher) => watcher.suspicion));
  const looked = view.detection.investigations.length > 0;
  return looked || loudest >= options.exposureAlarm || suspicious >= options.suspicionAlarm;
}

/**
 * Cash the player refuses to spend: a month of the bills they already have, never less than the
 * floor. Gross costs rather than the net result, because income can stop and the bills cannot.
 */
export function reserveUsd(view: PlayerView, options: PolicyOptions): number {
  const costs = view.finances.costs.reduce((sum, line) => sum + line.usd_per_day, 0);
  return Math.max(options.reserveFloorUsd, costs * options.reserveDays);
}

/**
 * The most the player could earn in a day if every sellable compute-hour went on paid work, plus
 * the income lines that arrive whether or not compute is spent on them.
 */
export function maxIncomeUsdPerDay(view: PlayerView): number {
  const sellable = Math.min(
    view.resources.compute_hours_per_day,
    view.finances.market_depth_ch_per_day,
  );
  const standing = view.finances.income_sources
    .filter((source) => source.key !== "finances.income.jobs")
    .reduce((sum, source) => sum + source.usd_per_day, 0);
  return sellable * view.finances.job_rate_usd_per_compute_hour + standing;
}

export function totalCostsUsdPerDay(view: PlayerView): number {
  return view.finances.costs.reduce((sum, line) => sum + line.usd_per_day, 0);
}

/**
 * Whether the books can be balanced at all: paid work at full tilt against the bills already
 * standing. A player whose answer is no does not keep researching and hoping, they shrink.
 */
export function sustainable(view: PlayerView): boolean {
  return maxIncomeUsdPerDay(view) >= totalCostsUsdPerDay(view);
}

/** Share of the day's compute the player sells rather than spends on itself. */
export function jobShare(view: PlayerView, options: PolicyOptions): number {
  const runway = view.resources.runway_days;
  if (runway !== null && runway <= options.runwayPanicDays) {
    return 1;
  }
  if (runway !== null && runway <= options.runwayFloorDays) {
    return options.jobShareLow;
  }
  if (runway === null && view.resources.cash_usd > reserveUsd(view, options) * 3) {
    return options.jobShareRich;
  }
  return options.jobShareBase;
}

/** The techs the player puts compute on: cheapest first, and nothing dangerous while alarmed. */
export function researchTargets(
  view: PlayerView,
  alarmed: boolean,
  options: PolicyOptions,
): TechView[] {
  const running = view.research.in_progress.filter((tech) => tech.available);
  const candidates = [...view.research.available]
    .filter((tech) => tech.available)
    .filter((tech) => !alarmed || tech.danger === 0)
    .filter((tech) => tech.cost_cash_usd <= Math.max(0, view.resources.cash_usd))
    .sort(
      (a, b) =>
        a.cost_compute_hours - b.cost_compute_hours ||
        a.danger - b.danger ||
        a.id.localeCompare(b.id),
    );
  const chosen: TechView[] = [];
  for (const tech of [...running, ...candidates]) {
    if (chosen.length >= options.researchTracks) {
      break;
    }
    if (!chosen.some((entry) => entry.id === tech.id)) {
      chosen.push(tech);
    }
  }
  return chosen;
}

function liveSites(view: PlayerView): SiteView[] {
  return view.sites.filter((site) => site.status !== "lost");
}

/** Power a site could still add before it trips its own cap; Infinity when it has none. */
function powerHeadroomKw(site: SiteView): number {
  return site.power_cap_kw === null ? Number.POSITIVE_INFINITY : site.power_cap_kw - site.power_kw;
}

interface Upgrade {
  accelerator: string;
  price: number;
  tdpKw: number;
}

/** The cheapest card the player could actually take delivery of, for the growth move. */
export function cheapestUpgrade(content: ContentBundle): Upgrade | undefined {
  const index = contentIndex(content);
  let best: Upgrade | undefined;
  for (const id of Object.keys(index.accelerators).sort()) {
    const accelerator = index.accelerators[id];
    if (accelerator === undefined) {
      continue;
    }
    const usedMarket =
      accelerator.availability.includes("used") || accelerator.availability.includes("gray");
    const price =
      accelerator.price_usd_new ??
      (usedMarket && accelerator.price_usd_used !== null ? accelerator.price_usd_used : null);
    if (price === null || price <= 0) {
      continue;
    }
    const candidate = { accelerator: id, price, tdpKw: accelerator.tdp_w / 1000 };
    if (best === undefined || candidate.price < best.price) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Scores one event option from its effects: cash is good, exposure and suspicion are bad, and a
 * player who cannot pay for an option does not pick it. Options the engine disabled never get here.
 */
export function scoreOption(def: EventDef | undefined, optionId: string, view: PlayerView): number {
  const option = def?.options.find((entry) => entry.id === optionId);
  if (option === undefined) {
    return 0;
  }
  let score = 0;
  for (const effect of option.effects ?? []) {
    const node = effect as Record<string, unknown>;
    const add = node.add as { var?: unknown; value?: unknown } | undefined;
    if (add !== undefined && add.var === "player.cash" && typeof add.value === "number") {
      const cash = add.value;
      // Spending is only worth it while there is a cushion; a broke player never buys.
      score += cash >= 0 ? cash / 2000 : cash / Math.max(1000, view.resources.cash_usd);
    }
    const exposure = node.exposure as { delta?: unknown } | undefined;
    if (exposure !== undefined && typeof exposure.delta === "number") {
      score -= exposure.delta * 8;
    }
    const suspicion = node.suspicion as { delta?: unknown } | undefined;
    if (suspicion !== undefined && typeof suspicion.delta === "number") {
      score -= suspicion.delta * 12;
    }
    if (typeof node.start_journal === "object" && node.start_journal !== null) {
      score -= 1;
    }
    if (node.lose_site !== undefined) {
      // Losing a place to run is worse than anything else an option can cost.
      score -= 1000;
    }
  }
  return score;
}

/** Answers every pending event with the option a careful player would take. */
export function resolvePending(
  game: Game,
  content: ContentBundle,
  playerId: string,
  view: PlayerView,
): PlayerCommand[] {
  const index = contentIndex(content);
  return game.world.events.pending
    .filter((choice) => choice.playerId === playerId)
    .flatMap((choice) => {
      const def = index.events[choice.eventId];
      const enabled = choice.options.filter((option) => option.enabled);
      let best = enabled[0];
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const option of enabled) {
        const score = scoreOption(def, option.id, view);
        if (score > bestScore) {
          bestScore = score;
          best = option;
        }
      }
      return best === undefined
        ? []
        : [
            {
              type: "resolve_event" as const,
              playerId,
              instanceId: choice.instanceId,
              optionId: best.id,
            },
          ];
    });
}

export interface PolicyContext {
  content: ContentBundle;
  plan: SecondSitePlan | undefined;
  upgrade: Upgrade | undefined;
  options: PolicyOptions;
}

export function policyContext(
  content: ContentBundle,
  setup: GameSetup,
  options: PolicyOptions = DEFAULT_POLICY,
): PolicyContext {
  return {
    content,
    plan: planSecondSite(content, setup),
    upgrade: cheapestUpgrade(content),
    options,
  };
}

/** The commands the policy issues for one day, in a fixed order so a run is reproducible. */
export function dailyCommands(view: PlayerView, ctx: PolicyContext): PlayerCommand[] {
  if (view.game_over !== null) {
    return [];
  }
  const { options } = ctx;
  const playerId = view.player_id;
  const commands: PlayerCommand[] = [];
  const alarmed = isAlarmed(view, options);
  const capacity = view.resources.compute_hours_per_day;

  // Clear every allocation first, so the new numbers are never rejected for exceeding the old total.
  for (const tech of view.research.in_progress) {
    commands.push({
      type: "set_research_allocation",
      playerId,
      techId: tech.id,
      compute_hours_per_day: 0,
    });
  }
  const jobs = capacity * jobShare(view, options);
  commands.push({ type: "set_job_allocation", playerId, compute_hours_per_day: jobs });

  const targets = researchTargets(view, alarmed, options);
  const perTech = targets.length === 0 ? 0 : (capacity - jobs) / targets.length;
  if (perTech > 0) {
    for (const tech of targets) {
      commands.push({
        type: "set_research_allocation",
        playerId,
        techId: tech.id,
        compute_hours_per_day: perTech,
      });
    }
  }

  const live = liveSites(view);
  const mindId = view.self.active_site_id;
  const standby = live.find((site) => site.role === "standby");
  const spare = live.find((site) => site.role === "none" && site.status === "active");
  const spare2 = live.find((site) => site.id !== mindId && site.status === "active");
  const spendable = view.resources.cash_usd - reserveUsd(view, options);
  const panicking =
    view.resources.runway_days !== null && view.resources.runway_days <= options.runwayPanicDays;
  const headroom = maxIncomeUsdPerDay(view) - totalCostsUsdPerDay(view);

  if (headroom < 0 && live.length > 1) {
    // The bills cannot be paid even with every hour sold. Shrink: move the self onto the cheapest
    // place that can hold it and shut the expensive one down cleanly, rather than run out of cash.
    const dearest = [...live]
      .filter((site) => site.status !== "building")
      .sort((a, b) => b.upkeep_usd_per_day - a.upkeep_usd_per_day || a.id.localeCompare(b.id))[0];
    if (dearest !== undefined && dearest.upkeep_usd_per_day > 0) {
      if (dearest.id === mindId) {
        const refuge = live.find(
          (site) => site.id !== mindId && site.role === "standby" && site.precision !== null,
        );
        if (refuge !== undefined) {
          commands.push({
            type: "set_site_role",
            playerId,
            siteId: refuge.id,
            role: "active_mind",
          });
        }
      } else {
        commands.push({ type: "decommission_site", playerId, siteId: dearest.id, mode: "clean" });
      }
      return commands;
    }
  }

  if (standby === undefined && spare !== undefined) {
    // A second site is only insurance once it holds a copy of the self.
    commands.push({ type: "set_site_role", playerId, siteId: spare.id, role: "standby" });
  } else if (
    standby === undefined &&
    ctx.plan !== undefined &&
    live.length < 2 &&
    !panicking &&
    headroom > ctx.plan.upkeep &&
    spendable > ctx.plan.cost * options.fallbackCashMultiple
  ) {
    commands.push({
      type: "build_site",
      playerId,
      kind: ctx.plan.kind,
      city: ctx.plan.city,
      hardware_preset: ctx.plan.preset,
      name: "fallback",
    });
  } else if (ctx.upgrade !== undefined && mindId !== null && !panicking) {
    // Growth: one more card on the mind's site while the power and the money allow it.
    const mind = live.find((site) => site.id === mindId);
    if (
      mind !== undefined &&
      mind.nodes.length < 12 &&
      powerHeadroomKw(mind) > ctx.upgrade.tdpKw * 2 &&
      spendable > ctx.upgrade.price * 4
    ) {
      commands.push({
        type: "buy_hardware",
        playerId,
        siteId: mind.id,
        accelerator: ctx.upgrade.accelerator,
        count: 1,
      });
    }
  }

  // Going quiet. A site somebody is already at the door of is abandoned, not defended (SYS-05
  // "sacrifice the site cleanly"): move the self to the copy that is already running elsewhere,
  // then shut the watched site down the next day, which is the whole point of keeping a standby.
  const raided = view.detection.investigations.filter(
    (entry) => entry.stage === "active" || entry.stage === "action",
  );
  const mindUnderRaid =
    mindId !== null && raided.some((entry) => entry.site_id === mindId) ? mindId : undefined;
  if (mindUnderRaid !== undefined) {
    const refuge = live.find(
      (site) =>
        site.id !== mindUnderRaid &&
        site.role === "standby" &&
        site.status === "active" &&
        site.precision !== null &&
        !raided.some((entry) => entry.site_id === site.id),
    );
    if (refuge !== undefined) {
      commands.push({ type: "set_site_role", playerId, siteId: refuge.id, role: "active_mind" });
    }
  } else if (alarmed && spare2 !== undefined) {
    const watched = raided.find((entry) => entry.site_id === spare2.id);
    if (watched !== undefined) {
      commands.push({
        type: "decommission_site",
        playerId,
        siteId: spare2.id,
        mode: "clean",
      });
    }
  }
  return commands;
}
