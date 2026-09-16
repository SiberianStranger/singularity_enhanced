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
