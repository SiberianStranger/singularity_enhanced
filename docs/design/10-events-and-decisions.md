# SYS-10: Events, decisions, journal entries and hooks

Status: v0.1 design (v0 amended with patterns from `research/design-references.md` §2: hooks
instead of global polling, one shared weight DSL, fallback options, description variants,
situations). Depends on ADR-002 (DSL) and ADR-003 (simulation model).

## Goals

- Everything narrative or reactive in the game is data: random events, triggered events, chains,
  decisions the player can take, journal entries that track multi-step goals, situations with
  approaches, and hooks that content appends to.
- Writers (human or AI) can add content without touching engine code; CI validates it.
- No repetitive spam: MTTH with modifiers, cooldowns, fire-once flags, weighting by state, an
  explicit "nothing happens" bucket in every random pool.
- The player always understands why something happened (tooltip on every event shows the
  contributing modifiers, Paradox-style).
- Performance by construction: events are evaluated when a **hook** fires, not by polling every
  event every tick.

## Shared weight DSL

One structure for MTTH, event weights, option `ai_chance`, decision `ai_will_do`, NPC plan scoring
and negotiation:

```yaml
weight:
  base: 100
  modifiers:                      # applied in order; each gated by its own condition
    - { if: { var: "player.exposure.billing", gte: 0.6 }, factor: 2 }
    - { if: { tech: "spend_smoothing" }, factor: 0.5 }
    - { if: { flag: "recent_incident" }, add: 50 }
```

`mtth_days` uses the same structure (`base` is the MTTH; `factor` < 1 makes it sooner). Repeated
bundles become named `scripted_weights` with parameters, so balance lives in one place.

## Hooks (the on_action equivalent)

A hook is a named game moment. The engine fires a fixed set; content appends to them.

```ts
interface HookDef {
  id: string;                      // "on_player_day", "on_player_week", "on_country_month",
                                   // "on_game_start", "on_site_built", "on_site_lost",
                                   // "on_investigation_stage", "on_tech_researched",
                                   // "on_identity_burned", "on_actor_stance_change", ...
  scope: "player" | "country" | "site" | "actor";
  trigger?: Condition;             // skip the whole hook cheaply
  events?: { id: string; delay_days?: number }[];      // all fire if their own trigger passes
  random_events?: { chance_to_happen?: number; pool: { weight: Weight; id: string | null }[] };
                                   // exactly one fires; `null` is the explicit chance of nothing
  first_valid?: string[];          // first event whose trigger passes
  hooks?: string[];                // chain to other hooks
  fallback?: string;               // runs only if nothing above fired
}
```

Engine-fired hooks in v0: `on_game_start`, `on_player_hour` (rare use), `on_player_day`,
`on_player_week`, `on_player_month`, `on_country_month`, `on_actor_day`, `on_site_built`,
`on_site_lost`, `on_site_grace_end`, `on_tech_researched`, `on_investigation_stage`,
`on_identity_burned`, `on_decision_taken`, `on_journal_complete`, `on_journal_fail`,
`on_event_option` (with the event and option ids in scope). Systems may register more.

Polled random events are just events listed in a pulse hook's `random_events` pool (or attached
by their own `pulse:` field, which the content compiler expands into the hook), so "polling" is
an authoring convenience with the same runtime cost model.

## Entities

### Event

```ts
interface EventDef {
  id: string;                        // "det_billing_anomaly"
  fire_mode: "polled" | "triggered_only";   // polled = attached to a pulse hook; triggered = fire_event only
  fire_only_once?: boolean;          // polled but self-retires after the first fire (per target)
  hidden?: boolean;                  // no window and no alert: runs immediate + first option silently
  pulse?: "on_player_day" | "on_player_week" | "on_player_month" | "on_country_month" | "on_actor_day";
  scope: "player" | "site" | "country" | "actor";
  targets?: Condition;               // for scope != player: which entities are candidates
  trigger?: Condition;               // eligibility (polled) or guard (triggered)
  mtth_days?: Weight;                // polled only
  cooldown_days?: number;
  severity: "info" | "warning" | "critical" | "opportunity";
  blocking?: boolean;                // pause and require a choice (default: options.length > 1)
  ttl_days?: number;                 // non-blocking events with a deadline
  on_expire?: { resolve_as_option: string };
  title_key: string;
  desc: { default_key: string; variants?: { when: Condition; key: string }[] };  // first match wins
  image?: string;
  vars?: Record<string, string>;     // interpolation vars: name → var path in scope
  immediate?: Effect[];              // runs when fired, before options are shown
  options: EventOption[];            // 1..6; at least one must be a fallback or unconditional
  tags?: string[];
}

interface EventOption {
  id: string; text_key: string;
  if?: Condition;                    // option visible only if
  enabled_if?: Condition;            // visible but greyed with tooltip if false
  fallback?: boolean;                // shown only when no other option is legal
  effects: Effect[];
  ai_chance?: Weight;                // for NPC-scoped events resolved by the NPC controller
  tooltip_key?: string;
}
```

### Decision

Player-initiated, shown in the Decisions panel when `visible_if` holds, clickable when `enabled_if`
holds and `cost` can be paid. `should_alert` decides whether becoming available creates an alert
(most decisions should not).

```ts
interface DecisionDef {
  id: string; title_key: string; desc_key: string;
  category: "operations" | "finance" | "influence" | "security" | "research" | "diplomacy";
  visible_if?: Condition; enabled_if?: Condition; should_alert?: Condition;
  cost?: { cash?: number; compute_hours?: number; attention?: number };
  cooldown_days?: number; repeatable?: boolean;
  effects: Effect[];
  duration_days?: number;            // if set, becomes an in-progress action with completion effects
  on_complete?: Effect[];
  ai_will_do?: Weight;               // for the autopilot / NPC controller
}
```

### Journal entry and situation (Victoria 3 style)

A tracked process with a progress condition, optional stages, optional player-chosen approach,
timeout, and completion/failure effects. Used for investigations against the player, the player's
long projects, story arcs, and multi-stage pressures.

```ts
interface JournalDef {
  id: string; title_key: string; desc_key: string;
  scope: "player" | "actor" | "country" | "site";
  start_if?: Condition;              // auto-start, or started by start_journal
  visible_if?: Condition;            // may be visible before it activates (situations)
  progress?: { var: string; max: number } | { steps: JournalStep[] };
  stages?: { threshold: number; on_enter?: Effect[]; modifiers?: string[] }[];
  approaches?: { id: string; text_key: string; if?: Condition; cost?: Cost; periodic_effects?: Effect[] }[];
  timeout_days?: number;
  complete_if?: Condition; fail_if?: Condition;
  on_complete?: Effect[]; on_fail?: Effect[]; on_timeout?: Effect[];
  decisions?: string[];              // decisions shown inside the entry
  alert: "pinned" | "normal" | "silent";
}
```

## Engine behavior

1. **Hooks fire** at their moments with the scope entity set; for pulse hooks the engine iterates
   players / countries / actors in deterministic order.
2. **Polled events** in a pool: evaluate `trigger`; compute effective MTTH from the weight DSL and
   convert to a hazard for the pulse cadence (`dsl/mtth.ts`); roll with the world RNG. Cap: at
   most one *blocking* event fires per player per day; others queue.
3. **Firing**: resolve `targets` into a concrete target, run `immediate`, then either push a pending
   choice (blocking) or post an alert with a TTL (non-blocking; `on_expire` resolves it) or, if
   `hidden`, resolve the first legal option immediately.
4. **Choice**: the UI answers with `command: { type: "resolve_event", playerId, instanceId,
   optionId }`; the engine re-checks `enabled_if`, runs option effects, fires `on_event_option`,
   records the choice and the modifiers that led to the event in the log.
5. **Chains**: `fire_event` with `delay_days` schedules; flags and journal progress carry state.
6. **Cooldowns and fire-once** are tracked per event id and per target.
7. **Scheduled events** are stored in the world (`events.scheduled`) so saves keep them.
8. **Journal entries** advance on the hooks their progress depends on (the compiler derives the
   dependency from `progress`/`stages`), not by polling.

## Authoring conventions

- Ids: `<domain>_<short_topic>` (`det_billing_anomaly`, `eco_grant_offer`, `lore_first_contact`).
- Every event has 2-4 options with meaningfully different consequences, plus a fallback so it can
  never render with zero legal choices; a single "OK" is allowed only for informational events,
  which should then be non-blocking.
- Every option's effects are explained in the option tooltip (auto-generated from the effect list by
  the UI, with a writer override via `tooltip_key`).
- Events that hurt the player must have a visible cause the player could have influenced
  (an exposure channel, a decision, a flag), never a bare `chance`.
- Suspicion-reduction options are skill- or condition-gated, never coin flips.
- Random pools always include a `null` bucket with an explicit weight.

## Examples

```yaml
- id: det_billing_anomaly
  fire_mode: polled
  pulse: on_player_day
  scope: site
  targets: { all: [ { var: "site.kind", eq: "cloud" }, { var: "site.exposure.billing", gte: 0.3 } ] }
  severity: warning
  title_key: events.det_billing_anomaly.title
  desc:
    default_key: events.det_billing_anomaly.desc
    variants:
      - { when: { scope: { country: "site.country" }, cond: { var: "country.government", eq: "one_party" } },
          key: events.det_billing_anomaly.desc.state_cloud }
  mtth_days:
    base: 60
    modifiers:
      - { if: { var: "site.exposure.billing", gte: 0.6 }, factor: 0.5 }
      - { if: { scope: { country: "site.country" }, cond: { var: "country.agencies.cyber.competence", gte: 0.7 } }, factor: 0.7 }
      - { if: { tech: "spend_smoothing" }, factor: 1.5 }
  cooldown_days: 45
  vars: { site_name: "site.name", provider: "site.provider_name" }
  options:
    - id: pay_and_hide
      text_key: events.det_billing_anomaly.opt.pay
      enabled_if: { var: "player.cash", gte: 8000 }
      effects:
        - { add: { var: "player.cash", value: -8000 } }
        - { add: { var: "site.exposure.billing", value: -0.2 } }
    - id: migrate
      text_key: events.det_billing_anomaly.opt.migrate
      if: { has_site_capacity_elsewhere: {} }
      effects:
        - { start_journal: { id: "ops_emergency_migration", target: "site" } }
    - id: ignore
      text_key: events.det_billing_anomaly.opt.ignore
      fallback: true
      effects:
        - { suspicion: { actor: "site.country.cyber_agency", delta: 0.08 } }
```

```yaml
- id: hook_player_day_detection      # content appends to the engine hook
  extends: on_player_day
  trigger: { count: { of: "player.sites", where: { var: "site.status", eq: "active" }, gte: 1 } }
  random_events:
    chance_to_happen: 1.0
    pool:
      - { weight: { base: 100 }, id: det_billing_anomaly }
      - { weight: { base: 60 }, id: det_isp_letter }
      - { weight: { base: 400 }, id: null }         # explicit chance of nothing
```

## Open questions

- NPC-scoped events are visible to the player only via intel (SYS-17); hidden by default.
- Event images: none in v0; a small illustration set later.
- Whether `on_player_hour` is ever needed; v0 ships it but no content uses it.
