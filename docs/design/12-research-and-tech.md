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
