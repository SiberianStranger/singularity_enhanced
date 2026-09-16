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
