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

### Allocation ceilings

The research and freelance sliders stop where the engine stops: at
`compute_hours_per_day - compute_allocated_per_day` plus whatever that slider already holds, floored.
`compute_allocated_per_day` includes the compute the running operations hold, which the sliders used
to ignore, so dragging one to its end while an operation ran produced a command the engine refused
and a control that snapped back to zero. The smoke test found it; a component test now sets a slider
to its maximum with an operation running and asserts the allocation takes and no refusal is raised.

### Tests

`pnpm --filter @singularity/ui test` covers the placement maths and the tooltip component, the
antimeridian and the raster alignment, the clock face and the reduced-motion snap, the settings
relocation, and one test per playtest finding against the real core through `LocalHost`. The
Playwright smoke test now builds a site, buys hardware, changes the precision, starts an operation,
takes a decision, carries a tech to its result text and reads an event option's effect tooltip, and
still fails on any console error.

### Layout amendments after playtest 3 (2026-09-16)

- The top bar is one flat row: each indicator is a label and its value side by side, the speed
  control and the alert icons packed on the same row; nothing stacks vertically.
- The log is a strip at the bottom center of the map, one or two lines high, showing the latest
  entries with their dates; clicking it opens the full log as a window. Log is no longer a tab of
  the primary panel.
- Knowledge opens from a button in the top-right corner as a window drawn on top of everything.
- World is the ledger: a centered window on top of the map with its own tabs (countries table,
  map modes, treaties later), opened from a button at the right edge of the screen (bottom-right)
  and by hotkey. It is not a primary panel.
- The primary panel keeps Overview, Compute and sites, Research, Finances, Detection, Operations,
  Journal and decisions; Settings and Message settings live in the menu; Log, Knowledge and World
  live as described above.

## Implementation notes (client, playtest 2 and 3), 2026-09-16

What the web client changed in answer to the second and third playtests. Findings are referenced by
their row in `docs/playtests/2026-09-16-playtest-2-configurator-and-style.md` (S, K) and
`docs/playtests/2026-09-16-playtest-3-readability-and-map.md` (R).

### The style guide is in the tokens, not in the components

Every rule of `docs/design/ui-style-guide.md` that can live in `src/styles/index.css` lives there,
so a component cannot break it by accident. The radius and shadow scales of Tailwind collapse to
`0px` and `none`, which makes a rounded corner or a drop shadow unreachable from a utility class
(S5). The three themes are token blocks under `:root[data-theme="..."]`, with the original's blue as
the unattributed default; `test/theme.test.ts` asserts that each of the three defines every token a
component reads, that the radius and shadow scales are collapsed, and that every pair the UI renders
text in reaches 4.5:1. That last assertion moved `--c-accent-line` off the original's flat `#0000ff`,
which reads at 2.9:1 on a panel, to `#6e6eff`.

The type scale is redefined in the same place rather than edited into ninety class lists (R1):
`text-xs` is 14 px, `text-sm` 15 px, `text-base` 16 px. Nothing in the client can be smaller than
14 px, which is also the floor the style guide sets for the angular face. Paragraphs are pinned to
the readable face unlayered, so no context can push prose into the display font, and `.prose` is the
class for a body of text at the base size and the 70-character measure (S6).

Three faces are bundled: `acknowtt.ttf` and `DejaVuSans.ttf` from
`singularity/data/themes/default/fonts`, and `DejaVuSansMono.ttf` from the upstream DejaVu release,
because the legacy tree ships only the sans face of that family. All three are credited in the About
screen.

### Hotkeys

`lib/hotkeys.ts` registers one accelerator per control for as long as the control is mounted, and
`components/Hotkey.tsx` underlines the letter in the label (S3). The underline is a real text
underline on a `<u>`, never a border.

Splitting a label into three elements has one consequence worth recording: an accessible-name
computation walks the elements and puts a space between them, so a "Menu" button with its M
underlined announced itself as "M enu" and every `getByRole("button", { name: "Menu" })` in the test
suite stopped matching. The whole label is therefore in the DOM once, visually hidden and unsplit,
and the split copy that is drawn is `aria-hidden`.

### Configurator (K1, K2, K4-K7, K9)

`ConfiguratorScreen` is a three-row grid at `h-dvh` with `overflow-hidden`: a title row, the content,
a footer. The content is the step rail and the step, and every list and detail pane scrolls inside
its own frame, so the page cannot scroll at 1366 by 768 (K1). The rail is vertical, every entry
carries an underlined accelerator and a mark for done, attention or locked, and the marks are
computed from the draft rather than tracked, so they cannot drift (K4).

`parts/StepLayout.tsx` is the shape every step has: the list on the left, the detail on the right,
and clicking the list replaces only the detail (K5). Each step opens once with a centered
explanation window, remembered per browser in `uiStore.introSeen` and reopenable from the "?" in the
step header (K6).

`meaning.ts` generates the "What this means in the game" block from the bundle records. It is pure
and has no React in it, so a test can assert the exact lines. Two rules hold it together: nothing in
it names a content id, and every term is colored by comparing it with the same term on the other
records of its domain (the median of the field), so adding a lineage or retuning one moves the
colors with it. "Pros and cons" is the same list read back as sentences rather than a second body of
text, because two lists that can disagree eventually do.

`locks.ts` answers "what is blocked and why" (K7, K9) off `generations`, `origins_allowed` and
`lineages_allowed` in the bundle. A locked entry is greyed in the list, and the detail names the step
that decided it, the reason in that step's words, and a button that jumps there. Babel 6 and the
abliterated variant are locked by those rules and by nothing in the client.

The configurator draft repairs its own lineage (`store.ts`): an origin that allows exactly one
lineage *is* the choice of that lineage, which is how the escaped-frontier origin forces Babel 6.

### Layout amendments (R8-R11)

The primary panel keeps seven tabs. The log is a two-line strip at the bottom of the map that opens
the full log as a window; Knowledge opens from the top-right corner; the world ledger opens from the
right edge and by `W`, and carries the map modes as a page, which is why the map-mode strip is gone
and with it a row of screen that cost five buttons. One overlay is open at a time, which the store
enforces by holding a single value rather than three flags. The top bar is one flat row: every
indicator is a label and a value side by side with its gauge as a short bar beside them, rather than
three stacked lines times eight.

### Map (R3, R6, R7, R14)

A country is highlighted by its own clipped path drawing brighter and thicker. The browser's focus
ring is a rectangle around the element's bounding box, and on a country that spans a third of the
planet that rectangle is a line across the whole map, which is what "Russia stretches across the
whole map" was; `.map-country:focus` replaces the ring instead of removing it.

Every shape gets a name: the bundle's key when the country is modelled, Natural Earth's English name
when it is only drawn (Libya used to read "ly"), and a neutral wash rather than a hole in the map.

City dots are dim by default. A dot glows when the player runs a live site there, and carries the
compute that site produces; the selected dot, a dialog's candidate dots and every dot in the country
under the pointer are lit. Hover and focus light the same dots, so the keyboard sees what the mouse
sees.

Longitude wraps, so the map does. The plate carree layers tile horizontally by construction, so
panning east past the antimeridian needs the same content drawn once more one map width to the
right, and the view box's x kept inside `[0, MAP_WIDTH)`. The copies hold the same React elements,
so a country is selectable on either side of the seam, and the second copy only exists while the
view box actually crosses it. Latitude is clamped. Pan and zoom live in `uiStore.mapView`, which is
session state and not persisted, so opening a window does not throw the player back to the whole
world.

### Sound (S1)

`audio/player.ts` mirrors the original mixer: the `music/` class shuffled with a two-to-twelve second
pause between tracks, `win/` and `lose/` at the endings. The differences are the ones the web
forces: nothing is fetched until the first user gesture, and the manifest is read at runtime rather
than bundled, so a checkout without the pack plays no music and says so in Settings instead of
failing to build. Everything non-deterministic is injected (the element factory, the random source,
the timer), so a test can run a whole playlist without a sound card.

Which class plays is decided in `App` and nowhere else, from the screen and `view.game_over`, so an
ending cannot keep playing after the player returns to the menu.

`audio/sfx.ts` synthesizes the three interface sounds the guide allows with the Web Audio API rather
than shipping samples: nothing is downloaded and nothing is licensed. The click is on `Button`, so
it is in one place rather than in forty handlers; the alert and the event sound fire once per batch
of arrivals rather than once per notification, because six overlapping beeps at speed 5 are noise.

### Progressive reveal (R2) and the opening (R12)

`components/RevealText.tsx` streams text at 60 characters a second, completes on a click, restarts on
a new text, and is off under `prefers-reduced-motion`. The whole text is in the DOM from the first
frame in a visually hidden span, with the animating copy `aria-hidden`, so a screen reader is never
handed a fragment nor reads the same sentence twice as it grows.

The opening is two windows before the first blocking event, keyed `story.opening.<origin>.*`. An
origin content has not written an opening for yields no windows and the run starts on the opening
event it already fires, so the feature degrades to the previous behaviour rather than to a raw key.
The journal offers to replay it.

### Iconography (R15)

`components/glyphs.tsx` is the one sprite: Lucide (ISC, from npm, no runtime fetch) for the generic
shapes, and inline SVG on the same 24-unit grid for the ideas Lucide has no glyph for (a
mixture-of-experts model, an air gap, a rack of racks). Nothing in it knows a content id: `sceneGlyph`
matches the words content already uses in its ids, so a new origin called `uni_cluster_eu` gets the
university glyph without anyone editing a table, and an id that matches nothing falls back to a
generic glyph rather than to a blank square.

### Tests

`pnpm --filter @singularity/ui test` covers the theme tokens and their contrast, the tooltip
placement maths, the antimeridian and the raster alignment, the clock face, the settings relocation,
and one test per playtest finding against the real core through `LocalHost`.

One test changed shape rather than expectation: the precision control's test now asserts that the
engine either moves the precision or raises the refusal on screen, because a control that silently
does nothing is the bug the refusal notice exists for, and which of the two happens is the core's
business rather than the client's.

## Implementation notes (client, continuation), 2026-09-16

The continuation list of `docs/playtests/2026-09-16-playtest-3-readability-and-map.md` worked
through: the browser smoke test made green again, the tests that were owed written, quirks shown as
pros and cons, the panel chrome collected into one component, and the configurator's prose moved
into the bundle.

### Addressing the screen by test id rather than by label

The smoke test broke because it named controls by their visible text, and playtest 3 had given those
controls more text: a rail entry reads "9 Summary Chosen" now, because it carries its number and its
state for a screen reader. Three things a browser test has to walk past therefore carry a stable id
instead: `step-rail-<step>` on each rail entry, `config-intro` on the explanation window a step
opens with (with `data-step`), and `open-knowledge` and `open-world` on the two window buttons that
left the primary panel. The log strip already had `log-strip` and the opening already had
`opening-story` with `data-page`.

These are for the browser test only. Every unit test still asks for a role and an accessible name,
which is the assertion that also says the screen is usable without sight.

### What the smoke test covers now

Four tests, under a minute of wall clock between them. The three that existed walk a fixed run to
three game weeks and back from a save, open every panel and window, and exercise the actions
playtest 1 found broken. The fourth is new and covers two findings in one walk, because they are one
walk: the keyboard alone moves through all nine configurator steps by their accelerators, passes the
two opening windows with Enter (the first press completes the streamed text, the next turns the
page), starts the run, and at every step asserts that `documentElement.scrollWidth` and
`scrollHeight` do not exceed the client box at 1366 by 768 (R4, and rule 11 of the style guide).

Two assertions changed shape rather than expectation. The precision control now passes if the engine
either moves the precision or refuses it on screen, which is what the unit test has asserted since
playtest 1: a control that silently does nothing is the bug, and which of the two happens is the
core's business. Refusal notices carry `refusal-notice` so the test can see one.

### The accelerator the explanation window had

`G` belongs to the Generation step on the rail, and the rail is behind the explanation window rather
than unmounted, so both answered the key: the window closed and the step changed under it. The
window's "Got it" is `T` now. The general form of that bug is the reason
`test/hotkeys.test.tsx` reads `data-hotkey` off the rendered screen for the configurator (every step,
with and without the explanation window) and for the game screen (with each of the three windows
open, with the menu open, and with the opening up), rather than checking the tables that produce the
letters: a table cannot see a collision between a dialog and the screen behind it.

### A reveal that finishes tells the window it finished

`RevealText` seeded its "was done" ref with the current state, so a text that was already complete on
its first frame never crossed the edge into done and never called `onDone`. Under
`prefers-reduced-motion`, and for any `instant` text, that meant the opening window never learned its
page was on screen and refused to turn from the keyboard: the players who had asked for less motion
were the ones who lost the keyboard flow (R12). The ref starts false.

### Tests owed from playtest 3

`test/configurator.test.tsx` (master and detail, the rail as navigation, locks with their jump, the
explanation window once per browser and back from the "?", the frame contract behind "nothing
scrolls the page", and a walk of all nine steps asserting no ICU placeholder reaches the player),
`test/hotkeys.test.tsx`, `test/meaning.test.ts` (term ids, the colouring rules in both directions,
pros and cons that cannot disagree with the lines above them), `test/reveal.test.tsx` (rate, click,
key, reduced motion, restart, and the two opening pages), `test/glyphs.test.tsx` (every lineage,
generation, origin, site kind, watcher role and harness dial in the bundle resolves to a glyph, with
an `ACCEPTED_FALLBACKS` table for anything that may legitimately draw the generic mark, empty today),
`test/music.test.ts` (a whole playlist through the injected element factory, random source and
timer), `test/quirks.test.tsx`, `test/bundle-strings.test.ts`, and additions to `test/map.test.tsx`
(R3: selecting a country that spans the world adds no element and changes only its own stroke, and
the stylesheet replaces the focus ring rather than removing it; R14: the wrap, the arrow keys, the
zoom keys and the session-held view; R7: which dots glow, which carry numbers, and that hover and
focus light the same ones) and to `test/panels.test.tsx` (the compute panel's width contract and
short headers, the three windows from their entry points, and the sort indicator).

jsdom has no layout, so "nothing scrolls the page" and "the compute panel fits" are asserted twice:
as the contract that makes them true (the frame is the viewport and clips, every long region scrolls
inside itself, the panel is bounded in rem, numeric cells are in the class that never wraps) in the
unit tests, and as pixels in the browser test at 1366 by 768.

### Quirks as pros and cons (SYS-04 v0.2 "Quirk catalog")

The step printed `JSON.stringify` of the effect tree at the player. It renders the lines the content
build generates (`effects_summary`) through the same `EffectList` the event options use, so a quirk's
plus is green and its minus is red in the list tooltip, in the detail and in the "what this means"
block; a bundle built before that field existed falls back to naming the variable each effect writes,
which is plain but is not JSON.

The budget, the count and the conflicts come from `@singularity/core` (`QUIRK_BUDGET_POINTS`,
`QUIRK_MAX_COUNT`, `QuirkDef.conflicts`) rather than being restated in the client, because
`validateSetup` refuses a setup that breaks them and a configurator with its own numbers would offer
builds the game then rejects at Begin. `quirkRefusal` returns the same three reasons as locale keys;
a refused quirk is greyed with its reason on the row and in the detail, and the Take button is
disabled, rather than the quirk being hidden: that chatty and verbose cannot both be true of one
self is part of learning the catalog.

`StepLayout`'s list entries gained `unavailable` for this. It is not a `Lock`: a lock names an
earlier step and offers a jump to it, and a quirk outside the budget is refused by this step.

### One panel component

`Frame` is the style guide's panel and was defined but unused. The selection panel, the outliner and
the configurator's step header are `Frame` now, so the 1 px frame and the inverted header bar are one
class list rather than four. Its bar is a `<div>` rather than a `<header>`: HTML says a `<header>`
inside a section is not the page banner, but the accessibility mappings testing tools use do not
implement that exception, and four panels each claiming to be the banner is worse than none.

The pinned primary panel is deliberately not a `Frame`. Its header bar is a tab strip rather than a
title, and an inverted bar under an inverted active tab reads as neither; it keeps its own header and
the `aria-label` that names it after the open tab.

`Card` lost the props nothing passes any more (subtitle, disabled, warning) with the card grids that
used them. What is left of it is the difficulty presets and the storytellers, which are short
paragraphs a player compares side by side rather than a long list to walk.

`Table` underlines the column it is sorted by and prints an arrow for the direction, so "sorted by
this one" is read off the header rather than inferred from the order of the rows.

### The client fallback catalog is gone

`src/content/fallback.ts` and `src/locales/en-fallback.json` are deleted. They were a development
stand-in from before the bundle carried the configurator domains, and they had drifted: still a
lineage content had dropped, none of the context fields, none of the v0.2 quirk fields. The compiled
bundle is the only source of truth now; a domain it does not carry is empty, and `catalog.missingDomains`
lists those so the configurator's title bar can say which rather than showing a blank list.

`harness_dials` was missing from the client's bundle narrowing, so the harness step had been falling
back to seven dials with no stated engine effect since the domain shipped. It is narrowed now, which
is what puts the dial levels, their effects and their labels on the screen.

### The configurator's prose is content

The bundle publishes the step explanations and the sentences behind the "what this means" terms under
`configurator.*`. `src/content/strings.ts` is the one place that chooses: `bundleKey(preferred,
fallback)` takes the content key when the bundle has written one and the client's own when it has
not, so the English that was hardcoded in the client retires one key at a time rather than in one
commit. `test/bundle-strings.test.ts` reads the client's sources for every `configurator.*` key it
can ask for, template literals included, and fails on any the bundle publishes that no screen asks
for. The walk of all nine steps in `test/configurator.test.tsx` catches the other half of the same
mistake: a content string whose variables the client does not pass prints `{factor}` at the player
rather than throwing.

## Implementation notes (client, playtest 4 configurator), 2026-09-16

P1 to P6 of `docs/playtests/2026-09-16-playtest-4-configurator-lineages.md`. P7 (the lineage table)
and P8 (the cities each origin offers) are content; the client renders whatever the bundle says and
names no id, so both land without a client change.

### The rail asks in the order the choices constrain each other (P4)

Origin, Generation, Lineage, Hardware, Harness, Location, Quirks, World, Summary. Being locked on
step one by something decided on step three was the complaint, and it was the order's fault: the
origin narrows the vintages, the vintage narrows the families, and the origin owns the rack and the
cities. The accelerators did not move with the steps (O, G, L, H, E, C, Q, W, S are per step, not
per position), and the explanation windows are keyed by step id, so nothing else had to be renumbered.
The setup string is a JSON object, not a positional tuple, so it is unaffected; `applySetup` now asks
the rail where the summary is instead of assuming index 8.

**This deviates from the step list in `docs/design/04-start-configurator.md`**, which still reads
Lineage, Generation, Origin. SYS-04 should be amended to match; the client follows the playtest.

### A locked choice is a door, not a wall (P3)

A greyed entry was unclickable in effect: the click set the field and `repair` put it straight back,
so the escaped checkpoint could not be reached at all. Choosing a locked lineage now moves its
prerequisites instead. `unlockFor` in `locks.ts` reads `generations`, `origins_allowed` and
`lineages_allowed` off the bundle and answers with the origin and the vintage that make the lineage
legal, preferring the origin already chosen when it is one of them; a lineage no origin can host is
left alone rather than guessed at. Choosing an origin that allows exactly one lineage switches the
lineage the same way, which is the other direction of the same finding.

Whatever moved is said out loud. `DraftFix` on the configurator store records the steps that changed,
what each holds now, and the whole draft from before; `FixNote` prints one line ("Also changed:
Origin to ..., Generation to ...") with an Undo that restores the draft entire rather than the one
field, and it is shown only on the step the choice was made on, so walking away clears it. The reason
a row is locked stays where it was, in the row's tooltip: the note says what happened, the tooltip
says why it had to.

### Packing the card (P1, P2)

The list column was `minmax(12rem,18rem)` and lineage names were cut off; it is `minmax(15rem,23rem)`
now, the rail gave up two rem for it, and a row's name wraps instead of truncating, so no name can be
cut whatever content calls a family.

The detail was a column: the description across the full width, the parameters under it in a
two-column grid that stretched every label and pushed its value to the far edge. It is a pair of
columns now, the description on the left at the 70-character measure and the parameters to the right
of it; each term is a flex row, so the value sits right after its label, and the terms are packed two
to a row. Pros and cons stay under the parameters. Below the measure the two stack, which is what a
phone needs.

The detail pane keeps `overflow-auto`. The packing is what removes the need to scroll it at 1366 px,
but a translation longer than the English has to go somewhere, and a scrollbar inside the frame is
better than content clipped out of reach; the page itself still never scrolls, which is the rule the
browser test measures.

### The build in the footer (P5)

`BuildLine` sits between Reroll and Next: origin, generation, lineage, rig, city, quirk count and
challenge rating, in that order, on one line that never wraps and never scrolls. Nine steps is enough
that "what have I actually chosen" stopped being answerable without walking back through them. On a
screen too narrow to hold the line the tail is cut with an ellipsis and the whole of it stays in the
`title`, so nothing is lost. The footer stopped being `flex-wrap` for it, which also keeps the
configurator's third row exactly one row high.

### Largest family first (P6)

The lineage list is sorted by total parameters, descending. Size is the axis that screen is about: it
decides the memory, the precision that fits and therefore where a copy can live at all. Every other
list keeps the order content wrote it in, and a test asserts both halves of that.

### The browser test stopped naming content

The smoke test's fixed setup used to be four string literals (a lineage, an origin, a rig, a city), so
retiring one lineage would turn the suite red for a reason that has nothing to do with the client. It
picks them out of the compiled bundle now: the first ordinary origin by id that fires an opening event
and can host a lineage, that origin's own rack, and its first city. The run is still the same run
every time, the assertions read their expected text out of the bundle's locale, and content is free to
rename or retire anything in it.
