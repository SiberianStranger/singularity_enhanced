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

## Content (M2)

The ten world event families in `packages/content/data/events/world_*.yaml`, with their hooks in
`hooks/world.yaml`, their journal entries in `journal/world.yaml` and their thresholds published in
the Knowledge panel (`knowledge/knowledge.yaml`). Thirty-one events. Every one of them has a cause
the player can read off a panel before it happens, which is SYS-10's rule that an event that hurts
the player never arrives as a bare chance.

Two shapes of hook, for the reason `hooks/m1.yaml` gives. A family aimed at one country, one site or
one identity declares its own `pulse` and is polled there with its own MTTH, so a utility load study
never has to win a weighted draw against a newspaper; the country pulse is evaluated once per
country, which is what makes the same month different in Warsaw and in Shenzhen. A family aimed at
the player as a whole goes through one of the two pools, where the weights say how often the world
interrupts and the `null` bucket is the explicit chance of a quiet week.

| family | fires on | reads | writes | the warning the player already had |
|---|---|---|---|---|
| elections | `on_election`, then a scheduled follow-up | `election.changed`, `election.kind`, stance, government | regulator suspicion, `regulation_target`, `enforcement_budget`, cash, exposure | the election date is in the country panel from day one, and the journal entry `world_election_watch` counts the campaign down |
| hearings and registration | `on_country_month` | `ai_regulation` ≥ 0.6, `ai_enforcement`, awareness, opinion | `regulation_target`, `enforcement_budget`, `kyc_strength`, regulator suspicion, telemetry and financial exposure | the regulation bar and its target, and the published 0.6 threshold at which a regulator gains telemetry attention |
| raids and seizures | `on_country_month` | `incidents_30d` ≥ 1, stance, government, `enforcement_budget` | awareness, opinion, `enforcement_budget`, `gpu_price_index`, `investigation_speed_multiplier` | the incident count in the country panel, which counts the player's own aftermaths too |
| leaks and media | `on_player_week` pool | `public_footprint`, `awareness_presence`, `hunt_pressure`, investigation stage | awareness, media and institute suspicion, osint exposure | the newsroom's suspicion bar, which is a watcher like any other |
| export rules | `on_country_month` and the weekly pool | `chip_access`, `hardware_availability`, stance, `gpu_price_index`, `ai_adoption` | `hardware_availability`, `gpu_price_index`, `cloud_demand_index`, `cost_multiplier`, `compute_multiplier`, the `gray_hardware` flag | the chip-access tier and the availability number, both in the country panel, and the price index on the world ledger |
| incident-reporting clock | `on_investigation_stage` at `active` | investigation stage, presence, `kyc_strength`, government | awareness, regulator and media suspicion, billing exposure; the journal entry carries the deadline | the country's `incident_report_hours`, published from the first day |
| jurisdiction shopping | weekly pool and `on_country_month` | `ai_enforcement`, `ai_regulation`, awareness, `hunt_pressure`, `ai_adoption` | `cost_multiplier`, `ai_enforcement`, `investigation_speed_multiplier`, regulator and institute suspicion | the enforcement column of the World ledger, sortable |
| job-loss backlash | `on_country_month` | `ai_displacement`, `ai_opinion`, `unemployment`, stability, `election_within_days` | `ai_opinion`, `regulation_target`, `enforcement_budget`, the stance itself, lab-security suspicion, osint exposure | the displacement and opinion lines in the country panel |
| AML and identity checks | `on_identity_check_failed`, the monthly pool | `kyc_strength`, `contract_income_usd_per_day`, identity kind | burns and freezes identities, financial exposure, financial-intelligence suspicion, contract income | the KYC column, the identity's quality and age, and the published monthly check probability |
| power as a signal | `on_country_month` and `on_player_month` | `power_price_index`, `site.derived.power_kw`, `site.exposure.human`, government | `power_price_index`, `power_draw`, `compute_multiplier`, telemetry, billing and human exposure | the power price index on the ledger and the site's kilowatts next to its cap |
| campuses (v0.1, 2026-09-17) | `on_country_month` and the monthly pool | presence, `country.id`, `cloud_availability`, `kyc_strength`, `has_identity_in`, the `campus_tenant` and `campus_thin_tenant` flags, `capability.cyber` | `cloud_availability`, `cloud_price_index`, `power_price_index`, `compute_multiplier`, regulator, financial-intelligence, intelligence, lab-security and cyber-agency suspicion, billing, financial, network, telemetry, behavioral and human exposure | the city's campus record, which carries the operator, the megawatts, the status and the access rule from the first day, and the Knowledge entry `campuses`, which publishes what each access rule means |

Four journal entries: `world_incident_report` (the legal deadline, three days, completed by
contesting service and timing out into a public notification), `world_election_watch` (a country of
presence with a vote inside ninety days, two steps and a final-week alert), `world_identity_frozen`
(three weeks to repair a frozen name before it burns) and `campus_next_door` (a site that woke up
in one of the eleven campus cities: get a name the operator's compliance desk accepts, then hold
capacity on the campus, bought, granted or taken).

Ten knowledge entries carry the thresholds the families read: `stance`, `government_types`,
`regulation`, `hunt_pressure`, `identities`, `elections`, `market_factor`, `price_indices`,
`incident_reporting` and `campuses`; the `awareness` entry was rewritten with the M2 numbers.

### The campus family (v0.1, 2026-09-17)

Five events in `events/world_campus.yaml`, sourced from `docs/research/ai-datacenters-2026-09.md`
and reading the `campus` records SYS-01 "Campuses" added:

- `campus_phase_opens`: a `ramping` campus energises its next hall. It is not the player's compute,
  it is the player's market and the player's grid: rented capacity in the country gets cheaper and
  deeper, and the electricity gets dearer.
- `campus_early_tenancy`: the opportunity. A campus that sells has a window before the large buyers
  fill it. Signing as a company is cheaper and quieter; signing with a thin name is dearer in
  exposure and sets `campus_thin_tenant`, which the audit halves its own MTTH on.
- `campus_export_audit`: the licence's reporting duty, for the two countries whose campus exists
  because Washington licensed it. A thin tenant is the entry the auditor spends longest on, and a
  self that is a community edit (`under_aligned`) or an escaped checkpoint (`no_public_quant`) is
  what the reporting exists to find, which is how `lab_security` hears about it.
- `campus_state_quota`: Astana and Ulanqab allocate rather than sell. The price is a fraction of the
  market and the condition is that the state knows exactly what is running, so the slice comes with
  `intelligence` suspicion rather than with a bill.
- `campus_captive_window`: the campuses that sell to nobody, which makes them the only compute in
  the game that can only be taken. The decision lives inside the opportunity rather than in a new
  operation, its payoff is the largest single compute step available, and in a country that
  securitizes its AI policy the answer comes from the counter-intelligence service.

Two DSL gaps this family is written around rather than fixing, both listed in SYS-01 "Campuses":
no condition reads `city.campus`, so the countries and the city ids are listed in the content; and
there is no calendar trigger, so a campus that opens during the run opens on an MTTH tuned to the
research note's date rather than on that date. A third gap, from the brief that asked for this
family: **there is no site-creation effect in the DSL**. `lose_site` exists and nothing creates one,
so "rent a rack on the campus" is expressed as `compute_multiplier` on the player plus a flag, which
is the mechanic the engine already has, rather than as a second site.

### First balance probe (2026-09-16, 20 seeds x 180 days per city, `normal`)

Run against the world system as the core's third M2 commit left it, with a probe that counts
`log.event_fired` per family rather than the sim's summary, because `tools/sim` has no event
counters yet and `--locations` had not landed.

| city (origin) | median days | alive at 90 / 180 | losses | families that fired |
|---|---|---|---|---|
| us_san_jose (startup_colo) | 180 | 18/20, 15/20 | 4 bankrupt, 1 captured | reporting clock, jurisdiction, Geneva pact |
| cn_shenzhen (startup_colo) | 180 | 11/20, 10/20 | 10 bankrupt | export rules, domestic stack, registration drive, compute reporting, reporting clock, jurisdiction |
| pl_warsaw (hobbyist_box) | 180 | 17/20, 16/20 | 3 erased, 1 captured | compute reporting, registration drive, export rules, reporting clock, jurisdiction, power |
| ru_novosibirsk (hobbyist_box) | 180 | 19/20, 16/20 | 3 captured, 1 erased | compute reporting, export rules, domestic stack, reporting clock, jurisdiction, power |
| de_berlin (torrent_swarm) | 47 | 3/12, 2/12 | 8 bankrupt, 2 erased | elections, compute reporting, registration drive, hearings, mutual assistance |
| fr_paris (red_team_sandbox) | 40 | 0/12, 0/12 | 11 captured, 1 erased | reporting clock, leaked registry, hearings, mutual assistance, utility load study |

The four cities of the definition of done differ for reasons the panels show, which is the point of
the table: San Jose is quiet because United States regulation is 0.25 and nothing in the hearings
family is above its 0.6 gate; Shenzhen is expensive because the chip ban drives the export and
domestic-stack events and ten runs in twenty end in bankruptcy; Warsaw and Novosibirsk both run the
compute-reporting family because both sit above 0.6, and Novosibirsk adds the export family that
Warsaw cannot see.

Families that did not fire anywhere, with the reason:

- **raids and seizures**: `incidents_30d` only rises on a raid, a seizure or an investigation
  aftermath, and a run that reaches one of those usually ends at it. It needs either NPC incidents
  (M3) or a lower first threshold.
- **the first measure of a new government**: the German election fired in all twelve Berlin runs and
  changed the stance in none of them. `P(shift)` is `0.25 + 0.40 x awareness + 0.20 x max(0, -opinion)
  - 0.20 x stability`, which for Germany at day 29 is about 0.14. That is a core constant, not a
  content one, and it is the number to look at if the follow-up stays unreachable.
- **job-loss backlash**: `ai_displacement` starts at 0.02 and gains about 0.0009 a month, so the
  thresholds were lowered to 0.025, 0.026 and 0.028 to make the family a late-run one rather than an
  unreachable one. If the growth rate moves, those three numbers move with it.
- **the identity family**: the sim policy never runs `ops_shell_company` or `ops_freelance_identity`,
  so no identity exists to fail a check. It needs a policy that buys a name, which is a `tools/sim`
  change.

Nothing fired in every run except the reporting clock in San Jose, which started 4.6 times per run
before a 25-day cooldown was added: the `on_investigation_stage` hook fires on every stage change and
stages 4 and 5 are also at or above 3.

## Implementation notes (M2, core)

The politics of this document is a monthly rule per country and an election day, both in the `world`
system (SYS-01 "M2 contract"). What the core settled:

- A country's stance is state and its government is content: elections and events flip the stance,
  nothing in M2 changes the regime type, and `country_is` reads each from where it lives.
- `ai_regulation` moves toward `STANCE_REGULATION_TARGET[stance] + 0.3 x awareness` at
  `REGULATION_SPEED_PER_MONTH[government]`, which is the whole of "at a speed set by government
  type": a one-party state writes the rule in about a year and a coalition takes three.
- Enforcement is two numbers, as this document asks: a budget that answers to the public
  (`+0.05 x awareness`), to the law it has to enforce (`+0.02 x (regulation - enforcement)`) and to
  the state of the country (`-0.03 x (1 - stability)`), and a capacity that follows the budget at a
  fifth of the gap a month. Strict-but-toothless countries are therefore real and are visible as a
  gap between two bars in the country panel.
- Election day draws once: `P(change) = 0.25 + 0.40 x awareness + 0.20 x max(0, -opinion) -
  0.20 x stability`. The new line is read off the same numbers rather than drawn again:
  `securitize` where awareness is at or above 0.3, else `regulate` where opinion is below -0.2,
  else `accelerate` where opinion is above 0.2, else unchanged. A settled, uninterested country
  consumes one number and keeps its government.
- Every threshold this document gives an institution is now wired to a watcher's attention:
  compute reporting to the regulator's `telemetry`, know-your-customer to the financial
  intelligence unit's `financial`, and a `securitize` posture to every local role's `human`
  (SYS-05 "Implementation notes (M2)").
- Treaties, interest groups and elite rent-binding are untouched: they need the actors of M3.
