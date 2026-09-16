# ADR-001: Technology stack for the rework

- Status: **proposed** (awaiting maintainer confirmation)
- Date: 2026-09-16
- Deciders: project maintainer, Claude (architecture)

## Context

The fork starts from Endgame: Singularity 1.1.1 (Python 3.9+, pygame 2, numpy, polib; ~18.8k lines).
The target game is much larger than the original:

- countries, macro-regions and cities as simulated entities with demographics, economy and politics;
- institutions, agencies and NPC AIs as actors with goals;
- a data-driven event and decision system comparable to Paradox script;
- a Paradox-style alert bar, toasts, message settings and an outliner;
- a start configurator (origin, hardware, harness, location) with real tradeoffs;
- first-class localization (English source, many target languages);
- reliable builds for Windows, macOS and Linux, and ideally a browser build.

Of the existing code, the simulation core (`player.py`, `base.py`, `buyable.py`, `location.py`, `group.py`,
`effect.py`, `event.py`) is about 3k lines and would be rewritten almost entirely by the new world model.
The UI (`code/graphics/*`, `code/screens/*`, about 7k lines) is a bespoke pygame widget toolkit with
manual dirty flags, no layout engine, no rich text, and SDL_ttf text rendering without complex-script
shaping. The remaining code is savegame legacy converters, options screens and i18n plumbing.

So the real question is not "refactor or rewrite the Python" but "which stack gives the best UI, i18n,
distribution and agent productivity for a panel-heavy, text-heavy, map-based strategy game".

## Options considered

### A. Stay on Python + pygame, restructure

- Pro: existing code, fast iteration, numpy for vectors, maintainer can read it.
- Con: the UI toolkit would have to be rewritten anyway; no browser build (pygbag is fragile);
  macOS packaging is weak (the upstream README already calls macOS "mostly unsupported");
  pygame text rendering has no shaping for Arabic/Devanagari/Thai; no accessibility;
  every rich-text/tooltip/table widget is custom work.

### B. Python core + web UI (pywebview or local server)

- Pro: keeps Python core, HTML/CSS UI.
- Con: two languages and a bridge; distribution depends on platform webviews (WebKitGTK on Linux is
  the usual pain point); no browser build without Pyodide (slow start, large bundle); state sync across
  the bridge at game speeds needs careful engineering that buys nothing over option C.

### C. TypeScript monorepo: core + web UI + Tauri desktop shell

- Pro: HTML/CSS is the most productive technology for panel/text-heavy UI, with tooltips, tables,
  virtual lists, rich text, fonts and shaping for every script, accessibility and theming for free;
  ICU MessageFormat localization; one language for core, UI, tools and content validation; strict
  typing; vitest; deterministic sim in a Web Worker; JSON saves natively; a browser build deploys to
  GitHub Pages or itch.io for zero-install play; Tauri 2 produces 10-20 MB native builds for
  Windows/macOS/Linux (and mobile later) from the same code; large ecosystem; AI coding agents are
  most productive in TS/HTML.
- Con: full rewrite; Rust toolchain needed to build the desktop shell (CI handles it); a JS sim is
  slower than Rust, but the workload (hourly ticks over ~100-200 countries with vectorized state) is
  far below the ceiling; hot loops can move to Rust/WASM later if ever needed.

### D. Godot 4 (GDScript or C#)

- Pro: real game engine, built-in UI/theming/localization, exports to all platforms.
- Con: C# web export is still immature; GDScript is weak for a large typed simulation; table/text UI
  iteration is slower than HTML; smaller ecosystem for the things this game needs most (rich text,
  tables, i18n tooling); AI agents are less reliable in it. Sensible only if the presentation were
  animation- or 3D-heavy, which it is not.

### E. Rust core + native UI

- Rejected: the UI ecosystem (egui, iced, Bevy UI) is not there for this kind of UI, and it would
  slow content iteration dramatically.

## Decision

**Option C.** TypeScript monorepo (pnpm workspaces):

| Package | Purpose |
|---|---|
| `packages/core` | Pure simulation: world state, clock, seeded RNG, systems, condition/effect DSL interpreter, event engine, notifications outbox, save/load with migrations. No DOM. Runs in Node (tests, headless sims) and in a Web Worker. |
| `packages/content` | Game data authored in YAML, compiled and validated with zod into JSON bundles; localization source strings extracted to ICU JSON; legacy importer for the original `.dat` content. |
| `packages/ui` | React 19 + Vite web client. Map (SVG, Natural Earth), panels, alert bar, event windows, configurator. Talks to the core through a worker protocol. |
| `packages/desktop` | Tauri 2 shell wrapping the web client; native saves directory; auto-update later. |
| `tools/` | Content validation CLI, i18n extraction, balance simulators, legacy exporter. |
| `legacy/` | The original Python game, frozen, kept playable and as a reference until the new build reaches parity, then removed. |

Supporting choices: TypeScript strict; Biome for lint/format; vitest; zod v4 for schemas; `yaml` for
authoring; i18next + ICU for runtime localization with English as the source language; Tailwind 4 +
CSS variables for theming; `world-atlas` topojson for the map; seeded xoshiro PRNG; JSON saves with a
schema version and migration chain.

## Consequences

- The Python codebase stops receiving features. Only crash fixes go into `legacy/` until parity.
- Existing content (techs, items, bases, story, knowledge) is imported by a tool, not hand-copied.
- Save compatibility with the original is intentionally dropped (this is a new game).
- The game becomes playable in a browser, which is the cheapest possible distribution for an
  open-source project and the easiest way to get playtesters.
- Modding falls out of the data-driven design: content packs are folders of YAML.
- CI builds: web bundle on every push; Tauri binaries for three platforms on tags.

## Licensing

Code stays GPL-2.0-or-later (matching upstream); data and text stay CC-BY-SA-3.0 or later.
New third-party assets must be compatible (CC0/CC-BY/CC-BY-SA, OFL for fonts).
