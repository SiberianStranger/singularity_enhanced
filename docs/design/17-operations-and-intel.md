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
