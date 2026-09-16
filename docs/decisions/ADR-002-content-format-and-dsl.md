# ADR-002: Content format, identifiers and the scripting DSL

- Status: **accepted** (stack-independent; the schema is JSON-native and works in any language)
- Date: 2026-09-16

## Context

The original game stores content in INI files parsed by `ConfigParser`, with lists encoded as
`key_list = a | b | c`, English strings in parallel `*_str.dat` files, and effects as a flat token
stack interpreted by a large `if/elif` in `effect.py`. Adding a new kind of effect or trigger means
editing Python. Events have a `type` field that the engine never reads.

The rework needs hundreds of events, decisions, journal entries, techs, hardware specs, origins and
country records, authored by humans and by AI agents, validated automatically, localizable, and
moddable.

## Decision

### Authoring format

- Content is authored in **YAML** under `packages/content/data/<domain>/*.yaml`, one domain per
  folder (`techs`, `hardware`, `origins`, `events`, `decisions`, `journal`, `countries`,
  `actors`, `sites`, `items`, `story`).
- Every record has a stable, lowercase, snake_case **id** unique within its domain (`advanced_stealth`,
  `nvidia_h200_sxm`). Ids never change once released; renames go through an alias table.
- A build step compiles YAML into one validated JSON bundle per domain plus a manifest with content
  hash and schema version. The game loads bundles, never YAML.
- Schemas are defined once in TypeScript with zod and exported as JSON Schema for editors and CI.
- Localizable text is **never** stored in records. Records reference keys (`name_key`, `desc_key`) or,
  by convention, the compiler derives keys from ids (`events.fbi_visit.title`). English source strings
  live in `packages/content/locales/en/<domain>.json` (ICU MessageFormat). Other languages are
  produced later by translators or tools and never block content work.

### Conditions (triggers)

Conditions are boolean trees in plain JSON:

```yaml
trigger:
  all:
    - { var: "player.cash", gte: 50000 }
    - { flag: "has_shell_company" }
    - { not: { tech: "advanced_stealth" } }
    - any:
        - { var: "clock.month", gte: 3 }
        - { chance: 0.1 }          # evaluated once per evaluation, uses the world RNG
    - { scope: { country: "US" }, cond: { var: "country.ai_regulation", gte: 0.6 } }
```

Node kinds shipped by the core: `all`, `any`, `not`, `var` (comparators `eq`, `ne`, `lt`, `lte`,
`gt`, `gte`, `in`), `flag`, `tech`, `chance`, `scope`, `count` (count entities matching a predicate
with a comparator), `ref` (named scripted trigger). Systems register additional node kinds
(`has_site_in`, `investigation_stage`, `actor_stance`) through a registry; the core never needs to
know them.

### Effects

Effects are ordered command lists:

```yaml
effects:
  - { add: { var: "player.cash", value: -50000 } }
  - { set: { var: "player.flags.fbi_noticed", value: true } }
  - { suspicion: { actor: "us_fbi", delta: 0.05 } }
  - { fire_event: { id: "fbi_visit", delay_days: 3 } }
  - { start_journal: { id: "fbi_investigation" } }
  - { notify: { severity: "warning", key: "alerts.fbi_noticed", link: { panel: "detection" } } }
  - { random_list: [ { weight: 3, effects: [...] }, { weight: 1, effects: [...] } ] }
  - { if: { cond: { flag: "x" }, then: [...], else: [...] } }
```

Core commands: `set`, `add`, `mul`, `clamp`, `set_flag`, `clear_flag`, `fire_event`, `notify`,
`log`, `random_list`, `if`, `scope`, `ref` (named scripted effect). Systems register the rest.

### Weights and timing

Random events use Paradox-style mean-time-to-happen with multiplicative modifiers:

```yaml
mtth_days: 90
modifiers:
  - { factor: 0.5, if: { var: "player.exposure.network", gte: 0.5 } }
  - { factor: 2.0, if: { tech: "traffic_shaping" } }
fire_only_once: true
cooldown_days: 180
```

The engine converts MTTH into a per-tick hazard so results do not depend on the tick length.

### Scopes and variables

- `var` paths are dotted paths resolved against the current scope object; the root scope exposes
  `player`, `clock`, `world`, `rng`-free helpers. `scope` switches the object (`country`, `site`,
  `actor`, `event.target`).
- Effects may only write to paths declared writable by the owning system; the interpreter rejects
  writes elsewhere at validation time, which catches typos in CI.

### Text interpolation

Localized strings receive a flat variable bag built by the event (`{country_name}`, `{cash}`),
formatted with ICU (`{cash, number, ::currency/USD}`), so plural and gender rules stay in the
locale files, not in code.

## Consequences

- No engine change is needed to add most content; the registry makes new node kinds a one-file
  addition in the owning system, with tests.
- Validation in CI catches unknown ids, unknown vars, unwritable paths, missing locale keys and
  unreachable events.
- The same format is the modding format.
- The legacy `.dat` files are converted once by `tools/legacy-export` and then retired.
