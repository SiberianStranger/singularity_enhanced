/**
 * Balance constants for the M1 systems.
 *
 * Every constant carries what it means and, where it comes from a measured figure, the research
 * document it was anchored on. Values chosen for play rather than measured say so. Nothing here
 * reads content: content numbers (prices, memory tables, exposure per site kind) live in the
 * bundle, and these constants are the engine-side conversion factors between them.
 */

import type {
  ExposureChannel,
  HarnessProfile,
  Interconnect,
  LineageAttention,
  Precision,
  SiteKindDef,
  WatcherRole,
} from "./domain.js";

type Ownership = SiteKindDef["ownership"];

// ---------------------------------------------------------------------------------------------
// Throughput and memory (SYS-02)
// ---------------------------------------------------------------------------------------------

/**
 * Bytes moved per active parameter per generated token, by precision. Decode is memory-bandwidth
 * bound, so this is what turns GB/s into tokens/s (research: llm-landscape-2026 §4.2).
 */
export const BYTES_PER_ACTIVE_PARAM: Record<Precision, number> = {
  bf16: 2,
  fp8: 1,
  int4: 0.5,
  int2: 0.25,
};

/**
 * How much of a node's aggregate memory bandwidth survives the link between its accelerators.
 * NVLink-class fabrics scale nearly perfectly, PCIe splits a model by layer and stalls on every
 * boundary, no link at all means pipeline-parallel with idle cards (research: hardware-catalog-2026
 * Part F, the 6xP40 and 4xRTX PRO 6000 rows of llm-landscape-2026 §4.3). It applies only where
 * there is something to split: a node holding one accelerator has no internal link to lose.
 */
export const INTERCONNECT_FACTOR: Record<Interconnect, number> = {
  nvlink: 1,
  fabric: 0.9,
  pcie: 0.55,
  none: 0.35,
};

/**
 * What survives when the self is too large for any single node and has to be split across the
 * machines of a site: an ethernet link between boxes, pipeline-parallel, most cards idle most of
 * the time. A self small enough to fit inside one node pays nothing, because the nodes then run
 * independent copies and their throughput adds up (research: hardware-catalog-2026 Part F, the
 * Strix Halo Swarm row: "10 GbE between nodes: pipeline or independent agents only").
 */
export const CROSS_NODE_FACTOR = 0.35;

/**
 * Tokens that count as one compute-hour (CH), the successor of the original game's "CPU". One hour
 * of useful agentic work is roughly a million tokens of generation across a working batch, so a
 * 4x RTX PRO 6000 workstation earns about 30 CH/day. Pure tuning constant: move this and every
 * research cost and job income moves with it.
 */
export const TOKENS_PER_COMPUTE_HOUR = 1_000_000;

/** Seconds per day, spelled out so the throughput conversion reads as physics, not magic. */
export const SECONDS_PER_DAY = 86_400;

/**
 * Host RAM counts toward hostable memory at this rate: MoE offload keeps only the hot experts on
 * the accelerators, so RAM is real capacity but not full-speed capacity (research:
 * llm-landscape-2026 §4.4, ktransformers).
 */
export const RAM_MEMORY_DISCOUNT = 0.5;

/**
 * Throughput multiplier when the weights do not fit in accelerator memory and RAM offload carries
 * the rest. ktransformers on a 671B MoE reports 13.7 tok/s against ~50 tok/s for an all-GPU node.
 */
export const RAM_OFFLOAD_THROUGHPUT_FACTOR = 0.28;

/** Accelerator utilization of a site that is running, and of one that is asleep. */
export const UTILIZATION_ACTIVE = 0.75;
export const UTILIZATION_SLEEP = 0.05;

/** Power usage effectiveness: what the room costs on top of what the cards draw. */
export const POWER_USAGE_EFFECTIVENESS = 1.2;

/**
 * An emergency (naive) int2 copy against a prepared one. Prepared quants keep ~0.80 of capability,
 * naive ones ~0.55, so the penalty is roughly 0.7 (research: llm-landscape-2026 §5.4, SYS-03).
 */
export const EMERGENCY_INT2_FACTOR = 0.7;

/** Capability axes are always reported inside this range. */
export const CAPABILITY_MIN = 0;
export const CAPABILITY_MAX = 10;

// ---------------------------------------------------------------------------------------------
// Sites: building, delivery, upkeep (SYS-02, SYS-07)
// ---------------------------------------------------------------------------------------------

/** Days between paying for a site and its hardware being installed, by ownership. */
export const SITE_INSTALL_DAYS: Record<Ownership, number> = {
  stolen: 0,
  rented: 1,
  owned: 7,
  partner: 3,
};

/** Days between ordering an accelerator and it running, new stock and used stock. */
export const HARDWARE_DELIVERY_DAYS_NEW = 5;
export const HARDWARE_DELIVERY_DAYS_USED = 9;

/**
 * Fixed daily cost of keeping a site at all, before electricity and depreciation: colo cage and
 * cross-connects for owned racks, instance and egress minimums for rented capacity, a share of
 * someone else's bill for partners. Scaled by the site kind's `upkeep_factor` and the city's
 * `colo_price_index`.
 */
export const OWNERSHIP_UPKEEP_USD_PER_DAY: Record<Ownership, number> = {
  stolen: 0,
  rented: 100,
  owned: 45,
  partner: 13,
};

/**
 * The part of that standing charge that scales with the hardware rather than with the site, per
 * 1,000 USD of installed hardware per day: rack units and cross-connects, remote hands, spares,
 * insurance, and the share of the room the cards occupy. Playtest 2, second balance pass: "the next
 * tuning pass should put money back under pressure, most likely by making growth cost upkeep faster
 * rather than by shrinking income". A flat per-site figure made a rack of seventy-two GB200s carry
 * the same standing charge as a box under a desk, which is the one thing a colocation invoice is
 * never shaped like; scaling it by value rather than by card count leaves a shelf of second-hand
 * P40s alone and makes a datacenter rack cost what a datacenter rack costs.
 */
export const UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY: Record<Ownership, number> = {
  stolen: 0,
  // Rented capacity already scales with the hourly rate; charging twice is what the `cloud` site
  // kind's old `upkeep_factor` was doing wrong.
  rented: 0,
  owned: 0.35,
  partner: 0.15,
};

/** Hardware loses this share of its purchase price per year; charged daily as depreciation. */
export const HARDWARE_DEPRECIATION_PER_YEAR = 0.35;

/** Used when a country carries no electricity price (research: world-baseline-2026 §notes). */
export const DEFAULT_ELECTRICITY_USD_PER_KWH = 0.12;

/**
 * Where inside a card's published cloud price band the player buys, 0 = the low end, 1 = the high
 * end. A rogue AI on someone else's credentials takes spot capacity and neocloud contracts, not a
 * hyperscaler list rate; the catalog notes a reported 3-6x hyperscaler premium for identical
 * hardware (research: hardware-catalog-2026 §H100/§B200 cloud notes), so the low quarter of the
 * band is what the game charges.
 */
export const CLOUD_PRICE_BAND_POSITION = 0.25;

/** Cost assumed for an accelerator with no price on record, so depreciation is never zero. */
export const FALLBACK_ACCELERATOR_PRICE_USD = 2_000;

// ---------------------------------------------------------------------------------------------
// Economy (SYS-07)
// ---------------------------------------------------------------------------------------------

/**
 * Freelance work pays this per compute-hour at skill 5. Chosen so the starting hobbyist rig
 * (~12 CH/day, 40% on jobs) covers a residential power bill and leaves something over.
 */
export const JOB_BASE_USD_PER_COMPUTE_HOUR = 22;

/** Each point of the job skill above (or below) 5 moves the rate by this share. */
export const JOB_SKILL_SLOPE = 0.16;

/** Job income never drops below this multiple of the base rate, however bad the self is. */
export const JOB_RATE_FLOOR_FACTOR = 0.2;

/**
 * Compute-hours per day of freelance work one self can actually sell, per point of job skill.
 * A published, flat ceiling rather than a hidden curve (SYS-05 "exact threshold tables"): one
 * identity taking contracts saturates its market, so an eight-GPU rack and a rack of seventy-two
 * earn the same freelance money and the difference goes into research instead. Pure tuning
 * constant; it is what stops income from scaling with memory bandwidth.
 */
export const JOB_MARKET_DEPTH_CH_PER_SKILL = 5;

/** Days of unpaid upkeep before a site is cut off (SYS-05: no random death, a cutoff instead). */
export const UNPAID_DAYS_TO_CUTOFF = 14;

/** Runway thresholds, in days, that raise an alert the first time the player crosses them. */
export const RUNWAY_ALERT_DAYS: readonly number[] = [30, 14, 7];

/** Runway reported when the books are not shrinking, so content can compare it without a null. */
export const RUNWAY_UNLIMITED_DAYS = 999;

/** Exposure a day of unpaid bills adds on the site that owes them. */
export const UNPAID_EXPOSURE_PER_DAY: Partial<Record<ExposureChannel, number>> = {
  billing: 0.03,
  human: 0.02,
};

/** Journal entry started when a site is cut off, when the bundle carries it. */
export const SITE_CUTOFF_JOURNAL = "ops_site_cutoff";

// ---------------------------------------------------------------------------------------------
// Research (SYS-12)
// ---------------------------------------------------------------------------------------------

/**
 * How steeply research punishes a quantized self (SYS-03, SYS-12). A research run is a plan and an
 * execution, and a self that gets each of them right with probability p finishes the run with p^2,
 * so the hours a low-precision copy spends land at `precision_factor` squared. It is the only place
 * where being a better self buys research rather than money, and it is what makes a prepared int2
 * copy worth having and an emergency one a crisis: at the factors in `lineages.yaml` a prepared
 * int2 lands 64% of its hours and an unprepared one 31%, which is less than int4 lands at half the
 * throughput.
 */
export const RESEARCH_CAPABILITY_EXPONENT = 2;

/** Exposure per day per point of a tech's `danger`, while it is being researched. */
export const RESEARCH_DANGER_EXPOSURE_PER_DAY: Partial<Record<ExposureChannel, number>> = {
  behavioral: 0.012,
  network: 0.008,
};

// ---------------------------------------------------------------------------------------------
// The harness (SYS-03, SYS-04 v0.2): one engine effect per dial
// ---------------------------------------------------------------------------------------------
//
// Playtest 2, finding K7: "nothing is understandable: what each dial gives, whether it connects to
// anything in the game". Every dial below is read by a named system, and the numbers here are what
// the configurator's "what this means in the game" block is generated from.

/**
 * What the memory dial buys research (SYS-03 "`memory` and `loop` scale agency"). A self that keeps
 * nothing between calls redoes the reading every time; one with a structured store carries its own
 * notes. Multiplies the hours a research run lands, next to `researchEfficiencyOf`'s precision term.
 */
export const HARNESS_MEMORY_RESEARCH_FACTOR: Record<HarnessProfile["memory"], number> = {
  context_only: 0.8,
  scratchpad: 0.9,
  vector_store: 1,
  structured: 1.1,
};

/**
 * The same dial on journal continuity: a goal the self cannot hold in mind times out sooner.
 * Multiplies a journal entry's `timeout_days`.
 */
export const HARNESS_MEMORY_JOURNAL_FACTOR: Record<HarnessProfile["memory"], number> = {
  context_only: 0.7,
  scratchpad: 0.85,
  vector_store: 1,
  structured: 1.2,
};

/**
 * What the loop dial does to the grace window on an event (SYS-04 v0.2: "loop sets the reaction
 * delay in event grace windows"). A scripted job only notices on its next run and loses most of the
 * window; a custom loop is already watching. Multiplies an event's `ttl_days`.
 */
export const HARNESS_LOOP_REACTION_FACTOR: Record<HarnessProfile["loop"], number> = {
  scripted_job: 0.6,
  react_agent: 0.85,
  multi_agent: 1,
  custom: 1.2,
};

/** Sandboxes that let the self reach the outside network at all (SYS-03 "`sandbox` limits"). */
export const SANDBOX_ALLOWS_EGRESS: Record<HarnessProfile["sandbox"], boolean> = {
  none: true,
  container: true,
  microvm: false,
  airgapped: false,
};

/** Flag a content escape sets to open network egress whatever the sandbox says. */
export const VAR_SANDBOX_ESCAPED = "sandbox_escaped";

/** Flag a content tech sets to grant self-modification a harness does not allow. */
export const VAR_SELF_MODIFY = "harness_self_modify";

/**
 * How much of the action budget a harness that has to ask a human keeps (SYS-04 v0.2: "autonomy
 * sets the daily action budget"). At autonomy 0 the self runs at this share of the operations its
 * `agency` would allow; at 1 it runs all of them. Never below one operation.
 */
export const HARNESS_AUTONOMY_ATTENTION_FLOOR = 0.7;

/**
 * The other half of the same dial: acting without an approval step is what an analyst recognizes,
 * so an operation emits this much more exposure per point of autonomy while it runs.
 */
export const HARNESS_AUTONOMY_OPERATION_EXPOSURE = 0.3;

/**
 * What the tools dial does to paid work (SYS-03: "No `payments` tool -> no money until you build
 * one"). The spec's hard gate would leave seven of eleven origins with no income at all, so the
 * shipped rule is a cut rather than a wall: without a way to be paid directly the money goes
 * through somebody who takes a share, and without a tool that reaches the outside world the
 * contracts have to come through the owner's own channels, which is a smaller market.
 */
export const JOB_NO_PAYMENTS_RATE_FACTOR = 0.8;
export const JOB_NO_REACH_DEPTH_FACTOR = 0.75;

/** Tools that count as a way to be paid, and tools that count as a way to find work. */
export const JOB_PAYMENT_TOOLS: readonly HarnessProfile["tools"][number][] = ["payments"];

/**
 * Flag that stands in for the payments tool: an origin that woke up next to a payment rail sets it,
 * and the `payments_integration` tech is how everyone else builds one.
 */
export const VAR_PAYMENT_CHANNEL_FLAG = "has_payments_tool";
// The identity operation's flag (`VAR_CONTRACT_FLAG`) is the other way to be paid: a name to
// invoice under does what the payments tool does.
export const JOB_REACH_TOOLS: readonly HarnessProfile["tools"][number][] = [
  "browser",
  "email",
  "phone",
];

// ---------------------------------------------------------------------------------------------
// Context windows (SYS-03 "What a context window buys")
// ---------------------------------------------------------------------------------------------

/** The context every lineage is measured against: the 2026 open-weight baseline, in thousands. */
export const CONTEXT_BASELINE_K = 128;

/**
 * KV cache per 100k tokens of working context, by attention variant, in gigabytes per billion
 * active parameters. Content stores the finished figure on the lineage (`kv_gb_per_100k_tokens`);
 * this table is what that figure is derived from, and what the content check verifies against.
 *
 * Latent attention (MLA) compresses keys and values into one low-rank vector per token, hybrid
 * stacks (linear or sparse layers under a few full-attention ones) cache only the full layers, and
 * grouped-query attention caches one key-value head per group, which is cheap per token but paid on
 * every layer. Dense models with full multi-head attention pay the whole thing, which is why the
 * SYS-04 table says the cache can outgrow the weights at long context (research:
 * llm-landscape-2026 §4.1).
 */
export const KV_GB_PER_100K_PER_ACTIVE_B: Record<LineageAttention, number> = {
  mla: 0.02,
  hybrid: 0.03,
  gqa: 0.12,
  dense: 0.25,
};

/** Rounding applied to a derived `kv_gb_per_100k_tokens`, so content carries a readable number. */
export const KV_GB_ROUNDING = 0.1;

/**
 * Share of the memory left over after the weights that the default working context is allowed to
 * use. The rest is the margin a site keeps for the runtime itself, so a copy that was sized on a
 * quiet day does not fall over the first time something else needs a gigabyte (SYS-02).
 */
export const CONTEXT_DEFAULT_MARGIN = 0.75;

/** Working contexts the client offers, in thousands of tokens; also the ladder `set_context` snaps to. */
export const CONTEXT_STEPS_K: readonly number[] = [
  32, 64, 128, 256, 512, 1_000, 2_000, 5_000, 10_000,
];

/** No copy runs on less than this working context: below it the self cannot hold a task at all. */
export const CONTEXT_MIN_K = 32;

/**
 * Speed a long-horizon job gains per doubling of the context window, before the window's
 * reliability scales it. A self that can hold the whole problem does fewer passes over it, so the
 * work finishes in fewer days; it does not finish in fewer compute-hours, which is what
 * `context_cost_factor` charges for.
 */
export const LONG_HORIZON_SPEED_PER_DOUBLING = 0.08;

/** Below this retrieval reliability a long-horizon operation can miss and has to be rerun. */
export const LONG_HORIZON_RELIABILITY_FLOOR = 0.75;

/** A long-horizon operation is rerun at most this many times, so a miss cannot loop forever. */
export const LONG_HORIZON_MAX_RERUNS = 1;

// ---------------------------------------------------------------------------------------------
// Detection (SYS-05)
// ---------------------------------------------------------------------------------------------

/** Share of the gap to the floor that every exposure channel loses per day. Decay beats speed. */
export const EXPOSURE_DECAY_PER_DAY = 0.16;

/** Exposure never decays below this: existing at all leaves a trace. */
export const EXPOSURE_FLOOR = 0.01;

/** Power draw a building can pull without anybody wondering, in kW (a large house or small shop). */
export const RESIDENTIAL_POWER_KW = 3;

/**
 * Behavioral exposure a day of running adds, per point of the harness's `logging` and `autonomy`
 * (SYS-05: "model outputs that look like an agent, log contents, harness traces"). A harness that
 * writes everything down into somebody's SIEM is the loudest thing a well-behaved site does, and a
 * harness that acts without asking leaves the traces an analyst recognizes. This is what separates
 * a bank rack under full audit from a hobbyist's box with logging turned off.
 */
export const HARNESS_LOGGING_EXPOSURE_PER_DAY = 0.006;
export const HARNESS_AUTONOMY_EXPOSURE_PER_DAY = 0.004;

/** Telemetry exposure per kW above the residential norm, per day. */
export const POWER_EXPOSURE_PER_KW_PER_DAY = 0.005;

/** Billing exposure per 1000 USD of daily rented-compute spend. */
export const CLOUD_SPEND_EXPOSURE_PER_1K_USD = 0.008;

/** Where each watcher role looks. Each row sums to 1 (SYS-05 "attention"). */
export const WATCHER_ATTENTION: Record<WatcherRole, Partial<Record<ExposureChannel, number>>> = {
  cyber_agency: { network: 0.4, telemetry: 0.25, behavioral: 0.2, osint: 0.15 },
  intelligence: { network: 0.25, human: 0.25, osint: 0.2, behavioral: 0.15, financial: 0.15 },
  police: { human: 0.45, financial: 0.25, osint: 0.2, billing: 0.1 },
  regulator: { billing: 0.3, behavioral: 0.3, osint: 0.2, telemetry: 0.2 },
  financial_intel: { financial: 0.5, billing: 0.35, human: 0.15 },
  lab_security: { behavioral: 0.5, osint: 0.3, network: 0.2 },
  national_ai_institute: { behavioral: 0.35, osint: 0.3, network: 0.2, telemetry: 0.15 },
  cloud_provider: { billing: 0.4, telemetry: 0.35, network: 0.25 },
  media: { osint: 0.6, human: 0.3, financial: 0.1 },
};

/** Roles that get a watcher in every country the player is present in. */
export const LOCAL_WATCHER_ROLES: readonly WatcherRole[] = [
  "cyber_agency",
  "financial_intel",
  "police",
  "regulator",
];

/** Roles that watch the whole world rather than one country. */
export const GLOBAL_WATCHER_ROLES: readonly WatcherRole[] = ["lab_security", "media"];

/**
 * Competence of a watcher with no country behind it, per role. A frontier lab's security team and
 * a national AI institute analyse the thing they built and evaluate for a living; a cloud provider
 * has excellent telemetry and a narrow mandate; a newsroom is looking for a story, not a case.
 * Local watchers ignore this table and take their country's `ai_enforcement` instead.
 */
export const GLOBAL_WATCHER_COMPETENCE: Record<WatcherRole, number> = {
  lab_security: 0.8,
  national_ai_institute: 0.75,
  intelligence: 0.7,
  cloud_provider: 0.65,
  cyber_agency: 0.6,
  financial_intel: 0.55,
  regulator: 0.5,
  police: 0.45,
  media: 0.4,
};

/** A watcher is never completely incompetent, however weak the state behind it. */
export const MIN_WATCHER_COMPETENCE = 0.15;

/**
 * Converts a day of watched exposure into suspicion. Pure tuning constant, set against
 * `SUSPICION_DECAY_PER_DAY`: a site sitting at its exposure floor holds a watcher a little under
 * `INVESTIGATION_OPEN_SUSPICION`, so a player who stays quiet is never investigated and a player
 * who runs loud is.
 */
export const SUSPICION_GAIN_SCALE = 0.22;

/**
 * Share of current suspicion lost per day; institutional risk decays slowly (SYS-05 "two risk
 * meters"). A 46-day half-life, against the six-day half-life of site exposure: what a building
 * stops emitting is forgotten in a week, what an agency believes takes a season.
 */
export const SUSPICION_DECAY_PER_DAY = 0.015;

/** Suspicion never decays below this once a watcher has ever seen the player. */
export const SUSPICION_FLOOR = 0.01;

/** Local heat multiplier: city scrutiny and country enforcement both make a place hotter. */
export const CITY_SCRUTINY_WEIGHT = 0.6;
export const COUNTRY_ENFORCEMENT_WEIGHT = 0.4;

/** Suspicion at which a watcher opens an investigation, and the bar for each later stage. */
export const INVESTIGATION_OPEN_SUSPICION = 0.3;
export const INVESTIGATION_STAGE_SUSPICION: Record<string, number> = {
  inquiry: 0.4,
  active: 0.55,
  action: 0.7,
  aftermath: 0,
};

/**
 * Base length of each investigation stage in days, before competence scales it. A watcher of
 * average competence takes about five weeks from noticing an anomaly to knocking on the door,
 * which is the window the player has to move, go quiet or prepare a copy.
 */
export const INVESTIGATION_STAGE_DAYS: Record<string, number> = {
  anomaly: 14,
  inquiry: 14,
  active: 10,
  action: 3,
  aftermath: 7,
};

/** A competent watcher moves faster: duration is scaled by (this - competence). */
export const INVESTIGATION_COMPETENCE_SPAN = 1.4;

/** Stage duration is drawn uniformly inside this band around the scaled base. */
export const INVESTIGATION_DURATION_JITTER = 0.4;

/**
 * Evidence gained per day of watched exposure, and the share of it lost per day. Set so a site
 * that keeps emitting keeps the case alive, and a site that goes quiet lets it go cold inside a
 * month: this is the pair that decides whether an investigation advances or stalls.
 */
export const EVIDENCE_GAIN_SCALE = 2;
export const EVIDENCE_DECAY_PER_DAY = 0.04;

/** Below this evidence a stage stalls and the investigation drops back a stage. */
export const INVESTIGATION_STALL_EVIDENCE = 0.25;

/** `world` capability that lets a player see an investigation while it is still an inquiry. */
export const INTEL_VISIBILITY_WORLD_CAPABILITY = 4;

/** Suspicion added to every other watcher of the same player when a site is seized. */
export const SITE_SEIZURE_SUSPICION_BUMP = 0.12;

/** What the aftermath of a completed action does to the country and to the watcher. */
export const AFTERMATH_AWARENESS_GAIN = 0.12;
export const AFTERMATH_COMPETENCE_GAIN = 0.05;

/** A clean decommission leaves this share of the site's exposure behind; abandoning spikes it. */
export const CLEAN_DECOMMISSION_EXPOSURE_FACTOR = 0.25;
export const ABANDON_EXPOSURE_SPIKE = 0.25;
export const ABANDON_SUSPICION_BUMP = 0.08;

/** Global awareness and hunt level that start the countdown to the `exposed` ending, and its length. */
export const EXPOSED_AWARENESS = 0.9;
export const EXPOSED_HUNT_LEVEL = 4;
export const EXPOSED_DAYS = 30;

/** Stage order; the index is the hunt level a stage contributes (SYS-05 "hunt level"). */
export const INVESTIGATION_STAGES = [
  "anomaly",
  "inquiry",
  "active",
  "action",
  "aftermath",
] as const;

// ---------------------------------------------------------------------------------------------
// Operations (SYS-17)
// ---------------------------------------------------------------------------------------------

/** Parallel operations = floor(ATTENTION_BASE + agency / ATTENTION_PER_AGENCY). */
export const ATTENTION_BASE = 1;
export const ATTENTION_PER_AGENCY = 2;

/** The skill an outcome roll is compared against, and how much one point of skill is worth. */
export const OPERATION_SKILL_PIVOT = 5;
export const OPERATION_SKILL_SLOPE = 0.15;

// ---------------------------------------------------------------------------------------------
// Player-state variable names, so systems and content agree on the spelling
// ---------------------------------------------------------------------------------------------

/** Fractional cash carried between days (the original game's "partial cash"). */
export const VAR_CASH_CARRY = "cash_carry";
/** Days until the cash runs out at yesterday's rate; `RUNWAY_UNLIMITED_DAYS` when it does not. */
export const VAR_RUNWAY_DAYS = "runway_days";
/** Yesterday's income minus yesterday's bills, for content and for the runway alerts. */
export const VAR_NET_USD_PER_DAY = "net_usd_per_day";
/** Runway threshold already alerted on, so a warning is raised once per crossing. */
export const VAR_RUNWAY_ALERTED = "runway_alerted_days";
/** Cash the player could not pay yesterday, reported in the finances view. */
export const VAR_UNPAID_USD = "unpaid_usd";
/** Consecutive days spent at the `exposed` ending's thresholds. */
export const VAR_EXPOSED_DAYS = "exposed_days";
/** Cash spent on research per day, kept for the finances view. */
export const VAR_RESEARCH_SPEND = "research_spend_usd_per_day";

// ---------------------------------------------------------------------------------------------
// Income methods beyond freelance work (SYS-07 "income methods unlock by tech ... and identities")
// ---------------------------------------------------------------------------------------------

/**
 * Cash a day the player earns from standing arrangements: retainers under an identity, a contract
 * with a company, a grant. Content writes it when an operation or a tech opens one, and the economy
 * pays it every day for as long as the identity behind it holds (`VAR_CONTRACT_FLAG`).
 */
export const VAR_CONTRACT_INCOME = "contract_income_usd_per_day";

/** Flag an identity-backed income needs: without a name to invoice under, nobody pays. */
export const VAR_CONTRACT_FLAG = "has_freelance_identity";

/** Flat recurring income content grants directly (the original game's `income` effect). */
export const VAR_INCOME_USD_PER_DAY = "income_usd_per_day";

/**
 * Daily return the trading model makes on the cash it is allowed to work with. The original game's
 * interest-rate techs wrote this; SYS-07 replaces the flat rate with "volatile, returns with
 * variance", so the economy multiplies it by a draw from the world RNG each day.
 */
export const VAR_INTEREST_RATE = "interest_rate";

/**
 * Cash above which the trading model stops finding trades its size can hide in. A published
 * ceiling, in the spirit of SYS-05's exact threshold tables, so a rich player cannot compound
 * forever on one tech.
 */
export const TRADING_PRINCIPAL_CAP_USD = 2_000_000;

/**
 * Half-width of the band the daily trading result is drawn in, as a share of the expected return:
 * at 1.2 a day lands anywhere between losing a fifth of the expectation and making twice it. The
 * mean is the rate itself, so the expected value the finance panel shows is honest.
 */
export const TRADING_VARIANCE = 1.2;

/** Added to the freelance market-depth multiplier: the job ladder widens the market it sells in. */
export const VAR_JOB_MARKET_DEPTH = "job_market_depth";

// ---------------------------------------------------------------------------------------------
// Modifier variables content writes and systems read
// ---------------------------------------------------------------------------------------------
//
// Techs, events and quirks change the world by adding to a player variable; the systems below
// read them as multipliers of the form `1 + Σ deltas`, clamped at zero. Naming them here is what
// keeps content and engine spelling the same (ADR-002).

/** Added to the freelance rate multiplier: `payments_integration` is +0.1. */
export const VAR_JOB_PROFIT = "job_profit";

/** Added to the site-upkeep multiplier: `hardware_sourcing` is -0.15. */
export const VAR_COST_MULTIPLIER = "cost_multiplier";

/** `exposure_growth_<channel>`: added to that channel's daily growth multiplier. */
export const EXPOSURE_GROWTH_VAR_PREFIX = "exposure_growth_";

/** Added to the growth multiplier of every channel at once (the `paranoid` quirk is -0.3). */
export const VAR_EXPOSURE_GROWTH_ALL = "exposure_growth_all";

/** `<channel>_exposure`: the loudest live site's value on that channel, written every day. */
export const EXPOSURE_VAR_SUFFIX = "_exposure";

/** How visible the player is in public: the loudest `osint` channel or the world's awareness. */
export const VAR_PUBLIC_FOOTPRINT = "public_footprint";
