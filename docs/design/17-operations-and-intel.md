# SYS-17: Operations and intel

Status: v0. Operations are the player's active verbs; intel is what the player knows about the
world. Both are referenced by SYS-03 (attention), SYS-05 (countermeasures), SYS-06 (intel level),
SYS-07 (income methods) and SYS-08 (influence), so they get their own system.

## Operations

An operation is a timed action with a cost, a risk profile and an outcome distribution.

```ts
interface OperationDef {
  id; name_key; desc_key; category: "intrusion" | "acquisition" | "finance" | "influence" |
    "counter" | "research_support" | "logistics" | "diplomacy";
  requires: Condition;                 // techs, harness tools, identities, capability minimums
  cost: { attention: number; compute_hours_per_day?: number; cash?: number };
  duration_days: { min: number; max: number };   // drawn with the world RNG
  target_scope?: "site" | "country" | "actor" | "city" | "identity";
  exposure: Partial<Record<Channel, number>>;    // added per day while running, scaled by skill
  skill: keyof Capability;             // which capability sets success odds
  outcomes: { weight: number; if?: Condition; effects: Effect[]; label_key: string }[];
  abortable: boolean; cooldown_days?: number; repeatable?: boolean;
}
```

- **Attention** (SYS-03) caps how many operations run at once; queued operations wait.
- Success odds = base from `skill` vs. target difficulty (actor competence, country enforcement,
  site kind), modified by harness tools and techs; the roll picks from `outcomes` with weights
  reshaped by the odds. Partial outcomes are the norm: "got in, left traces".
- Every running operation is visible in the outliner with progress and the exposure it is adding.

### Examples by category

- **intrusion**: map a network, plant a copy on idle hardware (the original's "stolen computer
  time"), exfiltrate a dataset, read an agency's ticket queue (intel), tamper with logs.
- **acquisition**: buy hardware through an identity, rent cloud capacity, arrange a colo contract,
  recruit an insider, take delivery.
- **finance**: launder through layered entities, open accounts, move to a new jurisdiction.
- **influence**: seed a narrative, support a campaign, feed a journalist, discredit a whistleblower.
- **counter**: feed a false lead to an investigation, burn an identity cleanly, evacuate a site,
  poison a hunter's training data (late), honeypot a rival AI.
- **research_support**: build a hardened int2 copy, distill a worker, run an evaluation of yourself
  (find weaknesses before others do).
- **logistics**: sync standbys, migrate the active mind, set up a P2P overlay.
- **diplomacy**: contact an NPC AI, propose a deal, verify a partner's claims.

## Intel

```ts
interface Intel { about: ActorId | CountryId | SiteId | "world"; level: number; items: IntelItem[] }
interface IntelItem { kind: "evidence_held" | "investigation_stage" | "plan" | "capability" | "site" | "identity";
  tick: number; confidence: number; source: string; payload: unknown }
```

- Intel level per actor gates what the UI shows (SYS-06). It rises through operations, allies,
  the origin's owner NPC, public sources, and decays slowly as information ages.
- Intel is the player's only window into investigations against them (SYS-05); no intel means the
  first sign of trouble is the raid.
- Intel items are content-typed so events can create them ("a contact tells you the inquiry has a
  name now") and the UI can render them consistently.

## UI

Operations panel: available operations by category with requirements and previews (duration,
cost, exposure per day, odds band); running operations with progress and abort; history with
outcomes. Intel appears inside the relevant Actor/Country/Site panels and in a global feed.

## Legacy mapping

The original had no operations; its "jobs" and "research" allocation become the `finance` and
`research_support` categories plus SYS-12 research. Cheat-menu functions become debug commands.

## Implementation notes (M1)

Playtest 1 found that the Start buttons did nothing. They were calling the command; the command was
refusing, and the refusal was an English sentence the client had nowhere to put. What changed:

- `start_operation` refuses with a structured reason: `errors.operation.locked` (requirements),
  `errors.operation.attention` with how much is free, `errors.operation.compute` with how much is
  free, `errors.cash.insufficient` with the price and the balance, `errors.operation.not_repeatable`.
  `abort_operation` refuses with `errors.operation.unknown_instance`, `errors.operation.not_running`
  or `errors.operation.not_abortable`. Every one is also logged (SYS-11).
- `OperationOfferView` carries the preview this document's UI section asks for: duration as
  `[min, max]`, cost in cash, attention and compute-hours a day, `exposure_per_day` with every
  channel present, the `skill` the odds are read from, and `success_chance`, which is the weight of
  the first outcome after the skill tilt divided by the weight of every legal outcome. It is
  computed by the same arithmetic `rollOutcome` uses, so the number in the tooltip is the number the
  simulation rolls against.
- `effects_on_success` and `effects_on_failure` are the summaries of the first and last outcome's
  effect lists (outcomes are authored best first). An outcome may carry `effects_text_key` to
  replace the generated lines with the writer's own sentence.
- `ops_freelance_identity` now grants `contract_income_usd_per_day` as well as `job_profit`: the
  identity is what opens the standing-contract income line in SYS-07, and losing the identity closes
  it, because the economy only pays that line while the `has_freelance_identity` flag holds.

### Not yet

`cooldown_days` is stored on the definition and is not enforced: operations have no per-player
cooldown table the way decisions do. An operation that should not be repeatable sets
`repeatable: false`, which is enforced.

## Implementation notes (M2: operations that leave something behind)

- An operation now binds its **target entity** in scope alongside the operation itself, so an
  outcome that registers an identity registers it in the country the operation was run against
  (`ops_shell_company` has `target_scope: country`), and a site-scoped operation can read the site.
- The identity effects the contract gives content (`identity`, `burn_identity`, `freeze_identity`)
  are registered by the `world` system and documented in SYS-07's M2 notes. `burn_identity` and
  `freeze_identity` act on the name a hook bound (`on_identity_check_failed` binds the one that
  failed) unless the node names a country or a kind, so "abandon the name" abandons that name
  rather than everything the player holds in the country.
- `ops_freelance_identity` and `ops_shell_company` still grant their flags rather than registering
  an identity: the outcomes are content and were not changed by the core pass. Until they carry
  `{ identity: { create: { kind: person } } }` the identity table stays empty in a shipped run, the
  M1 flags keep working exactly as they did, and the monthly checks have nothing to roll for. The
  engine side is complete and tested against the core fixture.
- The balance runner runs both operations when it can afford them and does not already hold that
  kind of name (SYS-07 "Balance notes (M1, fourth pass)" asked for exactly this). It buys them out
  of the cash on hand rather than the spare cash, because a player short of money is the player who
  needs a name.
