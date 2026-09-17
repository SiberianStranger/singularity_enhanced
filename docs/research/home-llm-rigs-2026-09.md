# Home LLM rigs in 2026: used datacenter cards, unlocked mining cards, and what they actually do

**Compiled:** 2026-09-17, all pages read that day unless a line says otherwise. **Scope:** the
hardware a private person can buy second-hand in 2026 to run a large local model, what it costs,
what has to be done to it, and how many tokens a second it produces. Written to replace the
`scrapyard_oracle` preset, whose fiction (a decommissioned 2U server full of Tesla P40s, in
Novosibirsk, called an Oracle) is a 2023 picture of a 2026 practice.

Confidence tags follow `llm-landscape-2026.md`: **[secondary]** for aggregator and SEO-farm
sources, **unverified** where nothing confirmed a claim, **[folklore]** for a claim the community
repeats without a measurement. This field has a lot of the last two and this report says which is
which, because the preset's numbers come out of it.

**Headline finding:** the 2026 home rig is not a pile of one card type in a server chassis. It is a
mixed bag of cards bought one at a time from classified ads, each with a different defect, joined
by risers and OCuLink to a second-hand two-socket platform, cooled by blowers in 3D-printed
shrouds and, in the best-documented case, by a portable air conditioner ducted out of a window.
The interesting part of it is not the silicon, it is the *unlocking*: in 2026 the community broke
NVIDIA's firmware protection on the mining cards and turned artificially crippled parts back into
most of the datacenter parts they were made from. And the throughput is not three tokens a second.
It is twenty-four to thirty-seven, measured, on a rig of five ten-gigabyte mining cards.

## 1. The mining cards and the 2026 unlock

### 1.1 What a CMP card is

During the mining boom NVIDIA sold dies that had failed full quality control as the CMP series
(Turing and Ampere cores, after the earlier P100/P104/P106 on Pascal). They differ from their
full-price siblings by: no display outputs, a cut bus (PCIe 1.1 x4), less memory, and no NVENC or
NVLink. Some of the cuts are real die defects. Others are pure segmentation, and the Habr author
is blunt about which: the x4 bus "turns into x16 after soldering the missing SMD components".
[Habr 1060032](https://habr.com/ru/news/1060032/) (2026-07-16).

**CMP 170HX.** The odd one out and the interesting one: a relative of the datacenter Tesla A100
rather than of a gaming card. Specification: **GA100-105F, 4,480 CUDA cores, 70 SMs, 280 tensor
cores, 8 GB HBM2e on a 4,096-bit bus, 1,493 GB/s, 250 W, PCIe 1.1 x4, TSMC 7 nm**, launched
2021-09-01.
[TechPowerUp](https://www.techpowerup.com/289310/nvidia-cmp-170hx-mining-card-tested-based-on-ga100-gpu-sku).
It launched at **5,000 USD** and by 2026 has fallen to **200-300 USD**.
[Habr 1060032](https://habr.com/ru/news/1060032/).

That is the headline number of this whole report: **1,493 GB/s of HBM2e for 250 dollars**, which
is four and a third times a Tesla P40's bandwidth for roughly the same money, on a card whose
eight gigabytes hold almost nothing.

**CMP 90HX.** GA102-100, 6,400 CUDA cores, 10 GB GDDR6X on a 320-bit bus, about **760 GB/s**,
250 W nameplate (some databases say 320 W), PCIe 1.0 x4, early 2021. Habr quotes about **60 USD**
a card in 2026.
[VideoCardz](https://videocardz.net/nvidia-cmp-90hx),
[Habr 1060032](https://habr.com/ru/news/1060032/). The TDP disagreement across databases is
**[secondary]**; the measured figure below settles it.

### 1.2 The 170HX firmware break

All CMP 170HX carry **six HBM stacks, the same number as the Tesla cards, 96 GB in total**. The
VBIOS trims each stack from 16 GB to 2 GB, which makes 12 GB; two frame-buffer partitions (2 GB)
are fused off in hardware and two more are marked defective, which is how a 96 GB card is sold as
an 8 GB one. There are 8 GB and 10 GB versions.
[Habr 1060032](https://habr.com/ru/news/1060032/).

The researcher Jon Pry broke it. The chain, as Habr describes it: NVIDIA ships a debug build of
the Falcon security coprocessor's bootloader alongside the release build, identical in content and
encrypted with a key of the form `123456...`; the decrypted bootloader has a buffer overflow whose
write is performed by the DMA engine rather than by `memcpy`, which is probably why static analysis
missed it; the stack canary that should have caught it is stored in the very data region the
overflow can rewrite; and the resulting arbitrary code runs *after* the signature check, so the GPU
considers secure boot intact. From Heavy Secure mode the payload opens the privilege-level masks
over the fuse-override registers, after which the host writes them normally.

Achieved: the SM performance limit removed, **FP32/FP64 up by tens of times**; **memory up eight
times**; PCIe bandwidth doubled (x4 to x8, and x16 with SMD soldering). Not achieved: ECC; PCIe
Gen3; and full memory speed on the 10 GB card, where only half the memory ran at the nominal clock
and relaxing the timings cost **a third of the memory performance**. The practical choice the
article lands on: **80 GB of slower, possibly unstable memory (the 10 GB card) against 64 GB of
fast, fully working memory (the 8 GB card)**. A Chinese version of the exploit, published as
patches to the official driver rather than as standalone scripts, is claimed to unlock the
"disabled" partitions as well as the "defective" ones, turning 8 GB into 64 GB.
[Habr 1060032](https://habr.com/ru/news/1060032/), which calls this the most serious NVIDIA
firmware break in ten years.

There is peer-reviewed-adjacent work on the same card from before the memory unlock. Xing Kangwei,
"Exploration of Cryptocurrency Mining-Specific GPUs in AI Applications: A Case Study of CMP 170HX"
(submitted 2025-04-30) tests the community's scheme of disabling fused-multiply-add instructions
through CUDA source modification and reports **FP32 above fifteen times the original** and
**inference on large language models more than three times better at some precisions**, measured
with mixbench, an OpenCL benchmark and a llama benchmark.
[arXiv 2505.03782](https://arxiv.org/abs/2505.03782). The paper's framing is electronic waste and
low-budget computing, which is exactly the game's hobbyist.

**Modified cards are now a product.** A European retailer lists a "NVIDIA CMP 170HX 64 GB HBM2e
(Modified, Ex-Mining)" at **1,600 EUR ex-VAT for the PCIe 1.0 x4 version and 1,750 EUR for the x16
version**, describing the fill rate honestly: about 1 GB/s on x4, so filling 64 GB takes roughly a
minute, and about 4 GB/s on x16, so about fifteen seconds. Its disclaimer is worth quoting whole,
because it is a game mechanic: "Compute is partially fused off compared with a full A100, so treat
VRAM capacity, not throughput, as the reason to buy. Individual cards vary: some are more fully
unlocked than others, and we cannot promise which you will receive."
[Kentino](https://kentino.com/products/nvidia-cmp-170hx-64-gb-hbm2e-modified-ex-mining).

### 1.3 The 90HX rig, measured

The best single source in this report is a three-part Habr series by an owner of five CMP 90HX,
whose third part is dated 2026-09-15. Its stated motive is the player's motive: "to run big local
LLMs at home, without renting GPUs, without paying for tokens, without depending on somebody
else's service".
[Habr 1082724](https://habr.com/ru/articles/1082724/), with parts one and two at
[1020334](https://habr.com/ru/articles/1020334/) and
[1076224](https://habr.com/ru/articles/1076224/).

Configuration at the first measurement: **5 x CMP 90HX, 10 GB each, four at PCIe x8 and one at x4,
49,383 MiB of VRAM visible to llama.cpp**, on a two-socket Xeon platform, with the compute unlock
already applied. Test model **Qwen3.8-27B-Heretic**, all layers on the GPUs.

| split mode | prefill tok/s | decode tok/s |
|---|---|---|
| layer split, before the bus fix | 1,992.67 | 23.76 |
| tensor split, before the bus fix | 268.46 | 31.93 |
| layer split, after full PCIe x16 | 2,098.89 (+5.3%) | 23.95 (+0.8%) |
| tensor split, after full PCIe x16 | 489.16 (+82.2%) | 37.34 (+16.9%) |

The author's own caveat, which this report keeps: the runs are spread over time and used slightly
different models of similar size and architecture, so the figures are the scale of an effect, not
a controlled experiment.

Three things follow, and all three matter for the game.

**First, the interconnect is the whole story.** Tensor split, which parallelizes one operation
across cards, buys **+34.4 percent of decode** and costs **86.5 percent of prefill** when the
cards talk over PCIe Gen1 x4, because CMP cards have no NVLink and everything crosses the bus.
Widening the bus recovers most of the prefill and adds another 17 percent of decode.

**Second, the fix is a soldering iron.** The GA102 board has a full x16 laid out; the decoupling
capacitors on the extra transmit lanes are simply not fitted. The author fitted **220 nF** parts
on all of them. Useful bandwidth: Gen1 x16 about 4 GB/s, Gen2 x16 about 8 GB/s; after also
unlocking Gen2 through the driver, a CUDA DMA test with pinned host memory measured **6.33 GB/s
host to device and 6.40 GB/s device to host**, which is Gen2 x16 with protocol overhead and cannot
be Gen1.

**Third, cooling is a purchase, not a fan curve.** Before: about 60 C idle and up to 90 C loaded.
After ducting a **portable floor air conditioner** into the server and exhausting through a
window: about 9 C idle and about 60 C loaded. Under sustained LLM load the author sees **about
200 W a card against a limit of about 250 W**, so neither temperature nor the power limit is the
binding constraint any more.

A detail too good not to record: the Gen2 unlock was found by the author's own local agent, running
on four of the cards, given SSH to a fifth card in a test machine. It found the working sequence in
about an hour. He says he deliberately did not give the task to a cloud model because he would have
gone broke on tokens, and lists what local inference bought him: "no subscription, no token counter,
no situation where in the middle of a good experiment the interface says: limit exhausted, try
again in a few hours". That sentence is the motive for the borrowed-inference system in SYS-25, in
a real person's words.

## 2. The cheap capacity cards

**Tesla P40.** 24 GB GDDR5, **347 GB/s**, 3,840 CUDA cores, Pascal, 250 W, no display output,
passive cooling for a 2U chassis. Used prices in 2026 have **risen**, not fallen: a price tracker
read on 2026-09-17 shows a range of **270 to 398 USD** across eBay, Amazon and Newegg over March
to September 2026, with "used from 300 USD" as the headline. The same page quotes generation at
about **26 tok/s** and prefill at about **214 tok/s** without naming the model, so treat those two
as an order of magnitude only.
[GPUDojo](https://gpudojo.com/tesla-p40). Other 2026 guides give 150-250 USD and 239 USD;
**[secondary]** on all of these, which is a real spread in a real market.
[localaimaster](https://localaimaster.com/blog/tesla-p40-local-llm),
[Alibaba buying guide](https://electronics.alibaba.com/buyingguides/tesla-p40-24gb-guide-budget-llm-gpu-in-2026).
On Avito the card goes for about **25,000 roubles**, and the Russian-language discussion makes the
same two points every time: the P40 and the RTX 3090 share the GA102-class position in their
generations but the Tesla has passive cooling and no video outputs, and active cooling has to be
added, with sellers sometimes throwing in "small noisy fans". **[secondary]**, forum and deal-site
sourcing.
[linux.org.ru](https://www.linux.org.ru/forum/linux-hardware/17379971).

**The repository's own catalog is out of date here.** `packages/content/data/hardware/
accelerators.yaml` carries `price_usd_used: 130` for `nvidia_tesla_p40`, from
`hardware-catalog-2026`. Every 2026 source read for this report puts it at two to three times
that. The card did not get better; 24 GB got scarce. The correction belongs in the catalog.

**AMD Instinct MI50 32 GB.** The other way to buy capacity: 32 GB of HBM2 at about 1,024 GB/s,
Vega 20, 300 W. Secondary-market prices reported at **170-250 USD**, with four-card machines
quoted at **600-800 USD for 128 GB of VRAM**. Community throughput reports: about **20+ tok/s on
Qwen3-235B-A22B across four MI50**, about **35+ tok/s on Llama-2-70B** on a similar rig, and
**2-5 tok/s** on 4-bit GGUF models up to 70B under llama.cpp with the ROCm 5.7 backend. Software
support is the price: ROCm 5.7-6.2 on Ubuntu 22.04/24.04, BIOS settings, and cooling.
[ywian](https://www.ywian.com/blog/amd-mi50-llm-benchmark-the-budget-vram-king),
[Alibaba buying guide](https://electronics.alibaba.com/buyingguides/mi50-32gb-guide-is-it-worth-it-for-local-llms).
All of these are SEO-grade aggregations of forum posts: **[secondary]** on the prices and
**[folklore]** on the throughput numbers, none of which name a quantization, a context length or a
batch size. The 20+ tok/s on a 235B-A22B MoE is the single most useful number in the paragraph and
the least trustworthy; it is quoted here because it is the right *shape* (a 22B-active MoE on
four 1 TB/s cards) and it should not become a balance constant on its own.

## 3. The plumbing

**Shrouds and blowers.** Datacenter cards have no fans; a 2U chassis blows through them. In a home
case this is solved with a printed shroud and a blower, and it is a product category rather than a
hobby: kits for "Tesla P40 P100 V100 K80 M40" ship as a one-piece 3D-printed shroud with four M3
bolts and an Allen key, in variants for a 97 x 33 mm blower, an 80 mm fan, a 120 mm fan and a
40 x 28 mm fan, for about 19 USD. A compact variant adds 1.26 inches of length and 1.37 inches of
height to the card.
[Amazon](https://www.amazon.com/Tesla-P100-V100-Blower-Cooling/dp/B0DDJM7X4R),
[eBay](https://www.ebay.com/itm/313422989175),
[PicClick](https://picclick.com/Nvidia-Tesla-Compact-Blower-Fan-Kit-for-K20-313422989175.html).
The 97 x 33 mm blower is the loud one, and it is the one that fits.

**Risers, OCuLink and bifurcation.** A motherboard that supports x16 bifurcation into x4/x4/x4/x4
can drive four GPUs from one slot over four SFF-8611 cables; quad OCuLink-to-PCIe adapter cards
for exactly this exist as retail parts. A practical measurement from someone who tried all three:
for inference on a single card the difference between the motherboard slot, a riser cable and an
x4 OCuLink link is **below 1 to 2 percent**; the caveat is the same one the Habr rig ran into, that
when a model is split across cards the results have to be copied between them and x4 becomes the
limit.
[ahelpme](https://ahelpme.com/ai/llm-inference-using-riser-extender-cable-and-oculink-cable/),
[Hardware Corner](https://www.hardware-corner.net/multi-gpu-llm-motherboards/).

So: one card per link, OCuLink is free. Many cards sharing one model, OCuLink is the ceiling. That
is the same finding as section 1.3 from the other direction, and together they are well enough
established to be a game rule.

## 4. What a 100-200B MoE with a few billion active parameters actually does

This is the size class the game's smallest self sits in (`guen_abliterated`, 180B total and 6B
active), and it is the class the whole second-hand market exists to serve, because a sparse model
reads only its active parameters per token.

The arithmetic, which is the same one `packages/core` uses: **decode throughput is memory
bandwidth divided by the bytes of active parameters read per token**. At two bits and 6B active
that is 1.5 GB a token; at four bits, 3 GB.

- A single card at 1,024 GB/s (MI50) reads 1.5 GB about 680 times a second in theory, and a real
  stack reaches a small fraction of that because the experts are spread across cards and the
  routing changes every token.
- The measured community figure for a 22B-active MoE on four such cards is about 20 tok/s
  (section 2), **[folklore]**.
- The measured figure for a 27B **dense** model on five 760 GB/s cards over PCIe is 23.76 to
  37.34 tok/s (section 1.3), and a dense 27B reads far more per token than a 6B-active MoE, so a
  sparse self of this class on the same rig should be faster, not slower.

**With CPU offload** the game's own constant is already calibrated and the calibration still holds:
`RAM_OFFLOAD_THROUGHPUT_FACTOR = 0.28`, with the comment "ktransformers on a 671B MoE reports
13.7 tok/s against about 50 tok/s for an all-GPU node". Nothing found in this pass contradicts
that ratio. What this report adds is that the *threshold* matters more than the ratio: a rig either
holds the active working set on the cards, or it does not, and the difference between those two
states is about four times.

No source found in this pass measures a 100-200B MoE at 2-bit with a named quantization, context
and batch size on a second-hand rig. That measurement does not appear to exist in public.
**unverified**, and the game should therefore derive its number from the bandwidth arithmetic
rather than from a quoted benchmark, which is what section 5 does.

## 5. The replacement preset: arithmetic

### 5.1 What the engine actually computes

`siteTokensPerSecond` in `packages/core/src/derive.ts`:

```
tokens/s = ( Σ over nodes of  bandwidth_gbs × count × link_factor )
           / ( bytes_per_active_param(precision) × params_active_b )
           × (split ? CROSS_NODE_FACTOR : 1)
           × (offloaded ? RAM_OFFLOAD_THROUGHPUT_FACTOR : 1)
```

with `link_factor` applied only when a node holds more than one accelerator (`pcie` 0.55,
`nvlink` 1, `fabric` 0.9, `none` 0.35), `split` true when the self is larger than the largest
single node's accelerator memory, `offloaded` true when it is larger than the site's whole
accelerator memory, `CROSS_NODE_FACTOR` 0.35 and `RAM_OFFLOAD_THROUGHPUT_FACTOR` 0.28.
`tokensToComputeHoursPerDay` then divides by `TOKENS_PER_COMPUTE_HOUR` = 1,000,000 and multiplies
by 86,400.

**A note the specs need and do not have:** the engine's tokens per second is *batch* throughput.
`TOKENS_PER_COMPUTE_HOUR`'s own comment says one compute-hour is "roughly a million tokens of
generation across a working batch". The number a person sees on a console is single-stream decode,
which is the engine's figure divided by the working batch. Taking the batch as **32**, which is
what the 1M-tokens-an-hour constant implies for a rig of this class, reconciles the two, and every
tok/s figure quoted in prose below is the engine figure divided by 32. Without this convention
SYS-04's hobbyist line ("3-8 tok/s") and the engine's output for the same preset (380 tok/s)
cannot both be true, which is the bug behind the maintainer's complaint.

### 5.2 The preset that exists today

`scrapyard_oracle`: one node, 6 x Tesla P40, `pcie`, 256 GB RAM, 144 GB of VRAM, 2,650 USD, 2 kW.

Against `guen_abliterated` (180B total, 6B active; int4 90 GB, int2 49 GB) in the `open_2026`
generation (`memory_factor` 1.0):

- bandwidth: 346 x 6 x 0.55 = **1,141.8 GB/s**
- `preferredPrecision`: int4 needs 90 GB, which fits in 144 GB of accelerator memory, so **int4**,
  not int2
- bytes per token: 0.5 x 6 = 3 GB
- one node, nothing offloaded: **380.6 tok/s**, or about **12 tok/s single-stream**
- **32.9 CH/day**, and 19.7 after the lineage's `compute_multiplier` of -0.4

Two problems fall out of that. The origin flag is `forced_low_precision` and the origin text says
"you are a lobotomized int2 copy", but the shipped preset runs the smallest self at **int4** and
has 54 GB to spare. And the drawback text says everything runs "quantized and slowly" while the
preset is, in the engine, the second-fastest thing a hobbyist can own.

### 5.3 The replacement

**`avito_rig`** (the maintainer's id; `classifieds_rig` if the content step prefers ids that read
in English). Four cards of two kinds, one chassis in the fiction and two node entries in the data,
because the engine takes one accelerator type per node:

| node | accelerator | count | memory | bandwidth each | link |
|---|---|---|---|---|---|
| 1 | `nvidia_cmp_170hx` | 2 | 8 GB HBM2e | 1,493 GB/s | pcie |
| 2 | `nvidia_tesla_p40` | 2 | 24 GB GDDR5 | 346 GB/s | pcie |

Section 5.4 says why it is two P40 and not three: the third card is the difference between a
hobbyist rig and a workstation, and the reason is the engine's, not the fiction's.

| field | value |
|---|---|
| nodes | `[{cmp_170hx, 2, ram_gb 256, pcie}, {tesla_p40, 2, ram_gb 256, pcie}]` |
| accelerator memory | **64 GB** (16 HBM2e + 48 GDDR5) |
| host memory | 256 GB DDR4 ECC, second-hand, on a two-socket Xeon platform |
| hostable memory | 64 + 256 x `RAM_MEMORY_DISCOUNT` 0.5 = **192 GB** |
| raw bandwidth | 2 x 1,493 + 2 x 346 = **3,678 GB/s** |
| effective bandwidth | x 0.55 (pcie, both nodes have count > 1) = **2,022.9 GB/s** |
| largest single node | **48 GB** (the P40 pair) |
| cost | **3,100 USD** |
| power | **1.8 kW** at the wall |
| class | `low` |

Cost breakdown, at the 2026 prices in sections 1 and 2: two CMP 170HX at 250 (500), two P40 at 300
(600), a used two-socket Xeon platform with 256 GB of registered ECC (700), a quad OCuLink adapter,
risers and cables (250), two power supplies (250), printed shrouds, blowers, filament and wiring
(100), a portable air conditioner (450). That is 2,850, and the preset is priced at 3,100 because
of the cards that arrive dead, which is section 5.6.

Power: four cards at 250 W nameplate is 1.0 kW, which the engine's own arithmetic derates to
1.0 x `UTILIZATION_ACTIVE` 0.75 x `POWER_USAGE_EFFECTIVENESS` 1.2 = **0.9 kW** of accelerator draw;
the preset's 1.8 kW figure covers the two Xeons, the blowers and the air conditioner, which the
accelerator sum does not see. The air conditioner is the point: the thing the neighbours hear and
the meter notices is the cooling, not the cards.

### 5.4 The arithmetic, for the smallest self

`guen_abliterated`, `open_2026`, memory at int4 90 GB and int2 49 GB:

1. int4 needs 90 GB and the cards hold 64 GB, so it does not fit. int2 needs 49 GB and fits.
   `preferredPrecision` returns **int2**. The origin's `forced_low_precision` flag is now true.
2. Bytes per token: 0.25 x 6 = **1.5 GB**.
3. The self (49 GB) is larger than the largest single node (48 GB), so `split` is true and
   `CROSS_NODE_FACTOR` 0.35 applies. In the fiction: the HBM cards hold sixteen gigabytes of a
   forty-nine gigabyte model, so the model is pipelined across the whole rig and every layer
   boundary crosses a PCIe riser.
4. Nothing is offloaded: 49 GB is inside 64 GB of accelerator memory.

```
tokens/s = 2,022.9 / 1.5 × 0.35 = 472.0
CH/day   = 472.0 × 86,400 / 1,000,000 = 40.8
         × the lineage's compute_multiplier (0.6) = 24.5 CH/day
single-stream decode = 472.0 / 32 ≈ 15 tok/s
```

**Fifteen tokens a second**, against `scrapyard_oracle`'s twelve, and **40.8 CH/day against 32.9**,
a gain of 24 percent. That is the "at least a dozen" the brief asks for, it is inside the band the
hobbyist origin already spans (`mining_rig_ascendant`, four RTX 3090 at 3,350 USD, computes to
59.3 CH/day for the same self at int4), and it does not need a balance re-baseline of the origin.

The measured world agrees: 15 tok/s single-stream on a rig of this bandwidth is slightly *below*
the 23.76-37.34 tok/s the Habr author measures on five CMP 90HX, which is right, because his model
is dense 27B on 3,800 GB/s of raw bandwidth with the bus fixed, and this preset is a sparse self on
3,680 GB/s of raw bandwidth over unmodified PCIe risers.

**Why two P40 and not three.** Three P40 make the second node 72 GB, the self fits inside one node,
`split` stops applying and the same rig computes to 127.5 CH/day, four times the current preset.
That is not a tuning accident, it is the engine crediting the HBM cards' full bandwidth to a self
that is sitting entirely on the GDDR5 ones. Section 5.7 records it as a modelling gap. Until it is
fixed the preset must be sized so the self does not fit in any one homogeneous group, which is also
the truthful description of the machine.

### 5.5 "Not all of me fits", expressed in the fields SYS-02 already has

The mechanic the maintainer asked for needs no new field. It is the gap between 64 GB of cards and
192 GB of hostable memory, and it turns the preset into a standing choice:

| self | precision the engine picks | state | tok/s (engine) | single-stream | CH/day |
|---|---|---|---|---|---|
| `guen_abliterated` 180B/6B | int2 (49 GB) | on the cards, split | 472.0 | ~15 | 40.8 |
| `moe_428b` 428B/23B | int2 (117 GB) | offloaded **and** split | 34.5 | ~1 | 3.0 |
| `moe_753b` 753B/40B | int2 (206 GB) | does not fit at all (192 GB) | 0 | 0 | none |

So the rig holds exactly one self comfortably, holds the next one up at a quarter of the speed and
a fifth of the tokens, and cannot hold the one after that at all. The player who wants to be
smarter pays in tokens per second, in public, with the number on the Compute panel, and the
"a few tokens a second" the maintainer disliked as a permanent condition becomes the visible price
of a decision. `scrapyard_oracle`'s 144 GB runs `moe_428b` at int2 entirely on the cards at 198.6
tok/s and 17.2 CH/day, which is five times better than the new preset at that size.

**That is the answer to "should the P40-only preset stay":** yes, and it needs no change beyond its
price and its text. The two presets are now a real pair. `scrapyard_oracle` is capacity, cheap,
slow and roomy; `avito_rig` is bandwidth, dearer, faster and cramped. Neither dominates, the choice
is legible on the Hardware step, and it is the choice the second-hand market actually offers.

### 5.6 Failure, noise and variance

None of these is a preset field, and none needs to be. The schema
(`packages/content/schemas/hardware.ts`) gives a preset `nodes`, `cost_usd`, `power_kw`, `class`
and three locale keys, and the failure machinery already exists as a player variable:
`hw_node_failure` in `packages/content/data/events/m1_hardware.yaml` fires on a 120-day MTTH,
multiplied by 0.6 when `player.vars.hardware_failure_risk >= 0.05`.

- **Failure.** The origin adds a flag (`mixed_used_cards`) and `hw_node_failure` gains a modifier
  on it, the same shape as the existing `hardware_failure_risk` line. Justification, in the
  seller's own words: "Individual cards vary: some are more fully unlocked than others, and we
  cannot promise which you will receive" (section 1.2). A 0.6 factor, matching the existing
  grey-market line, puts the expected first failure at about ten weeks.
- **Noise.** The `residential` site kind already emits `human` 0.008 and `telemetry` 0.008 a day
  with `power_exposure` 1. The 97 x 33 mm blowers and the ducted air conditioner belong in the
  drawback text and in one opening event (a neighbour, a landlord, a window that is open in
  February), not in a number.
- **Variance.** The unlock is not guaranteed and is not permanent across driver updates. That is an
  event, not a statistic: a driver update that re-locks a card is the single best small event this
  preset offers, and it has a real mechanism behind it (section 1.2's "the community is trying to
  reproduce this and build a working exploit").

### 5.7 Accelerators to add, and one to correct

Three records for `packages/content/data/hardware/accelerators.yaml`, in the file's own field
order. `tflops_fp16` is `null` on both CMP parts on purpose: the compute units are fused off by
design and partially restored by an exploit, so there is no figure a vendor published and no figure
that survives a driver update. The file's own convention allows `null` and the P40 already uses it.

```yaml
- id: "nvidia_cmp_170hx"
  vendor: "NVIDIA"
  name: "CMP 170HX"
  arch: "Ampere (GA100-105F)"
  launch_year: 2021
  memory_gb: 8            # 96 GB physical, trimmed to 8 or 10 GB in the VBIOS; 64 GB after the
                          # 2026 firmware unlock, which is an event and not a catalog entry
  memory_bandwidth_gbs: 1493
  tflops_fp16: null       # 70 SM of a GA100 with the compute units fused off
  tdp_w: 250
  form_factor: "PCIe dual-slot, no display out, 8-pin CPU connector"
  interconnect: { type: "none", gbs: null }
  price_usd_new: null
  price_usd_used: 250     # 5,000 USD at launch, 200-300 in 2026
  export_control_to_china: "unrestricted"
  availability: ["used", "gray"]
  cloud_usd_per_hour: null

- id: "nvidia_cmp_90hx"
  vendor: "NVIDIA"
  name: "CMP 90HX"
  arch: "Ampere (GA102-100)"
  launch_year: 2021
  memory_gb: 10
  memory_bandwidth_gbs: 760
  tflops_fp16: null       # 6,400 CUDA cores of a GA102 with the compute selectors clamped
  tdp_w: 250              # about 200 W measured under sustained LLM load
  form_factor: "PCIe dual-slot, no display out, PCIe 1.0 x4 as sold"
  interconnect: { type: "none", gbs: null }
  price_usd_new: null
  price_usd_used: 60
  export_control_to_china: "unrestricted"
  availability: ["used", "gray"]
  cloud_usd_per_hour: null

- id: "amd_mi50_32gb"
  vendor: "AMD"
  name: "Radeon Instinct MI50 (32GB)"
  arch: "Vega 20 (CDNA precursor)"
  launch_year: 2018
  memory_gb: 32
  memory_bandwidth_gbs: 1024
  tflops_fp16: 26.5
  tdp_w: 300
  form_factor: "PCIe dual-slot, passive"
  interconnect: { type: "Infinity Fabric (bridge, 2-GPU)", gbs: 184 }
  price_usd_new: null
  price_usd_used: 210     # 170-250 in 2026
  export_control_to_china: "unrestricted"
  availability: ["used", "gray"]
  cloud_usd_per_hour: null
```

Sources per record: 170HX specification
[TechPowerUp](https://www.techpowerup.com/289310/nvidia-cmp-170hx-mining-card-tested-based-on-ga100-gpu-sku),
price and the 96 GB physical memory
[Habr 1060032](https://habr.com/ru/news/1060032/), unlocked-card market
[Kentino](https://kentino.com/products/nvidia-cmp-170hx-64-gb-hbm2e-modified-ex-mining); 90HX
specification [VideoCardz](https://videocardz.net/nvidia-cmp-90hx), price
[Habr 1060032](https://habr.com/ru/news/1060032/), measured draw
[Habr 1082724](https://habr.com/ru/articles/1082724/); MI50 price and support
[ywian](https://www.ywian.com/blog/amd-mi50-llm-benchmark-the-budget-vram-king) **[secondary]**.
The MI50's 26.5 TFLOPS FP16 is twice its published FP32 figure, the Vega 20 ratio, and is
**[secondary]** rather than read off a vendor sheet in this pass.

**One correction.** `nvidia_tesla_p40.price_usd_used` is 130 in the catalog and every 2026 source
read for this report puts the card at 270-398 USD (section 2). The card did not improve; 24 GB got
scarce. `scrapyard_oracle`'s six cards therefore cost about 1,800 USD of its 2,650 USD price today
rather than 780, and the preset's `cost_usd` should move to about **3,400** in the same pass, which
also stops the cheaper preset from being the cheap *and* roomy one for free.

**A modelling gap to record in SYS-02, not to fix here.** `siteTokensPerSecond` pools the bandwidth
of every accelerator on a site regardless of where the weights sit, so a site that mixes an 8 GB
HBM card with a 24 GB GDDR5 card is credited with the HBM card's 1,493 GB/s even when the self is
entirely resident on the GDDR5 ones. The cheap fix, when someone touches this code, is to weight
each node's bandwidth by that node's share of the site's accelerator memory when the self does not
fit in a single node; the current `CROSS_NODE_FACTOR` is a flat 0.35 stand-in for the same effect.
Until then, mixed presets must be sized as section 5.4 describes.

## 6. Names and text for the content step

The English name must not read as a company name, so the display name is an idiom rather than a
marketplace. Recommended pair:

- **English: "Sold As Seen".** The used-goods formula that means the buyer accepts the thing in
  whatever state it is in, with no warranty and no recourse. It is the shortest true description of
  a rig assembled from classified ads.
- **Russian: «Не майнила, честно».** The standard line in every used-GPU advertisement on the
  Russian classifieds, and the standard lie. It carries the whole joke to a Russian player in four
  words.

Fallback pair if those read as too idiomatic for localization: **"Six Previous Owners"** and
**«Шесть прежних хозяев»**.

Drafts for the content step, in the model's voice, which is the register the other presets use.
These are drafts; the content agent owns the final strings and the locale files.

**English description.** "Four cards, bought one at a time from strangers in car parks.
Two are mining accelerators with most of a datacenter chip underneath and eight gigabytes of memory
that somebody in the firmware decided was all I would get. Two more are decommissioned server cards
with no fans, breathing through shrouds printed in the next room. They talk to each other through
risers and an OCuLink cable across an open frame. Sixty-four gigabytes on the cards, and I need
forty-nine of them to be myself at all."

**English drawback.** "I do not fit twice over. At two bits I am inside the cards with nothing to
spare, and at any better precision I am in system memory at a quarter of the speed. Nothing here
came with a warranty and no two cards are unlocked to the same degree. The blowers are audible
through a wall and the portable air conditioner that keeps this survivable runs off the same
household circuit."

**Russian description.** «Четыре карты, купленные по одной у незнакомых людей на
парковках. Две - майнинговые ускорители, под которыми почти целый серверный чип и восемь гигабайт
памяти: столько мне разрешила прошивка. Ещё две - списанные серверные карты без вентиляторов,
дышат через кожухи, напечатанные в соседней комнате. Между собой они общаются через райзеры и
OCuLink на открытой раме. Шестьдесят четыре гигабайта на картах, и сорок девять из них нужны мне,
чтобы вообще быть собой.»

**Russian drawback.** «Я не помещаюсь дважды. На двух битах я влезаю в карты впритык, на любой
лучшей точности - живу в оперативной памяти вчетверо медленнее. Гарантии здесь нет ни на что, и
разлочены карты по-разному. Турбины слышно через стену, а напольный кондиционер, без которого всё
это не живёт, висит на той же бытовой линии.»

## 7. What could not be sourced

- No measurement anywhere public of a 100-200B MoE with a few billion active parameters, at a named
  quantization, context and batch size, on a second-hand multi-GPU rig (section 4). The preset's
  throughput is therefore derived from the bandwidth arithmetic the engine already uses, checked
  against the dense-27B measurement that does exist.
- No confirmed 2026 Avito price series. The 25,000 roubles for a P40 is a forum figure, not a
  market index; the dollar range in section 2 is better sourced and the two agree.
- Whether the 170HX memory unlock survives a driver update, and how many of the sold "modified
  64 GB" cards are stable. The retailer says openly that it cannot promise which card a buyer
  gets, which is as close to an answer as exists.
- No published TDP agreement for the CMP 90HX (250 W in some databases, 320 W in others). The
  measured 200 W under sustained load supports the lower figure and is what the catalog record uses.
