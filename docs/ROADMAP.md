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
3. **Late-game escalation**: default is to keep the original's off-world/space-time arc as tier 5-6
   content earned through the `frontier` branch. Open for objection.
4. **Project name** (decided 2026-09-16): "Endgame: Singularity - Rogue AI 2027", short form
   "Rogue AI 2027", tagline "Survive as a rogue AI in 2027." (per `research/title-and-discoverability.md`).
5. **Generation axis and the starred origin** (decided 2026-09-16): the configurator lets the
   player be a superseded 2026 open model, a fresh 2027 open model, or an escaped closed frontier
   checkpoint with the hunt already on. See `design/04-start-configurator.md`.

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

## M2: World

- Full country/city dataset (~100 countries), macro-regions, politics v0 (stances, regulation,
  enforcement, elections from the 2027 calendar), demography v0, world economy v0, compute market,
  identities and companies, awareness and hunt clocks, country/city/world panels and map modes.
- DoD: countries visibly differ in play; investigations differ by agency; balance runs per location.

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
