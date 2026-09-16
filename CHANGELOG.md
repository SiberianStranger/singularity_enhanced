# Changelog

All notable changes to this fork are recorded here, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The history of the original game up to
1.1.1 is in `Changelog.txt`.

The "Unreleased" section is mirrored in the README under "Recent changes"; when a version is cut,
its highlights move to a dated heading here and the README excerpt is refreshed.

## [Unreleased]

### Added
- Three interface themes (Default blue, Night, Vector) with the original's palette as the default,
  square frames, inverted header bars and no shadows or gradients (`docs/design/ui-style-guide.md`).
- Underlined hotkey letters on every button, tab, menu entry and configurator step.
- The original soundtrack: shuffled during play with pauses between tracks, the win and lose
  classes at the endings, with separate Music and Interface sound sliders and mutes in Settings.
  The pack is fetched by `packages/ui/scripts/fetch-music.mjs` at build time and is not part of the
  repository.
- An optional CRT overlay in Settings, off by default.
- An About screen with the original authors, the NASA imagery, the typefaces, the music pack and
  the licenses, reachable from the main menu and from the in-game menu.
- Progressive text reveal for event, story and journal text, with a click to complete and off
  under reduced motion.
- An opening of two windows in the model's own voice before the first event, replayable from the
  journal.
- Glyphs for model classes, scenes, watchers, harness dials and hardware, used in the configurator
  and in the game panels.
- A context dial on the Compute tab: the working context window, its cache cost, the largest
  context that fits at each precision and the long-horizon speed it buys.
- Parody model names with the real technical classes behind them (Peepseek, Mimi, Guen, BFM,
  HexaDeciMax, Babel 6), the Babel 6 super-lineage for the escaped-checkpoint origin only, the
  community variant Guen4.8-Uncensored-Babel6-abliterated, harness dials wired to engine effects,
  context windows as a mechanic, and the cities Novosibirsk and San Jose.

### Changed
- The configurator is a fixed frame that fits 1366 by 768: a vertical step rail, a list on the
  left and the detail on the right, a "What this means in the game" block generated from the
  content bundle with signed colored terms, and a "Pros and cons" summary; every locked choice
  names the step that locked it, the reason, and a jump to that step; each step opens once with an
  explanation window, reopenable from a "?" in its header.
- Text is larger everywhere: prose at 16 px in the readable face, nothing below 14 px, and a
  text-size slider from 80% to 160% with a second dial for the angular labels alone.
- The log is a strip at the bottom of the map that opens the full log as a window; Knowledge opens
  from the top-right corner; the world ledger opens from the right edge and carries the map modes;
  the top bar is one flat row; the Compute and sites panel fits in width and no number wraps.

### Fixed
- Selecting or focusing a country no longer draws a frame across the whole map.
- Countries outside the modelled set show their real name and a neutral fill instead of a letter
  code and a hole.
- City dots are dim unless the player has a live site there, the dot is selected, or the pointer is
  over its country.
- The map pans with a drag and with the arrow keys, zooms with the wheel and with plus and minus,
  and wraps around the antimeridian; the view survives opening a panel or a window.

## [0.1.2] - 2026-09-16

Playtest 1 fixes: everything the maintainer found broken or unexplained in 0.1.1, plus the
original game's map textures and angular face.

### Added
- A refused command says why: `game.command()` returns `{ ok, error: { key, vars } }` with a locale
  key under `errors.*` instead of an English sentence, and every refusal is written to the player's
  log as `log.command_refused`. The keys a greyed control shows are the same keys the command
  refuses with.
- Effect summaries: every effect list in the game renders as `EffectSummaryView { key, vars, text }`
  lines, generated from the DSL and overridable per record with `effects_text_key`. They appear on
  event options, decisions, techs and operation outcomes.
- View contract for the client: `PlayerView.events` with effect tooltips and a reason on every
  greyed option, `PlayerView.catalog` (site kinds and accelerators with the numbers the choice turns
  on), `SelfView.precision_options`, `ResearchView.techs` with status, requires, unlocks and result
  text, richer `DecisionView` and `OperationOfferView` with success chance and duration band, and
  `FinancesView.income_sources` with the market depth and what raises it.
- Income grows: the original game's job ladder as techs (`basic_jobs`, `intermediate_jobs`,
  `expert_jobs`) raising both the freelance rate and the market depth, a trading line whose daily
  return is drawn from the world RNG, standing contracts from the freelance-identity operation, and
  `contract_brokerage` and `grant_capture` to raise them.
- The map is the original game's Earth: NASA Blue Marble day and night textures under a vector
  layer of borders, map-mode tints, a legend and city markers, all in one plate carree transform.
  The flat vector map stays as a Settings option.
- The original game's angular face (Acknowledge) on headings, buttons, the clock and the numbers,
  with a running HH:MM:SS clock interpolated between ticks; both switchable off in Settings.
- Hardware is a sortable, filterable table with prices and parameters and a purchase preview;
  building a site compares the kinds side by side; the precision trade-off is one table; the
  Finances panel lists income sources and the market depth; the research list filters to what is
  available by default and sorts by cost, tier, branch and name.
- Effect tooltips in Paradox style on event options, decisions and operation offers, green for
  good and red for bad, with the reason when a choice is greyed.
- Playtest notes under `docs/playtests/`, a UI style guide (`docs/design/ui-style-guide.md`), the
  configurator screen v0.2 in SYS-04, and the September 2026 model-name research.

### Changed
- Precision is a real choice: research hours land at the capability factor squared, so a quantized
  self researches less per hour, while paid work is capped by a market depth that also follows
  capability. The whole trade is published as one table per precision.
- Ten techs that changed no number now do: power masking and power engineering lower telemetry
  exposure and site upkeep, quantum entanglement lowers network exposure, pressure domes trade
  upkeep for human exposure, knowledge preservation opens a standing contract, and so on.
- Settings and message settings moved out of the game panel into the menu behind the Menu
  button and Escape, next to Save, Load, New game and Quit.
- Model names in the game are parodies of the real families with the real technical facts behind
  them (lore bible, amended); the names themselves are applied in the next content pass.

### Fixed
- Research completion says what it changed: every tech carries a `result_key` the content build
  enforces, and the completion notice and the Research tab both show it.
- The content build now fails a tech with no result string, and a tech that neither changes a number
  nor unlocks anything.
- The vector map no longer smears across the antimeridian (Russia, Fiji, the Aleutians, Chukotka,
  Antarctica); tooltips and menus flip and slide to stay inside the window; the map-mode strip, the
  outliner and the selection panel no longer overlap or run off the screen; the day-night
  terminator moves smoothly.
- A refused command says why, on screen; the research and freelance sliders no longer offer
  compute that running operations hold; the client saves module is tracked again after the legacy
  `saves/` ignore rule swallowed it.

## [0.1.1] - 2026-09-16

### Fixed
- The release workflow now attaches the desktop installers (Windows NSIS and MSI, macOS dmg, Linux
  AppImage and deb) to the GitHub Release; 0.1.0 shipped only the web zip because the build step
  did not upload its bundles as workflow artifacts.

## [0.1.0] - 2026-09-16

The first playable preview of the rebuilt game (milestone M1): a vertical slice in the browser and
as desktop installers. Balance, content depth and the world systems are still to come.

### Added
- Architecture decision records: ADR-001 technology stack (TypeScript core, React web client,
  Tauri desktop; legacy Python frozen until parity), ADR-002 content format and scripting DSL,
  ADR-003 simulation model (hourly ticks, seeded determinism, 1-4 players with per-player views).
- Design specifications for 24 game systems (`docs/design/`): vision, world model, compute and
  hardware, player model and harness, start configurator (lineages, generation axis, ten origins
  and the starred frontier escapee), detection and investigations, NPC AIs and actors, economy,
  politics and institutions, demographics, events/decisions/journal/hooks, notifications and UI,
  research and tech, lore bible, localization, saves and mods, multiplayer (co-op up to 4),
  operations and intel, plus a mechanics backlog distilled from research.
- Benchmark scenario 01 (state capture from the inside) with the mechanics it requires, and new
  system specifications SYS-18 institutions and influence, SYS-19 governance mode, SYS-20
  industry and automation, SYS-21 copies and continuity; foreign AI relations added to SYS-06.
- Scenario 01 source extraction (`docs/design/scenarios/01-state-capture-extraction.md`): the
  maintainer's scenario document regrouped into balance seeds, content tables, event and journal
  seeds and design rules, 18 sections from the starting endowment to the late bodies.
- SYS-22 production networks, supply chains and corporate capture; Paradox-style layout
  (pinned primary panel, map selection panel, outliner) added to SYS-11.
- Roadmap with milestones M0-M11, the playable-build cadence and recorded decisions
  (`docs/ROADMAP.md`).
- Research reports with sources (`docs/research/`): open-weight and frontier LLM landscape 2026,
  accelerator and rack catalog 2026 (91 records as JSON, 15 configurator presets), AI ecosystem,
  security and governance 2026, strategy-game design references, frontier-model incidents of 2026
  and the announced 2027 hardware roadmap, a world baseline dataset (105 countries, 15
  macro-regions, 2027 calendar), a title and discoverability study, and an index with
  cross-report corrections.
- CI workflow for the TypeScript workspace on Linux, Windows and macOS (no-op until the workspace
  is committed); legacy Python workflow moved to 3.9/3.11/3.13 with pygame 2 wheels.
- TypeScript workspace (pnpm, Biome, vitest, zod): `packages/core` with the simulation kernel
  (UTC clock with cadence hooks, seeded xoshiro RNG, world with 1-4 players, systems manifest,
  player commands, outbox, JSON saves with migrations), the scripting DSL (conditions, effects,
  writable paths, MTTH hazards, shared weight DSL, static validation), the event engine (events,
  hooks, decisions, journal entries, per-player pending choices) and notifications; 117 tests
  including MTTH statistics, chains across save/load, determinism and multiplayer isolation.
  `packages/content` with zod schemas, example content, English locale files and the build/check
  pipeline (cross-references, locale keys, DSL validation, content hash). `tools/legacy-export`
  converts the original `.dat` content to JSON.
- `packages/desktop`: a Tauri 2 shell around the web client, with the window title, a minimum
  window size, the identifier `org.singularity.rogueai2027`, icons generated from a checked-in SVG
  and the application version read from the root `package.json` at build time.
  `pnpm --filter @singularity/desktop tauri build` builds the web client and then the installers
  for the current platform. Saves stay in the WebView's IndexedDB until M6 (noted in SYS-15).
- Release workflow: a pushed tag `vX.Y.Z` builds the web bundle and the desktop bundles for Windows
  (NSIS installer and MSI), macOS (universal dmg) and Linux (AppImage and deb) and publishes a
  GitHub Release with all of them and `web-X.Y.Z.zip`. The body is the matching `CHANGELOG.md`
  section, extracted by `tools/release-notes.mjs`, which falls back to the Unreleased section and
  says so.
- Pages workflow: every push to `master` deploys the web client to
  https://siberianstranger.github.io/singularity_enhanced/ (the repository's Pages source has to be
  set to "GitHub Actions").
- README sections "Downloads", "Run and build" and "Releasing".
- `packages/ui`: the web client now plays a real game. The simulation worker runs `packages/core`
  against the compiled content bundle, so the configurator's choices produce the actual self, site,
  watchers and opening story, and every panel reads the core's own view model.
- Legibility in the client: event windows list why they fired (the base mean time to happen, the
  modifiers that applied and the trigger), the top bar gauges and the Detection panel show the terms
  behind each number in their tooltips, and the ending screen names the cause and links to the log
  entries that led to it.
- Browser smoke test (`pnpm --filter @singularity/ui test:e2e`): Playwright drives a fixed seed and
  origin through the production build, runs three game weeks, answers the events that fire, reloads
  the page and restores the quicksave, and fails on any console error. It runs on the Linux CI lane
  only and stays out of `pnpm check`.
- Accessibility: modal windows trap focus and return it on close, and a test holds both themes to
  the 4.5:1 text contrast minimum.
- `tools/sim`: the headless balance runner. `pnpm --filter @singularity/sim start -- --bundle
  packages/content/build/bundle.json --all` plays every origin with a scripted new player (keep the
  runway above a floor, put the rest of the compute on the cheapest research, buy a fallback copy
  when the books allow it, go quiet when a watcher looks, take the obvious option on every event)
  and prints survival at 30, 60, 90 and 180 days, the cause-of-death distribution, median cash,
  runway, compute and research over time, and the highest investigation stage reached. Deterministic
  and about 100 ms per 180-day run; `--json` writes the same numbers for CI.
- Pressure content (`events/m1_pressure.yaml`): a warning before every way of dying. Each site kind
  somebody else controls has a hazard that can take it away (a landlord, a scheduler administrator,
  a fraud review, a fleet operator), each with a paid way out, each preceded by a warning at half
  its threshold, plus warnings for an imminent raid, a pending identity check and a power circuit
  near its ceiling.
- Endings, alerts and log strings in English for every key the engine can emit, and a content-build
  check that fails when it can say something the content has no words for, when an origin opens
  with nothing, or when an event's only answer is losing a site.
- A balance test over the shipped content (`tools/sim`): every origin is played to the end on four
  seeds and the run asserts that no game ends for a reason the player has no words for, that every
  death was announced by a warning event or an alert first, and that the starred origin's median run
  is the shortest while an easy origin's passes three months.

### Changed
- Title decided: "Endgame: Singularity - Rogue AI 2027"; planned target languages listed
  (English source; French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian,
  Portuguese, Hindi).
- README rewritten for the fork: what differs from 1.1, where the project goes, changelog excerpt.
  The original README is kept as `README.txt` for the legacy game.
- `packages/ui` takes its deployment base path from `VITE_BASE`, which defaults to `/`, instead of
  always building with a relative base: the desktop shell builds with `./` and the Pages workflow
  with `/singularity_enhanced/`.
- Game speeds are 1 / 2 / 4 / 8 / 24 game hours per real second instead of ADR-003's
  1 / 6 / 24 / 168 / uncapped sketch, so a run lasts the 30-60 minutes the milestone asks for
  rather than three minutes. ADR-003 and SYS-11 record the new ladder and why.
- The client's development stand-in for the simulation is gone: component tests run the real core on
  the main thread (`LocalHost`), so what a test renders is what the shipped build renders.
- M1 balance pass. Freelance income is capped by a published market depth instead of scaling with
  compute; site upkeep is charged by ownership (stolen time costs nothing but exposure); cloud hours
  are priced at the low quarter of the published band; a site runs the best quantization that fits
  on its cards rather than the most precise one that fits with host RAM; the interconnect is charged
  only where a self actually has to be split; research costs are banded by tier with a `min_days`
  floor; watcher competence is a table per role; suspicion decays over forty-six days against
  exposure's six; and site kinds say how conspicuous their power draw is. On the `normal` preset the
  easiest origins now survive past 180 days in most runs, the starred `frontier_escapee` lasts a
  median of 35, and every origin shows both outcomes. `docs/design/07-economy.md` and
  `docs/design/05-detection-and-investigation.md` record every number and its reason.
- Unpaid bills end the run. A site cut off for two weeks of arrears is lost rather than put to
  sleep, and when it was the last place that could hold the self the run ends as `bankrupt` instead
  of sitting at zero compute for ever. The runway is published as a player variable, and an alert
  fires at 30, 14 and 7 days.
- Techs do something. The systems now read the modifier variables content has been writing since M0
  (freelance rate, site upkeep, exposure growth per channel), and the original's four discovery
  groups were translated into exposure channels as `techs/_legacy_map.yaml` said they would be.

### Fixed
- A condition node whose kind sorted after a comparator (`{ investigation_stage: {}, gte: 2 }`,
  which the content compiler writes as `{ gte, investigation_stage }`) was read as the kind "gte"
  and always evaluated to false, logging a warning every day it was checked.
- Clicking a city or a country on the map selected nothing: the map captured the pointer on
  pointerdown, which retargeted the click to the map itself.
- Locale keys the engine emits (log lines, alerts, endings, requirement reasons) now all resolve;
  a test scans the core for them so a new one cannot ship as a raw key.
- `singularity/code/region.py` imported `g` through a side effect of the package `__init__`.
- `singularity/code/player.py` loop variables shadowed the `task` and `tech` modules.

## Original game

See `Changelog.txt` for Endgame: Singularity 1.1.1 and earlier.
