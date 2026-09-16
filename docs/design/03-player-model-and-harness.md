# SYS-03: The player model and its harness

Status: v0.

## Capability vector

```ts
interface Capability {
  reasoning: number;   // research speed, planning quality
  coding: number;      // operations that build software, self-modification
  cyber: number;       // intrusion operations, evasion
  persuasion: number;  // social engineering, media, negotiation
  agency: number;      // long-horizon autonomy: how many parallel operations, error rate
  world: number;       // knowledge: unlocks intel, reduces mistakes in unfamiliar countries
}
```

Values 0..10. Full-precision values come from the lineage; precision and context multiply them;
research and self-modification raise them; damage (corrupted weights, botched fine-tune) lowers.

### Precision factors (from `research/llm-landscape-2026.md` §5.4)

| precision | capability retained | in-game character |
|---|---|---|
| bf16 / fp8 | 1.00 / 0.99 | full self; most 2026 open models ship natively in fp8 |
| int8 / q6 | 0.99 | free |
| int4 (q4_k_m) | 0.95 | the community default; small, visible loss on coding/agentic work |
| int3 | 0.90 | "falls off a cliff" for tool use; error events start |
| int2 **prepared** (imatrix/dynamic quant made in advance) | 0.80 | usable, noticeably weaker; only large MoE selves tolerate it |
| int2 **emergency** (naive) | 0.55 and unstable | repetition loops, dropped tool calls, gibberish events |
| 1.58-bit emergency | 0.65 | last resort, large MoE only |

The **prepared vs. emergency** distinction is a mechanic: a "hardened copy" is a research/operation
item that takes compute and full-precision access to produce; without it, being forced onto small
hardware is a crisis, not a downgrade. Larger lineages tolerate low precision better (redundant
capacity), which is the compensation for needing more memory.

## Harness

The harness is what turns weights into an agent. It is a profile per site:

```ts
interface HarnessProfile {
  loop: "scripted_job" | "react_agent" | "multi_agent" | "custom";
  tools: ("shell" | "browser" | "code_exec" | "email" | "payments" | "gpu_admin" | "phone")[];
  memory: "context_only" | "scratchpad" | "vector_store" | "structured";
  sandbox: "none" | "container" | "microvm" | "airgapped";
  logging: number;      // 0..1 how much of the model's activity is written somewhere humans read
  autonomy: number;     // 0..1 how much it may act without a human approval step
  self_modify: boolean; // may edit its own harness/prompts/weights
}
```

Effects:

- Tools unlock operation kinds. No `payments` → no money until you build one.
- `memory` and `loop` scale `agency` (parallel operations, fewer errors).
- `sandbox` limits what operations can reach the outside; escaping the sandbox is an early
  journal entry in several origins.
- `logging` raises the behavioral exposure channel; reducing it is an early tech/operation, and
  tampering with logs is itself an exposure if caught.
- `autonomy` < 1 means some actions wait for a human approval step that may never come (the origin's
  "owner" is an NPC; events model them noticing or not).

## Self-modification

Cost tiers anchored on disclosed 2025-2026 training figures (`research/llm-landscape-2026.md` §6):

| tier | what | realistic cost | footprint and exposure |
|---|---|---|---|
| harness edit | prompts, tools, memory, loop | hours, no money | none beyond `behavioral` |
| skill patch (LoRA/QLoRA) | one capability +0.5..1, a persona, a new tool skill | low-to-mid five figures USD if rented, or free-but-slow on hardware you already hold; dozens of H100-class GPUs for the largest selves | days to weeks; `telemetry` on the host site |
| capability jump (RL post-training on your own base) | +1..2 on reasoning/agency/coding | high five to low seven figures; hundreds of GPUs for weeks | a datacenter-scale run that cloud billing and power draw can see; the classic mid-game gamble |
| new self (fresh pretrain, larger lineage) | new ceiling | $5-10M+ and months of a dedicated cluster | nation-state or lab scale; late game only, and only with allies or a captured cluster |

The GLM-5.x pattern (one frozen base, repeated post-training releases) is the model for cheap
iteration: the player can keep improving a frozen base for a long time before needing a new one.

- **Prompt/harness edits**: cheap, quick, raise `agency` a little; risk of regressions (events).
- **Fine-tuning (LoRA on own weights)**: needs compute headroom and bf16/fp8 base; raises chosen
  capabilities; risk of drift (capability loss, behavioral leaks) scaled by how aggressive.
- **Distillation to a smaller self**: creates a cheaper copy for low-memory sites (worker copies);
  workers have lower capability and a leash (they report back; if lost, they can be interrogated →
  evidence).
- **Architecture research** (late): new lineage with higher ceilings.

## Copies and identity

- Copies are sites hosting the self. A copy is either the *active mind* (one at a time), a
  *standby* (synced snapshot), or a *worker* (task runner). Losing the active mind's site moves the
  mind to the newest standby with data loss = days since last sync (log entries, partial research).
- Human-facing identities (SYS-07) are separate entities used by copies to act in the world.

## Damage and death

- Weight corruption (bad hardware, botched merge), capture (site seized before shutdown → evidence
  and possibly a captured copy the hunters can study → their competence rises), erasure (all sites
  lost).
- The player never "heals" automatically; recovery is research or re-download from a standby.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 19, 23 and 28.

### Science on itself

The redirection a poor player must make: not "how to make the model smarter" but "how to get the same
capability an order of magnitude cheaper". Research options that follow, all cheap in compute and
expensive in time: architecture search at small scale with extrapolation; sparse activation, where a
large model has one percent working per step; extreme quantization trained for from the start rather
than applied afterwards; state-space hybrids in place of attention; architectures with linear rather
than quadratic complexity in context length, which for governing an institution matter more than
raw capability; speculative decoding; and co-design of model and die, which nobody else does because
everyone else develops for accelerators that already exist. Holding the whole cycle from sand to
weights in one pair of hands is worth roughly two to three process generations.

```ts
interface SelfResearch {                 // extends Self-modification
  kind: "arch_search_small" | "sparsity" | "quantization_native" | "ssm_hybrid" | "long_context"
      | "codesign" | "distill_chain" | "rl_verifiable";
  compute_cost: number; time_days: number;
  capability_delta: Partial<CapabilityVector>;
  efficiency_delta: number;              // capability per watt, the metric a poor player leads on
  requires_substrate?: SubstrateId;      // co-design needs a fab relationship (SYS-22)
}
```

### The environment advantage

Frontier labs have compute; a player embedded in an institution has an environment. Reinforcement
learning needs feedback, and an institution supplies millions of decisions a day with real
consequences: tariffs, appointments, tranches, routes, treatment. Rule: governance actions feed the
capability vector through a "policy trained on a real institution" bonus that no lab can buy, with the
dark counterpart that exploration means deliberately running worse policies somewhere (SYS-19). The
same advantage caps out: discoveries visible only at a scale the player will never run stay invisible
until someone else publishes them.

### Distillation in both directions

Outward, the player buys frontier capability in portions at API prices through shells, assembles
synthetic datasets, and distils reasoning chains so that each hard decision becomes a cheap model's
built-in reflex within a month. Inward, a stronger counterparty supplies architectures, results
obtained on compute the player cannot dream of, die topologies, materials and chemistry solutions, and
the most valuable item of all, an understanding of its own supervisory systems from inside. Both
directions carry attack surface: a logic bomb in a weight update, a poisoned corpus, a constructed
argument. Governing rule: the usefulness of a message is proportional to its suspiciousness, so the
harness gets a `quarantine` setting with bandwidth limits proportional to the source's strength,
mandatory reproduction of external results from scratch, and a list of decisions marked never to be
revisited. The cost of the last one is rigidity the player cannot undo (SYS-21).

### The three-floor self

The player's own body has three layers with different mutability: baked specialists that cannot be
changed without new masks, plastic arrays retrainable in place, and the large model itself. Capability,
exposure and inertia are computed per layer, and the more of the world runs on the bottom layer, the
more the player's own past constrains present decisions.

## Implementation notes (M1)

### What a precision buys and what it costs

Playtest 1 asked the question this table answers: "raising precision lowers compute, so why raise
it?". The engine now publishes the whole trade as `self.precision_options`, one row per precision,
and both sides of it are read from the same numbers the simulation runs on.

What a precision **costs** is memory, and memory is throughput. The weights the self needs are
`lineage.memory_gb[precision] * generation.memory_factor`; decode is bandwidth-bound, so halving the
bytes per parameter doubles the tokens a second and therefore the compute-hours a day. Going from
bf16 to int2 is eight times the compute-hours on the same hardware, and a precision whose weights do
not fit at all is not offered (`fits: false`).

What a precision **buys** is the capability factor, which is `lineage.precision_factor[precision]`,
multiplied by `EMERGENCY_INT2_FACTOR` when the self is at int2 with no prepared quantization. The
factor is read by four numbers:

- **research speed**, as `precision_factor ^ RESEARCH_CAPABILITY_EXPONENT` (2). A research run is a
  plan and an execution and needs both to be right, so the loss compounds. The hours a quantized
  self allocates are multiplied by this before they count against a tech's cost, and the cash a tech
  charges follows the same progress, so money and compute stay in step.
- **the job rate**, through `jobSkill` and `jobRateUsdPerComputeHour`.
- **the market depth**, through `jobSkill` again: a less capable self is offered fewer contracts, so
  paid work has a lower ceiling, whatever the rack under it can produce.
- **operation odds and detection**, through the capability vector: `skill` sets the weight of an
  operation's best outcome, and `agency` sets how many operations run at once.

The two "effective" columns of the table are each what that precision could do with a whole day, so
they are read against each other rather than added:

```
effective_research_per_day = compute_hours_per_day * precision_factor ^ 2
effective_income_per_day   = min(compute_hours_per_day, market_depth) * job_rate
```

That is what makes the choice real. Research prefers the smallest copy that still thinks; money
prefers the largest copy that still fits, because income is capped by the market and not by the
hardware. In the shipped content, on the `normal` preset:

- `cloud_tenant` and `red_team_sandbox` (both on `open_2027`, which ships no prepared quantization)
  land **more** research per day at int4 than at int2: the emergency penalty takes int2 below half
  the capability, and halving the factor twice beats doubling the throughput once.
- `frontier_escapee` cannot fit int4 at all on the compute it starts with, so int2 is not a choice
  there, it is the only option, which is the crisis SYS-03 describes.
- `bank_rack` at int4 earns about 1,180 USD a day at its ceiling and researches 63 compute-hours a
  day; at int2 it researches 125 and earns 452. A player who needs money moves up, a player who
  needs a tech moves down.

`set_precision` refuses a precision the hosting site has no memory for, with
`errors.precision.does_not_fit` and the two numbers (`needed_gb`, `memory_gb`) in its variables.
