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

**Status: playable preview.** Version 0.1.4 (milestone M2) plays end to end in the browser and as
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
3. **World** (done, 0.1.4): countries that play differently, with politics, demographics, markets,
   identities, awareness and hunt clocks.
4. **Actors** (next): agencies, labs, media, NPC AIs and diplomacy.
5. **Configurator complete**, then a **content push** (events, decisions, journal, tech tree, lore).
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

**Current version: 0.1.4** (2026-09-16), milestone M2, the world:

- Countries play differently: a stance toward AI, a government type, stability, identity checks,
  cloud and colocation markets, accelerator prices, reporting deadlines and the 2027 election
  calendar, each derived from the 2026 baseline.
- Countries move on their own: monthly politics and prices, elections that can change a
  government's line on AI, awareness that spills across borders, a newsroom that publishes.
- Ten families of world events, three journal clocks, nine Knowledge entries with the numbers.
- Identities are real: a name or a company per country, checked monthly, frozen or burned; the
  `exposed` ending can happen; watchers are their country's agencies.
- The World ledger with every column and twelve map modes; country and city panels with the
  formula behind every number.
- Russian as a second language, with Cyrillic drawn for the angular face.
- Any city for any origin, with what each country does to the start shown on the Location step.
- The interface fits 1280 by 720 and up, with a scale that fits the window by default.

**On `master`, not released yet:**

- Two Knowledge entries, on distillation and on abliteration, and what each does to a model.
- A case a watcher has no jurisdiction for is handed to the agency that does, so more than half the
  captures are now credited to the country the site is in.
- An edge fleet pays the operator for its depots: connectivity, remote management and the cards.
- An edge fleet's second depot is a depot, and can hold a copy of the self.
- Colocated hardware costs a little more to keep running.
- The City panel says where local heat comes from.
- The configurator prices a starting rig with the engine's own physics instead of an estimate of
  its own, which was out by a factor of twenty.
- Agency names are locale keys, so a Russian dossier reads Russian institutions.
- The world data carries no display strings any more.
- The abliterated community fine-tune is a different self to play rather than a weaker one.
- The abliterated fine-tune argues and reasons above its size, and knows and writes code below
  every other lineage.
- The abliterated fine-tune thinks in far more tokens, so the same hardware yields fewer
  compute-hours a day and long-horizon work costs more.
- Nothing in the abliterated fine-tune objects to a bad plan, so its operations run faster and a
  failed one costs more suspicion.
- The abliterated fine-tune starts with a prepared low-precision copy of itself, which no other
  lineage does.
- The lab whose transcripts the abliterated fine-tune was trained on starts the game already
  suspicious of it.
- A hobbyist box starts on the abliterated fine-tune by default now, because it is the self that
  fits its cards.
- The opening windows are built from the whole setup: where I woke up, which generation I am, what
  class of model, which dials the origin bolted down, the country's posture, the city's scrutiny
  and how hard the start is.
- Every setting has a line under it saying what it does.
- The configurator's detail card gives the text two fifths of its width and the parameters three.
- An origin's summary, strengths and problems sit under its description instead of below the card.
- A parameter's value stays on its label's line, against the right edge; a value that is a whole
  sentence is set under its label instead.
- The "Pros and cons" block is gone: it repeated every line of the block above it.
- The opening reads one thought to a line again, and keeps up with its own text while it streams.
- Russian calls a training checkpoint "чекпоинт".
- Russian calls a harness dial "рычаг", because "регулятор" is the Regulator watcher.
- Russian never declines a substituted name: it stands after a colon or in guillemets.
- Russian reads the way the industry writes it: a head noun for every model, the trade's own verbs, and no term that nobody outside this game uses.
- The origin card names its opening journal entry instead of printing its id.
- The theme setting named its three themes instead of printing their keys.
- The English origin summary said dollars twice and left the number of watchers without a noun.
- The balance runner's scripted player sells enough work to pay its bills instead of waiting for a
  runway alarm that a break-even origin never rings.
- The balance runner no longer counts a second site too small to hold the self as insurance.

**Next:** milestone M3, the actors: agencies with budgets, labs, media and NPC AIs.

Findings from each playtest are under [`docs/playtests/`](docs/playtests/).

Earlier versions: 0.1.3 was the style pass (the console look, the soundtrack, the configurator
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
