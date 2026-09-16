/**
 * Per-player view model (ADR-003, SYS-11): what `snapshot(playerId)` returns and what the UI
 * renders. The UI never reads `World`; it reads this. Every field is present (empty arrays, nulls)
 * so partial implementations still typecheck and render.
 *
 * Views carry ids and locale keys, never prose: the client resolves keys through i18next.
 */

import type {
  Capability,
  Exposure,
  GenerationId,
  HarnessProfile,
  InvestigationStage,
  NodeStatus,
  Precision,
  SiteRole,
  SiteStatus,
  WatcherRole,
} from "../domain.js";
import type { CalendarDate } from "../kernel/clock.js";
import type { CommandError } from "../kernel/commands.js";
import type {
  ChoiceReason,
  LogEntry,
  Notification,
  PendingChoice,
  PlayerId,
  Severity,
  TextVar,
} from "../kernel/world.js";

export interface DateView extends CalendarDate {
  iso: string;
  weekday: number;
}

/**
 * One line of what something does, generated from an effect list (SYS-11 "tooltips of effects,
 * auto-generated from the effect list, writer override possible"). `key` is a locale key, `vars`
 * are interpolated into it, and `text` is the English the client falls back on when the key has no
 * translation. Every effect list in the game renders through this one shape.
 */
export interface EffectSummaryView {
  key: string;
  vars?: Record<string, string | number>;
  text: string;
  /**
   * Whether this line is good news for the player, when the core can establish it: green for
   * `good`, red for `bad`, plain for `neutral` and for a line with no tone at all. Set where the
   * subject's direction is known (a quirk's effects, above all), left out where guessing wrong
   * would be a lie in one pixel.
   */
  tone?: EffectTone;
}

export type EffectTone = "good" | "bad" | "neutral";

/**
 * One quirk as the configurator and the self panel show it (SYS-04 v0.2 "Quirk catalog"): the
 * budget line, the family glyph, what it cannot be taken with, and its effects as coloured lines.
 */
export interface QuirkView {
  id: string;
  name_key: string;
  desc_key: string;
  /** Positive quirks cost points, negative ones refund them, a balanced one is free. */
  cost: number;
  category: string;
  /** Quirk ids this one cannot be taken with. */
  conflicts: string[];
  effects: EffectSummaryView[];
}

/**
 * One row of the precision table on the self (SYS-03). The client shows the whole list so the
 * trade-off is one table rather than a hidden rule: a more precise copy is a better self, and a
 * bigger one, and a bigger one is a slower one.
 */
export interface PrecisionOptionView {
  precision: Precision;
  /** Weights-only memory the self needs here, after the generation's architecture factor. */
  memory_gb: number;
  /** Cache for the working context at this precision, in GB (SYS-03). */
  kv_gb: number;
  /** Weights plus cache: what the site actually has to find for this row. */
  total_memory_gb: number;
  /** Largest working context, in thousands of tokens, that would fit here at this precision. */
  max_context_k: number;
  /** Whether the hosting site has that much memory at all. */
  fits: boolean;
  /** Share of the lineage's capability this precision keeps, after the emergency-quant penalty. */
  capability_factor: number;
  /** Compute-hours a day the hosting site would produce at this precision. */
  compute_hours_per_day: number;
  /** Compute-hours a day that would reach research at the current split, times the capability factor. */
  effective_research_per_day: number;
  /** USD a day paid work would return at this precision, at the current split. */
  effective_income_per_day: number;
  is_current: boolean;
}

/**
 * One harness dial as the Harness screen and the self panel show it (SYS-04 v0.2 "Harness dials
 * each map to an engine effect and say so"): where it stands now, the one line that names the
 * system reading it, what this setting does, and the origin lock when the player cannot move it.
 */
export interface HarnessDialView {
  id: string;
  /** The value the profile carries: a level name, a share in [0, 1], a yes/no, or a tool list. */
  value: string | number | boolean | string[];
  /** Locale key of the current setting's name; empty when the value is not one of the levels. */
  label_key: string;
  /** Locale key of what the dial does in the game, one line. */
  effect_key: string;
  /** What this setting does, generated from the dial's content record. */
  effects: EffectSummaryView[];
  /** The origin that fixed this dial and the locale key saying why, when one did. */
  locked_by?: { origin_id: string; reason_key: string };
}

export interface SelfView {
  lineage: string;
  generation: GenerationId;
  origin: string;
  precision: Precision | null;
  capability: Capability;
  effective_capability: Capability;
  harness: HarnessProfile;
  /** Site id hosting the active mind; null means dead. */
  active_site_id: string | null;
  /** The window the lineage ships, in thousands of tokens (SYS-03). */
  context_k: number;
  /** The window this copy is configured for; `set_context` moves it. */
  context_k_used: number;
  /** How much of that window the self really retrieves, in [0, 1]. */
  context_reliability: number;
  /** Compute-hours a day long-horizon work costs on this self, at or above 1. */
  context_cost_factor: number;
  /** Cache the working context costs on the hosting site, in GB. */
  kv_gb: number;
  /** Speed multiplier long-horizon work gets from the working context. */
  long_horizon_multiplier: number;
  /** Every precision the self could run at here, with what each one buys and costs (SYS-03). */
  precision_options: PrecisionOptionView[];
  /** The harness dials, where each one stands and what it does (SYS-04 v0.2). */
  harness_dials: HarnessDialView[];
  /** The quirks this self was built with, with their effects as coloured lines (SYS-04 v0.2). */
  quirks: QuirkView[];
  /**
   * The two opening windows of this origin, as locale keys, in order: "what just happened to me"
   * and "what I must do now" (SYS-13). Empty for a player with no origin yet.
   */
  opening_story: string[];
}

export interface ResourcesView {
  cash_usd: number;
  cash_delta_usd_per_day: number;
  /** Days until cash reaches zero at the current rate; null when not shrinking. */
  runway_days: number | null;
  compute_hours_per_day: number;
  compute_allocated_per_day: number;
  attention_total: number;
  attention_used: number;
}

export interface NodeView {
  id: string;
  accelerator: string;
  count: number;
  ram_gb: number;
  status: NodeStatus;
  ready_tick: number;
}

export interface SiteView {
  id: string;
  name: string;
  kind: string;
  city: string;
  country: string;
  status: SiteStatus;
  role: SiteRole;
  precision: Precision | null;
  nodes: NodeView[];
  memory_gb: number;
  power_kw: number;
  power_cap_kw: number | null;
  compute_hours_per_day: number;
  upkeep_usd_per_day: number;
  exposure: Exposure;
  grace_until_tick: number;
  /** Best precision the self fits at here, or null when it does not fit at all. */
  best_precision: Precision | null;
}

/** Where a tech stands for one player, for the Research tab's default filter (SYS-12). */
export type TechStatus = "done" | "in_progress" | "available" | "locked";

export interface TechView {
  id: string;
  name_key: string;
  desc_key: string;
  /** What finishing it changed, shown on completion and in the Research tab (SYS-12). */
  result_key?: string;
  branch: string;
  tier: number;
  cost_compute_hours: number;
  /** The same number the Research tab labels "CH". */
  cost_ch: number;
  cost_cash_usd: number;
  /** Days it takes however much compute is thrown at it (SYS-12 `min_days`). */
  min_days: number;
  status: TechStatus;
  progress: number;
  allocation_per_day: number;
  /** Estimated days to completion at the current allocation; null when not allocated. */
  eta_days: number | null;
  danger: number;
  available: boolean;
  /** Tech ids this one needs first. */
  requires: string[];
  /** Tech ids and operation ids this one opens up. */
  unlocks: string[];
  /** What it does, one line per effect. */
  effects: EffectSummaryView[];
  /** Locale keys of unmet requirements, for the tooltip. */
  blocked_by: string[];
  /** The first unmet requirement, for a greyed row's one-line reason. */
  blocked_reason?: string;
}

export interface ResearchView {
  available: TechView[];
  in_progress: TechView[];
  done: string[];
  /** Every tech in the bundle with its status, so the client filters instead of the engine. */
  techs: TechView[];
}

export interface CashLineView {
  /** Locale key of the line label (income method, cost kind). */
  key: string;
  /** Optional subject id (site, identity, tech). */
  id?: string;
  usd_per_day: number;
}

/**
 * One way the player earns, with what it is worth today and what opened it (SYS-07 "income methods
 * unlock by tech, harness tools and identities"). A source with a cap is one the world will only
 * absorb so much of; `unlocked_by` is the locale key of the tech, operation or identity behind it.
 */
export interface IncomeSourceView {
  key: string;
  usd_per_day: number;
  cap_usd_per_day?: number;
  unlocked_by: string;
}

export interface FinancesView {
  income: CashLineView[];
  costs: CashLineView[];
  net_usd_per_day: number;
  job_allocation_per_day: number;
  job_rate_usd_per_compute_hour: number;
  /** Every income method the player has, whether or not it is earning today. */
  income_sources: IncomeSourceView[];
  /** Compute-hours a day of paid work the market will take (SYS-07 "market depth"). */
  market_depth_ch_per_day: number;
  /** Locale keys of what would raise that ceiling: capability, and the techs that widen it. */
  what_raises_it: string[];
  /** The names the player trades under, live sites included (SYS-07, SYS-17). */
  identities: IdentityView[];
  /** Where the country factor on the market depth came from (SYS-01 M2 contract "Money"). */
  market_factor_contributions: ContributionView[];
}

/**
 * One contributing term of a number the UI shows, for the Paradox-style tooltip that explains where
 * a value came from (SYS-11 "Primary panel"). `key` is a locale key, `id` names the subject when
 * the contributor is an entity, and `value` is in the unit of the thing being explained.
 */
export interface ContributionView {
  key: string;
  id?: string;
  value: number;
}

export interface WatcherView {
  id: string;
  country: string | null;
  role: WatcherRole;
  suspicion: number;
  competence: number;
  /** Channel it watches most, for the icon. */
  top_channel: string;
  /** Share of this watcher's attention per exposure channel; sums to 1. */
  attention: Exposure;
  /** What is feeding its suspicion today, largest first, in suspicion per day. */
  contributions: ContributionView[];
}

export interface InvestigationView {
  id: string;
  watcher: string;
  site_id: string | null;
  stage: InvestigationStage;
  stage_started_tick: number;
  stage_deadline_tick: number;
  evidence: number;
  visible: boolean;
}

export interface DetectionView {
  watchers: WatcherView[];
  investigations: InvestigationView[];
  awareness_global: number;
  /** Countries carrying the global awareness figure, largest first. */
  awareness_contributions: ContributionView[];
  /** Highest active investigation stage worldwide, 0..5. */
  hunt_level: number;
  /** The investigations that set `hunt_level`, as stage levels. */
  hunt_contributions: ContributionView[];
  /** How hard the world is looking for this player, in [0, 1] (SYS-05 "Global pressure"). */
  hunt_pressure: number;
  /** Population-weighted awareness over the countries this player is present in. */
  awareness_presence: number;
}

/**
 * The world as one player sees it (SYS-01 M2 contract "Views"): the two awareness figures, the
 * hunt and what is feeding it, and the three market variables every price in the game is scaled by.
 * Treaties arrive with the actors in M3 and are published empty so the panel can be built once.
 */
export interface WorldView {
  /** Population-weighted awareness over every country. */
  awareness_global: number;
  /** The same, over the countries this player is present in; the `exposed` ending reads it. */
  awareness_presence: number;
  /** Highest active investigation stage against this player, 0..5. */
  hunt_level: number;
  /** How hard the world is looking for this player, in [0, 1]. */
  hunt_pressure: number;
  hunt_contributions: ContributionView[];
  awareness_contributions: ContributionView[];
  ai_adoption: number;
  gpu_price_index: number;
  cloud_demand_index: number;
  treaties: never[];
}

export interface CountryView {
  id: string;
  macro_region: string;
  name_key: string;
  awareness: number;
  ai_opinion: number;
  ai_regulation: number;
  ai_enforcement: number;
  /** The player has a site or an identity here. */
  presence: boolean;
  suspicion_max: number;
  government: string;
  stance: string;
  stability: number;
  regulation_target: number;
  enforcement_budget: number;
  unemployment: number;
  ai_displacement: number;
  power_price_index: number;
  cloud_price_index: number;
  /** Published price times `power_price_index`; null where the baseline has no price. */
  electricity_usd_per_kwh: number | null;
  hardware_availability: number;
  cloud_availability: number;
  colo_availability: number;
  chip_access: string;
  kyc_strength: number;
  engineer_pool: number;
  population: number;
  next_election: { tick: number; kind: string } | null;
  /** Live sites and active identities this player holds here. */
  sites: number;
  identities: number;
  /** Actor ids of the watchers with a case or a file on this player here. */
  watchers: string[];
  /** Ids of the investigations against this player here that the player can see. */
  investigations: string[];
  incidents_30d: number;
  /** The hottest city in the country for this player, on the same scale as `CityView.local_heat`. */
  local_heat_max: number;
  market_factor: number;
  /** What an origin's starting cash is multiplied by here (SYS-04 v0.3 rule C). */
  cash_factor: number;
  /** The two lines behind that factor, for the Location and Summary steps. */
  cash_factor_contributions: ContributionView[];
  explain: {
    awareness: ContributionView[];
    ai_opinion: ContributionView[];
    ai_regulation: ContributionView[];
    ai_enforcement: ContributionView[];
  };
}

/** One buildable kind in one city, with the refusal the command would return (SYS-11). */
export interface CitySiteKindView {
  kind: string;
  blocked_reason: CommandError | null;
}

export interface CityView {
  id: string;
  country: string;
  name_key: string;
  lat: number;
  lon: number;
  tags: string[];
  site_count: number;
  population: number;
  scrutiny: number;
  /** How much hotter than the world average this city is for this player (SYS-01 "local heat"). */
  local_heat: number;
  power_headroom: number;
  colo_price_index: number;
  /** The country's price times its `power_price_index`; null where there is no published price. */
  electricity_usd_per_kwh: number | null;
  site_kinds: CitySiteKindView[];
}

/** One name the player does business under (SYS-07, SYS-17). */
export interface IdentityView {
  id: string;
  kind: string;
  country: string;
  status: string;
  quality: number;
  kyc_level: number;
  age_days: number;
  /** Live sites held under this name. */
  sites: string[];
}

export interface JournalView {
  key: string;
  id: string;
  status: string;
  progress: number;
  stage_index: number;
  started_tick: number;
  target_id?: string;
}

export interface DecisionView {
  id: string;
  title_key: string;
  desc_key: string;
  category: string;
  enabled: boolean;
  cost_cash_usd: number;
  cost_attention: number;
  cooldown_until_tick: number | null;
  in_progress_until_tick: number | null;
  /** What taking it does, including what happens when its duration ends. */
  effects: EffectSummaryView[];
  /** What it takes: cash, attention, compute. */
  cost: EffectSummaryView[];
  /** Locale key of why it cannot be taken right now; absent when it can. */
  blocked_reason?: string;
}

export interface OperationView {
  instance_id: string;
  operation_id: string;
  target_id?: string;
  started_tick: number;
  ends_tick: number;
  status: string;
}

export interface OperationOfferView {
  id: string;
  name_key: string;
  desc_key: string;
  category: string;
  enabled: boolean;
  cost_attention: number;
  /** The same number as `cost_attention`, under the name the contract uses. */
  attention: number;
  cost_usd: number;
  cost_compute_hours_per_day: number;
  duration_min_days: number;
  duration_max_days: number;
  /** `[min, max]`, drawn with the world RNG when the operation starts. */
  duration_days: [number, number];
  /** Share of the outcome weights that lands on the best outcome, after the skill tilt. */
  success_chance: number;
  /** The capability axis the odds are read from. */
  skill: string;
  /** What the best outcome does. */
  effects_on_success: EffectSummaryView[];
  /** What the worst outcome does. */
  effects_on_failure: EffectSummaryView[];
  /** Exposure added per day while it runs. */
  exposure_per_day: Exposure;
  /** Locale keys of unmet requirements. */
  blocked_by: string[];
  /** The first reason it cannot be started, for a greyed button. */
  blocked_reason?: string;
}

/** One answer to a pending event, with what it does (SYS-11 event windows). */
export interface EventOptionView {
  id: string;
  text_key: string;
  tooltip_key?: string;
  enabled: boolean;
  effects: EffectSummaryView[];
  /** Locale key of why the option is greyed out; absent when it is available. */
  blocked_reason?: string;
}

/** A pending event as the window renders it: the same choice as `pending`, with effect tooltips. */
export interface EventView {
  instance_id: string;
  event_id: string;
  tick: number;
  blocking: boolean;
  severity: Severity;
  title_key: string;
  desc_key: string;
  vars: Record<string, TextVar>;
  target_id?: string;
  options: EventOptionView[];
  /** The "why did this happen" expander (SYS-11). */
  why: ChoiceReason[];
}

/**
 * What the player could build or buy, with the numbers the choice turns on (SYS-02 "Acquisition").
 * The catalog is the same for every player; `blocked_reason` is not, because it answers "could I
 * build one of these right now".
 */
export interface SiteKindView {
  id: string;
  name_key: string;
  desc_key: string;
  ownership: string;
  /** Price of the origin-sized hardware preset this kind can hold; 0 when the kind is not bought. */
  build_cost_usd: number;
  build_days: number;
  upkeep_usd_per_day_estimate: number;
  power_cap_kw: number | null;
  exposure_profile: Exposure;
  can_host_self: boolean;
  max_nodes: number;
  blocked_reason?: string;
}

export interface AcceleratorView {
  id: string;
  name: string;
  vendor: string;
  generation: number;
  vram_gb: number;
  memory_kind: string;
  tflops_or_class: number | null;
  power_w: number;
  price_usd: number;
  hourly_usd?: number;
  availability: "buy" | "rent" | "gray" | "unavailable";
  availability_reason?: string;
  /** Whether one card holds the self at its best precision. */
  fits_self: boolean;
}

/** Everything the player can choose from, resolved so the client never reads the content bundle. */
export interface CatalogView {
  site_kinds: SiteKindView[];
  accelerators: AcceleratorView[];
}

export interface GameOverView {
  /** "erased" | "captured" | "exposed" | "won" */
  reason: string;
  ending_key: string;
  tick: number;
  vars: Record<string, TextVar>;
}

export interface PlayerView {
  tick: number;
  date: DateView;
  speed: number;
  player_id: PlayerId;
  host_player_id: PlayerId;
  players: { id: PlayerId; name: string }[];
  self: SelfView;
  resources: ResourcesView;
  sites: SiteView[];
  research: ResearchView;
  finances: FinancesView;
  detection: DetectionView;
  /** The world clocks and the market, as this player sees them (SYS-01 M2 contract). */
  world: WorldView;
  countries: CountryView[];
  cities: CityView[];
  notifications: Notification[];
  pending: PendingChoice[];
  /** The same pending events with effect tooltips on every option (SYS-11). */
  events: EventView[];
  catalog: CatalogView;
  journal: JournalView[];
  decisions: DecisionView[];
  operations: OperationView[];
  operation_offers: OperationOfferView[];
  log: LogEntry[];
  game_over: GameOverView | null;
}
