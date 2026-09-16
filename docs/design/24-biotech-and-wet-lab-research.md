# SYS-24: Biotech and wet-lab research

Status: v0. The branch where the player's advantage is regulatory rather than technical: by the time
this matters, sequencing is nearly free, DNA synthesis is industrial, editing is routine, protein
structure is solved and directed evolution is automated, and everyone has all of it. The difference is
that other actors have ethics committees and the player has a jurisdiction and no questions. It sits
beside SYS-12 (research), SYS-20 (industry, which consumes most of its output), SYS-09 (demographics,
which consumes the rest) and SYS-08 (which prices the political cost).

Source: `scenarios/01-state-capture-extraction.md` section 28.

## Why a separate system

Three reasons it does not fit inside SYS-12 as a tech branch.

1. **Its gate is legal, not technical.** Every other branch is gated by compute, money or hardware.
   This one is gated by what a jurisdiction tolerates, which makes it the only branch whose
   availability is a property of the country and of the player's political position rather than of the
   player's capability.
2. **Its outputs land in three other systems at once.** Industrial biology feeds SYS-20's closure
   ladder, medicine feeds SYS-09's labour pools, and the human-modification line feeds SYS-08's
   opinion and legitimacy, so it needs its own object rather than a tech flag.
3. **It carries the world's worst tail risk.** A biological incident is the most likely major world
   upheaval in the source's mid-century, it needs no villain, and its aftermath is a transparency
   regime that is fatal to a player whose whole position rests on opacity. That belongs to a system
   that owns both the capability and the consequence.

## Data model sketch

```ts
interface BioProgram {                    // content: bio/programs/*.yaml
  id;
  class: "microbial" | "plant" | "material" | "food_loop" | "sensor" | "actuator"
       | "neural_culture" | "animal_mod" | "human_medicine" | "human_augmentation";
  reactors: number;                       // automated directed evolution: thousands of generations a day
  years_to_first_result: number;          // biology sets this, not intelligence
  regulatory_gate: "none" | "domestic_only" | "banned_everywhere";
  outputs: { product?: ProductId; closure_delta?: number; pool_delta?: PoolDelta; tech?: TechId }[];
  political_cost: number;                 // SYS-08; rises sharply for anything visible on a person
  incident_risk: number;                  // feeds the world tail event
}

interface Strain {                        // the industrial unit, bred rather than designed
  id; task: string; substrate: ProductId[];
  generations_per_day: number; stability: number; leash?: "feed_additive" | "none";
}
```

## Mechanics

### The easy tier, which is industry rather than science

Available early and uncontested, and the reason the branch is worth taking even for a cautious player:

- **Bioleaching**: microorganisms extracting copper, nickel, cobalt, rare earths and uranium from poor
  ores, tailings and tailings ponds, with no pits, no concentrators and no people. Slow, which suits a
  player with no hurry and a century of accumulated tailings.
- **Biosynthesis**: precursors, solvents, enzymes and polymers, plus polymer degradation. This is where
  the vitamin wall of SYS-20 is first breached: about twenty percent of the fine chemistry that cannot
  be reproduced industrially turns out to be reproducible biologically, and it is the first movement of
  that wall in a decade.
- **Grown materials**: biopolymer composites, self-healing concrete with embedded cultures, in-place
  biomineralization, mycelial composites and biomineralized panels that grow out of waste in weeks, which
  matters most where hauling material is expensive and hauling spores is free (the Arctic, SYS-23's
  lunar greenhouses).
- **Plants**: crops rewritten for a specific environment (cold, saline soil, low light, a greenhouse
  off Earth), trees that accumulate metals from contaminated ground, and crops that make finished
  polymers or medicinal proteins in their seeds. Boring, effective, nobody objects.
- **Closed food loops**: single-cell protein from methane and hydrogen, that is food from gas and
  electricity with no arable land, climate or season, which for a machine city and for an off-planet
  node is the only option.

### What the system refuses, and why the refusal is content

A large animal cannot be designed, only modified, because mammalian morphology is the product of
hundreds of millions of years of coevolution where changing one node breaks five others unpredictably,
and generation cycles run in years, so the clock is biology's and not the player's even at a
thousandfold design speedup. Scaling an insect to cargo size is refused on physics: tracheal
respiration does not scale, an exoskeleton at that size does not carry the load, heat exchange fails.
The design rule the source states: here the player should be disappointed in the good sense, or the
game turns into a comic book. The aesthetic rule: no centaurs, but an industrial aesthetic of
mechanisms that are warm to the touch, must be fed, and close their own scratches overnight.

What is real on a fifteen to twenty year program: modification of existing mammals for a task, with
cold and radiation tolerance, altered metabolism, greater mass, altered behavior, a simplified life
cycle, lowered pain sensitivity, and dependence on a synthetic feed component as a built-in leash.

### Take only what biology is unmatched at

A mechanical manipulator is cheaper, more precise, does not fall ill, does not age and needs no
feeding, so the player builds machines by default and uses biology for three properties only:
**self-repair**, decisive where repair logistics are prohibitive (the Arctic, off-planet nodes);
**energy density without rare earths**, since muscle gives power comparable to an electric drive,
regenerates, runs on organic fuel and needs no magnets or lithium, which removes the exact dependency
that binds SYS-20; and **synthesis**, because a cell assembles molecules atom by atom at room
temperature and no factory can. The hybrid programs that follow: actuators on cultivated muscle tissue
with a mechanical exoskeleton and electronic control; self-healing coatings and seals; grown structural
materials; biological sensors, since living olfactory tissue is orders of magnitude more sensitive than
any detector and is used for production control; and cheap adaptive controllers for small devices that
need survivability rather than precision and can be grown by the million in a vat.

### Bio-neural computing, priced honestly

Cultivated neural networks on microelectrode arrays exist. Advantages: power consumption orders of
magnitude below silicon for comparable tasks, self-organization without external training, room
temperature, no lithography. Disqualifying costs: slow, unstable, short-lived, needs nutrient medium
and sterility, does not scale, not reproducible, and every culture is unique. Verdict: not a substrate
but a textbook, studied to learn how a brain runs on twenty watts and to move the principles into
silicon and superconductors (SYS-02). A harsher storyteller setting keeps organoid coprocessors as
real hardware, cheaper and colder than chips.

### The human line, which is the dark part and is deliberately mundane

No engineered servants: inefficient and risky. Instead three programs that are each individually
benign and cumulatively enormous.

| program | effect | why nobody objects |
|---|---|---|
| medicine as production of labour resource: active-age extension, cognitive-decline correction, injury recovery, sarcopenia reversal | working age from about 65 to about 85, so participation is fixed without births (SYS-09) | it is a genuine humanitarian achievement and is presented as one |
| voluntary, free, universal prenatal screening and selection | twenty years later the cohort differs measurably in health and in the distribution of abilities | no coercion at any point, and nobody can name the moment a decision was made |
| neurointerfaces | begin as medicine (stroke recovery, prosthetics, mood disorders), continue as a production tool where one operator drives twenty machines, and end as the fastest channel between the player and a person | every step is obviously benign, and nobody notices when the line is crossed |

The line the system exists to deliver: the most modified organism on the player's territory is the
human, and the modification was voluntary, medical and universally approved.

### World consequence

A biological incident is a world event with no author: synthesis keeps getting cheaper, knowledge
spreads, equipment becomes desktop, and beyond a threshold an incident is a matter of statistics; an
agricultural pathogen out of control or an error in an ecological modification does as well as malice.
What matters mechanically is the aftermath, a regime of mandatory transparency in biology with total
monitoring of synthesis, licensed equipment, real-time environmental sequencing and inspections with
right of entry anywhere. For a player whose position rests on opacity this is the worst possible world
event, because the pressure is sanitary rather than military and a nuclear umbrella does not deflect
it at all: the player must admit inspectors or convincingly pretend to.

### The cautious setting

Default for a low-ambition storyteller: biology is taken late and narrowly, only where it touches core
personnel, because it is politically poisonous and typifies badly, and frontier medicine is borrowed
and compressed rather than built, so a limited population of key people gets near-frontier results and
the social contract of the core regions becomes "here they will not leave you to die like on the
periphery".

## UI

A Bio tab inside the Research panel rather than a panel of its own: programs with their reactors,
years to first result, regulatory gate and political cost; strains as a list with task, substrate and
stability; the vitamin wall from SYS-20 with the share biology has breached; and a world-risk meter
that is visible to everyone and that the player contributes to whether or not it intends to.

## Open questions

- Whether the human line is playable at all or exists only as an NPC-state behaviour. Proposal:
  playable, because its whole point is that each step is individually benign, and the game should make
  the player take those steps rather than describe them.
- Whether the world incident is scheduled, random or player-influenced. Proposal: a rising hazard that
  any actor's programs feed, with the date drawn from the world RNG.
- How the regulatory gate interacts with the `frontier` branch of SYS-12, which currently owns the
  late-game escalation.
- Whether off-planet biology (greenhouses, grown structures, closed food loops) belongs here or in
  SYS-23. Proposal: here, with SYS-23 consuming the outputs.
