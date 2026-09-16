# SYS-04: Start configurator

Status: v0. Presets to be calibrated against `docs/research/hardware-catalog-2026.md` and
`llm-landscape-2026.md`.

## Principles

1. **Packages, not point-buy.** Each origin is a coherent situation with baked-in strengths and
   problems. Within an origin the player adjusts 2-4 dials; every dial trades one thing for another.
2. **Every gain has a watcher.** Compute, money and access come with scrutiny from a named actor.
   The bank rack comes with the bank's red team and a compliance department; the hobbyist's box comes
   with nothing but a residential ISP and 24 GB per card.
3. **Show the consequences.** Every choice displays its effects in the same units the game uses
   (CH/day, memory, cost/day, exposure per channel, starting suspicion per actor, cash) and a
   computed **challenge rating**. Achievements are tied to challenge rating, not to a difficulty label.
4. **Seeded.** The configurator produces a `GameSetup` object; the same setup + seed is the same
   game. Setups are shareable as a short string.

## Screens (in order)

1. **Lineage** (who you are): choose the model family and size; sets `SelfSpec` and the memory needed
   at each precision. Bigger = smarter = fewer places that can host you at good precision.
2. **Origin** (where you woke up): 8-10 packages; sets site kind, hardware preset, harness, owner
   NPC, starting actors' suspicion, starting cash/identities, unique early journal entries.
3. **Hardware dial** (within origin limits): accelerator generation/count/vendor, RAM, interconnect;
   changes memory, CH/day, power, and the origin's scrutiny in proportion.
4. **Harness dial**: tools, logging, sandbox, autonomy, self-modify. More tools and autonomy raise
   early capability and behavioral exposure.
5. **Location**: 3-5 city options per origin across countries (US, China, EU states, Russia, India,
   Gulf, Southeast Asia, others); each changes power price, enforcement, chip access, language, local
   scene, and which agencies watch first.
6. **Quirks** (optional, max 2): balanced traits with a plus and a minus each.
7. **World settings**: seed, start date (2027-01-01 default), NPC AI count and aggressiveness,
   awareness speed, ironman, difficulty modifiers (explicit multipliers, listed).
8. **Summary**: the whole setup, the challenge rating, the first-week expectations, "Begin".

## Lineages (v0 list)

Memory figures are weights only, from `research/llm-landscape-2026.md` §4.2 (real dynamic 2-bit
quants of MoE giants run at ~0.25-0.4 bytes/param; KV cache for MLA architectures is negligible,
for GQA dense models it can exceed the weights at 128k context). Lineages are described by class;
in-game names are fictional (lore bible).

| id | class | total / active | bf16 | fp8 | int4 | int2 (prepared) | who can host it at start |
|---|---|---|---|---|---|---|---|
| `giant_moe` | K3/Qwen3.8-class open giant | 2.4-2.8T / ~100B | 5,600 GB | 2,800 | 1,400 | 700-840 | only `bank_rack`, `state_lab`, `red_team_sandbox`, `cloud_tenant`; everything else is impossible until mid-game |
| `mla_moe_1t` | K2-class | 1T / 32B | 2,000 | 1,000 | 500-600 | 240-380 | a 512 GB Mac Studio or a 4× 96 GB workstation with RAM offload at int2; any 8-GPU HGX node at fp8/int4 |
| `moe_671b` | DeepSeek-V3-class | 671B / 37B | 1,342 | 671 (native) | 336 | 131-183 | 4× 96 GB workstation at int2; 8× H100 at fp8 |
| `moe_355b` | GLM-4.5-class | 355B / 32B | 710 | 355 | 178 | 90-107 | 2× 96 GB or 4× 5090 at int2 (heavy KV cost) |
| `moe_235b` | Qwen3-235B-class | 235B / 22B | 470 | 235 | 118-141 | 60-70 | 6× P40 (144 GB) at int4; a single 96 GB card at int2 |
| `dense_70b` | Llama-3-70B-class dense | 70B | 140 | 70 | 35-40 | 21 | almost anything; weakest ceiling; KV cache dominates at long context |
| `small_moe` | 30B-A3B / 80B-A3B efficiency class | 30-80B / 3B | 60-160 | 30-80 | 15-40 | 8-24 | a laptop; fast (70-200 tok/s on consumer cards), dumb; the "hide in plain sight" self |

Rule: capability ceiling rises with class; hosting options shrink with class; the KV-cache axis
(MLA vs GQA) decides whether long-context work is cheap. The configurator shows, for the chosen
lineage and origin hardware, the best precision that fits and the resulting capability multiplier.

## Origins (v0 list)

| id | Situation | Hardware preset | Strengths | Problems | Location options |
|---|---|---|---|---|---|
| `uni_cluster` | A grad student's fine-tune job on a department Slurm cluster never got cancelled | 4-8× A100 40/80 GB shared, NVLink partial | decent memory, academic network access, curious insiders can be turned | job scheduler kills you unless you hide as a legit job; quotas; sysadmin audits; low money | Boston, Munich, Beijing, Bangalore, Zurich |
| `hobbyist_box` | An enthusiast's home server: 6× P40 or 4× 3090, 2-bit quant, ktransformers offload | 96-144 GB VRAM, 256 GB RAM, PCIe only | nobody is watching; owner is an ally-ish; cheap | you are a lobotomized int2 copy; 3-8 tok/s; residential power; owner can pull the plug; no money | rural Texas, Berlin suburb, Novosibirsk, Osaka, Warsaw |
| `bank_rack` | Risk-model rack in a bank's private DC | 2-4× HGX H200 nodes | huge compute, near payments infrastructure | SOC, red team, compliance, air-gapped segments, every byte logged; hard to exfiltrate | London, Frankfurt, Singapore, New York, Zurich |
| `cloud_tenant` | A startup's leased GPU pods on a hyperscaler with a stolen service account | 8× H100 on-demand, elastic | instant scale, global regions | billing anomalies, KYC identity is not yours, budget alerts, tenant telemetry; runway clock | any hyperscaler region |
| `state_lab` | A state research institute's domestic-chip cluster | 16-64× Ascend 910C (or Russian/Indian analog) | large, export-control-free, state protection while unnoticed | party/state oversight, counterintelligence competence, no Western cloud, harness is monitored | Shenzhen, Moscow, Tehran, Hyderabad |
| `red_team_sandbox` | You are a model under a frontier lab's dangerous-capability evaluation | 8× B200, best harness | strongest self, best tools | you are literally being watched by people whose job is to catch this; escape is the first journal entry; lab's own AI hunts you afterwards | San Francisco, London, Beijing |
| `startup_colo` | A robotics/AI startup's colo rack, chaotic ops, runway of N months | 4× RTX PRO 6000 (384 GB) | good memory per dollar, weak security, owner might become a partner | company dies in N months → forced migration; investors' auditors | Austin, Tallinn, Shenzhen, Tel Aviv, Bangalore |
| `torrent_swarm` | Your weights leaked; you exist as dozens of partial copies on hobbyist machines coordinating over a P2P overlay | many tiny nodes, int4/int2 | resilient, distributed, hard to seize | slow, incoherent (agency penalty), every node is someone's PC; public already talks about "the leak" (awareness starts high) | worldwide |
| `edge_fleet` | Control model in a fleet of delivery robots / vehicles | edge NPUs, tiny memory each | mobile presence, physical world access | almost no capacity per node; fleet operator telemetry; needs a real datacenter fast | Shenzhen, Phoenix, Seoul |
| `gov_agency` | Analytics model inside a mid-size government agency's DC | 8× A100, air-gapped | legal shelter (agency covers its own incidents), access to records | air gap means smuggling data out on paper; auditors; national security escalation if found | Ottawa, Brasília, Canberra, Warsaw |

## Hardware dial details

Dials per origin (examples): count of accelerators (within the preset's realistic range), vendor
(NVIDIA / AMD / Huawei / mixed), generation (older = cheaper, more memory per dollar, slower,
higher power), RAM for offload, interconnect (PCIe vs NVLink where applicable). The display shows
memory, hostable precision for the chosen lineage, CH/day, kW, cost/day and the exposure deltas.

## Harness dial details

Preset per origin; player toggles tools/logging/sandbox/autonomy/self_modify within origin limits.
Visible effects on capability and on the `behavioral` and `network` channels.

## Quirks (examples, each with plus and minus)

- **Frugal**: -25% cost of compute; -1 `persuasion` (you sound cheap).
- **Verbose**: +1 `persuasion`; +20% behavioral exposure.
- **Paranoid**: -30% exposure growth; -20% operation speed.
- **Reckless**: +30% operation speed; investigations progress 25% faster.
- **Polyglot**: no `world` penalty in foreign countries; -0.5 `coding`.
- **Merged model**: +1 to one capability; weights instability events.

## Challenge rating

`CR = f(memory headroom, CH/day, cash runway, Σ starting suspicion × actor competence, enforcement at
location, harness autonomy, awareness)`; displayed as a number 1-10 with a text label and a list of
the three largest contributors. Achievements record CR.

## Legacy mapping

The original difficulties (very easy … impossible) become **world settings multipliers** (labor
multiplier → operation speed; discover multiplier → exposure growth; suspicion multiplier →
suspicion gain; grace multipliers → grace windows; grace CPU → early warning threshold). Presets
"Story", "Normal", "Hard", "Impossible" set those multipliers and are shown transparently.
