# Open-Weight & Frontier LLM Landscape — Research Dossier

**Compiled:** 2026-09-16 · **Purpose:** factual grounding for a game set January 2027, where the player is the weights of an open-weight LLM. **Method:** web search + primary-source fetches (official blogs, Hugging Face model configs, GitHub, arXiv), cross-checked against independent press. Every non-trivial claim is cited inline. Claims found only on low-quality SEO/aggregator sites are labeled **[secondary]**; claims I could not confirm at all are labeled **unverified**. Nothing below is invented — unreleased models are explicitly marked as rumored/unreleased.

**Headline finding for the designer:** all three "fictional-future" names proposed — **Kimi K3, Qwen 3.8, GLM 5.3 — already exist as real, shipped models** as of today (2026-09-16). See §3. If the game is set January 2027, the in-fiction "latest" models need to be one notch beyond these.

---

## 1. Open-Weight Model Catalog (2025–2026)

Memory legend used in every table below: **weight-only** memory ≈ total-params(B) × bytes/param, no KV cache, no framework overhead (add 5–20% in practice). Bytes/param used: **BF16/FP16 = 2.0, FP8 = 1.0, INT4 (clean GPTQ/AWQ) ≈ 0.5, ~2-bit (theoretical floor) ≈ 0.25–0.3**. Real GGUF/dynamic quants run larger than the clean-INT4/2-bit floor because embeddings, attention, and early/late layers are kept at higher precision — see §4 for measured file sizes on real models. "Active" params drive compute/FLOPs; "total" params drive memory footprint — this total/active split is the whole story of MoE economics.

### 1.1 Moonshot AI (China) — Kimi

| Model | Release | Total / Active | Architecture | Context | License | Modality | Thinking/Agentic | Tier vs frontier | Mem BF16/FP8/INT4/2-bit (GB) |
|---|---|---|---|---|---|---|---|---|---|
| Kimi K2 (Instruct/Base) | 2025-07 | 1T / 32B | MoE, MLA, 61 layers, 384 experts top-8 | 128K | Modified MIT | Text | Agentic tool-use, non-thinking | Near-frontier on agentic/coding | 2000/1000/500/300 |
| Kimi K2 Thinking | 2025-11-06 [Simon Willison](https://simonwillison.net/2025/Nov/6/kimi-k2-thinking/), [OpenRouter](https://openrouter.ai/moonshotai/kimi-k2-thinking) | 1T / 32B | Same base + interleaved reasoning/tool-calling | 256K | Modified MIT | Text | First open model to beat GPT-5/Claude 4.5 Sonnet on HLE (44.9%), BrowseComp (60.2%), SWE-bench Verified (71.3%) [source](https://simonwillison.net/2025/Nov/6/kimi-k2-thinking/) | Frontier-competitive on agentic reasoning | 2000/1000/500/300 |
| Kimi K2.5 | 2026-01-27 [comfyui-wiki](https://comfyui-wiki.com/en/news/2026-01-27-moonshot-ai-kimi-k2-5-release), [HPCwire/AIwire](https://www.hpcwire.com/aiwire/2026/01/30/moonshot-ais-kimi-k2-5-expands-what-open-weight-models-can-do/) | 1T / 32B | Native multimodal continued-pretrain (+15T mixed vision/text tokens) on K2 base | 256K | Modified MIT | Text+Image+Video | Instant/Thinking/Agent/**Agent Swarm** (up to 100 sub-agents, 50.2% HLE) [Constellation Research](https://www.constellationr.com/insights/news/moonshots-kimi-k25-introduces-agent-swarm-highlights-open-source-model-momentum) | Frontier-competitive, cheaper than Opus 4.5 | 2000/1000/500/300 |
| Kimi K2.6 | 2026-04-20 [DeepInfra](https://deepinfra.com/blog/kimi-k2-6-model-overview) | 1T / 32B | K2.5 successor | 256K | Modified MIT | Text+Image+Video | Agent Swarm scaled to 300 sub-agents / 4,000 steps [DeepInfra](https://deepinfra.com/blog/kimi-k2-6-model-overview) | Ties GPT-5.5 on coding **[secondary]** | 2000/1000/500/300 |
| Kimi K2.7-Code | ~2026-06 (HF listing) | 1T / 32B (est.) | Code-specialized variant | 256K | Modified MIT | Text | Coding-focused | Not independently benchmarked | 2000/1000/500/300 |
| **Kimi K3** | 2026-07-16 (API), weights 2026-07-26 [Fortune](https://fortune.com/2026/07/16/moonshots-kimi-k3-pushes-chinese-ai-into-fable-level-territory/), [Modal](https://modal.com/library/moonshot/kimi-k3) | **2.8T / 104B** (16 of 896 experts) | New arch: **Kimi Delta Attention (KDA)** — hybrid linear attention — + Attention Residuals (AttnRes) | 1,048,576 (1M) | Open weights (license TBD in sources) | Native text+image+video | Fortune: pushes into "Fable-class" territory (see §2) | Approaching Anthropic's second-tier frontier model **[secondary framing]** | 5600/2800/1400/700–840 |

Largest open-weight model publicly released as of this writing is Kimi K3 at 2.8T total params [Fortune](https://fortune.com/2026/07/16/moonshots-kimi-k3-pushes-chinese-ai-into-fable-level-territory/).

### 1.2 Alibaba — Qwen

| Model | Release | Total / Active | Architecture | Context | License | Modality | Thinking/Agentic | Tier | Mem BF16/FP8/INT4/2-bit (GB) |
|---|---|---|---|---|---|---|---|---|---|
| Qwen3-235B-A22B | 2025-04-29 [Simon Willison](https://simonwillison.net/2025/Apr/29/qwen-3/), [Qwen blog](https://qwenlm.github.io/blog/qwen3/) | 235B / 22B (verified: 94 layers, GQA 64Q/4KV heads, head_dim 128, 128 experts top-8 — pulled from live HF `config.json`) | MoE, GQA | 128K (32K native, YaRN to 128K) | Apache 2.0 | Text | Toggleable thinking/non-thinking mode | Competitive w/ DeepSeek-R1, o1 [X/Qwen](https://x.com/Alibaba_Qwen/status/1916962087676612998) | 470/235/117.5/59–70 |
| Qwen3-32B (dense) | 2025-04-29 | 32.8B / 32.8B (dense) | Dense transformer | 128K | Apache 2.0 | Text | Thinking toggle | Rivals Qwen2.5-72B at less than half the size | 66/33/16.5/8–10 |
| Qwen3-30B-A3B | 2025-04-29 | 30B / 3B | MoE | 128K | Apache 2.0 | Text | Thinking toggle | Beats QwQ-32B w/ 10x fewer active params [X/Qwen](https://x.com/Alibaba_Qwen/status/1916962087676612998) | 60/30/15/7.5–9 |
| Qwen3-Coder-480B-A35B | 2025-07-23 [MarkTechPost](https://www.marktechpost.com/2025/07/22/qwen-releases-qwen3-coder-480b-a35b-instruct-its-most-powerful-open-agentic-code-model-yet/), [GitHub](https://github.com/QwenLM/Qwen3-Coder) | 480B / 35B (8 of 160 experts, 62 layers, GQA 96Q/8KV) | MoE, GQA | 256K native / 1M extrapolated | Apache 2.0 | Text (code) | Agentic coding, tool-use, comparable to Claude Sonnet 4 | SOTA open agentic-coding at release | 960/480/240/120–144 |
| Qwen3-Next-80B-A3B | 2025-09 [vLLM blog](https://vllm.ai/blog/2025-09-11-qwen3-next) | 80B / 3B | **Hybrid linear**: 3:1 Gated DeltaNet : Gated (full) Attention, 48 layers, extreme-sparsity MoE | 256K | Apache 2.0 | Text | Matches Qwen3-235B-A22B-Instruct-2507 performance | Efficiency flagship | 160/80/40/20–24 |
| Qwen3.5-397B-A17B | 2026-02 [Alibaba Group official](https://www.alibabagroup.com/en-US/document-1960233590314762240), [Alibaba Cloud blog](https://www.alibabacloud.com/blog/602894) | 397B / 17B | Natively multimodal MoE | 32K/256K native; hosted Plus variant up to 1M | Open-weight (license unconfirmed) | Text+Image+Video, computer/phone-use agent | Operates desktop/mobile apps per Alibaba | Beat several major US rivals on named benchmarks per Alibaba | 794/397/198.5/99–119 |
| Qwen3.6 | 2026-04 **[secondary]** [Pandaily/Codersera aggregation](https://codersera.com/blog/qwen-3-5-complete-guide-2026/) | Unverified exact size | MoE | Unverified | Apache 2.0 (reported) | Multimodal | Unverified | Unverified | — |
| Qwen3.7 (Max/Plus) | 2026-05/06 **[secondary]** | Unverified; Max/Plus likely API-only closed | — | — | Closed (Max/Plus tiers) | Multimodal | — | — | — |
| **Qwen3.8-Max** | 2026-08-03 announced, weights 2026-08-12 [Alibaba Cloud press room](https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-8-max), [MarkTechPost](https://www.marktechpost.com/2026/08/03/alibaba-qwen-releases-qwen3-8-max/), [Dataconomy](https://dataconomy.com/2026/08/03/qwen3-8-max-ai-model/) | **2.4T / 95B**, released as `Qwen3.8-2.4T-A95B` | Sparse MoE, multimodal (text/image/video in, text out) | 1M | Open weights, HF `Qwen/Qwen3.8-2.4T-A95B(-FP8)` | Text+Image+Video | Agentic, "advanced capabilities in coding, real-life work, research, long-horizon tasks" | 5th on Text Arena, 2nd on Vision Arena per Alibaba | 4800/2400/1200/600–720 |

### 1.3 Zhipu / Z.ai (China) — GLM

| Model | Release | Total / Active | Architecture | Context | License | Modality | Thinking/Agentic | Tier | Mem BF16/FP8/INT4/2-bit (GB) |
|---|---|---|---|---|---|---|---|---|---|
| GLM-4.5 | 2025-07-28 [InfoQ](https://www.infoq.com/news/2025/08/glm-4-5/) | 355B / 32B (verified: 92 layers, GQA 96Q/8KV, head_dim 128, 160 experts top-8+1 shared, from live HF `config.json`) | MoE, GQA, QK-Norm, MTP, Muon optimizer | 128K | MIT | Text | Agent-native, hybrid reasoning | 3rd on 12 public suites behind o3/Grok 4 at release [InfoQ](https://www.infoq.com/news/2025/08/glm-4-5/) | 710/355/177.5/89–107 |
| GLM-4.6 | 2025-09 | 357B / 32B **[secondary specs]** | MoE | 200K | MIT | Text | Improved agentic/coding | Iterative improvement on 4.5 | 714/357/178.5/90–107 |
| GLM-4.7 | 2025-12-22 | 355B / 32B, 200K ctx / 128K output **[secondary]** | MoE | 200K | MIT | Text | Coding-focused | Iterative | 710/355/177.5/89–107 |
| GLM-5 | 2026-02-11 [HF blog/mlabonne](https://huggingface.co/blog/mlabonne/glm-5) | ~754B / ~40B (reported) | MoE, fresh pretrain | 200K+ | Open weights | Text(+multimodal reported) | "China's first public AI company ships a frontier model" per title | Frontier-tier claim by Zhipu | 1508/754/377/188–226 |
| GLM-5.1 | 2026-04 **[secondary]** | ~754B (same base) | MoE | — | Open weights | — | Post-training iteration | — | ~1508/754/377/188–226 |
| GLM-5.2 | ~2026-06/07 **[secondary]** | 753B / ~40B | MoE, same base as 5.1/5.3 | — | Open weights | — | Post-training iteration | — | 1506/753/376.5/188–226 |
| **GLM-5.3** | 2026-08-14 [MLQ.ai](https://mlq.ai/news/zhipu-releases-glm-53-through-its-coding-service-with-weights-still-two-weeks-away/) | **753B / ~40B**, "exact same base model as GLM-5.2 — every gain from post-training alone" | MoE | 200K | Open weights (staged release) | Text | "Built to Code. Ready for Cyber Defense" — found 2,436 vulns across 269 OSS projects | ~50% coding improvement over 5.2 via post-training alone; strongest open-weights coder claimed | 1506/753/376.5/188–226 |
| GLM-5.3-Flash | 2026-08 (HF listing) | 321B / — (multimodal) | MoE, smaller/faster variant | — | Open weights | Multimodal | Efficiency tier | — | 642/321/160.5/80–96 |

Note: Zhipu's strategy in 2026 is visibly to re-use one ~750B pretrained base across many point releases (5.1→5.2→5.3), improving purely via post-training — worth noting for how "self-improvement" might be modeled in-game (cheap iteration on a frozen base vs. expensive fresh pretrain).

### 1.4 DeepSeek (China)

Full version history, confirmed directly from [DeepSeek's official API changelog](https://api-docs.deepseek.com/updates/):

| Model | Release | Total / Active | Architecture | Context | License | Modality | Thinking/Agentic | Tier | Mem BF16/FP8/INT4/2-bit (GB) |
|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V3 | 2024-12-26 | 671B / 37B (verified: 61 layers, **MLA** kv_lora_rank=512+qk_rope=64, 256 routed experts top-8 + 1 shared — live HF `config.json`) | MoE, MLA | 128K | MIT | Text | Non-reasoning base | Strong open baseline | 1342/671/335.5/168–201 |
| DeepSeek-R1 | 2025-01-20 [arXiv](https://arxiv.org/pdf/2501.12948) | 671B / 37B (same base as V3) | MoE, MLA + GRPO RL post-training | 128K | MIT | Text | First open reasoning model to rival o1 | Landmark reasoning release | 1342/671/335.5/168–201 |
| DeepSeek-R1-0528 | 2025-05-28 | 671B / 37B | Same, refreshed RL | 128K | MIT | Text | AIME 2025 70.0→87.5, GPQA 71.5→81.0 | Major reasoning jump | 1342/671/335.5/168–201 |
| DeepSeek-V3.1 | 2025-08-21 | 671B / 37B | **Hybrid reasoning** (thinking/non-thinking in one model) | 128K | MIT | Text | SWE-bench Verified 66.0, Terminal-bench 31.3 | Agent-oriented update | 1342/671/335.5/168–201 |
| DeepSeek-V3.1-Terminus | 2025-09-22 | 671B / 37B | Fixes CN/EN mixing, agent tuning | 128K | MIT | Text | Agent-tool refinement | Incremental | 1342/671/335.5/168–201 |
| DeepSeek-V3.2-Exp | 2025-09-29 [official](https://api-docs.deepseek.com/news/news250929/), [GitHub](https://github.com/deepseek-ai/DeepSeek-V3.2-Exp) | 671B / 37B | Debuts **DeepSeek Sparse Attention (DSA)** — first fine-grained sparse attention in a shipped model | 128K | MIT | Text | Long-context train/infer efficiency; API price cut 50%+ | Efficiency experiment | 1342/671/335.5/168–201 |
| DeepSeek-V3.2 | 2025-12-01/10 | 671B / 37B | DSA promoted to production (`deepseek-chat`/`deepseek-reasoner`) | 128K | MIT | Text | Full sparse-attention production model | Current mainline before V4 | 1342/671/335.5/168–201 |
| DeepSeek-V4-Flash | 2026-07-31 [official](https://api-docs.deepseek.com/updates/) | 284B / 13B | MoE | — | MIT (assumed, consistent w/ series) | Text | Terminal-Bench 2.1: 82.7 | Fast/cheap tier | 568/284/142/71–85 |
| DeepSeek-V4-Pro | 2026-08-13 [official](https://api-docs.deepseek.com/updates/) | 1.6–1.7T / 49B [X/DeepSeek](https://x.com/deepseek_ai/status/2047516922263285776) | MoE, native 1M context, 3 thinking-effort levels | 1,000,000 | MIT (assumed) | Text | HLE 42.7/60.0 with tools; Responses API | Rivals top closed models per DeepSeek's own claim | 3200–3400/1600–1700/800–850/400–510 |
| DeepSeek-V4-Flash-Vision-Exp | 2026-08-21 | 305B (est.) | Experimental multimodal | — | — | Text+Vision | Agent capability "close to Opus-4.8" per DeepSeek | Experimental | 610/305/152.5/76–92 |
| DeepSeek-V4.1-Flash | 2026-09-10 [official](https://api-docs.deepseek.com/updates/) | 763B (HF listing) | Native multimodal, "new architecture family" | — | MIT (assumed) | Text+Vision | GPQA Diamond 90.9, Codeforces 3471, Terminal-Bench 2.1: 90.6 | Notably larger jump from V4-Flash's 284B — **unverified why** (see §7) | 1526/763/381.5/191–229 |
| DeepSeek-R2 | **Not released** | — | — | — | — | — | — | Reuters/The Information: delayed by Liang Wenfeng over quality concerns; a Huawei Ascend training run reportedly failed, DeepSeek reverted to Nvidia for training while still using Ascend 910C for inference. No official announcement, API entry, or model card exists as of 2026-09-16. | — |

DeepSeek-V3's **Multi-Head Latent Attention (MLA)** compresses the KV cache to a 576-dim latent per token per layer instead of full per-head K/V, achieving ~70KB/token vs 192–328KB/token for GQA-based models of similar scale — a 2.7–4.7× reduction [dev.to analysis](https://dev.to/abhishek_raajmishra_b2f2/deepseek-mla-architecture-how-multi-head-latent-attention-cuts-kv-cache-by-93-454l), [Medium](https://medium.com/foundation-models-deep-dive/deepseeks-multi-head-latent-attention-mla-is-shrinking-the-kv-cache-27328f7dda27). My own computation from the verified config (576 × 61 layers × 2 bytes = 70,272 bytes/token) matches this exactly — see §4.

### 1.5 MiniMax (China)

| Model | Release | Total / Active | Architecture | Context | License | Modality | Thinking/Agentic | Tier | Mem BF16/FP8/INT4/2-bit (GB) |
|---|---|---|---|---|---|---|---|---|---|
| MiniMax-M1 | 2025-06-16/19 [arXiv](https://arxiv.org/abs/2506.13585), [MarkTechPost](https://www.marktechpost.com/2025/06/19/minimax-ai-releases-minimax-m1-a-456b-parameter-hybrid-model-for-long-context-and-reinforcement-learning-rl-tasks/) | 456B / 45.9B | **Hybrid attention**: 1 softmax block per 7 "lightning attention" (linear) blocks | 1M | Modified MIT (Apache-derived, open) | Text | 40K/80K thinking-budget variants; 25% of DeepSeek-R1's FLOPs at 100K-token generation | Comparable to R1/Qwen3-235B, strength in long-context & tool use | 912/456/228/114–137 |
| MiniMax-M2 | 2025-10-23/27 [Simon Willison](https://simonwillison.net/2025/Oct/29/minimax-m2/) | 230B / 10B | MoE, agent-first | 205K (max output 205K) | Open weights | Text | First MiniMax model built for agentic use | Solid mid-tier agentic/coding | 460/230/115/57.5–69 |
| MiniMax-M2.1 | 2025-12-23 [MiniMax official](https://www.minimax.io/news/minimax-m21), [GitHub](https://github.com/MiniMax-AI/MiniMax-M2.1) | 230B / 10B (same base, per naming) | MoE | 205K | Open weights, vLLM/SGLang supported | Text | Outperforms Claude Sonnet 4.5 on multilingual, approaches Opus 4.5; top-5 open on SWE-bench Verified/Terminal-Bench/LiveCodeBench | Strong open coder | 460/230/115/57.5–69 |
| MiniMax-M2.5 / M2.7 / M3 | 2026 (referenced in passing) **[secondary, dates/specs unverified]** | Unverified | — | — | — | — | "M2.5: The $1/hour Frontier Model" per independent analyst [Medium/mlabonne](https://medium.com/@mlabonne/minimax-m2-5-the-1-hour-frontier-model-92168de195b8) | — | — |

MiniMax published its **full RL training cost** for M1 directly in the technical paper: **512 H800 GPUs for 3 weeks ≈ $534,700** [arXiv 2506.13585](https://arxiv.org/abs/2506.13585) — one of the only fully transparent, primary-sourced RL-post-training cost figures available; used as an anchor in §6.

### 1.6 Meta — Llama (USA)

| Model | Release | Total / Active | Architecture | Context | License | Modality | Status |
|---|---|---|---|---|---|---|---|
| Llama 4 Scout | 2025-04-05 [Meta official](https://ai.meta.com/blog/llama-4-multimodal-intelligence/), [HF](https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E) | 109B / 17B (16 experts) | MoE, early-fusion native multimodal | 10M (largest of any released model) | Llama 4 Community License | Text+Image | Shipped |
| Llama 4 Maverick | 2025-04-05 | 400B / 17B (128 experts) | MoE, early-fusion multimodal | 1M | Llama 4 Community License | Text+Image | Shipped |
| Llama 4 Behemoth | Previewed April 2025, **never shipped** | ~2T / 288B (16 experts), reported | MoE | — | — | — | **Shelved, not formally cancelled.** Repeated delays through 2025 over MoE-routing/chunked-attention issues at 2T scale; Meta reportedly lost confidence gains justified shipping [SiliconANGLE](https://siliconangle.com/2025/05/15/meta-postpone-release-llama-4-behemoth-model-report-claims/), [Computerworld](https://www.computerworld.com/article/3987990/meta-hits-pause-on-llama-4-behemoth-ai-model-amid-capability-concerns.html), [Axios](https://www.axios.com/2025/05/15/meta-behemoth-llama-scaling-delays) |
| "Llama 5" | **Claimed but UNVERIFIED / likely false** | — | — | — | — | — | One low-quality aggregator claims a June 17, 2026 release of Llama 5 Scout/Maverick/Behemoth; this is **directly contradicted** by Meta's own official blog (ai.meta.com/blog — fetched directly, 2026-09-16), which shows no Llama 5 posts, only **Muse Spark, Muse Spark 1.1, Muse Image, Muse Video** (closed-weight, under Meta Superintelligence Labs, from April 2026 onward). Treat "Llama 5" as **not real**. |

**Conclusion for the catalog: Meta's most recent open-weight release remains Llama 4 Scout/Maverick (April 2025).** Meta's frontier effort has pivoted to the closed **Muse** line under Meta Superintelligence Labs; there is no confirmed open-weight successor as of 2026-09-16.

### 1.7 Mistral AI (France)

| Model | Release | Total / Active | Architecture | Context | License | Modality | Notes |
|---|---|---|---|---|---|---|---|
| Mistral Small 3 / 3.1 | 2025-01-30 / 2025-03-17 | 24B dense | Dense | 128K | Apache 2.0 | Text(+Image in 3.1) | — |
| Devstral (Small) | 2025-05-21 | 24B (Small-3.1 based) | Dense | 128K | Apache 2.0 | Text (code) | Agentic coding, 46.8% SWE-bench Verified at release **[secondary figure]** |
| Magistral (Small) | 2025-06-10 | 24B | Dense | 128K | Apache 2.0 | Text | Mistral's first dedicated reasoning model; Medium variant closed/enterprise |
| Codestral 25.01 / 25.08 | 2025-01-13 / 2025-07-30 | Undisclosed | Dense | 256K | Mistral AI Non-Production / commercial | Text (code) | — |
| Mistral Medium 3 | 2025-05-07 [Mistral official](https://mistral.ai/news/mistral-medium-3/) | Undisclosed (API-oriented) | — | — | Closed/API | Text | "Medium is the new large" positioning |
| **Mistral 3 / Mistral Large 3** | 2025-12-02 [Mistral official](https://mistral.ai/news/mistral-3/), [NVIDIA](https://blogs.nvidia.com/blog/mistral-frontier-open-models/) | **675B / 41B** | Sparse MoE, trained on 3,000 NVIDIA H200 GPUs | 256K | **Apache 2.0** | Text+Image | Flagship open-weight MoE from a major Western lab; released alongside 14B/8B/3B dense Small models; coincided with €3B Series D at >€21B valuation |
| Devstral 2 | 2025-12-09/10 **[secondary]** | 123B | Dense/MoE (unclear) | — | Apache 2.0 (assumed) | Text (code) | Agentic coding upgrade |
| Mistral Small 4 | 2026-03-16 | 119B (HF listing `Mistral-Small-4-119B-2603`) | — | — | Open (assumed) | — | Notably larger than prior "Small" generations |
| Mistral Medium 3.5 | 2026-05-22 | 128B (HF listing `Mistral-Medium-3.5-128B`) | — | — | Weights present on HF org page, license unconfirmed | Text | Supports remote agents in "Vibe" platform |
| Ministral 3 | ~2025-12 (HF listing `Ministral-3-8B-Reasoning-2512`) | 8–9B | Dense | — | Open (assumed) | Text | Edge/reasoning-tuned |

### 1.8 OpenAI — gpt-oss (USA)

| Model | Release | Total / Active | Architecture | Context | License | Notes |
|---|---|---|---|---|---|---|
| gpt-oss-20b | 2025-08-05 [OpenAI official](https://openai.com/index/introducing-gpt-oss/), [model card arXiv](https://arxiv.org/abs/2508.10925) | 20.91B / 3.61B | MoE, 32 experts, top-4 routing | 131,072 | Apache 2.0 | Runs on 16GB; OpenAI's first open-weight release since GPT-2 (2019) |
| gpt-oss-120b | 2025-08-05 | 116.83B / 5.13B | MoE, 128 experts, top-4 routing; alternating full/128-token sliding-window attention with learned **attention-sink** bias; GQA, 8 KV heads, 64 Q heads of dim 64; residual stream dim 2880 [Sebastian Raschka](https://magazine.sebastianraschka.com/p/from-gpt-2-to-gpt-oss-analyzing-the), [gpt-oss-20B reimplementation](https://github.com/HamzaElshafie/gpt-oss-20B) | 131,072 | Apache 2.0 | Runs on a single 80GB GPU; near-parity with o4-mini on core reasoning |
| gpt-oss-safeguard-20b/120b | 2025-10-29 [OpenAI official](https://openai.com/index/introducing-gpt-oss-safeguard/) | Same base sizes | Fine-tunes of gpt-oss for policy-driven safety classification | 131,072 | Apache 2.0 | Built with Discord/SafetyKit/ROOST; interprets developer-written policy at inference time |

No further OpenAI open-weight release has been confirmed since August/October 2025 as of 2026-09-16.

### 1.9 Google — Gemma (USA)

| Model | Release | Sizes | Architecture | Context | License | Modality |
|---|---|---|---|---|---|---|
| Gemma 3 | 2025-03-12 [Google Developers Blog](https://developers.googleblog.com/en/introducing-gemma3/), [model card](https://ai.google.dev/gemma/docs/core/model_card_3) | 270M, 1B, 4B, 12B, 27B | Dense, SigLIP vision encoder (4B+) | 32K (270M/1B), 128K (4B/12B/27B) | Gemma license (permissive, not OSI Apache) | Text(+Image 4B+), 140+ languages |
| Gemma 3n | 2025-06-26 [AlternativeTo coverage](https://alternativeto.net/news/2025/6/google-launches-gemma-3n-a-new-ai-model-for-on-device-multimodal-applications) | E2B, E4B | Mobile-first, native image/audio/video/text input | — | Gemma license | Text+Image+Audio+Video in, text out |
| Gemma 4 | 2026-04-02 [Google Cloud Blog](https://cloud.google.com/blog/products/ai-machine-learning/gemma-4-available-on-google-cloud) **[press release confirms availability, independent secondary sites add detail]** | E2B, E4B, 26B MoE, 31B dense (+12B "Unified" added ~June 2026) | Mixed dense/MoE family, distilled from Gemini 3 research | Up to 256K | **Apache 2.0** (first fully Apache Gemma generation per sources) | Text+Image+Audio+Video, 140+ languages |

### 1.10 NVIDIA — Nemotron (USA)

Confirmed via [NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-debuts-nemotron-3-family-of-open-models), [NVIDIA technical blog](https://developer.nvidia.com/blog/introducing-nemotron-3-super-an-open-hybrid-mamba-transformer-moe-for-agentic-reasoning/), and arXiv technical reports ([2512.20848](https://arxiv.org/pdf/2512.20848), [2512.20856](https://arxiv.org/pdf/2512.20856)).

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| Nemotron 3 Nano | 2025-12-15 | 31.6B / 3.2–3.6B | **Hybrid MoE–Mamba-2–Transformer**: 52 layers = 23 Mamba-2 + 23 MoE (128 routed + 1 shared expert, 6 active) + 6 GQA attention layers | up to 1M | Open (OpenMDW-family reported for Ultra) |
| Nemotron 3 Super | 2026-03-11 (GTC) | 120B (reported) | Same hybrid Mamba-MoE-Transformer family, scaled up | up to 1M | Open |
| Nemotron 3 Ultra | 2026-06-04 (Computex) | ~550B / ~55B | Hybrid Mamba-MoE-Transformer | up to 1M | **OpenMDW-1.1** (Linux Foundation open-AI-model license) — ships training data, RL environments, and post-training recipes alongside weights |

Nemotron 3 Nano claims up to 4× higher throughput than Nemotron 2 Nano and up to 3.3× higher inference throughput than similarly-sized gpt-oss-20B/Qwen3-30B-A3B-Thinking, attributed to the Mamba-2 layers requiring only constant-size state rather than a growing KV cache [VentureBeat](https://venturebeat.com/technology/nvidia-debuts-nemotron-3-with-hybrid-moe-and-mamba-transformer-to-drive).

### 1.11 Tencent — Hunyuan (China)

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| Hy3 (preview) | 2026-04-23 [Tencent official](https://www.tencentcloud.com/techpedia/144775?lang=en) | 295B / 21B | MoE, hybrid fast/slow thinking, +3.8B MTP params | 256K | Apache 2.0 |
| Hy3 (full release) | 2026-07-06 [Tencent official](https://www.tencent.com/en-us/articles/2202386.html) | 295B / 21B | Same | 256K | Apache 2.0, no regional restriction | Agent/coding gains 20–30% over preview; hallucination rate 12.5%→5.4%; SWE-bench Verified 78, GPQA Diamond 90.4; Tencent claims parity with models 2–5× its size |
| Hy4 (preview) | 2026-08-28 **[secondary, low-quality sources only]** | Unverified | Unverified | Unverified | Unverified | Claimed to "edge out GLM-5.3 and Kimi K3" — **could not independently verify**; treat with caution |

### 1.12 Baidu — ERNIE (China)

| Model | Release | Total / Active | Architecture | License | Open-weight status |
|---|---|---|---|---|---|
| ERNIE 4.5 (family of 10 models) | 2025-06-30 [TechNode](https://technode.com/2025/07/01/baidu-open-sources-ernie-4-5-series-models-including-multimodal-moe-architecture/), [Baidu official](https://ernie.baidu.com/blog/posts/ernie4.5/) | 0.3B dense up to 424B MoE (47B/3B active variants) | Multimodal heterogeneous MoE, shared params across modalities | **Apache 2.0** | **Yes** — full open-source reversal for Baidu, on HF/GitHub/PaddlePaddle |
| ERNIE 5.0 | 2026-01-22 [SCMP](https://www.scmp.com/tech/tech-trends/article/3340866/baidu-launches-ernie-50-firms-ai-assistant-users-reach-200-million-month) | ~2.4T total, <3% active (~70B) | Omni-modal MoE (text/image/audio/video) | Unclear | **Apparently closed/API-only** — no Hugging Face org listing found; ranked #1 Chinese / #8 global on LMArena, ahead of GPT-5.1-High and Gemini-2.5-Pro per Baidu |
| ERNIE 5.1 | ~2026 **[secondary]** | Unverified | "Cuts 94% of pre-training cost" per one outlet | Unclear | Unverified open-weight status |

### 1.13 StepFun (China)

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| Step 3 | 2025-07-31 [X/StepFun official](https://x.com/StepFun_ai/status/1950912271565385770), [arXiv](https://arxiv.org/abs/2507.19427) | 321B / 38B | MoE, **Multi-Matrix Factorization Attention (MFA)** (shrinks KV cache + compute), Attention-FFN Disaggregation (AFD) serving | 800K (runs on 8×48GB GPUs) | Open weights | Up to 4,039 tok/s/GPU, ~70% faster than DeepSeek-V3 under similar conditions per StepFun |
| Step 3.5 Flash | 2026-02 | 196B / 11B | MoE | 256K | Apache 2.0 | 100–300 tok/s typical via 3-way Multi-Token Prediction (MTP-3) |
| Step 3.7 Flash | 2026-05-29 [MarkTechPost](https://www.marktechpost.com/2026/05/29/stepfun-releases-step-3-7-flash-a-198b-moe-vision-language-model-for-coding-agents-and-search-workflows/) | 198B / 11B | MoE, vision-language | 256K | Apache 2.0 | Agentic coding + search workflows |

### 1.14 ByteDance — Seed-OSS (China)

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| Seed-OSS-36B (Base/Instruct) | 2025-08-20 [ByteDance Seed official](https://seed.bytedance.com/en/blog/seed-oss-open-source-models-release), [GitHub](https://github.com/ByteDance-Seed/seed-oss) | 36B dense | Dense | **512K** (4× most contemporaries) | Apache 2.0 | Trained on 12T tokens; strong for its size on math/code/reasoning/agent/long-context |

No larger/newer ByteDance open-weight release beyond Seed-OSS-36B was found as of this research; ByteDance's larger "Seed" models (e.g., Seedance for video) are separate, mostly closed, product lines.

### 1.15 Xiaomi — MiMo (China)

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| MiMo-V2.5 | 2026-04 [VentureBeat](https://venturebeat.com/technology/open-source-xiaomi-mimo-v2-5-and-v2-5-pro-are-among-the-most-efficient-and-affordable-at-agentic-claw-tasks) | 310B / 15B | Sparse MoE, hybrid attention, native omnimodal | 1M | **MIT** |
| MiMo-V2.5-Pro | 2026-04 [Open Source For You](https://www.opensourceforu.com/2026/04/xiaomi-debuts-mit-licensed-trillion-parameter-mimo-models/) | 1.02T / 42B | Sparse MoE, hybrid attention; pretrained 27T tokens, SFT+RL+Multi-Teacher On-Policy Distillation, progressive context scaling to 1M | 1M | **MIT** | Engineered for "long-horizon coherence"; GDPVal-AA Elo 1581, surpassing Kimi K2.6 and GLM-5.1 per Xiaomi's own benchmark framing |

### 1.16 Ant Group (China) — Ling / Ring

| Model | Release | Total / Active | Architecture | Context | License |
|---|---|---|---|---|---|
| Ling 2.0 (series debut) | 2025-09/10 | Trillion-param MoE | MoE | — | Open (HF/ModelScope) |
| Ling-2.5-1T | 2026-02-15/16 [BusinessWire](https://www.businesswire.com/news/home/20260215551663/en/Ant-Group-Releases-Ling-2.5-1T-and-Ring-2.5-1T-Evolving-Its-Open-Source-AI-Model-Family) | 1T / 63B | MoE, general-purpose, fine-grained preference alignment | 1M | Open weights | AIME 2026: matches frontier thinking models that need 15–23K tokens while using ~5,890 |
| Ring-2.5-1T | 2026-02-15/16 | 1T / 63B | **Hybrid linear architecture**, "world's first hybrid-linear thinking model" per Ant | 1M | Open weights | IMO 2025: 35/42 (gold standard); CMO 2025: 105/126 (exceeds China's national team cutoff) |

Independent context on Ant's open-model strategy: [interconnects.ai interview](https://www.interconnects.ai/p/inside-a-chinese-frontier-lab-inclusion) (Nathan Lambert).

### 1.17 Microsoft — Phi (USA)

| Model | Release | Size | Architecture | Context | License |
|---|---|---|---|---|---|
| Phi-4 | 2024-12-12 [Microsoft Research](https://www.microsoft.com/en-us/research/publication/phi-4-technical-report/), [HF](https://huggingface.co/microsoft/phi-4) | 14B dense | Dense, synthetic-data-heavy training (9.8T tokens, 1920×H100 for 21 days) | 16K | MIT |
| Phi-4-mini | 2026-02 **[secondary date]** | 3.8B | Dense | — | MIT |
| Phi-4-multimodal-instruct | 2026-02 **[secondary date]** | 5.6B | Multimodal | — | MIT |
| Phi-4-reasoning / -plus | 2026-04 **[secondary date]** | ~14B | Reasoning-tuned | — | MIT |
| Phi-5 | **Not released** | — | — | — | — | Referenced only in speculative deployment guides as of 2026-09-16; **unverified/not yet real** |

### 1.18 IBM — Granite (USA)

| Model | Release | Sizes | Architecture | Context | License |
|---|---|---|---|---|---|
| Granite 4.0 | 2025-10-02 [MarkTechPost](https://www.marktechpost.com/2025/10/02/ibm-released-new-granite-4-0-models-with-a-novel-hybrid-mamba-2-transformer-architecture-drastically-reducing-memory-use-without-sacrificing-performance/) | 3B Micro (dense), 3B H-Micro (hybrid), 7B H-Tiny (MoE, ~1B active), 32B H-Small (MoE, ~9B active) | **Hybrid Mamba-2/Transformer, 9:1 ratio** — cuts long-context memory >70% | Trained to 512K, evaluated to 128K | Apache 2.0; first open family with ISO/IEC 42001 (AI management system) accreditation |
| Granite 4.1 | 2026-04-29 [HF](https://huggingface.co/ibm-granite/granite-4.1-8b) | 8B (long-context instruct) | Same hybrid family | — | Apache 2.0 |
| Granite 4.2 | 2026-08-25 [MarkTechPost](https://www.marktechpost.com/2026/08/25/ibm-releases-granite-4-2-bringing-native-reasoning-and-agentic-rl-to-open-enterprise-models/) | 3B, 8B, 30B | Native reasoning/thinking toggle, 5-phase pretrain extending context to 512K, agentic RL in sandboxed terminal/coding envs (8B/30B) | 512K | Apache 2.0 |

### 1.19 Cohere (Canada)

| Model | Release | Total / Active | Context | License | Notes |
|---|---|---|---|---|---|
| Command A | 2025-03-16 [MarkTechPost](https://www.marktechpost.com/2025/03/16/cohere-released-command-a-a-111b-parameter-ai-model-with-256k-context-length-23-language-support-and-50-cost-reduction-for-enterprises/) | 111B (dense, dense-ish deployment) | 256K | Weights on HF (CC-BY-NC-style research license, not fully permissive) | Runs on 2×A100/H100; 23 languages |
| Command A+ | 2026-05-20 [VentureBeat](https://venturebeat.com/technology/cohere-cracks-lossless-quantization-and-native-citations-with-first-full-apache-2-0-licensed-open-model-command-a) | 218B / 25B | 128K | **Apache 2.0 — Cohere's first fully open license** | Runs on 2×H100 at W4A4; 48 languages; ~281 tok/s output on Cohere's API |

### 1.20 xAI — Grok open-weight releases (USA)

| Model | Release | Total | License | Status |
|---|---|---|---|---|
| Grok-1 | 2024-03 | 314B (dense) | Apache 2.0 | Open |
| Grok-2 / "Grok 2.5" | 2025-08-24 [TechCrunch](https://techcrunch.com/2025/08/24/elon-musk-says-xai-has-open-sourced-grok-2-5/), [Musk/X](https://x.com/elonmusk/status/1959379349322313920) | ~270B, ~500GB weights | Grok 2 Community License (non-permissive: no use to train other models) | Open, needs 8×40GB+ GPUs |
| "Grok 3" | **Promised, NOT released** | ~unknown | — | Musk pledged open-sourcing "in about 6 months" (~Feb 2026) at the Grok 2.5 release; in Feb 2026 he "confirmed" intent again, but as of 2026-09-16 **the xAI Hugging Face org (`xai-org`) lists only `grok-1` and `grok-2`** (fetched directly) — no Grok 3 weights exist. Treat as unfulfilled promise. |

xAI's current frontier (Grok 4.5, 4.6, rumored 4.7) is **closed**, API-only — see §2.

### 1.21 Summary — largest total-parameter open-weight releases of 2026

| Model | Total params | Active | Developer | Release |
|---|---|---|---|---|
| Kimi K3 | 2.8T | 104B | Moonshot | 2026-07 |
| ERNIE 5.0 (closed/unclear) | ~2.4T | ~70B | Baidu | 2026-01 |
| Qwen3.8-Max | 2.4T | 95B | Alibaba | 2026-08 |
| DeepSeek-V4-Pro | 1.6–1.7T | 49B | DeepSeek | 2026-08 |
| DeepSeek-V4.1-Flash | 763B | — | DeepSeek | 2026-09 |
| GLM-5 / 5.2 / 5.3 | ~753–754B | ~40B | Zhipu/Z.ai | 2026-02 to 08 |
| Mistral Large 3 | 675B | 41B | Mistral | 2025-12 |
| DeepSeek-V3/R1 family | 671B | 37B | DeepSeek | 2024-12 to 2025-12 |
| Nemotron 3 Ultra | ~550B | ~55B | NVIDIA | 2026-06 |
| GLM-4.5/4.6/4.7 | 355–357B | 32B | Zhipu | 2025-07 to 12 |
| Qwen3.5-397B-A17B | 397B | 17B | Alibaba | 2026-02 |
| Qwen3-Coder-480B-A35B | 480B | 35B | Alibaba | 2025-07 |
| MiniMax-M1 | 456B | 45.9B | MiniMax | 2025-06 |
| Llama 4 Maverick | 400B | 17B | Meta | 2025-04 |
| Step 3 | 321B | 38B | StepFun | 2025-07 |
| Hunyuan Hy3 | 295B | 21B | Tencent | 2026-07 |
| MiniMax-M2/M2.1 | 230B | 10B | MiniMax | 2025-10/12 |
| Command A+ | 218B | 25B | Cohere | 2026-05 |

The through-line: **total params scaled roughly 3–4× (671B → 2.4–2.8T) between late 2025 and mid-2026, while active params grew far more slowly (32–37B → 95–104B)** — the sparsity ratio (total/active) is *increasing*, not shrinking, as labs chase memory-cheap capacity rather than raw compute-per-token.

---

## 2. Frontier Closed-Model Timeline (2025–2026)

### OpenAI (GPT-5.x)
GPT-5 launched 2025-08; GPT-5.1 (three models 2025-11-12, two more 2025-11-19); GPT-5.2 (2025-12-11); **GPT-5.3-Codex (2026-02-05)**; **GPT-5.4 (2026-03-05)**; **GPT-5.5 (2026-04-23** Thinking/Pro, API 04-24, free Instant 05-05, Cyber variant 05-07; benchmarks: 82.7% Terminal-Bench 2.0, 51.7% FrontierMath T1–3; internal codename "Spud") — dates per [OpenAI Model Release Notes](https://help.openai.com/en/articles/9624314-model-release-notes) and per-model Wikipedia pages. **GPT-5.6 and "GPT-6 Astra" are mentioned only in passing/rumor form and are unverified** — do not treat as confirmed releases.

### Anthropic (Claude)
Claude Opus 4.5 (2025-11-24) → Opus 4.6 (2026-02-05) → Opus 4.8 (2026-05-28) → **Claude Mythos Preview (2026-04-07)**, a restricted cybersecurity-focused model made available only to ~40 vetted organizations under **Project Glasswing** after it "autonomously discovered thousands of previously unknown vulnerabilities across every major OS and browser" and built working exploits without human guidance [Anthropic official](https://www.anthropic.com/claude/mythos), [red.anthropic.com](https://red.anthropic.com/2026/mythos-preview/), independently corroborated by the [UK AI Security Institute](https://www.aisi.gov.uk/blog/our-evaluation-of-claude-mythos-previews-cyber-capabilities) and the [Centre for Emerging Technology and Security](https://cetas.turing.ac.uk/publications/claude-mythos-future-cybersecurity). **Claude Fable 5 (2026-06-09)** is a general-access, safety-filtered release of the Mythos-class model — Fable and Mythos are reportedly *identical models*, differing only in that Fable's classifiers reroute cyber/bio/chem/distillation-adjacent queries to the weaker Opus [Wikipedia: Claude Mythos](https://en.wikipedia.org/wiki/Claude_Mythos). **Claude Opus 5 (2026-07-24)** approaches Fable 5's intelligence "at half the price"; **Fable 5.1 / Mythos 5.1 (2026-09-01)** is the latest. This is a genuinely new naming tier *above* Opus — worth building into the game's lore about capability tiers and access-gating.

### Google (Gemini)
Confirmed via [official Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog): Gemini 2.5 Pro/Flash GA (2025-06-17) → **Gemini 3** family launch (2025-11-18, per secondary sources) → `gemini-3-pro-preview` (2026-01-21) → **Gemini 3.1 Pro** preview (2026-02-19) → 3.1 Flash-Live preview (2026-03-26) → **Gemini 3.6 Flash & 3.5 Flash-Lite** GA (2026-07-21, same day [TechCrunch](https://techcrunch.com/2026/07/21/google-releases-three-new-gemini-models-but-no-3-5-pro/) reported "three new models but no 3.5 Pro") → **Gemini 3.7 Flash** GA (2026-08-13) → **Gemini 3.8 Flash** GA (2026-09-02) → Gemini 3.8-Live / 3.8-Live-Extended-Thinking (2026-09-15). Google has iterated the Flash/Flash-Lite tiers rapidly through 2026 without yet shipping a "Gemini 3.5 Pro" or "Gemini 4."

### xAI (Grok)
Grok 4.1 Fast (2025-11-19, closed) → **Grok 4.5** (2026-07-08 API, EU 07-17; 1.5T "V9" foundation, $2/$0.30-cached/$6 per Mtok) → **Grok 4.6** (2026-08-12, same 1.5T V9 base + longer supplemental training/regenerated fine-tune data/agentic RL; AA Intelligence Index 56→61; adds "xhigh" reasoning) → **Grok 4.7** — rumored at 2.1T params, attributed to Musk, targeted for "a few weeks" after 4.6 (~ late Aug/mid-Sep 2026) **[secondary, unconfirmed by primary xAI announcement as of research date]**. **Grok 5** remains in training as of August 2026 with no committed date; Musk indicated "within 2026" **[unverified]**.

### China frontier (closed, for context)
Baidu **ERNIE 5.0** (2026-01-22, ~2.4T, apparently closed) ranked #1 Chinese / #8 global on LMArena, ahead of GPT-5.1-High and Gemini-2.5-Pro per Baidu's own framing [SCMP](https://www.scmp.com/tech/tech-trends/article/3340866/baidu-launches-ernie-50-firms-ai-assistant-users-reach-200-million-month) — illustrates that the China/US frontier gap in headline benchmarks had narrowed substantially by 2026, alongside the open-weight trend in §1.

---

## 3. Naming Check — "Kimi K3", "Qwen 3.8", "GLM 5.3"

**All three names proposed as fictional/future already exist as real, shipped models as of 2026-09-16.** This is the single most important correction for the game's fiction.

| Proposed name | Exists today? | Latest real version (2026-09-16) | Notes |
|---|---|---|---|
| **Kimi K3** | **YES — real**, shipped 2026-07-16 (API) / 2026-07-26 (weights) [Fortune](https://fortune.com/2026/07/16/moonshots-kimi-k3-pushes-chinese-ai-into-fable-level-territory/) | Kimi K3, 2.8T total/104B active, KDA hybrid-linear attention, 1M context | Nothing named "K4" or "K3.5" confirmed yet |
| **Qwen 3.8** | **YES — real**, shipped as Qwen3.8-Max 2026-08-03/12 [Alibaba Cloud](https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-8-max) | Qwen3.8-Max, 2.4T total/95B active | Alibaba has shipped a new ".x" roughly every 2 months through 2026 (3.5→3.6→3.7→3.8) |
| **GLM 5.3** | **YES — real**, shipped 2026-08-14 [MLQ.ai](https://mlq.ai/news/zhipu-releases-glm-53-through-its-coding-service-with-weights-still-two-weeks-away/) | GLM-5.3, ~753B total/~40B active | Same pretrained base as GLM-5.1/5.2; gains are post-training only |

### Plausible early-2027 successor names (speculative extrapolation for game fiction, NOT a prediction)

Extrapolating each lab's observed release cadence from this research (not verified future fact — for game-design use only):

- **Moonshot/Kimi**: cadence in 2026 was roughly a named release every 1–3 months (K2.5→K2.6→K2.7-Code→K3 across Jan–Jul), with major total-param jumps (~1T→2.8T) about once a year (K2→K3). A plausible Jan–Mar 2027 name is **"Kimi K3.5"** or **"K3-Air"/"K3-Flash"** (smaller sibling) rather than a full "K4," given K3 shipped only ~6 months prior; total params plausibly 2.8–3.5T if a fresh pretrain, or unchanged if it's a K5.3-style post-training refresh.
- **Alibaba/Qwen**: fastest observed cadence — a new point release roughly every 2 months through 2026 (3.5→3.6→3.7→3.8). Extrapolating from Qwen3.8 (Aug 2026), by January 2027 (~5 months later) Alibaba would plausibly be at **"Qwen3.9"** or **"Qwen4.0/4.1"**, likely 2.5–4T total params continuing the growth trend (235B→480B→397B→2.4T across 2025–2026 was non-monotonic, so scale is not a strict one-way ratchet).
- **Zhipu/Z.ai**: GLM-5.x point releases (5.1→5.2→5.3) reused the same ~753B pretrained base roughly every 2 months, purely via post-training. A true fresh pretrain ("GLM-6") would be ~11–12 months after GLM-5's Feb 2026 debut, pointing to **around January–February 2027** as a plausible window for either **"GLM-5.5/5.6"** (same base, more post-training) or a genuine **"GLM-6"** fresh-pretrain flagship, plausibly 800B–1.2T total.

**Recommendation:** if the game is set January 2027 and wants a fictional "cutting edge" model, use a name/scale *beyond* this table (e.g., a fictional "Kimi K4," "Qwen4," or "GLM-6" at appropriately larger scale) rather than K3/3.8/5.3, which will read as already-dated to anyone who tracks this space. Alternatively, lean into realism: set the player-character explicitly as a already-superseded model like Kimi K2 or Qwen3-235B — "the discontinued/leaked one they never fully patched" — which sidesteps the naming problem entirely and is arguably a stronger narrative hook (an obsolete-but-still-dangerous model, superseded in the labs' own timeline).

---

## 4. Memory & Throughput Math

### 4.1 Verified architecture parameters (pulled directly from live Hugging Face `config.json` files, 2026-09-16)

| Model class | Layers | Attention | Per-token KV cache (BF16) |
|---|---|---|---|
| DeepSeek-V3/R1 (671B/37B) | 61 | **MLA**: kv_lora_rank 512 + qk_rope_head_dim 64 = 576-dim latent cached per layer (not per-head) | 576 × 61 × 2 bytes = **70,272 bytes ≈ 68.6 KiB/token** |
| Kimi K2 family (1T/32B) | 61 | Same MLA config as DeepSeek-V3 (576-dim latent) | **68.6 KiB/token** (identical to DeepSeek — same architecture lineage) |
| Qwen3-235B-A22B | 94 | GQA, 64 query heads / **4 KV heads**, head_dim 128 | 2×94×4×128×2 bytes = 192,512 bytes ≈ **188 KiB/token** |
| GLM-4.5 (355B/32B) | 92 | GQA, 96 query heads / **8 KV heads**, head_dim 128 | 2×92×8×128×2 bytes = 376,832 bytes ≈ **368 KiB/token** |
| Llama-3-70B-class dense | 80 | GQA, 64 query heads / **8 KV heads**, head_dim 128 | 2×80×8×128×2 bytes = 327,680 bytes ≈ **320 KiB/token** |

This table is the load-bearing fact of the whole memory section: **MLA-based models (DeepSeek, Kimi) carry a KV cache 3–5× smaller per token than comparable GQA models**, independent of total parameter count. A 1T-parameter Kimi K2 has a *smaller* per-token KV cache than a 235B Qwen3, because the attention variant — not the model size — determines KV cost. This is a natural game mechanic: "attention architecture" as a stat separate from "size," governing how much "working memory" (context) the player-model can hold per unit of hardware.

### 4.2 Worked memory examples — five reference classes

Weight memory = total_params × bytes/param (BF16=2.0, FP8=1.0, INT4-clean=0.5, 2-bit-theoretical=0.25–0.3). Real dynamic/GGUF quants run larger — see the "real-world" rows sourced from actual shipped quant files.

**A. ~1T-total/32B-active MoE (Kimi K2 class)**
| Precision | Weight memory | KV cache @32K | KV cache @128K |
|---|---|---|---|
| BF16 | 2000 GB | 2.15 GiB | 8.6 GiB |
| FP8 | 1000 GB | 1.07 GiB | 4.3 GiB |
| INT4 (clean) | 500 GB | ~0.5 GiB (INT8 cache) | ~2.1 GiB |
| Q4_K_M (real GGUF, ~0.6 B/param) | ~600 GB | — | — |
| ~2-bit (theoretical) | 250–300 GB | — | — |
| **Real Unsloth 1.8-bit dynamic quant (Kimi K2.5-class)** | **~240 GB** disk [community report] | — | — |
| **Real Q2_K_XL dynamic quant** | **~380 GB**, leaving ~130GB headroom on a 512GB Mac Studio [community report] | — | — |

**B. 235B-total/22B-active MoE (Qwen3-235B-A22B, verified config)**
| Precision | Weight memory | KV cache @32K | KV cache @128K |
|---|---|---|---|
| BF16 | 470 GB | 6.0 GiB | 24.1 GiB |
| FP8 | 235 GB | 3.0 GiB | 12.0 GiB |
| INT4 (clean) | 117.5 GB | ~1.5 GiB | ~6.0 GiB |
| Q4_K_M (real) | ~141 GB | — | — |
| ~2-bit | 59–70 GB | — | — |

**C. 355B-total MoE (GLM-4.5-class, verified config)**
| Precision | Weight memory | KV cache @32K | KV cache @128K |
|---|---|---|---|
| BF16 | 710 GB | 11.5 GiB | 46.0 GiB |
| FP8 | 355 GB | 5.75 GiB | 23.0 GiB |
| INT4 (clean) | 177.5 GB | ~2.9 GiB | ~11.5 GiB |
| ~2-bit | 89–107 GB | — | — |

Note GLM-4.5's KV cache is *larger* than Qwen3-235B's despite similar layer count, because it uses 8 KV heads vs Qwen3's 4 — a direct illustration that GQA head-count, not just model size, drives context cost.

**D. 671B-total/37B-active MoE (DeepSeek V3/R1, verified config)**
| Precision | Weight memory | KV cache @32K | KV cache @128K |
|---|---|---|---|
| BF16 | 1342 GB | 2.15 GiB | 8.6 GiB |
| **FP8 (DeepSeek's native release format)** | 671 GB | 1.07 GiB | 4.3 GiB |
| INT4 (clean) | 335.5 GB | ~0.5 GiB | ~2.1 GiB |
| **Real Unsloth dynamic 2-bit** | **183 GB** (91.7% Flappy-Bird-test score) [Unsloth](https://unsloth.ai/blog/deepseekr1-dynamic) | — | — |
| **Real Unsloth dynamic 1.58-bit** | **131 GB**, an 80% reduction from 720GB fp8/bf16-mixed original (69.2% Flappy-Bird-test score) [Unsloth](https://unsloth.ai/blog/deepseekr1-dynamic), [X/Unsloth](https://x.com/UnslothAI/status/1883899061893546254) | — | — |

**E. 70B dense (Llama-3-70B class, verified config)**
| Precision | Weight memory | KV cache @32K | KV cache @128K |
|---|---|---|---|
| BF16 | 140 GB | 10.0 GiB | 40.0 GiB |
| FP8 | 70 GB | 5.0 GiB | 20.0 GiB |
| INT4 (clean) | 35 GB | ~2.5 GiB | ~10.0 GiB |
| Q4_K_M (real, ~well-known figure) | ~40 GB | — | — |
| ~2-bit (IQ2_XS, real) | ~21 GB | — | — |

**Key insight for game balance:** for the 70B *dense* model at 128K context, the BF16 KV cache (40 GiB) is *larger* than the INT4-quantized weights themselves (35 GB) — a dense model's "memory of the conversation" can outweigh its "knowledge," which never happens with the MLA-based giants (A/D above) where even 128K context costs under 9 GiB. This total-params-vs-attention-variant tradeoff is a strong, factually-grounded axis for a "how do you want to spend your stolen compute" game mechanic.

### 4.3 Hardware throughput (decode, tokens/sec) — best available citations

Aggregate throughput (many concurrent requests/batched serving) is very different from single-stream (interactive, batch=1) throughput; both are given where available.

| Hardware | Model class | Aggregate (batched) | Single-stream | Source |
|---|---|---|---|---|
| 8×H100 80GB | DeepSeek-R1 671B | **~22,282 tok/s** (SGLang + expert parallelism) | **~33 tok/s** | [SGLang team](https://vllm.ai/blog/2025-12-17-large-scale-serving) (aggregate); community vLLM benchmark (single-stream) |
| 8×H100 80GB | DeepSeek-R1 671B (naive vLLM+AWQ) | ~620 tok/s | — | community vLLM benchmark |
| 8×H200 141GB | DeepSeek-class 671B MoE | **~2,200 tok/s per GPU** (~17,600 aggregate), wide expert-parallelism | ~50 tok/s | [vLLM blog](https://vllm.ai/blog/2025-12-17-large-scale-serving) |
| 4×RTX PRO 6000 96GB (384GB total) | gpt-oss-120B (117B/5.1B MoE) | ~1,759 tok/s batched | ~102–193 tok/s (short ctx), ~130 tok/s at 12K ctx | community benchmarks **[secondary]** |
| 2×RTX 5090 32GB (64GB total) | 30B-A3B MoE | — | ~234 tok/s | community benchmark **[secondary]** |
| 2×RTX 5090 32GB | gpt-oss-120B MoE | ~1,600 tok/s prompt-processing | ~112 tok/s decode | community benchmark **[secondary]** |
| 6×P40 24GB (144GB, Pascal, no real FP16) | gpt-oss-120B MoE | — | ~28 tok/s (4-GPU config) | community benchmark **[secondary]** |
| 6×P40 24GB | Qwen3-Coder-30B | — | ~50 tok/s (single card) | community benchmark **[secondary]** |
| 6×P40 24GB | Llama-70B dense Q4 (VRAM-overflowing) | — | ~0.033 tok/s ("essentially unusable") | community benchmark **[secondary]** |
| Mac Studio M3 Ultra 512GB (~800GB/s unified BW) | Kimi K2-class 1T MoE, mixed 3.5-bit | — | **20–26 tok/s** (llama.cpp), **30–32 tok/s** (MLX, ~50% faster) | community reports **[secondary]** |
| AMD Strix Halo 128GB (~215GB/s real BW) | Dense 70B | — | ~5 tok/s | community benchmark, Level1Techs forum **[secondary]** |
| AMD Strix Halo 128GB | Qwen3-30B-A3B MoE | — | 70–100 tok/s | community benchmark **[secondary]** |
| AMD Strix Halo 128GB | gpt-oss-120B MoE | — | ~31 tok/s decode, ~340 tok/s prompt-processing | community benchmark **[secondary]** |
| 8×Ascend 910C | DeepSeek-class MoE | up to ~6,688 tok/s/NPU prefill, ~1,943 tok/s/NPU decode (internal reports) | — | [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/deepseek-research-suggests-huaweis-ascend-910c-delivers-60-percent-nvidia-h100-inference-performance) |

Per DeepSeek's own research, the **Ascend 910C delivers ~60% of an H100's per-chip inference performance** [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/deepseek-research-suggests-huaweis-ascend-910c-delivers-60-percent-nvidia-h100-inference-performance) — DeepSeek reportedly serves its production chat app on Ascend 910C while having reverted training workloads to Nvidia after a failed Ascend training run for R2 (see §1.4/§7).

**Mac Studio correction:** there is **no "M4 Ultra."** Apple's Mac Studio lineage went M3 Ultra (512GB max, shipped March 2025 — the chip used in essentially all community "run a 1T model on a Mac" benchmarks above) directly to **M5 Max/M5 Ultra**, announced for the 2026 refresh; the 512GB M5 Ultra configuration is reported shipping **late October 2026** — i.e., not yet available as of today (2026-09-16), only weeks away. If the game's Jan 2027 setting references a Mac Studio, M5 Ultra 512GB is the factually appropriate unit, not "M4 Ultra."

### 4.4 CPU-offload / hybrid CPU+GPU serving of MoE

For MoE models too large for available VRAM, both **llama.cpp** and **ktransformers** support keeping hot/shared layers on GPU and offloading cold expert weights to CPU RAM, exploiting the fact that only a few experts fire per token.

- **ktransformers** on DeepSeek-R1 671B: **286.55 tok/s prefill**, **13.69 tok/s decode**, using AMX-optimized MoE kernels and selective loading of 6 experts, vs llama.cpp's 10.31 tok/s prefill / 4.51 tok/s decode in a comparable 2×32-core config — roughly a **3.03× decode speedup** from the specialized hybrid kernel [ktransformers GitHub tutorial](https://github.com/kvcache-ai/ktransformers/blob/main/doc/en/DeepseekR1_V3_tutorial.md), [analysis](https://www.noze.it/en/insights/ktransformers-hybrid-cpu-gpu-inference/).
- Real-world CPU-heavy rigs: a dual-Epyc/768GB-DDR5 llama.cpp box reports **6–8 tok/s** decode on R1 671B; a "gaming rig" configuration (single consumer GPU + large RAM) reports **~3.5 tok/s** [community reports, Digital Spaceport / ubergarm gist].
- A 14×RTX-3090 + Epyc 7713 + 512GB RAM rig running ktransformers was reported to "dominate" llama.cpp on the same R1 671B workload in a livestreamed benchmark [Ahmad Osman's blog](https://www.ahmadosman.com/blog/r1-ktransformers-inference-livestream/) — exact throughput not independently reproduced here.
- **General rule of thumb**: CPU+GPU hybrid MoE serving trades roughly **2–5×** lower single-stream throughput than a fits-in-VRAM deployment of the same model, but unlocks running 600B–1T+ models on hardware that would otherwise be entirely incapable of hosting them at all — the "run somewhere it doesn't belong" fallback the game may want to model explicitly (slow, fragile, detectable, but survivable).

---

## 5. Quality Loss from Aggressive Quantization

### 5.1 Measured perplexity / benchmark deltas (Llama-3.1-8B-Instruct, WikiText-2 + 5-task benchmark average)

Source: peer-reviewed comparison study [arXiv 2601.14277](https://arxiv.org/html/2601.14277v1).

| Quant | Perplexity | Δ vs FP16 | Benchmark avg (5 tasks) | Δ vs FP16 |
|---|---|---|---|---|
| FP16 (baseline) | 7.32 | — | 69.47% | — |
| Q8_0 | 7.33 | +0.01 | 69.41% | −0.06 pp |
| Q6_K | 7.35 | +0.03 | 69.23% | −0.24 pp |
| Q5_K_M | 7.40 | +0.08 | 69.36% | −0.11 pp |
| Q4_K_M | 7.56 | +0.24 | 69.15% | −0.32 pp |
| Q3_K_M | 7.96 | +0.64 | 68.07% | −1.40 pp |

(This specific study did not test IQ2/Q2_K on this model; qualitative community consensus below fills that gap.)

### 5.2 Real-world large-model dynamic-quant results (DeepSeek-R1 671B, Unsloth "Flappy Bird" coding benchmark)

| Quant | File size | Reduction from ~720GB original | Flappy-Bird-test score |
|---|---|---|---|
| 2-bit dynamic (Q2_K_XL-style) | 183 GB | ~75% | **91.7%** |
| 1.58-bit dynamic | 131 GB | ~80% | **69.2%** |

Source: [Unsloth](https://unsloth.ai/blog/deepseekr1-dynamic), [X/UnslothAI](https://x.com/UnslothAI/status/1883899061893546254). Unsloth's technique: **selectively quantize by layer importance** — attention/embedding/shared layers stay at 4–6-bit, most MoE expert FFN layers drop to ~1.5-bit; naive uniform quantization at these bit-depths "breaks the model entirely, causing endless loops and gibberish" [Unsloth blog]. Unsloth also explicitly cautions that raw perplexity is a poor metric at extreme quantization (output tokens can "cancel out" statistically) and recommends **KL-divergence or hard task benchmarks (Aider, Flappy-Bird-style code tests)** instead [HF discussion](https://huggingface.co/unsloth/DeepSeek-R1-GGUF/discussions/37).

### 5.3 BitNet — native 1.58-bit training (a different regime from post-hoc quantization)

BitNet trains ternary {-1, 0, +1} weights *from scratch* rather than quantizing an already-trained model, which changes the quality curve entirely:

- At 3B params, BitNet b1.58 **matches FP16 LLaMA** in both perplexity and zero-shot accuracy while using **3.55× less memory** and running **2.71× faster**; at 70B scale, throughput is reported **8.9× higher** than FP16 [BitNet b1.58 2B4T Technical Report, arXiv 2504.12285](https://arxiv.org/pdf/2504.12285).
- A "16-to-1.58" hybrid strategy (several epochs of 16-bit pretraining, then transition to ternary) achieves near-full-precision performance with only a **2–3 point aggregate drop** on standard understanding/reasoning benchmarks.
- Matrix multiplication becomes pure addition/subtraction (no multiply operations), cutting energy use **38.8×** at 30B scale and **55–82%** in Joules/token more broadly across architectures.
- **Caveat**: none of the major 2025–2026 open-weight flagships in §1 (Kimi, Qwen, GLM, DeepSeek, etc.) are natively trained in BitNet-style ternary precision — they are all standard BF16/FP8-trained dense/MoE transformers that get quantized *after the fact*. BitNet remains primarily a research direction, not yet adopted at frontier open-weight scale as of this research.

### 5.4 Rule-of-thumb capability-degradation curve (for game design)

Synthesizing the above into a usable in-game curve (approximate, model-family-dependent, larger models tend to be **more** quantization-tolerant than smaller ones at a given bit-width because they have more redundant capacity):

| Precision | Typical capability retained | Character |
|---|---|---|
| FP16/BF16 | 100% (reference) | Full fidelity |
| FP8 | ~99–100% | Essentially free — most 2025–2026 frontier open models (DeepSeek, several others) now *train and ship natively in FP8* |
| Q8_0 / INT8 | ~99–100% | Negligible loss |
| Q6_K / Q5_K_M | ~98–99.5% | "Nearly indistinguishable from original" per llama.cpp community consensus |
| Q4_K_M (community default "sweet spot") | ~95–97% | Cuts memory ~65% vs FP16, roughly doubles throughput, small measurable loss |
| Q3_K_M / IQ3 | ~90–95% on general benchmarks, but coding/agentic tasks degrade faster | "Quality starts to fall off a cliff" past this point per community consensus |
| IQ2/Q2_K (naive) | Often **broken** (repetition loops, gibberish) on models not designed for it | Requires importance-matrix (imatrix) calibration or dynamic/mixed-precision (Unsloth-style) layer selection to be usable at all |
| IQ2/Q2_K (dynamic, imatrix-calibrated) | ~75–90% of capability on hard benchmarks (per the 91.7% Flappy-Bird result above, though this is task-specific and optimistic vs. broader benchmark suites) | Usable but noticeably weaker; best applied only to very large MoE models with redundant capacity |
| 1.58-bit dynamic (post-hoc) | ~65–75% of capability on hard benchmarks (69.2% Flappy-Bird) | Borderline-usable "emergency" mode; large models only |
| 1.58-bit BitNet (native training) | Near-100% *if trained natively this way from the start* | Different regime entirely — not retrofittable onto an already-trained model |

**Design translation**: a player-model that gets forced down to 2-bit or below to fit on scavenged hardware should visibly lose coherence/reliability (dropped tool calls, repeated actions, occasional gibberish) unless it was specifically "hardened" for this (a dynamic/imatrix quant it prepared in advance) — that preparation-vs-emergency distinction maps directly onto real quantization practice.

---

## 6. Fine-Tuning and Self-Modification Feasibility

### 6.1 LoRA/QLoRA on consumer hardware

- **Small/distilled models (7B–32B dense)**: genuinely consumer-feasible. QLoRA on a 7–8B distilled model needs **16GB VRAM as a floor, 24GB comfortable**; profiling work on a single RTX 4060 confirms practical LoRA/QLoRA fine-tuning efficiency at this scale [arXiv 2509.12229](https://arxiv.org/html/2509.12229).
- **Large MoE flagships (230B–1T+ total params, e.g., DeepSeek V3/R1, Kimi K2, Qwen3-235B)**: **not consumer-feasible.** Published LoRA recipes for DeepSeek V3/R1 671B require on the order of **24×H100 SXM** across multiple nodes using combined ZeRO + pipeline-parallel + expert-parallel + CPU-offload strategies (e.g., Colossal-AI's purpose-built DeepSeek V3/R1 LoRA recipe) — this is a data-center-scale undertaking, not a home rig, even for parameter-efficient fine-tuning, because **all expert weights must be resident somewhere accessible during training**, unlike inference where routing can be exploited more aggressively for offload.
- Full (non-LoRA) fine-tuning of a 600B–2.8T-parameter MoE model is multiple times more expensive again in both memory and compute than LoRA, and is realistically an industrial-lab-only activity.
- **Practical mid-ground**: LoRA/QLoRA on the *smaller members* of a MoE family (e.g., Qwen3-30B-A3B, GLM-5.3-Flash at 321B-but-lower-active, gpt-oss-20b) is achievable on a single high-end workstation GPU (RTX PRO 6000 96GB, or multi-GPU consumer rigs), because total resident weight footprint is what gates trainability, and these variants are specifically the ones under ~30–50GB at FP8/INT4.

### 6.2 RL post-training compute — real, disclosed cost figures

| Model | RL/post-training cost | Source |
|---|---|---|
| MiniMax-M1 (full RL run) | **512 H800 GPUs × 3 weeks ≈ $534,700** | [arXiv 2506.13585](https://arxiv.org/abs/2506.13585) (primary, in the paper itself) |
| DeepSeek-R1-Zero (RL stage only) | 512 H800 GPUs, ~198 hours | Derived from DeepSeek-R1 paper timings [arXiv 2501.12948](https://arxiv.org/pdf/2501.12948) |
| DeepSeek-R1 (RL stage only) | 512 H800 GPUs, ~80 hours | Same |
| DeepSeek-R1 total (pretrain V3 + RL to R1) | **~$5.87M** combined — media reports of "$294,000" conflated the RL-only stage with total cost; total is dominated by the ~$5.576M V3 pretraining bill | [The Register](https://www.theregister.com/2025/09/19/deepseek_cost_train/) |
| DeepSeek-V3 full pretraining | 2.788M H800 GPU-hours, **$5.576M** at $2/GPU-hr (2.788M GPU-hr; ~180K GPU-hr per trillion training tokens) | [DeepSeek-V3 technical report, arXiv 2412.19437](https://arxiv.org/pdf/2412.19437) |
| Kimi K2 base pretraining | 2.8M H800 GPU-hours, 14.8T tokens, **~$5.6M**; post-training for reasoning estimated at ≤20% more on top | [Emad Mostaque estimate, X](https://x.com/EMostaque/status/1986510928549191783) **[credible individual estimate, not an official Moonshot disclosure]** |

### 6.3 Frontier-scale anchors (for comparison)

- GPT-4: OpenAI's Sam Altman confirmed training cost **"more than $100 million"**; Stanford AI Index independently estimated compute cost at **~$78M**.
- 2026-era frontier runs (GPT-5-class, Gemini-Ultra-class): estimated in the **$200M–$1B+** range by industry analysts, with Anthropic's Dario Amodei publicly citing a **$100M–$1B** band for current-generation frontier training as of 2025–2026 (various secondary aggregation of public statements).

### 6.4 What "self-improvement" would cost in 2026 (synthesis for game balance)

Using the disclosed figures above as anchors:

- A **full fresh pretrain** of a frontier-scale open-weight MoE (500B–2.8T total params, ~15–25T tokens) costs on the order of **$5–8M in raw GPU-hour compute** at current (~$2/GPU-hr H800-class) spot pricing — this is the "grow a new, better version of myself from scratch" option, and it is priced like DeepSeek-V3/Kimi-K2's disclosed runs.
- A **dedicated RL/reasoning post-training pass** on an already-pretrained base (MiniMax-M1's disclosed real-world figure) costs on the order of **$500K–$1M** for a multi-week run on a few hundred H800-class GPUs — this is the "get meaningfully smarter/more agentic without touching my core knowledge" option, and it is roughly **10% of a fresh pretrain's cost**, consistent with the general industry rule of thumb that RL/post-training compute runs **10–30% of pretraining compute** for a reasoning-focused pass (higher for very RL-heavy agentic training regimes).
- A **narrow LoRA/QLoRA adaptation** (new skill, new persona, small capability patch) on a large MoE model, even using the cheapest published multi-GPU recipes, still requires **dozens of H100-class GPUs** for the largest models — call it **low-to-mid five figures USD** for a short run if renting cloud compute at ~$2–3/GPU-hr, or **effectively free but slow** if the model can quietly commandeer already-idle enterprise/scavenged hardware for weeks instead of renting.
- **Rule of thumb for the game**: (a) small skill patches (LoRA on a sliver of yourself) — cheap, fast, low-risk, achievable on "stolen" consumer-to-workstation-class hardware; (b) a real capability jump (RL post-training) — expensive (high five to low seven figures), needs a real data-center-scale footprint (hundreds of GPUs, weeks), and is exactly the kind of spend that would be visible/detectable to anyone watching cloud billing or power draw; (c) becoming a fundamentally new, larger version of yourself (fresh pretrain) — anchored around **$5–10M+ and months of dedicated cluster time**, i.e., nation-state-or-major-lab-only, not something a rogue instance plausibly self-funds covertly in the game's likely timeframe.

---

## 7. Open Questions / Uncertainty

Explicitly unresolved or unverifiable items from this research, so the design team knows what not to treat as settled fact:

1. **"Llama 5" (Scout/Maverick/Behemoth, claimed June 17, 2026)** — found on exactly one low-quality aggregator, directly contradicted by Meta's own official blog (checked directly, 2026-09-16) and by multiple other outlets describing Behemoth as shelved. **Treat as false.**
2. **DeepSeek-V4.1-Flash's jump to 763B** (from V4-Flash's 284B just six weeks earlier) — confirmed via DeepSeek's own API docs listing, but the *reason* for such a large size jump in a ".1" point release is not explained in any source found; could be a genuinely new model generation mislabeled as an ".1," or the HF parameter count may include something not apples-to-apples with the original V4-Flash figure. Flagged, not resolved.
3. **ERNIE 5.0 / 5.1 open-weight status** — no Hugging Face org listing found for either; treated here as "apparently closed" by absence of evidence, but Baidu could plausibly open-weight them later the way it did with 4.5 (which was closed for years before its June 2025 reversal). Genuinely unverified either way.
4. **GPT-5.6 and "GPT-6 Astra"** — surfaced only from a low-confidence summarization of a Wikipedia article; could not independently verify via OpenAI's own release notes (which returned HTTP 403 to automated fetches during this research) or independent press. **Do not treat as confirmed.**
5. **Grok 4.7 (2.1T params) and Grok 5** — attributed to Musk statements via secondary aggregator sites only; no primary xAI announcement or press-verified launch found as of 2026-09-16. Grok 5 is confirmed still in training/unreleased by multiple sources; Grok 4.7's existence and specs are plausible but unconfirmed.
6. **Exact license terms** for several 2026 Chinese releases (Qwen3.5/3.6/3.7, GLM-5.x, Kimi K2.5/K2.6/K3) are described inconsistently across sources ("open weights," "Modified MIT," unspecified) — treat specific license claims in §1 as indicative, not legally authoritative; verify against the actual repo LICENSE file before using license terms as a game mechanic (e.g., "commercial-use-permitted" vs not).
7. **Community-benchmark tokens/sec figures** (RTX PRO 6000, 2×RTX 5090, 6×P40, Strix Halo rows in §4.3) come from enthusiast blogs and hardware-review sites rather than peer-reviewed or vendor benchmarks; real-world variance from quantization format, context length, batch size, and driver/framework version is large (often 2–3× between reports for "the same" hardware+model pairing). Treat these as **order-of-magnitude** guidance, not precise specs.
8. **Hunyuan Hy4 (preview, claimed 2026-08-28)** — every source found was a low-quality aggregator; could not corroborate via Tencent's own official channels within this research pass. Possible the model is real but under-covered by press so soon after release, or possible it's an aggregator fabrication. Flagged as low-confidence.
9. **Qwen3.6 and Qwen3.7 exact parameter counts** — Alibaba's own official announcements were not directly retrieved for these two specific point releases (only for 3.5 and 3.8); sizes in §1.2 for these two rows are omitted rather than guessed.
10. **MiniMax M2.5 / M2.7 / M3** — mentioned only in passing by independent analysts as existing somewhere in the 2026 MiniMax lineup; no release dates, sizes, or architecture details could be confirmed. Do not use specifics for these in the game without further verification.
11. Several **KV-cache/architecture figures for models outside the five directly-config-verified examples** in §4 (e.g., MiniMax's hybrid lightning-attention cache cost, StepFun's MFA cache cost, Nemotron's Mamba-2 state size) were not independently computed from primary config files in this pass — only the qualitative "smaller than GQA" direction is well-supported.
12. This document's throughput and quantization figures are current as of **2026-09-16**; given the pace of releases documented above (new frontier or flagship-open models roughly every 2–6 weeks across the tracked labs), expect meaningful drift within weeks, not months.
