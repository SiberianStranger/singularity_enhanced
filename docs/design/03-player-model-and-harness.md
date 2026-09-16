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
