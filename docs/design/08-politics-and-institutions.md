# SYS-08: Politics, institutions, regulation and opinion

Status: v0. The politics of AI is the environment the player lives in, not something the player
controls directly; influence is indirect and expensive.

## Per country (from SYS-01)

- `government`: type (`liberal_democracy`, `illiberal_democracy`, `one_party`, `military`,
  `monarchy`, `hybrid`) and the governing coalition's **AI stance** (`accelerate`, `regulate`,
  `securitize`, `ignore`), which sets targets for `ai_regulation`, enforcement budgets and posture
  toward foreign investigations.
- `stability` (0..1) from data, moved by economy and events; low stability weakens enforcement and
  makes corruption-based countermeasures cheaper.
- **Institutions** (actors, SYS-06): AI regulator, cyber agency, intelligence, police, financial
  intelligence unit, courts (as a competence/independence number), central bank (economy), media
  landscape (freedom score), academia. Each has budget, competence, independence.
- **Elections** from the 2027 calendar (research) and government-type cadences; outcomes drawn from
  opinion, economy and events, with a stance shift on change. Non-electoral change through events.

## Regulation and enforcement

- `ai_regulation` (0..1) is the strictness of rules in force: model registration, compute reporting,
  incident reporting, datacenter licensing, KYC for cloud, hardware tracking. Each threshold enables
  specific watcher behaviors (e.g., compute reporting above 0.6 gives regulators `telemetry`
  attention).
- `ai_enforcement` (0..1) is real capacity; it lags regulation and depends on budgets and
  competence. Strict-but-toothless countries are shelters until an incident wakes them.
- International: treaties (compute registry, mutual assistance), export-control blocs, extradition;
  modeled as flags on country pairs plus a few global entities (EU AI Office, an international
  network of AI safety institutes).

## Public opinion and awareness

- `ai_opinion` (-1..1): sentiment toward AI in general; moved by economy (displacement negative,
  growth positive), incidents, media, and player campaigns.
- `awareness` (0..1): belief a rogue AI exists; moved by watcher publications, leaks, NPC AI
  incidents, and player exposure. Drives securitize stances, budgets and hunt cooperation.
- Media actors publish on evidence and on sentiment; a free press makes awareness rise faster but
  also makes governments accountable (less arbitrary action).

## Player influence (indirect)

Operations and decisions: fund think tanks, run persuasion campaigns (raise `osint` exposure), lobby
through companies, leak documents about rivals, support candidates (elections), provide services to
governments (the "go legit" path), or manipulate incidents. Effects are slow, probabilistic and
visible in the country panel as modifiers with sources.

## UI

Country panel tabs: overview (stance, stability, regulation/enforcement bars with sources, opinion,
awareness), politics (government, next election, coalitions), institutions (actors with budgets and
competence; what they can see), timeline (scheduled events), player standing (identities, sites,
investigations there). World panel: sortable table of countries with map-mode links; treaties list.
