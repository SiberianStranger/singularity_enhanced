# ADR-003: Simulation model, time, determinism, players and the UI boundary

- Status: **accepted** (stack-independent)
- Date: 2026-09-16 (amended the same day for multiplayer)

## Time

- Base tick: **1 game hour**. A day is 24 ticks. The original used seconds, which only mattered for
  animating the clock; hours are enough for compute/research accrual and keep event hazards cheap.
- Cadences: systems subscribe to `hourly`, `daily` (00:00), `weekly` (Monday 00:00), `monthly`
  (1st 00:00) and `yearly` hooks. Economy and demographics run daily/weekly/monthly; compute,
  research and detection run hourly; NPC AI planning runs daily.
- Calendar: real Gregorian dates via a small UTC calendar (no Date objects in the core). Default
  start: **2027-01-01 00:00 UTC**; the configurator may offer other start dates later.
- Speeds: 0 (paused), 1 (1 game hour per real second), 2 (6/s), 3 (24/s), 4 (168/s), 5 (uncapped,
  max N ticks per frame). Speed changes never change outcomes.

## Determinism

- One seeded PRNG (`xoshiro128**`) lives in the world state; every random draw in the core goes
  through it. No `Math.random`, no wall-clock time, no iteration over unordered structures where
  order affects results (maps are iterated in insertion order and inserted deterministically).
- Same seed + same inputs (player commands with tick stamps) = same world. This enables replays,
  bug reports as command logs, balance simulations and property tests.
- Player commands are the only external input: `{ tick, playerId, type, payload }`. The UI sends
  commands; it never mutates the world.

## Players and actors

- A world holds **1 to 4 players** from the start (`world.players`, deterministic order). Each
  player controls one AI actor; NPC AIs are the same kind of actor with an NPC controller. A
  human's actor can fall back to the NPC controller (autopilot) when the human is absent.
- Everything "per player" (pending choices, notifications, decisions, cooldowns, suspicion toward
  them) is keyed by player id. Global things (clock, countries, market, awareness) are shared.
- `snapshot(playerId)` builds the view for one player and filters hidden information about other
  players. This is what makes multiplayer host-authoritative and cheat-resistant (SYS-16).
- Speed is set by the host player; pause rules are a session setting.

## State

- `World` is a plain serializable object: `{ meta, clock, rng, players, countries, cities, sites,
  hardware, techs, actors, events, journal, notifications, flags, log }`. Entities live in id-keyed
  records, never in nested trees, so references are ids and saves are stable.
- Systems are pure-ish functions `tick(world, ctx)` with a cadence, ordered explicitly in a manifest.
  A system owns the paths it writes; other systems read them or issue commands through the effect
  registry. Cross-system communication goes through the effect/condition registries and an
  in-tick message queue, not direct imports.
- Save = JSON of `World` with `schemaVersion`; a migration chain upgrades older saves. Saves are
  gzip-compressed on disk; autosave and quicksave keep the original game's conventions.

## UI boundary

- The core runs in a **Web Worker** (browser and Tauri), in a Node process (dedicated multiplayer
  server, tests, headless balance runs), and behind the network for remote clients. The protocol is
  the same everywhere: `init(seed, setup)`, `command(cmd)`, `setSpeed(n)`, `subscribe(playerId)`.
- The host emits at most 20 snapshots per second per player regardless of speed; each snapshot
  contains the tick, the outbox for that player (notifications, fired events awaiting choice, log
  entries since last snapshot) and a **view model** built by selectors on the host side, so the UI
  never walks the whole world and never receives hidden state.
- A blocking event (one that pauses and needs a choice) stops the clock until a `command` answers it
  (subject to the multiplayer pause setting); a non-blocking one goes to the alert bar. Message
  settings (popup / pause / toast / log / ignore) live in the UI layer and are applied to the outbox
  before rendering.

## Balance and testing

- `tools/sim` runs headless games with scripted policies over many seeds and reports outcome
  distributions (survival time, cause of loss, resource curves). Balance changes are checked
  against these before merging.
- Property tests: invariants such as "resources never NaN", "suspicion within [0,1]", "save/load
  round-trips to identical world", "a player's snapshot never contains another player's hidden
  fields".
