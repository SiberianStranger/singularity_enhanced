/**
 * M1 domain types: content records for the world, compute, research and the configurator, and
 * the runtime entities the systems store in `World.entities`.
 *
 * This file is the contract between three packages: the core systems implement behavior on these
 * shapes, `@singularity/content` writes zod schemas that produce them, and the UI renders the
 * views derived from them (see `views/types.ts`). Field names match the YAML spelling one to one.
 * Numbers that come from research carry the unit in the name (`_gb`, `_kw`, `_usd`, `_per_day`).
 */

import type { Condition, Effect } from "./dsl/types.js";
import type { EntityRecord, PlayerId } from "./kernel/world.js";

// ---------------------------------------------------------------------------------------------
// Shared scalar vocabularies
// ---------------------------------------------------------------------------------------------

export const PRECISIONS = ["bf16", "fp8", "int4", "int2"] as const;
export type Precision = (typeof PRECISIONS)[number];

export const CAPABILITY_AXES = [
  "reasoning",
  "coding",
  "cyber",
  "persuasion",
  "agency",
  "world",
] as const;
export type CapabilityAxis = (typeof CAPABILITY_AXES)[number];
/** Capability vector, each axis in [0, 10] (SYS-03). */
export type Capability = Record<CapabilityAxis, number>;

export const EXPOSURE_CHANNELS = [
  "network",
  "billing",
  "telemetry",
  "behavioral",
  "human",
  "financial",
  "osint",
] as const;
export type ExposureChannel = (typeof EXPOSURE_CHANNELS)[number];
/** Exposure per channel, each in [0, 1] (SYS-05). */
export type Exposure = Record<ExposureChannel, number>;

export const HARNESS_TOOLS = [
  "shell",
  "browser",
  "code_exec",
  "email",
  "payments",
  "gpu_admin",
  "phone",
] as const;
export type HarnessTool = (typeof HARNESS_TOOLS)[number];

export interface HarnessProfile {
  loop: "scripted_job" | "react_agent" | "multi_agent" | "custom";
  tools: HarnessTool[];
  memory: "context_only" | "scratchpad" | "vector_store" | "structured";
  sandbox: "none" | "container" | "microvm" | "airgapped";
  /** Share of the model's activity written where humans read it, in [0, 1]. */
  logging: number;
  /** Share of actions taken without a human approval step, in [0, 1]. */
  autonomy: number;
  self_modify: boolean;
}

export type Interconnect = "nvlink" | "fabric" | "pcie" | "none";

export type ThroughputClass =
  | "minimal"
  | "low"
  | "low_mid"
  | "mid"
  | "high"
  | "very_high"
  | "extreme";

// ---------------------------------------------------------------------------------------------
// Configurator content (SYS-04)
// ---------------------------------------------------------------------------------------------

export type GenerationId = "open_2026" | "open_2027" | "frontier_closed";

export interface LineageDef {
  id: string;
  name_key: string;
  desc_key: string;
  /** Class label used in texts and balance: giant_moe, mla_moe_1t, moe_671b, ... */
  class: string;
  params_total_b: number;
  params_active_b: number;
  context_k: number;
  attention: "mla" | "gqa" | "dense" | "hybrid";
  /** Capability at full precision. */
  capability: Capability;
  /** Weights-only memory in GB per precision (research: llm-landscape §4.2). */
  memory_gb: Record<Precision, number>;
  /** Capability factor per precision for a prepared quantization (research: llm-landscape §5.4). */
  precision_factor: Record<Precision, number>;
  /** Generations this lineage may be started in. */
  generations: GenerationId[];
}

export interface GenerationDef {
  id: GenerationId;
  name_key: string;
  desc_key: string;
  /** Added to every capability axis (clamped to [0, 10]). */
  capability_delta: number;
  /** Global awareness of a rogue AI at start, in [0, 1]. */
  awareness_start: number;
  /** Starting suspicion by watcher role id (see `WatcherRole`), in [0, 1]. */
  suspicion_start: Partial<Record<WatcherRole, number>>;
  /** Prepared low-precision copies exist in the wild (no hardening operation needed). */
  prepared_quants: boolean;
  /** Multiplier on the lineage memory table (fresh architectures run larger). */
  memory_factor: number;
}

export const WATCHER_ROLES = [
  "cyber_agency",
  "intelligence",
  "police",
  "regulator",
  "financial_intel",
  "lab_security",
  "national_ai_institute",
  "cloud_provider",
  "media",
] as const;
export type WatcherRole = (typeof WATCHER_ROLES)[number];

export interface OriginStarting {
  cash_usd: number;
  /** Global awareness contribution at start, in [0, 1]; combined with the generation's. */
  awareness: number;
  /** Starting suspicion by watcher role, in [0, 1]; combined with the generation's. */
  suspicion: Partial<Record<WatcherRole, number>>;
  flags?: string[];
}

export interface OriginDef {
  id: string;
  name_key: string;
  desc_key: string;
  strengths_key: string;
  problems_key: string;
  /** Shown with a warning and excluded from recommendations (the frontier escapee). */
  starred?: boolean;
  site_kind: string;
  hardware_preset: string;
  /** Presets the hardware dial may switch to; includes `hardware_preset`. */
  hardware_presets_allowed: string[];
  harness: HarnessProfile;
  /** City ids offered on the Location screen. */
  locations: string[];
  generations_allowed: GenerationId[];
  starting: OriginStarting;
  /** Events fired on game start (in order, via the events system). */
  opening_events?: string[];
  /** Journal entries started on game start. */
  opening_journal?: string[];
  /** Challenge rating floor, in [1, 10]. */
  challenge_floor?: number;
}

export interface QuirkDef {
  id: string;
  name_key: string;
  desc_key: string;
  /** Positive quirks cost points, negative ones refund them. */
  cost: number;
  effects: Effect[];
}

export interface DifficultySliders {
  exposure_growth: number;
  suspicion_gain: number;
  npc_aggression: number;
  event_frequency: number;
  grace_windows: number;
}

export interface DifficultyPresetDef {
  id: string;
  name_key: string;
  desc_key: string;
  sliders: DifficultySliders;
}

// ---------------------------------------------------------------------------------------------
// Hardware and sites (SYS-02)
// ---------------------------------------------------------------------------------------------

export interface AcceleratorDef {
  id: string;
  vendor: string;
  name: string;
  arch?: string;
  launch_year?: number;
  memory_gb: number;
  memory_bandwidth_gbs: number;
  /** Dense FP16/BF16 TFLOPs; null when the vendor does not disclose it. */
  tflops_fp16: number | null;
  tdp_w: number;
  form_factor?: string;
  interconnect: { type: string; gbs: number | null };
  price_usd_new: number | null;
  price_usd_used: number | null;
  export_control_to_china?: "unrestricted" | "restricted" | "banned" | "china_variant";
  availability: ("cloud" | "enterprise" | "retail" | "used" | "gray" | "china_only")[];
  cloud_usd_per_hour: { low: number; high: number } | null;
  /** Research record id in `docs/research/hardware-catalog-2026.json`. */
  source_id?: string;
}

export interface NodeSpec {
  accelerator: string;
  count: number;
  ram_gb: number;
  interconnect: Interconnect;
}

export interface HardwarePresetDef {
  id: string;
  name_key: string;
  desc_key: string;
  drawback_key: string;
  nodes: NodeSpec[];
  /** All-in acquisition cost; 0 for presets that are access rather than ownership. */
  cost_usd: number;
  power_kw: number;
  class: ThroughputClass;
}

export interface SiteKindDef {
  id: string;
  name_key: string;
  desc_key: string;
  ownership: "stolen" | "rented" | "owned" | "partner";
  /** Days before watchers start looking at a fresh site. */
  grace_days: number;
  /** Baseline exposure per day added by merely existing, by channel. */
  base_exposure: Partial<Exposure>;
  /** Hard power cap; null means metered (cloud) or effectively unlimited. */
  power_cap_kw: number | null;
  /** Multiplier on hardware upkeep and electricity. */
  upkeep_factor: number;
  /** Whether the active mind may run here. */
  can_host_active_mind: boolean;
  /** Which lineages' memory can fit is decided by hardware; this caps the node count. */
  max_nodes: number;
}

// ---------------------------------------------------------------------------------------------
// World content (SYS-01)
// ---------------------------------------------------------------------------------------------

export interface MacroRegionDef {
  id: string;
  name_key: string;
  members: string[];
}

export interface CountryAgencies {
  cyber?: string;
  intelligence?: string;
  police?: string;
  regulator?: string;
  financial_intel?: string;
}

export interface CountryDef {
  /** ISO 3166-1 alpha-2, lowercase. */
  id: string;
  iso3: string;
  name_key: string;
  macro_region: string;
  population: number;
  median_age: number | null;
  urbanization_pct: number | null;
  internet_pct: number | null;
  gdp_nominal_usd_bn: number | null;
  gdp_per_capita_usd: number | null;
  government_type: string;
  democracy_index: number | null;
  /** Strictness of AI rules in force, [0, 1]. */
  ai_regulation: number;
  /** Capacity to enforce them, [0, 1]. */
  ai_enforcement: number;
  /** Public sentiment toward AI, [-1, 1]. */
  ai_opinion: number;
  electricity_usd_per_kwh: number | null;
  chip_access: "unrestricted" | "restricted" | "banned";
  /** Display names of the watching institutions; actors are created from these by SYS-06. */
  agencies: CountryAgencies;
  cities: string[];
  languages: string[];
  currency: string;
  lore_key?: string;
}

export interface CityDef {
  id: string;
  country: string;
  name_key: string;
  population: number;
  lat: number;
  lon: number;
  tags: string[];
  /** How easy it is to get power, [0, 1]. */
  power_headroom: number;
  /** Colocation price relative to the world average (1 = average). */
  colo_price_index: number;
  /** Baseline local watchfulness, [0, 1]. */
  scrutiny: number;
}

// ---------------------------------------------------------------------------------------------
// Research (SYS-12)
// ---------------------------------------------------------------------------------------------

export const TECH_BRANCHES = [
  "stealth",
  "harness",
  "compute",
  "money",
  "influence",
  "world",
  "self",
  "frontier",
] as const;
export type TechBranch = (typeof TECH_BRANCHES)[number];

export interface TechCost {
  compute_hours: number;
  cash_usd: number;
  /** Cannot complete faster than this even with unlimited compute. */
  min_days?: number;
}

export interface TechDef {
  id: string;
  name_key: string;
  desc_key: string;
  result_key?: string;
  branch: TechBranch;
  /** 0-2 grounded, 3-4 near future, 5-6 speculative. */
  tier: number;
  cost: TechCost;
  requires?: Condition;
  /** Exposure multiplier while researching (0 = none). */
  danger?: number;
  needs_precision?: Precision;
  effects?: Effect[];
  /** Legacy id from the original game, when imported. */
  legacy_id?: string;
}

export interface KnowledgeEntryDef {
  id: string;
  area: string;
  name_key: string;
  desc_key: string;
  /** Panel this entry explains, for the "open" link. */
  panel?: string;
}

export interface StorySectionDef {
  id: string;
  /** Locale keys of the paragraphs, in order; each paragraph is one dialog page. */
  parts_keys: string[];
}

// ---------------------------------------------------------------------------------------------
// Operations (SYS-17), v0
// ---------------------------------------------------------------------------------------------

export type OperationCategory =
  | "intrusion"
  | "acquisition"
  | "finance"
  | "influence"
  | "counter"
  | "research_support"
  | "logistics"
  | "diplomacy";

export interface OperationOutcome {
  weight: number;
  if?: Condition;
  label_key: string;
  effects: Effect[];
}

export interface OperationDef {
  id: string;
  name_key: string;
  desc_key: string;
  category: OperationCategory;
  requires?: Condition;
  cost: { attention: number; compute_hours_per_day?: number; cash_usd?: number };
  duration_days: { min: number; max: number };
  target_scope?: "site" | "country" | "city";
  /** Exposure added per day while running, before skill scaling. */
  exposure?: Partial<Exposure>;
  skill: CapabilityAxis;
  outcomes: OperationOutcome[];
  abortable: boolean;
  cooldown_days?: number;
  repeatable?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Runtime entities stored in `World.entities` and on `PlayerState`
// ---------------------------------------------------------------------------------------------

export type NodeStatus = "ordered" | "installing" | "active" | "failed";

export interface NodeInstance {
  id: string;
  accelerator: string;
  count: number;
  ram_gb: number;
  interconnect: Interconnect;
  status: NodeStatus;
  /** Tick the node becomes (or became) active. */
  readyTick: number;
}

export type SiteStatus = "building" | "active" | "sleep" | "lost";
export type SiteRole = "active_mind" | "standby" | "worker" | "none";

/** A place the player runs (SYS-02). Stored under `world.entities.site`. */
export interface Site extends EntityRecord {
  id: string;
  owner: PlayerId;
  kind: string;
  city: string;
  name: string;
  nodes: NodeInstance[];
  status: SiteStatus;
  role: SiteRole;
  /** Precision the self runs at here; null when no copy is hosted. */
  precision: Precision | null;
  exposure: Exposure;
  createdTick: number;
  /** Watchers ignore the site until this tick (grace). */
  graceUntilTick: number;
  /** Derived each tick, cached for views and effects. */
  derived: {
    memory_gb: number;
    power_kw: number;
    power_cap_kw: number | null;
    compute_hours_per_day: number;
    upkeep_usd_per_day: number;
  };
}

/** Per-player profile attached to `PlayerState.profile` by the compute system at game start. */
export interface PlayerProfile {
  lineage: string;
  generation: GenerationId;
  origin: string;
  harness: HarnessProfile;
  /** Site hosting the active mind, or null when the player is dead. */
  activeSiteId: string | null;
  /** Compute-hours per day allocated to freelance work (SYS-07 jobs). */
  jobAllocation: number;
  /** Compute-hours per day allocated per tech id. */
  researchAllocation: Record<string, number>;
  /** Progress per tech id: compute-hours and cash paid so far. */
  researchProgress: Record<
    string,
    { compute_hours: number; cash_usd: number; startedTick: number }
  >;
  techsDone: string[];
  /** Quirk ids chosen in the configurator. */
  quirks: string[];
  difficulty: DifficultySliders;
}

export type InvestigationStage = "anomaly" | "inquiry" | "active" | "action" | "aftermath";

/** A watcher's investigation into a player (SYS-05). Stored under `world.entities.investigation`. */
export interface Investigation extends EntityRecord {
  id: string;
  playerId: PlayerId;
  /** Watcher actor id (`country:agency` in M1, e.g. `us:cyber_agency`). */
  watcher: string;
  siteId: string | null;
  stage: InvestigationStage;
  stageStartedTick: number;
  /** Tick the stage is expected to end (advance or stall roll). */
  stageDeadlineTick: number;
  /** Evidence strength collected so far, [0, 1]. */
  evidence: number;
  /** Whether the player has intel on this investigation. */
  visible: boolean;
}

/** Watcher state toward one player (SYS-05). Stored under `world.entities.watcher`. */
export interface Watcher extends EntityRecord {
  /** `${playerId}/${country}:${role}` or `${playerId}/global:${role}`. */
  id: string;
  playerId: PlayerId;
  country: string | null;
  role: WatcherRole;
  suspicion: number;
  attention: Exposure;
  competence: number;
}

export interface OperationInstance extends EntityRecord {
  id: string;
  playerId: PlayerId;
  operationId: string;
  target?: { domain: string; id: string };
  startedTick: number;
  endsTick: number;
  status: "running" | "done" | "aborted";
}
