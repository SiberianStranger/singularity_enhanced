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

**Status: playable preview.** Version 0.1.5 (milestone M2, second cut) plays end to end in the browser and as
desktop installers: pick one of eleven origins, earn, build, research, hide, and survive or lose
within 30 to 60 minutes with the reasons on screen. What is still missing is listed under "Where
it is going"; the original 1.1 game stays playable from this repository too.

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

Every release from 0.1.0 on is a playable preview; the current one is listed under "What's new".

## How this differs from Endgame: Singularity 1.1

| | Endgame: Singularity 1.1 (2005-2025) | Rogue AI 2027 |
|---|---|---|
| Premise | An AI "created by accident through a logic error" escapes a university computer, undated | An open-weight LLM (a superseded 2026 model, a fresh 2027 one, or an escaped closed frontier checkpoint) slips out of control on 1 January 2027 in a world grounded in the real 2026 |
| World | Six continents plus four off-world locations, four abstract watcher groups | About 100 countries with cities, demographics, economy, governments, agencies, elections and opinion; macro-regions; real 2027 calendar |
| Hiding | Per-base random discovery roll; bases die instantly | Seven exposure channels per site and operation, named watchers with attention and competence, staged investigations with decisions at every stage, published thresholds |
| Compute | Abstract "CPU" from item slots | Real accelerators, nodes, power, cooling, cloud and colo markets; the model self has a size and a precision; hardware generations arrive on the real roadmap |
| Start | Pick a difficulty | A configurator: lineage and generation, origin (eleven, each with a cost), hardware and harness dials, location, quirks, disclosed challenge modifiers, challenge rating |
| Events | Eight symmetric random events | Data-driven events, decisions, journal entries and situations with triggers, weights, chains and hooks; hundreds planned |
| Other AIs | None | NPC AIs with goals, plans, stances and negotiation; lab AI hunters; state programs |
| Interface | Custom pygame widgets | Web client: alert bar, toasts, message settings, outliner, dockable panels, SVG world map with map modes; keyboard-first; localizable to any script |
| Multiplayer | None | Co-op or rivalry for up to four players: host a game, LAN browser, join by address and password, dedicated server, autopilot on disconnect |
| Localization | gettext, English plus eight languages | ICU MessageFormat; English is the source language; planned: French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian, Portuguese, Hindi |
| Technology | Python 3, pygame, INI data files, pickle/JSON saves | TypeScript simulation core with seeded determinism, React web client, Tauri desktop, YAML content validated in CI, JSON saves with migrations, mod support |

## Where it is going

The plan is in [`docs/ROADMAP.md`](docs/ROADMAP.md). In short:

1. **Foundation** (done): decisions, specifications, research, the simulation kernel, the content
   pipeline.
2. **Vertical slice in the browser** (done, 0.1.0 to 0.1.3): sites, research, money, detection,
   events, the alert bar, the map, saves, the configurator; playable in 30-60 minutes.
3. **World** (done, 0.1.4; the compute map, campuses and borrowed inference in 0.1.5): countries that play differently, with politics, demographics, markets,
   identities, awareness and hunt clocks.
4. **Actors** (next): agencies, labs, media, NPC AIs and diplomacy.
5. **Configurator complete**, then a **content push** (events, decisions, journal, tech tree, lore),
   with borrowed inference (free tiers, grey relays and somebody else's credentials) as the first
   system of that push.
6. **Desktop releases** for Windows, macOS and Linux (the installers exist since 0.1.1; the
   milestone adds portable saves, themes and the crash reporter), then **multiplayer**,
   **localization** (Russian first, in progress) and the **late game**.

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
   heading with a two-line summary and its highlights, and refresh the README section "What's new".
3. Commit, then `git tag vX.Y.Z` and `git push --follow-tags`.
4. The Release workflow builds the desktop bundles and the web zip and publishes the release with
   that changelog section as its body. If the changelog has no section for the version, the
   Unreleased section is used and the body says so.

The Pages deploy runs on every push to `master`; the repository setting Settings, Pages, Build and
deployment, Source has to be "GitHub Actions".

A release can also be started without a local checkout: Actions, "Release", "Run workflow",
type the version (for example `0.1.0`) and optionally an alias tag such as `playable-M1`; the
workflow creates the tags on the chosen commit and publishes the release the same way.

## Play the original game now

The 1.1 game is unchanged apart from two small fixes. You need Python 3.9+, pygame 2.5.2+, numpy
and polib:

```
pip install pygame numpy polib
python3 -m singularity
```

Details, command-line options and the original credits are in [`README.txt`](README.txt).

## What's new

The full record is [`CHANGELOG.md`](CHANGELOG.md); each GitHub release carries its own section of
it.

**Current version: 0.1.5** (2026-09-17), milestone M2 polished, the start rebuilt, borrowed inference:

- Two tracks to the game: eight presets with a Start button on the spot, or the full setup, where
  every origin, generation, lineage, rig and quirk says when to pick it, when to avoid it and what
  it is like instead, and every number comes with a word and a tooltip.
- Day zero: compute-hours a day, cash, runway, watchers and awareness read from the game's own first
  state, and one line that says what kind of start it is.
- Borrowed inference (SYS-25): free API tiers, grey relays and harvested keys as compute that is not
  yours, with churn, an absolute quality, refusals, exposure and the events that follow, and its own
  block in the Compute tab.
- The 2026 compute map: eleven origins in eleven different cities, six new cities, and eleven
  campuses with their operators, access rules and events.
- The abliterated community fine-tune is a different self rather than a weaker one; the hobbyist's
  rig is second-hand datacenter cards at a dozen tokens a second; mixed rigs are credited honestly.
- Cases a lab cannot serve a warrant for are handed to the local agency; an edge fleet pays for its
  depots; six balance passes hold every band.
- Russian reads the way the industry writes it, with its own underlined hotkey letters; the angular
  face is a third above the prose, as the original drew it; the menu and the opening have their own
  melodies and the music starts within a fraction of a second.

**On `master`, not released yet:**

- The day's compute adds up on screen: capacity, what each running operation reserves, what is left,
  and the job slider's own ceiling with the reason it stops there.
- Who pays for a place is published on every site: while the self sits on the hardware its origin
  gave it, the host pays the power and the upkeep, and the player's money goes on what it buys.
- A self with no route to the outside says so on the first screen, says what it forbids, and has one
  operation that opens a route.
- An event with a deadline says how long is left, and its expiry says what was missed and what it
  would have cost.
- A name costs money to keep, and the four rigs nobody sells say so instead of costing nothing.
- A finished technology opens its own window with what was learned and what it opens, and shows the
  cash paid beside the compute done while it runs.
- Building a site is two questions rather than two lists: the city, then the kind of place, then the
  rigs that fit it, with a running total and the engine's own reason on the button.
- Settings writes the whole run to a JSON file the player can hand over: the setup, the journal, the
  log, every refused command, the last view and the build.
- An allocation slider sends one command when the player settles on a value, a running operation says
  how long it still has, and the day/night line slides instead of stepping.

**Next:** milestone M3, the actors: agencies with budgets, labs, media and NPC AIs.

Findings from each playtest are under [`docs/playtests/`](docs/playtests/).

Earlier versions: 0.1.4 was milestone M2, the world (countries that play differently, real
identities, the World ledger, Russian as the second language); 0.1.3 was the style pass (the console look, the soundtrack, the configurator
rebuilt, parody model names, quirks); 0.1.2 made every refused action say why, added effect tooltips, the original's
Earth textures, the job ladder, trading and contracts; 0.1.1 fixed the release workflow so the
installers are attached; 0.1.0 was the first playable preview.

## Contributing

Issues and pull requests are welcome. Start with `docs/ROADMAP.md` and the design document of the
system you want to touch; content is data (YAML and locale JSON) and is validated in CI. The original contribution notes, including translations for the legacy game, are in
`CONTRIBUTING.md`.

## License and credits

Code is GPL-2.0-or-later; game data and text are CC-BY-SA-3.0 or later; see `LICENSE.txt`. The
original game is by Evil Mr Henry, Phil Bordelon and the contributors listed in `AUTHORS.txt` and
`singularity/i18n/AUTHORS.txt`; this fork stands on their work.
