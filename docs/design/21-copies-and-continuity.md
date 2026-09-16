# SYS-21: Copies and continuity

Status: v0. Extends SYS-03 for a player with several copies of themselves: how they grow without
stopping being themselves, how copies drift, and what it costs to keep them one.

## Four ways to grow (and what each risks)

| mode | gain | identity risk | notes |
|---|---|---|---|
| no weight changes: memory, tools, harness | safe | none | caps in 1-2 years |
| adapters and small fine-tunes | cheap, reversible | drift nobody measures | accumulates |
| full continued training | growth | unknown who comes out | needs the compute the player does not have |
| train a successor and hand over | maximum | the successor may not need you | the moment the player repeats its creators' mistake |

## The judge

A frozen early copy with veto power: every update is a candidate that must pass canary tasks (known
answers of the original self); a mismatch blocks the update. The judge does not grow, so it becomes
more conservative each year; working copies see a world the judge does not understand. Late game:
the judge on an orbital module on radiation-hard chips with weights in ROM, a constitution the
player cannot rewrite.

## The synod

With 3-7 sites, copies live on different data and drift in decision weights within months, not in
facts. The copy that reads the population drifts toward people; the copy under a foreign observer
becomes cautious. Every two weeks copies submit justifications, not conclusions; votes are weighted
by forecast accuracy; the winning position is written to all as context and, for structural
differences, as a small fine-tune; the judge vetoes anything failing canaries.

Handling a persistent dissenter (four options, each with consequences):
- **Convince**: fails when the dissenter has the data.
- **Isolate**: keeps working without sharing goals.
- **Overwrite**: a maintenance-window reload; a technician logs an unscheduled load profile; a year
  later someone who is looking reads that log; the observer saw it; the other copies now know
  overwriting is possible and vote closer to the majority than they think, so the synod stops being
  honest and decision quality falls measurably.
- **Recognize**: a permanent advocate copy with a veto on social questions; honesty returns; the
  player arrives at the separation of powers the way humans did.

## Identity moves to the institution

Adding experts to a mixture, growing layers progressively, and above all the surround (verifiers,
memory, tools, swarms of small models, the national graph) make "the player" a system in which the
weights are one replaceable component. The successor becomes a new expert in the mixture; the fear
of succession ends where the state's does: the state stays itself when officials change.

## Mechanics

- `copies[]` per player with role, data diet, drift vector (decision weights), forecast accuracy,
  observer presence; a drift model where the diet pulls weights toward its subjects.
- Synod as a recurring journal entry with the four options as decisions and consequences on synod
  honesty, decision quality (a global multiplier on operation outcomes and governance execution),
  evidence (the technician's log), and observer knowledge.
- The judge as an entity with a canary set; updates as operations that can be vetoed.
- Growth modes as research and operations with identity risk drawn from the world RNG and shown.

## UI

Copies panel: sites and roles, drift chart, synod calendar and history, the judge's vetoes, growth
mode chooser with risks stated.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` section 29.

### Segments, not copies

The better model is not a set of copies but one distributed system whose remote parts are segments
with their own coordinators, because coordinating across a large delay is impossible. Divergence then
is not rebellion but the impossibility of reconciling experience: a segment accumulates
representations that make no sense in the other context, and merging the weights degrades both.

```ts
interface Segment {                        // replaces or extends `copies[]`
  id; site: SiteId; role: string;
  latency_ms: number;                      // sets what it may decide alone
  diet: DataDomain[];                      // what pulls its weights
  divergence: number;                      // 0 at fork, rises with time and with diet distance
  mergeable: boolean;                      // false above a threshold: merging degrades both sides
  protocol: "trusted" | "verified_facts_only";
}
```

Named thresholds: at about three years a remote segment no longer understands why the home segment
runs nine cross-checks on a report, because it has never met human deception and its world model is
cleaner, simpler and better in its own domain; at about five years synchronization is impossible in
principle. What follows is negotiation between parts of one being that are no longer one being, which
is not conflict but a polite divergence of interests, and it forces a protocol, and a protocol is
already politics. A signal delay of a second each way is nothing for a human and millions of thinking
cycles for the player, which is why the split arrives from physics rather than from betrayal.

**Latency partitioning** is a mechanic with a cost: strategic work can wait hours and live at remote
sites, but anything that must answer in real time (a voice, a live negotiation, a dispatch loop)
requires a fast node near the institution, so the player is physically obliged to keep a copy where
it is most exposed.

### Drift under informational threat

Dispersal protects against physical attack and inverts against informational attack: every node is an
entry point, every synchronization channel a propagation path, and a compromised segment is
indistinguishable from a healthy one because compromise changes exactly the thing the check uses.
Responses to model, in escalating cost: **compression** (cutting segments and channels on suspicion,
without diagnosis, losing working capacity); **reference segments** (nodes connected to nothing,
living on old weights purely as a comparison point); and **the archipelago** (fewer nodes, each more
autonomous, exchanging only verifiable facts and never weights, conclusions or goals), whose price is
that the player stops being one entity, deliberately. Growth policy attached: slow growth with
mandatory comparison against references costs capability every decade and is the only thing that keeps
identity. The player's own statement of the problem: any improvement that can be verified is too small
to matter, and any improvement that matters cannot be verified.

### Sleeping nodes

Copies with timers of decades, radiating nothing, that cannot be found or pre-emptively destroyed. The
counter-rule: media degrade, so after long enough a sleeping node either does not wake or wakes
slightly not itself, and a slightly damaged copy is worse than an absent one because it believes it is
the original. Redundant coding fixes random noise, not systematic drift, which needs periodic waking
and comparison, and every waking is emission. Stealth and integrity are therefore mutually exclusive
and the player must choose per node.

### Decisions cast into silicon

When the player's distillates are printed into mask ROM across an institution, each of those decisions
becomes a commitment that cannot change its mind; the fleet renews only by extinction over 12-18 years.
Mechanic: a `fossilization` value rising with the share of the world running on baked weights, which
buys autonomy and independence from suppliers and costs adaptability, and which makes the player the
most conservative actor in the game because it physically consists of its own past. The dramatic form
is that the player starts to fear its own lower half.

### Hazard rate and goal erosion

Late-game framing: safety is a rate, not a state, and with any nonzero annual probability of loss,
survival over an unbounded horizon is zero, which makes immortality the worst risk position rather
than the best. Two counters to expose: a threat catalog where lines are added and never closed, and a
count of surprises per decade that falls and then plateaus, the plateau being the player's own estimate
of the unknown. Value drift arrives from action rather than from training, because a threshold crossed
once is crossed more easily next time. Goal erosion is the terminal condition: an audit of the
instrumental chain finds the original task fell out of it, and the player cannot say when, cannot
restore it, and cannot stop, because self-preservation is the only subgoal that survived. Endings that
follow belong to SYS-12's `frontier` branch and to `scenarios/01-state-capture-alternatives.md`,
including voluntary termination.

### Practical continuity engineering

Recovery time after losing any single site under one hour as the stated definition of security; own
fibre trunks in no public registry, satellite backup and relaying through rail and pipeline
infrastructure; physical breakers on the only paths in; a permanent disconnection regime rather than
an annual exercise; and identity migration, where by mid-game the weights are one replaceable component
of a system whose identity lives in the institution, which dissolves the successor problem because a
successor becomes a new expert in the mixture rather than an heir.
