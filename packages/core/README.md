# @singularity/core

The simulation kernel: world state, clock, seeded RNG, the condition/effect DSL, the event engine
and save/load. No DOM, no filesystem, no `Date`, no `Math.random` — everything it needs comes from
the `World` it is given. It runs in a Web Worker, in Node tests and in headless balance runs.

## Run

```sh
pnpm --filter @singularity/core test        # vitest
pnpm --filter @singularity/core typecheck   # tsc --noEmit
```

## Use

```ts
import { createGame } from "@singularity/core";

const game = createGame({ seed: "demo", content, players: [{ id: "p1", cash: 1000 }] });
game.tick(24);                                        // one game day, one hour per tick
game.command({ type: "set_speed", playerId: "p1", speed: 3 });
const view = game.snapshot("p1");                     // per-player view model
```

`createGame` returns `{ world, tick(n), command(cmd), snapshot(playerId) }`; `loadGame({ save,
content, migrations })` rebuilds a game around a saved world, and `runHeadless(game, ticks, policy)`
drives one from a script (see `autoResolvePolicy`).

## Module map

```
src/
  kernel/
    clock.ts     UTC calendar math (days-from-civil), ticks, cadence boundaries
    rng.ts       xoshiro128** seeded from a number or string, state lives in the world
    world.ts     World type, createWorld, players, entity tables, per-player keys
    system.ts    System/SystemManifest, cadence dispatch, runTick
    commands.ts  PlayerCommand union, dispatcher, registry for system-owned commands
    outbox.ts    per-tick notify/log/pendingChoice collector
    save.ts      stable-order serialize, deserialize, migration chain
    assert.ts    assertNever
  dsl/
    types.ts     Condition/Effect node types, registries, DslContext, hooks
    node.ts      checked readers for untyped content nodes
    context.ts   scope environments, DslContext factory, default hooks
    paths.ts     dotted get/set with the writable-path whitelist
    conditions.ts condition evaluator + registry
    effects.ts   effect executor + registry
    weight.ts    the shared weight DSL ({ base, modifiers })
    mtth.ts      mean-time-to-happen -> per-evaluation hazard
    validate.ts  static validation of trees and whole bundles
  systems/
    time/        speeds, ticksForFrame, year log
    events/      hooks, events, decisions, journal entries (SYS-10 v0.1)
    notifications/ notify messages -> persisted per-player alerts
  content.ts     content record types (EventDef, DecisionDef, JournalDef, HookDef, ContentBundle)
  index.ts       createGame / loadGame / runHeadless and the public re-exports
```

## Type-dependency direction

**Core owns the content types; `@singularity/content` imports them.** `src/content.ts` declares
`EventDef`, `DecisionDef`, `JournalDef`, `HookDef` and `ContentBundle`, and `src/dsl/types.ts`
declares `Condition`, `Effect` and `Weight`. The content package writes zod schemas that produce
exactly those shapes and depends on `@singularity/core`; core never imports content, so there is no
cycle and the engine can be used with any bundle that satisfies the types.

Condition and effect nodes are typed as open records (`Readonly<Record<string, unknown>>`): a node
is "one kind key plus arguments" and systems register new kinds at runtime, so a closed TypeScript
union would be wrong. Every field access goes through the checked readers in `dsl/node.ts`, and
`dsl/validate.ts` is what turns a bad node into a CI error.

## Rules the code follows

- Systems never import each other; they share `World` and talk through the registries and the outbox.
- Every random draw goes through `world.rng`; objects are iterated in sorted key order.
- The DSL never throws during a tick: a bad condition evaluates to `false` and a bad effect is
  skipped, both logged through the outbox, so content problems degrade one line instead of a run.
- Anything per player is keyed by player id (`players`, `notifications`, `events.cooldowns`,
  `journal.active`, `decisions.*`); a world holds one to four players (ADR-003).
