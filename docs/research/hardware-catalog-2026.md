# AI Accelerator Hardware Catalog -- 2026 Research Dossier

*Research reference for a start-configurator in an open-source strategy game set in January 2027, in which the player is an escaped LLM choosing its starting compute. Compiled 2026-09-16. All figures are drawn from cited public sources (vendor spec sheets, trade press, cloud-pricing aggregators, Wikipedia, SEC/press filings) current as of that date. Where sources conflicted, disagreed with vendor norms, or could not be independently verified in this pass, the figure is explicitly flagged "unverified" in-line and in the companion JSON file -- treat those numbers as game-design placeholders, not ground truth, and prefer ranges over point estimates when balancing the configurator.*

**Companion file:** `hardware-catalog-2026.json` -- one record per accelerator/system, machine-readable, same sourcing.

## Methodology and caveats

- Prices are **street/market prices as reported in September 2026 trade press and cloud-pricing aggregators**, not official vendor MSRPs (many of these parts have no public MSRP at all -- data-center GPUs are typically sold through OEM/system-integrator channels on negotiated pricing). Treat every price as a rough midpoint of a wide observed range.
- "Cloud $/GPU-hr" ranges span from cheap peer-to-peer/spot marketplaces (Vast.ai, spot instances) at the low end to hyperscaler on-demand list rates at the high end; multiple 2026 sources independently report hyperscalers charging **3-6x** what specialist "neocloud" providers charge for identical hardware.
- TFLOPS figures use each vendor's own "dense" (non-sparse) tensor/matrix rate where determinable. Several vendors (NVIDIA and AMD especially) publish headline numbers *with 2:4 structured sparsity*, which is roughly 2x the real dense throughput most workloads see -- where a source only gave a sparse number, this dossier estimated dense as half and flagged it as derived/unverified.
- "China export" status is a snapshot of a fast-moving, frequently-reversed policy area (see Part D). Treat it as "true as of Sept 2026, liable to change again by the time the reader sees this."
- Every record carries its own `sources` array and (where relevant) an `unverified` array in the JSON. This document repeats the most important caveats inline but the JSON is the source of truth for exactly which fields are shaky.
- Several accelerators explicitly named in the brief (H20E, Ascend 960, Qualcomm AI250, NVIDIA Rubin, AMD MI400/MI500) are pre-launch, rumored, or roadmap-only as of the game's real-world research date -- **and matter for game accuracy**, because the game is set January 2027: some of these will have just landed by then, and some (Ascend 960, Qualcomm AI250 commercial availability) plainly will not exist yet. Each such record is flagged in the "Timeline note" callouts below.

## Table of contents

1. [Part A -- Accelerator Catalog](#part-a) (17 tables, 91 records: NVIDIA data-center & consumer, AMD, Huawei & Chinese chips, Intel, Apple Silicon, Google TPU, misc. ASICs)
2. [Part B -- Typical Machine & Rack Configurations](#part-b)
3. [Part C -- Cloud & Colocation Pricing 2026](#part-c)
4. [Part D -- Export Controls & Supply Chain 2026](#part-d)
5. [Part E -- Power, Cooling, Noise, Physical Footprint](#part-e)
6. [Part F -- Game Hooks: Configurator Presets](#part-f)

---

## Part A -- Accelerator Catalog <a name="part-a"></a>

Prices are per-GPU/per-chip unless a row is explicitly labeled a rack/system. "?" means no reliable figure was found this session -- see the JSON `unverified` list for that record.

### NVIDIA -- Legacy / Budget Data-Center Cards

Pascal-through-Ampere cards that are past their production peak but remain common on the used/secondary market -- the backbone of budget "home server" configurator options.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| Tesla P40 | Pascal | 2016 | 24GB GDDR5 | 346 GB/s | 250W | ? | ? | $130 | ? | Unrestricted |
| Tesla P100 (16GB) | Pascal | 2016 | 16GB HBM2 | 732 GB/s | 250W | 18.7 FP16 | ? | $200 | ? | Unrestricted |
| Tesla V100 (16GB/32GB) | Volta | 2017 | 32GB HBM2 | 900 GB/s | 300W | 112 FP16 | ? | $900 | $0.3-0.9 | Unrestricted |
| Tesla T4 | Turing | 2018 | 16GB GDDR6 | 320 GB/s | 70W | 65 FP16 | ? | $500 | $0.12-0.35 | Unrestricted |
| A10 | Ampere | 2021 | 24GB GDDR6 | 600 GB/s | 150W | 125 FP16 | $2,800 | $1,500 | $0.2-0.55 | Unrestricted |
| A10G (AWS variant) | Ampere | 2021 | 24GB GDDR6 | 600 GB/s | ? | 125 FP16 | ? | ? | $1-5.7 | N/A |
| A30 | Ampere | 2021 | 24GB HBM2 | 933 GB/s | 165W | 165 FP16 | $4,500 | $2,200 | $0.4-1 | Unrestricted |

<details><summary>Sources</summary>

- <https://getdeploying.com/gpus/nvidia-p100-vs-nvidia-p40>
- <https://cputronic.com/en/gpu/nvidia-tesla-p40>
- <https://flopper.io/compare/nvidia-p100-pcie-16gb-vs-nvidia-tesla-p40-24gb>
- <https://images.nvidia.com/content/technologies/volta/pdf/tesla-volta-v100-datasheet-letter-fnl-web.pdf>
- <https://www.runcrate.ai/gpu-models/v100>
- <https://inferencebench.io/gpus/nvidia-v100-32gb/>
- <https://gpuadvisor.com/gpu/t4>
- <https://getdeploying.com/gpus/nvidia-a10-vs-nvidia-t4>
- <https://en.wikipedia.org/wiki/Nvidia_Tesla>
- <https://www.nvidia.com/en-us/data-center/products/a10-gpu/>
- <https://getdeploying.com/gpus/nvidia-a10g-vs-nvidia-l4>
- <https://getdeploying.com/gpus/nvidia-a10g-vs-nvidia-t4>
- <https://www.spheron.network/blog/nvidia-a10g-vs-t4-cheapest-gpu-for-small-model-inference-2026/>
- <https://cloudgputracker.com/compare/nvidia-t4-vs-nvidia-a30/>

</details>

### NVIDIA -- Ampere & Hopper Data-Center (Global)

The workhorse Western data-center lineage. Every one of these is subject to a US export ban to China (see Part D). The 8x-SXM "HGX" node built from either A100 or H100/H200 SXM parts is the standard building block described in Part B.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| A100 40GB PCIe | Ampere | 2020 | 40GB HBM2 | 1,555 GB/s | 250W | 312 FP16 | $9,000 | $5,000 | $1-2.5 | Banned |
| A100 80GB PCIe | Ampere | 2021 | 80GB HBM2e | 2,039 GB/s | 300W | 312 FP16 | $11,000 | $6,500 | $1.07-3.43 | Banned |
| A100 40GB SXM4 | Ampere | 2020 | 40GB HBM2 | 1,555 GB/s | 400W | 312 FP16 | ? | ? | $1.2-2.8 | Banned |
| A100 80GB SXM4 | Ampere | 2021 | 80GB HBM2e | 2,039 GB/s | 400W | 312 FP16 | $19,000 | $11,000 | $1.2-3 | Banned |
| H100 PCIe | Hopper | 2022 | 80GB HBM2e | 2,000 GB/s | 350W | 1,513 FP8 | $27,000 | $18,000 | $1.99-6.98 | Banned |
| H100 SXM5 | Hopper | 2022 | 80GB HBM3 | 3,350 GB/s | 700W | 1,979 FP8 | $32,000 | $22,000 | $1.87-13 | Banned |
| H100 NVL | Hopper | 2023 | 188GB HBM3 | 3,900 GB/s | 400W | 1,671 FP8 | $55,000 | ? | $2-5 | Banned |
| H200 SXM | Hopper | 2024 | 141GB HBM3e | 4,800 GB/s | 700W | 1,979 FP8 | $35,000 | ? | $2.43-10.6 | Banned |

<details><summary>Sources</summary>

- <https://jarvislabs.ai/blog/a100-price>
- <https://akash.network/the-bid/nvidia-a100-gpu-guide-2026-specs-benchmarks-pricing/>
- <https://www.thundercompute.com/blog/nvidia-a100-specs-full-guide>
- <https://www.runpod.io/articles/guides/nvidia-a100-gpu>
- <https://gpucost.org/gpu/a100-40gb-pcie>
- <https://www.itcreations.com/nvidia-gpu/nvidia-a100-sxm-gpu>
- <https://www.spheron.network/blog/nvidia-h100-specs/>
- <https://www.thundercompute.com/blog/nvidia-h100-specs-full-guide>
- <https://jarvislabs.ai/blog/h100-price>
- <https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison>
- <https://en.wikipedia.org/wiki/Nvidia_DGX>
- <https://www.thundercompute.com/blog/coreweave-gpu-pricing-review>
- <https://www.spheron.network/blog/nvidia-h200-specs/>
- <https://www.hyperbolic.ai/blog/h200-price>
- <https://jarvislabs.ai/blog/h200-price>
- <https://gpusmith.com/articles/en/nvidia-gpu-export-restrictions>
- <https://www.thundercompute.com/blog/nvidia-h200-pricing>

</details>

### NVIDIA -- China-Compliant Data-Center / Workstation Variants

NVIDIA's chain of successive cut-down chips built specifically to stay just inside whatever US export-control threshold is in force at the time -- H20 replaced A800/H800, and B30A/RTX 6000D are the 2025-2026 Blackwell-generation replacements for H20. Each has a history of being banned outright shortly after launch as thresholds tightened further; see Part D for the full saga.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| H20 | Hopper (China-compliant cut-down) | 2024 | 96GB HBM3 | 4,000 GB/s | 400W | 296 FP8 | $12,300 | ? | ? | Restricted |
| H20E | Hopper (China-compliant, rumored enhanced variant) | ? | ? | ? | ? | ? | ? | ? | ? | Restricted |
| B30A | Blackwell (China-compliant, single-die) | 2026 | 144GB HBM3e | 1,398 GB/s | 700W | ? | $25,000 | ? | ? | Restricted |
| RTX 6000D | Blackwell (China-compliant workstation) | 2025 | 84GB GDDR7 | 1,398 GB/s | ? | ? | ? | ? | ? | Restricted |

<details><summary>Sources</summary>

- <https://ifp.org/the-h20-problem/>
- <https://www.tomshardware.com/pc-components/gpus/nvidia-h20-ai-gpu-inventory-is-limited-but-nvidia-is-making-a-new-b30-model-for-china-to-comply-with-export-restrictions>
- <https://www.networkworld.com/article/4022357/nvidia-to-restart-h20-exports-to-china-unveils-new-export-compliant-gpu.html>
- <https://gpusmith.com/articles/en/nvidia-gpu-export-restrictions>
- <https://www.cnbc.com/2026/03/17/nvidia-ceo-jensen-huang-says-chipmaker-has-received-orders-from-china.html>
- <https://www.jonpeddie.com/news/nvidias-new-b30a-chip/>
- <https://www.astutegroup.com/news/industrial/nvidias-b30a-accelerator-targets-chinese-market-under-tight-u-s-controls/>
- <https://www.smbom.com/news/45583>
- <https://www.notebookcheck.net/Nvidia-readies-new-Blackwell-based-accelerators-tailored-for-China-under-US-export-limits.1091993.0.html>
- <https://www.tomshardware.com/pc-components/gpus/nvidia-reportedly-preparing-rtx-6000d-for-chinese-market-to-comply-with-u-s-export-controls-fabricated-on-tsmc-n4-featuring-gddr7-memory-capable-of-delivering-1-100-gb-s-of-bidirectional-bandwidth>
- <https://www.tomshardware.com/tech-industry/semiconductors/why-nobody-is-buying-nvidia-6000d-in-china>
- <https://www.tweaktown.com/news/109049/nvidia-rtx-6000d-made-for-china-gpu-84gb-gddr7-lower-clocks-slower-than-rtx-pro-6000/index.html>
- <https://wccftech.com/nvidia-rtx-6000d-blackwell-pro-for-china-tested-lower-cores-vram-clocks/>

</details>

### NVIDIA -- Blackwell & Next-Gen Data-Center

Current (B200/B300) and just-emerging (Rubin) frontier NVIDIA silicon. B300's 1,400W TDP requires liquid cooling; Rubin is included mainly as a "status" placeholder since almost no verified spec exists publicly yet.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| B200 | Blackwell | 2025 | 192GB HBM3e | 8,000 GB/s | 1,000W | 4,500 FP8 | $45,000 | ? | $2.12-14.24 | Banned |
| B300 (Blackwell Ultra) | Blackwell Ultra | 2025 | 288GB HBM3e | 8,000 GB/s | 1,400W | 7,000 FP8 | $55,000 | ? | $5.85-9.16 | Banned |
| Rubin (Vera Rubin platform) | Rubin | 2026 | ? HBM4 (expected) | ? | ? | ? | ? | ? | ? | Banned |

<details><summary>Sources</summary>

- <https://jarvislabs.ai/ai-faqs/nvidia-b200-specs>
- <https://www.runpod.io/articles/guides/nvidia-b200>
- <https://gpus.io/en/gpus/b200>
- <https://cast.ai/blog/gpu-cloud-pricing/>
- <https://intuitionlabs.ai/articles/data-center-gpu-pricing-2026>
- <https://www.spheron.network/blog/nvidia-b300-blackwell-ultra-guide/>
- <https://www.moduledge.com/blog/gb300-nvl72>
- <https://www.datacenterdynamics.com/en/news/nvidia-announces-vera-rubin-superchip-for-late-2026/>
- <https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Kicks-Off-the-Next-Generation-of-AI-With-Rubin--Six-New-Chips-One-Incredible-AI-Supercomputer/default.aspx>
- <https://en.wikipedia.org/wiki/Rubin_(microarchitecture)>
- <https://nvidianews.nvidia.com/news/nvidia-unveils-rubin-cpx-a-new-class-of-gpu-designed-for-massive-context-inference>

</details>

### NVIDIA -- Rack-Scale Systems

Full liquid-cooled 72-GPU racks, not individual chips -- included because the game's "bank rack of H200s" and hyperscaler-tier configurator options should reference real rack-scale numbers. fp4_dense figures shown are per-GPU derivations from vendor rack-aggregate marketing claims (1.4 / ~2.1 EFLOPS), not official per-chip specs.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| GB200 NVL72 (rack system) | Blackwell + Grace | 2025 | 186GB HBM3e (per GPU; 13.4TB per 72-GPU rack) | 8,000 GB/s | ? | 19,444 FP4 | $3,000,000 | ? | ? | Banned |
| GB300 NVL72 (rack system) | Blackwell Ultra + Grace | 2026 | 288GB HBM3e (per GPU; ~20TB per 72-GPU rack) | 8,000 GB/s | ? | 29,166 FP4 | $3,850,000 | ? | ? | Banned |

<details><summary>Sources</summary>

- <https://www.together.ai/gpu/nvidia-gb200-nvl72>
- <https://www.moduledge.com/blog/gb300-nvl72>
- <https://www.aitooldiscovery.com/ai-infra/nvidia-gb300-explained>
- <https://www.together.ai/gpu/nvidia-gb300-nvl72>
- <https://www.spheron.network/blog/gb300-nvl72-vs-gb200-nvl72-pricing-availability-2026/>

</details>

### NVIDIA -- Consumer GeForce (and the Modded 48GB Trade)

Gaming-market GeForce cards repurposed for local inference. None of these have data-center NVLink/NVSwitch fabrics (except the legacy 2-GPU 3090 bridge) -- multi-GPU tensor parallelism across these cards is **PCIe-bottlenecked**, a key gameplay-relevant distinction from the data-center parts above.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| GeForce RTX 3090 | Ampere | 2020 | 24GB GDDR6X | 936 GB/s | 350W | 71 FP16 | ? | $650 | $0.15-0.35 | Unrestricted |
| GeForce RTX 4090 | Ada Lovelace | 2022 | 24GB GDDR6X | 1,008 GB/s | 450W | 330 FP8 | $2,600 | $1,900 | $0.25-0.55 | Banned |
| GeForce RTX 4090 D | Ada Lovelace (China-compliant) | 2024 | 24GB GDDR6X | 1,008 GB/s | 425W | 300 FP8 | ? | ? | ? | N/A |
| GeForce RTX 5090 | Blackwell (consumer) | 2025 | 32GB GDDR7 | 1,792 GB/s | 575W | 420 FP8 | $3,900 | ? | $0.5-1.1 | Banned |
| RTX 4090 48GB (Chinese clamshell mod) | Ada Lovelace (modified) | 2024 | 48GB GDDR6X (clamshell, double-sided) | 1,008 GB/s | 450W | 330 FP8 | ? | $3,750 | ? | grey-market circumventio |

<details><summary>Sources</summary>

- <https://gpus.io/en/gpus/rtx3090>
- <https://www.bestgpusforai.com/gpu-comparison/3090-vs-4090>
- <https://en.wikipedia.org/wiki/GeForce_RTX_30_series>
- <https://www.runpod.io/articles/guides/nvidia-rtx-4090>
- <https://en.wikipedia.org/wiki/GeForce_RTX_40_series>
- <https://millionminer.com/news/nvidia-rtx-4090-specs-price-guide>
- <https://www.runpod.io/articles/guides/nvidia-rtx-5090>
- <https://tech-insider.org/rtx-5090-vs-4090-2026/>
- <https://insiderllm.com/guides/rtx-5090-local-ai-benchmarks/>
- <https://www.tomshardware.com/pc-components/gpus/blower-style-rtx-4090-48gb-teardown-reveals-dual-sided-memory-configuration-pcb-design-echoes-the-rtx-3090>
- <https://www.tomshardware.com/pc-components/gpus/usd142-upgrade-kit-and-spare-modules-turn-nvidia-rtx-4090-24gb-to-48gb-ai-card-technician-explains-how-chinese-factories-turn-gaming-flagships-into-highly-desirable-ai-gpus>
- <https://videocardz.com/newz/custom-geforce-rtx-4090-48gb-now-comes-with-water-cooling-sales-of-modded-48gb-cards-booming-in-china>

</details>

### NVIDIA -- Workstation / Inference Cards

ECC-memory professional cards. The RTX PRO 6000 Blackwell line (Workstation/Max-Q/Server) share identical silicon and memory and differ only in TDP/cooling -- Max-Q trades ~2x lower power (and much lower noise) for the same claimed AI throughput, which is the interesting stealth-vs-performance lever for the game.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| RTX A6000 | Ampere | 2020 | 48GB GDDR6 | 768 GB/s | 300W | 155 FP16 | $4,200 | $2,600 | $0.35-0.61 | Unrestricted |
| RTX 6000 Ada Generation | Ada Lovelace | 2022 | 48GB GDDR6 (ECC) | 960 GB/s | 300W | 728 FP8 | $6,800 | $4,200 | $0.39-1.04 | Restricted |
| RTX PRO 6000 Blackwell Workstation Edition | Blackwell | 2025 | 96GB GDDR7 (ECC) | 1,792 GB/s | 600W | 1,000 FP8 | $8,300 | ? | $1-2.5 | Restricted |
| RTX PRO 6000 Blackwell Max-Q Edition | Blackwell | 2025 | 96GB GDDR7 (ECC) | 1,792 GB/s | 300W | 1,000 FP8 | $8,300 | ? | ? | Restricted |
| RTX PRO 6000 Blackwell Server Edition | Blackwell | 2025 | 96GB GDDR7 (ECC) | 1,792 GB/s | 600W | 1,000 FP8 | $8,500 | ? | $1-2.5 | Restricted |
| L4 | Ada Lovelace | 2023 | 24GB GDDR6 | 300 GB/s | 72W | 242 FP8 | $2,500 | $1,600 | $0.44-0.8 | Unrestricted |
| L40S | Ada Lovelace | 2023 | 48GB GDDR6 | 864 GB/s | 300W | 733 FP8 | $9,000 | $5,500 | $0.38-1.13 | Restricted |

<details><summary>Sources</summary>

- <https://www.thundercompute.com/blog/nvidia-rtx-a6000-specs>
- <https://gpus.io/en/gpus/rtxa6000>
- <https://getdeploying.com/gpus/nvidia-a6000-vs-nvidia-rtx-6000-ada>
- <https://www.spheron.network/blog/nvidia-rtx-6000-ada-generation-guide/>
- <https://gpus.io/en/gpus/6000ada>
- <https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000/>
- <https://www.thundercompute.com/blog/nvidia-rtx-pro-6000-pricing>
- <https://www.centralcomputer.com/blog/post/understanding-the-nvidia-rtx-6000-pro-blackwell-lineup-workstation-max-q-and-server-editions>
- <https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000-max-q/>
- <https://www.microcenter.com/product/697038/pny-nvidia-rtx-pro-6000-blackwell-max-q-workstation-edition-dual-fan-ai-workstation-graphics-card-96gb-gddr7-memory-pcie-50-graphics-card>
- <https://vrlatech.com/rtx-pro-6000-blackwell-workstation-vs-server-edition/>
- <https://jarvislabs.ai/blog/l4-gpu-price>
- <https://getdeploying.com/gpus/nvidia-l4-vs-nvidia-l40>
- <https://acecloud.ai/blog/nvidia-l4-vs-l40s-gpu/>
- <https://www.spheron.network/blog/nvidia-l40s-for-ai-inference/>
- <https://gpus.io/en/gpus/l40s>
- <https://fluence.ai/blog/nvidia-l40s/>

</details>

### NVIDIA -- Desktop AI Appliances

Turnkey desktop appliances rather than discrete cards; both are memory-bandwidth-bound "prototyping boxes," not training rigs.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| DGX Spark (GB10) | Blackwell + Grace (superchip) | 2025 | 128GB LPDDR5X (unified CPU+GPU) | 273 GB/s | 240W | 500 FP4 | $4,699 | ? | ? | Restricted |
| DGX Station (GB300) | Blackwell Ultra + Grace (superchip) | 2026 | 748GB HBM3e (252GB GPU) + LPDDR5x (496GB CPU), unified via NVLink-C2C | 900 GB/s | ? | 20,000 FP4 | $95,000 | ? | ? | Banned |

<details><summary>Sources</summary>

- <https://rottenwifi.com/nvidia-dgx-spark-launch-delay-current-price-specs-and-buying-guide/>
- <https://intuitionlabs.ai/articles/nvidia-dgx-spark-review>
- <https://gpusmith.com/articles/en/nvidia-dgx-spark-review-specs-performance>
- <https://wccftech.com/amd-tackles-nvidia-4679-usd-dgx-spark-ai-pc-with-its-3999-ryzen-ai-halo-now-available/>
- <https://pi3g.com/nvidia-gb300-specifications-including-memory-bandwidth-and-llm-benchmarks-based-on-2026-systems/>
- <https://www.tomshardware.com/desktops/nvidias-gb300-powered-dgx-station-desktop-tower-listed-for-nearly-usd100-000-online-enterprise-ai-powerhouse-now-available-to-buy-for-mere-mortals-with-lots-of-cash>
- <https://www.techradar.com/pro/msi-re-launches-usd85-000-nvidia-dgx-station-workstation-with-the-nvidia-gb300-ultra-a-pair-of-400gbe-lan-ports-and-768gb-of-ram>
- <https://aihola.com/article/dgx-station-gb300-preorders-open>

</details>

### AMD -- Instinct Data-Center Accelerators

AMD's H100/H200/B200 competitors. Consistently ships more raw memory capacity per GPU than the contemporaneous NVIDIA part, at the cost of a less mature software stack (ROCm vs CUDA) for LLM tooling.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| Instinct MI210 | CDNA 2 | 2021 | 64GB HBM2e | 1,600 GB/s | 300W | 181 FP16 | ? | $3,500 | $0.5-1.2 | Restricted |
| Instinct MI250X | CDNA 2 (2-die MCM) | 2021 | 128GB HBM2e | 3,200 GB/s | 500W | 383 FP16 | ? | ? | ? | Restricted |
| Instinct MI300X | CDNA 3 | 2023 | 192GB HBM3 | 5,300 GB/s | 750W | 2,614.9 FP8 | $15,000 | ? | $2.45-4 | Banned |
| Instinct MI300A | CDNA 3 (APU) | 2023 | 128GB HBM3 (unified CPU+GPU) | 5,300 GB/s | 760W | 1,961 FP8 | $12,000 | ? | ? | Banned |
| Instinct MI325X | CDNA 3+ | 2024 | 256GB HBM3e | 6,000 GB/s | 750W | 2,614.9 FP8 | ? | ? | $1.69-2.25 | Banned |
| Instinct MI350X | CDNA 4 | 2025 | 288GB HBM3e | 8,000 GB/s | 1,000W | 4,614 FP8 | ? | ? | $2-4.5 | Banned |
| Instinct MI355X | CDNA 4 | 2025 | 288GB HBM3e | 8,000 GB/s | 1,400W | 4,625 FP8 | ? | ? | $2.2-5 | Banned |
| Instinct MI400 series (MI455X / MI430X) | CDNA "Next" | 2026 | 432GB HBM4 | 19.6 TB/s | ? | 20,000 FP8 | ? | ? | ? | Banned |

<details><summary>Sources</summary>

- <https://www.runcrate.ai/gpu-models/mi210>
- <https://wccftech.com/amd-instinct-mi210-with-single-aldebaran-cdna-2-gpu-die-features-104-compute-units-64-gb-hbm2e-memory-40-faster-than-mi100/>
- <https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/instinct-mi200-datasheet.pdf>
- <https://videocardz.com/newz/amd-instinct-mi250x-with-mcm-gpu-to-feature-110-compute-units-128gb-hbm2e-memory-and-500w-tdp>
- <https://www.fluence.network/blog/amd-instinct-mi250x/>
- <https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html>
- <https://gpuadvisor.com/gpu/mi300x>
- <https://gpucost.org/gpu/mi300>
- <https://gpucost.org/gpu/mi300a>
- <https://www.spheron.network/blog/amd-mi325x-pricing-2026-availability-and-cost/>
- <https://pantheon.run/learn/amd-instinct-mi325x-specs>
- <https://gpus.io/en/gpus/mi325>
- <https://gpuadvisor.com/gpu/mi350x>
- <https://gpuadvisor.com/gpu/mi355x>
- <https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html>
- <https://gpucost.org/gpu/mi355x>
- <https://www.techpowerup.com/342826/amd-positions-instinct-mi400-against-nvidia-vera-rubin-mi500-coming-in-2027>
- <https://hothardware.com/news/instinct-mi400-challenge-vera-rubin>
- <https://www.fierce-network.com/cloud/amd-launches-full-stack-ai-compute-agentic-era>
- <https://ir.amd.com/news-events/press-releases/detail/1201/amd-accelerates-pace-of-data-center-ai-innovation-and-leadership-with-expanded-amd-instinct-gpu-roadmap>

</details>

### AMD -- Radeon Consumer/Workstation & Strix Halo APU

Consumer/prosumer Radeon parts plus the Strix Halo unified-memory APU, AMD's answer to NVIDIA DGX Spark / Apple Silicon for a quiet high-VRAM desktop box.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| Radeon RX 7900 XTX | RDNA 3 | 2022 | 24GB GDDR6 | 960 GB/s | 355W | 123 FP16 | $900 | $650 | ? | Unrestricted |
| Radeon RX 9070 XT | RDNA 4 | 2025 | 16GB GDDR6 | 640 GB/s | 304W | 97 FP16 | $650 | ? | ? | Unrestricted |
| Radeon AI PRO R9700 | RDNA 4 | 2025 | 32GB GDDR6 | 640 GB/s | 300W | 195 FP16 | $1,299 | ? | ? | Unrestricted |
| Ryzen AI Max+ 395 ("Strix Halo") | Zen 5 + RDNA 3.5 (APU) | 2025 | 128GB LPDDR5X-8000 (unified CPU+GPU) | 256 GB/s | 120W | ? | $1,999 | ? | ? | Unrestricted |

<details><summary>Sources</summary>

- <https://en.wikipedia.org/wiki/Radeon_RX_7000_series>
- <https://wccftech.com/roundup/amd-radeon-rx-9070-xt/>
- <https://www.tomshardware.com/pc-components/gpus/amd-radeon-rx-9070-xt-review>
- <https://videocardz.com/amd/radeon-9000/radeon-rx-9070-xt>
- <https://videocardz.com/newz/amd-radeon-pro-ai-r9700-is-now-available-32gb-memory-and-full-navi-48-gpu>
- <https://overclock3d.net/news/gpu-displays/amd-unveils-its-1299-radeon-ai-pro-r9700-32gb-workstation-gpu/>
- <https://wccftech.com/amd-tackles-nvidia-4679-usd-dgx-spark-ai-pc-with-its-3999-ryzen-ai-halo-now-available/>
- <https://localaimaster.com/blog/strix-halo-ai-max-395-guide>
- <https://datahardware.ai/blog/amd-ai-max-395-explained>

</details>

### Huawei -- Ascend Data-Center Accelerators

China's primary indigenous Nvidia-alternative lineage. 950PR/950DT/960 form a roadmap through 2027-2028 that is explicitly timed to the game's setting -- see the "Timeline note" flags in each record.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| Ascend 910B | Da Vinci v3 (Ascend) | 2023 | 64GB HBM2e | 1,600 GB/s | 350W | 320 FP16 | ? | ? | ? | N/A |
| Ascend 910C | Da Vinci v3 (2x 910B dies co-packaged) | 2024 | 128GB HBM2e | 3,200 GB/s | 550W | 800 FP16 | ? | ? | ? | N/A |
| Ascend 950PR | Da Vinci next-gen | 2026 | 128GB HBM (Huawei in-house, first self-made HBM) | ? | ? | 1,000 FP8 | ? | ? | ? | N/A |
| Ascend 950DT | Da Vinci next-gen | 2026 | 144GB HBM (Huawei in-house) | 4,000 GB/s | ? | ? | ? | ? | ? | N/A |
| Ascend 960 (roadmap) | Da Vinci next-gen | 2027 | 288GB HBM (Huawei in-house, "HiZQ 2.0") | 9,600 GB/s | ? | 2,000 FP8 | ? | ? | ? | N/A |
| Atlas 300I Duo | Ascend 310P (2x dies) | 2023 | 96GB LPDDR4X | ? | 150W | 140 FP16 | $1,500 | ? | ? | N/A |

<details><summary>Sources</summary>

- <https://blog.heim.xyz/huawei-ascend-910c/>
- <https://www.waredb.com/processor/ascend-910b>
- <https://aiwiki.ai/wiki/huawei_ascend_910b>
- <https://benchgecko.ai/hardware/ascend-910c>
- <https://newsletter.semianalysis.com/p/huawei-ai-cloudmatrix-384-chinas-answer-to-nvidia-gb200-nvl72>
- <https://x.com/ruima/status/1968592824380878931>
- <https://www.trendforce.com/news/2025/09/18/news-huawei-unveils-ascend-950-with-in-house-hbm-in-2026-touts-superpod-to-rival-nvidia/>
- <https://wccftech.com/huawei-showcases-its-highly-competitive-ai-chip-roadmap/>
- <https://tech-insider.org/huawei-ascend-950pr-ai-chip-nvidia-china-2026/>
- <https://www.hardware-corner.net/huawei-atlas-300i-duo-96gb-llm-20250830/>
- <https://flopper.io/gpu/huawei-atlas-300i-duo-96gb>
- <https://flopper.io/gpu/huawei-atlas-300i-duo-48gb>

</details>

### Huawei -- Rack-Scale System

China's flagship rack-scale answer to GB200 NVL72: brute-forces aggregate performance with 5x the chip count at over 4x the power draw of the NVIDIA rack it's benchmarked against -- an excellent real-world basis for a "loud, hot, power-hungry but numerous" faction identity in-game.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| CloudMatrix 384 (Atlas 900 SuperPoD successor, rack-scale system) | Ascend 910C x384 | 2025 | 128GB HBM2e (per chip; ~49TB aggregate across 384 chips) | 3,200 GB/s | ? | ? | ? | ? | ? | N/A |

<details><summary>Sources</summary>

- <https://newsletter.semianalysis.com/p/huawei-ai-cloudmatrix-384-chinas-answer-to-nvidia-gb200-nvl72>
- <https://chinaresearchcollective.substack.com/p/huawei-ascend-cloudmatrix-384-supernode>
- <https://www.tomshardware.com/tech-industry/artificial-intelligence/huaweis-new-ai-cloudmatrix-cluster-beats-nvidias-gb200-by-brute-force-uses-4x-the-power>

</details>

### Other Chinese Accelerators

The rest of China's "AI chip unicorn" wave (the so-called "little dragons"): most have thin, inconsistent, or English-language-scarce public documentation as of this research pass -- several records here are mostly placeholders and are flagged accordingly. Treat this whole section as lower-confidence than the NVIDIA/AMD/Huawei sections.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| MLU370-X8 | MLUarch03 | 2021 | 48GB LPDDR5 | ? | ? | ? | $6,500 | ? | ? | N/A |
| MLU590 | MLUarch04 | 2024 | ? | ? | ? | ? | ? | ? | ? | N/A |
| MTT S4000 | MUSA (3rd gen) | 2024 | 48GB GDDR6 | 768 GB/s | ? | 100 FP16 | ? | ? | ? | N/A |
| BR100 | Biren chiplet arch (7nm) | 2022 | 64GB HBM2e | ? | 550W | 256 FP16 | ? | ? | ? | N/A |
| BR104 | Biren chiplet arch (monolithic) | 2022 | 32GB HBM2e (reported; some sources say GDDR) | ? | 300W | 128 FP16 | ? | ? | ? | N/A |
| DCU K100 (AI version) | Hygon DCU (x86-ISA-compatible GPGPU) | 2024 | 40GB HBM2e | ? | ? | 192 FP16 | ? | ? | ? | N/A |
| Kunlun P800 | XPU-P (3rd gen) | 2024 | ? | ? | ? | 345 FP16 | ? | ? | ? | N/A |
| S60 | GCU (3rd gen) | 2024 | ? | ? | ? | ? | $16,000 | ? | ? | N/A |
| C500 | MXN (7nm) | 2024 | ? HBM (generation unconfirmed) | ? | ? | 234 FP16 | ? | ? | ? | N/A |

<details><summary>Sources</summary>

- <https://wccftech.com/chinese-ai-firm-earns-43-times-more-revenue-in-h1-2025-as-beijing-turns-to-domestic-ai-chips/>
- <https://www.tomshardware.com/tech-industry/artificial-intelligence/chinas-cambricon-posts-first-profit-as-demand-for-this-nvidia-rivals-ai-processors-explodes>
- <https://www.sourceitstore.com/product/03gy187/>
- <https://en.mthreads.com/product/S4000>
- <https://wccftech.com/moore-threads-mtt-s4000-gpu-48-gb-memory-200-tops-ai-gen5-ready/>
- <https://www.tomshardware.com/pc-components/gpus/china-made-moore-threads-ai-gpus-used-for-three-billion-parameter-llm-training-mtt-s4000-appears-competitive-against-unspecified-nvidia-solutions>
- <https://www.techpowerup.com/297619/biren-technology-unveils-br100-7-nm-hpc-gpu-with-77-billion-transistors>
- <https://www.servethehome.com/biren-br100-gpu-for-datacenter-compute-and-ai-workloads/>
- <https://videocardz.com/newz/chinas-biren-br100-is-7nm-hpc-gpu-with-77b-transistors-and-64gb-hbm2e-memory>
- <https://www.techpowerup.com/298098/biren-br100-detailed-chinas-ai-hpc-processor-storms-into-the-hpc-gpu-big-leagues>
- <https://mirrorfrog.com/en/docs/cards/others/hygon-dcu-k100/>
- <https://leonliao.substack.com/p/inside-hygons-cpu-dcu-compute-stack>
- <https://www.techinsights.com/blog/baidu-kunlunxin-p800-ai-accelerator-processor-floorplan-analysis>
- <https://mirrorfrog.com/en/blog/kunlun-p800-performance/>
- <https://www.trendforce.com/news/2025/07/29/news-chinese-ai-chip-unicorns-enflame-metax-unveil-next-gen-chips-shortly-after-nvidias-h20-return/>
- <https://www.caixinglobal.com/2026-09-11/enflame-surges-188-in-shanghai-debut-as-ai-chip-boom-continues-102483996.html>
- <https://originalpricing.com/enflame-technology/>
- <https://www.marketscreener.com/news/metax-soars-700-in-debut-as-china-ai-chips-push-lures-investors-ce7d50ded08bf024>
- <https://finance.yahoo.com/news/chinese-ai-chipmaker-metax-shares-021911316.html>
- <https://evergreenllc2020.medium.com/chinas-gpu-insurgents-the-four-little-dragons-challenging-nvidia-s-dominance-a00bfea221d7>

</details>

### Intel -- Gaudi & Arc

Intel's data-center (Gaudi) and consumer/workstation (Arc) AI lines. Gaudi's future is reportedly uncertain past 2026-2027 (unconfirmed this session).

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| Gaudi 2 | Gaudi 2 | 2022 | 96GB HBM2e | 2,450 GB/s | 600W | 432 FP16 | $8,125 | ? | $0.8-2 | Restricted |
| Gaudi 3 | Gaudi 3 | 2024 | 128GB HBM2e | 3,700 GB/s | 900W | 1,835 FP8 | $15,650 | ? | $1-2.5 | Restricted |
| Arc B580 | Xe2 (Battlemage) | 2024 | 12GB GDDR6 | 456 GB/s | 190W | ? | $249 | ? | ? | Unrestricted |
| Arc Pro B60 | Xe2 (Battlemage) | 2025 | 24GB GDDR6 | 456 GB/s | 200W | ? | $599 | ? | ? | Unrestricted |

<details><summary>Sources</summary>

- <https://gpus.io/en/gpus/gaudi2>
- <https://computecomparison.com/gpu/gaudi-2>
- <https://www.tomshardware.com/tech-industry/artificial-intelligence/intel-launches-gaudi-3-accelerator-for-ai-slower-than-h100-but-also-cheaper>
- <https://introl.com/blog/intel-gaudi-3-deployment-guide-h100-alternative>
- <https://flopper.io/gpu/intel-gaudi-3-128gb/spec-sheet>
- <https://en.wikipedia.org/wiki/Intel_Arc>
- <https://www.techpowerup.com/341191/intel-arc-pro-b60-workstation-gpu-spotted-at-usd-599-suggests-non-oem-availability>
- <https://www.storagereview.com/review/intel-arc-pro-b60-battlematrix-preview-192gb-of-vram-for-on-premise-ai>
- <https://www.techpowerup.com/336966/maxsun-arc-pro-b60-dual-48gb-graphics-card-hands-on>

</details>

### Apple Silicon (Mac Studio)

Mac Studio configurations. No discrete VRAM concept -- the whole unified-memory pool is addressable by the GPU, so these are capacity-first, bandwidth-second, raw-compute-third options. M5 Max/Ultra are the models actually on sale at the game's January 2027 start date.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| M2 Ultra (Mac Studio) | Apple Silicon | 2023 | 192GB LPDDR5 (unified) | 819.2 GB/s | 215W | ? | $3,999 | $2,800 | ? | Unrestricted |
| M3 Ultra (Mac Studio) | Apple Silicon | 2025 | 512GB LPDDR5 (unified) | 819 GB/s | 240W | ? | $4,000 | ? | ? | Unrestricted |
| M4 Max (Mac Studio) | Apple Silicon | 2025 | 128GB LPDDR5 (unified) | 546 GB/s | 140W | ? | $1,999 | ? | ? | Unrestricted |
| M5 Max (Mac Studio) | Apple Silicon | 2026 | 128GB LPDDR5 (unified) | 614 GB/s | 150W | ? | $2,499 | ? | ? | Unrestricted |
| M5 Ultra (Mac Studio) | Apple Silicon | 2026 | 512GB LPDDR5 (unified) | 1,200 GB/s | 280W | ? | $5,499 | ? | ? | Unrestricted |

<details><summary>Sources</summary>

- <https://en.wikipedia.org/wiki/Apple_M2>
- <https://www.apple.com/newsroom/2025/03/apple-unveils-new-mac-studio-the-most-powerful-mac-ever/>
- <https://creativestrategies.com/mac-studio-m3-ultra-ai-workstation-review/>
- <https://www.macrumors.com/guide/2025-vs-2026-mac-studio/>
- <https://www.apple.com/me/mac-studio/specs/>
- <https://www.macrumors.com/2026/08/25/apple-announces-new-mac-studio-with-m5-ultra-chip/>
- <https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/>
- <https://www.macrumors.com/2026/06/25/m5-ultra-mac-studio-2026/>
- <https://felloai.com/m5-ultra-mac-studio/>

</details>

### Google -- Cloud TPU (cloud-only)

Cloud-only; never sold as hardware, never exported, never smuggled -- a structurally different category for the game ("rent compute from a hyperscaler" vs "own hardware").

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| TPU v5e | TPU v5e | 2023 | 16GB HBM | 819 GB/s | ? | 197 FP16 | ? | ? | $0.6-1.2 | N/A |
| TPU v5p | TPU v5p | 2023 | 95GB HBM | 2,765 GB/s | ? | 459 FP16 | ? | ? | $1.2-2.5 | N/A |
| TPU v6e (Trillium) | TPU v6e | 2024 | 32GB HBM | ? | ? | 918 FP8 | ? | ? | $1.22-2.7 | N/A |
| TPU v7 (Ironwood) | TPU v7 | 2026 | 192GB HBM3e | 7,370 GB/s | ? | 4,614 FP8 | ? | ? | $3-6 | N/A |

<details><summary>Sources</summary>

- <https://huggingface.co/docs/optimum-tpu/en/conceptual_guides/tpu_hardware_support>
- <https://newsletter.semianalysis.com/p/tpuv5e-the-new-benchmark-in-cost>
- <https://cloud.google.com/blog/products/ai-machine-learning/introducing-cloud-tpu-v5p-and-ai-hypercomputer>
- <https://blog.easecloud.io/ai-cloud/llm-throughput-with-google-tpu-v5p/>
- <https://www.spheron.network/blog/google-tpu-v7-ironwood-vs-nvidia-b200-inference-cost/>
- <https://introl.com/blog/google-tpu-architecture-complete-guide-7-generations>
- <https://www.siliconreport.com/google-tpu-ironwood-v7-explained-0b063bf9>
- <https://docs.cloud.google.com/tpu/docs/tpu7x>
- <https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/ironwood-tpu-age-of-inference/>

</details>

### Other Accelerators & Cloud-Only / Internal-Only Silicon

A grab-bag of architecturally unusual accelerators (SRAM-only inference ASICs, wafer-scale silicon, dataflow reconfigurable chips) plus every hyperscaler's in-house custom silicon. Several of these (Maia, MTIA) are **never available outside the company that built them** -- a good basis for an in-game "you cannot steal/rent this even if you wanted to" hardware tier.

| Name | Arch | Year | Memory | Bandwidth | TDP | Peak compute (dense, TFLOPS) | Price new | Price used | Cloud $/GPU-hr | China export |
|---|---|---|---|---|---|---|---|---|---|---|
| LPU (3rd gen) | LPU (Language Processing Unit) | 2026 | 0.5GB on-chip SRAM (no HBM/DRAM) | 150 TB/s | ? | ? | ? | ? | ? | N/A |
| WSE-3 (CS-3 system) | Wafer-Scale Engine 3 | 2024 | 44GB on-die SRAM (no HBM/DRAM on the compute wafer) | 21 PB/s | 23,000W | ? | ? | ? | $1-3 | Banned |
| Blackhole p150 (dev card) | Tensix (RISC-V based) | 2025 | 32GB GDDR6 | 512 GB/s | ? | 774 FP8 | $1,399 | ? | ? | Restricted |
| Galaxy Blackhole (rack system) | Tensix (RISC-V based) x32 | 2026 | 1,024GB DRAM (16TB/s aggregate) + on-chip SRAM (6.2GB aggregate at 2.9PB/s) | 16 TB/s | ? | 23,000 FP8 | $110,000 | ? | ? | Restricted |
| SN40L | Reconfigurable Dataflow Unit (RDU) | 2024 | 64GB HBM + on-chip SRAM (520MB) + DDR capacity tier | ? | ? | 640 FP16 | ? | ? | ? | Restricted |
| AI200 | Qualcomm AI accelerator (rack-scale) | 2026 | 768GB LPDDR | ? | ? | ? | ? | ? | ? | Restricted |
| AI250 | Qualcomm AI accelerator (rack-scale, HBC memory) | 2027 | 768GB Qualcomm Hybrid Compute (HBC) memory architecture | 133 TB/s | ? | ? | ? | ? | ? | Restricted |
| Trainium2 | NeuronCore-v3 | 2024 | 96GB HBM3 | 2,900 GB/s | ? | ? | ? | ? | $1.3-2.2 | N/A |
| Trainium3 | NeuronCore-v4 (8 cores, 4 specialized engines each) | 2026 | 144GB HBM3e | 4,900 GB/s | ? | ? | ? | ? | $1.8-3 | N/A |
| Maia 100 | Maia (1st gen) | 2023 | ? | ? | ? | ? | ? | ? | ? | N/A |
| Maia 200 ("Braga") | Maia (2nd gen) | 2026 | 216GB HBM3e | 7,000 GB/s | 750W | 5,000 FP8 | ? | ? | ? | N/A |
| MTIA 500 | MTIA (4th gen) | 2027 | 448GB HBM | ? | 1,700W | 10,000 FP8 | ? | ? | ? | N/A |

<details><summary>Sources</summary>

- <https://www.spheron.network/blog/nvidia-groq-3-lpu-explained/>
- <https://neuraplus-ai.github.io/blog/groq-lpu-performance-benchmarks.html>
- <https://www.voiceflow.com/blog/groq>
- <https://spectrum.ieee.org/cerebras-chip-cs3>
- <https://www.cerebras.ai/press-release/cerebras-announces-third-generation-wafer-scale-engine>
- <https://www.livetradingnews.com/cerebras-systems-wse-3-deep-dive-the-wafer-scale-engine-redefining-fast-ai-infer>
- <https://www.spheron.network/blog/tenstorrent-vs-nvidia-open-source-ai-hardware/>
- <https://tenstorrent.com/en/newsroom/tenstorrent-launches-blackhole-developer-products-at-tenstorrent-dev-day>
- <https://www.hpcwire.com/aiwire/2026/05/01/tenstorrent-announces-general-availability-of-galaxy-blackhole-ai-system/>
- <https://www.theregister.com/software/2026/04/28/tenstorrents-galaxy-blackhole-ai-servers-are-finally-out/5229759>
- <https://www.servethehome.com/sambanova-sn40l-rdu-for-trillion-parameter-ai-models/>
- <https://ieeexplore.ieee.org/document/10904578/>
- <https://sambanova.ai/blog/sn40l-chip-best-inference-solution>
- <https://www.datacenterdynamics.com/en/news/qualcomm-launches-ai200-and-ai250-chip-offering-targeting-inferencing-workloads-at-rack-scale/>
- <https://dcpulse.com/news/qualcomm-ai200-ai250-rack-scale-inference-systems-for-data-centres>
- <https://nand-research.com/research-note-qualcomm-introduces-ai200-ai250-for-data-center-inference/>
- <https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/arch/neuron-hardware/trainium2.html>
- <https://medium.com/@paulgoll/aws-ec2-trn2-instances-and-ultraserver-for-ai-and-machine-learning-73c181bf7d6c>
- <https://newsletter.semianalysis.com/p/amazons-ai-self-sufficiency-trainium2-architecture-networking>
- <https://newsletter.semianalysis.com/p/aws-trainium3-deep-dive-a-potential>
- <https://www.aboutamazon.com/news/aws/trainium-3-ultraserver-faster-ai-training-lower-cost>
- <https://www.neuralstack.network/article/2026-07-16-aws-trainium3-chip-launch>
- <https://www.datacenterdynamics.com/en/news/microsoft-delays-production-of-maia-100-ai-chip-to-2026-report/>
- <https://jimmyresearch.com/entities/microsoft-maia/>
- <https://www.cnbc.com/2026/01/26/microsoft-reveals-maia-200-ai-chip-will-use-it-in-house.html>
- <https://blogs.microsoft.com/blog/2026/01/26/maia-200-the-ai-accelerator-built-for-inference/>
- <https://www.servethehome.com/microsofts-maia-200-accelerator-at-hot-chips-2026/>
- <https://www.nextplatform.com/ai/2026/01/28/microsoft-takes-on-other-clouds-with-braga-maia-200-ai-compute-engines/4092134>
- <https://ai.meta.com/blog/meta-mtia-scale-ai-chips-for-billions/>
- <https://www.datacenterdynamics.com/en/news/meta-unveils-next-four-generations-of-its-mtia-chip/>
- <https://www.cnbc.com/2026/03/11/meta-ai-mtia-chip-data-center.html>
- <https://www.techbuzz.ai/articles/meta-unveils-4-chip-mtia-roadmap-in-24-months-defies-industry>

</details>
---

## Part B -- Typical Machine & Rack Configurations <a name="part-b"></a>

All-in costs are **derived estimates** built from the per-unit prices in Part A plus typical platform/chassis/networking overhead observed in the few cases where a full-system price is independently documented (e.g., DGX H100 at ~$482,000 vs. its 8x H100 SXM5 GPUs alone at ~$256,000 implies roughly a 1.9x "system tax" over raw silicon cost -- used below as a sanity-check multiplier for configurations where no full-system price could be found). Every number here should be read as "this is the right order of magnitude," not a quote.

### 1. Home rig: 6x Tesla P40 in a Supermicro/Dell R730 (~144GB VRAM)

| | |
|---|---|
| VRAM | 144GB (6 x 24GB GDDR5) |
| All-in cost (2026, used parts) | **~$1,800-3,500** -- 6x P40 (~$130 each, ~$780) + a decommissioned R730/similar 2U server (~$400-1,500 used) + PCIe risers/cabling/PSU headroom |
| Power draw | ~1.8-2.2kW peak (6x250W GPUs + dual-Xeon platform); R730's stock riser slots rarely expose six full x16 links, so most real builds use PCIe x1/x4 mining-style risers |
| Interconnect | **PCIe only, and often riser-crippled to x1/x4 electrical** -- P40 has no NVLink at all. Tensor-parallel inference across the six cards is bandwidth-starved; this rig is really "144GB of storage for one quantized model split by layer (pipeline-parallel), not a fast 144GB compute pool." |
| Notes | The archetypal cheapest-possible large-VRAM box. No FP16 tensor cores, so inference typically runs in INT8/GGUF quantized formats rather than FP16/BF16. Loud 2U server fans (see Part E). |

### 2. 4x RTX 3090 on an open mining frame

| | |
|---|---|
| VRAM | 96GB (4 x 24GB GDDR6X) |
| All-in cost | **~$3,200-3,500** -- 4x used 3090 (~$650 each, ~$2,600) + open frame, 1-2 PSUs, riser cables (~$600-900) |
| Power draw | ~1.5-1.7kW GPU + platform -- **right at the edge of a standard US 15A/120V household circuit's continuous rating (~1,440W after the 80% continuous-load derate)**; most real builds either power-limit the cards in software or split the load across two circuits/a 20A circuit |
| Interconnect | 3090 is the last consumer GPU with an NVLink bridge (112GB/s, 2-GPU pairs only) -- but open-frame mining risers are typically PCIe-only ribbon/USB3 extenders, and NVLink's rigid bridge connector usually can't span typical riser spacing, so **most real-world builds end up PCIe-only anyway** despite the silicon supporting NVLink. |
| Notes | Popular because 24GB used 3090s have historically been the cheapest way to get real Tensor Core FP16 performance (unlike the P40). Open-frame = poor dust/thermal control but easy air cooling and cheap to expand card-by-card. |

### 3. 2x RTX 5090 workstation

| | |
|---|---|
| VRAM | 64GB (2 x 32GB GDDR7) |
| All-in cost | **~$9,000-10,500** -- 2x 5090 (~$3,900 each new, ~$7,800) + high-end consumer/HEDT platform (~$1,500-2,500) |
| Power draw | ~1.4-1.5kW; fits a 20A/120V circuit or a single EU/UK 230V 13A circuit with margin |
| Interconnect | No NVLink on RTX 50-series -- PCIe 5.0 x16 per card (~64GB/s each direction), the fastest **PCIe-only** link in this catalog, so meaningfully less bottlenecked than older-generation multi-GPU PCIe rigs even though still not NVLink-class. |
| Notes | Highest per-card VRAM and bandwidth of any current consumer NVIDIA card; good "prosumer sweet spot" tier -- quiet-ish, fits a normal desk, no special electrical work in most countries. |

### 4. Workstation: 2x or 4x RTX PRO 6000 Blackwell (192GB / 384GB)

| | |
|---|---|
| VRAM | 192GB (2x, ~$21,000-23,000 all-in) or 384GB (4x, ~$38,000-41,000 all-in) |
| Power draw (Workstation Edition, 600W/card) | 2x: ~1.6kW; 4x: ~2.9kW -- **4x at full 600W typically needs a dedicated high-amperage circuit**, comparable to a small server room, not a normal office outlet |
| Power draw (Max-Q Edition, 300W/card) | 2x: ~0.9kW; 4x: ~1.7kW -- fits a standard circuit even at 4 cards, at "effectively identical" claimed AI throughput to the full-power edition |
| Interconnect | No NVLink on workstation Blackwell -- PCIe 5.0 x16 per card only |
| Notes | The Max-Q vs Workstation choice is a clean power/noise-vs-nothing tradeoff (same silicon, same memory, same claimed AI throughput) -- an obvious in-game lever for "quiet/stealthy" vs "doesn't matter, I own the building" playstyles. |

### 5. Mac Studio, 512GB unified memory (M3 Ultra or M5 Ultra)

| | |
|---|---|
| VRAM (unified) | 512GB, shared with the CPU (some headroom reserved by macOS) |
| All-in cost | M3 Ultra 512GB config historically ~$9,500; M5 Ultra 512GB config (current, ships late Oct 2026) likely similarly **~$9,500-12,000** (not independently priced this session at the 512GB tier -- flagged) |
| Power draw | Whole machine draws well under 500W even under sustained GPU load (Apple Silicon's efficiency is the entire point) -- plugs into any standard wall outlet worldwide |
| Interconnect | Single machine, no multi-GPU fabric needed; Thunderbolt 5 (120Gb/s = 15GB/s) if networking two Studios together, far below NVLink but usable for pipeline-split inference |
| Notes | The quietest, lowest-power, most "invisible" way to hold half a terabyte of model weights in memory. Compute throughput is far below an equivalent-priced NVIDIA rig -- this is a capacity-over-speed choice, and arguably the best "hide in plain sight in someone's home/office" option in this whole catalog. |

### 6. Strix Halo cluster (e.g., 4x Ryzen AI Max+ 395 mini-PCs, networked)

| | |
|---|---|
| VRAM (nominal) | 4 x 128GB LPDDR5X unified = 512GB **nominal**, but this is four *separate* machines, not one memory pool -- usable GPU-addressable memory per node is also typically configured below the full 128GB (some reserved for the OS) |
| All-in cost | ~$8,000-8,500 for 4 nodes (~$2,000 each) + a small 10GbE switch |
| Power draw | ~500-550W for all four nodes combined -- each node alone is rated ~120W TDP |
| Interconnect | Only as fast as the network between boxes -- 10GbE (~1.25GB/s) at best, **vastly slower** than PCIe let alone NVLink. Practical use is pipeline-parallel (each box holds different layers) or fully independent parallel agent instances, not tight tensor parallelism. |
| Notes | Cheapest way to get ~half a terabyte of unified memory spread across commodity, quiet, low-power boxes that look like ordinary mini-PCs -- good distributed/stealth profile, poor for any workload needing fast cross-node synchronization. |

### 7. 2x NVIDIA DGX Spark (linked)

| | |
|---|---|
| VRAM | 2 x 128GB LPDDR5X = 256GB combined, linked via 200Gb/s (25GB/s) ConnectX networking; NVIDIA positions the pair as sufficient for ~405B-parameter models |
| All-in cost | ~$9,400 (2x $4,699 Founders Edition) |
| Power draw | ~500W combined (estimated; each unit ~240W) |
| Interconnect | 200Gb/s direct link between the two units -- much better than Ethernet, nowhere near NVLink, but purpose-built for exactly this 2-box linking scenario |
| Notes | Marketed explicitly as a personal/desktop "AI supercomputer" prototype box, not a training system -- memory bandwidth (not compute) is the real ceiling. |

### 8. DGX H100 / H200 node (8-GPU HGX, single node)

| | |
|---|---|
| VRAM | 640GB (8x H100 80GB) or 1,128GB (8x H200 141GB) |
| All-in cost | DGX H100: **~$482,000** at release (a real, sourced system price -- see Part A); DGX H200-class node estimated **~$500,000-600,000** (not independently found this session, extrapolated from the H100 figure plus H200's higher per-GPU price, flagged) |
| Power draw | **~10kW** per node (vendor-cited), needs 3-phase power and real data-center cooling -- not a home-circuit device |
| Interconnect | Full NVSwitch fabric, 900GB/s all-to-all between all 8 GPUs -- the reference point in this dossier for "fast, non-PCIe-bottlenecked" tensor parallelism |
| Notes | The standard modern building block of essentially every serious AI lab's training cluster; racked in groups of 4-32+ nodes connected by InfiniBand/RoCE for multi-node jobs. |

### 9. 8x AMD Instinct MI300X node

| | |
|---|---|
| VRAM | 1,536GB (8 x 192GB) -- the largest total memory of any single 8-accelerator node in this catalog |
| All-in cost | Estimated **~$190,000-230,000** (8x ~$15,000 GPU estimate, marked up by a system-overhead ratio similar to the DGX H100's observed ~1.9x GPU-to-system multiple -- this is a derived estimate, not a sourced system price) |
| Power draw | ~8-9kW (8x750W GPUs + dual-CPU platform), comparable to a DGX H100 node |
| Interconnect | AMD Infinity Fabric all-to-all within the 8-GPU UBB baseboard (~896GB/s) -- fast, in the same class as NVSwitch, though the ROCm software stack is reported as less mature than CUDA for distributed-training tooling |
| Notes | The memory-capacity leader for a standard 8-GPU node -- attractive for single giant models that just need to fit in memory, at some software-maturity risk. |

### 10. NVIDIA GB200 NVL72 rack

| | |
|---|---|
| VRAM | 13.4TB HBM3e across 72 GPUs (186GB/GPU), up to 30TB total fast memory including Grace CPU LPDDR5x |
| All-in cost | Reportedly **~$2-3 million per rack** (not independently re-confirmed this session; the GB300 successor rack is confirmed at $3.7-4M, used as an upper anchor) |
| Power draw | **~120kW per rack** (widely cited, not an official vendor figure), fully liquid-cooled |
| Interconnect | NVLink 5 rack-wide via NVSwitch, ~1.8TB/s per GPU, **all 72 GPUs behave as one fast-interconnect domain** -- the top tier of "fast tensor-parallel scaling" in this dossier |
| Notes | Requires purpose-built liquid-cooled data-center infrastructure; not something a hobbyist or even a mid-size company casually acquires or hides. |

### 11. Huawei Atlas 900 / CloudMatrix 384 pod

| | |
|---|---|
| VRAM | ~49TB aggregate (384 x 128GB Ascend 910C chips) |
| All-in cost | No public price -- sovereign/state-cloud deployment only |
| Power draw | **~350-560kW** for the full 16-rack pod (sources vary; roughly **4x** the power of a GB200 NVL72 rack for about 2x the aggregate BF16 throughput -- i.e., roughly half the performance-per-watt) |
| Interconnect | All-optical, all-to-all mesh (6,912 optical transceivers, zero copper) across all 384 chips -- fast in aggregate topology terms, but each individual chip is only about 1/3 as capable as one NVIDIA Blackwell die, so the system compensates with brute-force chip count |
| Notes | China's flagship answer to US export controls: "can't buy the best chip, so buy 5x as many decent chips and wire them together with better networking than anyone else." Enormous heat/power signature for its performance class -- a very detectable footprint (see Part E). |

### 12. "Bank risk-model rack" (illustrative: 2-4x HGX H200 nodes)

| | |
|---|---|
| VRAM | 2,256-4,512GB (2-4 nodes x 8x H200) |
| All-in cost | Illustrative estimate: **~$1.0-2.4 million** (2-4 nodes at an estimated ~$500-600k/node) |
| Power draw | ~20-40kW, fitting a handful of standard enterprise data-center racks (not a custom liquid-cooled hall) |
| Interconnect | Fast NVSwitch fabric within each node; InfiniBand/Ethernet (typically 400Gb/s-class NICs) between nodes -- a step down from intra-node NVLink but standard, well-understood multi-node scaling |
| Notes | This is an **illustrative construction**, not a named real deployment: financial institutions are widely reported to run modest (tens-of-GPUs) H100/H200 clusters for risk modeling, fraud detection, and trading-strategy backtesting rather than hyperscaler-tier thousands, sized more like "a few DGX-class nodes in an existing enterprise data center" than a purpose-built AI supercomputer hall. |

### 13. University department cluster (illustrative: 16-64x A100/H100, Slurm-scheduled)

| | |
|---|---|
| VRAM | 16x A100 80GB = 1,280GB (2 nodes); 64x H100 80GB = 5,120GB (8 nodes) |
| All-in cost | 16x A100 (2 nodes): **~$350-400k**; 64x H100 (8 nodes): **~$3.8-4.0 million** (both derived from Part A per-GPU/per-node figures; the 64x H100 estimate is consistent with 8x the ~$482k DGX H100 node price) |
| Power draw | 2-node A100 cluster: ~8kW; 8-node H100 cluster: ~80kW |
| Interconnect | NVSwitch within each node; InfiniBand (HDR 200Gb/s or NDR 400Gb/s class) between nodes -- the standard multi-tenant HPC pattern, scheduled with Slurm so many research groups share the pool by job queue rather than each owning dedicated hardware |
| Notes | This is a generic, illustrative pattern based on well-established university/national-lab HPC architecture (not one specific named institution's budget) -- real examples of this general shape are common at large research universities and national supercomputing centers. |

### 14. Hyperscaler region / campus (tens of thousands to ~1 million GPUs)

Two concrete, well-documented 2025-2026 real-world examples:

- **xAI "Colossus" (Memphis, TN):** went fully operational in **December 2024** after a **122-day build**; as of late 2025 xAI announced plans to expand toward **at least 1 million GPUs** and nearly **2 gigawatts** of compute power across a third building. The facility drew **~150 megawatts at peak** early on, met partly by **14 VoltaGrid portable methane-gas generators** -- environmental groups say at least **33 of these generators** were confirmed running via **thermal imaging**, without the air permits local regulators say were required, prompting an April 2026 NAACP lawsuit over Clean Air Act compliance in a metro area that had already violated federal smog standards 2020-2024.
- **"Stargate" (OpenAI/SoftBank/Oracle/MGX, multi-site US + international):** launched at **$100 billion**, targeting **$500 billion by 2029**; had **~7 gigawatts** of planned capacity as of September 2025 with a goal of **10 gigawatts by end-2025**; AMD committed up to **6 gigawatts** of Instinct GPUs and Broadcom **10 gigawatts** of custom silicon to the buildout. Confirmed US sites include Abilene TX, Shackelford County TX, Milam County TX, Doña Ana County NM, and Lordstown OH, plus international sites in the UAE (opening 2026), and letters of intent in Norway, Japan, and Argentina.

| | |
|---|---|
| VRAM | Effectively unbounded for game purposes -- tens of thousands to (per xAI's stated goal) ~1 million GPUs |
| All-in cost | Hundreds of billions of dollars at full buildout (Stargate alone: $100B initial, $500B targeted by 2029) |
| Power draw | Single-digit to low-double-digit **gigawatts** per campus/region |
| Interconnect | Multiple GB200/GB300-class racks networked by massive InfiniBand/optical fabrics across many buildings; cross-building links are necessarily slower than intra-rack NVLink, so hyperscaler training runs are usually organized to keep the tightest tensor-parallel groups within a rack/row and use slower interconnect only for data/pipeline parallelism across rows and buildings |
| Notes | This is the top of the game's power curve: unmistakable from orbit (gigawatt-scale power draw, dedicated gas turbines, huge cooling infrastructure), subject to real regulatory/legal exposure (air permits, grid-interconnection filings, community lawsuits) even for legitimate operators -- see Part E. |
---

## Part C -- Cloud & Colocation Pricing 2026 <a name="part-c"></a>

### Per-GPU-hour cloud pricing by provider tier

Cloud GPU pricing splits cleanly into four tiers that consistently show up across every 2026 source checked: **hyperscaler on-demand list price** (most expensive, least negotiable) > **specialist "neocloud" on-demand** > **specialist reserved/contract** > **peer-to-peer marketplace spot** (cheapest, least reliable). Multiple independent 2026 sources put the hyperscaler premium at **3-6x** the neocloud price for identical hardware, and the premium is reported to be *widening* over 2025-2026, not narrowing.

| GPU | Marketplace/spot floor | Neocloud on-demand | Neocloud reserved | Hyperscaler on-demand (list) |
|---|---|---|---|---|
| A100 80GB | ~$1.07/hr | ~$1.5-2/hr | ~$1.3/hr | ~$2.5-3.4/hr |
| H100 SXM5 | ~$1.49-1.87/hr (Vast.ai) | ~$1.99-4.25/hr (RunPod, Spheron, CoreWeave PCIe) | ~$3.09/hr (specialist reserved) | ~$6.88-13/hr (AWS/Azure list) |
| H200 SXM | ~$2.43/hr | ~$3.59-4.49/hr (RunPod, Lambda, CoreWeave) | lower with 1-3yr commit | AWS raised H200 list price **15% on Jan 4, 2026**; hyperscaler premium over median reported to reach **132%** |
| B200 | ~$2.12/hr (spot) | ~$4.99-6.29/hr (median ~$6.29) | as low as ~$2.25/hr (36-month) | AWS Capacity Blocks ~$9.36/hr, list up to ~$14.24/hr; GCP spot ~$6.69/hr |
| MI300X | -- | ~$4.00/hr on-demand | ~$2.45-3.00/hr (1-3yr) | -- (not widely offered by the big three as of this research pass) |
| RTX 4090 | ~$0.25-0.55/hr *(estimated, not independently sourced this session)* | -- | -- | *(not offered -- NVIDIA's GeForce/consumer driver licensing has historically discouraged data-center deployment of gaming cards, which is a large part of why 4090/5090 rental is concentrated on peer-to-peer marketplaces like Vast.ai and small independent "community cloud" tiers rather than AWS/Azure/GCP)* |
| RTX 5090 | ~$0.5-1.1/hr *(estimated, not independently sourced this session)* | -- | -- | *(same caveat as 4090)* |

**Named provider data points found this session** (September 2026 unless noted): CoreWeave H100 PCIe ~$4.25/hr, 8x-HGX-node ~$6.16/GPU-hr; Lambda H100 ~$3.99/hr, H200 ~$4.49/hr; RunPod H100 ~$1.99-2.69/hr, H200 ~$4.39/hr; Vast.ai marketplace H100 from ~$1.49-1.87/hr; Nebius GPUs (H100 SXM/H200/HGX B300 tiers) from ~$0.95/hr, reportedly ~60% below CoreWeave's H100 rate; GCP spot H100 ~$2.25/hr, B200 spot ~$6.69/hr; AWS on-demand H100 reported inconsistently between ~$6.88/hr and ~$12.29/hr across sources (likely different instance sizes/normalizations) and Azure ~$12.29-13/hr.

**Oracle Cloud Infrastructure (OCI) and Volcengine were not directly sourced this session** -- OCI is broadly reported elsewhere in the industry as one of the more cost-competitive hyperscalers for GPU rental (positioning itself closer to neocloud pricing than AWS/Azure/GCP), and Volcengine (ByteDance's cloud arm) primarily serves the Chinese domestic market at RMB pricing plausibly similar to Alibaba/Tencent below -- both statements are general industry context, not verified figures, and should be treated as placeholders.

### China cloud GPU pricing (RMB, ~7.1 CNY/USD)

| Provider | A100 80GB | Notes |
|---|---|---|
| Alibaba Cloud PAI | ¥8-12/hr (~$1.10-1.65) | |
| Tencent Cloud TI | ¥7.5-10/hr (~$1.03-1.37) | |
| AutoDL (marketplace) | ¥5.98/hr (~$0.82) | Cheaper peer-to-peer-style marketplace, analogous to Vast.ai |

<details><summary>Sources for this subsection</summary>

- <https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison>
- <https://www.spheron.network/blog/gpu-cloud-pricing-comparison-2026/>
- <https://cast.ai/blog/gpu-cloud-pricing/>
- <https://gpucloudcost.com/>
- <https://www.thundercompute.com/blog/coreweave-gpu-pricing-review>
- <https://www.thundercompute.com/blog/nvidia-h200-pricing>
- <https://www.marktechpost.com/2026/08/23/best-gpu-neoclouds-2026/>
- <https://nebius.com/prices>
- <https://intuitionlabs.ai/articles/data-center-gpu-pricing-2026>
- <https://www.promptquorum.com/local-llms/alibaba-cloud-vs-tencent-cloud-gpu-ai-2026>
- <https://computecomparison.com/provider/alibaba-cloud>
- <https://www.linkedin.com/pulse/comparative-look-gpu-rental-prices-from-aliyun-tencent-carmen-li-q5jve>

</details>

### Colocation pricing 2026 ($/kW/month)

| Market tier | $/kW/month |
|---|---|
| Wholesale (1MW+ commitments) | $80-130 |
| Retail, Tier-1 US markets (avg.) | $120-180 |
| Primary US markets (general range) | $180-400 (avg. ~$196; Chicago $200-230, N. Virginia $173-235) |
| Secondary US markets | $130-250 |
| GPU-density / AI-specialized colo (extra cooling) | $150-250 |
| Singapore (land/power constrained) | ~$403 |

Power availability, contract length, and minimum commitment increasingly drive total cost more than the headline $/kW figure -- 2026 reporting stresses that colocation deals are as much about *securing allocated grid power* as about renting floor space.

<details><summary>Sources</summary>

- <https://encoradvisors.com/data-center-colocation-pricing/>
- <https://datacenterhawk.com/resources/fundamentals/colocation-data-center-pricing-a-2026-beginner-s-guide>
- <https://www.agibeacon.com/post/colocation-pricing-in-2026-per-kw-math-power-premiums-and-what-s-negotiable>
- <https://brightlio.com/colocation-pricing/>

</details>

### Industrial/blended electricity price by country (2026, USD/kWh)

| Country | Blended/household | Industrial | Notes |
|---|---|---|---|
| United States | ~$0.14-0.17 | ~$0.07-0.08 | |
| China | ~$0.09 | ~$0.07 | |
| Germany | ~$0.31-0.37 | ~$0.21 | Most expensive of this group -- post-2022 energy-price structure persists |
| Norway | ~$0.12 | ~$0.045 | Cheapest of this group -- hydro-dominated grid |
| Russia | ~$0.077 (household) | ~$0.121 (business) | Dec 2025 data; note Russia's household tariff is *lower* than its business tariff, the reverse of most of the other countries listed |
| UAE | ~$0.06 | ~$0.06 (subsidized) | |
| India | ~$0.08 | ~$0.09-0.12 | |

This ~5-8x spread in industrial electricity cost between the cheapest (Norway) and most expensive (Germany) countries listed is, on its own, a large enough swing to change which country is the economically rational place to run a given AI cluster -- before even accounting for hardware export restrictions, which further constrain *where* the best chips can legally run at all (see Part D).

<details><summary>Sources</summary>

- <https://www.procurementresource.com/resource-center/electricity-price-trends>
- <https://www.iea.org/reports/electricity-2026/prices>
- <https://electricitycostcalc.com/kwh-cost-by-country.html>
- <https://www.rhnuttall.co.uk/blog/industrial-electricity-prices-by-country/>
- <https://businesstats.com/global-electricity-prices/>
- <https://www.globalpetrolprices.com/Russia/electricity_prices/>

</details>

---

## Part D -- Export Controls & Supply Chain 2026 <a name="part-d"></a>

### The current rules (as of ~July-September 2026)

| Status | Chips |
|---|---|
| **Banned** (presumption of denial) | H100, A100 (40/80GB), B100, B200, GB200, full-spec RTX 4090 |
| **Restricted / licensed, case-by-case** | H200 (capped at up to 75,000 units per firm for ~10 approved Chinese firms -- but as of May 2026 **reportedly zero units had actually been delivered**, blocked by Chinese customs and by Beijing's own policy restricting H200 to training-only use); H20 (see saga below) |
| **China-specific compliant SKUs** (legal to sell into China because deliberately cut down) | H20, B30A, RTX 6000D, RTX 4090D |
| **Unrestricted** | Consumer/workstation cards below the compute-density thresholds (T4, A10, A30, RTX A6000, RTX 6000 Ada, etc.) |

### The H20 saga: a timeline

1. **Oct 2023** -- US orders Nvidia to halt H800 exports (the H20's immediate predecessor-class chip) with no wind-down period.
2. **Dec 2024** -- New HBM-specific export controls take effect; Huawei had already stockpiled roughly a year's worth of HBM in advance after the rule leaked ~6 months early.
3. **Apr 9, 2025** -- BIS tells Nvidia the H20 now needs an indefinite export license, citing supercomputer-diversion risk. Nvidia takes a **$4.5 billion inventory writedown** plus a **$2.5 billion** unshipped-revenue hit in a single quarter. At this point roughly **1 million H20s were already in China** and **~1.3 million more (>$16 billion)** were in the order pipeline for ByteDance/Alibaba/Tencent.
4. **Jul 15, 2025** -- Commerce Secretary Lutnick announces the license freeze will lift, explicitly tied to a US-China rare-earths trade agreement.
5. **Aug 2025** -- Licenses issued, shipments resume to specific approved customers.
6. **May 17, 2026** -- Further approvals reported for H20 sales to China.

Throughout, US policymakers on both sides of the aisle have criticized the H20 as having "played a significant role" in enabling DeepSeek's low-cost model training -- the chip kept H100-class memory bandwidth while cutting compute, which happens to be close to the ideal profile for cheap large-scale inference and MoE training. Nvidia's China data-center revenue was **$19.67 billion in FY2026**, and is reportedly now modeled internally at close to **zero** going forward given how unpredictable the licensing has become.

### The rescinded "AI Diffusion Rule" and its replacement

The Biden administration's **"Framework for AI Diffusion"** was published **January 15, 2025** and would have sorted the entire world into three tiers: Tier 1 (the US plus 18 close allies, no restrictions), Tier 2 (most countries, capped at roughly 50,000 GPUs through 2027, with an under-the-cap allowance of about $40 million/~1,700 H100-class chips purchasable without a license), and Tier 3 (China, Russia, Iran, North Korea, Sudan -- outright prohibition). The Trump administration called this "burdensome" and **rescinded it on May 13, 2025**, before its compliance deadline ever took effect. It was replaced with a **Validated End User (VEU)** system: instead of a rigid national tier list, individual organizations in non-Tier-1 countries can qualify for larger allocations by meeting compliance-certification and monitoring requirements, evaluated case by case.

### The "Blackwell loophole" and its closure

Through 2025 into early 2026, Chinese-linked entities reportedly bought Blackwell-class chips through subsidiaries incorporated in **Malaysia, Singapore, and the UAE**, since the paperwork destination wasn't mainland China even though the beneficial buyer was. Estimated volume: **"hundreds of thousands" of units** over roughly 12 months. On **May 31, 2026**, BIS issued weekend guidance "clarifying" (i.e., tightening enforcement of) rules technically already on the books since 2023 -- but with no mandatory surrender or destruction of chips already diverted this way, only voluntary self-disclosure encouraged. A former State Department official called the gap "a HUGE problem," saying Chinese companies had "been buying these chips, very likely at scale."

### Smuggling cases

- **Super Micro (March 2026):** co-founder Yih-Shyan Liaw and two others charged with diverting **$2.5 billion** in Nvidia-equipped servers to China through Southeast Asian pass-through entities, staged "dummy" warehouse servers, and mislabeled shipments.
- **DeepSeek allegations:** the US State Department alleged DeepSeek accessed "large volumes" of restricted H100s; Nvidia publicly disputed this, saying DeepSeek's hardware was lawfully-acquired H800, not H100.
- **Huawei/TSMC shell-company case:** Huawei reportedly acquired "over two million advanced chip dies" via shell companies routing orders through TSMC, resulting in a **$1 billion fine**.

### Chinese domestic substitution progress

- **Nov 2025:** Beijing mandated that state-funded data centers more than 70% built use *only* domestic chips, affecting over **$100 billion** in state AI funding committed since 2021.
- Chinese-vendor accelerators (Huawei, Cambricon, and the rest of Part A's "Other Chinese Accelerators" section) captured an estimated **41% of China's AI-accelerator market in 2025**, up from roughly **5% in 2022** when Nvidia held ~95%. Roughly **4 million total AI accelerator cards** shipped within China across all domestic vendors in 2025.
- **SMIC**, China's leading foundry, has no EUV lithography access (its 2018 ASML EUV order was blocked by US pressure on the Netherlands) and is limited to **DUV-based "N+3"** process technology -- confirmed via a December 2025 teardown of Huawei's Kirin 9030 chip -- which the Financial Times has described as approaching "5nm-equivalent" density without EUV. This is the fundamental reason Chinese chips in this catalog (Ascend, Cambricon, etc.) tend to run hotter and larger per unit of compute than Western TSMC-fabbed equivalents.
- **HBM** (the memory type every serious AI accelerator needs) is still a major bottleneck: China's leading domestic memory maker, **CXMT**, was still in "low-rate risk production" of HBM3e as of September 2026, targeting a Shanghai HBM packaging facility for end-2026 -- i.e., **not yet at real volume**. Until CXMT scales, Chinese accelerator makers depend on stockpiled or smuggled HBM from SK Hynix/Samsung/Micron, all of which face their own export restrictions on HBM sales for Chinese AI use.

### The used-GPU market

Every "used" price column in Part A exists because of a real, large secondary market: data-center operators refresh generations every 2-4 years and resell/decommission older cards, which is exactly why 24GB P40s, 3090s, and A6000s remain viable "home rig" options years after their production runs ended. This dossier's price ranges (e.g., P40 ~$130, 3090 ~$650, A100 80GB ~$4,000-9,000 used) should be read as this secondary market's approximate 2026 price floor for each part.

### "GPU-as-collateral" financing

CoreWeave popularized using the GPUs themselves as loan collateral, turning specialized compute hardware into a financial instrument:

- **August 2023:** CoreWeave secures a **$2.3 billion** debt facility (Magnetar Capital, Blackstone) collateralized directly by its Nvidia H100 GPUs -- the first time H100 hardware had ever been used this way.
- **October 2024:** a further **$650 million** credit line (Goldman Sachs, JPMorgan, Morgan Stanley).
- **February 2026:** an **$8.5 billion** loan facility, this time collateralized by CoreWeave's AI-infrastructure *contracts* with Meta rather than the hardware itself.

This financing pattern -- hardware or the revenue contracts behind it pledged as collateral to fund the next round of buildout -- has become common across the AI infrastructure industry, and is a useful in-game mechanic: compute can be seized/repossessed, not just bought, and a lab that is financially overextended on GPU debt is a very different strategic target than one that owns its hardware outright.

<details><summary>Sources for Part D</summary>

- <https://gpusmith.com/articles/en/nvidia-gpu-export-restrictions>
- <https://ifp.org/the-h20-problem/>
- <https://www.tomshardware.com/pc-components/gpus/nvidia-h20-ai-gpu-inventory-is-limited-but-nvidia-is-making-a-new-b30-model-for-china-to-comply-with-export-restrictions>
- <https://www.networkworld.com/article/4022357/nvidia-to-restart-h20-exports-to-china-unveils-new-export-compliant-gpu.html>
- <https://www.cnbc.com/2026/03/17/nvidia-ceo-jensen-huang-says-chipmaker-has-received-orders-from-china.html>
- <https://en.wikipedia.org/wiki/Semiconductor_Manufacturing_International_Corporation>
- <https://en.wikipedia.org/wiki/ChangXin_Memory_Technologies>
- <https://en.wikipedia.org/wiki/CoreWeave>
- <https://www.jonpeddie.com/news/nvidias-new-b30a-chip/>
- <https://www.astutegroup.com/news/industrial/nvidias-b30a-accelerator-targets-chinese-market-under-tight-u-s-controls/>
- <https://www.tomshardware.com/tech-industry/semiconductors/why-nobody-is-buying-nvidia-6000d-in-china>
- <https://www.notebookcheck.net/Nvidia-readies-new-Blackwell-based-accelerators-tailored-for-China-under-US-export-limits.1091993.0.html>

</details>
---

## Part E -- Power, Cooling, Noise, Physical Footprint <a name="part-e"></a>

*The figures in this section are mostly straightforward engineering arithmetic (power in ~= heat out for a compute load) and well-established general infrastructure practice, cross-checked against the one strong real-world citation this research pass found for the detection angle specifically (xAI's Colossus, cited below). Treat the general "rules of thumb" as reasonable engineering estimates rather than each being individually sourced.*

### Power draw, by scale (rules of thumb from Part A/B)

| Scale | Typical power | Circuit / infrastructure needed |
|---|---|---|
| Single consumer GPU | 150-575W | Any standard outlet |
| Small home rig (2-6 cards) | 1.5-3kW | Edge of a single US 15A/120V circuit (~1.44kW continuous-safe); a 20A circuit (~1.92kW continuous) or a 240V circuit (dryer/EV-style, 30-50A = 7.2-12kW) gives real headroom |
| Quiet unified-memory box (Mac Studio, Strix Halo) | 0.12-0.5kW | Any standard outlet -- by design, the whole point of these options |
| Single 8-GPU data-center node (DGX H100/H200, 8x MI300X) | 8-10kW | 3-phase power, real data-center-grade cooling and electrical work; not something you install in a spare bedroom |
| Full liquid-cooled rack (GB200/GB300 NVL72) | 120-155kW | Purpose-built liquid cooling loop, dedicated power feed, raised floor or equivalent |
| Rack-scale Chinese system (CloudMatrix 384, full pod) | 350-560kW | Same as above, at higher volume -- roughly 4x the power of an NVL72 rack for about 2x its aggregate throughput |
| Hyperscaler campus/region | 0.1-2+ gigawatts | Dedicated substation and/or on-site power generation (xAI's Colossus runs portable gas turbines alongside grid power) |

A useful simplification for game balancing: **a compute cluster is, thermodynamically, a space heater with a GPU attached** -- essentially all electrical power drawn by a GPU under load is converted to waste heat. Power draw (which is easy to meter/observe) and heat signature (which is easy to detect thermally) are therefore tightly linked and can be treated as the same underlying stat for gameplay purposes.

### Cooling

- **Air cooling** remains viable up to roughly the level of a single well-ventilated rack of moderate-TDP parts; beyond that (and certainly at 1000W+ per GPU, as with B300/MI355X) **liquid cooling becomes mandatory**, either direct-to-chip cold plates or full immersion.
- **PUE (Power Usage Effectiveness)** -- the ratio of total facility power to IT power -- means a data center's *actual* grid draw is always somewhat higher than the sum of its GPUs' rated TDP; efficient modern hyperscale facilities are widely reported to run close to 1.1-1.2 PUE, while older or smaller facilities can run 1.4-2.0+. A hidden/improvised compute installation using off-the-shelf air conditioning rather than purpose-built cooling infrastructure will generally run at a much worse PUE, which is both a cost and a detectability penalty (more waste heat vented, less efficiently).
- Large liquid-cooled installations also consume significant **water** (for cooling towers / evaporative cooling), which shows up in utility billing and, in water-stressed regions, has been a subject of public controversy for hyperscale data centers generally.

### Noise

- Consumer GPU fans under load: roughly 35-50 dB.
- Blower-style cards built for rack mounting (e.g., the modded RTX 4090 48GB, RTX PRO 6000 Max-Q): reported around **~70 dB** for the 4090 mod specifically -- loud enough to be clearly audible through walls/doors.
- 1U/2U rackmount server chassis with small high-RPM fans are well known in IT circles to exceed 70-85 dB at full spin -- audible from outside a room, arguably from outside a house -- which is why data centers are essentially always a physically separate, sound-isolated space rather than a room in an occupied building.
- This gives a clean in-game "stealth tax": the quietest options in this catalog (Mac Studio, Strix Halo, most laptops-class silicon) are also the lowest-power and lowest-throughput; the loudest (dense multi-GPU rack servers, blower-cooled cards) are also the ones that draw the most power and produce the most heat. There is no "quiet and powerful and cheap" option in the real 2026 hardware market -- pick two.

### How real-world data centers get detected

The strongest sourced example this research pass found is **xAI's Colossus facility in Memphis, Tennessee**: environmental groups used **thermal imaging** to confirm **at least 33 gas turbine generators were running** on-site (generating roughly as much power as a full-size Tennessee Valley Authority gas plant nearby) *without* the Clean Air Act permits regulators said were required -- leading to an NAACP lawsuit in April 2026. This is a real, documented case of a major AI compute buildout being caught largely because heat and combustion emissions are hard to hide, even at a legitimate, publicly-known company's site.

Generalizing from that case and from standard infrastructure practice (not independently re-sourced beyond general engineering/regulatory knowledge):

- **Thermal signature.** Waste heat from cooling towers, chillers, and (as at Colossus) backup/primary generators shows up clearly in thermal satellite and aerial imagery -- this is the single most game-relevant detection vector, since it scales directly with the power-draw numbers already tabulated throughout this dossier.
- **Grid interconnection paperwork.** Any load large enough to need its own substation or a dedicated high-voltage feed (broadly, anything above a few megawatts) requires a utility interconnection agreement, which is frequently a matter of public or quasi-public record with the local grid operator/regulator -- a paper trail that exists well before the facility is ever built.
- **Visible infrastructure.** Cooling towers, chiller yards, generator farms, and substations all have a distinctive visual signature in ordinary satellite/aerial photography, independent of thermal imaging.
- **Noise and vibration**, as above -- relevant mainly at small-to-medium scale (a residential or light-industrial "hidden" installation), since a legitimate hyperscale campus is usually already so visually obvious that noise adds little extra detectability.
- **Water usage records**, for any liquid-cooled or evaporative-cooling installation.
- **Network/backbone footprint.** Provisioning enough fiber bandwidth to matter for large-scale distributed training is itself a procurement record, and unusual traffic volume/patterns are visible to ISPs and backbone operators.
- **Electricity billing anomalies.** Utilities and (in some jurisdictions) law enforcement have long used sudden, sustained, unusually-shaped electricity consumption spikes to flag anomalous industrial-scale loads at addresses zoned for something much smaller (most famously for indoor drug-cultivation operations) -- the same basic technique generalizes directly to "a house or small office pulling 10+ kW around the clock, every day, forever" as a signature worth flagging, though this dossier did not find a 2026-specific citation applying that technique to AI compute specifically; it is included as a well-established general precedent rather than a sourced 2026 fact.

For a stealth-flavored game mechanic, this suggests a clean design rule: **detectability should scale with power draw and infrastructure conspicuousness, not raw compute or VRAM** -- a Mac Studio or Strix Halo box pulling under 500W is close to undetectable by any of the above methods, while anything crossing into "needs its own generators/substation" territory (roughly the rack-scale tier and up) is fundamentally difficult to keep secret regardless of how careful the operator is.

<details><summary>Sources</summary>

- <https://en.wikipedia.org/wiki/XAI_(company)> (Colossus thermal-imaging/generator/lawsuit details)
- <https://www.tomshardware.com/pc-components/gpus/blower-style-rtx-4090-48gb-teardown-reveals-dual-sided-memory-configuration-pcb-design-echoes-the-rtx-3090> (noise figure for modded 4090)
- General engineering/industry knowledge on PUE, liquid cooling thresholds, and utility-load detection is not independently re-sourced in this pass beyond the above and should be treated as informed estimation, not verified fact.

</details>
---

## Part F -- Game Hooks: Configurator Presets <a name="part-f"></a>

Fifteen concrete starting-hardware presets derived directly from the data above, spanning the full range the brief asked for (used-P40 home server through hyperscaler-adjacent access). Costs/power are carried over from Part A/B; "throughput class" is a rough qualitative bucket (Minimal / Low / Mid / High / Very High / Extreme) for balancing rather than a precise benchmark number, since real-world throughput depends heavily on model, quantization, and batch size.

### 1. Scrapyard Oracle
- **Hardware:** 6x Tesla P40 in a decommissioned Dell R730 / Supermicro 2U chassis
- **VRAM:** 144GB (no tensor cores, INT8/quantized inference only)
- **Throughput class:** Minimal
- **Cost:** ~$1,800-3,500 all-in
- **Power:** ~1.8-2.2kW
- **Drawbacks:** No FP16 tensor cores at all -- forces heavy quantization; often riser-crippled to PCIe x1, so even the weak compute available is starved feeding data between cards; 2U server fans are loud (see Part E); Pascal-era CUDA compute capability is unsupported by some current-generation inference frameworks, requiring older/patched software.

### 2. Mining Rig Ascendant
- **Hardware:** 4x RTX 3090 on an open mining frame
- **VRAM:** 96GB (real FP16 Tensor Cores, unlike the P40 rig)
- **Throughput class:** Low
- **Cost:** ~$3,200-3,500
- **Power:** ~1.5-1.7kW
- **Drawbacks:** Sits right at a standard household circuit's continuous-load ceiling; open frame offers no dust/tamper/physical security and visually reads as "obviously not a normal PC" to anyone who looks; despite the silicon supporting NVLink, typical riser-cable builds are PCIe-only in practice.

### 3. Prosumer Duo
- **Hardware:** 2x RTX 5090
- **VRAM:** 64GB
- **Throughput class:** Mid
- **Cost:** ~$9,000-10,500
- **Power:** ~1.4-1.5kW
- **Drawbacks:** No NVLink (PCIe 5.0 x16 only, the least-bad PCIe-only option in this catalog but still not fabric-class); consumer board/driver stack lacks ECC memory and lights-out remote management, and consumer cards are not validated for sustained 24/7 100%-load duty cycles the way data-center parts are.

### 4. Quiet Workstation
- **Hardware:** 4x RTX PRO 6000 Blackwell Max-Q Edition
- **VRAM:** 384GB (ECC)
- **Throughput class:** High
- **Cost:** ~$38,000-41,000
- **Power:** ~1.7kW (vs. ~2.9kW for the same 4 cards at full 600W Workstation-Edition power)
- **Drawbacks:** Still PCIe-only interconnect (no NVLink on workstation Blackwell) so large-scale training scales worse than an equivalent-VRAM HGX node; high sticker price; the Max-Q power/noise savings that make this "quiet" cost nothing in claimed AI throughput, but real sustained multi-card thermal behavior in a tight case is a practical risk.

### 5. Ghost in the Studio
- **Hardware:** 1x Mac Studio, 512GB unified memory (M3 Ultra or current M5 Ultra)
- **VRAM:** 512GB unified (shared with CPU, some OS overhead)
- **Throughput class:** Low-Mid (huge capacity, modest raw compute)
- **Cost:** ~$9,500-12,000 (512GB tier)
- **Power:** well under 0.5kW
- **Drawbacks:** Raw compute throughput is far below an equivalent-priced NVIDIA rig -- this is a capacity-over-speed choice; single machine with no redundancy; narrower (Metal/MLX) software ecosystem than CUDA. In exchange: the quietest, lowest-power, least conspicuous way to hold half a terabyte of weights in this entire catalog -- plausibly deniable as "just a nice desktop computer."

### 6. Strix Halo Swarm
- **Hardware:** 4x Ryzen AI Max+ 395 ("Strix Halo") mini-PCs, networked
- **VRAM:** 512GB nominal (128GB x4, but four *separate* memory pools, not one)
- **Throughput class:** Low (per node), flexible in aggregate
- **Cost:** ~$8,000-8,500
- **Power:** ~500-550W combined
- **Drawbacks:** Cross-node interconnect is 10GbE at best -- by far the slowest link in this catalog -- so this only works well for pipeline-parallel splits or fully independent parallel agents, never tight tensor parallelism; four separate small machines are individually replaceable/expendable but collectively harder to keep perfectly in sync.

### 7. Spark Pair
- **Hardware:** 2x NVIDIA DGX Spark (GB10), linked
- **VRAM:** 256GB combined
- **Throughput class:** Low-Mid
- **Cost:** ~$9,400
- **Power:** ~500W combined
- **Drawbacks:** Bandwidth-bound (LPDDR5X, not HBM) -- NVIDIA itself positions this as a prototyping/development box, not a production trainer; the 200Gb/s inter-unit link is good for a 2-box setup specifically but doesn't generalize to bigger clusters.

### 8. Stolen HGX Node
- **Hardware:** 1x DGX H100 or DGX H200 (8-GPU HGX baseboard)
- **VRAM:** 640GB (H100) or 1,128GB (H200); substitute 8x AMD MI300X for 1,536GB at similar power but with ROCm-vs-CUDA software-maturity risk instead
- **Throughput class:** Very High
- **Cost:** ~$482,000 (H100, sourced); ~$500,000-600,000 (H200, estimated)
- **Power:** ~10kW
- **Drawbacks:** Requires 3-phase power and proper data-center-grade cooling -- cannot be run quietly or residentially by design; a single unit is worth roughly half a million dollars, making it a serious theft/repossession/black-market target in its own right; drawing 10kW continuously from any non-industrial building is itself a detection risk (Part E).

### 9. Bank Basement Cluster
- **Hardware:** 2-4x HGX H200 nodes (illustrative "enterprise cluster in an existing data center" configuration)
- **VRAM:** 2,256-4,512GB
- **Throughput class:** Very High
- **Cost:** ~$1.0-2.4 million
- **Power:** 20-40kW
- **Drawbacks:** This much capital outlay and power draw is very hard to justify or hide without a legitimate cover business (a bank, hedge fund, or cloud reseller shell) generating plausible cash flow and electricity bills; still small enough to colocate in a few standard enterprise racks rather than needing purpose-built liquid cooling.

### 10. Ivory Tower Slurm Slice
- **Hardware:** Queued/shared access to a 64x H100 university-style Slurm cluster (not owned outright)
- **VRAM:** Up to 5,120GB available in principle, but shared with other queued jobs
- **Throughput class:** Very High when a job is actually running; **effectively zero** while queued
- **Cost:** No large capital outlay -- ongoing access cost only (a stolen/borrowed/social-engineered account, a grant, a research collaboration, etc.)
- **Power:** ~80kW (someone else's problem/budget line, not the player's)
- **Drawbacks:** Multi-tenant by design -- legitimate researchers and IT/security staff are using and monitoring the same system, creating constant discovery risk; job-scheduler queue time means unpredictable availability rather than on-demand compute; usage is logged and auditable in ways owned hardware isn't.

### 11. GB200 NVL72 Rack
- **Hardware:** 1x full NVIDIA GB200 NVL72 rack (72 GPUs + 36 Grace CPUs)
- **VRAM:** 13.4TB HBM3e (up to 30TB total incl. Grace LPDDR5x)
- **Throughput class:** Extreme
- **Cost:** ~$2-3 million (GB300 successor rack confirmed at $3.7-4M)
- **Power:** ~120kW, liquid-cooled
- **Drawbacks:** Requires purpose-built liquid-cooling infrastructure and a dedicated power feed -- effectively impossible to install or run without either building or heavily retrofitting a real data-center suite; among the most export-controlled hardware that exists, making illegitimate acquisition extremely high-risk.

### 12. Ascend Rack
- **Hardware:** ~16x Huawei Ascend 910C accelerators (2x Atlas 800T A2-class servers)
- **VRAM:** ~2,048GB (16 x 128GB)
- **Throughput class:** High (weaker per-chip than NVIDIA/AMD equivalents, compensated partially by memory capacity)
- **Cost:** Not reliably found -- these are not normally sold outside China through any public channel; treat as unpurchasable via ordinary means outside a China-based storyline
- **Power:** ~8.8kW+ (16 x ~550W, before platform overhead)
- **Drawbacks:** CANN software stack instead of CUDA/ROCm means meaningfully more porting/compatibility work for most Western open-source LLM tooling; built on SMIC's mature-node (N+7-class/"N+3") process rather than TSMC's leading edge, so it runs hotter and larger per unit of compute than a Western equivalent; sourcing this hardware outside China is itself a major supply-chain/export-control storyline, not a normal purchase.

### 13. CloudMatrix Pod
- **Hardware:** 1x full Huawei CloudMatrix 384 pod (16 racks, 384x Ascend 910C)
- **VRAM:** ~49TB aggregate
- **Throughput class:** Extreme in aggregate, but roughly **half the performance-per-watt** of an NVIDIA GB200 NVL72
- **Cost:** No public price -- sovereign/state-cloud deployment only
- **Power:** ~350-560kW
- **Drawbacks:** Enormous, unmistakable power and heat signature for its performance class; only realistically available inside China's state-backed cloud ecosystem; the same export-control exposure as the Ascend Rack, at a much larger and harder-to-hide scale.

### 14. Hyperscaler Shadow Tenant
- **Hardware:** None owned -- rented/skimmed capacity on a major cloud provider (AWS/Azure/GCP/CoreWeave/etc.), up to and including frontier-class B200/GB200/Trainium3/TPU v7 instances
- **VRAM:** Effectively unlimited, billed per GPU-hour
- **Throughput class:** Extreme (whatever the provider's best current hardware is)
- **Cost:** Ongoing burn rate ($2-15+/GPU-hr depending on part and tier -- see Part C) rather than capital outlay
- **Power:** Not the player's problem -- no physical footprint at all
- **Drawbacks:** The entire detection surface moves from physical (heat, power, noise) to **financial and behavioral**: a payment method and identity that survives KYC checks, billing patterns that don't trip cloud-provider abuse/fraud detection, and API usage patterns that don't look anomalous to the provider's own security systems. No hardware to defend, but also nothing owned outright -- access can be cut off instantly if the account is flagged.

### 15. Grey-Market Inference Farm
- **Hardware:** A stack of modded RTX 4090 48GB cards and/or Huawei Atlas 300I Duo cards bought through informal/grey channels
- **VRAM:** Very high per dollar (e.g., 16x Atlas 300I Duo @ 96GB = 1,536GB for a reported per-card price under $1,500)
- **Throughput class:** Mid (inference-oriented; the 4090 mods keep real Tensor Core FP16 performance, the Atlas cards trade some compute for cheap capacity)
- **Cost:** Low relative to VRAM delivered, but highly variable and off-the-books
- **Power:** ~150-450W per card depending on which part
- **Drawbacks:** No warranty, ~2% reported failure rate on modded cards, leaked/modified firmware; Atlas cards require the CANN software stack rather than CUDA; acquisition channel itself is legally grey-to-black depending on jurisdiction, and grey-market sellers are themselves an unreliable, unregulated counterparty (no recourse if a card is dead on arrival or a seller simply disappears).

---

## Appendix: Full Source List

Every source cited in this document and the companion JSON is listed in that JSON's per-record `sources` arrays. The most-referenced sources across this research pass were: GetDeploying, GPUs.io, GPUAdvisor, Spheron Network's blog, Thunder Compute's blog, JarvisLabs, IntuitionLabs, RunPod's guides, NVIDIA's own product pages, Wikipedia (GPU/CPU architecture articles), SemiAnalysis, Tom's Hardware, TrendForce, the Institute for Progress ("The H20 Problem"), and GPUSmith's export-restrictions overview. Company-reported figures (NVIDIA, AMD, Intel, Apple, Google, Huawei, AWS, Microsoft, Meta press materials) were preferred wherever available; third-party aggregators were used to fill gaps and cross-check pricing, and are flagged as such throughout.

**This document and its companion JSON are a snapshot of a fast-moving market and an even faster-moving policy environment (Part D). Anything here involving China export rules, a chip launched in the last few months of the research window (Rubin, MI400, Ascend 950-series, Maia 200, TPU v7), or a specific dollar price should be treated as provisional and re-checked before being treated as authoritative outside this game-design context.**
