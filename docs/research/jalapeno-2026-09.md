# Jalapeño and recognizable equipment variants

Checked: 2026-09-28. This note supplements
[the earlier evidence review](accelerator-redesign-2026-09.md).
It supports the equipment archetypes; it does not certify the entire old hardware catalog.

## What is confirmed

Jalapeño is an official product name, not an unconfirmed codename.
[OpenAI's June 24 announcement](https://openai.com/index/openai-broadcom-jalapeno-inference-chip/)
and [Broadcom's matching announcement](https://investors.broadcom.com/node/64506/pdf)
describe an inference accelerator developed by OpenAI with Broadcom and Celestica.
Engineering samples were running machine-learning workloads, and initial deployment was
planned for the end of 2026. The project joins chip design, software, memory movement,
networking and rack integration. The announcement does not establish retail availability.

[OpenAI's August 25 results](https://openai.com/index/jalapeno-first-results/)
report tests on GPT-OSS 120B, DeepSeek R1 and Kimi K2.5. The published power rating is
700 W, with measured sustained power at or below 550 W on those workloads. The comparisons
normalize by accelerator power ratings, not measured power of complete datacenters.
Production qualification, software maturation and preparation for deployment continued;
generation 2 was in development and generation 3 was taking shape.

These are manufacturer measurements for declared workloads and operating points. They are
not a universal multiplier for every model, every inference mode or an entire site's
efficiency. The opened sources do not provide a complete public purchasing specification.
The game therefore does not invent a price, HBM capacity or purchasable Jalapeño board.

The supplied discussion's claim that this architecture only executes OpenAI's own models
is contradicted by the tested public models. Conversely, executing those models in a lab
does not establish that the public can rent a virtual machine or buy the hardware.

## Distinctions worth keeping in the game

| Platform | Primary evidence | Useful distinction |
|---|---|---|
| AMD MI355X | [Product specification](https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html): 288 GB HBM3E, 8 TB/s, OAM, 1400 W and Infinity Fabric | A memory-rich server variant may fit a model using fewer modules; the assembly, power and software still matter |
| NVIDIA Rubin | [Platform description](https://www.nvidia.com/en-us/data-center/technologies/rubin/): NVLink within systems, and separate Ethernet/InfiniBand scaling components | Integrated systems and internal links are a property of the purchased assembly, not something a generic external switch gives any card |
| Google TPU7x | [Technical documentation](https://docs.cloud.google.com/tpu/docs/tpu7x): separate ICI and datacenter networking, JAX/PyTorch support, defined slices, memory hierarchy and prepared models | A provider tensor-node offer would be a service with supported configurations and software preparation |
| AWS Trn3 | [Availability announcement](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-ec2-trn3-ultraservers/): dated December 2, 2025, Trainium3/Neuron and training/inference configurations | Another provider and contract path; not automatically a different basic gameplay role |

No opened source establishes that TPU is universally better than NVIDIA, or that AMD deserves
a permanent software penalty. Compare a model, workload and configuration. A platform's
software preparation can change; a supplier name should not be an unconditional stat bonus.

## Content boundary for the first implementation

The equipment shop groups complete physical configurations into thirteen singular archetypes
and provider rentals into a fourteenth archetype, with at most two variants per archetype.
Four physical archetypes are initially revealed; the cloud archetype is revealed through identity research.
Recognition comes from one concise ecosystem or configuration modifier and concrete component
names in the detail view. Unlocks reveal the next useful choice, not all catalog SKUs.

The original accelerator records remain references. Equipment NodeSpecs explicitly include
the correct number of components, host memory and internal links. Whole-rack reference
records are not used as cards. Unified-memory desktops add zero separate host RAM so the
same physical memory is not counted twice.

Cloud TPU/Trainium capacity, API inference and internal Jalapeño equipment remain distinct
access modes. The implemented rental offers run the player's own weights: a four-chip
Trillium VM or a single-chip Trainium2 VM, with provider billing and preparation of the runtime.
Their units follow [Google's v6e documentation](https://docs.cloud.google.com/tpu/docs/v6e)
and [AWS's Trn2 specification](https://aws.amazon.com/ec2/instance-types/trn2/).
They can create a cloud site or expand an existing site from the same provider; they are
not sold as physical inventory. Internal Jalapeño remains a research reference, without an
invented retail or VM offer. Calling a hosted model API remains borrowed inference.

Three player designs are authored game fiction in
[the component file](../../packages/content/data/hardware/player_designs.yaml):
a conservative programmable tensor module, a programmable inference-oriented module,
and an integrated compute module. Each has finite external memory, bandwidth and power.
The equipment order adds a prototype fee/time, manufacturing/assembly cost, hosts,
commissioning and a company requirement. None has permanently baked weights or security
immunity, and none claims a real process node, wafer yield or verified efficiency ratio.

The current production path abstracts foundry access, fabrication, packaging and qualification
into a paid timed order. Its prices, durations and hardware parameters are balancing inputs,
not foundry quotations. Detailed industrial supply chains and the later scientific substrate
branches are separate work; their absence must not be reported as already implemented.

## Reading the modifiers

The archetype says what kind of useful body is being purchased. The variant identifies the
supplier ecosystem or meaningful configuration. The displayed specifications and site preview
explain the actual result; the suffix does not apply a second hidden performance multiplier.

Network describes the site's service LAN and external route. Interconnect describes
coordination between compute nodes; links inside a chip or baseboard remain part of that
component or assembly. Optical transport has finite latency and powered endpoints.
Cooling factors are relative to the existing PUE and retain positive overhead.
Security factors reduce new exposure accrual; they do not delete old evidence.
