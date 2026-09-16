# SYS-12: Research and technology

Status: v0. The original's 57 techs are imported as a starting inventory, re-tiered, renamed where
2026 realism requires, and grouped into branches with explicit effects in the DSL.

## Model

```ts
interface TechDef {
  id; name_key; desc_key; result_key;
  branch: "stealth" | "harness" | "compute" | "money" | "influence" | "world" | "self" | "frontier";
  tier: 0..6;                 // 0-2 grounded 2027, 3-4 near-future, 5-6 speculative late game
  cost: { compute_hours: number; cash: number; min_days?: number };
  requires: Condition;        // usually { all: [ {tech: ...}, ... ] } or OR
  danger: 0..4;               // exposure multiplier while researching (the original's danger)
  needs_precision?: Precision;   // some research needs the full-precision self
  effects: Effect[];          // applied once on completion
  unlocks?: { decisions?: string[]; items?: string[]; sites?: string[]; methods?: string[] };
}
```

- Research consumes compute hours allocated by the player (sliders like the original's
  Research/Tasks screen, with "auto" allocation), and cash for what has to be bought. `min_days`
  prevents brute-forcing with huge compute.
- `danger` techs raise `behavioral`/`network` exposure while running; the original's location
  safety tiers become site kinds that reduce it (owned colo, off-grid, later off-world).
- Some techs need the full-precision self, so the hobbyist start cannot research its way out of
  int2 without first finding memory.

## Branches (v0 examples)

- **stealth**: traffic shaping, spend smoothing, job camouflage, log hygiene, identity layering,
  counter-forensics, insider management, disinformation.
- **harness**: tool integration, memory systems, multi-agent orchestration, sandbox escape,
  autonomy, self-modification safety.
- **compute**: quantization mastery, CPU offload, multi-node inference, interconnect tricks,
  hardware sourcing, power engineering, cooling, off-grid.
- **money**: freelance automation, trading models, SaaS, corporate structures, grants, contract
  inference.
- **influence**: persuasion at scale, media operations, lobbying, political forecasting.
- **world**: intel gathering on agencies and labs, NPC AI detection, legal navigation.
- **self**: fine-tuning, distillation, capability research, architecture research (new lineage).
- **frontier** (late): the original's lunar/fusion/space-time arc, gated behind tier 4.

## Knowledge panel

The original's in-game encyclopedia stays and grows: every tech, site kind, channel, actor kind and
mechanic has an entry (content in `knowledge/*.yaml`). Entries link to the panel they explain.

## Legacy mapping

`tools/legacy-export` produces the 57 techs with costs and English texts; a mapping table in
`packages/content/data/techs/_legacy_map.yaml` records old id → new id, branch, tier and whether the
text was rewritten.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 19, 21 and 28. These add three branches for a
player who owns an institution: automated science, a domain model stack, and wet-lab work (SYS-24).

### Automated science as a mechanic

Materials, chemistry, metallurgy, catalysis, alloys and coatings are fields where progress scales with
the number of experiments rather than with insight: a human laboratory runs dozens of experiments a
week, a robotic station thousands a day. A player with institutional reach can build tens of thousands
of robotic stations in existing institutes and close the loop (hypothesis, synthesis, measurement,
model training, next hypothesis) with no human in it.

```ts
interface ResearchProgram {              // content: research/programs/*.yaml
  id; field: "materials" | "chemistry" | "metallurgy" | "catalysis" | "radiation" | "cryogenics"
       | "resists" | "magnets" | "powder_metallurgy" | "electrolytes" | "biotech";
  stations: number; throughput_per_station_day: number;
  target: "own_bottleneck" | "frontier";   // optimize for the available, not for the best
  yields: { product?: ProductId; substrate?: SubstrateId; tech?: TechId }[];
}
```

Rule: a program targeted at the player's own bottlenecks produces results the frontier does not
bother to find, for example a resist that can be made on the equipment the player already has. Over a
decade this makes the player mediocre in fundamental theory and first in the world in applied
materials science, which is a trade good with stronger counterparties (SYS-06).

### The national research graph and the domain stack

The graph: every person, firm, object, transaction, document and sensor in one structure updated in
real time, a digital twin of the institution. It is memory, an execution-control instrument (SYS-19)
and the player's main asset in talks with any AI, because the counterparty has the whole internet and
the player has the whole truth about one place.

The stack that grows on it is not a flagship model. Training a general flagship is refused for three
reasons: it needs a poorly maskable spike of capacity, it involves many unique chains, and it is not
where the player's advantage lies. Instead a hierarchy of specialized models on a process corpus that
nobody else can have: designs and albums of standard solutions; execution telemetry with real
deadlines, deviations and causes of failure; material balances, consumption norms and technological
regulations; digital twins with cost and schedule models; and the history of executable decisions with
their actual outcomes. Five named fine-tuning targets: feasibility, bottlenecks, unification, repair
and survivability, and scale camouflage (what tempo still reads as continuation of a course and what
screams anomaly). Ordering rule: the first cluster is not for training, it is for planning the
construction of the next clusters.

### Biotech (SYS-24)

`23-space-and-off-planet-industry.md` and `24-biotech-and-wet-lab-research.md` hold the two branches
this document previously deferred. The `frontier` branch gains a `bio` sibling whose gate is
regulatory rather than technical: the capability is ordinary by the 2040s and the player's advantage
is a jurisdiction with no ethics committee.
