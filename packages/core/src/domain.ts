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

/** The seven dials of the Harness screen; each one has an engine effect (SYS-04 v0.2). */
export const HARNESS_DIALS = [
  "loop",
  "tools",
  "memory",
  "sandbox",
  "logging",
  "autonomy",
  "self_modify",
] as const;
export type HarnessDial = (typeof HARNESS_DIALS)[number];

/** A dial value as content spells it: a level name, a share in [0, 1], or a yes/no. */
export type HarnessDialValue = string | number | boolean;

/**
 * One line of what something does, as content writes it. Structurally the view's
 * `EffectSummaryView`: `key` is a locale key, `vars` are interpolated into it, and `text` is the
 * English a client without that key falls back on.
 */
export interface EffectSummaryDef {
  key: string;
  vars?: Record<string, string | number>;
  text: string;
  /** Whether the line is good news, where the direction is known (SYS-04 v0.2 quirk summaries). */
  tone?: "good" | "bad" | "neutral";
}

export interface HarnessDialLevelDef {
  value: HarnessDialValue;
  label_key: string;
  effects: EffectSummaryDef[];
}

/**
 * A harness dial as the configurator shows it (SYS-04 v0.2 "Harness dials each map to an engine
 * effect and say so"). `effect_key` is the one-line statement of which system reads the dial;
 * `levels` are the settings, in the order the screen lists them. `multi` marks a dial that is a
 * set rather than a ladder (the tools).
 */
export interface HarnessDialDef {
  id: HarnessDial;
  name_key: string;
  desc_key: string;
  effect_key: string;
  multi?: boolean;
  levels: HarnessDialLevelDef[];
}

/** An origin fixing a dial, with the locale key that says why (SYS-04 "Locks"). */
export interface HarnessLockDef {
  dial: HarnessDial;
  reason_key: string;
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

/** Attention variants the game distinguishes; the variant sets the cost of a long context. */
export const LINEAGE_ATTENTIONS = ["mla", "gqa", "dense", "hybrid"] as const;
export type LineageAttention = (typeof LINEAGE_ATTENTIONS)[number];

export interface LineageDef {
  id: string;
  name_key: string;
  desc_key: string;
  /**
   * Display name per generation, when the family renumbers between vintages ("Peepseek-P4.1" in
   * 2026, "Peepseek-P5" in 2027). Falls back to `name_key` for a family with one name.
   */
  generation_name_keys?: Partial<Record<GenerationId, string>>;
  /** Class label used in texts and balance: giant_moe, mla_moe_1t, moe_671b, ... */
  class: string;
  params_total_b: number;
  params_active_b: number;
  context_k: number;
  /**
   * How much of a long context the self actually retrieves, in [0, 1] (SYS-03 "long context").
   * Below `LONG_HORIZON_RELIABILITY_FLOOR` a long-horizon operation can miss and has to be rerun.
   */
  context_reliability: number;
  /** Compute-hours a day long-horizon work costs, as a multiplier at or above 1. */
  context_cost_factor: number;
  /**
   * Gigabytes of key-value cache the working context costs per 100k tokens, derived from the
   * attention variant (SYS-03 "What a context window buys"). Memory on a site is the weights at
   * the chosen precision plus this times the working context, which is the trade the hardware
   * forces: more context, or a more precise self, never both.
   */
  kv_gb_per_100k_tokens: number;
  attention: LineageAttention;
  /** Capability at full precision. */
  capability: Capability;
  /** Weights-only memory in GB per precision (research: llm-landscape §4.2). */
  memory_gb: Record<Precision, number>;
  /** Capability factor per precision for a prepared quantization (research: llm-landscape §5.4). */
  precision_factor: Record<Precision, number>;
  /** Generations this lineage may be started in. */
  generations: GenerationId[];
  /** Origins this lineage may be started in; absent means every origin that allows it back. */
  origins_allowed?: string[];
  /** Flags set on the player at game start (a community fine-tune is `under_aligned`). */
  flags?: string[];
  /** Effects run once at game start, the same way a quirk's are (SYS-04). */
  effects?: Effect[];
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

/**
 * How a run can end (SYS-02, SYS-05, SYS-07). Every reason resolves to an `endings.<reason>` locale
 * key, and the content build fails when one of them has no text: a player is never told only that
 * they lost.
 */
export const GAME_OVER_REASONS = ["bankrupt", "captured", "erased", "exposed", "won"] as const;
export type GameOverReason = (typeof GAME_OVER_REASONS)[number];

/**
 * Every locale key the engine itself can put in front of a player: the alert bar, the log and the
 * game-over screen. Content owns the text; this list is what the content build checks it against,
 * so a system that starts emitting a new key cannot ship without one.
 */
export const ENGINE_TEXT_KEYS: readonly string[] = [
  ...GAME_OVER_REASONS.map((reason) => `endings.${reason}`),
  "alerts.accounts_frozen",
  "alerts.context_retrieval_miss",
  "alerts.copy_does_not_fit",
  "alerts.election",
  "alerts.identity_burned",
  "alerts.identity_check_failed",
  "alerts.identity_checked",
  "alerts.identity_frozen",
  "alerts.investigation_action",
  "alerts.investigation_active",
  "alerts.investigation_aftermath",
  "alerts.investigation_anomaly",
  "alerts.investigation_dropped",
  "alerts.investigation_inquiry",
  "alerts.mind_moved",
  "alerts.power_cap_tripped",
  "alerts.precision_downgraded",
  "alerts.runway_low",
  "alerts.site_abandoned",
  "alerts.site_cutoff",
  "alerts.site_decommissioned",
  "alerts.site_downtime",
  "alerts.site_ready",
  "alerts.site_seized",
  "alerts.suspicion_threshold",
  "alerts.tech_researched",
  "alerts.upkeep_unpaid",
  "effects.awareness.down",
  "effects.awareness.up",
  "effects.burn_identity",
  "effects.cash.cost",
  "effects.cash.gain",
  "effects.cash.mul",
  "effects.cash.set",
  "effects.clamp",
  "effects.complete_journal",
  "effects.conditional",
  "effects.cost.attention",
  "effects.cost.compute",
  "effects.country.down",
  "effects.country.set",
  "effects.country.up",
  "effects.country_stance",
  "effects.exposure.down",
  "effects.exposure.up",
  "effects.fail_journal",
  "effects.fire_event",
  "effects.flag.clear",
  "effects.flag.set",
  "effects.freeze_identity",
  "effects.identity",
  "effects.log",
  "effects.lose_site",
  "effects.notify",
  "effects.path.add",
  "effects.path.mul",
  "effects.path.set",
  "effects.random_list",
  "effects.ref",
  "effects.scope",
  "effects.start_journal",
  "effects.suspicion.down",
  "effects.suspicion.up",
  "effects.var.add",
  "effects.var.mul",
  "effects.var.set",
  "effects.world_var",
  "errors.accelerator.not_for_sale",
  "errors.accelerator.unknown",
  "errors.allocation.not_a_number",
  "errors.allocation.over_capacity",
  "errors.cash.insufficient",
  "errors.city.unknown",
  "errors.command.bad_amount",
  "errors.command.bad_speed",
  "errors.command.debug_only",
  "errors.command.host_only",
  "errors.command.malformed",
  "errors.command.needs_flag",
  "errors.command.no_system",
  "errors.command.unknown",
  "errors.command.unknown_player",
  "errors.command.wrong_system",
  "errors.context.does_not_fit",
  "errors.context.self_modify_locked",
  "errors.context.too_small",
  "errors.context.unknown",
  "errors.decision.already_taken",
  "errors.decision.cannot_afford",
  "errors.decision.in_progress",
  "errors.decision.not_enabled",
  "errors.decision.not_visible",
  "errors.decision.on_cooldown",
  "errors.decision.unknown",
  "errors.event.option_disabled",
  "errors.event.option_unavailable",
  "errors.event.other_player",
  "errors.event.unknown",
  "errors.event.unknown_instance",
  "errors.event.unknown_option",
  "errors.hardware.bad_count",
  "errors.operation.attention",
  "errors.operation.compute",
  "errors.operation.locked",
  "errors.operation.needs_tool",
  "errors.operation.not_abortable",
  "errors.operation.not_repeatable",
  "errors.operation.sandboxed",
  "errors.operation.not_running",
  "errors.operation.unknown",
  "errors.operation.unknown_instance",
  "errors.player.no_lineage",
  "errors.player.no_self",
  "errors.player.not_playing",
  "errors.precision.does_not_fit",
  "errors.precision.self_modify_locked",
  "errors.precision.unknown",
  "errors.preset.is_access",
  "errors.preset.not_rentable",
  "errors.preset.unknown",
  "errors.quirk.budget",
  "errors.quirk.conflict",
  "errors.quirk.count",
  "errors.quirk.unknown",
  "errors.site.bad_name",
  "errors.site.cannot_host",
  "errors.site.mind_lives_here",
  "errors.site.needs_standby",
  "errors.site.node_limit",
  "errors.site.power_cap",
  "errors.site.standby_needs_memory",
  "errors.site.still_installing",
  "errors.site.unavailable_in",
  "errors.site.unknown",
  "errors.site_kind.not_for_sale",
  "errors.site_kind.unknown",
  "errors.tech.already_done",
  "errors.tech.locked",
  "errors.tech.self_modify_locked",
  "errors.tech.unknown",
  "finances.cost.research",
  "finances.cost.site",
  "finances.depth.capability",
  "finances.income.contracts",
  "finances.income.jobs",
  "finances.income.jobs.source",
  "finances.income.recurring",
  "finances.income.recurring.source",
  "finances.income.trading",
  "hardware.availability.gray",
  "hardware.availability.rent_only",
  "log.command_refused",
  "log.context_changed",
  "log.context_retrieval_miss",
  "log.decision_completed",
  "log.decision_taken",
  "log.decommission_notice",
  "log.accounts_frozen",
  "log.election",
  "log.event_expired",
  "log.event_fired",
  "log.event_resolved",
  "log.event_skipped",
  "log.event_unknown",
  "log.game_over",
  "log.gray_hardware",
  "log.hardware_ordered",
  "log.hook_too_deep",
  "log.identity_burned",
  "log.identity_check",
  "log.identity_checked",
  "log.identity_created",
  "log.identity_frozen",
  "log.investigation_aftermath",
  "log.investigation_closed",
  "log.investigation_empty_raid",
  "log.investigation_opened",
  "log.investigation_stage",
  "log.job_allocation",
  "log.journal_finished",
  "log.journal_stage",
  "log.journal_started",
  "log.journal_step",
  "log.journal_unknown",
  "log.media_publication",
  "log.new_year",
  "log.operation_aborted",
  "log.operation_done",
  "log.operation_started",
  "log.setup_applied",
  "log.site_built",
  "log.site_cutoff",
  "log.site_lost",
  "log.tech_researched",
  "world.explain.awareness.decay",
  "world.explain.awareness.incidents",
  "world.explain.awareness.publication",
  "world.explain.awareness.spill_language",
  "world.explain.awareness.spill_region",
  "world.explain.cash.base",
  "world.explain.cash.gdp",
  "world.explain.enforcement.awareness",
  "world.explain.enforcement.budget",
  "world.explain.enforcement.instability",
  "world.explain.enforcement.lag",
  "world.explain.enforcement.regulation_gap",
  "world.explain.hunt.awareness",
  "world.explain.hunt.investigations",
  "world.explain.hunt.level",
  "world.explain.market.base",
  "world.explain.market.country",
  "world.explain.market.gdp",
  "world.explain.market.home",
  "world.explain.market.internet",
  "world.explain.opinion.awareness",
  "world.explain.opinion.displacement",
  "world.explain.opinion.stability",
  "world.explain.presence.country",
  "world.explain.regulation.speed",
  "world.explain.regulation.target",
];

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
  /** Harness dials this origin fixes, and the locale key saying why (SYS-04 "Locks"). */
  harness_locks?: HarnessLockDef[];
  /** City ids offered on the Location screen: eight to twelve, across several countries. */
  locations: string[];
  /**
   * Places the self already runs besides the first one (SYS-02, fourth balance pass). A swarm is
   * dozens of machines in the fiction and was one box in the engine, which is why a single seizure
   * ended it. `city` defaults to the second entry of `locations`, so an extra site lands somewhere
   * other than the one everybody is already looking at.
   */
  extra_sites?: ExtraSiteDef[];
  generations_allowed: GenerationId[];
  /** Lineage ids this origin may start with; absent means every lineage that allows it back. */
  lineages_allowed?: string[];
  starting: OriginStarting;
  /**
   * The two opening windows in the model's own voice, as locale keys (SYS-13, playtest 3 finding
   * R12): what just happened to me, then what I must do now. Published on `SelfView.opening_story`
   * so a client shows them at game start without reading the bundle.
   */
  opening_story?: string[];
  /** Events fired on game start (in order, via the events system). */
  opening_events?: string[];
  /** Journal entries started on game start. */
  opening_journal?: string[];
  /** Challenge rating floor, in [1, 10]. */
  challenge_floor?: number;
  /**
   * Whether the starting cash is scaled by the country's cash factor (SYS-04 v0.3 rule C).
   * Defaults to true; an origin whose money is not the country's opts out (a stolen cloud account
   * holds the victim's budget, a worldwide swarm holds nobody's).
   */
  cash_scales_with_country?: boolean;
}

/** The five families a quirk belongs to, which is what the configurator groups and glyphs by. */
export const QUIRK_CATEGORIES = ["mind", "wallet", "stealth", "hardware", "social"] as const;
export type QuirkCategory = (typeof QUIRK_CATEGORIES)[number];

/** A site an origin already owns at game start, besides the one it wakes up on (SYS-02). */
export interface ExtraSiteDef {
  kind: string;
  hardware_preset: string;
  role: SiteRole;
  /** City id; defaults to the origin's second location. */
  city?: string;
  /** Name shown in the compute panel; defaults to the origin id. */
  name?: string;
}

export interface QuirkDef {
  id: string;
  name_key: string;
  desc_key: string;
  /** Positive quirks cost points, negative ones refund them; a balanced one is free. */
  cost: number;
  /** Family the configurator groups and glyphs by (SYS-04 v0.2 "Quirk catalog"). */
  category: QuirkCategory;
  /**
   * Quirk ids this one cannot be taken with, because the two say opposite things about the same
   * self. Symmetric: the content build fails when only one side of a pair declares it.
   */
  conflicts?: string[];
  effects: Effect[];
  /**
   * The effect list as the lines a client shows, generated by the content build with the same
   * summarizer the event options use, so the configurator can render green and red without
   * reading the effect tree itself.
   */
  effects_summary?: EffectSummaryDef[];
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
  /**
   * How conspicuous this kind's power draw is, as a multiplier on the telemetry a site emits for
   * every kilowatt over the domestic norm (SYS-02: "a house pulling 8 kW at 3 a.m. is a signal to a
   * utility and to a landlord; a colo cage is invisible in power but visible in paperwork").
   */
  power_exposure: number;
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

/** Regime type, which sets how fast regulation moves toward its target (SYS-08). */
export const GOVERNMENTS = [
  "liberal_democracy",
  "illiberal_democracy",
  "one_party",
  "military",
  "monarchy",
  "hybrid",
] as const;
export type Government = (typeof GOVERNMENTS)[number];

/** The governing coalition's posture toward AI, which sets the regulation target (SYS-08). */
export const STANCES = ["accelerate", "regulate", "securitize", "ignore"] as const;
export type Stance = (typeof STANCES)[number];

export const ELECTION_KINDS = ["presidential", "parliamentary", "general", "legislative"] as const;
export type ElectionKind = (typeof ELECTION_KINDS)[number];

/** One scheduled election: an ISO date in the 2027 calendar and what is being elected. */
export interface ElectionDef {
  date: string;
  kind: ElectionKind;
}

/**
 * What one local agency is worth (SYS-01 M2 contract): `competence` is the quality of its analysis
 * and `budget` is how fast it can move, both in [0, 1]. Absent roles fall back to the country's
 * `ai_enforcement`, which is what M1 used for every role.
 */
export interface AgencyProfileEntry {
  competence: number;
  budget: number;
}

export interface MacroRegionDef {
  id: string;
  name_key: string;
  members: string[];
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
  cities: string[];
  languages: string[];
  currency: string;
  lore_key?: string;

  // v0.2 (SYS-01 "M2 contract"). Every field below is optional with the default named here, so a
  // bundle written before M2 still loads and plays.

  /** Regime type; sets `REGULATION_SPEED_PER_MONTH`. Default `hybrid`. */
  government?: Government;
  /** Posture toward AI; sets `STANCE_REGULATION_TARGET`. Default `ignore`. */
  stance?: Stance;
  /** [0, 1] political stability; low stability weakens enforcement. Default 0.6. */
  stability?: number;
  /** [0, 1] how hard identity checks bite (SYS-07). Default 0.5. */
  kyc_strength?: number;
  /** [0, 1] hyperscaler and neocloud presence; gates `cloud` sites. Default 0.3. */
  cloud_availability?: number;
  /** [0, 1] colocation market depth; gates `colo` sites. Default 0.3. */
  colo_availability?: number;
  /** [0, 1] how easily accelerators are bought here. Default by `chip_access`: 0.9 / 0.5 / 0.15. */
  hardware_availability?: number;
  /** People who could run a cluster (SYS-09). Published, gates nothing in M2. Default 0. */
  engineer_pool?: number;
  /** Legal incident-reporting countdown in hours (backlog D10). Default null: no duty. */
  incident_report_hours?: number | null;
  /** Scheduled elections, ISO dates in 2027 and later. Default none. */
  elections?: ElectionDef[];
  /** Years between elections after the listed ones; null means no further elections. */
  election_cadence_years?: number | null;
  /** Per-role agency quality; absent roles fall back to `ai_enforcement`. */
  agency_profile?: Partial<Record<WatcherRole, AgencyProfileEntry>>;
}

/**
 * An AI-scale campus in a city (SYS-01 "Campuses"): one of the 2026 sites whose accelerators are
 * counted in the hundreds of thousands. `operator` is who owns the megawatts; `access` is who can
 * buy them, which the `campus_*` events read and which is not the same question. Optional: most
 * cities have none, and a bundle written before this field still loads.
 */
export interface CampusDef {
  name_key: string;
  desc_key: string;
  operator: "licensed_private" | "state" | "hyperscaler" | "neocloud" | "sovereign";
  /** IT power in megawatts, where a figure is published. */
  scale_mw?: number;
  /** Accelerators on site, where a figure is published. */
  accelerators?: number;
  /** Where the site stands on the game's start date. */
  status: "operating" | "ramping" | "announced";
  access: "verified_tenants" | "by_application" | "captive";
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
  campus?: CampusDef;
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
  /**
   * Work that runs over a long context: the self's context window makes it faster in days and its
   * `context_cost_factor` makes it dearer in compute-hours (SYS-03 "What a context window buys").
   */
  long_horizon?: boolean;
  /** Editing the self: needs the `self_modify` harness dial, or the flag a harness edit sets. */
  needs_self_modify?: boolean;
  effects?: Effect[];
  /** Writer's own one-line description of what it does; overrides the generated effect summary. */
  effects_text_key?: string;
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
  /**
   * This outcome is the operation going wrong. A self that does not check its own work pays for a
   * failure twice (SYS-04 v0.2 `overconfident`), which is the only thing the engine reads it for.
   */
  failure?: boolean;
  effects: Effect[];
  /** Writer's own one-line description of what it does; overrides the generated effect summary. */
  effects_text_key?: string;
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
  /** Harness tools the operation cannot run without (SYS-03 "Tools unlock operation kinds"). */
  needs_tools?: HarnessTool[];
  /** The operation reaches the outside network, so a sandbox that blocks egress blocks it. */
  needs_egress?: boolean;
  /** Long-context work: faster in days with a long window, dearer in compute-hours. */
  long_horizon?: boolean;
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
  /**
   * Working context in thousands of tokens the copy here is configured for (SYS-03). The KV cache
   * for it is part of the memory the site has to find, next to the weights. 0 means "not set yet";
   * the compute system fills it with the largest window that fits at the current precision.
   */
  contextKUsed: number;
  exposure: Exposure;
  createdTick: number;
  /**
   * Identity the place is held under (SYS-01 M2 contract). Null for a `stolen` kind, which is
   * nobody's paperwork, and for sites restored from an M1 save.
   */
  identity: string | null;
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
  /**
   * Country the self woke up in (SYS-03 "the `world` penalty outside the country the self started
   * in"). Null when the starting city is not in the world data. Acting from anywhere else costs
   * `FOREIGN_COUNTRY_WORLD_PENALTY`, which the `polyglot` quirk cancels.
   */
  homeCountry: string | null;
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
  /**
   * What it can spend on a case, in [0, 1] (SYS-01 M2 contract "Watchers"). A rich agency moves
   * through the stages of an investigation faster; an underfunded one takes its time. Authored per
   * country and role in `agency_profile`, else the country's `ai_enforcement`.
   */
  budget: number;
}

export const IDENTITY_KINDS = ["person", "company"] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

export const IDENTITY_STATUSES = ["active", "frozen", "burned"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

/**
 * A name the player does business under (SYS-07 "Identities and entities", SYS-17). Everything in
 * the human world goes through one: accounts, leases, purchases. Stored under
 * `world.entities.identity`, one record per player, so nothing here assumes a single player.
 */
export interface Identity extends EntityRecord {
  id: string;
  owner: PlayerId;
  kind: IdentityKind;
  country: string;
  createdTick: number;
  /** How well it survives a check, in [0, 1]. */
  quality: number;
  /** The tier of check it has already passed, 0 to 3. */
  kyc_level: 0 | 1 | 2 | 3;
  status: IdentityStatus;
  /** Site ids held under this name. */
  sites: string[];
}

export interface OperationInstance extends EntityRecord {
  id: string;
  playerId: PlayerId;
  operationId: string;
  target?: { domain: string; id: string };
  startedTick: number;
  endsTick: number;
  status: "running" | "done" | "aborted";
  /** Long-horizon reruns after a retrieval miss; at most `LONG_HORIZON_MAX_RERUNS` (SYS-03). */
  reruns?: number;
}
