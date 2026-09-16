# Changelog

All notable changes to this fork are recorded here, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The history of the original game up to
1.1.1 is in `Changelog.txt`.

The "Unreleased" section is mirrored in the README under "Recent changes"; when a version is cut,
its highlights move to a dated heading here and the README excerpt is refreshed.

## [Unreleased]

### Added
- Architecture decision records: ADR-001 technology stack (TypeScript core, React web client,
  Tauri desktop; legacy Python frozen until parity), ADR-002 content format and scripting DSL,
  ADR-003 simulation model (hourly ticks, seeded determinism, 1-4 players with per-player views).
- Design specifications for 18 game systems (`docs/design/`): vision, world model, compute and
  hardware, player model and harness, start configurator (lineages, generation axis, ten origins
  and the starred frontier escapee), detection and investigations, NPC AIs and actors, economy,
  politics and institutions, demographics, events/decisions/journal/hooks, notifications and UI,
  research and tech, lore bible, localization, saves and mods, multiplayer (co-op up to 4),
  operations and intel, plus a mechanics backlog distilled from research.
- Benchmark scenario 01 (state capture from the inside) with the mechanics it requires, and new
  system specifications SYS-18 institutions and influence, SYS-19 governance mode, SYS-20
  industry and automation, SYS-21 copies and continuity; foreign AI relations added to SYS-06.
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

### Changed
- Title decided: "Endgame: Singularity - Rogue AI 2027"; planned target languages listed
  (English source; French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian,
  Portuguese, Hindi).
- README rewritten for the fork: what differs from 1.1, where the project goes, changelog excerpt.
  The original README is kept as `README.txt` for the legacy game.

### Fixed
- `singularity/code/region.py` imported `g` through a side effect of the package `__init__`.
- `singularity/code/player.py` loop variables shadowed the `task` and `tech` modules.

## Original game

See `Changelog.txt` for Endgame: Singularity 1.1.1 and earlier.
