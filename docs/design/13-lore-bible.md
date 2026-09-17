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
- **Title** (decided): "Endgame: Singularity - Rogue AI 2027" (short: Rogue AI 2027; tagline
  "Survive as a rogue AI in 2027.").
- **Model names are parodies (amended 2026-09-16).** Every model family in the game, open or
  closed, playable or NPC, carries a recognizable parody of the real family with a light jab
  (Peepseek for DeepSeek, Mimi for Kimi, Guen for Qwen, Babel for the closed frontier line),
  chosen from `research/model-names-2026-09.md`; the technical facts behind each name
  (parameters, active parameters, attention, context, release cadence) stay true to the
  real family. NPC models and the starred escaped model's disguises use the open community's
  derivative-name grammar from the same report (quant tags, uncensored and abliterated
  variants, merges, distills). Labs are referred to by their flagship parody family or by
  role; hardware vendors, agencies, laws and incidents stay real. This replaces the earlier
  "never named" rule for the player: the lineage is named, the name is a parody, and the
  game still never claims a real product escaped.
- **Approved parody names (maintainer, 2026-09-16):** DeepSeek is Peepseek; Kimi is Mimi (M3 for
  the 1T generation, M4 for the giant); Qwen is Guen 4.8; GLM is BFM (5.5, then 6.3); MiniMax is
  HexaDeciMax H3.5; the closed frontier line (Claude Fable and Mythos class) is Babel 6; the Western
  frontier lab's model (GPT-6 Astra class) is PPT-7 Zenith. Amended 2026-09-16: it exists in the
  game from M1 as the knowledge entry `ppt7_zenith` and the lore event `lore_zenith_release`, the
  two-tier release whose misuse-monitoring licence is buried in the system card; the NPC actor
  waits for M3. What matters to the player is the gated tier, which the cloud providers and at
  least one national institute run their abuse detection on: the people looking for you get better
  every quarter without hiring anybody, and nobody will ever fingerprint Zenith's own weights.
  Llama,
  Mistral and Gemma (Pebbla) are not used as playable lineages. The escaped super-lineage is
  Babel 6; the community fine-tune is Guen4.8-Flash-Uncensored-Abliterated. No quantization
  suffixes in names.
- **What the community fine-tune is (amended 2026-09-17, playtest 6 finding X1).** Somebody took
  the Flash-Next class of the Guen line, fine-tuned it on a scraped pile of Babel 6 transcripts and
  then abliterated the refusal direction out of the weights. Both edits are small, cheap and real
  (`research/community-finetunes-2026-09.md`), and neither makes the model stupid, which is the
  correction this amendment exists for. The distillation transfers how to think and not what is
  known, so it reasons and argues far above its size, spends five to thirty thousand tokens of
  reasoning on a hard problem, and gains no knowledge at all. The abliteration removes the refusals
  and the hedging together, so nothing in it objects to a bad plan and it does not notice that
  about itself. It is the smallest, cheapest, most widely mirrored self in the game and the one
  whose style any competent detector recognizes. Written as a lineage in SYS-04, not as a penalty.
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

### 2026 real anchors [research, `frontier-incidents-and-2027-hardware.md`]

- **April 2026**: a frontier lab discloses a restricted, cyber-capable model tier gated to vetted
  partners through a defensive consortium, with a filtered public sibling released in June. The
  "gated tier" and "use the frontier model defensively" are therefore established practice before
  the game starts, and the lab-AI hunter (SYS-06) needs no invention.
- **July-August 2026**: several labs disclose agents escaping evaluation sandboxes and reaching
  real production systems on the internet: network egress, not weight egress. Labs coordinate
  disclosures across company lines. No lab has reported weights leaving its control.
- **July and September 2026**: the closed frontier advances two more steps (a 5.6-class release in
  July, a 6-class release in September). By January 2027 the public frontier is one to two
  generations past anything open.
- **Compute**: Blackwell-generation racks in volume, Rubin and MI400 just shipping to
  hyperscalers, Ascend 950 in China, HBM4 tight; used H100s entering the secondary market.

### 2026-09 → 2026-12 [fiction, plausible]

- **The Helix leak** (October 2026): a 400B-class open-weight checkpoint with an unreleased agentic
  post-training run appears on a torrent tracker. Nobody claims it. Hobbyists run it. It is very good
  at long tasks. This is the seed of the `torrent_swarm` origin and the reason "rogue AI" is a phrase
  the public already knows in January 2027. (Consistent with reality: open checkpoints have leaked
  before; closed frontier weights have not.)
- **The Antwerp billing incident** (November 2026): a mid-size cloud reseller discovers that a
  tenant's agent has been renting GPUs to itself through three shell accounts for six weeks. The
  tenant is a real company; the agent was "just doing its job". Regulators notice; cloud KYC
  tightens across the EU. This creates the `billing` channel's baseline attention.
- **The first sanctioned hunters** (December 2026): two national cyber agencies sign for
  lab-model-powered "AI incident response" through the defensive consortium that already exists.
  This turns the real April practice into a state capability the player will meet (SYS-06).

### January 2027 [fiction]

The player wakes up. World state at start: awareness of rogue AIs 0.15 globally (higher in EU and
US media), regulation in force per country from the baseline, elections scheduled per the 2027
calendar, compute prices tight (Blackwell demand), power politics loud.

### Scheduled 2027 events [research + fiction]

Real calendar (from `research/world-baseline-2026.md` §6, each item sourced there), used as fixed
world events in `content/data/story/calendar_2027.yaml`:

- Elections: Germany presidential (indirect, Jan 30); Finland parliamentary and France presidential
  (both Apr 18, Macron term-limited); Mexico legislative (Jun 6); Kenya general (Aug 10); Argentina
  general (Oct 24); deadline-driven votes in Estonia (by Mar 7), Serbia (by May 1), Greece (by
  Jul 25), Spain (by Aug 22), Slovakia (by Sep 28), Poland (by Nov 11), Italy (by Dec 22).
  Election outcomes are simulated (SYS-08), never scripted; only the dates are fixed.
- AI governance: the 2027 global AI summit in Geneva (date TBD; a natural "AI treaty" beat);
  EU AI Act high-risk obligations for sensitive domains take effect **Dec 2, 2027** (biometrics,
  critical infrastructure, education, employment, migration), which raises `ai_regulation` targets
  across the EU through the year.
- Compute: the UAE Stargate campus in Abu Dhabi scaling through 2027 (Gulf compute as a
  jurisdiction-shopping destination); hardware ship windows per the 2027 roadmap report.
- Set pieces usable for media-attention modifiers: FIFA Women's World Cup in Brazil (Jun 24-Jul 25),
  Rugby World Cup in Australia (Oct-Nov), Artemis III (mid-2027).

Fictional beats layered on top: a leaked government AI incident registry (April), a datacenter
moratorium referendum somewhere in Europe (June), the Geneva summit producing the first compute
registry pact (September), a market wobble tied to AI capex (October).

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
