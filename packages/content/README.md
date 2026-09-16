# @singularity/content

Game content: YAML records under `data/`, English source strings under `locales/en/`, zod schemas
under `schemas/`, and a build step that compiles everything into one validated JSON bundle.

## Run

```sh
pnpm content:check      # validate everything, write nothing (the CI gate)
pnpm content:build      # also write build/bundle.json and build/manifest.json
pnpm --filter @singularity/content test
```

The build is `src/build.ts`, run with `tsx`. It reads every `data/<domain>/*.yaml`, validates each
record against its zod schema, merges the locale files, then hands the whole bundle to the core's
static validator (`validateContentBundle`), which checks node kinds against the registries the
shipped systems declare, writable paths, cross-references (`fire_event`, `start_journal`, hook
event ids, journal decisions) and locale keys. Any issue is printed as `file path: message` and the
process exits non-zero.

## Layout

```
data/events/example.yaml       det_billing_anomaly, det_isp_letter, lore_first_contact (+ follow-up)
data/hooks/example.yaml        the daily detection pool with its explicit "nothing happens" bucket
data/decisions/example.yaml    fin_shell_company, sec_rotate_credentials
data/journal/example.yaml      ops_emergency_migration
locales/en/*.json              ICU MessageFormat source strings, keyed by id
schemas/*.ts                   zod schemas for the DSL, events, hooks, decisions, journal, bundle
src/build.ts                   the compiler and CI gate
build/                         generated, gitignored
```

## Type direction

**`@singularity/core` owns the TypeScript types; this package imports them.** The schemas here are
runtime validators that produce `EventDef`, `DecisionDef`, `JournalDef`, `HookDef` and
`ContentBundle` as core declares them. Core has no dependency on this package, so the two never form
a cycle. `test/schemas.test.ts` asserts both directions of assignability, so a field added to a core
type or dropped from a schema fails to compile.

One cast lives in `src/build.ts`: zod infers optional fields as `T | undefined`, which the repo's
`exactOptionalPropertyTypes` setting will not accept as the core type even though the runtime shape
is identical (YAML never produces an explicit `undefined`). The cast is where those two views meet.

## Authoring notes

- Ids are `<domain>_<short_topic>`, lowercase snake_case, stable once released (ADR-002).
- Records carry no prose: every string is a key into `locales/en/*.json`.
- Every event needs an unconditional or `fallback: true` option, so it can never render with zero
  choices; random pools need an explicit `null` bucket.
- Polled events either declare a `pulse` (and an `mtth_days` weight) or are referenced by a hook.
- `FUTURE_WRITABLE_PATHS` in `src/build.ts` lists paths content may write before the owning system
  exists (today: `site.exposure.*`, which SYS-11 will own). Shrink it as systems land.
