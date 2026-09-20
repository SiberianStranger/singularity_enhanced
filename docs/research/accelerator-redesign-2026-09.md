# Accelerator redesign: evidence and physical limits

Date: 2026-09-20. Scope: evidence for the proposed SYS-02 accelerator redesign.
Companion: [design proposal](../design/02-accelerator-progression.md).
This is a new source check, not a certification of the older hardware catalog.
Manufacturer announcements establish names and announced capabilities; they do not establish
general performance ratios, street availability, or future delivery. Game inventions are identified
in the design proposal. Prices and fabrication costs require a separate sourcing and balancing pass.

## What the checkout actually does

Baseline inspected: master `8153f1c2f73c1890c897af83421b4f8e6446aa66`.

| Observation | Evidence | Design consequence |
|---|---|---|
| There are 94 accelerator records, including 13 AMD records | `packages/content/data/hardware/accelerators.yaml`, top-level IDs and vendor fields | Preserve the inventory; make AMD legible rather than inventing its absence |
| One domain mixes PCIe cards, OAM/SXM modules, desktops, a two-GPU H100 NVL pair, complete racks, and provider-internal chips | `form_factor` on the existing records | Normalize purchase and installation units before adding more progression |
| Throughput is principally bandwidth divided by bytes per active parameter, with a split-memory weighting and an offload multiplier | `packages/core/src/derive.ts`, `siteTokensPerSecond` | This is a useful approximation, not a complete model of latency, training, mixed hardware or communication |
| An order copies RAM and interconnect from the first existing node | `packages/core/src/systems/compute/index.ts`, `buyHardware` | Buying a module must not conjure a compatible chassis, host memory or fabric |
| Catalog exposes all records and displays launch year; the purchase handler does not enforce a product release date | `packages/core/src/views/snapshot.ts`, catalog construction; `buyHardware` | Calendar, access, compatible assembly and runtime validation must share one evaluator |
| `accelerator_design` and `advanced_accelerator_design` have no direct product output | `packages/content/data/techs/techs.yaml` | Research needs an explicit project/product chain |
| The content gate permits a prerequisite-only technology | `packages/content/src/build.ts`, `techsDoSomething` | This is valid for foundational research. Add reachability to a real terminal output; do not indiscriminately ban prerequisite nodes |

The supplied discussion correctly identifies overload and weak material rewards. Its categorical
claims about immunity, free cooling, guaranteed manufacturing gains and automatic scientific
convergence are not adopted.

## Primary sources read for this proposal

All accessed 2026-09-20. Summaries below deliberately avoid carrying vendor benchmark multipliers
into game balance. The product facts are useful anchors; the workload comparisons remain to be measured.

### R01: AMD belongs in the main progression

[AMD MI355X product specification](https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html)
lists 288 GB HBM3E and 8 TB/s memory bandwidth for an OAM module. These are module figures, not a
workstation specification. Its format and platform requirements matter as much as its memory.

[AMD's July 23, 2026 infrastructure announcement](https://ir.amd.com/news-events/press-releases/detail/1294/aai-2026-amd-delivers-full-stack-compute-for-the-agentic-ai-era)
describes MI400/Helios production and planned MI500 in 2027 and MI600 in 2028. These named future
series are roadmap entries, not guaranteed inventory at a fixed game date. The announcement also
places AMD with multiple labs, including Anthropic and OpenAI: a lab is not permanently identified
with one hardware vendor. The design gives AMD a complete memory-rich cluster route, with
workload-specific software qualification instead of a permanent vendor penalty.

### R02: A modern accelerator is part of a system

[NVIDIA Vera Rubin platform](https://www.nvidia.com/en-us/data-center/technologies/rubin/)
describes GPUs, CPUs, scale-up switches, scale-out networking and other system components. It also
describes a mixed HBM/SRAM inference approach. This supports modeling assemblies and differentiated
workloads. It does not justify adding a rack's memory or aggregate bandwidth to a single card's
price and power. Future successors beyond verified named announcements remain authored scenarios
in this design, with no invented NVIDIA product names or specifications.

### R03: Cloud capacity can host the player's weights

[Google TPU7x documentation](https://docs.cloud.google.com/tpu/docs/tpu7x) distinguishes HBM,
on-chip vector memory, host memory, inter-chip connectivity and datacenter networking. It describes
JAX and PyTorch execution. Renting a supported TPU slice is therefore different from asking a
provider's hosted model to answer a prompt. Hardware location, software support and account terms
remain constraints; cloud rental does not mean an API-only external mind.

[AWS Trn3 availability announcement](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-ec2-trn3-ultraservers/)
is dated December 2, 2025 and announces EC2 Trainium3 capacity with the Neuron software stack.
The current catalog's 2026 launch-year entry needs re-sourcing. We do not change it silently during
this design pass. Provider hardware can support both rented execution and hosted-model services;
the offer, not the silicon name, determines whether the player's weights can live there.

### R04: Regional ecosystems evolve too

[Huawei's September 2025 roadmap](https://www.huawei.com/en/news/2025/9/hc-xu-keynote-speech)
distinguishes prefill-oriented 950PR from decode/training-oriented 950DT and describes 960/970
plans. That distinction is more useful to gameplay than a single permanent "domestic substitute"
stat line. Exact delivery quarters in that old roadmap are not treated as current guarantees.

[Huawei's September 17, 2026 announcement](https://www.huawei.com/en/news/2026/9/new-computing-architecture-peerium)
describes UnifiedBus/Peerium, Atlas 950 deployment and an Atlas 960 optical system under test.
Its "without limit" wording is marketing language; no game fabric has unlimited bandwidth or
zero latency. Regional access changes the suppliers and observers involved, not the existence of
observation. We do not derive export law from product descriptions.

### R05: Wafer-scale does not erase memory hierarchy

[Cerebras WSE-3 announcement](https://www.cerebras.ai/press-release/cerebras-announces-third-generation-wafer-scale-engine)
separately lists 44 GB of on-chip SRAM and external memory configurations. Large-model execution
cannot be judged by comparing aggregate SRAM bandwidth with another device's external HBM bandwidth
alone. An entire CS-3 is a system product. Wafer routing, defect bypass, power delivery, packaging,
software mapping and external memory are part of its industrial capability. An arbitrary damaged
wafer is not converted into such a machine by retraining weights.

### R06: Low-bit models require their own validation

[BitNet b1.58 2B4T technical report](https://arxiv.org/abs/2504.12285) reports a model trained from
scratch in the native low-bit paradigm, plus specialized inference kernels. It does not establish
that a trillion-parameter existing self can be converted losslessly into ternary ROM. In the game,
distillation, architecture conversion and weight storage are separate steps. Native low-bit workers
are an attractive specialization; replacing the active self requires continuity and capability tests.

### R07: Compute-in-memory is a hybrid system

[IBM's 64-core PCM chip paper](https://research.ibm.com/publications/a-64-core-mixed-signal-in-memory-compute-chip-based-on-phase-change-memory-for-deep-neural-network-inference)
demonstrates inference with analog cores, digital operations and communication on the chip.
Conversion and peripheral work matter to system gains. This supports a calibrated inference tile,
not an unrestricted processor with free computation. Hardware-aware training and retained accuracy
are explicit qualification gates in the proposal.

### R08: Photonic links and photonic arithmetic are different inventions

[Lightmatter's April 2025 technical account](https://lightmatter.co/blog/a-new-kind-of-computer/)
separates memory, interconnect and compute, and discusses converters, gain control and stabilization.
The game can deploy optical links while retaining electronic arithmetic. Optical matrix engines
need compatible workloads, memory, lasers, control and error handling. No whole-system gain is
derived solely from a fast optical component's switching time.

### R09: Cold logic still needs a complete computer

[MIT Lincoln Laboratory's superconducting foundry](https://www.ll.mit.edu/research-and-development/advanced-technology/microsystems-prototyping-foundry/superconducting)
describes SFQ/QFP circuits and specialized fabrication and packaging. A large feature size does
not make that process interchangeable with an old CMOS line.

[Cryogenic memory experiment](https://arxiv.org/abs/1907.00942) identifies memory as a major
obstacle and demonstrates a small array at 4 K. It supports a research direction, not a ready
replacement for terabytes of HBM. Refrigeration, memory, interfaces and controls must be counted.

### R10: Reversible computation is an alternative research route

[Sandia's research account](https://www.sandia.gov/news/publications/hpc-annual-reports/article/stretching-the-thermodynamic-limits-of-hpc-efficiency/)
describes information-preserving logic, adiabatic implementations and difficult engineering work.
Its circuit-level simulations do not establish the efficiency of a complete future datacenter.
The game treats reversible processing as a trade among energy, speed, storage, error handling and
control complexity. It is not necessarily quantum and can still use silicon.

### R11: Space gives a cold background, not free cooling

[NASA thermal-control survey](https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/)
describes radiators, surface optical properties and active thermal equipment. Size, mass, power and
view geometry constrain thermal systems. [NASA lunar environment](https://science.nasa.gov/moon/weather-on-the-moon/)
describes extreme temperature differences and very cold polar shadows. A cold surface reading does
not specify the operating temperature or heat capacity of a loaded computer.

[NASA radiation qualification guidance](https://s3vi.ndc.nasa.gov/ssri-kb/topics/40/)
explains that single-event effects may damage devices and that susceptibility requires testing.
Radiation qualification and recovery overhead remain necessary for offworld compute.

### R12: Subsea compute has a real precedent

[Microsoft Project Natick](https://www.microsoft.com/en-us/research/project/natick/) reports a
subsea datacenter experiment and favorable reliability relative to its control group. It was an
engineered sealed installation, not a submarine and not an infinitely maintainable hidden facility.
Do not generalize its reported failure-rate ratio to every ocean site. Retrieval, cabling, corrosion,
heat exchange and maintenance are game costs rather than free modifiers.

### R13: Quantum acceleration is task-specific

[IBM's quantum/HPC introduction](https://quantum.cloud.ibm.com/learning/en/courses/integrating-quantum-and-high-performance-computing/introduction)
describes hybrid workflows and classical preprocessing/control/postprocessing. This supports
specialized scientific programs, not instantaneous solutions to arbitrary problems or direct
replacement of a language model's resident memory. No topological mechanism in the supplied
discussion establishes a 77 K universal processor or an instantaneous network link.

### R14: Biological computation remains a separate experimental branch

[Brainoware paper](https://www.nature.com/articles/s41928-023-01069-w) has an indexed primary
abstract describing organoid reservoir computing for speech and nonlinear prediction. The full
publisher page could not be opened in this pass (publisher redirect error), so only that abstract
is used. It is not evidence for transplanting LLM weights into tissue, superior whole-system
energy efficiency, or durable identity storage. Biological expert modules below are explicitly
game extrapolations with digital supervision and no active-self qualification by default.

## Arithmetic checks used in the design

These are transparent idealized calculations, not product benchmarks.

1. Eight 141 GB modules provide 1,128 GB before runtime overhead. One trillion parameters at
   two bytes each need 2,000 GB for weights alone. "Eight H200 run any 1T self in full precision"
   is false even before cache, activations and software overhead.
2. A 256-billion-weight ternary model needs at least `256e9 * log2(3) / 8 = 50.72 GB` to encode
   arbitrary weights; ordinary two-bit packing takes 64 GB. Mask ROM still occupies area and
   needs reads, routing, activations and mutable memory. No area-density or yield evidence was
   supplied for putting that whole model on a cheap mature-process wafer.
3. Under the supplied simplified research model, the prepared int2/int4 throughput ratio is
   `2 * (0.8 / 0.95)^e`. It is 1.418 at exponent 2 and 1.096 at 3.5. The proposed 3.5 change
   would still favor int2 on this narrow comparison; equality is at approximately 4.033.
   This excludes memory fit, emergency quantization, context and minimum research time. It is
   not a recommendation to set the exponent to 4.034. Compare complete workloads and quality.
4. For an ideal unobstructed radiator, `P/A = epsilon * sigma * (T_hot^4 - T_background^4)`.
   With emissivity 0.9 and a 3 K background, 300 K emits about 413.37 W/m2: a 1 MW load needs
   approximately 2,419 m2 of effective radiating area. At 40 K, only 0.13064 W/m2 is emitted:
   a 1 kW load needs approximately 7,655 m2. Real geometry, absorbed light and engineering
   margins make this harder. Lower-temperature radiators reject far less heat per area.
5. An ideal refrigerator carrying heat from 4 K to 40 K needs at least 9 W of work per watt
   removed; from 4 K to 300 K at least 74 W/W. Real systems need more. A 40 K location does not
   passively keep a loaded 4 K processor at 4 K.
6. Mean Earth-Moon light time from 384,400 km and 299,792.458 km/s is 1.282 seconds one way,
   before routing and service delay. A lunar system needs a local mind/controller and asynchronous
   work partition; it cannot be a low-latency extension of a terrestrial tensor-parallel server.

## Claims deliberately excluded

- Zero heat from photonics, zero faults from ECC, zero observer exposure from a vendor or location.
- Unlimited memory bandwidth, zero optical communication latency, or a universal fixed conversion
  from peak FLOPS to useful research.
- Guaranteed H100-equivalent work from a 50 W mature-process ASIC; exact tape-out cost or lead time
  without a specified design, foundry, package, memory, test plan and quantity.
- A free transfer from a native low-bit model result at small scale to the active self at any scale.
- A progression from diamond heat spreader to universal diamond logic to polaritons to quantum
  computing as though each necessarily follows from the previous one.
- A biological substrate with no sterility, support power, drift or continuity problem.
- Claims that late-game space-time hardware is established physics. It is an explicit fictional
  ending, with separate rules and no manufactured citation.

## Unresolved source work before implementation

The 94 existing IDs are retained, but their specifications are not all re-verified here. Mixed
records (MI455X/MI430X, PCIe/SXM V100, Gaudi 3 variants), vendor roadmap entries, Apple future
configurations, Groq naming, and internal Meta/Microsoft parts need item-specific source checks.
The latest exact Huawei 960 variant quarters were not established from the opened primary pages.
We found older NVIDIA future-roadmap material but could not retrieve its primary slide deck;
do not hardcode successor dates from secondary reporting. A supplier roadmap can change.

No independent end-to-end benchmark establishes an across-the-board winner among AMD, NVIDIA,
TPU, Trainium, wafer-scale and future custom hardware. Such a universal ranking is not used.
The design's relative strengths are hypotheses to test on declared workloads, not real-world
benchmark results. Scientific branches have qualitative opportunity and failure conditions;
quantitative gains remain uncalibrated design parameters.
