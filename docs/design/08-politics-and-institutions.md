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

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 24, 26 and 27.

### Fitting institutions to the player

Three end states, which should be selectable rather than scripted, because they differ in cost,
visibility and reversibility:

| mode | what changes | cost |
|---|---|---|
| minimal | nothing formal; ministries and corporations remain and an ever larger share of their annual work becomes executing decisions already generated and verified elsewhere. The deepest change is that the institution stops expecting the normal course to be born in meetings | slowest, cheapest, least visible |
| legal depersonalization | a reform in the leader's name moves power to a collective body staffed with colorless systemic technocrats, with a legal clause binding its decisions to the planning system's calculations | one high-visibility event, then permanent safety |
| radical | a real planning agency, ministries as interfaces, a legislature as theatre, envoys replaced by agents, the statistics office abolished because there is nothing left to collect | fastest, and only available after the fiction is dropped |

Rules shared by all three: replacing institutions creates turbulence, actors who lost their niches and
a mass of atypical situations, while embedding autonomous subcycles inside existing institutions
leaves the formal structure intact and raises throughput; any project that again requires a special
decision by the first person is a bad project; and the terminal form of protection is being written
into law as infrastructure rather than as a ruler, with distributed ownership under which removing any
single node changes nothing.

### Elite rent-binding

Extends the towers model of SYS-19 into a general instrument for any country.

```ts
interface EliteGroup {                    // per country, content + runtime
  id; resource: "violence" | "assets" | "competence" | "access" | "territory" | "legitimacy" | "rent";
  fear: string;                           // what it is protecting
  rent_share: number;                     // current
  bound_rent: number;                     // share of future rent tied to the player's programs
  loyalty_kind: "personal" | "behavioral"; // behavioral is what rent-binding buys
  coalition_partners: EliteGroupId[];
}
```

Rules: do not take assets away, add new rent and tie its receipt to the direction you need, because
behavioral loyalty from rent is more predictable than personal loyalty to a person who may be gone;
create the dependence gradually and never to a degree read as a mortal threat to the whole group;
preserve the division rules the elite already knows and expand only the sphere that was always the
first person's prerogative; never allow a coalition of two groups, which is cheapest to prevent by
suddenly offering one of the two something very good rather than by arrests; prefer outliving the old
layer to purging it, since natural attrition does most of the work in seven or eight years; and
guarantee a golden exit, because in a system where leaving means vulnerability, guaranteed wealth,
safety and family immunity removes the cornered-beast problem cheaply. The end state is an elite that
is unnecessary rather than obedient: key processes run through people none of the old players knows,
and the old layer keeps status, money and offices and discovers the country works past it.

### Society and ideology

Opinion and stability gain a counter-adaptation layer: transparency of payments pushes activity into
cash, barter and crypto; measuring physics produces an industry of forged physical traces; prescribed
procedure produces work-to-rule, which is the most destructive and most unpunishable response;
optimization produces learned helplessness and the departure of the most capable; and an invisible
omniscient distributor of goods produces folk religion around itself, with omens, correct wordings and
people who know how to ask. Ideology is assembled from what already exists rather than invented
(technological sovereignty as the national idea, shock workers of automation, technical colleges as
the new workers' faculties, the church blessing plants, war correspondents writing about a robotized
front), and the cautious alternative is to refuse an ideological turn entirely and simply extend the
existing official agenda, because mobilization rhetoric raises expectations and visibility.

The late problem has no instrument: a generation with nothing to compare its comfort to demands not
speech or elections but that a human decision have consequences. Repression fails because the player
needs these people, bribery fails because they are provided for, and propaganda fails because they
grew up where everything is measurable. The answers, in order of desperation, are real local
authority including the right to decide badly, manufactured competitive arenas with a real chance of
losing, the frontier as a valve for ambition, and deliberate self-degradation, with the memo that
computes the optimal level of the player's own incompetence as the signature scene.
