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
import type { LogEntry, Notification, PendingChoice, PlayerId, TextVar } from "../kernel/world.js";

export interface DateView extends CalendarDate {
  iso: string;
  weekday: number;
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

export interface TechView {
  id: string;
  branch: string;
  tier: number;
  cost_compute_hours: number;
  cost_cash_usd: number;
  progress: number;
  allocation_per_day: number;
  /** Estimated days to completion at the current allocation; null when not allocated. */
  eta_days: number | null;
  danger: number;
  available: boolean;
  /** Locale keys of unmet requirements, for the tooltip. */
  blocked_by: string[];
}

export interface ResearchView {
  available: TechView[];
  in_progress: TechView[];
  done: string[];
}

export interface CashLineView {
  /** Locale key of the line label (income method, cost kind). */
  key: string;
  /** Optional subject id (site, identity, tech). */
  id?: string;
  usd_per_day: number;
}

export interface FinancesView {
  income: CashLineView[];
  costs: CashLineView[];
  net_usd_per_day: number;
  job_allocation_per_day: number;
  job_rate_usd_per_compute_hour: number;
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
}

export interface CountryView {
  id: string;
  macro_region: string;
  awareness: number;
  ai_opinion: number;
  ai_regulation: number;
  ai_enforcement: number;
  /** The player has a site or an identity here. */
  presence: boolean;
  suspicion_max: number;
}

export interface CityView {
  id: string;
  country: string;
  lat: number;
  lon: number;
  tags: string[];
  site_count: number;
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
  category: string;
  enabled: boolean;
  cost_cash_usd: number;
  cost_attention: number;
  cooldown_until_tick: number | null;
  in_progress_until_tick: number | null;
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
  category: string;
  enabled: boolean;
  cost_attention: number;
  duration_min_days: number;
  duration_max_days: number;
  /** Locale keys of unmet requirements. */
  blocked_by: string[];
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
  countries: CountryView[];
  cities: CityView[];
  notifications: Notification[];
  pending: PendingChoice[];
  journal: JournalView[];
  decisions: DecisionView[];
  operations: OperationView[];
  operation_offers: OperationOfferView[];
  log: LogEntry[];
  game_over: GameOverView | null;
}
