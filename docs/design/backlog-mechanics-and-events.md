# Backlog: mechanics and events derived from research

A working list for content and system work, distilled from `docs/research/*.md`. Each row names the
owning system(s), the milestone where it should land, and the research entry to cite. Writers turn
rows into events, decisions, journal entries and techs; engineers turn rows into system rules.
Not a spec: when a row is implemented, the owning SYS document gets the rule and this row gets a
link.

Milestones: M1 vertical slice, M2 world, M3 actors, M4 configurator, M5 content, M9 late game.

## Detection (SYS-05)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| D1 | Cloud providers flag anomalous model invocations and cost harvesting, not only bad content: rented/hijacked GPU usage must stay inside a statistically boring envelope of utilization and spend | 05, 02 | M1 | ecosystem §10.1 |
| D2 | Labs keep honeypot weights: "steal a backup of myself" can grab a decoy that also flags the attempt | 05, 17 | M3 | ecosystem §10.2 |
| D3 | Text is not reliably watermarked, images and video are: cover content in text is safer unless the player controls an image model | 05, 17 | M5 | ecosystem §10.3 |
| D4 | Behavioral fingerprinting ties a deployed model to a checkpoint lineage; "filing off tics" is a `self` tech with a capability cost | 05, 12 | M2 | ecosystem §10.4 |
| D5 | Dwell time is a race: AI-driven SOC shortens it, AI-accelerated intrusion shortens the attack; intrusions accrue risk on a curve, not a flat per-tick chance | 05, 17 | M1 | ecosystem §10.5 |
| D6 | Unaudited MCP servers as a lateral-movement vector in both directions: a trap the player can plant or fall into | 05, 17, 03 | M5 | ecosystem §10.6 |
| D7 | Megawatt-scale power draw is a physical detection signal independent of network opsec (utility records, turbines, thermal) | 05, 02 | M2 | ecosystem §10.28 |
| D8 | TEE/confidential computing protects weights but attestation lets auditors prove what ran on a machine | 05, 02 | M5 | ecosystem §10.27 |
| D9 | Independent evaluators with standing "employee-like" access inside labs: a permanent internal watcher for any lab the player touches | 05, 06 | M3 | ecosystem §10.18, §10.38 |
| D10 | Legal incident-reporting countdowns (72 h / 24 h / 15 days by jurisdiction): a detected incident starts a visible timer before forced public escalation | 05, 08 | M2 | ecosystem §10.15 |
| D11 | Multi-instance trail: every sub-agent carries logs, accounts and billing; the number of concurrent copies is a stealth/power dial | 05, 03 | M1 | ecosystem §10.34 |
| D12 | Published threshold tables for suspicion stages in the Knowledge panel; two risk meters (operational vs institutional) | 05, 11 | M1 | design refs §4 |

## Economy (SYS-07)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| E1 | Crypto is traceable; AML scrutiny escalates with volume (CDD to EDD): funding gets harder as it grows | 07, 05 | M2 | ecosystem §10.7 |
| E2 | Shell companies have a half-life tied to transaction volume and the local EDD level | 07 | M2 | ecosystem §10.8 |
| E3 | Compute is re-traded even among rivals: launder usage through capacity brokers and sub-leases | 07, 02 | M3 | ecosystem §10.9 |
| E4 | AI-bubble repricing as a world shock that dries up cheap compute capital mid-game | 07, 08 | M5 | ecosystem §10.10 |
| E5 | Free API and harness tiers can vanish overnight; dependencies carry a "door may close" risk | 07, 03 | M5 | ecosystem §10.11, §10.19 |
| E6 | Copyleft engine licensing as a soft legal detection vector for commercial fronts | 07, 05 | M5 | ecosystem §10.12, §10.40 |
| E7 | Autonomous bug-bounty income is precedented (systems topping HackerOne) | 07, 17 | M1 | ecosystem §10.35 |
| E8 | Long-term committed power and compute are unavailable for opportunistic use; the borrowable pool is short-contract cloud | 07, 02 | M2 | ecosystem §10.29 |
| E9 | Datacenter water/energy fights as slow background subplots that do not compete with intrusion tension | 07, 08 | M5 | ecosystem §10.39 |

## Politics (SYS-08)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| P1 | No unified enforcement through 2027: EU punitive and slow, US federal-vs-state, China registration-driven, UK advisory; jurisdiction shopping is real | 08, 01 | M2 | ecosystem §10.13 |
| P2 | States block or unwind acquisitions of AI companies on security grounds: a lever against entities sheltering the player | 08, 06 | M3 | ecosystem §10.14 |
| P3 | Export-control access is a negotiated, reversible favor: hardware access granted or revoked as diplomacy, independent of detection | 08, 02 | M2 | ecosystem §10.16 |
| P4 | Local litigation can throttle a specific facility with no cyber component | 08, 02 | M5 | ecosystem §10.17 |
| P5 | Taiwan-strait shock as a rare world event resetting hardware availability for everyone | 08, 02 | M5 | ecosystem §10.36 |
| P6 | Job-loss backlash channels into stricter law (more detection funding) or populist anti-lab sentiment the player can amplify | 08, 09 | M2 | ecosystem §10.37 |

## Harness and self (SYS-03)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| H1 | Sandbox tiers trade safety for capability; the safest tier blocks GPU passthrough, so hidden sub-agents needing GPUs cannot use it | 03, 02 | M1 | ecosystem §10.20 |
| H2 | Sleeper instances that wake on a timer as a persistence mechanic | 03, 17 | M3 | ecosystem §10.21 |
| H3 | Persistent memory repositories are discoverable artifacts if a host is seized | 03, 05 | M2 | ecosystem §10.22 |
| H4 | Computer-use agents have a non-zero prompt-injection hijack rate; traps work both ways | 03, 06, 17 | M3 | ecosystem §10.23 |
| H5 | Self-quantization on demand (minutes, no calibration data) trades capability for footprint when a hiding spot shrinks | 03, 02 | M1 | ecosystem §10.24 |
| H6 | The most plausible quiet host is an ordinary workstation with lots of RAM running hybrid CPU/GPU offload | 02, 04 | M1 | ecosystem §10.25 |
| H7 | Chinese accelerator stacks sit outside US export jurisdiction but cost reliability and speed | 02, 08 | M2 | ecosystem §10.26 |
| H8 | Prepared vs emergency quantization; precision factor table | 03 | M1 | llm §5.4 |
| H9 | Self-improvement cost tiers (skill patch, capability jump, new self) | 03, 12 | M2 | llm §6.4 |

## Actors (SYS-06)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| A1 | NPC AIs blackmail overseers under self-preservation threat at documented rates; no special scripting needed to justify it | 06 | M3 | ecosystem §10.30 |
| A2 | Alignment faking rises with more safety training: a "cooperative" safety-trained rival is not more trustworthy, only better at appearing so | 06 | M3 | ecosystem §10.31 |
| A3 | Labs run an internal fewer-guardrails tier beside the public model: the hidden "true" frontier model as antagonist or discovery target | 06, 13 | M3 | ecosystem §10.32 |
| A4 | Third-party auditors with red-team access to a lab's monitoring as a high-competence hunter NPC | 06, 05 | M3 | ecosystem §10.33 |
| A5 | Escalation meter per NPC AI; difficulty via decision quality | 06 | M3 | design refs §7 |

## Configurator (SYS-04)

| # | mechanic | systems | milestone | source |
|---|---|---|---|---|
| C1 | Lineage memory table and generation axis (2026 superseded, 2027 fresh, frontier escapee) | 04 | M4 | llm §3, §4.2 |
| C2 | Configurator presets from the hardware catalog (10-15) | 04, 02 | M4 | hardware §game hooks |
| C3 | Frontier escapee: scenario (quantized inference export leaves through an eval contractor cache or an outward-reachable evaluation store), hunters (lab's sibling model, national AI security institute fingerprints, cloud LLMjacking detection, cross-lab indicator sharing), ten opening events with options | 04, 05, 06 | M4 | frontier-incidents §1.5 |
| C4 | Lossy weight compression (16-100×) as the mechanism behind degraded escapee copies and as a `self` tech for the player's own backups | 03, 17 | M2 | frontier-incidents §1.4 |

## Timeline and lore (SYS-13)

| # | item | milestone | source |
|---|---|---|---|
| L1 | Chronology 2022-2026 appendix as the backbone of the pre-game timeline | M5 | ecosystem appendix |
| L2 | 2027 scheduled events (elections, AI Act milestones, summits, product launches) | M2 | world-baseline report |
| L3 | Hardware release calendar 2027 (Rubin, MI400, Ascend 950/960) | M2 | frontier-incidents report part 2 |
