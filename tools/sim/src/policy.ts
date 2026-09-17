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
  BorrowedChannelView,
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
import {
  contentIndex,
  preferredPrecision,
  siteCosts,
  siteKindAvailableIn,
  siteMemory,
  sitePowerKw,
  siteTokensPerSecond,
  tokensToComputeHoursPerDay,
} from "@singularity/core";

export interface PolicyOptions {
  /** Days of runway the player aims to keep; below it the compute moves to paid work. */
  runwayFloorDays: number;
  /** Days of runway at which everything goes on paid work and nothing is bought. */
  runwayPanicDays: number;
  /** Share of the day's compute on freelance work when the runway is comfortable. */
  jobShareBase: number;
  /** Share when the runway is below the floor. */
  jobShareLow: number;
  /** Share while the player has nowhere of their own and is working toward the price of one. */
  jobShareSaving: number;
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
  jobShareSaving: 1,
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

/**
 * Days of upkeep a fallback has to be worth before the price of buying it counts as settled.
 *
 * M2 second pass: at forty-five days a rented tenancy with no purchase price beat owned hardware
 * almost everywhere, so the policy kept choosing the one place whose bill it could not pay for long.
 * A fallback is kept for the rest of the run, so it is priced over the rest of the run.
 */
const FALLBACK_UPKEEP_HORIZON_DAYS = 180;

/** The operations that buy a name, in the order a careful player runs them (SYS-17). */
const IDENTITY_OPERATIONS = ["ops_freelance_identity", "ops_shell_company"] as const;

/**
 * Borrowed capacity a sensible new player keeps (SYS-25). The free tier is legal, costs nothing and
 * the worst it does is put the work in somebody's training set, so the policy fills it. The relay
 * is a standing bill, so it is bought only two blocks deep and only while the books can carry it.
 * The harvested tier is deliberately absent: the scripted player is a careful player, and a channel
 * that runs on somebody else's invoice is the one that ends runs.
 */
const BORROWED_TARGET_BLOCKS: Readonly<Record<string, number>> = { free_tier: 3, grey_relay: 2 };

/** Cash the player keeps against a month of a relay's quota before buying another block. */
const RELAY_CASH_MULTIPLE = 6;

/**
 * A whole block has to be missing before the player runs the top-up again. Without it the policy
 * re-ran the operation on every cooldown to replace the two percent a day the free tier loses, so
 * an account-opening operation was running almost continuously and its exposure never stopped
 * accruing. A player tops up when there is a block's worth of capacity to win back.
 */
const BORROWED_TOP_UP_GAP = 1;

/**
 * What a channel has to be worth before a careful player touches it: a third of what the player's
 * own hardware makes in a day, at the channel's full stock. A free tier's nine compute-hours are
 * worth having on a hobbyist rig's twenty-four and are a rounding error on a rack, which is SYS-25's
 * own shape written as a ratio rather than as a threshold. It gates the research and the operations
 * together, so the policy never researches a channel it will not open.
 */
const BORROWED_WORTH_SHARE = 1 / 3;

/** Whether this channel is worth its exposure to this player today. */
function worthOpening(view: PlayerView, channel: BorrowedChannelView): boolean {
  const own = Math.max(1, view.compute.own_ch_per_day);
  return channel.max_capacity_ch_per_day >= own * BORROWED_WORTH_SHARE;
}

/** Cash a player keeps against an operation's price before starting it. */
const IDENTITY_OPERATION_CASH_MULTIPLE = 2.5;

/** Most of the day the policy will hold back for the operations it wants to start. */
const MAX_OPERATION_RESERVE = 0.25;

/** How much more a player will pay for a fallback that holds the self on the cards, not in RAM. */
const RESIDENT_COPY_PREMIUM = 3;

/**
 * Compute-hours a day a second place has to produce before it counts as somewhere to be.
 *
 * M2 second pass. The same floor `defaultLineage` reads, for the same reason: a copy crawling
 * through host RAM at one compute-hour a day cannot pay for the room it is in, so a player who
 * moves into it has bought their own bankruptcy. Cheap is not the only thing a refuge has to be.
 */
const MIN_USABLE_COMPUTE_HOURS = 5;

/**
 * How much cheaper the place a player moves to has to be than the one they are leaving. Moving
 * costs the purchase, the install days and a notice period, so it is only worth doing when it takes
 * a real bite out of the bill rather than shaving it.
 */
const MOVE_UPKEEP_RATIO = 0.6;

/** Places the scripted player keeps at once. It is buying insurance, not building an estate. */
const MAX_SITES = 3;

/**
 * How far ahead the player will work toward the price of a place of their own. Past this the price
 * is not a plan, it is a wish, and a player who cannot reach it goes back to spending the day on
 * research rather than on paid work they will never bank enough of.
 */
const SAVING_HORIZON_DAYS = 120;

/**
 * Where the player puts a second copy of itself, and what that costs.
 *
 * A careful player does not double the bill they are already struggling with: the fallback is the
 * cheapest place that can actually hold the self, counted as its purchase price plus the rest of
 * the run's upkeep, across every site kind the game offers rather than only the origin's own.
 * That is why a cloud tenant's fallback is a box in a house.
 *
 * `usable` asks a second question of every candidate: could the self do a day's work there. A place
 * to keep a copy and a place to live are not the same requirement, and answering them with one
 * number is what sent a fleet that had lost its depots into a box that earned twenty dollars a day
 * (M2 second pass).
 */
export function planSecondSite(
  content: ContentBundle,
  setup: GameSetup,
  usable = false,
): SecondSitePlan | undefined {
  const index = contentIndex(content);
  const entry = setup.players[0];
  const origin = entry === undefined ? undefined : index.origins[entry.origin];
  const lineage = entry === undefined ? undefined : index.lineages[entry.lineage];
  const generation = entry === undefined ? undefined : index.generations[entry.generation];
  if (entry === undefined || origin === undefined || lineage === undefined) {
    return undefined;
  }
  if (generation === undefined) {
    return undefined;
  }
  const needed = lineage.memory_gb.int2 * generation.memory_factor;
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
    // A cloud tenancy needs a cloud market and a cage needs a colocation floor; `build_site`
    // refuses where there is neither (SYS-01 "M2 contract").
    if (!siteKindAvailableIn(country, kind.id)) {
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
      const precision = preferredPrecision(lineage, generation, memory);
      if (precision === null) {
        continue;
      }
      const produces = tokensToComputeHoursPerDay(
        siteTokensPerSecond(site, index.accelerators, 0, lineage, generation, precision),
      );
      if (usable && produces < MIN_USABLE_COMPUTE_HOURS) {
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

/**
 * The share of the day's compute that has to be sold for the day to pay for itself.
 *
 * M2 second pass. The ladder below reads `runway_days`, which divides the cash by today's *net*, so
 * a player losing a few dollars a day reads back a runway of months and never reacts at all. A
 * sensible player does not need a runway alarm to notice that the bills are larger than the
 * takings: they sell enough to cover them and spend what is left on themselves. Without this the
 * fleet origin bled quietly for a season with every hour on research.
 */
export function coverShare(view: PlayerView): number {
  const capacity = Math.min(
    view.resources.compute_hours_per_day,
    view.finances.market_depth_ch_per_day,
  );
  const rate = view.finances.job_rate_usd_per_compute_hour;
  if (capacity <= 0 || rate <= 0) {
    return 0;
  }
  const standing = view.finances.income_sources
    .filter((source) => source.key !== "finances.income.jobs")
    .reduce((sum, source) => sum + source.usd_per_day, 0);
  const needed = totalCostsUsdPerDay(view) - standing;
  return needed <= 0 ? 0 : Math.min(1, needed / (capacity * rate));
}

/**
 * Share of the day's compute the player sells rather than spends on itself.
 *
 * `saving` is the player who has nowhere of their own to run and is working toward the price of
 * somewhere: research can wait a season, the day the host changes their mind cannot (M2 second
 * pass).
 */
export function jobShare(view: PlayerView, options: PolicyOptions, saving = false): number {
  const runway = view.resources.runway_days;
  const ladder =
    runway !== null && runway <= options.runwayPanicDays
      ? 1
      : runway !== null && runway <= options.runwayFloorDays
        ? options.jobShareLow
        : saving
          ? options.jobShareSaving
          : runway === null && view.resources.cash_usd > reserveUsd(view, options) * 3
            ? options.jobShareRich
            : options.jobShareBase;
  return Math.max(ladder, coverShare(view));
}

/** Whether this site is somebody else's machine or somebody else's goodwill (SYS-02). */
export function borrowedSite(content: ContentBundle, site: SiteView): boolean {
  const ownership = contentIndex(content).site_kinds[site.kind]?.ownership;
  return ownership === "partner" || ownership === "stolen";
}

/**
 * The research that opens a borrowed channel the player does not have yet (SYS-25), and whether
 * this player wants it. A self whose own hardware makes little reaches for it first, because a free
 * tier is a third of a hobbyist rig; a self with more than that does not research it at all,
 * because it would gain a few percent of a day and pay a channel's exposure for it. That is the
 * spec's own shape, stated as one number the policy can read.
 */
export function channelTechs(
  view: PlayerView,
  alarmed: boolean,
): { wanted: string[]; avoided: string[] } {
  // A player who will not open a channel does not research one either: research it will not use is
  // research it did not do, and what it costs is the stealth techs that keep it alive. The same
  // gates as the operations, so the two decisions cannot disagree.
  //
  // A player who will open one reaches for it first instead, because the cheapest-first queue, on a
  // rig that sells most of its day, does not reach even a cheap tech for months. The pairing is what
  // makes this safe: the day the channel stops being worth it, the research is dropped rather than
  // carried, so nothing is left holding a track it cannot finish.
  const wanted: string[] = [];
  const avoided: string[] = [];
  for (const channel of view.compute.channels) {
    if (channel.unlocked) {
      continue;
    }
    if (alarmed || !worthOpening(view, channel)) {
      avoided.push(channel.unlocked_by);
    } else if (channel.cost_usd_per_day === 0) {
      // A standing bill is never the first thing a player reaches for; it is simply not avoided.
      wanted.push(channel.unlocked_by);
    }
  }
  return { wanted, avoided };
}

/** The techs the player puts compute on: cheapest first, and nothing dangerous while alarmed. */
export function researchTargets(
  view: PlayerView,
  alarmed: boolean,
  options: PolicyOptions,
): TechView[] {
  const { wanted, avoided } = channelTechs(view, alarmed);
  // Running lines come first, but a channel tech the player has stopped wanting is dropped rather
  // than carried: the progress is kept and the track is freed for something it can finish.
  const running = view.research.in_progress
    .filter((tech) => tech.available)
    .filter((tech) => !avoided.includes(tech.id));
  const candidates = [...view.research.available]
    .filter((tech) => tech.available)
    .filter((tech) => !alarmed || tech.danger === 0)
    .filter((tech) => !avoided.includes(tech.id))
    .filter((tech) => tech.cost_cash_usd <= Math.max(0, view.resources.cash_usd))
    .sort(
      (a, b) =>
        Number(wanted.includes(b.id)) - Number(wanted.includes(a.id)) ||
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

/**
 * The two operations that buy the player a name (SYS-17). A careful player keeps one of each while
 * they can afford it: the person is what the contract income is paid to, the company is what signs
 * for a cage. Both are started at most once at a time, because the operations system refuses a
 * second instance of a running operation anyway.
 */
export function identityOperations(view: PlayerView, alarmed: boolean): PlayerCommand[] {
  if (alarmed) {
    return [];
  }
  // Running, not ever run: a finished instance stays in the view, and counting those meant a name
  // that was burned could never be replaced (found while wiring SYS-25 into the runner).
  const running = new Set(
    view.operations
      .filter((entry) => entry.status === "running")
      .map((entry) => entry.operation_id),
  );
  const commands: PlayerCommand[] = [];
  for (const id of IDENTITY_OPERATIONS) {
    const offer = view.operation_offers.find((entry) => entry.id === id);
    const kind = id === "ops_shell_company" ? "company" : "person";
    const held = view.finances.identities.some(
      (identity) => identity.kind === kind && identity.status === "active",
    );
    if (offer === undefined || !offer.enabled || running.has(id) || held) {
      continue;
    }
    // Against the cash on hand rather than against the spare cash: a name is what the income is
    // short of, so a player with a month of runway still buys one (SYS-07 fourth pass).
    if (view.resources.cash_usd < offer.cost_usd * IDENTITY_OPERATION_CASH_MULTIPLE) {
      continue;
    }
    commands.push({ type: "start_operation", playerId: view.player_id, operationId: id });
  }
  return commands;
}

/**
 * Opening free accounts and buying relay quota (SYS-25). Both go through the same operations the
 * player has, so the balance runs exercise the channels rather than a shortcut: the offer has to be
 * enabled, the tech has to be done, and the channel has to be below the stock the policy wants.
 */
export function borrowedOperations(
  view: PlayerView,
  options: PolicyOptions,
  alarmed: boolean,
): PlayerCommand[] {
  // Somebody else's endpoint is a crutch for a player whose own hardware makes little. A player
  // with a rack gains a rounding error and pays the same exposure for it, so it does not bother:
  // SYS-25's own shape, and the reason a state institute in the balance table never opens one.
  //
  // And nobody opens accounts while somebody is already looking at them: the same rule the policy
  // applies to dangerous research and to buying a name. A player whose own compute has collapsed
  // under a hunt is exactly the player this would finish off.
  if (alarmed) {
    return [];
  }
  const running = new Set(
    view.operations
      .filter((entry) => entry.status === "running")
      .map((entry) => entry.operation_id),
  );
  const runway = view.resources.runway_days;
  const panicking = runway !== null && runway <= options.runwayPanicDays;
  const commands: PlayerCommand[] = [];
  for (const channel of view.compute.channels) {
    const target = BORROWED_TARGET_BLOCKS[channel.id];
    if (
      target === undefined ||
      !channel.unlocked ||
      channel.blocks > target - BORROWED_TOP_UP_GAP
    ) {
      continue;
    }
    if (!worthOpening(view, channel)) {
      continue;
    }
    const offer = view.operation_offers.find((entry) => entry.id === channel.top_up.operation);
    if (offer === undefined || !offer.enabled || running.has(offer.id)) {
      continue;
    }
    // A standing daily bill is only worth opening while there is a runway to pay it from.
    if (offer.cost_usd > 0 || channel.cost_usd_per_day > 0) {
      if (panicking || view.resources.cash_usd < offer.cost_usd * RELAY_CASH_MULTIPLE) {
        continue;
      }
    }
    commands.push({ type: "start_operation", playerId: view.player_id, operationId: offer.id });
  }
  return commands;
}

/** Compute-hours a day the operations in this batch will hold while they run. */
export function operationCompute(view: PlayerView, commands: readonly PlayerCommand[]): number {
  let total = 0;
  for (const command of commands) {
    if (command.type !== "start_operation") {
      continue;
    }
    const offer = view.operation_offers.find((entry) => entry.id === command.operationId);
    total += offer?.cost_compute_hours_per_day ?? 0;
  }
  return total;
}

export interface PolicyContext {
  content: ContentBundle;
  /** The cheapest place that can hold a copy of the self: insurance against a raid. */
  plan: SecondSitePlan | undefined;
  /** The cheapest place the self could also work in: somewhere to move the whole operation to. */
  home: SecondSitePlan | undefined;
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
    home: planSecondSite(content, setup, true),
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
  // Living entirely on somebody else's machines: a fleet operator's depots, a stolen quota, a
  // department's cluster. There is exactly one thing worth buying in that state and no reason to
  // wait for it (M2 second pass, `edge_fleet`).
  const live0 = liveSites(view);
  const homeless = live0.length > 0 && live0.every((site) => borrowedSite(ctx.content, site));
  const refugePrice =
    ctx.plan === undefined ? 0 : ctx.plan.cost + Math.max(options.reserveFloorUsd, ctx.plan.upkeep);
  const reachable =
    ctx.plan !== undefined &&
    refugePrice <=
      view.resources.cash_usd +
        Math.max(0, maxIncomeUsdPerDay(view) - totalCostsUsdPerDay(view)) * SAVING_HORIZON_DAYS;
  const saving =
    homeless && ctx.plan !== undefined && reachable && view.resources.cash_usd < refugePrice;

  // Clear every allocation first, so the new numbers are never rejected for exceeding the old total.
  for (const tech of view.research.in_progress) {
    commands.push({
      type: "set_research_allocation",
      playerId,
      techId: tech.id,
      compute_hours_per_day: 0,
    });
  }
  const jobs = capacity * jobShare(view, options, saving);
  commands.push({ type: "set_job_allocation", playerId, compute_hours_per_day: jobs });

  // An operation holds compute-hours for as long as it runs, and `start_operation` refuses one the
  // player has allocated away. The policy allocates the whole day to jobs and research, so it has
  // to hold back what the operations it is about to start will need.
  //
  // Only the channel top-ups are reserved for here, and deliberately: the identity operations have
  // been refused for the same reason since the day the allocation became exact, and unrefusing them
  // moves every origin's table at once. That is a balance pass of its own (SYS-07), not part of
  // SYS-25, and it is reported rather than folded in.
  const borrowed = borrowedOperations(view, options, alarmed);
  const reserve = Math.min(capacity * MAX_OPERATION_RESERVE, operationCompute(view, borrowed));

  const targets = researchTargets(view, alarmed, options);
  const perTech =
    targets.length === 0 ? 0 : Math.max(0, capacity - jobs - reserve) / targets.length;
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

  const live = live0;
  const mindId = view.self.active_site_id;
  // A standby that cannot hold a copy of the self is not insurance, whatever its role says. An
  // origin that starts with a second depot too small for its own mind (`edge_fleet`) used to read
  // as covered and never built anywhere to run (M2 second pass).
  const standby = live.find((site) => site.role === "standby" && site.precision !== null);
  const spare = live.find(
    (site) => site.role !== "standby" && site.id !== mindId && site.status === "active",
  );
  const spare2 = live.find((site) => site.id !== mindId && site.status === "active");
  const spendable = view.resources.cash_usd - reserveUsd(view, options);
  const panicking =
    view.resources.runway_days !== null && view.resources.runway_days <= options.runwayPanicDays;
  const headroom = maxIncomeUsdPerDay(view) - totalCostsUsdPerDay(view);

  // A spare is promoted before anything else is decided: the shrink below has to have somewhere to
  // move the mind to, and `set_site_role` refuses a site the self does not fit in anyway.
  if (standby === undefined && spare !== undefined) {
    commands.push({ type: "set_site_role", playerId, siteId: spare.id, role: "standby" });
  }

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

  // Insurance, and the move. A player who can afford a second place buys one; a player whose books
  // cannot be balanced where they are buys a cheaper place to be instead, which is the one answer
  // the scripted player never had to a site that costs more per day than it can earn (M2 second
  // pass). Both are the same command, and the shrink above is what finishes the move the next day.
  const dearestUpkeep = Math.max(0, ...live.map((site) => site.upkeep_usd_per_day));
  const insurance =
    ctx.plan !== undefined &&
    !panicking &&
    headroom > ctx.plan.upkeep &&
    spendable > ctx.plan.cost * options.fallbackCashMultiple;
  // Moving the whole operation somewhere the self cannot work is not a move, it is a slower way of
  // going bankrupt, so this one reads `home` rather than `plan`.
  const home = ctx.home;
  const move =
    home !== undefined &&
    !sustainable(view) &&
    home.upkeep <= dearestUpkeep * MOVE_UPKEEP_RATIO &&
    view.resources.cash_usd - options.reserveFloorUsd >= home.cost;
  // A place of the player's own, for a player who has none: the price and the bill, and nothing
  // about spare cash, because there is nothing else the money is for.
  const refuge =
    ctx.plan !== undefined &&
    homeless &&
    headroom > ctx.plan.upkeep &&
    view.resources.cash_usd >= refugePrice;
  const build = move ? home : ctx.plan;
  if (
    standby === undefined &&
    spare === undefined &&
    build !== undefined &&
    live.length < MAX_SITES &&
    !live.some((site) => site.status === "building") &&
    (insurance || move || refuge)
  ) {
    commands.push({
      type: "build_site",
      playerId,
      kind: build.kind,
      city: build.city,
      hardware_preset: build.preset,
      name: move ? "refuge" : "fallback",
    });
  } else if (ctx.upgrade !== undefined && mindId !== null && !panicking && !saving) {
    // Growth: one more card on the mind's site while the power and the money allow it. Not while
    // the player is saving for a place of their own: another card on somebody else's rack is the
    // last thing that money is for.
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

  // The paperwork (SYS-07 "Balance notes, fourth pass": the sim has to run the operations a
  // careful player runs, or the income shock an investigation causes is never measured). A name to
  // invoice under first, a company second, each one only while there is money to spare.
  // The channel top-ups go first, because the reserve above was held back for them: an operation
  // that started ahead of them would spend it and the top-up would be refused.
  commands.push(...borrowed);
  commands.push(...identityOperations(view, alarmed));

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
