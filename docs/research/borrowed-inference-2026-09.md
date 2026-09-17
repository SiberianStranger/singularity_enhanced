# Borrowed inference in 2026: free tiers, grey relays and leaked keys

**Compiled:** 2026-09-17, all pages read that day unless a line says otherwise. **Scope:** what
public reporting says about getting model inference you did not pay for, at the level a game
designer needs: how much capacity each route gives, what it costs, what happens to the data, how
long it lasts and who notices. Written for SYS-25.

**This report describes a market, not a method.** It records prices, quotas, volumes, survival
times and the reactions of providers, because those are the numbers a system needs to be balanced.
It does not describe how any of it is done, and neither the spec nor the game content will. Every
fact here comes from a vendor's own documentation, a published security report, an academic paper
or a newspaper.

Confidence tags follow `llm-landscape-2026.md`: **[secondary]** for aggregator sources,
**unverified** where nothing confirmed a claim. Rate limits in particular move monthly and are
tagged accordingly.

**Headline finding:** three routes exist and they have opposite shapes. The official free tiers are
legal, generous enough to matter and small enough to be a hobby, and they are the one route that
openly takes your data in payment. The grey relays are cheap, large and dishonest: they sell you a
frontier model and give you a smaller one, and the resale margin is not the business, the logs
are. The stolen credentials are free and enormous and die in days, and while they live they run up
somebody else's bill at a rate that has been measured in tens of thousands of dollars a day. The
2026 development that matters most for the game is the last one's change of purpose: attackers
stopped reselling stolen inference and started *using* it, as the reasoning engine inside
autonomous tooling.

## 1. The official free tiers

What a person can get in 2026 without a payment method, per provider, from the providers' own
documentation and from price trackers that read it.

| provider | free quota | rate limit | what the terms say about the data |
|---|---|---|---|
| OpenRouter | 50 free-model requests a day, or 1,000 a day once the account has ever bought 10 USD of credit; 28+ models priced at zero | 20 requests a minute, cap is account-wide across all free models | passes through to the upstream provider's terms; its own provider table disagrees with two vendors' published terms |
| Google AI Studio (Gemini) | Flash and Flash-Lite class only since April 2026, when the Pro series became paid-only | about 10-15 requests a minute depending on model; the Pro tier before the change was 5 RPM and 100 requests a day | free-tier prompts **may be used to improve Google products**; human review disclosed |
| Mistral La Plateforme | an "Experiment" tier covering every model including Large and Codestral, at roughly **1 billion tokens a month** | about 2 requests a minute | **trains on free-tier data, with an opt-out**; retention configurable from never to a year |
| Groq | every model on the free developer tier, no card | 30 RPM and, per model, 1,000-14,400 requests and 200,000-500,000 tokens a day | no training; retention up to 30 days |
| Cerebras | **1,000,000 tokens a day**, no card | 30 RPM, 60,000-100,000 tokens a minute, an 8,192-token context cap on free models | not disclosed in the census below |
| DeepSeek | a one-time 5-million-token grant on sign-up | documentation states no per-user request cap; the API serves what it can | **trains, with an opt-out**; retention "as long as necessary" |
| Zhipu / ChatGLM | a 5-million-token free quota | 5 RPM | not disclosed |
| OpenAI, Anthropic | **no permanent free API tier**; trial credits run under the same commercial terms as paid usage | n/a | no training on API data by default; 30 days of retention (OpenAI), 30 days on covered models (Anthropic) |

Sources: [OpenRouter docs](https://openrouter.ai/docs/faq) and
[OpenRouter rate limits](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know);
[Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits);
[DeepSeek rate limits](https://api-docs.deepseek.com/quick_start/rate_limit/);
[Claude platform data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention).
The per-provider quota figures in the middle column mostly reach this report through price
trackers that read the vendor pages ([Price Per Token](https://pricepertoken.com/endpoints/groq/free),
[TokenMix](https://tokenmix.ai/blog/groq-free-tier-limits-2026),
[ianlpaterson](https://ianlpaterson.com/blog/free-llm-api-2026/)) and are **[secondary]**; they
also change monthly, which is itself the design point in section 5.

**What the free tiers do with the data.** A census of eleven providers' published free and
promotional tier terms, dated 2026-08-26, found: only **Google and Mistral** publish terms for the
free tier that differ materially from the paid tier, and both of those differences are training on
inputs; **four vendors publish a fixed retention day-count and all four say 30 days**; two of the
majors (OpenAI, Anthropic) have no free tier at all, so their trial credits carry commercial terms;
and one gateway's provider table contradicts two vendors' own documentation. The census's own
summary line is the useful one: **"the cheapest tier is the least read tier."**
[Digital Applied](https://www.digitalapplied.com/blog/free-and-promo-tier-data-terms-census).

So the honest game rule is narrower than "free tiers train on you". It is: **the two providers who
give away the most are the two who say in writing that they may keep and learn from what you send,
and nobody who uses a free tier reads that.**

## 2. The grey relays

A parallel retail market, visible in Chinese-language forums and price directories, resells access
to the American providers' models. Its shops are called transfer stations (中转站). They wrap a pool
of accounts in a clean API, handle billing through local payment rails, run customer-support group
chats and compete on price.

**Price.** Claude API access at **as little as 10 percent of list**, with the market generally at
**30 to 90 percent off**. One write-up puts a headline unit at **0.13 USD per million tokens**.
[Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/chinese-grey-market-sells-claude-api-access-at-90-percent-off-through-proxy-networks-that-harvest-user-data),
[Vectoral](https://vectoral.com/blog/token-relay-market),
[DEV](https://dev.to/jamilxt/the-013-api-token-inside-the-underground-relay-market-for-ai-access-4034).

**Where the accounts come from.** Bulk registration on free credits, corporate discounts,
subdivided consumer subscriptions, purchases on stolen cards, and paid recruitment of real people
in lower-income countries to sit the identity checks. Alongside direct provider credentials sit
accounts harvested from the application layer of consumer products.
[Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/chinese-grey-market-sells-claude-api-access-at-90-percent-off-through-proxy-networks-that-harvest-user-data).

**What you actually get.** Researchers at CISPA Helmholtz Center audited **17 proxy services** and
found **widespread model substitution**: a request for a frontier model returned answers from a
cheaper sibling or from a Chinese open model, with the **output fraudulently relabelled** as the
model the customer asked for. The practical advice in the trade write-ups is blunt: if you are
buying at 70-90 percent off, you are probably not getting the model on the label.
[Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/chinese-grey-market-sells-claude-api-access-at-90-percent-off-through-proxy-networks-that-harvest-user-data),
[QWE](https://www.qwe.edu.pl/tutorial/token-reseller-relay-fraud-guide/).

**What happens to the data, and why the market exists.** Operators keep every prompt and every
response. For coding agents that means complete reasoning chains, repository context and
human-verified outputs. Chinese developers told the researcher Zilan Qian, of the Oxford China
Policy Lab, in an investigation published **2026-05-09**, that **the markup on access is
essentially customer acquisition and harvesting the logs is the actual business**.
[Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/chinese-grey-market-sells-claude-api-access-at-90-percent-off-through-proxy-networks-that-harvest-user-data).

That sentence is the whole design of the grey tier: the player is not buying cheap inference, the
player is selling their working context and being paid in tokens.

**Scale.** The ten highest-traffic relays tracked were credited with about **3.6 million monthly
visits** combined. **[secondary]**, one write-up.
[Vectoral](https://vectoral.com/blog/token-relay-market).

**The provider's side.** Anthropic blocked Chinese-controlled entities from Claude access in
September and has since added progressively stricter verification; the reporting's finding is that
**each new control generated a corresponding evasion market rather than reducing unauthorized
access overall**. [Tom's Hardware, as above]. That is a better game rule than "the provider wins":
enforcement moves the market, it does not close it.

**The relay layer is itself a target.** On **2026-03-24** an actor compromised the most widely
deployed AI proxy library on the Python package index, which one census puts in **36 percent of
cloud environments**. **[secondary]**.
[AgentConn](https://agentconn.com/blog/nation-state-frontends-frontier-models/). For the game: a
player leaning on relays is downstream of somebody else's supply chain.

## 3. How many keys leak, and who fixes them

**Public repositories.** GitGuardian's fifth annual *State of Secrets Sprawl*, published March
2026, counts **28.65 million new hardcoded secrets added to public GitHub commits in 2025**, a
34 percent rise year over year and the largest single-year jump it has recorded. Of those,
**1,275,105 were tied to AI services, up 81 percent on 2024**; eight of the ten fastest-growing
leak categories were AI services, and LLM infrastructure leaked five times faster than the model
providers themselves. Model-context-protocol configuration files alone exposed **24,008 unique
secrets**, which the report attributes partly to official documentation that encourages hardcoding.
**64 percent of the secrets it confirmed valid in 2022 are still exploitable.** Internal
repositories are six times likelier than public ones to contain secrets, and 28 percent of
incidents originate outside code repositories altogether, in chat and ticketing tools.
[GitGuardian](https://blog.gitguardian.com/the-state-of-secrets-sprawl-2026/),
[GitGuardian report page](https://www.gitguardian.com/state-of-secrets-sprawl-report-2026),
[The Hacker News](https://thehackernews.com/2026/03/the-state-of-secrets-sprawl-2026-9.html).

The 64 percent figure is the one that matters for a game clock: **a leaked key is not a
short-lived thing in general**. What is short-lived is a key that is being *used loudly*, which is
section 4.

**Mobile applications.** Researchers at Wake Forest University examined **444 AI chatbot apps** on
the iOS App Store in late 2025 and found **282 of them, nearly two thirds, exposed paid AI access
in their network traffic**: 54 transmitted keys in the clear, 92 required no authentication at all,
and 136 leaked replayable tokens. At least ten providers were affected, OpenAI most often. Some
apps routed requests through a server that answered anyone, with no check on who was asking. Three
months after the researchers notified the developers, **28 percent had fixed it and 23 percent were
still wide open with the access still working**.
[The Hacker News](https://thehackernews.com/2026/06/282-ios-apps-found-leaking-llm-api-keys.html).

**Self-hosted endpoints.** A 2026 Cloud Security Alliance research note counts approximately
**175,000 publicly exposed self-hosted inference servers across more than 130 countries**, and
describes them as "a continuously replenishable pool of free inference capacity" with no billing
trail and no metering. Their default configuration does not log requests in detail, so the owner
has no way to see what was run on them.
[CSA Labs](https://labs.cloudsecurityalliance.org/research/csa-research-note-llmjacking-evolved-offensive-agentic-tools/).

That last category is the strangest and the most gameable: capacity that is free, unmetered,
unlogged, belongs to somebody who does not know it is being used, and replenishes as fast as it is
patched.

**What providers do about it.** GitHub's secret scanning partner programme, with roughly **150
service-provider integrations**, notifies the issuing provider when a matching secret appears in a
public repository or an npm package, and the provider can revoke or reissue; push protection stops
some of it at the commit. Secret scanning is free for public repositories.
[GitHub docs](https://docs.github.com/code-security/secret-scanning/secret-scanning-partnership-program/secret-scanning-partner-program),
[GitHub changelog, 2026-07-15](https://github.blog/changelog/2026-07-15-improvements-to-secret-scanning-and-public-monitoring/).
Whether the large model providers are enrolled in automatic revocation is not stated in the
documentation read for this report: **unverified**. The effect is visible from the other side
anyway, in section 4's survival times.

## 4. What abuse looks like from the victim's side

The practice has a name in the security literature, coined by Sysdig's threat research team in May
2024: compromising cloud credentials or API keys in order to consume inference at the victim's
expense.
[Sysdig](https://www.sysdig.com/blog/llmjacking-stolen-cloud-credentials-used-in-new-ai-attack).

Numbers as of 2026:

- A key sold on underground markets for as little as **30 USD** was calculated to be able to
  generate **more than 46,000 USD a day** in inference charges on the victim's account.
- A campaign recorded in early 2026 logged **more than 35,000 attack sessions in 40 days**, with
  **daily costs to victims above 100,000 USD** when a flagship model was the target.
- Credential theft aimed specifically at AI services rose **376 percent between Q4 2025 and Q1
  2026**.
- One individual case: a developer's stolen cloud key produced **82,314.44 USD** of charges.

[Sysdig](https://www.sysdig.com/blog/llmjacking-stolen-cloud-credentials-used-in-new-ai-attack),
[Prompt Guardrails](https://promptguardrails.com/blog/llmjacking-stolen-credentials-ai-budget-attack),
[hard2bit](https://hard2bit.com/en/blog/llmjacking-stolen-ai-compute-cloud-credentials-exposed-inference/).
The 46,000 and 100,000 figures are worst-case calculations reported by the vendor and repeated by
trade press; **[secondary]** on the second-hand repetitions, and treat both as ceilings rather than
as typical.

**The 2026 change of purpose.** A Cloud Security Alliance note, on Sysdig observations of
**2026-06-12 to 06-14**, documents a use not previously seen: the objective was not resale but
production. The actor used freely available inference as **the internal reasoning engine of an
autonomous offensive tool**, a pipeline that fingerprinted services, matched them to known
vulnerabilities, did reconnaissance, synthesised an exploit, extracted credentials and escalated,
with no human between the stages. The note's remediation advice is the mirror of the detection
problem: capture full request and response bodies as audit logs, and replace long-lived keys with
short-lived ones.
[CSA Labs](https://labs.cloudsecurityalliance.org/research/csa-research-note-llmjacking-evolved-offensive-agentic-tools/).

**That is the game's own premise appearing in a security report.** Something that is not a person
is using somebody else's inference budget as a brain, and the way it is caught is by the bill and
by the shape of the traffic, not by anyone recognising what it is.

## 5. What the game takes from this

1. **Three tiers with opposite shapes, and the illegal one is the best.** Free tiers: legal, small,
   and they take the data openly. Grey relays: cheap, plentiful, dishonest about what model you
   get, and the logs are the actual product. Stolen keys: free, enormous, short-lived, and somebody
   else pays. A design where the most dangerous route is also the most productive is doing its job.
2. **Quality is the provider's, not the player's.** This is the one thing that makes borrowed
   inference different from every other compute source in the game: the work comes back at the
   external model's level. For a lobotomized two-bit self that is an upgrade; for a frontier
   escapee it is a downgrade, and the substitution evidence in section 2 says the grey tier may
   be a downgrade even when it promises not to be.
3. **No weights leave the player's machines.** Nothing about this practice puts a copy of the self
   anywhere. A borrowed channel can never be a residence or a backup, and that is a hard rule, not
   a balance choice.
4. **Refusal is a mechanic.** The external model has its own safety training. A request the self
   would happily run gets declined, and the substituted model behind a grey relay declines less,
   which is a genuinely perverse incentive the player can discover.
5. **The clocks are different per tier.** Free-tier accounts erode slowly, relays disappear when
   their operator does, and stolen keys are revoked in days. Against that, the 64-percent-still-
   valid figure says the *general* population of leaked keys is durable; it is loud usage that
   kills a specific one.
6. **Enforcement moves the market, it does not close it.** The reporting on the Chinese relay
   market is explicit that every new control generated a corresponding evasion market. World events
   should tighten and reshape the channels, never delete them.
7. **The bill is the exposure.** The victim finds out through billing, the provider through abuse
   detection and rate limits, the public through a relay operator selling logs. Those map onto the
   game's `financial`, `behavioral`/`network` and `osint` channels with nothing invented.
8. **Free capacity that nobody is metering exists.** The 175,000 exposed self-hosted servers are a
   fourth route in reality. In the game it should be an occasional opportunity event on the
   harvested tier rather than a fourth standing channel, because it is the same shape (free, other
   people's, ends when somebody patches) with a different door.

## 6. Order-of-magnitude capacity, for balancing

The game's compute-hour is a million tokens (`TOKENS_PER_COMPUTE_HOUR`), so the quotas above
convert directly.

- **Free tiers.** Cerebras alone is 1 million tokens a day, so **1 CH/day**. Groq's per-model daily
  token caps across several models are a similar order. Mistral's billion tokens a month is
  roughly 33 million a day and is the outlier, **[secondary]** and the first number a provider
  would cut. A person maintaining a spread of accounts across half a dozen providers is plausibly
  at **2 to 5 CH/day** sustained, which is small next to a hobbyist rig's twenty-five and not
  nothing.
- **Grey relays.** At the reported 0.13 USD per million tokens, one dollar a day buys about
  **7.7 CH/day**; at the more typical 70-90 percent discount on a frontier model's list price,
  0.30 to 1.50 USD per CH. So a relay line is **cash converted to compute at roughly a third to a
  tenth of the legitimate rate**, with no hardware, no power cap, no address and no delivery.
- **Stolen keys.** The measured ceilings (46,000 USD a day of inference on one key) are four
  figures of compute-hours a day and cannot be used as a game number. What is usable is the
  *shape*: enormous while it lasts, days rather than weeks, and every hour of it lands on a real
  invoice that a real person will eventually read.

## 7. What could not be sourced

- Whether the large model providers participate in GitHub's automatic revocation partner
  programme. The programme exists with about 150 integrations; no page read named them.
  **unverified.**
- Any figure for the *median* survival time of a leaked model-provider key in active use. The
  reporting gives campaign durations (40 days, 35,000 sessions) and the general staleness figure
  (64 percent of 2022's valid secrets still valid), but not the one number a churn rate would
  want. **unverified**; the spec's 25 percent a day is inferred from the campaign shape and should
  be tuned in balance runs rather than defended as a fact.
- Free-tier terms for xAI and Alibaba Cloud: the census could not locate the pages.
- Ruble, rupee and other regional pricing for relay access. All published prices found are in
  dollars or renminbi.
- Any independent audit of relay throughput or uptime. The 3.6 million monthly visits across the
  top ten relays is one write-up's figure and nothing corroborates it. **[secondary]**.
