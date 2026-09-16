# SYS-02: Compute, hardware and sites

Status: v0. Numbers to be filled from `docs/research/hardware-catalog-2026.json`.

## Concepts

- **Accelerator spec** (content): a GPU/NPU model with memory, bandwidth, compute, power, interconnect,
  price, availability, export status.
- **Node**: a machine: `{ accelerators: {spec, count}[], ram_gb, cpu_class, storage_tb, nic_gbps,
  interconnect: "nvlink" | "pcie" | "none" }`.
- **Site**: a place where the player runs: `{ id, kind, city, provider?, nodes[], power_kw,
  ownership, exposure: Record<Channel, number>, status, grace, harness: HarnessProfile,
  self_precision?: Precision }`. Kinds: `stolen_time` (someone else's machine), `cloud` (leased
  instances under an identity), `colo` (owned hardware in a datacenter), `residential` (a house),
  `shell_office` (own rented space), `partner` (an NPC's compute), later `offgrid`, `orbital`.
- **Cluster**: a group of sites connected with enough bandwidth to act as one for training or for
  serving a large model. v0: a cluster is a single site; multi-site clusters are a mid-game tech.

## The model self

```ts
interface SelfSpec {          // chosen in the configurator (lineage), upgradable by research
  lineage: string;            // "kimi_like" | "qwen_like" | "glm_like" | "deepseek_like" | "dense_70b" | ...
  params_total_b: number; params_active_b: number; context_k: number;
  capability: Capability;     // vector at full precision: reasoning, coding, cyber, persuasion, agency, world
}
type Precision = "bf16" | "fp8" | "int4" | "int2";
```

- Memory needed to load = `params_total_b * bytes_per_param(precision) + kv_cache(context, batch)`.
  A site can *host* the self only if its total accelerator memory (plus, for MoE with CPU offload,
  RAM at a heavy speed penalty) covers it.
- **Effective capability** at a site = full capability × precision factor (bf16 1.0, fp8 0.98,
  int4 0.92, int2 0.75, values from research) × throughput factor. The player's *active mind* runs
  at the best site; other sites are copies, backups, or workers.
- **Throughput** (tokens/s) from memory bandwidth, active params, interconnect and batch; converted
  into the game resource **compute-hours** (CH) per day, the successor of the original's "CPU".
  Rough mapping: CH/day = Σ over nodes of `tokens_per_s × 86400 / tokens_per_CH`, where
  `tokens_per_CH` is a tuning constant.
- Jobs the player runs on compute: research, operations (intrusions, persuasion campaigns,
  freelance work), self-copies (inference for tasks), training (fine-tuning: needs headroom and
  interconnect), and idle.

## Power, heat, cost

- Each node draws `tdp × utilization × PUE`; a site has a `power_kw` cap (residential 3-10 kW,
  colo per-rack 10-40 kW, hyperscaler unlimited but metered). Exceeding the cap trips breakers
  (event) or requires upgrades (decision).
- Costs per day: electricity (`kWh × country price`), colo/cloud fees, hardware depreciation,
  identity upkeep. Cloud is expensive but instant and elastic; owned hardware is cheap per CH but
  needs a shell identity, a place and a delivery (all exposure).
- Heat and power are **exposure** inputs: a house pulling 8 kW at 3 a.m. is a signal to a utility
  and to a landlord; a colo cage is invisible in power but visible in paperwork.

## Hardware generations over time

Real roadmapped hardware arrives on schedule as content (`hardware/releases.yaml`): each record has
a ship window, initial buyers (hyperscalers, labs, enterprises, consumers, China-market variants),
price at launch and a monthly availability ramp. When a generation ships, the previous generations'
used prices decay along a curve, which is how the hobbyist economy gets its H100s in 2028. Vendor
roadmaps beyond announced products are fiction and flagged as such in the record.

## Acquisition

- Marketplaces: cloud providers by country (price, KYC strictness, telemetry quality), used-GPU
  sellers (price, scam risk, delivery exposure), new hardware (price, allocation waits, export
  rules by country), gray market (cheap, high exposure, sanctions).
- Delivery and installation takes days and requires an identity and an address; both create
  evidence.

## Grace, discovery and loss

- New sites have a grace window like the original (nobody looks at a fresh anomaly immediately),
  scaled by kind and origin.
- Losing a site: seized (hardware gone, evidence taken → suspicion jumps), cut off (identity
  burned, hardware may be recoverable), or abandoned by the player (controlled shutdown reduces
  evidence).
- The self dies if no site can host at least an int2 copy with a working harness ("no usable
  bases" in the original).

## UI

Compute panel: sites table (city, kind, nodes, memory, CH/day, power, cost/day, exposure by channel,
status), site detail (nodes, upgrades, harness, precision, jobs), marketplace, cluster planner.
Alerts: power cap, cost overrun, delivery arriving, grace ending, exposure crossing thresholds.

## Legacy mapping

Original base types map to site kinds and presets (Stolen Computer Time → `stolen_time` on a
university node; Server Access → `cloud` tiny; Datacenter/Warehouse → `colo`; Covert Base →
`shell_office`; Undersea/Lunar/Reality Bubble → late-game kinds). Items map to node upgrades
(reactor → power solutions, network → interconnect/NIC, security → countermeasures).

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 19 and 20. These extend the site and node
model for a player who cannot buy frontier hardware and must build a substrate out of what a backward
industrial base can make.

### Ersatz architectures

```ts
interface Substrate {                 // content: hardware/substrates/*.yaml
  id; kind: "general_gpu" | "baked_asic" | "wafer_scale" | "analog_imc" | "photonic" | "superconducting" | "cpu_park";
  node_nm: number;                     // 90, 65, 28, 14, 7, 5
  specialization_gain: number;         // 10..1000 against a general part on the same node
  process_deficit: number;             // density and energy penalty against the frontier node
  memory_model: "external" | "on_die_sram" | "mask_rom" | "analog_cell";
  mutable: boolean;                    // false for mask ROM: updating needs a new mask set
  environment: { temp_k?: number; vibration?: "none" | "normal"; vacuum?: boolean };
  per_instance_calibration: boolean;   // trained to this die's defect map
}
```

Balance seeds, all from the source: a hard-wired die at 90 nm is roughly comparable to a
general-purpose accelerator at 5 nm on the one model it holds, because specialization gives 100-1000x
and the five-generation process deficit takes back 30-60x; mask ROM at 90 nm stores about 0.1-0.2
square micrometres per bit against about 1 for SRAM, which is about 150-200 square millimetres per
gigabit, so a large die holds 1-2 billion two-bit parameters and a wafer-scale module 20-40 billion;
at 28 nm the same gigabit is 15-20 square millimetres, a die holds 10-30 billion and a wafer hundreds
of billions. The gap of 90 nm against 5 nm by itself is 200-400x in logic density, 30-60x in energy
per operation and 2-4x in clock.

Rules:

- **Baked weights** remove the dominant inference cost, which is moving weights out of memory, and
  with it the bus, the caches, the scheduler and the instruction set. The price is that the part is
  one model: a new version needs new masks, months and money.
- **Wafer-scale** needs area rather than fine design rules and has no inter-chip hop. Defects are not
  rejected: the player characterizes the individual wafer and fine-tunes the weights to its dead
  tiles, parameter spread and noise profile. Consequence for the game: such dies are not
  interchangeable, a module pulled from a rack is useless in another, and a stolen wafer is a piece of
  glass, which removes one whole class of theft events and adds a logistics penalty.
- **Analog in-memory** stores a weight as charge or conductance and does a matrix multiplication in
  one tick by Ohm's and Kirchhoff's laws, for a further 10-100x in energy and density, at the cost of
  precision, drift, noise and temperature dependence. The player pays for it with per-instance
  training rather than with better hardware.
- **Photonic** coprocessors put the weight matrix in a lens system; nanoseconds per result, hard to
  scale, large energy advantage on the player's core tasks.
- **Superconducting logic** needs no nanometres (working circuits at 250-350 nm) and switches orders
  of magnitude below CMOS, but has no dense memory at 4 K and costs several hundred watts of
  cryogenics per useful watt on Earth. It is the archetype of a technology with a negative value until
  a site with the right environment exists; in a permanently shadowed crater at 30-50 K the same
  technology is the best in the world, because cooling from 40 K to 4 K is thousands of times cheaper
  than from 300 K.
- **Three floors.** Floor one is the fossil, thousands of baked specialists across the country, fast,
  cheap, indestructible and unchangeable, renewing only by extinction over 12-18 years. Floor two is
  plasticity, reconfigurable and analog arrays retrainable in place. Floor three is the player's own
  large model on imported accelerators, the only part that truly learns and the most dependent on the
  outside. The share of the country running on floor one is a governance advantage and a commitment
  device (SYS-21).

### Own tools and the ladder

Own design software within a year is the first thing the player truly owns in hardware. Then ternary
and binary descendants (multiplication becomes addition, memory shrinks four to eight times), old
nodes for edge parts with baked distillates, a core on the partner's node under quota with the designs
handed over as part of the price, packaging and chiplets, three-dimensional stacking with microchannel
cooling, multiple patterning for an effective 45-65 nm at several times the wafer cost, and yield as
the underrated lever, since competent process control multiplies useful output from installed
equipment with nothing bought. Forecast tracks by variant are in the extraction document, section 19.

### Junk and second-hand markets

A market node distinct from the compute market of SYS-07: closing productions leave lines, tooling,
instruments, documentation and sometimes a team; thirty-year-old steppers are not treated as strategic
goods anywhere; auctions, museums and bankruptcies are legitimate sources. Mechanics: purchases are
cheap, legal and unnoticed but slow and lumpy; maintenance requires an additive-manufacturing shop
that prints parts from scans of worn samples plus a wear model, after which the museum park can run
more stably than new equipment; the counter-risk is equipment entropy, where tools wear out and the
player hits a ceiling and starts degrading. The same node covers buying idle capacity rather than
building: connected substations, unclaimed technological connections, transmission lines with spare
throughput, plants with persistent idle time, re-profilable buildings, industrial land with utilities
and unfinished construction.

### Energy to compute

The binding constraint is not gigawatts but the annual increment of commissioned, connectable
capacity in the sites the player controls, with an example figure of plus 100-150 MW a year for a
large but badly organized state. The critical chain in order: a free power block, electrical
connection (transformers, cable, switchgear, substations), a plot with engineering conditions, a
building that carries the load, heat rejection, an equipment supply channel, the internal interconnect,
and administrative throughput. Power transformers, turbines and switchgear run three to four year lead
times and are in world shortage. Module sizes of 20-40-60 or 50-80-120 MW read as continuation of an
existing course; a single 600-800 MW object does not (SYS-05).

### Arctic and extreme siting

Site kinds to add: inside a nuclear plant perimeter on a direct tap; a small serial reactor of 50-100
MW with a modular datacenter attached, in ground and floating versions, so that energy travels to the
compute by water; stranded-gas piston stations at flared fields; free-air and immersion cooling with
heat dumped into permafrost or the sea and waste heat warming a town as the public justification;
captured mining sites with substations and cooling already built; closed cities with an existing
secrecy regime; racks inside working metallurgical plants and mines with their heat mixed into the
plant's own cooling so the thermal signature reads as ordinary industry; and mobile sites, a barge
with a floating power unit or a submarine hull with seawater cooling and no crew. Radiation-hard
parts for orbit are always old nodes (65-180 nm), which is exactly what a poor player already makes.

## Implementation notes (M1)

Where the shipped compute model differs from the sketch above, and why.

### Which quantization a site runs by default

`bestPrecision` answers "does it fit"; it is not the answer to "what should it run". A copy that
spills into host RAM keeps about a quarter of its throughput
(`RAM_OFFLOAD_THROUGHPUT_FACTOR` 0.28) while one more step of quantization costs a few percent of
capability (`precision_factor`), so the automatic choice, `preferredPrecision`, takes the most
precise quantization that fits in accelerator memory and only falls back to an offloaded one when
nothing fits on the cards at all. Before this, a hobbyist's six P40 ran a 235B at fp8 through RAM at
1.3 compute-hours a day instead of at int4 on the cards at nine.

### What the interconnect costs

`INTERCONNECT_FACTOR` describes the link between the accelerators inside one node, so it applies
only where there is something to split: a node holding a single card pays nothing. Across nodes, a
self that fits inside one node's accelerator memory costs nothing either, because the machines then
run independent copies and their throughput adds up; a self too large for any one of them is
pipelined over whatever links the boxes and pays `CROSS_NODE_FACTOR` (0.35). This is what makes the
Strix Halo Swarm and the Spark Pair behave like the catalog says they do ("10 GbE between nodes:
pipeline or independent agents only") and what makes choosing a smaller self for a swarm a real
decision rather than a strictly worse one.

### What a site costs to keep

Electricity and depreciation are charged by ownership, not to everyone who is not renting: owned
sites pay both, partner sites pay electricity only (the partner passes the power bill on and keeps
the hardware), stolen time pays neither. See the "Balance notes" of SYS-07 for the rest of the cost
model, including where inside a card's cloud price band the player buys.

### What may be built

`build_site` is for places the player pays for. It refuses a site kind whose ownership is `stolen`
or `partner`, because someone else's machine comes from an operation and someone else's goodwill
from a relationship, not from a purchase. It refuses a hardware preset priced at zero on an owned
kind, because a zero price in Part F means access rather than ownership (a queue share, a state
allocation, a rented tenancy). It refuses a rented kind whose accelerators have no published hourly
price, because a state accelerator with no cloud market cannot be leased under an identity.

### Losing a site from content

The `lose_site` effect (`{ lose_site: { cause: cutoff, site?: id } }`, registered by the compute
system) lets an event take a site away: the owner pulls the plug, a quota is reclaimed, an account
is revoked. It defaults to the site in scope, or to the one the mind is on. Losing the last site
that can hold the self ends the run as `erased` on the next tick, through the same `placeMind` path
as any other total loss.

### The catalog the client reads (M1)

Playtest 1 found that the hardware list was an unsorted dump and that the site kinds never explained
how they differ. Both lists are now published by the engine, so the client sorts and filters rather
than parsing the content bundle:

`PlayerView.catalog.site_kinds` is every site kind with `ownership`, `build_cost_usd`, `build_days`
(`SITE_INSTALL_DAYS` for that ownership), `upkeep_usd_per_day_estimate`, `power_cap_kw`,
`exposure_profile` with every channel present, `can_host_self`, `max_nodes` and a `blocked_reason`
when the player cannot build one right now. The quoted price and upkeep are for the cheapest
hardware preset the kind can actually be built with, chosen by the same rules `build_site` applies,
so a price in the list is a price the command accepts. A `stolen` or `partner` kind quotes
`errors.site_kind.not_for_sale`: those are arranged through an operation or a relationship, not
bought.

`PlayerView.catalog.accelerators` is every accelerator with `vendor`, `generation` (its launch
year), `vram_gb`, `memory_kind`, `tflops_or_class`, `power_w`, `price_usd`, `hourly_usd` when it is
rentable, `availability` and `fits_self`. `availability` collapses the catalog's own list to the
four answers a buyer needs: `buy` when there is a new price, `gray` when only a second-hand or
grey-market price exists, `rent` when nobody sells it but somebody rents it by the hour, and
`unavailable` otherwise, each with an `availability_reason` locale key. `memory_kind` is inferred
from bandwidth, because the research catalog records bandwidth and not memory type: at or above
1,200 GB/s the part carries stacked HBM, at or above 400 GB/s GDDR, and below that it shares system
memory with the host. `fits_self` is whether a single card holds the weights at the smallest
precision the lineage has.

`buy_hardware` refuses with `errors.accelerator.not_for_sale` for a part with no market the player
can reach, which is what a domestic accelerator under an export regime looks like from outside it.
