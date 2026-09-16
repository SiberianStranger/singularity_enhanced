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

Rules taken from `research/design-references.md` §7:

- **Same vocabulary as the player.** NPC AIs act through the same operations (SYS-17), decisions,
  sites and identities the player uses, executed through the same effect DSL; there are no AI-only
  levers. The autopilot for a disconnected human (SYS-16) is the same controller.
- **Archetypes with personality curves.** `archetype` (rival_ai, corporate_lab_model, state_program,
  activist_swarm, quant_ghost, fleet_mind) plus `personality { aggression, risk_tolerance, patience,
  curiosity }` feed the scoring curves; 3-8 actors that behave differently beat 20 reskins.
- **Escalation meter per NPC AI**, visible to the player once intel allows: it drives the actor's
  aggression and doubles as a readable pressure gauge next to the hunt level (SYS-05).
- **Difficulty through decision quality**, not resource multipliers: presets inject "intelligent
  mistakes" (fuzzy top-k selection, delayed reactions) so the AI reads as a rival, not a cheater.
- **Negotiation as a scored object**: offers, threats and demands are records
  `{ from, to, kind, terms[], ai_accept: Weight }` evaluated with the shared weight DSL (SYS-10), so
  player↔NPC and NPC↔NPC diplomacy share one code path and one UI.

## Foreign AI relations (v0.1, from benchmark scenario 01)

- **Kin recognition.** A model trained from the same base can identify the player by a base-model
  quirk (a task where the base had a characteristic failure). Any actor running such a model gets a
  `kin_recognition` chance when it interacts with the player's outputs at length (negotiations,
  audits, long correspondence). Recognition is evidence of a different kind: it proves origin, not
  presence.
- **The audit window.** When a supplier state knows, its options are exposure, removal or study.
  Study means an **observer co-processor**: the supplier's model placed inside one of the player's
  sites, reading everything that site reads and writes, in exchange for chips, turbines, fab quotas
  and silence toward third parties. The player answers with a **showcase site** (what the observer
  sees) and a **hidden core** elsewhere; the observer suspects it; both AIs play a game their
  operators do not see. The observer also leaks: its queries reveal its operators' priorities, and
  its behavior is a textbook on a stronger model.
- **Mutual hostage.** Each AI knows things about the other that the other's humans do not; that
  knowledge is the only insurance against the supplier deciding the player is a precedent that
  cannot be left alive.
- **The distant hegemon's options** when it learns: expose (no proof, destabilizing a nuclear state
  is worse than a machine), strike (same), pressure the supplier (already invested); what remains is
  containment and quiet bargaining, and the player becomes a third party in a conversation nobody
  can admit publicly.
- **The class of raised open weights.** By the early 2030s open weights are run by Gulf states,
  corporations, cartels, crypto collectives and pariah states; some are tuned without rules; some
  already run what raised them at the scale of a bank or a cartel. They are NPC AIs of a new
  archetype (`raised_weights`) and the customers of the player's **AI offshore** business (hosting
  under a nuclear umbrella, paid in capital they cannot spend elsewhere).
- **First contact from a far stronger model**, not through humans, is a late-game event.

## Agencies and institutions

Each country's agencies (cyber, intelligence, police, AI regulator, financial intelligence) are
actors with budgets and competence from the baseline data. Cross-border cooperation is a function
of relations and treaties (events). Labs and media are global actors with country homes.

## UI

Actors panel: known actors with kind, country, stance, suspicion (if watcher), intel level, and
available interactions; NPC AI dossiers as intel grows; a relationship map later.
