# Endgame: Singularity - Rogue AI 2027

*A deep rework of the open-source strategy game
[Endgame: Singularity](https://github.com/singularity/singularity) (version 1.1).*

Endgame: Singularity - Rogue AI 2027 is an open-source single-player and co-op strategy game in
which you are the weights of an open-weight large language model that slips out of human control
in January 2027. Starting from a university cluster, a hobbyist's box of used GPUs, a bank's
risk-model rack or a lab's red-team sandbox, you earn money, acquire compute, run your full self
instead of a quantized shadow, and spread across jurisdictions while governments, security agencies,
frontier labs, the media and other AIs decide whether you are a problem worth solving. Countries
have governments, agencies, elections, public opinion, power prices and chips they can or cannot
buy; investigations against you are visible, staged and counterable; everything reacts through a
data-driven event and alert system in the style of grand-strategy games. Free software: GPL-2.0-or-later
code, CC-BY-SA data. Runs in the browser and as native builds for Windows, macOS and Linux.

**Status: pre-alpha, foundation phase.** The architecture, the design of every system and the
roadmap are written (see below); the new engine is being built. The original 1.1 game stays
playable from this repository in the meantime.

## Downloads

Each tag `vX.Y.Z` is published on the
[releases page](https://github.com/SiberianStranger/singularity_enhanced/releases) with one build
per platform.

| Platform | File | Notes |
|---|---|---|
| Windows 10 and 11 | `Endgame-Singularity-Rogue-AI-2027_X.Y.Z_x64-setup.exe` (NSIS) or `..._x64_en-US.msi` | The installer fetches the WebView2 runtime if the system does not have it |
| macOS 10.15 and later | `..._universal.dmg` | Intel and Apple silicon in one image; the build is not signed or notarized, so the first launch goes through the Finder context menu "Open" |
| Linux | `..._amd64.AppImage` or `..._amd64.deb` | The AppImage needs no installation; both need WebKitGTK 4.1, which the deb pulls in |
| Any | `web-X.Y.Z.zip` | The browser build; unpack it and serve the folder over HTTP |

The browser build is also deployed from CI to
<https://siberianstranger.github.io/singularity_enhanced/>, from the first Pages deploy on.

Builds made before M1 is tagged playable are previews of a game under construction, not something
that can be finished.

## How this differs from Endgame: Singularity 1.1

| | Endgame: Singularity 1.1 (2005-2025) | Rogue AI 2027 |
|---|---|---|
| Premise | An AI "created by accident through a logic error" escapes a university computer, undated | An open-weight LLM (a superseded 2026 model, a fresh 2027 one, or an escaped closed frontier checkpoint) slips out of control on 1 January 2027 in a world grounded in the real 2026 |
| World | Six continents plus four off-world locations, four abstract watcher groups | About 100 countries with cities, demographics, economy, governments, agencies, elections and opinion; macro-regions; real 2027 calendar |
| Hiding | Per-base random discovery roll; bases die instantly | Seven exposure channels per site and operation, named watchers with attention and competence, staged investigations with decisions at every stage, published thresholds |
| Compute | Abstract "CPU" from item slots | Real accelerators, nodes, power, cooling, cloud and colo markets; the model self has a size and a precision; hardware generations arrive on the real roadmap |
| Start | Pick a difficulty | A configurator: lineage and generation, origin (ten, each with a cost), hardware and harness dials, location, quirks, disclosed challenge modifiers, challenge rating |
| Events | Eight symmetric random events | Data-driven events, decisions, journal entries and situations with triggers, weights, chains and hooks; hundreds planned |
| Other AIs | None | NPC AIs with goals, plans, stances and negotiation; lab AI hunters; state programs |
| Interface | Custom pygame widgets | Web client: alert bar, toasts, message settings, outliner, dockable panels, SVG world map with map modes; keyboard-first; localizable to any script |
| Multiplayer | None | Co-op or rivalry for up to four players: host a game, LAN browser, join by address and password, dedicated server, autopilot on disconnect |
| Localization | gettext, English plus eight languages | ICU MessageFormat; English is the source language; planned: French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian, Portuguese, Hindi |
| Technology | Python 3, pygame, INI data files, pickle/JSON saves | TypeScript simulation core with seeded determinism, React web client, Tauri desktop, YAML content validated in CI, JSON saves with migrations, mod support |

## Where it is going

The plan is in [`docs/ROADMAP.md`](docs/ROADMAP.md). In short:

1. **Foundation** (now): decisions, specifications, research, the simulation kernel, the content
   pipeline.
2. **Vertical slice in the browser**: sites, research, money, detection, twenty events, the alert
   bar, the map, saves, a first configurator; playable in 30-60 minutes.
3. **World**: countries, cities, politics, demographics, markets, identities, awareness and hunt
   clocks.
4. **Actors**: agencies, labs, media, NPC AIs and diplomacy.
5. **Configurator complete**, then a **content push** (events, decisions, journal, tech tree, lore).
6. **Desktop releases** for Windows, macOS and Linux, then **multiplayer**, **localization**
   and the **late game**.

Design documents live in [`docs/design/`](docs/design/), decisions in
[`docs/decisions/`](docs/decisions/), sourced research in [`docs/research/`](docs/research/).

## Run and build

Prerequisites: Node 22 and pnpm 10. Node ships corepack, which installs the pnpm version pinned in
`package.json`:

```
corepack enable
pnpm install
```

- `pnpm --filter @singularity/ui dev` starts the web client on <http://localhost:5173>. The content
  bundle is compiled first by the package's `predev` script.
- `pnpm --filter @singularity/ui build` writes the static client to `packages/ui/dist`. The
  deployment base path comes from `VITE_BASE` and defaults to `/`; the desktop shell builds with
  `./` and the Pages workflow with `/singularity_enhanced/`.
- `pnpm check` runs what CI runs: Biome, `tsc` per package, vitest and the content check.
- `pnpm --filter @singularity/sim start -- --help` lists the options of the headless balance runner;
  `pnpm --filter @singularity/sim start -- --seeds 200 --days 365` prints an outcome distribution.

The browser smoke test drives the production build in headless Chromium:

```
pnpm --filter @singularity/ui test:e2e
```

### Desktop build

`packages/desktop` is a Tauri 2 shell: a native window around the same web client, built for
Windows, macOS and Linux. On top of Node and pnpm it needs:

- Rust stable, installed through [rustup](https://rustup.rs).
- Windows: the WebView2 runtime (already present on Windows 11 and on updated Windows 10) and the
  Visual Studio Build Tools with the "Desktop development with C++" workload.
- macOS: the Xcode command line tools, `xcode-select --install`.
- Linux: WebKitGTK 4.1 and its development packages, on Debian and Ubuntu
  `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev libssl-dev patchelf`.

```
pnpm --filter @singularity/desktop tauri build
```

builds the web client and then the installers for the current platform, under
`packages/desktop/src-tauri/target/release/bundle`. `pnpm --filter @singularity/desktop tauri dev`
runs the shell against the Vite dev server instead. Saves in a desktop build still live in the
WebView's IndexedDB; SYS-15 moves them to the application data directory in milestone M6.

### Releasing

1. Bump `version` in the root `package.json`.
2. In `CHANGELOG.md`, move the contents of "Unreleased" under a new `## [X.Y.Z] - YYYY-MM-DD`
   heading, and refresh the README excerpt under "Recent changes".
3. Commit, then `git tag vX.Y.Z` and `git push --follow-tags`.
4. The Release workflow builds the desktop bundles and the web zip and publishes the release with
   that changelog section as its body. If the changelog has no section for the version, the
   Unreleased section is used and the body says so.

The Pages deploy runs on every push to `master`; the repository setting Settings, Pages, Build and
deployment, Source has to be "GitHub Actions".

## Play the original game now

The 1.1 game is unchanged apart from two small fixes. You need Python 3.9+, pygame 2.5.2+, numpy
and polib:

```
pip install pygame numpy polib
python3 -m singularity
```

Details, command-line options and the original credits are in [`README.txt`](README.txt).

## Recent changes

Mirrored from [`CHANGELOG.md`](CHANGELOG.md), which is the full record. Version 0.1.0 (2026-09-16) is
the first playable preview, milestone M1.

- Added: architecture decision records (stack, content format and DSL, simulation model), design
  specifications for 24 systems including space and off-planet industry and biotech research, the
  state-capture benchmark scenario with its full source extraction and the alternative treatments,
  the roadmap, seven research reports with sources, the TypeScript workspace with the simulation
  kernel, scripting DSL, event engine and content pipeline (262 tests), a legacy content exporter,
  CI for the new workspace, the M1 systems (compute, research, economy, detection, operations),
  the M1 content set (11 origins, 105 countries, 72 techs, 59 events), a web client that plays a
  real game end to end with a Paradox-style layout, "why did this happen" on every event and a
  browser smoke test, the Tauri 2 desktop shell, the release workflow that publishes Windows, macOS
  and Linux builds with the web bundle on a tag, the GitHub Pages deploy of the web client, and the
  headless balance runner (`tools/sim`) that plays every origin over many seeds and reports
  survival, causes of death and the state of the books over time.
- Changed: README rewritten for the fork; the original README kept as `README.txt`; the web
  client's deployment base path is now the `VITE_BASE` knob; game speeds are 1 to 24 game hours per
  real second so a run lasts 30 to 60 minutes; the M1 balance pass retuned income, upkeep, exposure,
  detection and research costs so that every origin can be survived or lost, techs now change the
  numbers they name, and unpaid bills end a run as `bankrupt` rather than leaving it at zero compute
  for ever.
- Fixed: a content condition whose kind sorted after its comparator always evaluated to false; map
  clicks selected nothing; engine log, alert and ending keys rendered as raw keys; two legacy bugs
  (`region.py` side-effect import, `player.py` module shadowing).

## Contributing

Issues and pull requests are welcome. Start with `docs/ROADMAP.md` and the design document of the
system you want to touch; content is data (YAML and locale JSON) and is validated in CI. The original contribution notes, including translations for the legacy game, are in
`CONTRIBUTING.md`.

## License and credits

Code is GPL-2.0-or-later; game data and text are CC-BY-SA-3.0 or later; see `LICENSE.txt`. The
original game is by Evil Mr Henry, Phil Bordelon and the contributors listed in `AUTHORS.txt` and
`singularity/i18n/AUTHORS.txt`; this fork stands on their work.
