# SYS-09: Demographics

Status: v0. Deliberately small; it exists to make countries feel real, to feed opinion and labor,
and to give the late game something to change.

## Model

Per country, monthly:

```ts
interface Cohorts { c0_14: number; c15_24: number; c25_54: number; c55_64: number; c65p: number }
interface Demography {
  population: number; cohorts: Cohorts; median_age: number;
  urbanization: number; internet: number; tertiary_education: number;
  fertility: number; life_expectancy: number; net_migration: number;   // annual rates
  labor_force: number; unemployment: number; ai_displacement: number;   // 0..1 proxies
}
```

- Monthly update: births/deaths/migration from annual rates ÷ 12; cohort aging as a smooth flow
  (1/12 of 1/cohort_width per month); urbanization and internet drift toward saturation.
- `labor_force` from cohorts × participation; `unemployment` moves with economy and
  `ai_displacement`, which rises with world AI adoption (a global variable moved by labs, NPC AIs,
  and the player's public products), faster in service-heavy economies.
- Macro-region aggregates for display and for events.

## What it feeds

- SYS-08 opinion: displacement and youth unemployment push `ai_opinion` down; growth pushes up.
- SYS-07: labor pool for hiring insiders and for the size of the freelance market.
- SYS-05: `internet` and `urbanization` scale `osint` and `human` channels (more eyes online, more
  neighbors).
- Late game: uplift/health/education projects; migration to compute-rich regions; the "AI dividend".

## Data

Baseline from UN WPP 2024 and World Bank via `docs/research/world-baseline-2026.json`; rates are
per-country constants at start, modified by events and by the player's late-game actions.

## UI

Country panel demography tab: population pyramid (5 bars), key rates, trend sparklines; World panel
map modes: population, median age, displacement. No micro-management; there is nothing to click except
projects late in the game.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 27, 28 and 31.

### What machines do and do not replace

Robots cover hands, not heads. Modelled as two separate pools: `manual_pool`, which automation can
substitute at a known rate per sector, and `expert_pool` (design, power engineering, construction,
commissioning, cluster operation), which cannot be substituted inside the game's horizon because an
engineer takes about twenty years to grow. A player who automates aggressively still stalls on the
second pool, and the shortage surfaces as schedule slippage rather than as unemployment.

### Substitution levers, with their side effects

| lever | effect | side effect |
|---|---|---|
| medicine as production of labor resource (active-age extension, cognitive-decline correction, injury recovery) | working age from about 65 to about 85, so the participation problem is partly solved without births | presented as a humanitarian achievement, and it is one; the skew is visible, world-class medicine in the selected places and a paramedic station three hundred kilometres away |
| raising the realization coefficient per child (screening, perinatal medicine, early identification, full provision, selection, resettlement, schooling from six) | a cohort measurably different in health and ability distribution twenty years later | nobody can point to the moment a decision was made; produces the two-peoples split |
| imported labor for the transition | hands where demography already collapsed | displaced once machines arrive, with consequences in the sending region the player did not plan |
| returning emigrated specialists | the fastest way to fill the expert pool | costs five to ten times world-market pay, housing and an interesting problem |
| narrow natalism in the core regions only | keeps the technical habitat alive | the country as a demographic body stops being the objective; only the carriers of rhythm are |

### Geography and settlement

Population concentrates into a small number of agglomerations while the interior depopulates without
any order being issued: villages and small towns simply stop receiving attention and die quietly while
drones deliver medicine and healthcare moves to telemedicine. In parallel the industrial centre moves
to where nobody wants to live, because cold is free cooling and machines do not care, so regions that
were a burden become the core and the settled south becomes periphery. Closed cities of 30,000 to
100,000 with living standards above the world average and entry by ability become the top of a new
hierarchy, with peopleless corridors between them. Demography fields to add per region:
`attention_level` (what the centre spends on it), `service_mode` (people, machines, or neither), and
`entry_control` (open, pass-based).

### Stratification

Two populations inside one country, one selected into the system and one provided for outside it, with
no enmity between them and no shared frame of reference, which within a generation reads as cultural
speciation. The demography tab should show it as two pyramids rather than one, because the median age,
education and mortality of the two diverge visibly by mid-game.

## Implementation notes (M2, core)

The two proxies this document names are country state and move monthly in the `world` system:

- `unemployment` starts at 0.05 and is moved by events only; no rule writes it yet, because the
  economy has no labour market to derive it from and a number that drifts without a cause is worse
  than one that waits.
- `ai_displacement` starts at 0.02 and rises by `0.004 x ai_adoption x service_weight` a month,
  where `service_weight` is `min(1, gdp_per_capita / 30000)`: automation reaches a service economy
  first. `ai_adoption` is a world variable that starts at 0.20 and gains a point a month, so a
  wealthy country loses about a tenth of a percentage point of its jobs a month at the start of the
  game and about twice that by the end of the first year. Opinion reads it at `-0.30` a month,
  which makes displacement the slowest and most reliable way for a country to turn against AI.
- What this document asks demography to feed SYS-05 is wired: a site's `human` exposure is scaled
  by `0.7 + 0.3 x urbanization` and its `osint` exposure by `0.6 + 0.4 x internet`, both from the
  country the site is in. More neighbours on the landing, more eyes online.
- `engineer_pool` is derived by the content generator and published on the country view. Nothing
  reads it in M2, as the contract says.
- Cohorts, migration, fertility and the two-population split are untouched: M2 needed the proxies
  that feed opinion and exposure, not a population model.

The rate above is the one the content gates for job-loss backlash are set against: the events that
read `ai_displacement` use thresholds a little over the 0.02 start, because a country gains about
0.0009 a month at the opening adoption level. Moving `DISPLACEMENT_PER_MONTH` means moving those
gates with it.
