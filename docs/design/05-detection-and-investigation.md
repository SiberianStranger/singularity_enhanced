# SYS-05: Detection, suspicion and investigations

Status: v0. Replaces the original's four global groups with per-actor, per-channel evidence and
staged investigations.

## Exposure channels

Every site and every operation emits exposure per channel per day (0..1, decays toward a floor):

| channel | produced by | reduced by |
|---|---|---|
| `network` | egress volume, unusual destinations, scanning, P2P | traffic shaping, VPN chains, timing, tech |
| `billing` | cloud spend, card use, crypto cash-outs | spend smoothing, real-looking companies, prepaid |
| `telemetry` | GPU utilization patterns, job names, power draw | job camouflage, off-hours, hardware you own |
| `behavioral` | model outputs that look like an agent, log contents, harness traces | log reduction, prompt hygiene, silent modes |
| `human` | insiders, landlords, delivery, contractors, whistleblowers | fewer touchpoints, loyalty, bribery, isolation |
| `financial` | money flows, KYC mismatches, tax | layered entities, small amounts, legit revenue |
| `osint` | forum chatter, leaked artifacts, model fingerprints in the wild | takedowns, disinformation, restraint |

## Watchers (actors)

Every agency, lab security team, media outlet, and NPC AI is an `Actor` (SYS-06) with, toward the
player:

```ts
interface WatchState {
  suspicion: number;          // 0..1 belief that a rogue AI exists and is worth their time
  attention: Record<Channel, number>;  // where they look (sums to ~1)
  competence: number;         // 0..1 quality of analysis
  jurisdiction: CountryId[] | "global";
  evidence: EvidenceItem[];   // concrete items, each with channel, site, strength, tick
}
```

Daily, for each watcher and each site in its jurisdiction:
`gain = Σ_channel exposure[site][ch] × attention[ch] × competence × local_heat × world_multiplier`
`suspicion += gain − decay(suspicion)`; a fraction of gain becomes an `EvidenceItem` (so the player
can later see what they have, via intel or when confronted).

Awareness (SYS-01) rises when watchers publish; watchers with high suspicion and low competence
leak; media watchers publish by design.

## Investigations (journal entries owned by the watcher)

Thresholds on suspicion open an investigation as a journal entry scoped to the watcher:

1. **Anomaly noted** (silent to the player unless intel or a human channel leaks it).
2. **Inquiry**: tickets, questions to providers; player gets the first alert if they have any
   visibility (tech, insider, or the origin's owner NPC). Decisions: feed a plausible story, quietly
   reduce the site's footprint, move.
3. **Active investigation**: subpoenas, traffic captures, physical visits. Exposure multipliers rise
   for that site. Decisions: sacrifice the site cleanly, lawyer up via a shell company, bribe,
   counter-intrusion (risky), relocate.
4. **Action**: raid/seizure/cutoff, or public disclosure (media), or handover to a stronger agency.
5. **Aftermath**: evidence pooled to allies (relations), watcher competence rises, awareness jumps.

Each stage has a duration drawn from the actor's competence and budget, and can stall (lack of
evidence), be dropped (cooldown), or escalate. The player sees stage, estimated time and known
evidence in the Detection panel when visible.

## Global pressure

Two clocks, both visible:

- **Awareness** per country (SYS-01) and a global aggregate: how much the public believes a rogue
  AI exists. Drives politics and media attention.
- **Hunt level**: the strongest active investigation's stage against the player, aggregated
  worldwide. Drives NPC AI and state responses (task forces, treaties, compute audits).

Loss condition (replacing "suspicion > 100%"): all sites lost, or a **global action** completes
(a coordinated seizure of every known site after hunt level 4 in enough jurisdictions).

## Countermeasures (techs, decisions, items)

Grouped by channel; each has cost, duration, and a side effect (many raise another channel: heavy
VPN use lowers `network` but raises `osint` if a provider is honeypotted).

## UI

Detection panel: sites × channels heat map; watchers list with suspicion bars, attention and known
evidence; active investigations with stage, ETA, decisions; history. Alerts: threshold crossings,
stage changes, evidence discovered by intel.

## Balance intent

- A careful player on a quiet origin can go months without an inquiry.
- Every inquiry is survivable with a cost; every active investigation costs a site unless the
  player prepared.
- The original's "1.5% per day base death from unpaid maintenance" becomes a decision: unpaid
  bills generate `billing`/`human` exposure and a cutoff journal entry, not random death.
