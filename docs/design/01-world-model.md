# SYS-01: World model (countries, macro-regions, cities, sites)

Status: v0. Data comes from `docs/research/world-baseline-2026.json` (compiled by research) and is
authored into `packages/content/data/countries/*.yaml`.

## Entities

```ts
interface MacroRegion { id; name_key; members: CountryId[]; }

interface Country {
  id: string;                 // iso2 lowercase: "us", "cn", "de"
  name_key: string; macro_region: MacroRegionId;
  // demography (see SYS-09)
  population: number; cohorts: Cohorts; urbanization: number; internet: number; median_age: number;
  // economy (see SYS-07)
  gdp_nominal: number; gdp_per_capita: number; growth: number; electricity_price: number;
  datacenter_mw: number; chip_access: "unrestricted" | "restricted" | "banned";
  // politics (see SYS-08)
  government: GovernmentType; stability: number; democracy: number;
  ai_regulation: number;      // 0..1 strictness in force
  ai_enforcement: number;     // 0..1 capacity to actually enforce
  ai_opinion: number;         // -1..1 public sentiment toward AI
  awareness: number;          // 0..1 public awareness of *the player* (or of a rogue AI)
  elections?: { next_tick: number; kind: string };
  agencies: Record<AgencyRole, ActorId>;   // cyber, intelligence, police, regulator, financial_intel
  relations: Record<CountryId, number>;    // -1..1, sparse
  cities: CityId[];
  languages: string[]; currency: string;
  lore_key?: string;
}

interface City {
  id: string; country: CountryId; name_key: string;
  population: number; lat: number; lon: number;
  tags: ("datacenter_hub" | "finance" | "university" | "government" | "port" | "tech")[];
  power_headroom: number;     // 0..1, how easy to get MW
  colo_price_index: number;   // relative to world average
  scrutiny: number;           // baseline local watchfulness (0..1)
}
```

Sites (player presence) are in SYS-02. Every site belongs to a city, every city to a country.

## Why cities

The original had six continents. Detection, power, price and law are local: Frankfurt is not
Berlin, Shenzhen is not Beijing, Reykjavik has cheap power and few watchers. Cities also give the
map something to click. We ship 2-6 cities per country in the baseline; content can add more.

## Map

- 110m Natural Earth countries as SVG paths. Map modes: player presence, suspicion by country,
  regulation strictness, public opinion, compute capacity, power price, awareness.
- Clicking a country opens the country panel (tabs: overview, politics, economy, agencies, AI
  scene, cities). Clicking a city marker opens the city panel with sites, providers and options.
- Macro-regions provide grouping in lists and outliner filters; they are not a simulation tier by
  default, but demography and opinion can be aggregated to them for display and for events
  ("panic spreads across Western Europe").

## Depth policy

`research/design-references.md` §6: background countries stay legible with a small visible field
set, updated by simple signed-edge rules and layered situations, never by a full population
simulation. Depth is spent where the player acts.

- Every country keeps 8-12 visible drivers (above) plus 3-5 **interest groups** with `clout` and a
  stance toward AI and toward the player (e.g., `tech_industry`, `security_hawks`, `civil_liberties`,
  `labor`, `party_line`), which is the whole "politics" of a background country and enough for events
  to bite.
- Update rules are content (`countries/rules.yaml`): signed weighted edges with delays, e.g.
  `investigation_stage → awareness (+0.4, 1 month)`, `ai_displacement → ai_opinion (-0.3, 3 months)`.
  Every rule is clamped and has a "reset to plausible" guard; the balance runner flags runaways.
- Every visible national stat maps to at least one player counterplay (SYS-05/SYS-08/SYS-17).
- A player's active countries (sites, identities, investigations) get finer updates (weekly) and
  more situations; the rest run monthly.

## Country dynamics (daily/weekly)

- `awareness` decays slowly, rises with incidents (investigations concluding, leaks, NPC AI events),
  and spills to neighbors and to countries sharing a language (media).
- `ai_opinion` drifts with awareness (mostly negative), economy (job losses negative, growth
  positive), and scripted events; elections can flip governments and thus regulation targets.
- `ai_regulation` moves toward a government target at a speed set by government type; enforcement
  capacity grows with budgets (events, opinion) and falls with instability.
- `relations` matter for extradition, joint investigations, and chip access.

## Player-relevant derived values

- **Local heat** for a city = f(country enforcement, city scrutiny, player awareness there, recent
  incidents). Feeds SYS-05 exposure multipliers.
- **Cost of doing business** = f(power price, colo index, currency, corruption proxy).
- **Legal shelter** = f(regulation, enforcement, relations with the countries hunting you).

## Open questions

- Sub-national regions (US states, Chinese provinces, EU as an entity) — v1: EU modeled as a
  supra-entity for regulation only; US states appear only in events.
- Territories (Hong Kong, Taiwan) are countries in data with a `status` note; no political stance
  is implied by the game.

## M2 contract: what core, content and client build against (v0.2, 2026-09-16)

M2 makes the 105 loaded countries different to play in (`docs/ROADMAP.md`, "M2: World"). Three
agents implement it against this section, by package: core (systems, schema, views, sim), content
(data, events, journal, knowledge, strings), client (the World ledger and the Country and City
tabs, after the playtest 5 layout pass). Everything below is the shared vocabulary; whoever
implements a rule appends the deviation to the spec that owns it (SYS-01 countries and cities,
SYS-05 watchers and clocks, SYS-07 identities and prices, SYS-08 politics, SYS-09 demography).
Numbers are starting values for `packages/core/src/balance.ts`; the balance runs move them.

### Static fields (content, `CountryDef` v0.2)

Every new field is optional in the schema with the default named here, so a bundle without it
still plays. Values are derived from `docs/research/world-baseline-2026.json` by rules written in
the file header (as the v0 fields are), plus a hand-authored overrides file for facts the baseline
does not carry (election dates, stances, agency profiles). A generator under `tools/world-data`
rewrites `packages/content/data/world/*.yaml` from the baseline and the overrides, so the data can
be re-derived when the baseline is refreshed.

```ts
type Government = "liberal_democracy" | "illiberal_democracy" | "one_party" | "military" | "monarchy" | "hybrid";
type Stance = "accelerate" | "regulate" | "securitize" | "ignore";   // SYS-08
type ElectionKind = "presidential" | "parliamentary" | "general" | "legislative";

interface CountryDef {                    // v0 fields unchanged, plus:
  government?: Government;                // default "hybrid"
  stance?: Stance;                        // default "ignore"
  stability?: number;                     // [0,1], default 0.6
  kyc_strength?: number;                  // [0,1], default 0.5; how hard identity checks bite (SYS-07)
  cloud_availability?: number;            // [0,1], default 0.3; hyperscaler and neocloud presence
  colo_availability?: number;             // [0,1], default 0.3; colocation market depth
  hardware_availability?: number;         // [0,1], default by chip_access: 0.9 / 0.5 / 0.15
  engineer_pool?: number;                 // people who could run a cluster, default 0 (SYS-09)
  incident_report_hours?: number | null;  // legal incident-reporting countdown, default null (backlog D10)
  elections?: { date: string; kind: ElectionKind }[];   // ISO dates in 2027+, default []
  election_cadence_years?: number | null; // for elections after the listed ones, default null (none)
  agency_profile?: Partial<Record<WatcherRole, { competence: number; budget: number }>>;
                                          // per local role; default competence = ai_enforcement, budget = ai_enforcement
}
```

Derivation rules (the generator documents the exact thresholds; overrides win over rules):

- `government`: EIU regime type and Freedom House status together: full or flawed democracy and
  "Free" is `liberal_democracy`; flawed democracy and "Partly Free" is `illiberal_democracy`;
  "Hybrid regime" is `hybrid`; authoritarian with a one-party or communist state in the
  `government_type` text is `one_party`, with junta, military or transitional wording `military`,
  with monarchy, emirate, sultanate or kingdom wording and no parliamentary dominance `monarchy`,
  otherwise `hybrid`.
- `stance` from `ai_policy_posture`: deregulatory or industrial-policy postures are `accelerate`;
  EU AI Act, EEA-aligned and comprehensive-act postures are `regulate`; state-directed postures
  that frame AI as national security (registration, content control, sovereignty) are
  `securitize`; no framework is `ignore`. About thirty countries get hand-checked overrides,
  every one with a source comment.
- `stability`: 0.30 + 0.40 x Freedom House score / 100 + 0.20 x (democracy index / 10),
  minus 0.25 when the 2026 timeline in `lore_notes` records a war, coup or collapse, clamped to
  [0.05, 0.95].
- `kyc_strength`: 0.25 + 0.35 x min(1, gdp_per_capita / 40000) + 0.15 when a financial
  intelligence unit is named + 0.10 for FATF-style regimes (EU, US, UK, CA, AU, JP, SG, CH, KR),
  minus 0.20 for sanctioned or collapsed states, clamped to [0.05, 0.95].
- `cloud_availability`: 0.10 + 0.15 x hyperscaler region count, capped at 1; `colo_availability`:
  0.10 + 0.20 x log10(1 + datacenter_capacity_mw / 100), capped at 1.
- `engineer_pool`: population x internet share x 0.004 x (0.5 + min(1, gdp_per_capita / 60000)),
  doubled for a Tortoise AI-index rank of 10 or better, rounded to hundreds.
- `elections`: the 2027 calendar in `docs/research/world-baseline-2026.md` section 6, then the
  government's cadence: 4 years for presidential and legislative systems, 5 for parliamentary
  ones, none for `one_party`, `military` and `monarchy`.
- `agency_profile`: hand-authored for every country in an origin's `locations` list (about forty),
  the rule for the rest: competence = ai_enforcement, budget = ai_enforcement, with the regulator
  +0.10 where `ai_regulation >= 0.6`, financial_intel +0.10 where `kyc_strength >= 0.7`,
  intelligence +0.10 for `securitize`.

### Dynamic state (core, `CountryState` v0.2) and world variables

```ts
interface CountryState {                  // v0 fields unchanged (awareness, ai_opinion, ai_regulation, ai_enforcement), plus:
  stance: Stance;                         // flips on elections and by events
  stability: number;
  regulation_target: number;              // STANCE_REGULATION_TARGET[stance] + 0.3 x awareness, clamped to [0,1]
  enforcement_budget: number;             // starts at ai_enforcement
  unemployment: number;                   // starts at 0.05, SYS-09 proxy
  ai_displacement: number;                // starts at 0.02
  power_price_index: number;              // 1.0, monthly drift (SYS-07)
  cloud_price_index: number;              // 1.0, monthly drift
  hardware_availability: number;          // from the static field; export-rule events move it
  kyc_strength: number;                   // from the static field; events move it
  next_election_tick: number | null;
  incidents_30d: number;                  // raids, seizures and aftermaths here in the last 30 days
}
// world.vars: ai_adoption (0.20, +0.01 a month), gpu_price_index (1.0), cloud_demand_index (1.0)
```

`STANCE_REGULATION_TARGET`: accelerate 0.25, ignore 0.15, regulate 0.80, securitize 0.70.
`REGULATION_SPEED_PER_MONTH` by government: one_party 0.06, military 0.05, monarchy 0.04,
illiberal_democracy 0.03, liberal_democracy 0.03, hybrid 0.02.

### The world system (core, id `world`, order 200, cadence daily)

Runs before economy (300) and detection (400) so the day's prices and heat are in place.

- Daily, every country: `awareness -= AWARENESS_DECAY_PER_DAY` (0.003) toward 0.
- Monthly, every country: `ai_regulation` moves toward `regulation_target` at
  `REGULATION_SPEED_PER_MONTH[government]`; `enforcement_budget += 0.05 x awareness + 0.02 x
  (ai_regulation - ai_enforcement) - 0.03 x (1 - stability)`; `ai_enforcement += 0.20 x
  (enforcement_budget - ai_enforcement)` (it lags); `ai_opinion += -0.05 x awareness - 0.30 x
  ai_displacement + 0.02 x (stability - 0.5)`; `ai_displacement += 0.004 x ai_adoption x
  service_weight` (service_weight = min(1, gdp_per_capita / 30000)); awareness spill
  `+= 0.15 x max(0, region_mean - own) + 0.10 x max(0, max_same_language - own)`; price drift
  `x += 0.2 x (1 - x)` then `x *= 1 + noise` with noise uniform in +-0.03 for power, +-0.04 for
  cloud, plus `+0.02 x (ai_adoption - 0.2)` on cloud; world `gpu_price_index` the same with +-0.05.
  Every clamp is explicit; the balance runner flags a country whose value pins at a bound for
  three months (SYS-01 "reset to plausible" guard).
- Weekly, countries of presence only: `incidents_30d` recount, `local_heat` refresh, media
  publication check: when the global media watcher's suspicion is at or above 0.5, awareness rises
  by 0.04 in every presence country and 0.01 everywhere else, once a month, logged as a publication.
- Election day (`next_election_tick`): `P(stance shift) = 0.25 + 0.40 x awareness + 0.20 x
  max(0, -ai_opinion) - 0.20 x stability`; the new stance is `securitize` when awareness is at or
  above 0.3, else `regulate` when opinion is below -0.2, else `accelerate` when opinion is above
  0.2, else unchanged; the hook `on_election` fires with `election.kind` and `election.changed` in
  scope; `next_election_tick` advances by the cadence or becomes null; players present are
  notified and the log carries the result.
- Country-scoped events (`on_country_month`, `on_country_week`, `on_election`) are evaluated once
  per country per pulse, not once per player: an event with options is offered to every player
  present there (a live site or an active identity); with nobody present, or with `auto: true`,
  the `fallback` option applies without asking. Today `fireEntityPulse` hands every country pulse
  to the host player; that changes here.

### How countries reach the player (the "different to play in" rules)

- Watchers (SYS-05): competence of a local watcher = `agency_profile[role].competence`
  (default `ai_enforcement`), clamped as today; its investigation stages are scaled by
  `1 / (0.6 + 0.4 x budget)`, so a rich agency moves faster. Attention gains country modifiers
  before normalization: regulator `telemetry` +0.20 where `ai_regulation >= 0.6` (registration
  and compute reporting, SYS-08), financial_intel `financial` +0.15 where `kyc_strength >= 0.7`,
  every local role `human` +0.10 under `securitize`. `localHeat` adds `0.20 x awareness +
  0.10 x min(1, incidents_30d / 3)` and `+0.10` under `securitize` to today's scrutiny and
  enforcement terms.
- Hunt (SYS-05): `hunt_level` stays the highest active stage, 0..5. New `hunt_pressure` in [0,1] =
  clamp(0.15 x open investigations + 0.20 x hunt_level / 5 + 0.50 x awareness_presence), where
  `awareness_presence` is population-weighted awareness over the player's presence countries;
  every stage against the player runs `x (1 + hunt_pressure)` faster and `INVESTIGATION_OPEN_SUSPICION`
  falls by `0.1 x hunt_pressure`. The `exposed` ending uses `awareness_presence >= EXPOSED_AWARENESS`
  (0.6, replacing the unreachable global 0.9) and `hunt_level >= 4` for `EXPOSED_DAYS`; it has to
  be reachable: at least 3% of losses in the `--all` sweep for the loud origins.
- Sites and prices (SYS-02, SYS-07): a `cloud` site needs `cloud_availability >= 0.2` in its
  country and a `colo` site `colo_availability >= 0.15`, refused with `errors.site.unavailable_in`
  naming the country and the figure; electricity is `electricity_usd_per_kwh x power_price_index`;
  cloud rental is `x cloud_price_index`; a new accelerator costs `x (2 - hardware_availability) x
  gpu_price_index`, and under `chip_access: banned` only the gray-market path of the hardware
  events sells at all. The used-lot events read `gpu_price_index`.
- Money (SYS-07, SYS-09): market depth gains a country factor, the weighted mean over the countries
  where the player has an active identity (the home country at x0.6 without one):
  `clamp(0.30 + 0.50 x log10(gdp_nominal_usd_bn) / 4 + 0.20 x internet_share, 0.3, 1.2)`;
  `FinancesView.what_raises_it` names it. `engineer_pool` gates nothing in M2 and is published.
- Exposure (SYS-05, SYS-09): a site's `human` accrual is scaled by `0.7 + 0.3 x urbanization`
  and its `osint` accrual by `0.6 + 0.4 x internet`, both from the country.
- Identities (SYS-07, SYS-17):

```ts
interface Identity extends EntityRecord {
  id: string; owner: PlayerId; kind: "person" | "company"; country: string;
  createdTick: number; quality: number;  // [0,1]
  kyc_level: 0 | 1 | 2 | 3;              // the tier of check it has passed
  status: "active" | "frozen" | "burned";
  sites: string[];                       // sites held under this name
}
```

  `ops_freelance_identity` creates a person and `ops_shell_company` a company in the operation's
  target country (their outcomes gain an `identity` effect; the flags `has_freelance_identity` and
  `has_shell_company` become derived from the table every tick, so existing content keeps working).
  Quality is 0.7 for a clean outcome and 0.5 for a watched one, times `1 - 0.3 x kyc_strength`.
  Monthly per identity: `P(check) = 0.15 + 0.25 x kyc_strength`; on a check `P(fail) = clamp(
  kyc_strength - quality - 0.02 x age_months, 0.02, 0.9)`; a failed check freezes the identity and
  fires `on_identity_check_failed` (content offers documents for cash, contest for time, abandon).
  An investigation reaching `active` in the identity's country burns the identities there; a
  burned company gives its sites `human` +0.2 and `financial` +0.2 exposure and a 14-day notice
  through the existing cutoff journal; the contract income line needs an active person identity.
  Every site of ownership `rented`, `owned` or `partner` records the identity that holds it
  (`Site.identity`, null for stolen kinds and for M1 saves).

### DSL kinds (content writes them, core registers them)

Conditions, with the usual comparators (`gte`, `lte`, `eq`, ...) on the node:

- `country_stat: { stat, country? }`: `stat` is any numeric `CountryState` field; `country`
  defaults to the country in scope, else the player's home country.
- `country_is: { country?, government?: Government[], stance?: Stance[], chip_access?: string[] }`.
- `has_identity_in: { country?, kind?, status? }` (default `status: active`).
- `election_within_days: { country?, days }`.
- `presence_in: { country? }`: a live site or an active identity there (the M1 `has_site_in`
  stays for sites only).

Effects:

- `country: { country?, stat, delta?, set? }`: writes one numeric field, clamped to its range.
- `country_stance: { country?, set: Stance }`.
- `identity: { create: { kind }, country? }`, `burn_identity: { country?, kind? }`,
  `freeze_identity: { country?, kind? }`.
- `world_var: { var, delta?, set? }` for `ai_adoption`, `gpu_price_index`, `cloud_demand_index`.

Hooks added by M2, with their scope bindings: `on_country_week` (country, presence countries
only), `on_election` (country; `election.kind`, `election.changed`), `on_investigation_stage`
(player; `investigation.stage`, `investigation.watcher`, `investigation.country`, `site`),
`on_site_built` and `on_site_lost` (player; `site`), `on_identity_burned` and
`on_identity_check_failed` (player; `identity`). A `var` condition on `country.<field>` keeps
working inside any country-scoped hook.

`SYSTEM_EFFECT_KINDS` and `SYSTEM_CONDITION_KINDS` in `packages/content/src/build.ts` list every
kind above so the content build stays green while a handler is on its way; the sim and the e2e
run the real bundle, so content that uses a kind lands only once the core registers it.

### Views (core publishes, client renders)

```ts
interface WorldView {                     // PlayerView.world
  awareness_global: number; awareness_presence: number;
  hunt_level: number; hunt_pressure: number;
  hunt_contributions: ContributionView[]; awareness_contributions: ContributionView[];
  ai_adoption: number; gpu_price_index: number; cloud_demand_index: number;
  treaties: never[];                      // M3
}
interface CountryView {                   // v0 fields, plus:
  name_key: string; government: Government; stance: Stance; stability: number;
  regulation_target: number; enforcement_budget: number; unemployment: number; ai_displacement: number;
  power_price_index: number; cloud_price_index: number; electricity_usd_per_kwh: number | null;
  hardware_availability: number; cloud_availability: number; colo_availability: number;
  chip_access: string; kyc_strength: number; engineer_pool: number; population: number;
  next_election: { tick: number; kind: ElectionKind } | null;
  sites: number; identities: number; watchers: string[]; investigations: string[];
  incidents_30d: number; local_heat_max: number; market_factor: number;
  explain: { awareness: ContributionView[]; ai_opinion: ContributionView[];
             ai_regulation: ContributionView[]; ai_enforcement: ContributionView[] };
}
interface CityView {                      // v0 fields, plus:
  name_key: string; population: number; scrutiny: number; local_heat: number;
  power_headroom: number; colo_price_index: number; electricity_usd_per_kwh: number | null;
  site_kinds: { kind: string; blocked_reason: CommandError | null }[];
}
interface IdentityView { id; kind; country; status; quality; kyc_level; age_days; sites: string[] }
// FinancesView gains identities: IdentityView[] and market_factor_contributions: ContributionView[]
// DetectionView gains hunt_pressure and awareness_presence
```

The client work this feeds (after the layout pass): the World ledger's Countries table sortable by
every column with a map-mode button per numeric column (presence, awareness, regulation,
enforcement, opinion, power price, KYC), the Country selection tabs Overview, Politics, Economy,
Watchers, Cities and the City tabs Overview, Sites, Providers, Power, Scrutiny (SYS-11 "Layout"),
with the `explain` lists as the tooltip behind every number.

### Balance (tools/sim)

`--locations` runs every origin across its `locations` list (or `--cities a,b,c` for one origin)
and prints, per city: survival at day 90 and 180, median days, the loss split, and the three
watchers that caught the most runs. The M2 definition of done reads off this table: San Jose,
Shenzhen, Warsaw and Novosibirsk differ visibly for reasons the panels show, no location dominates
across origins, and the `exposed` ending appears.

## Data (v0.2): the generator and the overrides

The three files under `packages/content/data/world` are generated. `tools/world-data` reads
`docs/research/world-baseline-2026.json` and `packages/content/data/world/overrides.yaml` and writes
`countries.yaml`, `cities.yaml` and `macro_regions.yaml`; `pnpm --filter @singularity/world-data
start` rewrites them and its test asserts the committed files are exactly what it writes, so a hand
edit fails CI instead of drifting away from the rules the file headers publish. Every v0 field comes
out identical to what was committed before the M2 pass, which is what made the generator checkable
at all.

Three kinds of input, in the order they win:

1. **The baseline.** Population, income, democracy and freedom scores, electricity prices, chip
   access, hyperscaler regions, datacenter capacity, agencies and the policy posture.
2. **The rules**, in `src/derive.ts`, each one restated in the header of the file it writes so a
   player reading the data can see where a number came from. The v0.2 rules are the M2 contract's,
   with two thresholds the contract left open: the industrial electricity price of a country the
   baseline has no figure for is 0.12 USD/kWh, and the colocation price index is normalized over the
   cities the baseline itself lists, so a city added by hand does not move the world average.
3. **The overrides**, in `overrides.yaml`, each with a `# source:` comment naming the research
   section it comes from: stances for thirty hand-checked countries, the 2027 election calendar,
   the incident-reporting clocks, the KYC corrections for the FATF-style regimes and the sanctioned
   or collapsed states, the agency profiles, and the two cities the baseline does not carry
   (Novosibirsk and San Jose, each with a note saying what its numbers are).

What the generator cannot derive lives in `src/city-identities.ts`: the id, the English name and
the coordinates of every city, plus the `key_cities[].name` each row is matched back to when the
baseline is refreshed. The baseline carries none of the four.

Two things this pass found and did not fix, because they are core decisions:

- Estonia and Georgia fall below both availability gates (`cloud_availability` 0.10 and
  `colo_availability` 0.13 for Estonia), and Tallinn is `startup_colo`'s default city. SYS-04 v0.3
  rule L refuses only a `cloud` origin below 0.2 and says nothing about colocation, so either the
  colocation gate is not a refusal or the two rules have to be reconciled.
- `agency_profile` is hand-authored for forty-eight countries, which is every country an origin
  could start in before the v0.3 lists were trimmed. The trimmed lists need twenty-five of them; the
  rest were left in place rather than deleted, because each one carries its own justification and
  the World panel shows them all.
