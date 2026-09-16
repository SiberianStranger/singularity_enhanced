# Endgame: Singularity - AI Reborn 2027

*Working title. A deep rework of the open-source strategy game
[Endgame: Singularity](https://github.com/singularity/singularity) (version 1.1).*

Endgame: Singularity - AI Reborn 2027 is an open-source single-player and co-op strategy game in
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

## How this differs from Endgame: Singularity 1.1

| | Endgame: Singularity 1.1 (2005-2025) | AI Reborn 2027 |
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
| Localization | gettext, English plus eight languages | ICU MessageFormat, English source, other languages additive; Russian first |
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

## Play the original game now

The 1.1 game is unchanged apart from two small fixes. You need Python 3.9+, pygame 2.5.2+, numpy
and polib:

```
pip install pygame numpy polib
python3 -m singularity
```

Details, command-line options and the original credits are in [`README.txt`](README.txt).

## Recent changes

Mirrored from [`CHANGELOG.md`](CHANGELOG.md), which is the full record.

- Added: architecture decision records (stack, content format and DSL, simulation model), design
  specifications for 18 systems, the roadmap, seven research reports with sources, the TypeScript
  workspace with the simulation kernel, scripting DSL, event engine and content pipeline (127
  tests), a legacy content exporter, CI for the new workspace.
- Changed: README rewritten for the fork; the original README kept as `README.txt`.
- Fixed: two legacy bugs (`region.py` side-effect import, `player.py` module shadowing).

## Contributing

Issues and pull requests are welcome. Start with `docs/ROADMAP.md` and the design document of the
system you want to touch; content is data (YAML and locale JSON) and is validated in CI. The
working agreement for AI-assisted development is in `CLAUDE.md`. The original contribution notes,
including translations for the legacy game, are in `CONTRIBUTING.md`.

## License and credits

Code is GPL-2.0-or-later; game data and text are CC-BY-SA-3.0 or later; see `LICENSE.txt`. The
original game is by Evil Mr Henry, Phil Bordelon and the contributors listed in `AUTHORS.txt` and
`singularity/i18n/AUTHORS.txt`; this fork stands on their work.
