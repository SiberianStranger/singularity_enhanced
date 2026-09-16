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
