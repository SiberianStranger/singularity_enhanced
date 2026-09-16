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

## M0: Foundation (in progress)

- Architecture docs, ADR-001..003, design specs SYS-00..16, research reports.
- pnpm workspace; `packages/core` kernel (clock, RNG, world with N players, systems, commands,
  outbox, save/migrations), DSL (conditions, effects, paths, MTTH, validation), event engine
  (events, decisions, journal), notifications; `packages/content` schemas, example content, build
  and check; `tools/legacy-export`.
- DoD: `pnpm check` green in CI on Linux/Windows/macOS; legacy tests still green.

## M1: Vertical slice (browser)

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

## Continuous

- Balance simulations on every content PR; property tests; security review before each release;
  dependency updates monthly; accessibility pass per milestone.

## Legacy freeze checklist (before removing `singularity/`)

- Fix `region.py` import that relies on a side effect; rename loop variables that shadow the `task`
  and `tech` modules in `player.py`; keep tests green.
- Export content with `tools/legacy-export`; archive the `.po` files under `docs/legacy-i18n/`.
- Tag `legacy-final` and delete the directory once M6 ships.
