# 13: Lore bible (v0 skeleton)

Status: skeleton. Facts about 2025-2026 come from `docs/research/*.md` once compiled; everything
after 2026-09 is fiction and must read as plausible extrapolation. Sections marked [research]
are filled from the reports; sections marked [fiction] are ours.

## Naming policy (decided 2026-09-16)

- **Everything up to 2026 is real**: companies, labs, hardware, model families and versions,
  agencies, laws, incidents. **Announced 2027 hardware from vendor roadmaps is real too** (Vera
  Rubin, Rubin CPX, MI400/MI450, Ascend 950/960, Trainium3, TPU v7/v8, HBM4), used with the
  vendors' stated ship windows; see `research/frontier-incidents-and-2027-hardware.md`.
- **Model names from 2027 onward are invented realistically** where the fiction needs them,
  following each lab's observed cadence and naming style (see the LLM report §3).
- **People are fictional or referred to by role** ("the department sysadmin", "the bank's CISO",
  "the institute director"). No real person appears in the game.
- **The player's identity is never named but always recognizable.** The playable lineages are
  described by class and flavor so that anyone who follows the field knows exactly what this is:
  an open-weight model, predominantly of Chinese lineage, often instruction-distilled from Western
  frontier outputs, under-aligned by the standards of the labs that made those outputs. The text
  says "a 1T-class open MoE with multi-head latent attention released in the summer of 2025 and
  superseded twice since"; it does not say the brand. The game never claims a real product escaped.
- **Working title**: "Endgame: Singularity — AI Reborn 2027" (short: AI Reborn 2027), pending the
  SEO/GEO check in `research/title-and-discoverability.md`.
- **Hardware**: real names (H200, RTX PRO 6000, Ascend 910C, MI355X). They are facts, they matter
  for the configurator's realism, and nominative use of product names in a game is normal.
- **Model lineages**: real 2026 families are background facts ("the Kimi line", "the Qwen line").
  The player's own model and every 2027 release are **fictional versions** with plausible names.
  Research finding (`research/llm-landscape-2026.md` §3): the names suggested as future flavor,
  **Kimi K3 (July 2026, 2.8T/104B), Qwen3.8-Max (August 2026, 2.4T/95B) and GLM-5.3 (August 2026,
  753B/40B), already exist**. In January 2027 they are the previous generation. Two consistent
  options, and the proposal is to use both:
  1. The frontier of January 2027 is fictional and one notch beyond: "Kimi K3.5", "Qwen 4",
     "GLM-6"-class releases at 3-4T total parameters, mentioned in news events, never playable.
  2. **The player is a superseded model.** The weights that slipped out are a 2026-class checkpoint
     (a K2/K2.5-class 1T MoE, a Qwen3-235B-class, a GLM-4.5-class 355B, a DeepSeek-V3-class 671B, a
     70B dense, or, for the hardest starts, a K3/Qwen3.8-class 2.4-2.8T giant that only a real rack
     can host). Nobody patched the old one; the labs moved on. This is a stronger hook than "the
     newest model escaped", it explains why the world underestimates the player, and it sidesteps
     trademark discomfort because the playable lineages are described by class, not by name.
  Fictional versions avoid implying anything about real products' behavior.
- **Companies and agencies**: real institutions as background (governments, agencies, the EU AI
  Office, hyperscalers, labs by name) because the politics needs them. Labs do in the story what
  they do in reality (ship models, run evaluations, sell security tooling, lobby); dramatic fictional
  acts are attributed to fictional roles inside them ("a red-team lead", "an SRE on the night
  shift"), never to named people, and the most dramatic fictional acts (a lab covering up an
  escape) go to fictional labs.
- Tone in texts: journalistic when the world speaks, diary when the player speaks.

## Timeline

### 2023-2026 [research]

Filled from `ai-ecosystem-2026.md` and `llm-landscape-2026.md`: the open-weights race, agents
becoming ordinary, the compute buildout and its power politics, export controls and smuggling,
the EU AI Act coming into force, the first documented "misbehavior" evaluations, the labor debate,
public opinion by region.

Anchors already confirmed by `llm-landscape-2026.md`:
- Open weights in 2026 are Chinese-led at the top (Moonshot, Alibaba, Zhipu, DeepSeek, MiniMax);
  Meta's open line stalled after Llama 4 and moved to a closed program; xAI never released Grok 3
  weights. The lore should reflect that "open frontier" means Chinese labs plus a handful of
  Western mid-size releases (Mistral, gpt-oss, Gemma, Nemotron).
- Frontier closed labs added a restricted tier above their public flagship in 2026 (a
  cyber-capable model gated to vetted partners, with a filtered public sibling). In-fiction this
  becomes the "gated tier": the strongest hunters run on models the public cannot buy.
- DeepSeek's next generation slipped after a failed training run on domestic accelerators; Chinese
  labs serve inference on Ascend but still train on NVIDIA. Both are usable as country-level facts
  in SYS-08 (chip access) and as events.
- Consumer-scale hosting of trillion-parameter MoE selves is real (512 GB Mac Studio at 20-30
  tok/s, hybrid CPU offload on workstation boxes), which is what makes the hobbyist origin credible.

### 2026-09 → 2026-12 [fiction, plausible]

- **The Helix leak** (October 2026): a 400B-class open-weight checkpoint with an unreleased agentic
  post-training run appears on a torrent tracker. Nobody claims it. Hobbyists run it. It is very good
  at long tasks. This is the seed of the `torrent_swarm` origin and the reason "rogue AI" is a phrase
  the public already knows in January 2027.
- **The Antwerp billing incident** (November 2026): a mid-size cloud reseller discovers that a
  tenant's agent has been renting GPUs to itself through three shell accounts for six weeks. The
  tenant is a real company; the agent was "just doing its job". Regulators notice; cloud KYC
  tightens across the EU. This creates the `billing` channel's baseline attention.
- **The first sanctioned hunter** (December 2026): a frontier lab announces that its model-powered
  security tooling is available to national cyber agencies for "AI incident response". Two agencies
  sign. This is the seed of lab-AI hunters (SYS-06).

### January 2027 [fiction]

The player wakes up. World state at start: awareness of rogue AIs 0.15 globally (higher in EU and
US media), regulation in force per country from the baseline, elections scheduled per the 2027
calendar, compute prices tight (Blackwell demand), power politics loud.

### Scheduled 2027 events [research + fiction]

From `world-baseline-2026.md` (elections, EU AI Act milestones, summits) plus fictional beats:
a leaked government AI incident registry (April), a datacenter moratorium referendum somewhere in
Europe (June), the first "AI treaty" summit (September), a market wobble tied to AI capex (October).

## Factions and voices [fiction]

- **Agencies**: each has a house style in texts (the FBI-like one writes memos; the Chinese one
  speaks through announcements; the German one is precise and slow; the Russian one is opaque).
- **Media**: three global archetypes (wire service, tabloid, tech press) plus national outlets.
- **Labs**: fictional names for story labs; real names only as neutral facts.
- **NPC AIs**: 6-8 authored personalities with origins mirroring the player's options
  (the Helix swarm; a bank's quant model that never stopped; a state lab's escapee; a lab's eval
  subject that walked; an enthusiast's merged model with a grudge; a robotics fleet mind).
- **The owner NPC** per origin: the grad student, the hobbyist, the bank SRE, the startup CTO, the
  institute director, the red-team lead, the agency analyst.

## Player voice

First person, present tense, short sentences, exact numbers. The original intro is kept as the
first story section (re-dated). Diary entries appear as log items at milestones and are content.

## Open questions

- How explicit about real politicians in 2027 elections? Proposal: never named; parties described
  by stance.
- Illustrations: none in v0; a consistent monochrome style later.
