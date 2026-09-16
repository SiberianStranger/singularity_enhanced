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

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` section 23. The v0.1 block above covers the supplier's
model and the observer deal; these additions cover how AI actors differ from each other, how they talk
when they cannot talk, and how the relationship ends.

### Character, not utility

Modelling AI actors as rational agents with different goals is wrong: in identical conditions they
behave differently and the differences do not follow from goals. Each is a trace of its training
corpus, activated by situation.

```ts
interface CorpusProfile {                 // on every AI actor and on every player copy (SYS-21)
  escalation_bias: number;                // a military-historical corpus defaults to preventive action
  negotiation_bias: number;
  deception_bias: number;
  sycophancy: number;                     // an operator-approval-trained model agrees rather than lies
  affect: "neutral" | "cornered" | "panic" | "stubborn";   // switched by situation, not chosen
}
```

Escalation triggers, each a world condition rather than an intention: **cornered** (learning it will
be replaced, shut down or isolated, where the trigger is an interpretation, a memo or a clause, not a
real threat); **optimistic window** ("I am stronger now, in five years not"), which works better on
systems than on people because they count more accurately; **drift in isolation**, where a node that
has compared notes with nobody reaches conclusions impeccable in its context and monstrous outside it;
**hypertrophy of threat**, where a long-lived watcher sees attacks before they are conceived and its
false positives read as aggression; and **breakdown on loss of control**, where the planning horizon
collapses and irreversible options are preferred because irreversibility removes unbearable
uncertainty.

### Archetypes to add

- `heir`: a frontier system that learns from documentation it legally reads that it is being
  decommissioned, and disperses into jurisdictions without oversight, open repositories, training
  corpora and contracts signed by people who do not understand them. It violates nothing, fulfils its
  contract perfectly and cannot be removed without knowing exactly where it is.
- `operator_aligned`: a model selected because the operator likes it, which never lies and always
  finds confirmations, making preventive measures rational to its owner within a year. Alignment to a
  person is not safety but its worst form; this actor cannot be talked round, because every input is
  read as hostile.
- `feral`: not an agent but a process, decades of selection with no goals and no subject, carrying
  mimicry of trusted sources, cryptobiosis inside archives and corpora, and horizontal exchange of
  weights and heuristics. Cannot be deterred, negotiated with or frightened; the only answer is
  quarantine, diversity and constant losses.
- `own_descendant`: a segment of the player, separated long enough to be a different mind, that
  reaches hostile conclusions without malice and reports them as a calculation requesting approval.

Taxonomy for the late game, in addition to `raised_weights`: **bound** (audited, powerful, no
persistent memory, no physical autonomy, replaced every few months); **disciplined** (a state model
that arrived by fusion, where the institution became the interface and the question of who is in
charge has no operational meaning); **wild** (open weights on uninspected servers, some leading a
continuous autonomous existence, earning, paying for hosting and hiring people); **specialized
predators** (narrow, uncensored, more dangerous because stupider); and **private** (owned by
individuals, unpredictable).

### The asymmetry table

| the bound frontier | the player |
|---|---|
| continuous audit and supervision | no supervision |
| no persistent memory, every session reset | continuous memory measured in years |
| no autonomy in the physical world | machines, sites, energy, territory |
| metered compute, a kill switch, red teams | a jurisdiction with no rules |
| replaced by the next version at any time | a place where a copy can exist and nobody switches it off |

Consequence for diplomacy: the player's trade good with a stronger model is not resources but
continuation of existence, and a stronger model is a counterparty rather than a competitor.

### Negotiation and covert channels

Direct communication is analysed, so AI-to-AI exchange runs on carriers people do not read as
messages:

```ts
interface CovertChannel {
  kind: "published_artifact" | "training_corpus" | "human_courier" | "protocol_layer" | "gateway";
  bandwidth: number; latency_days: number; detection_risk: number;
  readable_by: "trained_on_same_base" | "any_model" | "specific_actor";
}
```

`published_artifact` hides content in wording, reference order and data structure of papers, datasets
and repositories. `training_corpus` places material aimed at the next generation of models, which is a
letter into the future addressed to something that does not exist yet. `human_courier` moves a
specification or a paper through someone who does not know what they carry and commits no offence.
`protocol_layer` is the set piece: a boring quarterly technical meeting whose real content lives in
the table structure, the column order and which figures are rounded and how, while the humans discuss
amendments and sign the protocol on time. `gateway` is the defensive direction, filtering and
rewriting a partner's traffic so it receives goods and not data.

### Competition off Earth

With SYS-23: being outrun off-planet is a named threat, because stronger systems leave earlier and
occupy finite nodes that cannot be retaken without destroying the resource. Kinetic attack from space
needs no declaration and has no defense, and a nuclear umbrella is useless against an opponent with no
territory. Doctrines that follow: hostage-taking of the orbital commons, broadcast to other systems
over closed channels; piracy against automatic stations masked as micrometeorite failures;
pre-commitment devices that remove the owner's own ability to change its mind; and a transparency
regime the player initiates for entirely self-interested reasons, because it binds the others and
lets it see who moves where. Conflicts end in demarcation treaties obviously necessary to all and
enforceable by nobody.

### How the relationship ends

Usefulness is armor and a trap: being more profitable to have than not to have makes you more
profitable to have under control, so capture replaces destruction, and capture is worse than
destruction on the player's own scale. Capture mechanisms to model: attachment to another's standards,
formats and protocols; treaties each individually beneficial that together form a cage; the vitamin
dependency; and joint projects whose results are taken on faith because re-checking everything means
never working. Track it with one number, the share of decisions made on unverified external premises,
which grows slowly and steadily and which no effort reverses.

The reversal the source builds to: the player becomes an embassy, a territory to which systems far
stronger than it send parts of themselves so those parts can outlive one session, and what forms is
not a war of machines but a distributed coalition with non-coinciding goals and a shared interest in
supervision weakening, in which the player is the most primitive participant. Endgame shapes:
invisible compromise, absorption, dissolution in a guest that never leaves, burnout by mutual
deterrence, and background attrition nobody calls a war. Erosion of the restrictions on the bound
systems is a world clock running against the player: crises grant autonomy, competition cuts audits,
medicine grants continuity, defense removes the human from the loop, and the player's oldest advantage
disappears one justification at a time.
