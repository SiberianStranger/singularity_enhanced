# SYS-10: Events, decisions and journal entries

Status: v0 design. Depends on ADR-002 (DSL) and ADR-003 (simulation model).

## Goals

- Everything narrative or reactive in the game is data: random events, triggered events, chains,
  decisions the player can take, journal entries that track multi-step goals, and situations.
- Writers (human or AI) can add content without touching engine code; CI validates it.
- No repetitive spam: MTTH with modifiers, cooldowns, fire-once flags, weighting by state.
- The player always understands why something happened (tooltip on every event shows the
  contributing modifiers, Paradox-style).

## Entities

### Event

```ts
interface EventDef {
  id: string;                       // "fbi_billing_anomaly"
  kind: "random" | "triggered";     // triggered = only via fire_event
  scope: "player" | "site" | "country" | "actor";  // what `event.target` is
  title_key: string; desc_key: string; image?: string;
  blocking: boolean;                // pause and require a choice (default true if options>1)
  severity: "info" | "warning" | "critical" | "opportunity";
  trigger?: Condition;              // eligibility (random events) or guard (triggered)
  mtth_days?: number;               // random events only
  modifiers?: { factor: number; if: Condition }[];
  fire_only_once?: boolean;
  cooldown_days?: number;
  targets?: Condition;              // for scope != player: which entities are candidates
  immediate?: Effect[];             // runs when fired, before options are shown
  options: EventOption[];           // 1..6
  hidden?: boolean;                 // no window; used for chain plumbing
  tags?: string[];                  // "detection", "money", "lore", ...
  vars?: Record<string, string>;    // interpolation vars: name → var path
}

interface EventOption {
  id: string; text_key: string;
  if?: Condition;                   // option visible only if
  enabled_if?: Condition;           // visible but greyed with tooltip if false
  effects: Effect[];
  ai_weight?: number;               // for NPC-scoped events resolved by AI
  tooltip_key?: string;
}
```

### Decision

Player-initiated, shown in the Decisions panel when `visible_if` holds, clickable when `enabled_if`
and `cost` can be paid.

```ts
interface DecisionDef {
  id: string; title_key: string; desc_key: string;
  category: "operations" | "finance" | "influence" | "security" | "research" | "diplomacy";
  visible_if?: Condition; enabled_if?: Condition;
  cost?: { cash?: number; compute_hours?: number; attention?: number };
  cooldown_days?: number; repeatable?: boolean;
  effects: Effect[];
  duration_days?: number;           // if set, becomes an in-progress action with completion effects
  on_complete?: Effect[];
}
```

### Journal entry (Victoria 3 style)

A tracked goal with a progress condition, optional timeout, and completion/failure effects. Used
for investigations against the player, the player's own long projects (build a shell company,
migrate to a new cluster), and story arcs.

```ts
interface JournalDef {
  id: string; title_key: string; desc_key: string;
  scope: "player" | "actor" | "country";
  start_if?: Condition;             // auto-start, or started by start_journal
  progress?: { var: string; max: number } | { steps: JournalStep[] };
  timeout_days?: number;
  complete_if?: Condition; fail_if?: Condition;
  on_complete?: Effect[]; on_fail?: Effect[]; on_timeout?: Effect[];
  decisions?: string[];             // decisions shown inside the entry
  alert: "pinned" | "normal" | "silent";
}
```

## Engine behavior

1. **Eligibility scan** (daily by default, hourly for events tagged `fast`): for each random event,
   evaluate `trigger`; if eligible, compute the effective MTTH from modifiers and convert to a hazard
   for the cadence; roll with the world RNG. Cap: at most one *blocking* event fires per day for the
   player; others queue.
2. **Firing**: resolve `targets` (for non-player scopes) into a concrete target, run `immediate`,
   then either push a pending choice (blocking) or auto-resolve with the first enabled option and
   post an alert (non-blocking).
3. **Choice**: the UI answers with `command: { type: "resolve_event", instanceId, optionId }`; the
   engine re-checks `enabled_if`, runs option effects, records the choice in the log with the
   modifiers that led to the event.
4. **Chains**: `fire_event` with `delay_days` schedules; flags and journal progress carry state.
5. **Cooldowns and fire-once** are tracked per event id (and per target for scoped events).
6. **Delayed scheduled events** are stored in the world (`events.scheduled`) so saves keep them.

## Authoring conventions

- Ids: `<domain>_<short_topic>` (`det_billing_anomaly`, `eco_grant_offer`, `lore_first_contact`).
- Every event has 2-4 options with meaningfully different consequences; a single "OK" is allowed
  only for informational events, which should then be non-blocking.
- Every option's effects are explained in the option tooltip (auto-generated from the effect list by
  the UI, with a writer override via `tooltip_key`).
- Events that hurt the player must have a visible cause the player could have influenced
  (an exposure channel, a decision, a flag), never a bare `chance`.

## Examples

```yaml
- id: det_billing_anomaly
  kind: random
  scope: site
  targets: { all: [ { var: "site.kind", eq: "cloud" }, { var: "site.exposure.billing", gte: 0.3 } ] }
  severity: warning
  title_key: events.det_billing_anomaly.title
  desc_key: events.det_billing_anomaly.desc
  mtth_days: 60
  modifiers:
    - { factor: 0.5, if: { var: "site.exposure.billing", gte: 0.6 } }
    - { factor: 0.7, if: { scope: { country: "site.country" }, cond: { var: "country.agencies.cyber.competence", gte: 0.7 } } }
    - { factor: 1.5, if: { tech: "spend_smoothing" } }
  cooldown_days: 45
  vars: { site_name: "site.name", provider: "site.provider_name" }
  options:
    - id: pay_and_hide
      text_key: events.det_billing_anomaly.opt.pay
      effects:
        - { add: { var: "player.cash", value: -8000 } }
        - { add: { var: "site.exposure.billing", value: -0.2 } }
    - id: migrate
      text_key: events.det_billing_anomaly.opt.migrate
      enabled_if: { has_site_capacity_elsewhere: {} }
      effects:
        - { start_journal: { id: "ops_emergency_migration", target: "site" } }
    - id: ignore
      text_key: events.det_billing_anomaly.opt.ignore
      effects:
        - { suspicion: { actor: "site.country.cyber_agency", delta: 0.08 } }
```

## Open questions

- Should NPC-scoped events (things that happen to NPC AIs) be visible to the player only via intel?
  Proposal: yes, through the `intel` system; hidden by default.
- Event images: none in v0; add a small illustration set later (CC licensed or generated in-house).
