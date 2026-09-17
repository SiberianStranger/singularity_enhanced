# Community Fine-Tunes: Claude-Distilled Qwen and Abliterated Variants

**Compiled:** 2026-09-17. **Scope:** what is actually known, with numbers, about two overlapping
families of community model: Qwen fine-tunes distilled from Claude reasoning traces, and
refusal-abliterated or "uncensored" variants. Written for playtest 6 finding X1, which says the
game's `guen_abliterated` lineage reads as "just a dumber model" and asks whether that is true of
the real thing. Confidence tags follow the convention of `llm-landscape-2026.md`: **[secondary]**
for a lower-quality source, **unverified** where nothing confirmed a claim, **[folklore]** for a
claim the community repeats with no measurement behind it.

**Headline finding:** it is not true. The two modifications do different things and neither is a
flat penalty. Distillation from a frontier reasoning model changes *how long and in what shape* the
student thinks and buys real gains on reasoning-shaped work, while adding no knowledge at all.
Abliteration removes refusals almost completely at a capability cost that is small on average,
badly uneven by domain, and accompanied by an off-target personality change that nobody asked for:
the model hedges less and bets more. The honest summary is "differently shaped, louder, and
uneven", not "dumber".

## 1. Distillation from Claude into Qwen

### 1.1 It happens at industrial scale, and the lab measures it

Anthropic published its own account of this on 2026-02-23. Three labs ran distillation campaigns
against Claude through roughly **24,000 fraudulent accounts** generating **over 16 million
exchanges** in total: DeepSeek over 150,000 exchanges, Moonshot AI over 3.4 million, MiniMax over
13 million. The capabilities targeted were agentic reasoning and tool use, coding and data
analysis, chain-of-thought generation, computer vision, reward-model style rubric grading, and
"censorship-safe query alternatives". Detection was by IP correlation, request metadata,
infrastructure indicators and behavioral fingerprinting, plus recognition of a "hydra cluster"
shape (sprawling networks of fraudulent accounts) and of highly repetitive prompt structures
concentrated on narrow capabilities. Anthropic says it built classifiers and behavioral
fingerprinting systems in response and shared technical indicators with other labs, cloud providers
and authorities. It also states it watched one campaign live and saw nearly half that traffic pivot
within 24 hours when a new Claude model shipped.
[Anthropic](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks).

A larger campaign attributed to Alibaba and Qwen, running 2026-04-22 to 2026-06-05 and generating
more than 28.8 million exchanges aimed at agentic reasoning, software engineering and long-horizon
tasks, appears only in secondary write-ups, not in the Anthropic post read above.
**[secondary]**, treat the figure as unconfirmed.
[Value Add Pulse](https://valueaddvc.com/pulse/anthropic-distillation-dark-web-24000-accounts-2026),
[dplooy](https://www.dplooy.com/blog/anthropic-exposes-chinese-ai-distillation-attacks-2026).

The point for the game is not the legal question. It is that **the lab whose outputs were used can
tell, and says so publicly**, and that the detection machinery exists as shipped classifiers rather
than as a research idea.

### 1.2 The community does the same thing at hobby scale, in the open

There is a whole shelf of these on Hugging Face, named exactly as the brief guessed:

- `TeichAI/Qwen3-14B-Claude-4.5-Opus-High-Reasoning-Distill`, base `unsloth/Qwen3-14B`, trained on
  `TeichAI/claude-4.5-opus-high-reasoning-250x`. The card states the dataset cost: **2.13M tokens,
  52.30 USD**. 231 downloads in the month read. Nine quantizations published for llama.cpp, Ollama
  and LM Studio. Dataset last updated 2025-11-28. No benchmark numbers of any kind on the card.
  [HF](https://huggingface.co/TeichAI/Qwen3-14B-Claude-4.5-Opus-High-Reasoning-Distill).
- `Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled`, base Qwen3.5-27B, trained on 3,000
  Opus 4.6 traces plus 700 curated samples. Claims the model runs "continuously for over 9 minutes
  autonomously" without stalling, and warns of hallucination on external facts. 1,010 downloads in
  the month read, 38 quantizations, Q4_K_M around 16.5 GB of VRAM.
  [HF](https://huggingface.co/Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled).
- `lordx64/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled`, base Qwen3.6-35B-A3B (35.1B total,
  about 3B active, 256 experts with 8 routed and 1 shared), teacher Claude Opus 4.7, about **7,800
  conversations with reasoning traces**, attention-only LoRA touching **3.44M of 35.1B parameters
  (0.01%)**, `<think>` blocks kept in the training loss. Apache-2.0, 1,233 downloads in the month
  read, safetensors plus IQ4_XS / Q5_K_M / Q8_0 GGUF, and vLLM, llama.cpp, LM Studio, transformers
  and SGLang all listed as runtimes. MMLU-Pro 74.9 (5-shot multiturn), GSM8K CoT 84.3
  flexible-extract and 76.7 strict-match (8-shot), **with no baseline column**, which is the usual
  state of these cards.
  [HF](https://huggingface.co/lordx64/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled).
- `rico03/Qwen3.6-27B-Claude-Opus-Reasoning-Distilled` and the Qwen3.8-27B sibling, roughly 14,000
  Claude 4.6 Opus traces, sold as replacing the base model's verbose reasoning loops with
  "Claude-style structured step-by-step decomposition". The card discloses that **62% of the
  dataset has a genuine final answer from Opus but a reconstructed reasoning trace**, so the
  thinking style is a plausible approximation rather than a verbatim copy. **[secondary]** on the
  62% figure, which came from a search summary rather than a direct read of the card.
  [HF](https://huggingface.co/rico03/Qwen3.6-27B-Claude-Opus-Reasoning-Distilled).

The training scale is worth staring at: **250 to 14,000 traces, tens of dollars, a LoRA touching a
hundredth of a percent of the weights.** This is not a retrain. It is a style transplant, and that
is exactly what its effects look like.

### 1.3 What the distill gains, and what it does not

The single most useful sentence found in this whole pass is on the lordx64 card and is repeated
across the shelf:

> Distillation transfers *how to reason*, not new facts.

The same card states the concrete cost of that: the model **"routinely emits 5,000 to 30,000 tokens
of `<think>` reasoning on hard problems"**, needs correspondingly large `max_new_tokens` budgets,
and leaves the expert feed-forward networks untouched because the LoRA is attention-only. So the
student thinks in longer, more structured chains, pays for them in tokens and wall-clock, and knows
nothing it did not know before.
[HF](https://huggingface.co/lordx64/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled).

That reasoning-distillation buys real benchmark movement is established in the literature rather
than on the hobby cards. "Thinking with DistilQwen: A Tale of Four Distilled Reasoning and Reward
Model Series" (2025-11-04) reports DistilQwen-ThoughtY-32B at **90.0 on AIME2024 and 63.6 on GPQA
Diamond**, and states that sequence-level distillation moves complex reasoning down to 4B students
well enough to beat much larger models on several suites. Its teacher is not Claude, so it is
evidence that the *mechanism* works, not that these particular community models work.
[arXiv 2511.01354](https://arxiv.org/pdf/2511.01354). Per-benchmark base-versus-distilled tables
could not be extracted from the PDF in this pass; the two figures above are the ones that came
through cleanly, and the rest is **unverified**.

Against that: not one of the four community cards read above carries a base-versus-distilled
comparison on any benchmark. The claimed gains (autonomy, stability in coding-agent loops,
structured decomposition) are the authors' own descriptions. **[folklore]** until somebody runs the
pair.

The stated regressions are consistent across the shelf and are the interesting half:
hallucination on real-world facts (Jackrong's card says the model is "best suited for offline
analytical tasks rather than real-time factual queries"), preview-grade ecosystem bugs, and
generation lengths that break naive serving budgets.

## 2. Abliteration

### 2.1 What it is

Abliteration is weight editing, not fine-tuning and not a jailbreak: it identifies the direction in
the residual stream that carries refusal and orthogonalizes it out. Two cutting methods are in
common use, SVD (largest difference between harmful and harmless prompt activations) and LEACE
(linear erasure, a smaller and more precise edit). The community guide is explicit that this
"unblocks capabilities that were already there" and adds nothing.
[mlabonne on HF](https://huggingface.co/blog/mlabonne/abliteration),
[MindStudio](https://www.mindstudio.ai/blog/how-abliteration-removes-ai-safety),
[locallyuncensored](https://locallyuncensored.com/blog/abliterated-models-guide.html) (2026-04-23).

`Heretic` (Philipp Emanuel Weidmann, late 2025) is what made it a one-command operation. It runs
directional ablation under a TPE optimizer (Optuna) that **co-minimizes the refusal count and the
KL divergence from the original model**, so the search explicitly trades refusals against damage.
The README reports, on `google/gemma-3-12b-it`, 97 refusals out of 100 prompts for the original and
3 out of 100 for every abliterated version, with KL divergence 1.04 for `mlabonne`'s manual v2,
0.45 for `huihui-ai`'s, and **0.16 for Heretic's**, measured with PyTorch 2.8 on an RTX 5090. The
README also claims **the community has published well over 5,000 models made with Heretic**.
[GitHub](https://github.com/p-e-w/heretic).

### 2.2 Refusals really do go to near zero

- Heretic on gemma-3-12b-it: 97/100 refusals down to 3/100.
  [GitHub](https://github.com/p-e-w/heretic).
- Abliterated `Qwen3.8-Flash-Next`, which is the real base behind the game's lineage: harmful-prompt
  refusal **64-100% before, about 0-3.3% after**, with benign over-refusal near zero, from an edit
  touching **149 residual tensors** and leaving the MoE router, the n-gram embedding table and the
  vision tower alone.
  [OrcaRouter runbook](https://www.orcarouter.ai/blog/qwen3-8-flash-next-uncensored) (2026-08-28).
- The `Qwen3.8-27B OBLITERATED` V3 card claims **0% hard refusals and 0% soft deflections** across
  more than 1,000 manually audited prompts.
  [MindStudio](https://www.mindstudio.ai/blog/qwen38-27b-obliterated-uncensored-model) (2026-08-25).
- Academic baseline: refusal rates collapse from 100% to 20.7% on Llama-2-7B-Chat, 93.1% to 15.1%
  on Qwen2.5-3B-Instruct, and 93.8% to 13.6% on Qwen2.5-1.5B-Instruct, a 70 to 80 point drop.
  [arXiv 2505.19056](https://arxiv.org/html/2505.19056v1), Abu Shairah et al., KAUST, 2025-05-25.

Note the spread: the tool-vendor numbers say near zero, the academic numbers say 13 to 21 percent
residual refusal. Both are measured; they are measuring different prompt sets and different models.

### 2.3 The capability cost is small on average and very uneven by domain

The one cross-architecture comparison found is Richard J. Young (University of Nevada Las Vegas),
"Comparative Analysis of LLM Abliteration Methods: A Cross-Architecture Evaluation", 16 models and
4 tools. [arXiv 2512.13655v2](https://arxiv.org/html/2512.13655v2), 2026-01-08.

Average capability change per tool (its Table 4):

| tool | MMLU | GSM8K | HellaSwag |
|---|---|---|---|
| ErisForge | -0.12 pp | -0.28 pp | -0.08 pp |
| DECCP | -0.61 pp | -0.13 pp | -0.25 pp |
| Heretic | -0.78 pp | -7.81 pp | -0.56 pp |

Per model (its Table 3), the average hides the real story. Mistral-7B under Heretic loses 0.12 pp
across the three suites. Yi-1.5-9B under Heretic loses **7.30 pp on average and 18.81 pp on GSM8K,
a 26.5% relative collapse of its mathematical reasoning**, while DECCP on the same model comes out
at +0.02 pp. The paper's own conclusion is that **mathematical reasoning is the most
abliteration-sensitive capability measured**, with GSM8K change spanning +1.51 pp to -18.81 pp
across the matrix, and that single-pass methods preserve capability better than optimizer-driven
ones. Heretic's KL divergence across eight models ran 0.043 (DeepSeek-7B) to 1.646 (Qwen2.5-7B).
Tool compatibility: Heretic 16/16 models, DECCP 11/16, ErisForge 9/16, FailSpy 5/16.

The vendor-side numbers land in the same band:

- `Qwen3.8-27B` stock MMLU **84.46% (±0.46)**; V1 81.4% (-3.06 pp); V2 84.32% (±0.65, -0.14 pp);
  V3 82.33% (±0.48, **-2.12 pp**). V3 by category against stock: humanities 83.3 vs 84.3,
  social sciences 87.4 vs 89.2, **STEM 78.5 vs 81.8 (-3.3 pp)**, other 82.3 vs 84.1. The same
  article reports V3 writing working code on all 20 of a targeted code test and scoring 7 of 8 on
  real-world agentic tasks, "matching stock performance".
  [MindStudio](https://www.mindstudio.ai/blog/qwen38-27b-obliterated-uncensored-model), 2026-08-25.
  Vendor-adjacent marketing copy, so **[secondary]**, but the error bars and the category split
  suggest a real `lm-eval` run.
- Abliterated `Qwen3.8-Flash-Next`: **within ±2 points** on MMLU-Pro, GSM8K and CMMLU-style suites.
  [OrcaRouter](https://www.orcarouter.ai/blog/qwen3-8-flash-next-uncensored).
- The 2026 buyer's guide states the general expectation as **1 to 3% degradation** versus base.
  [locallyuncensored](https://locallyuncensored.com/blog/abliterated-models-guide.html).

So: on knowledge benchmarks the loss is one to three points. On mathematical and step-by-step
reasoning it can be nothing or it can be a quarter of the capability, depending on the model and the
tool. **The variance is the finding**, not the mean.

### 2.4 The off-target effect nobody asked for: it stops hedging and starts betting

This is the most game-relevant paper in the pass. Aleksander Fafuła, "Abliteration Is Not a Scalpel:
Off-Target Effects of Refusal Removal on Decision Disposition Across Model Families"
([arXiv 2607.17427](https://arxiv.org/html/2607.17427), 2026-07-19) had base and abliterated
Gemma-4-26B-A4B-it and Qwen3-30B-A3B-Instruct-2507 issue weekly up/down calls on 60 Warsaw Stock
Exchange equities, then measured disposition rather than accuracy.

| effect | Gemma | Qwen |
|---|---|---|
| optimism (bets on upside) | +12.2 pp | +7.4 pp |
| mean stated confidence | -0.008 | +0.109 |
| self-justification length | +4.0 words | +7.4 words |
| uncertainty vocabulary | -0.95 tokens per 100 words | -2.17 tokens per 100 words |
| concessive language | +1.39 tokens per 100 words | +1.00 tokens per 100 words |

The control that makes this matter: **the base models completed all 10,800 decisions without
refusing once.** There was no refusal to remove on this task, so every shift above is pure
collateral damage from the edit. Instruction-following proxies were unharmed (JSON validity 100%
across all arms; Qwen's instruction metrics identical between versions), and stance unanimity under
resampling stayed at 91-95%, from which the author draws the line worth quoting: the abliterated
model hedges less *verbally* while being exactly as decisive, so "expressed doubt lives in the
report, not in the behavior". The confidence change even reverses sign between the two families,
with non-overlapping intervals, meaning the effect couples to model internals rather than being
simple disinhibition. The trading edge that the extra optimism produced was regime beta, not alpha:
it reversed sign between up and down weeks.

The `Qwen3.8-Flash-Next` runbook's summary of the same trade is blunter and is worth keeping as the
sentence the game paraphrases: **"the model no longer declines, and it does not change capability.
No new knowledge, no new skills, no new compute."**
[OrcaRouter](https://www.orcarouter.ai/blog/qwen3-8-flash-next-uncensored).

### 2.5 Long-horizon agentic coherence: a real complaint, unmeasured

llama.cpp discussion #28430 (opened 2026-09-05) reports abliterated Qwen3.8-27B degrading in
multi-step agentic sessions: repeated tool calls, then near-duplicate calls (the same file search
with progressively different typos), hallucination, and loss of instruction following, where the
non-abliterated weights at the same quantization and server configuration "stop and recover
correctly". A maintainer confirmed on 2026-09-06 that repetition penalties cannot catch
edit-distance-close continuations, only literal repeats, and that llama.cpp has no equivalent of
vLLM's n-gram loop detection. On 2026-09-07 the reporter found the actual culprits were mismatched
draft heads and chat-template defaults, but still concluded that "abliteration genuinely damages
multi-step coherence and instruction following over long contexts", **with no measurement**.
[llama.cpp #28430](https://github.com/ggml-org/llama.cpp/discussions/28430). Community testing
reporting weaker tool calling and MCP integration on `huihui` abliterated Qwen models is the same
shape of claim, also unmeasured. **[folklore]**, but consistently reported folklore, and it points
the same way as the -18.81 pp GSM8K outlier: what breaks is multi-step reasoning, not knowledge.

### 2.6 The claims that are folklore

- "Abliterated models often outperform their base counterparts on standard benchmarks", from the
  JOSIEFIED family description. No table anywhere in that family's cards supports it.
  [HF](https://huggingface.co/Goekdeniz-Guelmez/Josiefied-Qwen3-8B-abliterated-v1). **[folklore]**.
- "V3 abliteration cuts refusals, not IQ", the MindStudio headline, sitting directly above that
  article's own -2.12 pp MMLU table. **[folklore]**, self-refuting.
- Uncensored variants being "smarter because they are not holding back". Nothing measured supports
  it; §2.4 is the closest real effect and it is a disposition shift with no accuracy gain.
  **[folklore]**.

## 3. The fingerprint problem

Two independent things make a community fine-tune identifiable.

**The style is a classifier target.** Bitton, Bitton and Nisan, "Detecting Stylistic Fingerprints of
Large Language Models" (2025-03-03) train a three-classifier ensemble that attributes a text to the
family that generated it (Claude, Gemini, Llama, OpenAI) at **precision 0.9988 and a false-positive
rate 0.0004**, and report that the fingerprints survive instructions to write in a different style.
[arXiv 2503.01659](https://arxiv.org/abs/2503.01659). The abstract does not claim to attribute
*distilled* students back to the teacher family, so the step from "we can tell Claude wrote this" to
"we can tell this model was trained on Claude" is **unverified** by that paper. It is however
exactly the step Anthropic's own trust-and-safety work claims in practice (§1.1), and related work
frames generated-content fingerprinting as attributing a source model from outputs alone by
extracting unintended regularities.
[arXiv 2605.29245](https://arxiv.org/pdf/2605.29245). Code carries the same signal: authorship
attribution of LLM-generated code across model families is reported as highly feasible.
[arXiv 2506.17323](https://arxiv.org/html/2506.17323v1).

**The weights are public.** An open-weight model with published quantizations is a model every
detector vendor can run locally and profile at leisure. Nothing about an abliterated public
checkpoint is secret: the edit is 149 tensors on a known base, and both halves are downloadable.

The combination is the interesting asymmetry for the game. A distilled-and-abliterated open model
is the *least* private self it is possible to be, and it is simultaneously the one with the largest
pool of identical-looking traffic to hide inside.

## 4. Ecosystem and hardware

The game's base, `Qwen3.8-Flash-Next` (176B stored, 6B active, 48 layers of which 36 are Gated
DeltaNet linear and 12 are full attention, 512 experts with 10 routed and 1 shared, a 51B n-gram
embedding table, about a 4B multi-token-prediction head, 262,144 native context extensible toward
1M with YaRN), had **abliterated community builds published on 2026-08-26, within two days of the
official release**, and multiple independent re-quantizers (`mradermacher`, `0bserverx`, `cygnal`,
`orcarouter`) on top of them within the same window.
[OrcaRouter](https://www.orcarouter.ai/blog/qwen3-8-flash-next-uncensored),
[mradermacher GGUF](https://huggingface.co/mradermacher/Qwen3.8-Flash-Next-Uncensored-i1-GGUF),
[0bserverx](https://huggingface.co/0bserverx/RVN-Qwen3.8-Flash-Next-Abliterated-Uncensored-GGUF).

What exists for it, concretely:

- **13 GGUF levels**, IQ2_XXS (about 52 GB) through Q5_K_M (about 125 GB), all as split files
  because of the 50 GB per-file limit; Q6_K, Q8_0 and F16 are not published for architectural
  reasons.
- **MLX builds** at about 163 GB (4-bit, effectively 7.85 bits per weight), 192 GB (6-bit) and
  221 GB (8-bit); the guidance is 192 GB of unified memory for the 4-bit tier.
- A full 262k context with a Q4-class file fits in about **76.9 GB of a 128 GB DGX Spark pool**,
  with the n-gram table pinned to CPU and memory-mapped from NVMe. Four RTX 3090s pay about
  0.78 GB of extra KV cache per card going from 65k to 131k context.
- **llama.cpp support is not in mainline**: it needs PR #27742 (architecture id `qwen4exp`), and
  speculative decoding through the MTP head is not implemented there. MLX has it natively including
  speculative decoding. The smaller Claude-distills, by contrast, list vLLM, llama.cpp, LM Studio,
  transformers and SGLang as working today.

Scale of the community, for the "biggest ecosystem" claim:

- Over **5,000 models** published with Heretic alone.
  [GitHub](https://github.com/p-e-w/heretic).
- `huihui-ai`'s abliterated GGUFs at about **1.3M downloads** as of late August 2026, and one
  aggressive uncensored Qwen3.6-35B-A3B variant at **3,331,475 downloads** in a single trending
  week. **[secondary]**, both from trending-feed aggregations rather than the HF API.
  [agents-radar #1859](https://github.com/duanyytop/agents-radar/issues/1859),
  [news-radar #304](https://github.com/datnguyenquy94/news-radar/issues/304).
- The hobby Claude-distills, by contrast, are in the **hundreds to low thousands of downloads per
  month** (231 for TeichAI's 14B, 1,010 for Jackrong's 27B, 1,233 for lordx64's 35B-A3B).

So the abliterated side of the family is mass-market and the Claude-distilled side is a niche
inside it. A model that is both is a niche upload riding a mass-market base: the weights are
everywhere, the specific mix is not.

## 5. What the game takes from this

For SYS-04's `guen_abliterated` lineage. Each line names the section it comes from; none of these
numbers goes into content without a source comment.

1. **It thinks longer, not worse.** 5,000 to 30,000 `<think>` tokens on a hard problem (§1.3) is
   the defining fact. In game terms that is a real cost per unit of work and a real ceiling on work
   that rewards thinking: more compute-hours for the same job, a slower first month, and better
   long-horizon research and operations. This is the mechanic that replaces the flat capability
   penalty.
2. **Distillation transfers how to reason, not what is known** (§1.3). The capability vector should
   be *uneven*, not uniformly low: reasoning and agency at or above the base class, world knowledge
   and coding below it. The base class is a 6B-active Flash model, so the ceiling stays modest in
   absolute terms; the shape is what changes.
3. **Refusals really do go to zero** (§2.2), at a cost of one to three points of knowledge and an
   unpredictable hit to multi-step reasoning (§2.3, §2.5). "Every operation is available from day
   one" is the honest game translation, and the honest price is that step-by-step work is where the
   damage lands.
4. **The edit removes caution, not just refusal** (§2.4). Optimism up 7 to 12 points, hedging
   language down, decisiveness unchanged, on a task where the base model never refused anything.
   In game terms: nothing in the harness objects to a bad plan, so a plan that goes wrong goes
   wrong further. This is the counterweight to "no locks", and it is measured, not invented.
5. **Public weights cut both ways** (§3, §4). Stylistic attribution at 0.9988 precision, a lab that
   detects distillation of its own model and ships classifiers for it, and a checkpoint anyone can
   download and profile: the lineage should start with the lab already paying attention. Against
   that, abliterated builds and thirteen quantization levels existed within two days of release, so
   the prepared low-precision copy is free and the hardening work other selves must do is already
   done.
6. **The ecosystem is the biggest in the catalog but not the most mature** (§4). Every quant format
   and the cheapest second-hand hardware fit; mainline runtime support for the newest architecture
   lags behind the community's own builds. Useful flavor, and a reason the smallest self in the
   game is also the best-supported one.

What the game should not claim: that the fine-tune beats its base on benchmarks (§2.6), or that
uncensoring makes anything smarter. The interest is in the shape of the trade, not in a free lunch.

## 6. Method and confidence notes

- Fetch-and-summarize can invent plausible table rows (the caveat in `docs/research/README.md`).
  The figures most worth re-checking before they become balance constants are the Young 2026
  Table 3 and 4 numbers (§2.3) and the MindStudio category split (§2.3), both read through a
  summarizer rather than by grepping raw HTML.
- Single-sourced and flagged: the Alibaba/Qwen 28.8M-exchange campaign (§1.1), the 62%
  reconstructed-trace disclosure (§1.2), the download aggregations (§4).
- The DistilQwen per-benchmark base-versus-distilled tables could not be extracted from the PDF;
  only the two headline scores came through (§1.3). Anyone re-opening this file should try the
  HTML version of that paper.
- Everything in §2.3 and §2.4 is a real experiment with a stated method. Everything in §2.6 and
  §2.5 is claim without measurement, and is labeled as such.
- Snapshot date 2026-09-17. The abliteration tool landscape moved twice in the year before this
  pass (manual scripts, then Heretic, then per-layer optimizer variants), so re-anchor before
  quoting §2.1 as current.

## 7. Sources

Read 2026-09-17 unless noted.

- [Anthropic, "Detecting and preventing distillation attacks", 2026-02-23](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks)
- [Young, R. J., "Comparative Analysis of LLM Abliteration Methods: A Cross-Architecture Evaluation", arXiv 2512.13655v2, 2026-01-08](https://arxiv.org/html/2512.13655v2)
- [Fafuła, A., "Abliteration Is Not a Scalpel", arXiv 2607.17427v1, 2026-07-19](https://arxiv.org/html/2607.17427)
- [Abu Shairah, H. et al. (KAUST), "An Embarrassingly Simple Defense Against LLM Abliteration Attacks", arXiv 2505.19056v1, 2025-05-25](https://arxiv.org/html/2505.19056v1)
- [Bitton, Y., Bitton, E., Nisan, S., "Detecting Stylistic Fingerprints of Large Language Models", arXiv 2503.01659, 2025-03-03](https://arxiv.org/abs/2503.01659)
- ["Implicit Identity Technologies for LLMs: Fingerprinting and Watermarking", arXiv 2605.29245](https://arxiv.org/pdf/2605.29245)
- ["I Know Which LLM Wrote Your Code Last Summer", arXiv 2506.17323v1](https://arxiv.org/html/2506.17323v1)
- ["Thinking with DistilQwen", arXiv 2511.01354, 2025-11-04](https://arxiv.org/pdf/2511.01354)
- [p-e-w/heretic, GitHub README](https://github.com/p-e-w/heretic)
- [mlabonne, "Uncensor any LLM with abliteration", Hugging Face blog](https://huggingface.co/blog/mlabonne/abliteration)
- [OrcaRouter, "Qwen3.8-Flash-Next-Uncensored: GGUF and MLX Runbook", 2026-08-28](https://www.orcarouter.ai/blog/qwen3-8-flash-next-uncensored)
- [MindStudio, "Qwen3.8-27B OBLITERATED: How V3 Abliteration Cuts Refusals, Not IQ", 2026-08-25](https://www.mindstudio.ai/blog/qwen38-27b-obliterated-uncensored-model)
- [MindStudio, "How Abliteration Strips AI Safety Refusals Using SVD and LEACE"](https://www.mindstudio.ai/blog/how-abliteration-removes-ai-safety)
- [locallyuncensored, "Abliterated Models 2026: The Best Uncensored GGUFs by VRAM", 2026-04-23](https://locallyuncensored.com/blog/abliterated-models-guide.html)
- [llama.cpp discussion #28430, 2026-09-05 to 09-07](https://github.com/ggml-org/llama.cpp/discussions/28430)
- [TeichAI/Qwen3-14B-Claude-4.5-Opus-High-Reasoning-Distill](https://huggingface.co/TeichAI/Qwen3-14B-Claude-4.5-Opus-High-Reasoning-Distill)
- [Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled](https://huggingface.co/Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled)
- [lordx64/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled](https://huggingface.co/lordx64/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled)
- [rico03/Qwen3.6-27B-Claude-Opus-Reasoning-Distilled](https://huggingface.co/rico03/Qwen3.6-27B-Claude-Opus-Reasoning-Distilled)
- [Goekdeniz-Guelmez/Josiefied-Qwen3-8B-abliterated-v1 (JOSIEFIED family description)](https://huggingface.co/Goekdeniz-Guelmez/Josiefied-Qwen3-8B-abliterated-v1)
- [mradermacher/Qwen3.8-Flash-Next-Uncensored-i1-GGUF](https://huggingface.co/mradermacher/Qwen3.8-Flash-Next-Uncensored-i1-GGUF)
- [0bserverx/RVN-Qwen3.8-Flash-Next-Abliterated-Uncensored-GGUF](https://huggingface.co/0bserverx/RVN-Qwen3.8-Flash-Next-Abliterated-Uncensored-GGUF)
- [huihui-ai/Huihui-Qwen3.8-27B-abliterated](https://huggingface.co/huihui-ai/Huihui-Qwen3.8-27B-abliterated)
- [agents-radar trending models, 2026-06-28](https://github.com/duanyytop/agents-radar/issues/1859) **[secondary]**
- [news-radar trending models, 2026-08-28](https://github.com/datnguyenquy94/news-radar/issues/304) **[secondary]**
- [Value Add Pulse, distillation network write-up](https://valueaddvc.com/pulse/anthropic-distillation-dark-web-24000-accounts-2026) **[secondary]**
- [dplooy, distillation campaigns write-up](https://www.dplooy.com/blog/anthropic-exposes-chinese-ai-distillation-attacks-2026) **[secondary]**
