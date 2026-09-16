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
