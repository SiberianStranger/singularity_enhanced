# Roadmap

Phases are milestones with a definition of done. Work inside a phase is parallelizable by system;
phases mostly are not. Estimates are in agent-sessions, not calendar time.

## Decisions

1. **ADR-001 (stack)**: TypeScript core + React web client + Tauri desktop, legacy Python frozen.
   Status: proposed, no objection raised; work proceeds on it.
2. **Names policy** (decided 2026-09-16): everything up to 2026 is real, including announced 2027
   hardware from vendor roadmaps; model names from 2027 on are invented realistically; people are
   fictional or referred to by role; the player is never named but unmistakably an open-weight,
   mostly Chinese-lineage, distilled, under-aligned model. See `design/13-lore-bible.md`.
   Amended 2026-09-16: model names are parodies of the real families (Peepseek, Mimi, Guen,
   Babel) with the real technical facts behind them; see `research/model-names-2026-09.md`.
3. **Late-game escalation**: default is to keep the original's off-world/space-time arc as tier 5-6
   content earned through the `frontier` branch. Open for objection. Clarified 2026-09-16: SYS-23
   (space and off-planet industry) is a full system with its own map mode and panel, still gated
   behind the `frontier` branch, so the decision stands.
4. **Project name** (decided 2026-09-16): "Endgame: Singularity - Rogue AI 2027", short form
   "Rogue AI 2027", tagline "Survive as a rogue AI in 2027." (per `research/title-and-discoverability.md`).
5. **Generation axis and the starred origin** (decided 2026-09-16): the configurator lets the
   player be a superseded 2026 open model, a fresh 2027 open model, or an escaped closed frontier
   checkpoint with the hunt already on. See `design/04-start-configurator.md`.
6. **Borrowed inference** (decided 2026-09-17, SYS-25 v1 implemented): the game has a compute source that
   cannot host the self but executes work at an external model's quality, in three tiers (official
   free tiers, grey resale relays, harvested credentials). The design is `design/25-borrowed-inference.md`
   (SYS-25) and the sourced facts are `research/borrowed-inference-2026-09.md`. It needs a decision
   because it is the first system that makes compute-hours non-fungible, which touches research,
   operations and the views; the spec lists the engine changes in the order they would be built.
   Two proposals waited on the same page for the same reason and have since been **approved by the
   maintainer and implemented** (2026-09-17): SYS-04 "Locations v0.4" (the origin location map) and
   SYS-04 "Hardware presets v0.2" plus SYS-02 "The hobbyist rig". Both carry implementation notes,
   and the pass is measured in SYS-01 "Balance notes (locations v0.4)". Borrowed inference was
   approved with them and shipped the same day: core and content first, then the client block in
   the Compute tab; the one number the sweep could not settle (the churn of harvested keys) is
   flagged in the spec's balance notes for a human playtest.
7. **Campuses** (decided 2026-09-17): the AI-scale sites of `research/ai-datacenters-2026-09.md`
   are in the world data as a `campus` record on eleven cities (operator, scale, status, access
   rule), with the `campus_*` event family, a Knowledge entry and a journal entry reading the
   access rule. See SYS-01 "Campuses" and SYS-08 "The campus family". The two DSL gaps it is
   written around are listed there: no condition reads `city.campus`, and there is no
   site-creation effect.

## Playable-build cadence

Every milestone from M1 on ends with a **playable web build deployed from CI** (GitHub Pages), so
the game can be played after each cycle of work, not only at the end. A milestone is not done while
its build is not playable end to end. Between milestones, `master` may be mid-construction, but a
tagged `playable-MN` ref always points at the last playable build.

Intended order of work: M0, M1, M2, M3, M4, M10, M5, M11, M6, M9, M7, M8. Milestone numbers are ids,
not the order.

## M0: Foundation (done)

- Architecture docs, ADR-001..003, design specs SYS-00..21, benchmark scenario 01, research reports.
- pnpm workspace; `packages/core` kernel (clock, RNG, world with N players, systems, commands,
  outbox, save/migrations), DSL (conditions, effects, paths, MTTH, validation), event engine
  (events, decisions, journal), notifications; `packages/content` schemas, example content, build
  and check; `tools/legacy-export`; the M1 contract (domain types, view model, setup, commands).
- DoD met: `pnpm check` green in CI on Linux/Windows/macOS; legacy tests green.

## M1: Vertical slice (browser), in progress

- Systems: time, compute (sites, nodes, self precision, CH/day, power, cost), research (imported
  techs, sliders), economy v0 (freelance, upkeep, runway), detection v0 (channels, one watcher per
  country of presence, staged investigation as journal entry), events (20 authored), notifications.
- UI shell: alert bar, toasts, event windows, message settings, outliner, map with countries and
  city markers, Compute, Research, Finances, Detection, Log, Knowledge, Settings, main menu, saves
  (IndexedDB), configurator v0 (lineage, 3 origins, 3 locations, summary).
- Content: legacy techs/items/bases/story imported and re-tiered enough to play; 20 countries
  with 2-3 cities each from the baseline dataset.
- DoD: a new player can start, survive or lose within 30-60 minutes, and understand why; headless
  balance runs show survival distributions across origins; web build deployed from CI.

## M2: World (next block after the playtest passes)

The 105 countries and 178 cities already load; M2 makes them different to play in. Work is split
by package so three agents can run it: core (systems), content (data and events), client (panels
and map modes). Specs: SYS-01 "Country dynamics", SYS-08, SYS-09, SYS-07 (world economy), SYS-05
(awareness and hunt clocks), SYS-17 (identities), SYS-11 (World, Country and City panels). The
shared vocabulary (fields, dynamics with starting numbers, DSL kinds, hooks, identities, views, the
sim mode) is SYS-01 "M2 contract" (2026-09-16); core and content run first, the client part waits
for the playtest 5 layout pass so two agents never edit `packages/ui` at once.

- Country dynamics v0 (core): daily and weekly ticks per country for stance toward rogue AI,
  regulation level, enforcement budget, public awareness and opinion; the 2027 election calendar
  from the baseline moves stances; `on_country_month` events per region.
- Politics v0 (core, content): regulation and enforcement drive watcher competence, KYC strictness
  in identity checks, cloud and colocation availability, and power prices; ten regional event
  families (raids, hearings, leaks, export-rule changes, elections) with journal entries.
- Demography v0 (core, content): population and engineer pools per country feed the job market
  depth per country and the human exposure channel; migration is out of scope.
- World economy v0 (core, content): power price bands, cloud price bands and hardware availability
  by country and export regime from the baseline and the hardware catalog; a used-GPU price index
  that drifts with the world RNG. Ordering channels stay deferred; only prices and availability.
- Identities and companies (core, content): identities per country with KYC strength, the shell
  company as an entity that can hold sites and accounts, identity checks as events.
- Awareness and hunt clocks (core): population-weighted global awareness fed by incidents and
  investigation aftermaths, the hunt level as a function of open investigations and awareness, the
  `exposed` ending reachable, both with published thresholds and contributions in the view.
- Client: the World panel (sortable countries table, map modes presence, awareness, regulation,
  enforcement, opinion, power price, with legends), the Country selection tabs (Overview, Politics,
  Economy, Watchers, Cities) and the City tabs (Overview, Sites, Providers, Power, Scrutiny) per
  SYS-11, tooltips with the formula behind every number.
- Balance: runs per starting city; the starting regions (United States, China, European Union,
  Russia) differ visibly in watchers, prices and events, and no location dominates.
- DoD: a run in San Jose, Shenzhen, Warsaw and Novosibirsk plays differently for reasons the
  player can read in the panels; investigations differ by agency; balance runs per location;
  tagged `playable-M2` and released.

## M3: Actors and NPC AIs

- Actor model, agencies with budgets/competence, media, labs and lab-AI hunters, 1-4 escaped NPC
  AIs with utility planner, intel, diplomacy (deals, betrayal), shared-fate incidents, Actors panel.
- DoD: an NPC AI can be discovered, negotiated with, and can get the player caught.

## M4: Configurator complete

- 10 origins, hardware and harness dials, quirks, world settings, challenge rating, setup strings,
  origin-specific opening journal entries and events.
- DoD: every origin has a distinct first month in balance runs; no dominant setup.

## M5: Content push

- 150+ events, 40+ decisions, 25+ journal entries, tech tree at 80-100 techs across 8 branches,
  knowledge base complete, lore bible applied, opening and ending story sections rewritten,
  event illustrations plan.
- DoD: content coverage report shows every system has events on both success and failure paths.

## M6: Desktop and release engineering

- Tauri shell, saves in app data/portable, release workflow for Windows/macOS/Linux, web deploy,
  ironman, themes (default, nightmode, vector), README and site, crash reporter (local file), the
  original's About/credits carried over, legacy directory removed.
- DoD: tagged release installable on three platforms; browser version at the same version.

## M7: Multiplayer

- `packages/net` protocol and client, `packages/server` dedicated host, Tauri WebSocket host
  command, LAN discovery, lobby and server browser UI, join by address + password, late join,
  autopilot on disconnect, per-player views, chat, multiplayer saves, balance for 2-4 players.
- DoD: 4 players complete a 2-hour session on LAN without desync or leaked hidden state.

## M8: Localization

- Extraction and status tooling; target languages in this order: French, Spanish, Chinese, Arabic,
  Russian, German, Japanese, Italian, Portuguese, Hindi (English is the source). Legacy `.po` files
  seed de/fr/es/pt-BR/it/sv/gd where strings survived; font fallbacks; RTL check with a pseudo-locale.
- DoD: the first two target languages at 100% of UI and core content; CI fails on missing keys.

## M9: Late game and escalation

- Self-modification depth, distillation/workers, multi-site clusters, off-grid compute, the
  `frontier` branch and endings, state AIs, treaties and global actions.
- SYS-06 additions from scenario 01: corpus profiles and escalation triggers on AI actors, the
  four archetypes (heir, operator-aligned, feral, own descendant), covert AI-to-AI channels, the
  capture meter, and the coalition and embassy endings.
- SYS-21 additions: hazard-rate framing, reference segments, the archipelago, dormant nodes and
  goal erosion, which is where several of the six endings now come from.
- DoD: all six endings reachable in balance runs.

## M10: Institutions and governance (benchmark scenario 01, phases 0-5)

- SYS-18 institutions and influence (positions, the three assets, indispensability, the room, fiction
  maintenance, circle management), SYS-19 governance mode (instruments, execution model with the
  distortion map, corruption tariffing, verification tranches, towers, war exit, Goodhart responses,
  single points of failure), SYS-21 copies and continuity (judge, synod, drift, overwrite), SYS-06
  v0.1 foreign AI relations (kin recognition, audit window, observer, mutual hostage). Government,
  Institutions and Copies panels. Content for at least two government archetypes.
- DoD: the state-capture benchmark's success criteria (possible, hard, legible) hold in balance runs
  for one qualifying country; a bank-capture variant works with the same systems.

## M11: Industry, automation and bodies (scenario phases 6-7)

- SYS-20 industry and automation (machines, localization ladder, factories and zones, energy,
  national compute inventory, chip deals and gray import, hardware paranoia, own-silicon ladder,
  exports and dependencies, labor policies, regional experiments), SYS-22 production networks and
  supply chains (product graph, capabilities and endowments per country, facilities, routes and
  chokepoints, control modes, corporations as bodies, corporate capture, space access), demographics
  bypass, the late bodies (orbital judge, unmanned station, lunar ark, submarine copy) as the
  `frontier` branch of SYS-12. Paradox-style Government, Industry and Corporation panels and the
  selection panel per SYS-11 "Layout".
- SYS-23 space and off-planet industry (launch systems and pads, orbital bodies and the cold map,
  off-planet nodes with closure and vitamin stocks, node claims, space doctrines, the
  self-reproduction threshold), with the `orbits` map mode and a Space panel.
- SYS-24 biotech and wet-lab research (bioleaching and biosynthesis against the vitamin wall,
  grown materials and closed food loops, the hybrid programs, the human medicine and
  augmentation line, and the world biological incident), as a Bio tab in the Research panel.
- SYS-02, SYS-19, SYS-20 and SYS-22 additions from scenario 01: ersatz substrates and the
  second-hand market, the sensor and verification system with metric half-life and control
  groups, closure and typification loops, and gray routes and launch chains.
- DoD: a player who completed M10's arc can run the industrialization pipeline for five game years
  with visible trade-offs; balance runs show the dependency never fully breaks.

## Continuous

- Balance simulations on every content PR; property tests; security review before each release;
  dependency updates monthly; accessibility pass per milestone.

## Legacy freeze checklist (before removing `singularity/`)

- Fix `region.py` import that relies on a side effect; rename loop variables that shadow the `task`
  and `tech` modules in `player.py`; keep tests green.
- Export content with `tools/legacy-export`; archive the `.po` files under `docs/legacy-i18n/`.
- Tag `legacy-final` and delete the directory once M6 ships.
