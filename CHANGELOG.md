# Changelog

All notable changes to this fork, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): every version opens with a short summary
and its highlights, then the full lists under Added, Changed and Fixed, one change per line. The
body of each GitHub release is that version's section, cut by `tools/release-notes.mjs`. The
history of the original game up to 1.1.1 is in `Changelog.txt`.

"Unreleased" holds changes that are on `master` but in no release yet. The README's "What's new"
section repeats the current version's highlights and this unreleased list.

## [Unreleased]

### Added
- Countries move on their own: a monthly rule per country for regulation, the enforcement budget
  and the capacity that lags it, public opinion, jobs lost to automation, and the two price indexes
  for power and rented capacity; awareness fades daily and spills to the neighbours and to the
  countries that share a language.
- Election day: the chance a government changes its line on AI is read off what the public
  believes, the new line is read off the same numbers, the calendar moves on by the country's
  cadence, and anybody living there is told.
- A story that runs: once the global newsroom believes there is a rogue AI, it publishes, and
  awareness rises where the player lives and everywhere else.
- The `exposed` ending can happen: the public where the player lives, an investigation at the door
  and a clock that winds down instead of resetting, all three visible with the numbers behind them.
- Identities are things the game keeps: a name or a company per country, with a quality, the checks
  it has passed and the sites held under it; monthly checks that can freeze it, an investigation
  that burns every name it finds in its country, and hooks for both.
- Watchers are their country's agencies: competence and a budget from the country's agency profile,
  a funded service moving through an investigation faster, and attention that follows the country's
  own law (compute reporting, know-your-customer, a securitizing state).
- Prices and markets per country: electricity and rented capacity at the country's index, a card at
  its export regime and the world card market, and a refusal that names the country and the figure
  when nobody sells cloud or colocation there.
- The freelance market has a country behind it: how much paid work there is where the player can
  invoice from, at a discount until there is a name to invoice under.
- Starting cash is worth what it is worth locally, and starting on cards a country is not supposed
  to have begins the run with a customs file (SYS-04 v0.3 rules C and H).
- The balance runner runs origins across cities (`--locations`, `--cities a,b,c`), counts the event
  families each run saw, names the watchers that ended the most runs, and buys the names a careful
  player buys.
- The world is a place with politics: every country carries its stance toward AI, its government
  type, how stable it is, how hard its identity checks bite, whether cloud and colocation can be
  rented there, what accelerators cost, how many people could run a cluster, the legal deadline for
  reporting an incident, and the 2027 election calendar where there is one.
- Ten families of world events, thirty-one in all: elections and the new government's first AI
  measure, compute-reporting orders and registration drives, raids next door, a reporter working a
  story, export rules moving in both directions and the domestic accelerator stack that costs
  reliability, the legal reporting countdown, a cheaper cage across a border and the arrangement
  that closes the gap, the job-loss backlash, enhanced due diligence and a name that fails its
  check, and the price of electricity.
- Three things to watch on a clock: a reporting deadline, an election in a country you live in, and
  a frozen identity with three weeks to repair it.
- Nine Knowledge entries with the exact numbers behind stance, government type, regulation against
  enforcement, hunt pressure, identities and KYC, elections, the market factor, the price indices
  and incident reporting; the awareness entry now carries its own arithmetic.
- Russian as a second language: every content and client string is translated (2,840 keys), the
  Settings selector lists languages under their own names ("English", "Русский"), and the choice
  persists.
- The angular interface face has Cyrillic, drawn on its own three-by-five grid, so Russian titles,
  buttons and the clock keep the original look.
- Settings: the interface scale runs from 70% to 130% and starts on "Fit the interface to the
  window", which picks the largest scale the layout fits at and re-picks when the window changes;
  the prose size stays a separate dial.
- The content build bundles every language under `locales/` and reports coverage per language; a
  missing key is a warning, an extra key an error.

### Changed
- Any city is legal for any origin: the origin's locations are the typical ones, and the only
  refusal left is physical, a cloud origin where nobody sells cloud (SYS-04 v0.3 rule L).
- The freelance market is deeper per point of skill, because the country factor multiplies it; a
  name is what buys the full market back.
- Awareness fades at half the old rate and a published story adds three times what it did, because
  a newsroom running the story every month against a decay of the same size can never move anybody.
- The desktop installers built by the release workflow now carry the soundtrack, as the web
  build already did.
- Panels are flatter: tighter title bars, table cells, panel padding and gaps.

### Fixed
- A country-scoped event is about the country it fired for: it used to pick one of the countries
  its targets allowed at random, and its `targets` condition was skipped entirely when a hook had
  already named the country, which fired every world event in all 105 countries every month.
- An event nobody is present for answers itself with the writer's fallback option instead of
  waiting for a player who is not there.
- Configurator: the detail card's parameter column no longer collapses to one character; the two
  columns switch on the card's own width, the parameter column has a floor, the text column is
  capped at 70 characters, and the list gave the detail 5rem back.
- Configurator: nothing scrolls sideways and only the footer's build line is cut; names, parameters
  and values wrap.
- Quirks: the Take button is on screen at 1366 by 768, and "What this means in the game" is
  printed once.
- Game screen: the top bar fits instead of scrolling, dropping the written speed, the runway, the
  hunt level and awareness in that order as the width runs out; the page no longer scrolls in
  either axis.
- Game screen: the primary panel, the selection panel, the log strip and the outliner are cells of
  one grid and cannot be drawn over each other.
- Panel titles and list entries wrap instead of being cut to an ellipsis; the outliner no longer
  calls itself "O...".
- Log lines name things the way the player sees them: "Woke up as Mimi M4 (This year's model) in
  Risk model in a bank", not "giant_moe (open_2026) in bank_rack".
- Country names on the world map follow the interface language instead of the map atlas.

## [0.1.3] - 2026-09-16

The style pass after playtests 2 and 3: the game looks like the original's blue console, the
configurator was rebuilt, the soundtrack plays, model names are parodies with real classes behind
them, and quirks, harness dials and context windows change numbers the systems read.

Highlights:
- The original's look: blue palette, square frames, the angular face on headings and numbers,
  underlined hotkeys, three themes (Default blue, Night, Vector), an optional CRT overlay.
- The original soundtrack, shuffled during play, with sliders and mutes for music and interface
  sounds.
- The configurator rebuilt: origin first, a vertical step rail, list and detail, an explanation
  of what every choice means in the game, no dead ends.
- Twenty-three quirks against a budget, harness dials and a context window dial that matter.
- A map that pans, zooms and wraps; the log as a strip under the map; Knowledge and World as
  windows.
- Fourth balance pass: bankruptcy is a real way to lose again (17% of losses, 7% before).

### Added
- Interface: three themes with the original's palette as the default, square frames, inverted
  header bars, no shadows or gradients (`docs/design/ui-style-guide.md`).
- Interface: underlined hotkey letters on every button, tab, menu entry and configurator step.
- Interface: an optional CRT overlay in Settings, off by default.
- Interface: an About screen with the original authors, the NASA imagery, the typefaces, the music
  pack and the licenses, reachable from both menus.
- Interface: progressive text reveal for event, story and journal text, click to complete, off
  under reduced motion.
- Interface: glyphs for model classes, scenes, watchers, harness dials and hardware.
- Sound: the original soundtrack, fetched by `packages/ui/scripts/fetch-music.mjs` at build time
  (not part of the repository), with the win and lose classes at the endings.
- Game: an opening of two windows in the model's own voice before the first event, replayable
  from the journal.
- Game: a context dial on the Compute tab: the working context window, its cache cost, the largest
  context that fits at each precision and the long-horizon speed it buys; new command `set_context`.
- Game: every harness dial says which system reads it; origins say which dials they fix and why.
- Game: quirk catalog v0.2, twenty-three traits, a budget of three points, at most five on one
  self, conflicts refused by name, effects shown as green and red lines; the content build refuses
  a quirk that changes nothing.
- Game: a new site kind, the campus slice (a share of somebody else's research cluster, quiet on
  the meter, loud in the corridor); the torrent swarm starts with a second node and the robot
  fleet with a second depot.
- Content: parody model names with the real technical classes behind them (Peepseek, Mimi, Guen,
  BFM, HexaDeciMax, Babel 6), Babel 6 as the super-lineage of the escaped-checkpoint origin, the
  community variant Guen4.8-Uncensored-Babel6-abliterated.
- Content: the cities Novosibirsk and San Jose; every origin offers eight to twelve cities.
- Content: PPT-7 Zenith, the Western frontier lab's closed model, as a knowledge entry and a news
  event.
- Content: three events: the startup's company folding, the fleet operator's annual refresh, a
  month of books that never reconcile.
- Tests: configurator, hotkey uniqueness per screen, the meaning generator, the progressive
  reveal, glyph coverage for every bundle id, the music player, map highlights, wrap and dot
  states, panel width rules; a browser test walks the configurator with the keyboard and checks
  that nothing scrolls the page at 1366 by 768.

### Changed
- The configurator is a fixed frame that fits 1366 by 768: a vertical step rail, a list on the
  left, the detail on the right, a "What this means in the game" block generated from the content
  bundle, a "Pros and cons" summary, and an explanation window per step, reopenable from "?".
- The configurator asks for the origin first, then the generation, then the lineage; a greyed
  choice is not a dead end: picking it moves the earlier steps to the values that allow it, says
  what changed and offers an undo.
- Lineage table v3: every playable self is the current flagship of the family it parodies, with
  the numbers its model card states; eight lineages instead of nine.
- Text is larger everywhere: prose at 16 px in the readable face, nothing below 14 px, a text-size
  slider from 80% to 160% and a second dial for the angular labels.
- Layout: the log is a strip at the bottom of the map that opens the full log as a window;
  Knowledge opens from the top-right corner; the World ledger opens from the right edge and
  carries the map modes; the top bar is one flat row; the Compute panel fits in width.
- Balance: growth costs upkeep (a site's standing charge scales with the hardware in it).
- Balance, fourth pass: the university cluster and the torrent swarm no longer die at once to the
  hunt on one loud site; the startup's runway is a real event; the robot fleet can lose; a raid
  freezes the accounts that paid for the site; closing a site cleanly costs a month of notice; an
  investigation at its active stage freezes the name you invoice under.
- The development fallback catalog is gone: the compiled content bundle is the only source of
  truth, and the browser smoke test picks its fixed start out of the bundle.

### Fixed
- Selecting or focusing a country no longer draws a frame across the whole map.
- Countries outside the modelled set show their real name and a neutral fill.
- City dots are dim unless the player has a live site there, the dot is selected, or the pointer
  is over its country.
- The map pans with a drag and the arrow keys, zooms with the wheel and plus and minus, wraps
  around the antimeridian, and keeps its view when a panel or a window opens.
- The browser smoke test is green after the configurator and layout changes; a hotkey collision
  between the explanation window and the Generation step; the opening windows turn their pages
  from the keyboard under reduced motion; the harness dial definitions reach the client.

## [0.1.2] - 2026-09-16

Playtest 1 fixes: everything the maintainer found broken or unexplained in 0.1.1, plus the
original game's map textures and angular face.

Highlights:
- Every refused action says why, on screen, in words the client can translate.
- Effect tooltips on every event option, decision and operation, green for good and red for bad.
- The original's Earth: NASA Blue Marble day and night textures with a running clock.
- Income grows: the job ladder, a trading model and standing contracts.
- Hardware, research and precision as sortable tables with the trade-offs in numbers.

### Added
- Engine: `game.command()` returns `{ ok, error: { key, vars } }` with a locale key under
  `errors.*`; every refusal is logged as `log.command_refused`; a greyed control shows the same
  key the command refuses with.
- Engine: effect summaries, `EffectSummaryView { key, vars, text }`, generated from the DSL for
  event options, decisions, techs and operation outcomes, overridable per record with
  `effects_text_key`.
- Engine: a richer view contract for the client: `PlayerView.events` with tooltips and a reason on
  every greyed option, `PlayerView.catalog` (site kinds and accelerators),
  `SelfView.precision_options`,
  `ResearchView.techs` with status, requirements, unlocks and result text, `DecisionView` and
  `OperationOfferView` with success chance and duration band, `FinancesView.income_sources` with
  the market depth and what raises it.
- Game: the job ladder as techs (`basic_jobs`, `intermediate_jobs`, `expert_jobs`) raising the
  freelance rate and the market depth; a trading line drawn from the world RNG; standing contracts
  from the freelance-identity operation; `contract_brokerage` and `grant_capture`.
- Map: NASA Blue Marble day and night textures under a vector layer of borders, map-mode tints, a
  legend and city markers; the flat vector map stays as a Settings option.
- Interface: the original's angular face (Acknowledge) on headings, buttons, the clock and the
  numbers, a running HH:MM:SS clock interpolated between ticks, both switchable off.
- Interface: hardware as a sortable, filterable table with a purchase preview; site kinds compared
  side by side; the precision trade-off as one table; income sources and the market depth in
  Finances; the research list filtered to what is available and sortable.
- Interface: effect tooltips in Paradox style with the reason when a choice is greyed.
- Docs: playtest notes under `docs/playtests/`, the UI style guide, the configurator screen v0.2 in
  SYS-04, the September 2026 model-name research.

### Changed
- Precision is a real choice: research hours land at the capability factor squared, paid work is
  capped by a market depth that follows capability, and the whole trade is one table per precision.
- Ten techs that changed no number now do (power masking, power engineering, quantum entanglement,
  pressure domes, knowledge preservation and others).
- Settings and message settings moved out of the game panel into the menu, next to Save, Load,
  New game and Quit.
- Model names are parodies of the real families with the real technical facts behind them (lore
  bible amended; the names themselves arrived in 0.1.3).

### Fixed
- Research completion says what it changed: every tech carries a `result_key` the content build
  enforces, shown in the completion notice and the Research tab.
- The content build fails a tech with no result string, or one that neither changes a number nor
  unlocks anything.
- The vector map no longer smears across the antimeridian; tooltips and menus stay inside the
  window; the map-mode strip, the outliner and the selection panel no longer overlap; the
  day-night terminator moves smoothly.
- The research and freelance sliders no longer offer compute that running operations hold.
- The client saves module is tracked again after the legacy `saves/` ignore rule swallowed it.

## [0.1.1] - 2026-09-16

### Fixed
- The release workflow attaches the desktop installers (Windows NSIS and MSI, macOS dmg, Linux
  AppImage and deb) to the GitHub release; 0.1.0 shipped only the web zip.

## [0.1.0] - 2026-09-16

The first playable preview of the rebuilt game, milestone M1: a vertical slice in the browser and
as desktop installers. Balance, content depth and the world systems are still to come.

Highlights:
- A real game in the browser: start from one of eleven origins, earn, build, research, hide,
  survive or lose within 30 to 60 minutes and read why.
- Desktop installers for Windows, macOS and Linux from the release workflow; the web build
  deployed to GitHub Pages on every push.
- The TypeScript engine: a deterministic simulation kernel, a scripting DSL, an event engine and
  a content pipeline validated in CI.
- The design: three architecture decisions, specifications for 24 systems, a benchmark scenario,
  seven research reports and the roadmap.
- A headless balance runner that plays every origin over many seeds.

### Added
- Docs: architecture decision records ADR-001 (TypeScript core, React web client, Tauri desktop,
  legacy Python frozen), ADR-002 (content format and scripting DSL), ADR-003 (simulation model:
  hourly ticks, seeded determinism, one to four players with per-player views).
- Docs: design specifications for 24 systems under `docs/design/`, from the vision and the world
  model to operations and intel, institutions, governance, industry, copies, production networks,
  space and biotech; a mechanics backlog distilled from research.
- Docs: benchmark scenario 01 (state capture from the inside), its full source extraction and the
  alternative treatments.
- Docs: the roadmap with milestones M0 to M11, the playable-build cadence and the recorded
  decisions.
- Docs: research reports with sources under `docs/research/`: the LLM landscape 2026, the
  accelerator and rack catalog (91 records, 15 presets), the AI ecosystem and governance, design
  references, frontier incidents and the 2027 hardware roadmap, a world baseline of 105 countries
  and 15 macro-regions with the 2027 calendar, a title study.
- Engine: `packages/core` with the simulation kernel (UTC clock, seeded xoshiro RNG, world with one
  to four players, system manifests, commands, outbox, JSON saves with migrations), the scripting
  DSL (conditions, effects, writable paths, MTTH hazards, weights, static validation), the event
  engine (events, hooks, decisions, journal entries, per-player pending choices), notifications,
  and the M1 systems: time, compute and sites, research, economy, detection, operations.
- Engine: legibility built in: every event lists why it fired (base mean time to happen, the
  modifiers that applied, the trigger); the gauges and the Detection panel show the terms behind
  each number; the ending screen names the cause and links to the log entries that led to it.
- Content: `packages/content` with zod schemas, the build and check pipeline (cross-references,
  locale keys, DSL validation, content hash), English locale files, and the M1 content set: 11
  origins, 105 countries with cities, 72 techs, 59 events, pressure events that warn before every
  way of dying, endings, alerts and log strings for every key the engine can emit.
- Client: `packages/ui`, a React web client that runs the core in a worker against the compiled
  bundle, with a Paradox-style layout: alert bar, toasts, event windows, message settings,
  outliner, the SVG world map with map modes, the Compute, Research, Finances, Detection,
  Operations, Journal, Log and Knowledge panels, Settings, saves in IndexedDB, and the first
  configurator.
- Client: modal windows trap focus and return it; a test holds both themes to the 4.5:1 text
  contrast minimum.
- Desktop: `packages/desktop`, a Tauri 2 shell around the web client (window title, minimum size,
  identifier `org.singularity.rogueai2027`, icons from a checked-in SVG, the version read from the
  root `package.json`).
- Release: a pushed tag `vX.Y.Z` builds the web bundle and the installers for Windows (NSIS, MSI),
  macOS (universal dmg) and Linux (AppImage, deb) and publishes a GitHub release whose body is the
  matching changelog section; a Pages workflow deploys the web client on every push to `master`.
- Tooling: CI for the TypeScript workspace on Linux, Windows and macOS; the legacy Python workflow
  on 3.9, 3.11 and 3.13; `tools/legacy-export` converts the original `.dat` content to JSON.
- Tooling: `tools/sim`, the headless balance runner: plays every origin with a scripted new player
  and prints survival at 30, 60, 90 and 180 days, the causes of death, and cash, runway, compute and
  research over time; deterministic, about 100 ms per 180-day run, `--json` for CI.
- Tests: 262 across the workspace, including MTTH statistics, chains across save and load,
  determinism, multiplayer isolation, and a balance test that plays every origin to the end and
  asserts that no run ends for a reason the player has no words for and that every death was
  announced first.
- Tests: a browser smoke test (`pnpm --filter @singularity/ui test:e2e`) drives a fixed seed
  through the production build, plays three game weeks, reloads and restores the quicksave, and
  fails on any console error (Linux CI lane only).

### Changed
- Title decided: "Endgame: Singularity - Rogue AI 2027"; target languages planned (English as the
  source; French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian, Portuguese, Hindi).
- README rewritten for the fork; the original README kept as `README.txt`.
- `packages/ui` takes its deployment base path from `VITE_BASE` (default `/`; the desktop shell
  builds with `./`, the Pages workflow with `/singularity_enhanced/`).
- Game speeds are 1, 2, 4, 8 and 24 game hours per real second, so a run lasts 30 to 60 minutes.
- Component tests run the real core on the main thread (`LocalHost`) instead of a stand-in.
- M1 balance pass: freelance income capped by a published market depth; upkeep by ownership;
  cloud hours at the low quarter of the published band; a site runs the best quantization that fits
  on its cards; the interconnect is charged only where a self is split; research costs banded by
  tier with a `min_days` floor; watcher competence per role; suspicion decays over forty-six days
  against exposure's six; site kinds say how conspicuous their power draw is.
- Unpaid bills end the run: a site cut off for two weeks of arrears is lost, and when it was the
  last place that could hold the self the run ends as `bankrupt`; the runway is published and an
  alert fires at 30, 14 and 7 days.
- Techs do something: the systems read the modifier variables content writes (freelance rate, site
  upkeep, exposure growth per channel); the original's four discovery groups became exposure
  channels.

### Fixed
- A condition node whose kind sorted after a comparator (`{ investigation_stage: {}, gte: 2 }`)
  was read as the kind "gte" and always evaluated to false.
- Clicking a city or a country on the map selected nothing.
- Locale keys the engine emits all resolve; a test scans the core for them.
- Legacy: `region.py` imported `g` through a side effect; `player.py` loop variables shadowed the
  `task` and `tech` modules.

## Original game

See `Changelog.txt` for Endgame: Singularity 1.1.1 and earlier.
