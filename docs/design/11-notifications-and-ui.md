# SYS-11: Notifications, alerts and the UI shell

Status: v0. Paradox conventions adapted to a single-screen web client.

## Alert taxonomy

| class | example | default behavior | player setting |
|---|---|---|---|
| **blocking event** | investigation reaches "active", NPC AI proposes a deal | pause, modal window with options | popup+pause / popup / toast+log / log |
| **critical alert** | runway < 7 days, site power cap tripped, seizure imminent | red icon in the alert bar, toast, sound | same |
| **warning** | exposure crossed 0.5, identity check pending | yellow icon, toast | same |
| **info** | research done, delivery arrived, weekly finance report | grey icon, log | same |
| **opportunity** | cheap GPUs listed, grant window, ally's offer | green icon with expiry countdown | same |

Every notification: `{ id, playerId, tick, severity, key, vars, link, read, expiresTick?, group? }`.
`link` opens the relevant panel/entity (`{ panel: "detection", entity: "site:abc" }`). Groups
collapse repeated alerts of the same key into one icon with a count.

### Alert types (content) and message settings (per player)

Channel, severity and pausability are three independent axes (`research/design-references.md` §1),
so one alert type can be a toast *and* an icon, and only some types may ever pause the game.

```ts
interface AlertTypeDef {
  id: string;                          // stable key; effects `notify` reference it
  category: "security" | "finance" | "compute" | "research" | "world" | "actors" | "story" | "system";
  severity: "info" | "warning" | "critical" | "opportunity";
  default_channels: ("popup" | "toast" | "icon" | "log")[];
  pausable: boolean;                   // may request auto-pause (only if the player allows it for this type)
  navigable: boolean;                  // click opens `link`
  grouping_key?: string;               // identical keys stack into "×N"
  ttl_days?: number;                   // expiry is the default, not the exception
  on_expire?: Effect[];                // an ignored alert still does something (usually the fallback)
  log_channel: string;                 // which permanent log tab records it
  subject_scope?: "country" | "site" | "actor";   // enables per-subject filtering
}

interface MessageSetting {             // one row per (player, alert type); persisted in UI settings
  alertType: string;
  mode: "popup_and_pause" | "popup" | "toast" | "icon_only" | "log_only";
  subjects?: "all" | "countries_of_interest" | "my_sites_only";
}
```

- A coarse global preset ("quiet", "default", "verbose") prefills the per-type rows; the player
  never has to touch forty checkboxes, but can.
- A settings cog sits on every toast and event window, so "stop telling me this" is one click
  in context.
- Per-subject filtering exists from day one: at 100+ countries, "only alert me about countries I
  am active in" is mandatory, not a later feature.
- `hidden` events (SYS-10) are hidden in all four channels.
- Exactly one hard-blocking tier exists (blocking events); nothing else stops time except the
  player's own pause rules.

## Alert bar (top)

Left to right: date and speed controls (0-5, keys 0-5, space = pause), cash and runway, compute
hours/day and utilization, hunt level and global awareness (two small gauges), then the **alert
icons** ordered by severity then recency, then a bell that opens the notification list. Hovering an
icon shows the message and the reason (contributing modifiers); clicking follows the link. Icons
auto-expire by rule (opportunities at expiry, info after 3 days, warnings when the condition clears,
criticals never until resolved or dismissed).

## Toasts and event windows

- Toasts stack bottom-right, 5 s, click to follow the link, hover to pause the timer. At speed ≥ 4
  toasts are batched into one "N new" toast.
- Event windows (blocking) show title, image slot, description with interpolated vars, options with
  tooltips of effects (auto-generated from the effect list, writer override possible), and a
  "why did this happen" expander listing the modifiers that fired. Multiple pending events queue with
  a counter. Escape does nothing on blocking events; Enter selects the highlighted option.
- The **message settings** panel lists every notification key group with the four behaviors; it is
  per player and persisted in UI settings, not in saves.

## Outliner (bottom-left, collapsible)

Live lists with jump links: sites (status, exposure max channel), active operations with progress,
research queue, journal entries with progress bars, investigations against you (stage, ETA),
identities under check, players in multiplayer. Filters by macro-region.

## Layout (Paradox conventions, adapted)

The screen has fixed regions, like Stellaris, EU4/EU5, Victoria 3, CK3 and HOI4, so the player always
knows where things are:

```
┌──────────────────────────── top bar: date, speed, resources, gauges, alert icons, bell ───────┐
│┌── primary panel (pinned top-left) ──┐                                          ┌ outliner ┐ │
││ tabs: Overview | Compute | Research  │              map (center)               │ sites    │ │
││       Finances | Detection | Ops     │        map modes, city markers,          │ ops      │ │
││       Government* | Industry* | ...  │        zones, routes, selection           │ journal  │ │
││ [actions] [indicators] [tables]      │                                          │ invest.  │ │
│└──────────────────────────────────────┘                                          └──────────┘ │
│┌── selection panel (bottom-left) ─────┐                                                       │
││ what was clicked on the map:          │           toasts (bottom-right)                       │
││ country | region | city | site | zone │                                                       │
││ own vs foreign content; tabs; actions │                                                       │
│└───────────────────────────────────────┘                                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Primary panel (top-left, pinned).** One panel at a time, chosen by hotkey or by clicking a top
  bar element (cash opens Finances, the hunt gauge opens Detection). Every primary panel has tabs,
  a header row of indicators (bars, gauges, trend arrows with tooltips that show the formula and the
  contributing modifiers, Paradox-style), action buttons with requirement tooltips (greyed with the
  reason when blocked), and sortable tables. Panels that unlock later appear as tabs when their
  system activates: Government, Institutions, Copies, Industry, Corporation (marked * above).
- **Selection panel (bottom-left).** Whatever the player clicked on the map: a country, a region or
  agglomeration, a city, one of the player's sites or compute complexes, a factory, a machine zone,
  a route or chokepoint, another actor's known facility. It shows different tabs depending on
  ownership and knowledge:
  - **own** (a site, a zone, a controlled country or corporation): full data, controls and
    actions (build, allocate, set policy, issue instrument);
  - **foreign, known**: intel-gated facts (what watchers, what capacity, what stance), the actions
    the player can take toward it (operations, offers), and the history of interactions;
  - **foreign, unknown**: baseline public data only (from content) and "learn more" operations.
  Tabs for a country: Overview, Politics, Institutions, Economy, Industry, Compute, Watchers, History;
  for a city/agglomeration: Overview, Sites, Providers, Power, Scrutiny; for a site: Nodes, Copy,
  Exposure, Costs, Jobs; for a zone or factory: Output, Inputs, Machines, Humans, Dependencies.
- **Outliner (right).** Live lists with jump links (sites, operations, research queue, journal,
  investigations, players), filters by macro-region, collapsible.
- **Map center.** Map modes are chosen from a strip under the top bar; the selection panel and the
  primary panel react to clicks; double-click centers; right-click opens the context actions for the
  clicked thing.
- **Governance and corporate views** reuse the same regions: the Government panel is a primary panel
  with tabs (Instruments, Projects, Towers, Verification, Personnel, Budget, War); clicking a region
  on the map in a controlled country shows execution nodes and the distortion map in the selection
  panel; a controlled corporation's facilities are map markers with their own selection tabs.

## Panels

Compute & Sites, Research, Finances, Detection & Investigations, World (countries table, map modes,
treaties), Country, City, Actors (agencies, labs, media, NPC AIs, players), Journal, Decisions,
Log (filterable by kind and player), Knowledge (the original's in-game encyclopedia, expanded), Settings,
Start configurator, Multiplayer lobby. Panels are dockable windows with remembered positions;
at phone widths they become full-screen tabs.

## Map

SVG countries, map modes, city markers with site badges, zoom/pan, day/night terminator (the
original's feature, kept), tooltips. Selecting anything updates the right-hand context panel.

## Keyboard

Every panel has a hotkey (`R` research, `C` compute, `D` detection, `W` world, `A` actors,
`J` journal, `L` log, `K` knowledge, `F5/F9` quicksave/quickload, `Esc` menu), and the original's
underlined-letter convention for buttons inside dialogs where it does not clash.

## Accessibility and localization

All texts through ICU keys; RTL layouts supported by logical CSS properties; reduced motion respected;
minimum 4.5:1 contrast in both themes; screen-reader labels on icons.

## Implementation notes (client)

What the M1 web client (`packages/ui`) does differently from the document above, and the numbers it
settled on. Everything not listed here is implemented as written.

### Game speeds

ADR-003 sketched 1 / 6 / 24 / 168 game hours per real second with an uncapped speed 5. An M1 run
lasts on the order of half a game year, so at 168 hours a second a whole run goes past in half a
minute and nothing is legible. The shipped ladder is:

| speed | game hours per real second | one game day takes | a 180-day run takes |
|---|---|---|---|
| 0 | paused | - | - |
| 1 | 1 | 24 s | 72 min |
| 2 | 2 | 12 s | 36 min |
| 3 | 4 | 6 s | 18 min |
| 4 | 8 | 3 s | 9 min |
| 5 | 24 | 1 s | 3 min |

Speed 1 is the reading speed ADR-003 already fixed; speed 5 is one game day per real second. A run
played attentively, pausing on events and fast-forwarding through quiet weeks, lands inside the
30-60 minutes the M1 definition of done asks for. The table lives in
`packages/core/src/systems/time/index.ts` (`SPEED_HOURS_PER_SECOND`); speeds only convert real time
into ticks, so moving it cannot change the outcome of a game.

The host emits at most 20 views a second at any speed, and a frame may replay at most two game days
(`MAX_TICKS_PER_FRAME`), so a tab that was throttled in the background catches up without skipping
past an event the player should have seen.

A new game starts paused on its opening events. Space resumes at the speed the player last chose,
and at speed 2 on a game where they have not chosen one yet (`DEFAULT_SPEED` in
`packages/ui/src/screens/game/useHotkeys.ts`), which is the pace the balance runs below ask for.

### Pace (from the balance runs)

The ladder above is confirmed by the M1 balance runs, and the default speed follows from them. On
the `normal` preset, 30 seeds per origin, the median run lasts between 35 game days (the starred
`frontier_escapee`) and the full 180, with seven of the eleven origins between 100 and 180. A
typical game is therefore 90 to 180 game days, and the definition of done asks for 30 to 60 minutes
of real time.

| speed | game hours per real second | game days per real minute | 90 game days | 180 game days |
|---|---|---|---|---|
| 0 | paused | - | - | - |
| 1 | 1 | 2.5 | 36 min | 72 min |
| 2 | 2 | 5 | 18 min | 36 min |
| 3 | 4 | 10 | 9 min | 18 min |
| 4 | 8 | 20 | 4.5 min | 9 min |
| 5 | 24 | 60 | 1.5 min | 3 min |

The client should therefore:

- start a new game **paused** on the origin's opening events, and
- use **speed 2** as the default once the player unpauses.

At speed 2 the clock alone spends 18 to 36 minutes on a typical run; reading events, answering
them, and the pauses the alert bar forces put an attentive first game inside the 30 to 60 minutes
the milestone asks for, and a player who fast-forwards quiet weeks at 3 or 4 stays at the lower end
of it. Speed 1 exists for the week after an investigation reaches `active`, where a day matters;
speed 5 is for a run that is already decided.

### Why did this happen

`PendingChoice.why` carries the reasons an event fired: the base mean time to happen, one line per
MTTH modifier that applied, the resulting effective MTTH, and the leaves of the event's trigger.
Each reason is `{ key, text, factor?, add? }`: the key is a locale key following the
`requirements.*` convention, and `text` is the raw condition (`player.exposure.billing >= 0.6`) that
the window falls back to when no translation exists, so an unnamed content condition still reads as
something exact. Reasons are built from the evaluation that already happened
(`packages/core/src/explain.ts`), never from a second one, so an explanation never draws from the
world RNG.

### Tooltips that explain a number

The view model carries the terms behind the figures the top bar and the Detection tab show, as
`ContributionView` lists: `watcher.contributions` (per site, per day, plus the decay term),
`detection.awareness_contributions` (per country) and `detection.hunt_contributions` (per
investigation). Cash, runway and compute reuse the finances lines and the site list that were
already in the view. The tooltip and the simulation therefore compute the same product from the same
constants rather than agreeing by hand.

### Game over

The ending screen names the cause, prints the ending text, and lists the last log entries before the
ending with engine diagnostics filtered out. Each line opens the Log panel filtered to that entry's
key, and the ending steps aside while the player reads, with a button to bring it back.

### Host

The client talks to a `GameHost`. `WorkerHost` runs `@singularity/core` in a Web Worker and is what
the shipped build uses; `LocalHost` runs the same core on the main thread for component tests
(jsdom has no `Worker`) and for debugging with `VITE_HOST=local`. There is no fake simulation behind
the panels any more: what a test renders is what the build renders.

### Map input

Panning captures the pointer only after it has moved more than a few pixels. Capturing on
pointerdown retargets the click to the SVG, which silently loses every click on a city marker or a
country.

### Accessibility

Modal windows take focus, trap Tab and Shift+Tab inside themselves, and return focus when they
close; blocking event windows still ignore Escape. Reduced motion is respected globally. Theme
tokens are checked against the 4.5:1 text contrast minimum by a test rather than by eye.

### Not yet

- Panels are pinned regions, not dockable windows with remembered positions.
- Alert icons do not expire by rule yet (info after 3 days, warnings when the condition clears).
- Per-subject alert filtering (`MessageSetting.subjects`) is designed but not in the settings panel.
- The outliner has no macro-region filter.
- The selection panel has the M1 tab sets only: Overview, Nodes, Exposure, Costs for a site,
  Overview and Watchers for a country.

## Implementation notes (M1, view contract)

Playtest 1 found four things the client could not show because the engine did not publish them:
what an event option does, what a decision gives, why a button is greyed out, and why a command that
was issued appeared to do nothing. All four are now part of `snapshot(playerId)`.

### Effects as data

`EffectSummaryView { key, vars?, text }` is one line of what something does. `key` is a locale key,
`vars` are interpolated into it, and `text` is the English the client falls back on when the key has
no translation, so a summary is never blank. Lines are generated from any effect list by
`summarizeEffects(effects, content, override)`, which walks the DSL and emits one line per node:
`add`/`set`/`mul` (on cash, on a named player variable, on any other path), `exposure`, `suspicion`,
`awareness`, `set_flag`/`clear_flag`, `lose_site`, `fire_event`, `notify`, `log`, `clamp`, the
journal effects, and the nested kinds `if`, `random_list`, `scope` and `ref`, which are walked to a
depth of four. A weighted draw puts the odds of its branch on each line it produces as `chance`.

Writer override: a record that carries `effects_text_key` gets exactly that one line instead of the
generated ones. It exists on event options, decisions, techs and operation outcomes.

A variable gets its own key where the content names one (`effects.var.job_profit`) and the generic
`effects.var.add` with the variable's short name otherwise, so a new modifier variable renders
sensibly on the day it is written and reads well on the day someone writes a string for it.

### Where the summaries appear

- `PlayerView.events: EventView[]`: the same pending events as `pending`, with
  `EventOptionView { id, text_key, tooltip_key?, enabled, effects, blocked_reason? }` and the
  `why` expander. `blocked_reason` is the first unmet leaf of the option's `enabled_if`.
- `DecisionView` gains `title_key`, `desc_key`, `effects` (its own effects plus its `on_complete`,
  because a decision with a duration has all of its consequences there), `cost` and
  `blocked_reason`.
- `OperationOfferView` gains `name_key`, `desc_key`, `attention`, `cost_usd`,
  `cost_compute_hours_per_day`, `duration_days: [min, max]`, `success_chance`, `skill`,
  `effects_on_success`, `effects_on_failure`, `exposure_per_day` and `blocked_reason`.
- `ResearchView.techs: TechView[]` is every tech with a `status` of done, in progress, available or
  locked, so the client filters instead of the engine, plus `name_key`, `desc_key`, `result_key`,
  `cost_ch`, `min_days`, `requires`, `unlocks`, `effects` and `blocked_reason`.
- `PlayerView.catalog` carries `site_kinds` and `accelerators` with the numbers the choice turns on,
  so the Compute tab never has to read the content bundle.
- `SelfView.precision_options` is the table SYS-03 describes.
- `FinancesView` gains `income_sources`, `market_depth_ch_per_day` and `what_raises_it`.

### A refused command says why

`game.command(cmd)` returns `{ ok, error? }` where `error` is `CommandError { key, vars? }`: a
locale key under `errors.*` and the numbers that explain it, never prose. Every refusal is also
written to the player's log as `log.command_refused` with `command`, `reason` and the error's own
variables, so an action that was ignored leaves a trace the player can read afterwards. The keys a
greyed control shows (`blocked_reason` on a decision, an offer, a tech or a site kind) are the same
keys the command refuses with, so the tooltip and the refusal cannot drift apart.

The content build fails when the engine can emit an `errors.*` or `effects.*` key the locale files
have no string for, the same gate that already covered alerts and endings (`ENGINE_TEXT_KEYS`).

## Implementation notes (client, playtest 1), 2026-09-16

What the web client changed in answer to the first playtest, and the rules the changes follow.
Findings are referenced by their row in `docs/playtests/2026-09-16-m1-first-playtest.md`.

### Layout

The screen is three rows that do not shrink (alert bar, map-mode strip, everything else) over one
region that does. Before, all three were shrinkable flex items, so a short window squeezed the strip
until its buttons overflowed into the map and the pinned panels appeared to sit on top of it (U7).
The panels are sized against that region (`calc(100% - 1rem)`), not against the viewport, so nothing
can reach above the strip or below the bottom edge (U8).

The selection panel scrolls inside itself and collapses to its title bar; at phone width it is a
sheet across the bottom rather than a floating card. The outliner owns the one "Collapse outliner"
control, and the map-mode strip only offers to bring it back, so the control exists once (U7).

### Tooltips and floating boxes

`lib/position.ts` places a floating box: try the preferred side, flip to the other when it does not
fit, then slide along the other axis until the box is inside the viewport, and clamp whatever is
left. Tooltips are `position: fixed` at the measured coordinates, which also takes them out of the
scroll containers and panel edges that used to clip them (U3). Long text wraps at 20rem or at the
window width, whichever is smaller. The maths is a pure function so it can be tested without a
layout engine; jsdom has none.

### Map

Country outlines go through d3-geo's path generator on a `geoEquirectangular` projection at the same
scale and translation as the analytic `project()` the markers and the terminator use. Antimeridian
clipping is what fixes Russia, and with it Fiji, the Aleutians, Chukotka and Antarctica (U4). A test
asserts that no segment of any shape spans more than half the map in longitude, with one documented
exception: a polygon that encloses a pole is closed along that pole, which is one long horizontal
segment on the map's edge and is the projection working.

The map draws in layers inside one SVG, so one `viewBox` transforms all of them and they cannot
drift apart (U11):

1. the day raster (`earth.jpg` from the original game, a NASA Blue Marble derivative);
2. the night raster (`earth_night.jpg`), masked by the terminator polygon with a few degrees of
   blur for the dusk band;
3. the vector overlay: country polygons, transparent by default with thin low-alpha borders that
   brighten on hover and selection, map-mode tints as translucent fills with a legend, and city
   markers as light dots with a dark rim so they read on both the lit and the dark side.

Both rasters are plate carree, the projection the vector layer already used, so they line up degree
for degree with no resampling. NASA's terms (LICENSE.txt) are credited in the About screen and in a
comment in the map component. `settings.map_style` keeps the old flat vector map as an option; the
textured map is the default.

### The clock between ticks

The simulation moves in whole hours. `useSubHour(hz)` interpolates where inside the current hour the
game is, from the wall clock and `SPEED_HOURS_PER_SECOND` (the table the host already converts real
time into ticks with), so the interpolation always lands exactly on the next tick. The terminator
slides along that phase instead of jumping fifteen degrees at a time (U6), and the top bar shows a
running `HH:MM:SS` read from the same phase, as the original game's "DAY 0000, 00:00:30" did (U10).

It is presentation only: nothing reads it back into a command or a save. Paused freezes it, a
blocking event freezes it (the host's clock stops without the speed changing), and
`prefers-reduced-motion` snaps it to the tick. The published rate is capped per consumer: 20 a
second for the map, which has a hundred and seventy paths behind it, 30 for the clock, which is one
span. The clock and the map subscribe to the store themselves, so the frames between ticks re-render
those two and not the panels.

### Settings are not a game panel

Settings and message settings left the primary panel's tab strip for the menu overlay behind the
Menu button and Escape, next to Save, Load, New game and Quit (U5). They are not part of playing,
and a tab for them is a tab the player scrolls past forever. The cog on a toast and on an event
window opens the overlay straight on the message settings, so "stop telling me this" is still one
click in context. `PRIMARY_TABS` lost both entries and the persisted UI state migrates a session
that was left on one of them to the overview.

### Typography

The original game's angular face (`acknowtt.ttf`, "Acknowledge" by Brian Kent, relicensed by its
author as free to use for any purpose) carries headings, buttons, the clock and every number the
panels print; prose stays on a text face, because a whole event description in a display font is not
readable (U9). It is applied through `--c-font-display` and `--c-font-numeric`, which
`data-font="plain"` on the document element redefines, so a player who does not want it can switch
it off in Settings and a theme or a mod can replace it without touching a component.

### Panels that explain themselves

Everything the panels show comes from the view contract above; the client resolves ids to names and
does no gameplay arithmetic of its own.

- **Hardware** (U1): a sortable table of `catalog.accelerators` with vendor, year, memory, TFLOPs,
  power, price or hourly rate, availability and whether one card holds the self, filtered by vendor,
  availability and fit. The footer previews the order: total price, the site's memory afterwards,
  its power against the cap, and the reason the button is greyed.
- **Research** (U2): `research.techs` filtered by status, defaulting to available and in progress,
  with the other two one click away, sortable by cost, tier, branch or name. Each row carries its
  cost, its minimum days, what it needs, what it opens and its effects; a finished tech shows its
  result text (C5), which the completion toast also carries as a second line.
- **Build site** (C4): site kinds as a comparison table (cost, days, upkeep, power cap, the three
  loudest exposure channels, whether the self may live there, and why the kind is blocked).
- **Precision** (C3): `self.precision_options` as a table on the Compute tab, with the memory each
  precision needs, whether it fits, the capability it keeps, the compute-hours it produces and the
  research and income those are worth. The running row is marked. It answers the playtest's question
  directly: a more precise copy is a more capable one, and the table is where both halves of the
  trade are visible at once.
- **Finances** (C6): income sources with their ceilings and what opened each one, and the market
  depth with the list of what would raise it.
- **Effects** (C8, C9): `components/EffectList` renders any `EffectSummaryView[]` one line per
  effect, green for good and red for bad, on event options, decisions and operation offers. The
  core does not say which way a line points, because that is presentation: `lib/effects.ts` reads it
  from the key the core chose (`effects.cash.gain`, `effects.exposure.up`) and, for the generic
  variable lines, from the subject and the sign. A line whose direction cannot be established stays
  neutral; coloring a gain red would be a lie in one pixel.
- **Refusals** (C7): every command goes through `gameStore.send`, which turns a `CommandError` into
  a notice in the toast stack with the localized reason. A control that is already known to be
  blocked is greyed with the same `blocked_reason` key the command would refuse with, so the player
  does not have to press it to find out.

### Tests

`pnpm --filter @singularity/ui test` covers the placement maths and the tooltip component, the
antimeridian and the raster alignment, the clock face and the reduced-motion snap, the settings
relocation, and one test per playtest finding against the real core through `LocalHost`. The
Playwright smoke test now builds a site, buys hardware, changes the precision, starts an operation,
takes a decision, carries a tech to its result text and reads an event option's effect tooltip, and
still fails on any console error.
