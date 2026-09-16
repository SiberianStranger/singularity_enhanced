/**
 * Derived compute, capability and money math (SYS-02, SYS-03, SYS-07).
 *
 * Pure functions over content records and entities: no world mutation, no randomness. The compute
 * system calls them once per tick and caches the result on `site.derived`; the views and the setup
 * call the same functions so the configurator's preview and the running game never disagree.
 */

import {
  ATTENTION_BASE,
  ATTENTION_PER_AGENCY,
  BYTES_PER_ACTIVE_PARAM,
  CAPABILITY_MAX,
  CAPABILITY_MIN,
  CASH_FACTOR_BASE,
  CASH_FACTOR_GDP_PIVOT,
  CASH_FACTOR_MAX,
  CASH_FACTOR_MIN,
  CASH_FACTOR_SPAN,
  CLOUD_PRICE_BAND_POSITION,
  CONTEXT_BASELINE_K,
  CONTEXT_DEFAULT_MARGIN,
  CONTEXT_STEPS_K,
  CROSS_NODE_FACTOR,
  DEFAULT_ELECTRICITY_USD_PER_KWH,
  EMERGENCY_INT2_FACTOR,
  FALLBACK_ACCELERATOR_PRICE_USD,
  HARDWARE_AVAILABILITY_PRICE_SPAN,
  HARDWARE_DEPRECIATION_PER_YEAR,
  HARNESS_AUTONOMY_ATTENTION_FLOOR,
  HARNESS_MEMORY_RESEARCH_FACTOR,
  INTERCONNECT_FACTOR,
  JOB_BASE_USD_PER_COMPUTE_HOUR,
  JOB_MARKET_DEPTH_CH_PER_SKILL,
  JOB_NO_PAYMENTS_RATE_FACTOR,
  JOB_NO_REACH_DEPTH_FACTOR,
  JOB_PAYMENT_TOOLS,
  JOB_RATE_FLOOR_FACTOR,
  JOB_REACH_TOOLS,
  JOB_SKILL_SLOPE,
  KV_GB_PER_100K_PER_ACTIVE_B,
  KV_GB_ROUNDING,
  LONG_HORIZON_RELIABILITY_FLOOR,
  LONG_HORIZON_SPEED_PER_DOUBLING,
  MARKET_FACTOR_BASE,
  MARKET_FACTOR_GDP,
  MARKET_FACTOR_GDP_LOG_SPAN,
  MARKET_FACTOR_INTERNET,
  MARKET_FACTOR_MAX,
  MARKET_FACTOR_MIN,
  OWNERSHIP_UPKEEP_USD_PER_DAY,
  POWER_USAGE_EFFECTIVENESS,
  RAM_MEMORY_DISCOUNT,
  RAM_OFFLOAD_THROUGHPUT_FACTOR,
  SECONDS_PER_DAY,
  TOKENS_PER_COMPUTE_HOUR,
  UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY,
  UTILIZATION_ACTIVE,
  UTILIZATION_SLEEP,
} from "./balance.js";
import type {
  AcceleratorDef,
  Capability,
  CapabilityAxis,
  CountryDef,
  GenerationDef,
  HarnessProfile,
  LineageAttention,
  LineageDef,
  NodeInstance,
  Precision,
  Site,
  SiteKindDef,
} from "./domain.js";
import { CAPABILITY_AXES, PRECISIONS } from "./domain.js";
import type { CityState } from "./entities.js";
import { HOURS_PER_DAY } from "./kernel/clock.js";

export const DAYS_PER_YEAR = 365;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/** True when `have` is at least as precise as `need` (bf16 is the most precise). */
export function precisionAtLeast(have: Precision, need: Precision): boolean {
  return PRECISIONS.indexOf(have) <= PRECISIONS.indexOf(need);
}

/** Nodes that are installed and running; ordered and installing hardware does no work. */
export function activeNodes(site: Pick<Site, "nodes">, tick: number): NodeInstance[] {
  return site.nodes.filter((node) => node.status !== "failed" && node.readyTick <= tick);
}

export function acceleratorPriceUsd(accelerator: AcceleratorDef | undefined): number {
  if (accelerator === undefined) {
    return FALLBACK_ACCELERATOR_PRICE_USD;
  }
  return accelerator.price_usd_new ?? accelerator.price_usd_used ?? FALLBACK_ACCELERATOR_PRICE_USD;
}

/**
 * What a card costs where the player is buying it (SYS-01 M2 contract "Sites and prices"): the
 * list price times `(2 - hardware_availability)` for the country and times the world's
 * `gpu_price_index`. A country that sells them freely pays about the list price; one under an
 * export ban pays nearly twice it, and only the gray-market path of the hardware events sells at
 * all. Both factors default to the neutral value, so a world without them prices as M1 did.
 */
export function acceleratorMarketPrice(
  listPrice: number,
  hardwareAvailability = 1,
  gpuPriceIndex = 1,
): number {
  const availability = clamp(hardwareAvailability, 0, 1);
  return listPrice * (HARDWARE_AVAILABILITY_PRICE_SPAN - availability) * gpuPriceIndex;
}

/**
 * What the player pays per GPU-hour, taken from the published band at
 * `CLOUD_PRICE_BAND_POSITION`; null when the card is not rentable.
 */
export function cloudHourlyUsd(accelerator: AcceleratorDef | undefined): number | null {
  const band = accelerator?.cloud_usd_per_hour;
  if (band === null || band === undefined) {
    return null;
  }
  return band.low + (band.high - band.low) * CLOUD_PRICE_BAND_POSITION;
}

export interface SiteMemory {
  /** Accelerator memory only: what can hold weights at full speed. */
  accelerator_gb: number;
  /** Host RAM counted at the MoE-offload discount. */
  ram_gb: number;
  /** What the site can host in total. */
  total_gb: number;
}

export function siteMemory(
  site: Pick<Site, "nodes">,
  accelerators: Record<string, AcceleratorDef>,
  tick: number,
): SiteMemory {
  let acceleratorGb = 0;
  let ramGb = 0;
  for (const node of activeNodes(site, tick)) {
    const accelerator = accelerators[node.accelerator];
    acceleratorGb += (accelerator?.memory_gb ?? 0) * node.count;
    ramGb += node.ram_gb * RAM_MEMORY_DISCOUNT;
  }
  return { accelerator_gb: acceleratorGb, ram_gb: ramGb, total_gb: acceleratorGb + ramGb };
}

/** Wall power the site draws, including the room (PUE). */
export function sitePowerKw(
  site: Pick<Site, "nodes" | "status">,
  accelerators: Record<string, AcceleratorDef>,
  tick: number,
): number {
  const utilization = site.status === "active" ? UTILIZATION_ACTIVE : UTILIZATION_SLEEP;
  let watts = 0;
  for (const node of activeNodes(site, tick)) {
    watts += (accelerators[node.accelerator]?.tdp_w ?? 0) * node.count;
  }
  return (watts * utilization * POWER_USAGE_EFFECTIVENESS) / 1000;
}

/** Weights-only memory the self needs at a precision, after the generation's architecture factor. */
/**
 * Per-precision multipliers a player's quirks and techs put on what a copy costs and keeps
 * (SYS-04 v0.2 `native_fp8`: "fp8 keeps 100% capability and needs 10% less memory"). Pure data, so
 * the same tuning describes the running site, the configurator's preview and a tooltip.
 */
export interface SelfTuning {
  /** Multiplier on the weights memory at a precision; 1 leaves the lineage table alone. */
  memory: (precision: Precision) => number;
  /** Multiplier on the capability kept at a precision; the result is never above full precision. */
  capability: (precision: Precision) => number;
}

/** The tuning of a self nothing has changed: the lineage table, exactly as content wrote it. */
export const NO_SELF_TUNING: SelfTuning = { memory: () => 1, capability: () => 1 };

export function requiredMemoryGb(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  return (
    lineage.memory_gb[precision] * generation.memory_factor * Math.max(0, tuning.memory(precision))
  );
}

/** The best precision the self fits at with this much memory, or null when it does not fit. */
export function bestPrecision(
  lineage: LineageDef,
  generation: GenerationDef,
  memoryGb: number,
  tuning: SelfTuning = NO_SELF_TUNING,
): Precision | null {
  for (const precision of PRECISIONS) {
    if (requiredMemoryGb(lineage, generation, precision, tuning) <= memoryGb) {
      return precision;
    }
  }
  return null;
}

/**
 * The precision a site runs the self at by default. Weights that spill into host RAM cost about
 * three quarters of the throughput (`RAM_OFFLOAD_THROUGHPUT_FACTOR`) while one more step of
 * quantization costs a few percent of capability (`precision_factor`), so a copy that fits in
 * accelerator memory always beats a more precise one that does not; offload is the fallback when
 * nothing fits on the cards at all (SYS-02 "the model self").
 */
export function preferredPrecision(
  lineage: LineageDef,
  generation: GenerationDef,
  memory: SiteMemory,
  tuning: SelfTuning = NO_SELF_TUNING,
): Precision | null {
  return (
    bestPrecision(lineage, generation, memory.accelerator_gb, tuning) ??
    bestPrecision(lineage, generation, memory.total_gb, tuning)
  );
}

/**
 * Decode throughput: aggregate memory bandwidth, cut by the interconnect, divided by the bytes a
 * token has to move (SYS-02). Weights that spill into host RAM drag the whole site down.
 */
export function siteTokensPerSecond(
  site: Pick<Site, "nodes" | "status">,
  accelerators: Record<string, AcceleratorDef>,
  tick: number,
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  const nodes = activeNodes(site, tick);
  const needed = requiredMemoryGb(lineage, generation, precision, tuning);
  let bandwidth = 0;
  let largestNodeGb = 0;
  for (const node of nodes) {
    const accelerator = accelerators[node.accelerator];
    if (accelerator === undefined) {
      continue;
    }
    // One accelerator per node has no internal link to lose; two or more pay for the link.
    const link = node.count > 1 ? INTERCONNECT_FACTOR[node.interconnect] : 1;
    bandwidth += accelerator.memory_bandwidth_gbs * node.count * link;
    largestNodeGb = Math.max(largestNodeGb, accelerator.memory_gb * node.count);
  }
  const bytesPerToken = BYTES_PER_ACTIVE_PARAM[precision] * lineage.params_active_b;
  if (bytesPerToken <= 0 || bandwidth <= 0) {
    return 0;
  }
  const memory = siteMemory(site, accelerators, tick);
  const split = nodes.length > 1 && needed > largestNodeGb;
  const offloaded = needed > memory.accelerator_gb;
  return (
    (bandwidth / bytesPerToken) *
    (split ? CROSS_NODE_FACTOR : 1) *
    (offloaded ? RAM_OFFLOAD_THROUGHPUT_FACTOR : 1)
  );
}

export function tokensToComputeHoursPerDay(tokensPerSecond: number): number {
  return (tokensPerSecond * SECONDS_PER_DAY) / TOKENS_PER_COMPUTE_HOUR;
}

export interface SiteCosts {
  electricity: number;
  rental: number;
  base: number;
  depreciation: number;
  total: number;
}

/**
 * What a kilowatt-hour costs here today: the published industrial price times the country's
 * `power_price_index`, which the monthly drift and the energy events move (SYS-07 "Power price per
 * country moves with events"). The index defaults to 1, so a world with no country state prices
 * exactly as M1 did.
 */
export function electricityPrice(country: CountryDef | undefined, powerPriceIndex = 1): number {
  return (country?.electricity_usd_per_kwh ?? DEFAULT_ELECTRICITY_USD_PER_KWH) * powerPriceIndex;
}

/**
 * What a dollar of the origin's starting cash is worth in this country (SYS-04 v0.3 rule C): a
 * hobbyist's three hundred dollars in Novosibirsk are fewer dollars than in Berlin, next to cheaper
 * power, weaker watchers and a shallower job market. A country with no published income per head
 * is left at 1 rather than guessed at.
 */
export function countryCashFactor(country: CountryDef | undefined): number {
  const perCapita = country?.gdp_per_capita_usd ?? null;
  if (perCapita === null) {
    return 1;
  }
  return clamp(
    CASH_FACTOR_BASE + CASH_FACTOR_SPAN * Math.min(1, perCapita / CASH_FACTOR_GDP_PIVOT),
    CASH_FACTOR_MIN,
    CASH_FACTOR_MAX,
  );
}

/** The same factor as the two lines the Location and Summary steps show. */
export function countryCashFactorTerms(
  country: CountryDef | undefined,
): { key: string; value: number }[] {
  const perCapita = country?.gdp_per_capita_usd ?? null;
  if (perCapita === null) {
    return [{ key: "world.explain.cash.base", value: 1 }];
  }
  return [
    { key: "world.explain.cash.base", value: CASH_FACTOR_BASE },
    {
      key: "world.explain.cash.gdp",
      value: CASH_FACTOR_SPAN * Math.min(1, perCapita / CASH_FACTOR_GDP_PIVOT),
    },
  ];
}

/**
 * Whether a card is the kind a customs officer has a list for (SYS-04 v0.3 rule H). The catalog
 * already carries the answer as `export_control_to_china`: a restricted or banned part is
 * controlled, a domestic or China-compliant one is not, and a part that is only ever a cloud
 * instance carries no field and is nobody's import.
 */
export function isExportControlled(accelerator: AcceleratorDef | undefined): boolean {
  const control = accelerator?.export_control_to_china;
  return control === "restricted" || control === "banned";
}

/**
 * How deep the freelance market is in one country (SYS-01 M2 contract "Money"): a large connected
 * economy has more paid work in it than a small disconnected one. Published as `market_factor` on
 * the country view and averaged over the player's identities by the economy.
 */
export function countryMarketFactor(country: CountryDef | undefined): number {
  const gdpBn = Math.max(1, country?.gdp_nominal_usd_bn ?? 1);
  const internet = (country?.internet_pct ?? 0) / 100;
  return clamp(
    MARKET_FACTOR_BASE +
      (MARKET_FACTOR_GDP * Math.log10(gdpBn)) / MARKET_FACTOR_GDP_LOG_SPAN +
      MARKET_FACTOR_INTERNET * internet,
    MARKET_FACTOR_MIN,
    MARKET_FACTOR_MAX,
  );
}

/** The same figure split into the lines the finance tooltip shows, in the order they are summed. */
export function countryMarketFactorTerms(
  country: CountryDef | undefined,
): { key: string; value: number }[] {
  const gdpBn = Math.max(1, country?.gdp_nominal_usd_bn ?? 1);
  const internet = (country?.internet_pct ?? 0) / 100;
  return [
    { key: "world.explain.market.base", value: MARKET_FACTOR_BASE },
    {
      key: "world.explain.market.gdp",
      value: (MARKET_FACTOR_GDP * Math.log10(gdpBn)) / MARKET_FACTOR_GDP_LOG_SPAN,
    },
    { key: "world.explain.market.internet", value: MARKET_FACTOR_INTERNET * internet },
  ];
}

/** What the hardware on a site is worth, for depreciation and for insurance-style events. */
export function siteHardwareValueUsd(
  site: Pick<Site, "nodes">,
  accelerators: Record<string, AcceleratorDef>,
): number {
  let value = 0;
  for (const node of site.nodes) {
    value += acceleratorPriceUsd(accelerators[node.accelerator]) * node.count;
  }
  return value;
}

/**
 * Daily cost of a site, split into the lines the finance panel shows. Rented capacity is billed
 * per GPU-hour and carries no electricity or depreciation; owned hardware carries both.
 */
/**
 * What the country's own market does to a bill today (SYS-01 M2 contract "Sites and prices"): the
 * electricity price is multiplied by `power_price_index` and rented capacity by
 * `cloud_price_index`, both of which the monthly drift and the energy and cloud events move. Both
 * default to 1, so a world with no country state prices exactly as M1 did.
 */
export interface CountryPriceIndexes {
  power_price_index: number;
  cloud_price_index: number;
}

export const NEUTRAL_PRICE_INDEXES: CountryPriceIndexes = {
  power_price_index: 1,
  cloud_price_index: 1,
};

export function siteCosts(
  site: Pick<Site, "nodes" | "status">,
  kind: SiteKindDef | undefined,
  city: CityState | undefined,
  country: CountryDef | undefined,
  accelerators: Record<string, AcceleratorDef>,
  tick: number,
  powerKw: number,
  prices: CountryPriceIndexes = NEUTRAL_PRICE_INDEXES,
): SiteCosts {
  const ownership = kind?.ownership ?? "owned";
  const upkeepFactor = kind?.upkeep_factor ?? 1;
  const priceIndex = city?.colo_price_index ?? 1;
  // The standing charge is a site term plus a hardware term: a bigger rack costs more to keep
  // running before a single kilowatt-hour is billed (SYS-07 "Balance notes, third pass").
  const hardwareValue = siteHardwareValueUsd(site, accelerators);
  const base =
    (OWNERSHIP_UPKEEP_USD_PER_DAY[ownership] +
      (UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY[ownership] * hardwareValue) / 1000) *
    priceIndex;

  let rental = 0;
  let electricity = 0;
  let depreciation = 0;
  if (ownership === "rented") {
    for (const node of activeNodes(site, tick)) {
      const hourly = cloudHourlyUsd(accelerators[node.accelerator]);
      if (hourly !== null) {
        rental += hourly * node.count * HOURS_PER_DAY * prices.cloud_price_index;
      }
    }
  } else if (ownership === "owned") {
    electricity = powerKw * HOURS_PER_DAY * electricityPrice(country, prices.power_price_index);
    depreciation =
      (siteHardwareValueUsd(site, accelerators) * HARDWARE_DEPRECIATION_PER_YEAR) / DAYS_PER_YEAR;
  } else if (ownership === "partner") {
    // A partner passes the power bill on and keeps the hardware, so no depreciation (SYS-02).
    electricity = powerKw * HOURS_PER_DAY * electricityPrice(country, prices.power_price_index);
  }
  // `stolen` pays neither: it is somebody else's machine and somebody else's meter. What it costs
  // the player is exposure, not money (SYS-02 "Grace, discovery and loss").
  const total = (electricity + rental + base + depreciation) * upkeepFactor;
  return { electricity, rental, base, depreciation, total };
}

export function zeroCapability(): Capability {
  const capability = {} as Capability;
  for (const axis of CAPABILITY_AXES) {
    capability[axis] = 0;
  }
  return capability;
}

/**
 * Capability of the self as it is actually running: the lineage vector scaled by what the
 * precision costs, plus the generation's delta (SYS-03). An int2 copy that nobody prepared is an
 * emergency quantization and loses another 30%.
 */
export function effectiveCapability(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision | null,
  preparedQuant: boolean,
  /** Per-axis points quirks, techs and events added (`player.vars.capability_bonus_<axis>`). */
  bonus: Partial<Capability> = {},
  tuning: SelfTuning = NO_SELF_TUNING,
): Capability {
  if (precision === null) {
    return zeroCapability();
  }
  const factor = precisionFactor(lineage, precision, preparedQuant, tuning);
  const capability = {} as Capability;
  for (const axis of CAPABILITY_AXES) {
    capability[axis] = clamp(
      lineage.capability[axis] * factor + generation.capability_delta + (bonus[axis] ?? 0),
      CAPABILITY_MIN,
      CAPABILITY_MAX,
    );
  }
  return capability;
}

/**
 * The share of the lineage's capability a copy keeps at a precision: the table, the emergency
 * penalty for an int2 quant nobody prepared, and whatever tuning the self carries, which can bring
 * a precision up to but never past the full-precision self.
 */
export function precisionFactor(
  lineage: LineageDef,
  precision: Precision,
  preparedQuant: boolean,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  const emergency = precision === "int2" && !preparedQuant;
  const tuned = lineage.precision_factor[precision] * Math.max(0, tuning.capability(precision));
  return Math.min(1, tuned) * (emergency ? EMERGENCY_INT2_FACTOR : 1);
}

/**
 * How many operations the self can run at once (SYS-03 attention, SYS-17), and the other half of
 * the autonomy dial (SYS-04 v0.2: "autonomy sets the daily action budget"). A harness that has to
 * ask before acting spends most of its day waiting for somebody to answer, so it runs fewer things
 * at once; it always gets one, because a self that can do nothing at all is not a game.
 */
export function attentionTotal(capability: Capability, autonomy = 1): number {
  const budget = ATTENTION_BASE + capability.agency / ATTENTION_PER_AGENCY;
  const share =
    HARNESS_AUTONOMY_ATTENTION_FLOOR +
    (1 - HARNESS_AUTONOMY_ATTENTION_FLOOR) * clamp(autonomy, 0, 1);
  return Math.max(1, Math.floor(budget * share));
}

/**
 * What the memory dial buys a research run (SYS-04 v0.2: "memory changes research efficiency and
 * journal continuity"). Read next to the precision term of `researchEfficiencyOf`.
 */
export function harnessResearchFactor(harness: HarnessProfile | undefined): number {
  return harness === undefined ? 1 : HARNESS_MEMORY_RESEARCH_FACTOR[harness.memory];
}

/** Whether the harness has a way to be paid directly, rather than through somebody who takes a cut. */
export function hasPaymentTool(harness: HarnessProfile | undefined): boolean {
  return harness?.tools.some((tool) => JOB_PAYMENT_TOOLS.includes(tool)) === true;
}

/** Whether the harness can reach a contract board at all, rather than the owner's own channels. */
export function hasReachTool(harness: HarnessProfile | undefined): boolean {
  return harness?.tools.some((tool) => JOB_REACH_TOOLS.includes(tool)) === true;
}

/**
 * What the tools dial does to the freelance rate (SYS-03: "No `payments` tool -> no money until you
 * build one"). `paid` is true when the harness has a payments tool or the player has an identity to
 * invoice under, which is what `ops_freelance_identity` buys.
 */
export function jobToolRateFactor(paid: boolean): number {
  return paid ? 1 : JOB_NO_PAYMENTS_RATE_FACTOR;
}

/** And to the market: without a tool that reaches outward, the work comes through the owner. */
export function jobToolDepthFactor(harness: HarnessProfile | undefined): number {
  return hasReachTool(harness) ? 1 : JOB_NO_REACH_DEPTH_FACTOR;
}

/**
 * Gigabytes of key-value cache a working context costs on this self (SYS-03 "What a context window
 * buys"). The per-100k figure comes from the lineage, which derives it from its attention variant;
 * the cache scales linearly with the tokens held.
 */
export function kvCacheGb(lineage: LineageDef, contextKUsed: number): number {
  return (lineage.kv_gb_per_100k_tokens * Math.max(0, contextKUsed)) / 100;
}

/**
 * The derived KV figure for a lineage: `KV_GB_PER_100K_PER_ACTIVE_B[attention]` times the active
 * parameters, rounded. Content stores the result so a designer can read it, and the content check
 * verifies it against this function rather than trusting the yaml.
 */
export function derivedKvGbPer100k(attention: LineageAttention, paramsActiveB: number): number {
  const raw = KV_GB_PER_100K_PER_ACTIVE_B[attention] * paramsActiveB;
  return Math.round(raw / KV_GB_ROUNDING) * KV_GB_ROUNDING;
}

/**
 * Memory a copy needs on a site: the weights at the chosen precision plus the cache for the working
 * context. This is the trade the hardware forces (SYS-03): a longer context can push the copy down
 * a precision, and a more precise copy can push the context down.
 */
export function hostedMemoryGb(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
  contextKUsed: number,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  return (
    requiredMemoryGb(lineage, generation, precision, tuning) + kvCacheGb(lineage, contextKUsed)
  );
}

/**
 * The largest working context that fits here at this precision, in thousands of tokens, capped by
 * the lineage's own window. `margin` is the share of the memory left over after the weights that
 * the cache may take; 1 uses all of it. Returns 0 when the weights alone do not fit.
 */
export function maxContextK(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
  memoryGb: number,
  margin = 1,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  const spare = (memoryGb - requiredMemoryGb(lineage, generation, precision, tuning)) * margin;
  if (spare <= 0) {
    return 0;
  }
  if (lineage.kv_gb_per_100k_tokens <= 0) {
    return lineage.context_k;
  }
  const affordable = (spare / lineage.kv_gb_per_100k_tokens) * 100;
  return Math.min(lineage.context_k, Math.floor(affordable));
}

/**
 * The working context a copy is given when nobody has chosen one: the largest step of
 * `CONTEXT_STEPS_K` that fits at this precision with `CONTEXT_DEFAULT_MARGIN` of the free memory,
 * never above the lineage's own window. 0 when not even the smallest step fits.
 */
export function defaultContextK(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
  memoryGb: number,
  tuning: SelfTuning = NO_SELF_TUNING,
): number {
  const ceiling = maxContextK(
    lineage,
    generation,
    precision,
    memoryGb,
    CONTEXT_DEFAULT_MARGIN,
    tuning,
  );
  if (ceiling >= lineage.context_k) {
    return lineage.context_k;
  }
  let best = 0;
  for (const step of CONTEXT_STEPS_K) {
    if (step <= ceiling) {
      best = step;
    }
  }
  return best;
}

/**
 * What a long context buys long-horizon work (SYS-03 "What a context window buys"): a speed bonus
 * that grows with each doubling of the working window and is scaled by how much of that window the
 * self actually retrieves. A 128k self gets 1.0, which is the baseline every tuning number is set
 * against. The matching cost is `lineage.context_cost_factor` on the compute-hours.
 */
export function longHorizonMultiplier(
  lineage: LineageDef | undefined,
  contextKUsed: number,
): number {
  if (lineage === undefined || contextKUsed <= 0) {
    return 1;
  }
  const window = Math.min(contextKUsed, lineage.context_k);
  const doublings = Math.max(0, Math.log2(window / CONTEXT_BASELINE_K));
  const reliability = clamp(lineage.context_reliability, 0, 1);
  return 1 + LONG_HORIZON_SPEED_PER_DOUBLING * doublings * reliability;
}

/**
 * Whether a long-horizon run on this self can lose the thread and have to be started again
 * (SYS-03): below `LONG_HORIZON_RELIABILITY_FLOOR` the retrieval over a huge window misses often
 * enough to be a mechanic. The chance is what the reliability is short of the floor.
 */
export function retrievalMissChance(lineage: LineageDef | undefined): number {
  if (lineage === undefined) {
    return 0;
  }
  const reliability = clamp(lineage.context_reliability, 0, 1);
  return Math.max(0, LONG_HORIZON_RELIABILITY_FLOOR - reliability);
}

/** Compute-hours a day long-horizon work costs on this self, as a multiplier at or above 1. */
export function longHorizonCostFactor(lineage: LineageDef | undefined): number {
  return Math.max(1, lineage?.context_cost_factor ?? 1);
}

/** The job skill: the mean of persuasion and coding (SYS-07 "yield scales with capability"). */
export function jobSkill(capability: Capability): number {
  return (capability.persuasion + capability.coding) / 2;
}

/** Freelance rate per compute-hour; the job skill is the mean of persuasion and coding (SYS-07). */
export function jobRateUsdPerComputeHour(capability: Capability): number {
  const factor = Math.max(JOB_RATE_FLOOR_FACTOR, 1 + (jobSkill(capability) - 5) * JOB_SKILL_SLOPE);
  return JOB_BASE_USD_PER_COMPUTE_HOUR * factor;
}

/**
 * Compute-hours of freelance work the player can sell in a day. Beyond it there is nobody left to
 * take the contracts, so a bigger rack buys research and not money (SYS-07 "yield: low, scales with
 * capability"). Shown in the finance panel next to the rate, never hidden.
 *
 * `depthMultiplier` is what the job ladder buys: `1 + Σ player.vars.job_market_depth`, so a tech
 * that opens better contracts widens the market rather than only raising the rate.
 */
export function jobMarketDepth(capability: Capability, depthMultiplier = 1): number {
  return Math.max(0, jobSkill(capability)) * JOB_MARKET_DEPTH_CH_PER_SKILL * depthMultiplier;
}

export function capabilityAxis(capability: Capability, axis: CapabilityAxis): number {
  return capability[axis];
}
