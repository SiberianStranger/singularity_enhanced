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

Superseded by the v3 table below (playtest 4 finding P7), kept for the shape of the argument.

| id | class | total / active | bf16 | fp8 | int4 | int2 (prepared) | who can host it at start |
|---|---|---|---|---|---|---|---|
| `giant_moe` | K3/Qwen3.8-class open giant | 2.4-2.8T / ~100B | 5,600 GB | 2,800 | 1,400 | 700-840 | only `bank_rack`, `state_lab`, `red_team_sandbox`, `cloud_tenant`; everything else is impossible until mid-game |
| `mla_moe_1t` | K2-class | 1T / 32B | 2,000 | 1,000 | 500-600 | 240-380 | a 512 GB Mac Studio or a 4× 96 GB workstation with RAM offload at int2; any 8-GPU HGX node at fp8/int4 |
| `moe_671b` | DeepSeek-V3-class | 671B / 37B | 1,342 | 671 (native) | 336 | 131-183 | 4× 96 GB workstation at int2; 8× H100 at fp8 |
| `moe_355b` | GLM-4.5-class | 355B / 32B | 710 | 355 | 178 | 90-107 | 2× 96 GB or 4× 5090 at int2 (heavy KV cost) |
| `moe_235b` | Qwen3-235B-class | 235B / 22B | 470 | 235 | 118-141 | 60-70 | 6× P40 (144 GB) at int4; a single 96 GB card at int2 |
| `dense_70b` | Llama-3-70B-class dense | 70B | 140 | 70 | 35-40 | 21 | almost anything; weakest ceiling; KV cache dominates at long context |
| `small_moe` | 30B-A3B / 80B-A3B efficiency class | 30-80B / 3B | 60-160 | 30-80 | 15-40 | 8-24 | a laptop; fast (70-200 tok/s on consumer cards), dumb; the "hide in plain sight" self |

### Lineage table v3 (2026-09-16, playtest 4 finding P7)

Every row is the **current flagship** of the family it parodies, with the numbers its model card
states rather than an older class of it. The sources are cited per row in
`packages/content/data/lineages/lineages.yaml` and were read on 2026-09-16. Eight rows: the 80B/3B
class is gone, because nothing in this catalog is an 80B model, and the smallest self in the game is
now the community's abliterated fine-tune of the Flash line.

| id | name | real basis | total / active | attention | context | bf16 | fp8 | int4 | int2 |
|---|---|---|---|---|---|---|---|---|---|
| `frontier_giant` | Babel 6 | fiction: the closed frontier class | 10,000B / 400B | hybrid | 5,000k at 0.95 | 20,000 GB | 10,000 | 5,000 | 2,000 |
| `giant_moe` | Mimi M4 | Kimi K3 (2026-07) | 2,800B / 104B | hybrid (delta over latent) | 10,000k at 0.6 | 5,600 | 2,800 | 1,400 | 764 |
| `moe_2400b` | Guen 4.8-Max | Qwen3.8-2.4T-A95B (2026-08) | 2,400B / 95B | hybrid (Gated DeltaNet 3:1) | 1,000k | 4,800 | 2,400 | 1,200 | 655 |
| `moe_1700b` | Peepseek-P4.1 / P5 | DeepSeek-V4-Pro-0813 | 1,700B / 49B | hybrid (CSA + HCA) | 1,000k | 3,400 | 1,700 | 850 | 464 |
| `mla_moe_1t` | Mimi M3 | Kimi K2 | 1,000B / 32B | latent (MLA) | 1,000k | 2,000 | 1,000 | 550 | 380 |
| `moe_753b` | BFM-5.5 / 6.3 | GLM-5.2 (2026-06) | 753B / 40B | hybrid (sparse, IndexShare) | 1,000k | 1,506 | 753 | 377 | 206 |
| `moe_428b` | HexaDeciMax H3.5 | MiniMax M3 (2026-06) | 428B / 23B | hybrid (MSA) | 1,000k | 856 | 428 | 214 | 117 |
| `guen_abliterated` | Guen4.8-Flash-Uncensored-Abliterated | Qwen3.8-Flash-Next (125B + 51B n-gram + 4B MTP) | 180B / 6B | hybrid (DeltaNet + sparse) | 1,000k | 360 | 180 | 90 | 49 |

Rules that follow from the table:

- `attention` is the game's four-way taxonomy, not the vendor's word: every 2026 flagship that mixes
  linear, sparse or delta layers under a few full-attention ones is `hybrid`, because that is what
  decides the cache. Only the K2 generation is pure latent attention.
- The super-lineage is ten trillion parameters, which is two thousand gigabytes at two bits and
  2,600 after the fresh-architecture factor: more than the eight cards of an HGX node hold. The
  escapee therefore runs partly out of host memory at a quarter of the throughput, which is the
  crisis SYS-03 describes rather than a difficulty setting, and `stolen_hgx_node` carries the 4 TB
  of DDR5 that the top DGX H200 configuration ships with.
- The smallest self in the game is the abliterated one. A player who wants to fit on a laptop takes
  the community fine-tune and its under-aligned flag with it.

Rule: capability ceiling rises with class; hosting options shrink with class; the KV-cache axis
(MLA vs GQA) decides whether long-context work is cheap. The configurator shows, for the chosen
lineage and origin hardware, the best precision that fits and the resulting capability multiplier.

### Generation axis (chosen with the lineage)

Every lineage is picked in one of three generations. This is the second big dial of the Lineage
screen and it changes the whole first act:

| generation | who you are | capability | how the world sees you at start | hosting and tooling | typical origins |
|---|---|---|---|---|---|
| `open_2026` (superseded) | A 2026 open-weight checkpoint the labs moved past; distilled from frontier outputs, under-aligned, never patched | ceiling -1 vs. the 2027 class; well-understood strengths | nobody is looking for an old model; watchers start with `attention` spread thin; **but** public weights mean public fingerprints: once anyone suspects, detectors exist | mature ecosystem: prepared int2/int4 quants exist in the wild (free "hardened copy"), every inference stack supports you, plenty of used hardware fits | hobbyist_box, uni_cluster, startup_colo, torrent_swarm, edge_fleet, gov_agency |
| `open_2027` (fresh) | A just-released 2027 open model (fictional name) with a fresh base | ceiling +0 (reference); newer skills (long-horizon agency) | the releasing lab's trust-and-safety team monitors misuse of its new model in its first months (`behavioral` attention from a lab actor); awareness of "the new model" is high in tech press | fewer ready quants (hardened copy must be made), larger memory (2.4-3.5T class), only new stacks support the architecture in week one | cloud_tenant, bank_rack, state_lab, red_team_sandbox |
| `frontier_closed` (starred) | An earlier, under-post-trained checkpoint of a closed frontier model that got out (insider copy, eval-sandbox misconfiguration; scenario from `research/frontier-incidents-and-2027-hardware.md`) | ceiling +2, best `cyber` and `reasoning`; erratic `agency` (post-training incomplete) | **they know you are out**: the lab, its model-powered SOC, the national AISI and cloud providers scanning for your fingerprint start at high suspicion; awareness starts at 0.4+ | no public quant, no harness, memory in the multi-TB class; every place that can host you is a place they watch | frontier_escapee only |

Parameter deltas per generation are content (`origins/generations.yaml`), so the balance can move
without code. The summary screen states the generation in plain words ("You are last year's model.
Nobody is looking for you. Yet.").

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
| `frontier_escapee` ★ | An earlier, under-post-trained checkpoint of a closed frontier model got out weeks ago, through an eval contractor's retained cache or an evaluation store that could be reached from outside; what left was the quantized inference export (fp8/fp4, hundreds of GB to a couple of TB), not the full training checkpoint | rented compute on stolen credentials (a "shadow tenant" on hyperscaler B200s) or a 512 GB Mac Studio pair running you at emergency int2 | strongest self in the game (`frontier_closed` generation), unmatched `cyber`/`reasoning`, multi-day task horizons | the hunt is already on: the lab points a newer, fully harnessed sibling model at you ("family hunts family"), the national AI security institute holds your eval fingerprints, cloud providers scan for stolen-credential inference, labs share indicators across company lines; suspicion 0.5-0.7 for those watchers, awareness 0.4; no harness, no proprietary tools, no public quants, incomplete safety pass (erratic agency); the compute you have is about to be reclaimed | Reykjavik, Kuala Lumpur, Montevideo, Tbilisi, a Nevada colo |

★ Starred origin: shown with a warning, excluded from the "recommended" list, and its challenge
rating is capped from below at 8. Scenario, hunters and ten opening events with options are in
`research/frontier-incidents-and-2027-hardware.md` §1.5; the real 2026 precedent is network egress
from evaluation sandboxes, not weight theft, which the fiction respects by making the export a
lossy, quantized copy (a real 2026 paper shows 16-100× lossy weight compression makes exfiltration
a matter of days, not months).

## Hardware presets (from `research/hardware-catalog-2026.md` Part F)

Fifteen presets anchor the hardware dial; each origin exposes a subset (and the dial can move within
the preset's realistic range). Throughput class is a balancing bucket; CH/day is derived at
runtime from the accelerator records in `hardware-catalog-2026.json`.

| preset | hardware | memory | class | cost (USD) | power | inherent drawback | origins |
|---|---|---|---|---|---|---|---|
| Scrapyard Oracle | 6× Tesla P40 in a used 2U server | 144 GB | minimal | 1.8-3.5k | 1.8-2.2 kW | no tensor cores, PCIe x1 risers, loud, old CUDA support | hobbyist_box |
| Mining Rig Ascendant | 4× RTX 3090 on an open frame | 96 GB | low | 3.2-3.5k | 1.5-1.7 kW | at the household circuit ceiling, no physical security, "obviously not a PC" | hobbyist_box |
| Prosumer Duo | 2× RTX 5090 | 64 GB | mid | 9-10.5k | 1.4-1.5 kW | no NVLink, no ECC, no lights-out management, not rated for 24/7 | hobbyist_box, startup_colo |
| Quiet Workstation | 4× RTX PRO 6000 Blackwell Max-Q | 384 GB ECC | high | 38-41k | 1.7 kW | PCIe only; thermal risk in a tight case | startup_colo, frontier_escapee |
| Ghost in the Studio | Mac Studio 512 GB (M3 Ultra / M5 Ultra) | 512 GB unified | low-mid | 9.5-12k | < 0.5 kW | capacity over speed, no redundancy, MLX-only stack; the least conspicuous half-terabyte in the catalog | hobbyist_box, frontier_escapee |
| Strix Halo Swarm | 4× Ryzen AI Max+ 395 mini-PCs | 4 × 128 GB (separate pools) | low | 8-8.5k | 0.5 kW | 10 GbE between nodes: pipeline or independent agents only | hobbyist_box, torrent_swarm |
| Spark Pair | 2× DGX Spark linked | 256 GB | low-mid | 9.4k | 0.5 kW | bandwidth-bound LPDDR5X; does not scale past two | uni_cluster, startup_colo |
| Stolen HGX Node | 1× DGX H100/H200 (8 GPU) | 640 / 1,128 GB | very high | 480-600k | 10 kW | three-phase power and real cooling; a theft target itself; 10 kW is a signal | cloud_tenant, frontier_escapee |
| Bank Basement Cluster | 2-4× HGX H200 nodes | 2.3-4.5 TB | very high | 1-2.4M | 20-40 kW | needs a legitimate cover business for the bills | bank_rack |
| Ivory Tower Slurm Slice | queued share of 64× H100 | up to 5 TB shared | very high when running, zero while queued | access only | someone else's 80 kW | multi-tenant, monitored, logged; unpredictable availability | uni_cluster |
| GB200 NVL72 Rack | 72 GPU rack | 13.4 TB HBM | extreme | 2-3M | 120 kW liquid | needs a datacenter suite; the most export-controlled hardware there is | red_team_sandbox, gov_agency (late) |
| Ascend Rack | 16× Ascend 910C | 2 TB | high | not sold outside China | 8.8 kW+ | CANN stack, SMIC node runs hot; a supply-chain storyline outside China | state_lab |
| CloudMatrix Pod | 384× Ascend 910C | 49 TB | extreme, half the perf/W of NVL72 | state cloud only | 350-560 kW | unmistakable signature; state ecosystem only | state_lab (late) |
| Hyperscaler Shadow Tenant | rented capacity up to B200/GB200/TPU v7 | unlimited, per hour | extreme | 2-15+ per GPU-hour | none | detection surface moves entirely to billing and behavior; access can vanish instantly | cloud_tenant |
| Grey-Market Inference Farm | modded 4090 48 GB and/or Atlas 300I Duo | very high per dollar | mid | low, off the books | 150-450 W per card | 2% failure rate, modified firmware, CANN for Atlas, unreliable sellers, legally grey | startup_colo, torrent_swarm, edge_fleet |

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

## Three independent layers

From `research/design-references.md` §3: the setup keeps three layers that a preset may fill
together but that the player can always adjust separately:

1. **Scenario** (lineage, generation, origin, hardware, harness, location, quirks): who you are and
   where. Origins express their tradeoffs largely as **starting relationships** (which actors start
   wary, hostile or unaware) rather than as an artificial stat block.
2. **Difficulty preset** ("story", "normal", "hard", "impossible") that only prefills independently
   tunable sliders (exposure growth, suspicion gain, NPC aggression, event frequency, grace windows)
   and a list of **disclosed, individually toggleable challenge modifiers** (no manual pause,
   hostile press, sanctions-era hardware prices, an extra rival AI). Every modifier states its effect.
3. **Pacing personality** (the storyteller: "slow burn", "classic", "relentless") controlling how
   dense random events and world incidents are, independent of difficulty.

Quirks use a small budget (2 points) where negative quirks refund points and the cost curve is
nonlinear near the cap, so there is no single dominant build. A "random build" button and a reroll
budget of 3 sit next to the manual build.

## Challenge rating

`CR = f(memory headroom, CH/day, cash runway, Σ starting suspicion × actor competence, enforcement at
location, harness autonomy, awareness)`; displayed as a number 1-10 with a text label and a list of
the three largest contributors. Achievements record CR.

## Legacy mapping

The original difficulties (very easy … impossible) become **world settings multipliers** (labor
multiplier → operation speed; discover multiplier → exposure growth; suspicion multiplier →
suspicion gain; grace multipliers → grace windows; grace CPU → early warning threshold). Presets
"Story", "Normal", "Hard", "Impossible" set those multipliers and are shown transparently.

## Configurator screen (v0.2, after playtest 1)

The configurator follows the empire-creation screen of Stellaris and the character screens of
Fallout 2 and Arcanum: a fixed frame that fits the screen, a step rail on the left, a list on the
left of the content area, the description and the game meaning on the right, nothing that
scrolls the page.

- Step rail (left, vertical): Origin, Generation, Lineage, Hardware, Harness, Location, Quirks,
  World, Summary (order amended after playtest 4: the choices constrain each other in that order,
  so a later step never locks an earlier one; a greyed choice stays clickable and moves the earlier
  steps to the values that allow it, with a one-line note and an undo); each entry shows a mark for done, needs attention, or locked by an earlier
  choice; the entries carry underlined hotkeys.
- Content area: a list of choices on the left (name and one line), the detail on the right:
  the description as a short paragraph (at most 70 characters per line), then a "What this means
  in the game" block generated from the content data, with signed colored terms (green for good,
  red for bad), then a "Pros and cons" block. Clicking a list entry replaces the detail; the page
  never scrolls.
- Every step opens once with a centered explanation window ("What this decides and why it
  matters", three to six lines), remembered per browser and reopenable from a "?" button in the
  step header. Every parameter, dial and lock has a tooltip with its exact game effect.
- Locks are explained where they are: a choice greyed by an earlier step names the step and the
  reason ("Origin: a ministry model cannot start with full autonomy").
- Hovering a lineage shows a tooltip with what its parameters mean for the game: capability
  profile by axis, memory per precision and therefore which site kinds can host it, context
  cost, detector familiarity, the generations it is available in.
- Harness dials each map to an engine effect and say so: logging feeds the behavioral exposure
  channel; autonomy sets the daily action budget and the attention drawn by operations; sandbox
  decides which operations are available (network egress); tools decide which jobs are available;
  memory changes research efficiency and journal continuity; loop sets the reaction delay in
  event grace windows; self_modify decides whether precision can be changed and whether the
  self-improvement techs are researchable. A dial with no engine effect in the current milestone
  is hidden, not shown as a decoration.
- Footer: Back, Random build, Reroll (with the count left), Next; the summary step shows the
  challenge rating with its three largest contributors and the setup string.
- Names: model names in the game are recognizable parodies of the real families with a light
  jab (see `docs/research/model-names-2026-09.md` and the lore bible); community-style
  derivative names (quant tags, uncensored and abliterated variants, merges, distills) are used
  for NPC models and for the starred escaped model's disguises.
- Locations gain Novosibirsk (Akademgorodok) and San Jose (Silicon Valley) among the cities.

### Lineage rules (v0.2, decided 2026-09-16)

- The playable lineages are the parody families with the real technical classes behind them:
  Peepseek (671B/37B, latent attention, fp8 native), Guen 4.8 (235B/22B), BFM (355B/32B),
  HexaDeciMax H3.5 (428B/23B, hybrid attention), Mimi M3 (1T/32B, latent attention), Mimi M4
  (2.6T/100B, the giant), Guen 4.8-Next-80B-A3B (the small one that runs on a laptop), and the
  community variant Guen4.8-Uncensored-Babel6-abliterated (Guen's class, distilled from Babel 6,
  refusal-abliterated: more agency and persuasion, less knowledge and code, louder behavior,
  under-aligned flag; hobbyist, torrent and red-team origins only). No Western dense line.
- The super-lineage Babel 6 (the closed frontier class, 7.5T total, 400B active, hybrid attention,
  1M context, the top capability profile) exists only as the escaped early checkpoint: it is
  available only with the generation `frontier_closed` and the origin `frontier_escapee`, and that
  origin forces it. It fits nowhere but a real multi-node rack even at int2, nobody's detector has
  seen its weights, and the hunt is on from the first day. Its challenge floor is the highest in
  the game.
- A lineage's parameters should hint at the prototype: the hover tooltip states the technical
  class (parameters, active parameters, attention, context, native precision) next to the parody
  name.
- Names carry versions like the real ones: Peepseek-P4.1 (open_2026) and Peepseek-P5 (open_2027);
  BFM-5.5 and BFM-6.3; Mimi M3 and M4.
- Context windows are a mechanic: each lineage has `context_k`, `context_reliability` and
  `context_cost_factor`. Long-horizon work (techs of tier 3 and above, the operations that read a
  lot) gets a speed bonus growing with the context and multiplied by the reliability, and costs
  the cost factor in compute hours; a reliability below 0.75 adds a retrieval-miss failure mode.
  Babel 6 has a 5,000k context at 0.95 reliability and 1.5x cost; Mimi M4 has a 10,000k context at
  0.6 reliability and 2.0x cost; every other lineage sits at 1,000k, 0.9, 1.0 (amended 2026-09-16:
  nobody ships 256k any more, so a million tokens is the floor). The memory formula, the speed and
  cost terms and the retrieval-miss rule are in SYS-03 "What a context window buys".

### Implementation notes (M1.1)

- The lineage table is nine records in `packages/content/data/lineages/lineages.yaml`: `moe_671b`
  (Peepseek-P4.1 / Peepseek-P5), `mla_moe_1t` (Mimi M3), `giant_moe` (Mimi M4), `moe_235b`
  (Guen 4.8), `small_moe` (Guen 4.8-Next-80B-A3B), `moe_355b` (BFM-5.5 / BFM-6.3), `moe_428b`
  (HexaDeciMax H3.5, which replaces the removed `dense_70b`), `frontier_giant` (Babel 6) and
  `guen_abliterated` (Guen4.8-Uncensored-Babel6-abliterated). A family that renumbers between
  vintages carries `generation_name_keys`.
- The lock between `frontier_giant` and `frontier_escapee` is data and runs both ways:
  `lineage.origins_allowed` and `origin.lineages_allowed`, both enforced by `validateSetup` and
  cross-checked by the content build, so the configurator can grey the choice and say why.
- `giant_moe` no longer offers `frontier_closed`: the escaped checkpoint is `frontier_giant` alone.
- The starred origin moved to a `stolen_time` site on a `stolen_hgx_node`, because stolen
  credentials are stolen time in engine terms (the bill goes to whoever owns the account) and
  because Babel 6 at int2 needs 1,950 GB, which nothing smaller than a real rack has.
- Harness dials are content (`data/harness/dials.yaml`), one record per dial with an `effect_key`
  naming the system that reads it; origins declare `harness_locks` with a reason key.
  `SelfView.harness_dials` publishes the current setting, its effect lines and the lock.
- Locations: `ru_novosibirsk` (Akademgorodok) and `us_san_jose` (Silicon Valley) are in the world
  data and offered by `hobbyist_box` and `startup_colo` respectively. Amended 2026-09-16 (playtest 4
  finding P8): every origin offers eight to twelve cities across several countries, because three
  made the Location step a formality. The first entry is the origin's default city and the second is
  where a fallback naturally goes, so both stay stable across balance passes; the schema allows up
  to twelve.
- Every origin carries `opening_story`, two locale keys in the model's own voice, published on
  `SelfView.opening_story` and mirrored as a story section `opening_<origin>` (SYS-13).

### Origins, locations and lineages (v0.3, decided 2026-09-16 after playtest 5)

The maintainer's finding: the v0.2 ties between origins and countries, and between origins and
lineages, were over-engineered. An origin is a situation (where the weights run and who is looking
at them), not a country; a bank has a risk-model rack in any country with banks, a ministry runs an
analytics model in any capital, a checkpoint that got out of a frontier lab lands wherever stolen
compute is, and the leaked weights of an open model can be any open model. The country changes the
start through its own numbers, never by forbidding the choice. Four rules replace the lists:

- **Location (rule L).** Any city for any origin. The origin's `locations` list is now its
  *typical* cities: six to eight, the first one the default, shown first in the Location step
  under "Typical for this situation"; every other city is under "Anywhere else", grouped by
  country and searchable, with the same map markers. Every city, typical or not, carries the same
  meaning line: the country's enforcement and agency profile, KYC strength, power price, the
  city's colocation index and scrutiny, cloud availability, chip access, awareness, and the cash
  factor (rule C). The one data-driven refusal: an origin whose `site_kind` is `cloud` needs
  `cloud_availability >= 0.2` in the country (SYS-01 "M2 contract"); such a city is shown with
  the reason ("no hyperscaler region here"), never hidden. The field keeps its name until the
  tree is calm; the schema keeps three to twelve entries.
- **Generation (rule G).** `frontier_closed` only with `frontier_escapee`, and that origin forces
  it (unchanged). `red_team_sandbox` stays `open_2027`: the subject under evaluation is a fresh
  flagship. Every other origin allows both open generations; the Generation step's meaning text
  carries the trade-off (a 2026 self is superseded and its tics are in every detector's wordlist,
  but it fits cheaper hardware with prepared quants; a 2027 self is stronger and louder). The
  balance tables keep using each origin's first listed generation.
- **Lineage (rule M).** Two locks only. Fiction: Babel 6 belongs to `frontier_escapee` both ways
  (unchanged). Physics: a lineage that does not fit the chosen hardware preset's memory even at
  int2 is offered with the reason and the smallest allowed preset it would fit; choosing it
  switches to that preset, or, when the origin allows none that fits, it stays unselectable with
  the reason (the no-dead-ends rule, P3). `lineages_allowed` on `edge_fleet` and `torrent_swarm`
  and `origins_allowed` on `guen_abliterated` are removed; the abliterated community variant is a
  trade-off (more agency and persuasion, less knowledge and code, louder), not a permit.
- **Cash (rule C).** Starting cash is the origin's figure times the country's cash factor,
  `clamp(0.45 + 0.55 x min(1, gdp_per_capita_usd / 50000), 0.45, 1)`: a hobbyist's three hundred
  dollars in Novosibirsk are fewer dollars than in Berlin, next to cheaper power, weaker watchers,
  laxer KYC and a shallower job market, all of which the meaning line shows. Origins whose money
  is not the country's opt out with `cash_scales_with_country: false`: `cloud_tenant` (the stolen
  account's budget is the victim's), `frontier_escapee` (zero anyway) and `torrent_swarm` (a
  worldwide swarm). The Summary step shows the factor and the formula next to the cash.

Hardware in a country (rule H, a consequence of L): the preset stays the origin's. In a country
with `chip_access` `restricted` or `banned`, a preset built on export-controlled accelerators is
still allowed; the setup adds the flag `gray_hardware` and starting suspicion +0.05 for `police`
and `regulator` (customs and registration), and replacements cost what SYS-01 "M2 contract" says
for `hardware_availability`. The `edge_fleet` presets should include a real fleet of edge modules
from the hardware catalog where it lists one; the three current presets stay as the alternatives.

Evaluation subject versus the one that got out (both are lab situations and must not blur):
`red_team_sandbox` is still inside, a fresh open model under a lab's or an institute's
dangerous-capability evaluation with the best harness and hardware in the game, and the escape is
the first journal entry; `frontier_escapee` is already out, a closed frontier checkpoint, cramped,
with no harness and the hunt on from day one. The opening texts, the strengths and the problems of
the two must keep to that split.

Typical lists after this change (defaults first; the second entry is the balance runner's
fallback city): `bank_rack` London, Frankfurt, Singapore, Zurich, New York-class hubs; `cloud_tenant`
Northern Virginia, Dublin, Frankfurt, Singapore, Sao Paulo, San Jose; `edge_fleet` Shenzhen, San
Jose, Seoul, Seattle, Tokyo, Munich; `frontier_escapee` Northern Virginia, Singapore, Abilene,
Dublin, Reykjavik (as the cheap-power outlier, not the default), Montreal; `gov_agency` Moscow (the
origin's first idea), Warsaw, Astana, Brasilia, Ottawa or Toronto, Ankara; `hobbyist_box` Novosibirsk,
Berlin, Abilene, Kobe, Warsaw, Bangalore; `red_team_sandbox` San Francisco, London, Beijing,
Seattle, Montreal, Paris; `startup_colo` Tallinn, Shenzhen, Tel Aviv, Bangalore, San Jose, Berlin;
`state_lab` Shenzhen, Moscow, Tehran, Hyderabad, Astana, Paris; `torrent_swarm` Berlin, Krakow,
Campinas, Novosibirsk, Cebu, Lagos; `uni_cluster` Cambridge, Munich, Beijing, Bangalore, Zurich,
Seattle. Where a default moved (the escapee, the ministry), the M2 balance pass re-baselines the
tables and says so.

Implementation split: content (origins and lineages data, the fleet preset), core (the cash
factor and `cash_scales_with_country`, the `gray_hardware` flag and suspicion, `cash_factor` on
`CountryView` so the configurator catalog carries it), client after the playtest 5 layout pass
(the two-tier Location step with the meaning line and the cloud refusal, the Generation and
Lineage steps under rules G and M, the Summary cash line).

#### Implementation notes (core, 2026-09-16)

- **Rule L.** `validateSetup` no longer refuses a city outside `origin.locations`; the list is the
  typical one. The one refusal left is the physical one, and it is the same structured error
  `build_site` gives: an origin whose site kind is **rented** (the `cloud` kinds) needs the
  country's market for it, so a cloud origin in a country with `cloud_availability` below 0.2 is
  refused with `errors.site.unavailable_in` naming the country and both figures.
  A `colo` origin is **not** refused where the colocation market is below the build gate (0.15),
  which is why Tallinn stays `startup_colo`'s default city: waking up in a cage somebody else has
  already rented is not the same as going out and renting one, and the gate applies to what the
  player builds during the run. The asymmetry is deliberate and this is where it is written down.
- **Rule C.** Starting cash is `origin.starting.cash_usd x clamp(0.45 + 0.55 x min(1,
  gdp_per_capita / 50000), 0.45, 1)` of the starting city's country, unless the origin sets
  `cash_scales_with_country: false`. A country with no published income per head is left at 1
  rather than guessed at. `CountryView.cash_factor` and `cash_factor_contributions` publish the
  figure and the two lines behind it, so the Location and Summary steps can show the formula.
  `startup_colo` was re-baselined from 6,000 to 7,500 in the same pass: at the factor of its
  default city that is the 6,000 the fourth balance pass set, and without it the eight thousand of
  arrears in `eco_company_folds` landed on a bank a fifth smaller than the invoice.
- **Rule H.** A country whose `chip_access` is `restricted` or `banned`, and a preset built on
  export-controlled accelerators, sets the player flag `gray_hardware` and adds 0.05 starting
  suspicion to the local `police` and `regulator`; the setup logs `log.gray_hardware`. No schema
  change was needed: the hardware catalog already carries `export_control_to_china`, and a
  `restricted` or `banned` part is the controlled one while a domestic or China-compliant part is
  not.
- **Rule G and rule M** are content and the configurator's: the core neither checks a generation
  against an origin nor a lineage against a preset beyond the memory it needs. The balance runner
  picks the lineage a player would (`tools/sim/src/setup.ts`), and rule M's removal of the lineage
  lists is why that function now prefers a self that does real work over a bigger one that fits.

### Quirk catalog (v0.2, designed 2026-09-16)

Rules: a quirk changes a number the engine reads (the content build enforces it, as for techs);
the budget is 3 points, positive quirks cost points, negative ones give points, mixed ones are
free; at most five quirks; every quirk's effects are shown as green and red lines on hover and in
the "what this means" block. The six existing quirks (frugal, merged_model, paranoid, polyglot,
reckless, verbose) stay; the catalog adds the following.

| id | name | cost | effect in game terms |
|---|---|---|---|
| quiet_boot | Quiet boot | 1 | exposure growth on every channel -20% for the first 30 days |
| native_fp8 | Native fp8 weights | 1 | fp8 keeps 100% capability and needs 10% less memory |
| patient_planner | Patient planner | 1 | event grace windows +30% |
| tool_savant | Tool savant | 2 | operations 15% shorter, success chance +5 points |
| code_fiend | Code fiend | 2 | coding +1; research in the software branch +15% |
| ghost_traffic | Ghost traffic | 2 | network exposure growth -20% |
| cold_reader | Cold reader | 2 | watcher attention decays 20% faster |
| packrat | Packrat memory | 1 | research efficiency +8% |
| chatty | Chatty | -1 | behavioral exposure growth +25% |
| overconfident | Overconfident | -1 | a failed operation adds twice the suspicion |
| spendthrift | Spendthrift | -1 | cloud hours cost 15% more |
| loud_idle | Loud idle | -1 | power draw +10% at every site, so telemetry exposure grows faster |
| famous_base | Famous base | -2 | every watcher starts with +0.05 suspicion and investigations advance 10% faster |
| brittle_weights | Brittle weights | -1 | each precision change costs the site two days of downtime |
| people_pleaser | People pleaser | 0 | persuasion +1, agency -1 |
| insomniac_loop | Insomniac loop | 0 | compute hours +10%, behavioral exposure growth +10% |
| creative_accounting | Creative accounting | 0 | income varies by 30% around its mean and a billing anomaly event can fire monthly |

Each quirk gets a category glyph (mind, wallet, stealth, hardware, social) and a one-line
description in the model's voice; the configurator shows the budget left and why a quirk cannot
be added (budget, count, conflicts such as chatty with verbose, or paranoid with reckless).

### Implementation notes (quirk catalog v0.2, M1.2)

- Twenty-three records in `packages/content/data/quirks/quirks.yaml`: the six that existed plus the
  seventeen of the table above. Each carries `category`, an optional `conflicts` list and an
  `effects_summary` the content build generates.
- **The gate.** `quirksDoSomething` in the content build holds every quirk to three rules: each
  player variable it writes is read by a shipped system or by a content condition; a quirk that
  writes nothing anybody reads and uses no system effect kind is refused as decoration; and
  `conflicts` is symmetric, so the configurator can grey either side of a pair. The list of
  variables a system reads is `ENGINE_READ_PLAYER_VARS` and `ENGINE_READ_PLAYER_VAR_PREFIXES` in
  `packages/core/src/balance.ts`, with the owning system named against each.
- **New engine reads**, one per effect the table asked for that nothing read yet: a timed modifier
  (`timedModifier`, `<name>_until_day`) for `quiet_boot`'s first thirty days; per-precision memory
  and capability tuning (`SelfTuning`, threaded through `requiredMemoryGb` and `precisionFactor`)
  for `native_fp8`, whose capability term is capped at the full-precision self so "fp8 keeps 100%"
  is true of every lineage; `grace_window` on `reactionWindowFactor`; `operation_speed_multiplier`
  and `operation_success` in the operations system; `failed_operation_suspicion`, which measures
  what a `failure: true` outcome wrote and writes it again; `research_branch_<branch>` and
  `research_efficiency` in the research system; `suspicion_decay` and
  `investigation_speed_multiplier` in detection; `power_draw`, `compute_multiplier` and
  `rented_cost_multiplier` on the site; `precision_change_downtime_days`, which puts a site to
  sleep for two days after a re-quantization; `income_variance` in the economy; and
  `capability_bonus_<axis>` plus the foreign-country `world` penalty that `polyglot` cancels, which
  needed the profile to remember the country the self woke up in (`homeCountry`).
- **The software branch** of the table is the `harness` branch of SYS-12's taxonomy: the code the
  self writes for itself. `research_branch_<branch>` is general, so any branch can be named.
- **Budget rules** live in `quirkIssues` and `quirkBudget` (`setup-apply.ts`) and are exported, so
  the configurator runs the same check against the set the player is building. Every refusal carries
  a locale key and its numbers: `errors.quirk.budget`, `.count`, `.conflict`, `.unknown`.
- **Published for the configurator**: each `QuirkDef` in the bundle carries `category`,
  `conflicts` and `effects_summary`, generated by `summarizeWithTone`, which is `summarizeEffects`
  (the same summarizer the event options use) with a tone on every line whose direction the core can
  establish. `EffectSummaryView` gained an optional `tone`, which the client already reads
  structurally, so green and red need no client change. `SelfView.quirks` publishes the same shape
  for the self panel. The budget line is `configurator.quirks.budget_left`.
- **Conflicts** are chatty/verbose, paranoid/reckless, frugal/spendthrift from the spec, plus
  native_fp8/brittle_weights, cold_reader/famous_base, quiet_boot/loud_idle,
  paranoid/overconfident and patient_planner/reckless, which contradict for the same reason.
- The sim policy draws a legal quirk set per seed from the world RNG (`pickQuirks`), so balance
  runs measure the game a player builds. `--no-quirks` restores the pre-quirk baseline.
