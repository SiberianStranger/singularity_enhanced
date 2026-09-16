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
