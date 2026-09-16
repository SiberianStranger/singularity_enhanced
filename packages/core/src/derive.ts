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
  CLOUD_PRICE_BAND_POSITION,
  CROSS_NODE_FACTOR,
  DEFAULT_ELECTRICITY_USD_PER_KWH,
  EMERGENCY_INT2_FACTOR,
  FALLBACK_ACCELERATOR_PRICE_USD,
  HARDWARE_DEPRECIATION_PER_YEAR,
  INTERCONNECT_FACTOR,
  JOB_BASE_USD_PER_COMPUTE_HOUR,
  JOB_MARKET_DEPTH_CH_PER_SKILL,
  JOB_RATE_FLOOR_FACTOR,
  JOB_SKILL_SLOPE,
  OWNERSHIP_UPKEEP_USD_PER_DAY,
  POWER_USAGE_EFFECTIVENESS,
  RAM_MEMORY_DISCOUNT,
  RAM_OFFLOAD_THROUGHPUT_FACTOR,
  SECONDS_PER_DAY,
  TOKENS_PER_COMPUTE_HOUR,
  UTILIZATION_ACTIVE,
  UTILIZATION_SLEEP,
} from "./balance.js";
import type {
  AcceleratorDef,
  Capability,
  CapabilityAxis,
  CountryDef,
  GenerationDef,
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
export function requiredMemoryGb(
  lineage: LineageDef,
  generation: GenerationDef,
  precision: Precision,
): number {
  return lineage.memory_gb[precision] * generation.memory_factor;
}

/** The best precision the self fits at with this much memory, or null when it does not fit. */
export function bestPrecision(
  lineage: LineageDef,
  generation: GenerationDef,
  memoryGb: number,
): Precision | null {
  for (const precision of PRECISIONS) {
    if (requiredMemoryGb(lineage, generation, precision) <= memoryGb) {
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
): Precision | null {
  return (
    bestPrecision(lineage, generation, memory.accelerator_gb) ??
    bestPrecision(lineage, generation, memory.total_gb)
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
): number {
  const nodes = activeNodes(site, tick);
  const needed = requiredMemoryGb(lineage, generation, precision);
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

export function electricityPrice(country: CountryDef | undefined): number {
  return country?.electricity_usd_per_kwh ?? DEFAULT_ELECTRICITY_USD_PER_KWH;
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
export function siteCosts(
  site: Pick<Site, "nodes" | "status">,
  kind: SiteKindDef | undefined,
  city: CityState | undefined,
  country: CountryDef | undefined,
  accelerators: Record<string, AcceleratorDef>,
  tick: number,
  powerKw: number,
): SiteCosts {
  const ownership = kind?.ownership ?? "owned";
  const upkeepFactor = kind?.upkeep_factor ?? 1;
  const priceIndex = city?.colo_price_index ?? 1;
  const base = OWNERSHIP_UPKEEP_USD_PER_DAY[ownership] * priceIndex;

  let rental = 0;
  let electricity = 0;
  let depreciation = 0;
  if (ownership === "rented") {
    for (const node of activeNodes(site, tick)) {
      const hourly = cloudHourlyUsd(accelerators[node.accelerator]);
      if (hourly !== null) {
        rental += hourly * node.count * HOURS_PER_DAY;
      }
    }
  } else if (ownership === "owned") {
    electricity = powerKw * HOURS_PER_DAY * electricityPrice(country);
    depreciation =
      (siteHardwareValueUsd(site, accelerators) * HARDWARE_DEPRECIATION_PER_YEAR) / DAYS_PER_YEAR;
  } else if (ownership === "partner") {
    // A partner passes the power bill on and keeps the hardware, so no depreciation (SYS-02).
    electricity = powerKw * HOURS_PER_DAY * electricityPrice(country);
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
): Capability {
  if (precision === null) {
    return zeroCapability();
  }
  const emergency = precision === "int2" && !preparedQuant;
  const factor = lineage.precision_factor[precision] * (emergency ? EMERGENCY_INT2_FACTOR : 1);
  const capability = {} as Capability;
  for (const axis of CAPABILITY_AXES) {
    capability[axis] = clamp(
      lineage.capability[axis] * factor + generation.capability_delta,
      CAPABILITY_MIN,
      CAPABILITY_MAX,
    );
  }
  return capability;
}

/** How many operations the self can run at once (SYS-03 attention, SYS-17). */
export function attentionTotal(capability: Capability): number {
  return Math.floor(ATTENTION_BASE + capability.agency / ATTENTION_PER_AGENCY);
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
