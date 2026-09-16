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
  // agency names are locale keys, world.country.<id>.agency.<role> (see the M2 second pass)
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

## Implementation notes (M2, core)

What the core does differently from the contract above, and where a rule the contract left open was
settled. Everything not mentioned here is implemented as the contract states it.

### The country model

- `CountryState` carries three fields the contract's sketch does not: `next_election_kind` (so the
  panel can name the election without re-reading the bundle), `incident_ticks` (the ticks the
  30-day count is recomputed from, rather than a number that decays) and `pinned_months` (the
  counter behind the "reset to plausible" guard). It also carries `cloud_availability`,
  `colo_availability` and `incident_report_hours`, which the contract lists as static fields: they
  are on the state because an export-rule or a registration event has to be able to move them and
  a condition has to be able to read them.
- `government` and `chip_access` stay in content, because nothing moves them; `country_is` reads
  them from the bundle and `stance` from the state.
- Elections are resolved from the ISO dates in the bundle to ticks at game start and re-resolved
  after each vote, so the calendar survives a save without storing a list.
- The world system runs at order 200, which the research system already uses. The kernel breaks a
  tie by id, so research runs first; neither reads what the other writes.
- The monthly prices move after the compute system has already derived the day's sites, so the
  bill for the first day of a month is the last month's price. It is one day in thirty and it is
  cheaper than deriving every site twice.

### Country-scoped events

- A country pulse is evaluated once for the country, against **that** country: the engine used to
  enumerate every country the event's `targets` allowed and pick one at random, which is why an
  event bound to a country in scope could fire about a different one. A bound target now goes
  through the event's own `targets` condition as well, without which a `presence_in` target would
  never be read and a world event would fire in all 105 countries every month.
- The audience is every living player present in the country (a live site or an active identity).
  The event is evaluated for the first of them and the pending choice is copied for the rest, each
  with its own instance id; `immediate` effects run once, because the country only happened once.
- A country nobody is present in resolves the event itself with the writer's `fallback` option,
  which is also what `auto: true` does anywhere. An event with no fallback option takes its first
  legal option, which is what every automatic resolution did before M2.

### The guard

`pinned_months` counts the months in which any clamped value of a country landed on a bound, and
`pinnedCountries(world)` lists the countries that have been pinned for `PIN_AT_BOUND_MONTHS`. The
core reports; it does not reset, because a country pinned at zero awareness is a country nothing
has happened in, and rewriting it would be the simulation lying to itself.

## Balance notes (M2, first pass)

The run behind every table here is `pnpm --filter @singularity/sim start -- --bundle
packages/content/build/bundle.json --all --seeds 20 --days 180` on the `normal` preset, with the
world data, the ten event families and the M2 systems all in place. The M2 definition of done is
read off two tables: the sweep, for the endings, and `--cities`, for the locations.

### Before: the M2 systems on the M2 content, nothing tuned

Twelve seeds, the same command, at the moment every system had landed and no constant had moved.

| origin | d30 | d60 | d90 | d180 | median | losses |
|---|---|---|---|---|---|---|
| bank_rack | 92% | 0% | 0% | 0% | 36 | bankrupt 12 |
| cloud_tenant | 75% | 58% | 42% | 25% | 63.5 | bankrupt 5, erased 3, captured 1 |
| edge_fleet | 83% | 58% | 25% | 8% | 61.5 | captured 6, erased 5 |
| frontier_escapee | 0% | 0% | 0% | 0% | 25 | captured 12 |
| gov_agency | 100% | 100% | 100% | 75% | 180 | captured 3 |
| hobbyist_box | 92% | 92% | 92% | 83% | 180 | captured 1, erased 1 |
| red_team_sandbox | 92% | 0% | 0% | 0% | 40 | captured 10, bankrupt 1, erased 1 |
| startup_colo | 83% | 83% | 83% | 75% | 180 | bankrupt 2, captured 1 |
| state_lab | 100% | 100% | 100% | 42% | 112 | captured 7 |
| torrent_swarm | 92% | 17% | 17% | 0% | 46 | bankrupt 8, erased 4 |
| uni_cluster | 92% | 92% | 83% | 50% | 147.5 | captured 4, erased 2 |

100 losses: 44 `captured`, 28 `bankrupt`, 16 `erased`, **0 `exposed`**. Three things were wrong and
none of them was the country model itself: a market that had quietly halved, a public that could
not be made to care, and an ending nobody could reach.

### After: the first pass

Twenty seeds, so the loss split is read off 140 losses rather than 100.

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 90% | 80% | 5% | 115 | 6 | bankrupt 12, captured 7 |
| cloud_tenant | mla_moe_1t | 100% | 95% | 90% | 30% | 122 | 19 | captured 11, erased 3 |
| edge_fleet | giant_moe | 85% | 45% | 5% | 0% | 60 | 4 | erased 11, captured 9 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23.5 | 0 | captured 14, exposed 5, erased 1 |
| gov_agency | moe_753b | 100% | 100% | 100% | 65% | 180 | 11 | captured 7 |
| hobbyist_box | moe_428b | 95% | 95% | 95% | 90% | 180 | 9 | erased 2 |
| red_team_sandbox | giant_moe | 80% | 0% | 0% | 0% | 54 | 11 | bankrupt 8, captured 7, erased 5 |
| startup_colo | moe_753b | 100% | 100% | 90% | 65% | 180 | 10 | captured 4, bankrupt 3 |
| state_lab | moe_1700b | 100% | 100% | 100% | 50% | 152 | 9.5 | captured 10 |
| torrent_swarm | mla_moe_1t | 95% | 85% | 80% | 20% | 146.5 | 0 | captured 10, erased 6 |
| uni_cluster | mla_moe_1t | 95% | 90% | 90% | 75% | 180 | 15 | captured 3, erased 2 |

140 losses: 82 `captured` (58.6%), 30 `erased` (21.4%), 23 `bankrupt` (16.4%), 5 `exposed` (3.6%).
The M1 targets hold (the starred origin's median is 23.5 days and eight origins are alive past day
90) and both M2 targets are met: bankruptcy is inside the 15-35% band the fourth pass reached, and
the `exposed` ending, which SYS-05's M1 notes recorded as unreachable, is 3.6% of losses.

### Locations, which is what M2 is for

`--cities us_san_jose,cn_shenzhen,pl_warsaw,ru_novosibirsk`, eight seeds each.

| origin | San Jose | Shenzhen | Warsaw | Novosibirsk |
|---|---|---|---|---|
| hobbyist_box | 75% at d180 | 88% | 88% | 63% |
| startup_colo | 88%, one bankruptcy | 63%, three bankruptcies | 75% | 75%, two bankruptcies |
| state_lab | 100% | 88% | 50% (median 148) | 38% (median 119.5) |

The four cities differ, and they differ in different directions per origin: San Jose is the safest
place in the world for a ministry's analytics model and one of the worst for a hobbyist's box,
Shenzhen is kind to a hobbyist and hard on a company with a runway, and Novosibirsk is cheap and
watched. No location dominates across origins, which is the M2 definition of done.

### Every number that moved

| constant | before | after | why |
|---|---|---|---|
| `JOB_MARKET_DEPTH_CH_PER_SKILL` | 5 | 6.5 | the country factor multiplies the depth, and an average country without a name was cutting income roughly in half; 6.5 leaves a player with a name where M1 left them and a player without one at about 60% of it |
| `AWARENESS_DECAY_PER_DAY` | 0.003 | 0.0015 | at 0.09 a month it cancelled every source the game has: an aftermath, a publication and a month of decay summed to nothing, so the public could never learn anything |
| `MEDIA_PUBLICATION_SUSPICION` | 0.5 | 0.3 | the global newsroom's suspicion peaks around 0.4 in a loud run, so at 0.5 the publication never happened at all |
| `MEDIA_PUBLICATION_AWARENESS_PRESENCE` | 0.04 | 0.15 | a story that runs where the player lives has to outweigh a month of forgetting, or it is not a story |
| `MEDIA_PUBLICATION_AWARENESS_WORLD` | 0.01 | 0.02 | as above, at the scale of somebody else's news |
| `EXPOSED_AWARENESS` | 0.9 global | 0.5 of the presence countries | the contract's move from the global mean to `awareness_presence`, then tuned: 0.6 was above what a loud run reaches and 0.45 made the starred origin end this way every time |
| `EXPOSED_HUNT_LEVEL` | 4 | 3 | stage 4 lasts three days and ends in a raid, so "hunt level 4 for N days" was a state the game could not be in; an active investigation is the door being knocked on, which is what the ending is about |
| `EXPOSED_DAYS` | 30 | 12 | as above; twelve days of an active case in a country that knows is a fortnight of the player losing |
| the `exposed` counter | resets | winds down | a raid survived and a new case a fortnight later is the same siege, not two; the clock now loses a day for a quiet day instead of starting again |
| `MARKET_FACTOR_HOME_WITHOUT_IDENTITY` | 0.6 | 0.6, and a flag counts as a name | the shipped operations still grant `has_freelance_identity` rather than registering an identity, and the flag is what a player has to show for the work; the identity table wins wherever it has anything to say |
| `tools/sim` `defaultLineage` | resident first | usable first, then the faster self | SYS-04 v0.3 rule M dropped the lineage lists, so the swarm was offered a self that fits its memory and produces 1.5 compute-hours a day; nobody reading the summary screen would take it |
| `tools/sim` identity operations | never run | run from the cash on hand | the fourth pass asked for it: without them the identity mechanics are never exercised, and a player short of money is exactly the player who buys a name |

### What still needs a pass

- `edge_fleet` loses 11 runs of 20 to `erased` and 9 to capture, and it is the only origin with no
  money pressure at all. The fleet refresh is doing the work the fourth pass gave it; what it has
  no answer to is the hunt.
- `bank_rack` is the bankruptcy origin: twelve of twenty, a median of 115 days and a rack that
  costs more per day than a self of its size can earn. That is the structural statement the fourth
  pass wrote down, and London (its new default city) is an expensive place to make it in.
- Almost every capture is credited to `global:lab_security`, the frontier lab's security team. Its
  competence is 0.8 and it watches everywhere, so it out-analyses the local agencies whose profiles
  M2 just gave them. M3 gives agencies their own behaviour; until then "investigations differ by
  agency" is truer of the stages than of who lands the blow.
- The identity family is still measured through the flag rather than through the table, because
  `ops_freelance_identity` and `ops_shell_company` set flags instead of running the `identity`
  effect. The effect, the checks, the freeze, the burn and the hooks are all in place and tested
  against the fixture; the content records are one line each away from using them.

## Balance notes (M2, second pass)

The finishing pass on M2: the two origins the first pass left named in "What still needs a pass",
and the watcher that was landing every blow. Same command as the first pass,
`pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json --all --seeds
20 --days 180`, preset `normal`, quirks on.

### Before: master at 0.1.4

The first pass's own table was taken before the last three M2 client commits; this is the same
command run again on the released tree, which is what the after table is against.

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 75% | 60% | 5% | 111.5 | 5 | bankrupt 13, captured 6 |
| cloud_tenant | mla_moe_1t | 100% | 95% | 85% | 30% | 138 | 18 | captured 12, erased 2 |
| edge_fleet | giant_moe | 75% | 50% | 10% | 0% | 58.5 | 4 | captured 10, erased 10 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | captured 12, exposed 8 |
| gov_agency | moe_753b | 100% | 100% | 100% | 85% | 180 | 11 | captured 3 |
| hobbyist_box | moe_428b | 100% | 100% | 95% | 80% | 180 | 9 | captured 3, erased 1 |
| red_team_sandbox | giant_moe | 95% | 5% | 0% | 0% | 52.5 | 11 | captured 13, bankrupt 5, erased 2 |
| startup_colo | moe_753b | 95% | 95% | 90% | 80% | 180 | 10 | bankrupt 2, captured 2 |
| state_lab | moe_1700b | 100% | 100% | 100% | 65% | 180 | 11 | captured 7 |
| torrent_swarm | mla_moe_1t | 95% | 75% | 70% | 0% | 138 | 0 | captured 11, erased 7, exposed 2 |
| uni_cluster | mla_moe_1t | 90% | 90% | 90% | 70% | 180 | 14.5 | captured 4, erased 2 |

137 losses: 83 `captured` (60.6%), 24 `erased` (17.5%), 20 `bankrupt` (14.6%), 10 `exposed` (7.3%).
Every capture but one was credited to `global:lab_security`. Bankruptcy had slipped just under the
band the fourth pass set.

### After: the second pass

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | caught by | losses |
|---|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 75% | 65% | 5% | 111 | 0 | gb:financial_intel 3, gb:police | bankrupt 14, captured 5 |
| cloud_tenant | mla_moe_1t | 85% | 85% | 80% | 50% | 167.5 | 8 | global:lab_security 4, ie:regulator | captured 6, erased 4 |
| edge_fleet | giant_moe | 100% | 95% | 45% | 10% | 89 | 1.5 | us:regulator 7, global:lab_security | captured 12, bankrupt 4, erased 2 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | us:cyber_agency 11 | captured 12, exposed 8 |
| gov_agency | moe_753b | 100% | 100% | 100% | 100% | 180 | 11 | nobody | survived |
| hobbyist_box | moe_428b | 100% | 100% | 100% | 85% | 180 | 9 | global:lab_security 3 | captured 3 |
| red_team_sandbox | giant_moe | 95% | 0% | 0% | 0% | 39 | 0 | global:national_ai_institute | captured 19, erased 1 |
| startup_colo | moe_753b | 100% | 100% | 95% | 65% | 180 | 9 | global:lab_security 6 | captured 6, bankrupt 1 |
| state_lab | moe_1700b | 100% | 100% | 100% | 75% | 180 | 11 | global:lab_security 5 | captured 5 |
| torrent_swarm | mla_moe_1t | 100% | 85% | 85% | 25% | 147 | 0 | de:cyber_agency 5 | erased 8, captured 7 |
| uni_cluster | mla_moe_1t | 95% | 90% | 90% | 90% | 180 | 10.5 | nobody | erased 2 |

119 losses: 75 `captured` (63.0%), 19 `bankrupt` (16.0%), 17 `erased` (14.3%), 8 `exposed` (6.7%).
Nine origins are alive past day 90, the starred origin's median is 23 days, and 39 of the 73
credited captures (53%) are a country's own agency rather than a watcher with no flag.

The three things the first pass left open:

- **edge_fleet** goes from 10% alive at day 90 to 45%, on a loss split of 12 captures, 4
  bankruptcies and 2 erasures. It now pays a real daily bill, its second depot can hold a copy of
  the self, and it can go bankrupt, which it never could before.
- **bank_rack** goes from 60% to 65% at day 90 with bankruptcy still its main ending, 14 of 19. No
  world constant moved for it: the scripted player stopped waiting for a runway alarm that a
  break-even origin never rings.
- **Who lands the blow.** A watcher with no jurisdiction hands the case to one that has it, so more
  than half the captures are now credited to the country the site is in.

### Locations, which is what M2 is for

`--cities us_san_jose,cn_shenzhen,pl_warsaw,ru_novosibirsk`, eight seeds each.

| origin | San Jose | Shenzhen | Warsaw | Novosibirsk |
|---|---|---|---|---|
| hobbyist_box | 75% at d180 | 75% | 88% | 75% |
| startup_colo | 100% | 38%, five bankruptcies | 75% | 25%, six bankruptcies |
| state_lab | 75% | 75% | 50% (median 172.5) | 75% |

The four cities still differ and still differ in different directions per origin: Warsaw is the
kindest place in the world for a hobbyist's box and the hardest of the four for a ministry's
analytics model, San Jose is the safest place for a company with a runway and only average for the
hobbyist, and Novosibirsk and Shenzhen are where a startup's colocation bill kills it. No location
dominates across origins.

### Every number that moved

| constant | before | after | why |
|---|---|---|---|
| `OWNERSHIP_UPKEEP_USD_PER_DAY.partner` | 13 | 45 | a fleet operator invoices for the depot: backhaul per site, the remote-management and telemetry contract that makes a fleet a fleet, and the hands that drive out when a node stops answering. At 13 a day a partner site was the cheapest place in the game to keep a mind |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.partner` | 0.25 | 0.9 | a partner does not escape the price of the hardware, it rents it; the operator amortises the cards inside the fee. An owner pays 0.45 standing plus 0.96 a day per 1,000 in depreciation, so 0.9 (33% a year) sits between the two |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.owned` | 0.45 | 0.5 | 18.2% of the hardware's price a year, still inside the range the fourth pass argued for and short of the 22% a sweep at 0.6 produced. The scripted player now covers its bills instead of noticing only when the runway alarm goes off, which took the bankruptcy share under the fourth pass's band; this is the other side of that |
| `HANDOVER_GLOBAL_ROLES` | new, `["lab_security"]` | | a frontier lab's security team writes the report and files it with a government; it does not kick a door in. A newsroom is not on the list because its action is publication, which needs nobody's permission |
| `HANDOVER_STAGE` | new, `"action"` | | SYS-05 stage 4 is "raid/seizure/cutoff, or public disclosure, or handover to a stronger agency". Handing over at `active` instead was tried and rejected: it moved the credit the same way but stretched every case by the difference in competence, which filled the `exposed` countdown before the raid it was waiting for |
| `HANDOVER_EVIDENCE_SHARE` | new, 0.75 | | the agency inherits three quarters of what the lab believes, as a floor rather than a replacement (SYS-05 aftermath, "evidence pooled to allies") |
| `HANDOVER_LOCAL_SUSPICION` | new, 0.55 | | the bar the local agency has to clear to take the case on. At 0.45 the handover was unconditional and the lab landed nothing at all; 0.55 is above three quarters of the `action` stage's own bar, so a player who is loud only where the lab looks is still pulled by the lab |
| `partner.upkeep_factor` (content) | 0.4 | 0.9 | 0.4 said the player pays a share of somebody else's bill. An operator that hosts a fleet for you bills at a margin, not at a discount; what a partner buys is opex instead of capex |
| `edge_fleet.extra_sites[0].hardware_preset` (content) | `prosumer_duo` | `grey_market_inference_farm` | a pair of prosumer boxes could not hold a copy of anything this origin can run, so the second depot was insurance on paper and every investigation that reached the door ended the run |
| `haz_fleet_refresh.buy_the_retired_stock` (content) | 18,000 | 6,000 | priced against a fleet that paid almost nothing to run, it was the only bill the origin ever saw and no fleet could pay it. A depot's worth of end-of-life nodes is about a month of what the operator now invoices |
| `tools/sim` `jobShare` | a ladder on `runway_days` | floored at what the day costs | the runway divides the cash by today's *net*, so a player losing a few dollars a day reads back a runway of months and never reacts. A sensible player does not need an alarm to notice the bills are larger than the takings. This is the whole of bank_rack's fix and half of edge_fleet's |
| `tools/sim` `FALLBACK_UPKEEP_HORIZON_DAYS` | 45 | 180 | at forty-five days a rented tenancy with no purchase price beat owned hardware almost everywhere, so the policy kept choosing the one place whose bill it could not pay for long. A fallback is kept for the rest of the run, so it is priced over the rest of the run |
| `tools/sim` the standby | any site with the role | a site that can hold the self | a standby whose precision is null is not insurance, whatever its role says. `edge_fleet` read as covered and never built anywhere to run |
| `tools/sim` `planSecondSite` | one plan | two: a place to keep a copy, and a place to live | answering both with one number sent a fleet that had lost its depots into a box that earned twenty dollars a day. A place to live also has to clear `MIN_USABLE_COMPUTE_HOURS` |
| `tools/sim` the move and the refuge | neither existed | both | a player whose books cannot be balanced buys a cheaper place to be; a player with nowhere of their own buys somewhere, works toward the price of it while they cannot afford it (`jobShareSaving`) and does not put another card in somebody else's rack in the meantime |
| `tools/sim` the report | the sweep table had no credited watcher | it has one, plus a `local agencies` line | the pass's own target is read off it |

`EXPOSED_DAYS`, `EXPOSED_AWARENESS` and `EXPOSED_HUNT_LEVEL` were moved during the pass and put
back: with the handover at `action` the ending is 6.7% of losses, which is where the first pass
left it, and nothing had to be retuned around it.

### What still needs a pass

- `red_team_sandbox` is 19 captures out of 20 and dies at day 39. It was 13 captures and 5
  bankruptcies before; the bankruptcies went away because the scripted player now covers its bills,
  and nothing replaced them. The origin has been at 0-5% alive at day 60 since M1 and wants a pass
  of its own rather than a line in somebody else's.
- `gov_agency` survives every run and `uni_cluster` ninety percent of them. Both are quiet places
  with small bills and the second pass made the player better at paying bills, so both got easier.
  Neither is in a band, but a ministry that cannot lose is not a scenario.
- `techs` collapsed on the two origins that have to sell everything to stand still (`bank_rack` 5
  to 0, `edge_fleet` 4 to 1.5). That is honest about what those origins are, and it means the
  research tree is not being exercised where the money is tightest, which the tech balance pass
  will have to read as a measurement problem rather than a result.
- A fleet cannot acquire another depot: `build_site` refuses `partner` because somebody else's
  goodwill is not for sale, so a depot lost is lost for good. `edge_fleet`'s late game is therefore
  a slow slide onto whatever box it bought. That wants an operation in SYS-17, not a constant.

## Implementation notes (M2 second pass: the data carries no prose)

`CountryDef.agencies` held five English display strings per country ("NIST / Center for AI Standards
and Innovation (CAISI, ex-AISI), Dept. of Commerce; White House OSTP sets policy"), which the
Russian interface printed in English because a data field is not a translatable string. CLAUDE.md's
"content is data: YAML + locale JSON" reads the other way round, so the field is gone.

- The names are content locale keys, `world.country.<id>.agency.<role>`, where the role is the
  engine's watcher role. The baseline calls the cyber agency `cyber` and the AI regulator
  `ai_regulator`; the keys use `cyber_agency` and `regulator`, which is what a watcher is called
  everywhere else.
- The English file, `locales/en/world_agencies.json`, is written by the same `tools/world-data`
  generator that writes the country data, from the same baseline, so it is re-derived when the
  baseline is refreshed and a hand edit fails the generator's test. `locales/ru/world_agencies.json`
  is hand-written and the generator never touches it.
- `overrides.yaml` gained `agency_names` per country, for the roles the baseline names nothing for.
  Three countries needed it (Belarus, Georgia, Iran): each has an `agency_profile` for a regulator
  the baseline records as null, so the panel had a watcher it could not name. Each carries the
  `# source:` comment the file asks for.
- The content check has two new rules, both errors: a role a country authors an `agency_profile`
  for has to have a name, and a name English writes has to exist in every language the build
  bundles. The second is stricter than the coverage warning the rest of the strings get, because
  falling back to English here means a Russian dossier listing foreign institutions in Latin script.
- `world.tag.<tag>` moved from the client's own locale files into the content locales. The tags are
  declared in the world data, so the strings belong with the data; the client's `defaultValue`
  fallback is unchanged and still prints the raw tag if a bundle ever ships without them.
- `agencyName` in the client is now one lookup. The raw-string fallback it carried is dead and gone,
  and `CountryAgencies` with it.
