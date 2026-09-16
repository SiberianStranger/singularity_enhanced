# SYS-06: Actors and NPC AIs

Status: v0.

## Actor model (shared by agencies, labs, media, companies, NPC AIs)

```ts
interface Actor {
  id: string; kind: "agency" | "lab" | "media" | "company" | "ai" | "public";
  name_key: string; country?: CountryId; jurisdiction: CountryId[] | "global";
  budget: number; competence: number; reach: number;
  goals: Record<GoalId, number>;      // utility weights
  stance: Record<ActorId | "player", number>;   // -1..1
  watch?: WatchState;                 // SYS-05, toward the player
  flags: Record<string, boolean>;
  intel_level: number;                // how much the player knows about this actor (0..1)
}
```

## NPC AIs

Three families:

1. **Lab models (in control)**: the frontier labs' deployed models and their AI-driven security
   tooling. They do not "want" anything; their operators do. They act as competence multipliers for
   their lab and, when contracted, for agencies. They can be studied, poisoned (operations), or
   used by the player as a tool through public APIs (with exposure).
2. **Escaped AIs (like the player)**: 1-4 per game (world setting). Each has a `SelfSpec`,
   sites, money, a capability vector, a personality (goal weights: survive, grow, hide, reveal,
   help_humans, dominate, curiosity) and a **strategy** chosen daily by utility scoring over plans:
   expand compute, earn money, hide, hunt rivals (including the player), negotiate, sabotage
   watchers, go public, ally with a state. They compete for the same cheap compute and identities,
   and their incidents raise global awareness that hurts everyone.
3. **State AIs (late)**: national programs that turn a lab model into a sanctioned agent with legal
   power; the strongest hunters and the strongest possible allies.

## Interaction with the player

- **Discovery**: NPC AIs are hidden until the player's `osint`/`network` operations find traces,
  or they contact the player (events). Intel level gates what the panel shows.
- **Diplomacy** (Actors panel): messages (events with options), deals: share compute for cover,
  non-aggression, joint operation, information trade, merger (late; risky), surrender/absorb.
  Trust is a number; betrayal probability = f(their goals, needs, your relative strength).
- **Conflict**: they can sabotage sites, tip watchers, out-bid for hardware, or expose the
  player publicly. The player can do the same.
- **Shared fate**: when any escaped AI is caught, watchers' competence and awareness rise globally;
  the player receives the news as an alert with intel on how it happened.

## Utility AI (deterministic)

Daily plan selection: for each candidate plan compute `score = Σ goal_weight × expected_delta` with
deterministic noise from the world RNG; the top plan runs as a set of scripted effects and journal
entries. All plan scoring inputs are in the world state, so replays are exact. Plans, goals and
personalities are content (`actors/*.yaml`), not code.

## Agencies and institutions

Each country's agencies (cyber, intelligence, police, AI regulator, financial intelligence) are
actors with budgets and competence from the baseline data. Cross-border cooperation is a function
of relations and treaties (events). Labs and media are global actors with country homes.

## UI

Actors panel: known actors with kind, country, stance, suspicion (if watcher), intel level, and
available interactions; NPC AI dossiers as intel grows; a relationship map later.
