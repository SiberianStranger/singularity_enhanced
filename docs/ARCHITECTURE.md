# Architecture

This document is the map of the rework. Decisions with alternatives are recorded in `docs/decisions/`;
game systems are specified in `docs/design/`; the phased plan is `docs/ROADMAP.md`.

## Repository layout (target)

```
.
├── packages/
│   ├── core/            # simulation kernel + systems, no DOM, no I/O, N players
│   ├── content/         # YAML content, zod schemas, compiled bundles, locales
│   ├── ui/              # React + Vite client (browser build)
│   ├── net/             # session protocol, client transport, view diffing (M7)
│   ├── server/          # dedicated multiplayer host on Node (M7)
│   └── desktop/         # Tauri 2 shell (+ WebSocket host command, LAN announce) (M6/M7)
├── tools/
│   ├── legacy-export/   # converts legacy .dat content to JSON (one-off, Python)
│   ├── content-check/   # validates bundles, ids, locale keys, DSL paths
│   ├── i18n/            # extraction and locale status
│   └── sim/             # headless balance runs
├── legacy/              # frozen original Python game (until parity)  [currently still at ./singularity]
├── docs/
└── .github/workflows/
```

## Core kernel (`packages/core`)

```
src/
  kernel/
    clock.ts        # UTC calendar, tick math, cadence hooks
    rng.ts          # xoshiro128**, seeded, serializable state
    world.ts        # World type, createWorld(setup), entity tables, players
    system.ts       # System interface, SystemManifest, run order
    commands.ts     # PlayerCommand union (with playerId), command dispatcher
    outbox.ts       # notifications, pending choices, log entries emitted during a tick
    save.ts         # serialize/deserialize, schemaVersion, migrations
  dsl/
    conditions.ts   # boolean tree evaluator + registry
    effects.ts      # command list executor + registry
    paths.ts        # dotted-path get/set with writable-path whitelist
    mtth.ts         # mean-time-to-happen → per-tick hazard
    validate.ts     # static validation of trees against registries and schemas
  systems/
    time/           # cadence hooks, speed
    compute/        # hardware, sites, clusters, model self, throughput, power, cost
    research/       # tech tree, research allocation, progress
    economy/        # player cash flows, identities, compute market, world economy
    detection/      # exposure channels, watcher attention, suspicion, investigations
    politics/       # countries, governments, agencies, regulation, elections, opinion
    demography/     # population cohorts per country/macro-region
    actors/         # NPC AIs and institutions: goals, plans, stances, autopilot
    events/         # event engine: triggers, MTTH, chains, choices, decisions, journal
    notifications/  # alert rules → per-player outbox
  views/            # snapshot(playerId) selectors: per-player, hidden info filtered
  index.ts          # createGame(seed, setup, content) → { tick, command, snapshot }
```

Rules:

- Systems never import each other. They share state through `World` and communicate through the
  DSL registries and the in-tick message queue.
- Every system exports `manifest: { id, cadence, order, writes: string[], conditions?, effects?,
  migrations? }`.
- Every system has unit tests and at least one headless scenario test.
- Nothing in the core assumes one player. "The player" in a system means "the player in scope".

## Content (`packages/content`)

```
data/
  techs/*.yaml          hardware/*.yaml     origins/*.yaml     harness/*.yaml
  events/*.yaml         decisions/*.yaml    journal/*.yaml     countries/*.yaml
  actors/*.yaml         sites/*.yaml        items/*.yaml       story/*.yaml   knowledge/*.yaml
schemas/*.ts            # zod schemas, exported to JSON Schema for editors
locales/en/*.json       # ICU MessageFormat source strings
build/                  # compiled bundles (gitignored), produced by `pnpm content:build`
```

`content:build` validates every record, resolves cross-references, checks locale keys, runs DSL
static validation, and writes `build/bundle.json` plus `build/manifest.json` (content hash,
schema version). `content:check` is the CI gate. Mods use the same layout (SYS-15).

## UI (`packages/ui`)

- React 19, Vite, TypeScript strict, Tailwind 4 with CSS variables for theme tokens (light/dark and
  the original's "vector"/"nightmode" feel as presets).
- State: the latest host snapshot for the local player in a store (zustand); UI-only state (open
  panels, filters, message settings) in a separate store persisted to localStorage / Tauri app data.
- Layout (Paradox-like, SYS-11): top alert bar, dockable panels, map in the center, outliner,
  modal event windows, toast stack, lobby screens for multiplayer.
- Map: SVG built from `world-atlas` 110m topojson; countries as paths with map modes; cities/sites
  as markers; zoom/pan; tooltips; day/night terminator.
- Localization: i18next + ICU, English fallback, runtime switch, RTL-ready CSS (SYS-14).
- The UI talks to a `GameHost` interface with two implementations: `WorkerHost` (local) and
  `RemoteHost` (network, from `packages/net`). Everything above that line is identical in single
  and multiplayer.

## Multiplayer (`packages/net`, `packages/server`, desktop host)

Host-authoritative; clients receive per-player views; JSON messages validated with zod; LAN
discovery by UDP announce; direct join by address + password; dedicated server on Node runs the same
core. See SYS-16.

## Desktop (`packages/desktop`)

Tauri 2 wrapping the built web client. Saves in the OS app-data directory; a "portable" flag keeps
them next to the executable (the original's `--singledir`). Provides the WebSocket host and LAN
announce commands for multiplayer. Release workflow builds Windows (msi/exe), macOS (dmg,
universal), Linux (AppImage, deb).

## Data flow per tick

```
UI command(playerId) ─► host.command(cmd) ─► dispatcher validates authority & applies
                                      │
   clock.tick() ── cadence hooks ─► systems in manifest order:
     time → compute → research → economy → demography → politics → actors → detection → events → notifications
                                      │
                             per-player outbox ─► views.snapshot(playerId) (≤20 Hz) ─► UI store ─► React
```

Blocking choices pause the clock (per session pause rules) until answered. Everything else flows
through alerts.

## Quality gates

- `pnpm check`: Biome lint/format, `tsc --noEmit` per package, vitest, content:check.
- CI matrix: Node 22 on ubuntu/windows/macos for tests; web build artifact on every push;
  Tauri builds on tags.
- Balance runs (`tools/sim`) publish outcome distributions as a CI artifact on PRs touching content.
- Security review before releases: network boundary (zod at every ingress, no eval, rate limits),
  save loading (untrusted JSON), mods (untrusted content), dependency audit.
