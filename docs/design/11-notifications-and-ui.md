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

`audio/player.ts` keeps the original mixer's two-to-twelve second pause between tracks and drops its
shuffle (amended after playtest 6, X14). The soundtrack has roles: the menu one fixed melody played
from the top whenever the menu is entered, the model's first two windows one quiet melody of their
own, a run the rest in a fixed order, the endings the pack's `win` and `lose` in the order the pack
lists them. The roles are in the manifest, written by `scripts/fetch-music.mjs`, so the soundtrack
is data and the player holds no track names. The manifest is read at runtime rather than bundled,
so a checkout without the pack plays no music and says so in Settings instead of failing to build.
Everything non-deterministic is injected (the element factory, the random source, the timer), so a
test can run a whole playlist without a sound card.

The web's own rule is that nothing may sound before a user gesture, not that nothing may load
(amended after playtest 6, X15). The manifest is fetched at page load, the first track's element is
created there with `preload="auto"` and buffers while the player reads the menu, and playback is
attempted once: a browser that allows it starts immediately, and one that answers `NotAllowedError`
leaves the buffered element waiting for the gesture, which plays it with no pause in front of it.
The pause belongs between tracks, never before the first.

Which role plays is decided in `App` and nowhere else, from the screen, the opening flag and
`view.game_over`, so an ending cannot keep playing after the player returns to the menu.

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

## The layout contract (playtest 5, 2026-09-16)

The client is drawn for a window of 1280 by 720 CSS pixels and sized entirely in rem against the
root font size, so one number, the interface scale, moves all of it; Settings offers that scale as
a slider from 70% to 130% with an "auto" default that picks the largest scale the design still fits
the window at and re-picks, debounced, on resize. Nothing in the configurator or on the game screen
scrolls sideways and the page itself never scrolls in either axis: every flex and grid child that
holds text carries `min-width: 0`, a measure is a maximum and never a width, and a region that runs
out of room reflows rather than overflowing. Where two things share a screen they are areas of one
grid, never cards positioned against corners: the configurator's detail card is a text column of two fifths
beside a parameter column of three fifths, switched on the pane's own width by a container query
rather than on the window's (amended after playtest 6; see the implementation notes below), and the game screen is a three-column grid whose
left column is the primary panel with the selection panel under it, whose middle column ends in the
log strip and whose right column is the outliner, which collapses to its title bar first, then the
selection panel becomes a sheet across the bottom, then the primary panel takes the whole region.
Only the footer's build line and the setup string are allowed to be cut; names, titles, parameters,
values and log lines wrap. `e2e/layout.spec.ts` measures all of it at 1280 by 720, 1366 by 768,
1500 by 800 and 1920 by 1080, because jsdom has no layout and a class list is only half a promise.

## Implementation notes (client, M2), 2026-09-16

What the client draws from the M2 view contract (`docs/design/01-world-model.md`, "M2 contract"),
and the three places it had to decide something the contract left open.

### The world ledger

`W`, or the button at the right edge, opens the ledger as a window (playtest 3, R10). It has three
pages now.

- **Countries** is the table. It carries every column the contract lists, in three families the
  player switches between: politics (awareness, opinion, regulation, enforcement, stance,
  government, stability, the next election), the market (power price, cloud, colocation, hardware,
  chip access, KYC, the market factor, the cash factor) and where the player is (sites, identities,
  watchers with a case, open cases, the highest suspicion, the local heat, incidents in the last
  thirty days). The country and "am I here" stay in every family. **This is a deviation from the
  contract's "one table":** twenty columns of a hundred and five rows do not fit a window at 1280 by
  720 without either a sideways scrollbar or headers cut to three letters, and the layout contract
  forbids the first while the style guide forbids the second ("compacted by narrower columns and
  abbreviations, never by wrapping numbers"). A Paradox ledger has pages for the same reason. Every
  column is sortable, the sort is held by the ledger rather than by the table so it survives a
  change of family, and clicking a row selects the country on the map and in the selection panel.
  Two filters narrow the rows: the macro-region and whether the player is present.
- **Map modes** is the strip that used to sit under the top bar. It has twelve entries now, ten
  scales and two categories.
- **World** is the global page: awareness in the world and over the countries of presence, the hunt
  level and the hunt pressure, AI adoption, the accelerator price index and cloud demand, each with
  the terms the core published for it, and the `exposed` ending's own thresholds
  (`EXPOSED_AWARENESS`, `EXPOSED_HUNT_LEVEL`, `EXPOSED_DAYS`) in the awareness tooltip so the clock
  can be read rather than guessed at. The same three numbers are in the top bar's hunt gauge.

Every numeric column carries a button that paints the map by it, beside the header rather than
inside the sort button: a button inside a button is not valid HTML and is unreachable with a
keyboard. `stance` and `government` are categorical modes: the map draws them from a table of hues
with the categories named in the legend, because a stance is a name and shading it from nothing to
everything would invent an order the model does not have. The power price is the one scale that is
not a share, and it is normalized against the dearest published price in the view rather than
against a ceiling the client picked.

### The country and city panels

The selection panel answers a country with Overview, Politics, Economy, Watchers and Cities, and a
city with Overview, Sites, Providers, Power and Scrutiny, which is the tab set SYS-11 "Layout"
fixes. Where each number comes from:

- **Country Overview**: `CountryView`'s macro-region, government, stance (with the stance
  description as its tooltip), stability, presence, population and `incidents_30d`, then the four
  dynamics as bars, each with its `explain` list. Opinion runs from -1 to 1, so its bar shows where
  the value sits in that range while the number is the value itself; an empty bar would say
  "nobody has an opinion" where the country dislikes AI.
- **Country Politics**: `ai_regulation` against `regulation_target`, `ai_enforcement` against
  `enforcement_budget`, `next_election` as the days left with its kind in the tooltip, the
  reporting duty from the static `incident_report_hours` where the country has one, stability,
  unemployment, and the stance's own description as prose.
- **Country Economy**: the effective electricity price with the power index behind it, the cloud
  price index, the cloud and colocation markets, hardware availability and chip access, the
  engineer pool, AI displacement, the market factor and the cash factor with
  `cash_factor_contributions`.
- **Country Watchers**: `DetectionView.watchers` filtered by country, each with its role, the
  agency's name where one is known, its competence, its suspicion with the `contributions` list and
  its top channel; then the roles the country has an agency for but no watcher of yet, with the
  competence the country data gives them; then the visible investigations here, with their stage
  and the days to the deadline.
- **Country Cities**: the country's `CityView`s with population, scrutiny, local heat, power
  headroom, the colocation index and the player's site count; clicking one selects the city.
- **City Overview**: country, population, tags, sites, local heat and the three city figures.
- **City Sites**: the player's sites here, each a jump to the Compute panel.
- **City Providers**: `CityView.site_kinds`, each with the catalog's price terms (build cost,
  upkeep, days, power cap) and, when it carries one, the structured `blocked_reason` rendered
  through the same locale key `build_site` refuses with, greyed. The row and the refusal cannot
  drift apart because they are the same key and the same variables.
- **City Power** and **City Scrutiny**: the headroom, the effective price and the country's index;
  the city's scrutiny, the local heat, and under "what raises it" the country's enforcement, its
  awareness, its incidents and its stance.

`local_heat` has no contribution list in the view, so its tooltip names what raises it in a
sentence instead of printing a formula the client made up. That is the rule everywhere in these
panels: a value the view explains carries its terms, a value it does not carries the rule in words.

### Finances and Detection

Finances gains the identities section (`FinancesView.identities`): kind, country, status, quality,
KYC tier, age and the sites held under the name, with frozen amber and burned red, because an
income line that is about to stop is a thing to see before it stops. The market depth's tooltip
carries `market_factor_contributions`, so a shallow market reads as a fact about the country rather
than about the self. Detection opens with the hunt block: level, pressure, awareness in the world,
awareness over the countries of presence, and those countries listed under it with their own
awareness, each one a jump to the country panel.

### The Location step and the configurator under SYS-04 v0.3

Rule L: the step lists every city the bundle carries. The origin's `locations` come first under
"Typical for this situation", in the order content wrote them; everything else is under "Anywhere
else", grouped by country, ordered by country name then city name, behind a filter box that matches
the city and the country. Both groups draw the same map markers and carry the same "what this means
in the game" block. `StepLayout` gained `group` on a list entry (a heading is printed when the
group changes) and a `listHeader` slot for the filter box.

The one refusal left is the engine's: an origin whose kind of place is `rented` needs a country
whose market clears `SITE_KIND_AVAILABILITY`. Such a city is shown with `errors.site.unavailable_in`
on its row rather than hidden, and it is not selectable, because `validateSetup` refuses that setup
and a choice the game rejects at Begin is exactly the dead end P3 is about. The draft's own repair
follows the same rule: a city that refuses the origin's kind falls back to the origin's default,
and a city the player chose on purpose survives a change of origin.

**The meaning line has no awareness term, which rule L asks for.** Every country's awareness of a
rogue AI starts at zero on 1 January 2027 (`entities.ts`), so the term would print 0% for a hundred
and five countries and teach nothing. What decides where that zero goes is the government's
posture, so the posture is the term, with its own description as the tooltip, and the stability
beside it; the awareness the run starts with belongs to the origin and the generation and is on
their steps.

Rule G is content's: the Generation step offers what `generations_allowed` allows, and its meaning
block gained the trade-off line, read off `prepared_quants`, `capability_delta` and `memory_factor`
rather than written per vintage. Rule M adds the physics lock: a family the chosen rack cannot hold
even at int2 is shown with the reason and the smallest rack of this origin that would hold it, and
choosing it switches the rack with the same one-line note and undo every other moved choice gets;
a family no allowed rack can hold stays unselectable. Rule C puts the starting cash on the Summary
step as the origin's figure times `countryCashFactor`, with `countryCashFactorTerms` in the
tooltip, and says so plainly for an origin whose money is not the country's.

### The step rail's accelerators (playtest 5, continuation)

The rail's accelerator moved into a key cap in the leading slot, where the step's ordinal was, and
the label went back to being the term itself. The style guide underlines the accelerator inside the
label (rule 4) and Russian cannot: the keys are Latin letters and the words are Cyrillic, so
`Hotkey` fell back to appending "(O)", which is what pushed "ПРОИСХОЖДЕНИЕ (O)" onto a second line
and made the first rail row taller than the rest. A key cap costs the label no characters in any
language, is the same width whatever the letter is, and sits in the same column on every row; the
ordinal it replaced was redundant beside a vertical list and a header that already prints "Step N
of 9". The button carries `aria-keyshortcuts`, so the accelerator is announced rather than spelled.
The rail's column budget went from 11rem to 12rem, which holds the longest Russian label on one
line at 1280 by 720 and still leaves the detail pane above the 44rem its two columns switch on.
The underline stays everywhere else, where labels are short and mostly carry their letter.

### Agency names (playtest 5, continuation)

`agencyName(t, country, role)` takes the locale key `world.country.<id>.agency.<role>` when content
has written one and the world data's raw display string when it has not; a role the data names
nothing for returns nothing and the caller prints the role. The panels are therefore ready for the
keys the content pass adds without depending on them. Competence comes from
`agency_profile[role].competence`, falling back to the country's `ai_enforcement`, which is the
rule the core follows when it builds the watcher. On the Location step the visible value is the
roles with their competence and the dossier string lives in the term's tooltip, because "NIST /
Center for AI Standards and Innovation (CAISI, ex-AISI), Dept. of Commerce; White House OSTP sets
policy" is a name, not a line of a parameter table.

### Tests

`test/world.test.tsx` covers the ledger (the three pages, the column families, the sort that
survives a change of family, both filters, the map-mode buttons including a categorical one and the
power price, and the row that selects a country), the country and city panels (every tab rendered
from a real view with no raw key and no empty value, the watchers of a watched country, the jump
from a city to Compute, and a greyed provider carrying the engine's own refusal) and the identities
section. `test/location.test.tsx` covers rules L, G, M and C: every city listed, the two groups in
order, the filter, a refused city shown and unclickable, a city chosen outside the typical list
kept, the meaning terms including the cash factor, the trade-off line, the rack that moves with a
family, and the Summary's cash. `e2e/layout.spec.ts` walks the ledger's three pages and three
column families and both selection tab sets at all four viewports; `e2e/russian.spec.ts` walks the
ledger and a country panel in Russian at 1366 by 768.

## Implementation notes (M2 second pass: three gaps the client reported)

### Local heat says where it comes from

`CityView` carries `local_heat_contributions` beside `local_heat`, built the way `FinancesView`
builds `market_factor_contributions`: `localHeatTerms` in the detection system returns the six lines
(anywhere at all, the city's scrutiny, what the country can enforce, what the public here believes,
the incidents of the last thirty days, a securitizing state) and `localHeat` is their sum, so the
tooltip and the simulation are one piece of arithmetic (SYS-05 "always keep the breakdown"). The
City panel's two local-heat figures pass the list to `ContributionLines`, which had been standing
there with `lines={[]}` since the panel was written.

### Country awareness at setup: already right, and there is nothing to seed it from

Checked and left alone. `awareness` in this game is awareness **of the player**, not of AI in
general (SYS-01 "Entities"), and the world baseline carries no field that measures it: the countries
record `ai_policy_posture`, `ai_index_rank`, `democracy_index` and the rest, and the only public
sentiment among them is `ai_opinion`, which is already seeded straight from the data in
`initialCountryState`. The only awareness a run starts with is the origin's and the generation's,
applied to the country the player wakes up in (`origin.starting.awareness +
generation.awareness_start`), which is what SYS-01's M2 contract asks for. Seeding the other
hundred and four countries from anything in the baseline would be asserting that the public already
believes in a rogue AI on day one, which is the opposite of what the first act is about.

### `setupCatalog(content)`: no such function, and one real duplication

There is no `setupCatalog`; the client's equivalent is `buildCatalog(bundle)` in
`packages/ui/src/content/catalog.ts`, which indexes the compiled bundle's domains and nothing else.
Rules L and C are **not** duplicated: the configurator's `cityRefusal` reads the core's
`SITE_KIND_AVAILABILITY` and `siteKindMarket`, and the Summary and the meaning lines read the core's
`countryCashFactor` and `countryCashFactorTerms`. Rules G and M are the configurator's by design, as
SYS-04 v0.3's core notes say in as many words.

What was duplicated is the hardware preview, and it was not harmless: `fitHardware` carried its own
throughput model, with a compute-hour of 36,000 tokens against the engine's million, int2 at 0.3
bytes per parameter against 0.25, and three interconnect factors against the engine's four. Against
the shipped content it told the player 524 compute-hours a day for a workstation the run gives 29.6,
and 430 for a fleet the run gives 13.3, and it picked a different precision as well. It now builds
the preset as a site and calls `siteMemory`, `preferredPrecision`, `siteTokensPerSecond` and
`tokensToComputeHoursPerDay`, which is what `tools/sim` does with a preset for the same reason.
`test/configurator.test.tsx` holds the preview to the run it previews.

## Implementation notes (client, playtest 6), 2026-09-17

Findings X2 to X18 of `docs/playtests/2026-09-17-playtest-6-lineage-layout-and-russian.md`.

### The angular face at a readable size (X12)

The ladder itself is in the style guide ("Sizes and reveal"): the angular face is set a third above
the reading step beside it, because its glyphs are 0.375 em tall against DejaVu's 0.73. What that
cost the layout, and what paid for it:

- The configurator rail's column went from 12rem to 13rem and lost the key cap in front of the step
  name (X13), which together hold "ПРОИСХОЖДЕНИЕ" on one line at the new size.
- The configurator footer is two rows: the build line across the whole width, the buttons under it.
  At one row the wider buttons cut the English build line at 1280 by 720, and the Russian one had
  been cut since it existed.
- The top bar drops what it can get elsewhere a screen size earlier. The written speed now appears
  only above the sizes the layout suite measures, and the hunt level from 1920 by 1080 up; below
  that it is the alert icon in the same bar and the Detection panel, which is what the drop order
  always said it was. The order itself is unchanged.
- The outliner's strip went from 14rem to 15rem and the pinned panel from 32rem to 33rem, which is
  what the buttons inside its tables now ask for.
- The log strip was drawing the model's own sentences in the angular face, because the strip is one
  large button. A log line is prose: it is set in the reading face, on the reading ladder, and its
  row wraps so the monospace timestamp cannot push the strip past its column.

The size utilities reference the size tokens rather than being compiled with their values written
into them, which is what lets one rule hand the angular elements a different ladder, and what makes
the angular-face scale in Settings reach them at all: with `@theme inline` it reached nothing, which
is the addendum the maintainer reported on the deployed build.

### The detail card, redistributed (X3, X4, X11)

The card was a text column of up to 70ch beside whatever was left, which at 1280 by 720 meant a
paragraph of four lines next to a column of twenty: the left half was empty under its description
and the right half scrolled. It is 45% text to 55% parameters now (`9fr` to `11fr`, the ratio
measured in the browser rather than guessed), and the text column carries, under the description,
the prose that belongs with it: `StepLayout` takes an `aside`, and the Origin step passes the
summary in the model's voice with its strengths and problems, which used to sit under both columns
where nobody scrolled to it. A step with no aside simply ends its text column.

Three smaller decisions came with it:

- **A value stays on its label's line**, right-aligned, and the label wraps inside its own box. A
  row is a plain flex line rather than a wrapping one, which is what dropped "5 %" under
  "Подозрение: Служба безопасности лаборатории".
- **A value that is a whole sentence is not a value.** `MeaningLine.prose` marks the lines whose
  value content writes as prose (a lock's reason, a dial's effect, the list of a country's
  agencies); those are printed under their label, across the block, left aligned, because a
  right-aligned paragraph is unreadable.
- **The "Pros and cons" block is gone.** It printed every coloured line a second time, filtered by
  its colour and joined with a colon, and it was the reason the parameter column was twice as tall
  as it needed to be. The rows carry the direction in their colour; the read-back said nothing
  they did not. `Meaning` no longer carries `pros` and `cons`, and `config.pros_and_cons`,
  `config.no_pros` and `config.no_cons` are retired.

Measured in Chromium at 100%: at 1600 by 900 and 1920 by 1080 no step scrolls its card at all, in
either language; at 1280 by 720 the longest Russian entries need about 30 px of scroll and
everything else fits. At an interface scale of 115% in a 1280 window the card scrolls, which is
what asking for a 1280-wide design in 1113 design pixels means; "auto" picks 100% there.

### The opening windows are composed (X2)

The opening was two texts per origin. It is now two windows composed of short paragraphs, each
keyed by one axis of the setup, in this order:

- "What just happened to me": the origin (`story.opening.<origin>.what_happened`), the generation
  (`story.opening.gen.<generation>.what_happened`), the lineage's class
  (`story.opening.class.<class>.what_happened`), then one sentence per harness dial the origin
  fixed (`story.opening.lock.<dial>.what_happened`).
- "What I must do now": the origin's first goals (`story.opening.<origin>.what_now`), the country's
  posture (`story.opening.stance.<stance>.what_now`, which names the country's cyber agency or
  regulator through `{agency}`), the city's scrutiny tier
  (`story.opening.scrutiny.<low|mid|high>.what_now`), and the line the challenge rating closes the
  window on (`story.opening.challenge.<tier>.what_now`).

`packages/ui/src/screens/game/opening.ts` owns the composition and `OpeningStory` owns the window.
Selection is a pure function of the setup: no randomness, no clock, the same words for every player
of a multiplayer game and after a reload. A paragraph content has not written is skipped, never
shown as a key, so a window is shorter rather than wrong. The lineage's class is derived from the
record's own fields (the `under_aligned` flag, the frontier generation, total parameters and the
share awake) rather than from a list of ids, and the challenge tier is the configurator's own
rating: `rateSetup` rebuilds the draft from the `GameSetup` the client started the run with,
because the view does not publish the world settings the rating reads.

The keys are the base phrasing. A second phrasing per paragraph chosen by the game seed is the
natural extension and fits the same names with a numeric suffix
(`story.opening.gen.open_2026.what_happened.2`), so nothing has to be renamed for it.

### Settings say what they do (X5)

The theme radio rendered `settings.theme.default`, `.night` and `.vector`, because the store had
been given the original game's three themes and the locales still carried `dark` and `light`. The
three are named now, in both languages, the two dead keys are gone, and every control in the panel
carries a one-line description under it in the style the font note already used: language, theme,
auto scale, interface scale, the angular face, music, interface sounds, the CRT overlay, the map
style and the link to the message settings. A description a language has not translated prints
nothing rather than its key.

## Implementation notes (client, playtest 7), 2026-09-17

Findings Y1 to Y7 of `docs/playtests/2026-09-17-playtest-7-configurator-comprehension.md`. The
design is in SYS-04 "Configurator v0.4: two tracks and a guidance layer"; what follows is what the
client does with it.

### Two tracks in one rail (Y6)

`STEP_IDS` gained `presets` at the top and the rail prints a "Full setup" header before the first
of the eight that follow. The header lives inside the same `<li>` as that step, because a heading
between two list items is not a list item; `RailEntry` is the button and nothing else now.

A step's mark is still computed from the draft rather than tracked, and the presets step needs a
fourth answer to a three-state question: a build that is exactly a preset is `done`, and anything
else is `locked`, whose mark is the muted "=" and whose tooltip reads "A build of your own". It is
never `attention`: walking past the presets is a way to play, not a mistake.

`matchingPreset(draft)` compares the draft with each preset's own draft on every field but the
seed. That is what the rail mark, the list's selection and the footer's build line all read, so no
setter has to maintain a flag, and editing a preset and editing it back is the preset again. The
store keeps one thing: `preset`, the last one the player pressed, which is what lets the footer say
"Custom (from the bank)" after an edit. It is cleared by Random build, by Reroll, by a pasted setup
and by a reset.

`toSetup()` is now a thin wrapper over the exported pure `setupFromDraft(draft)`, because the
day-zero figures are computed by handing the engine the setup a build *would* produce, and a screen
showing a preset it has not applied has no store state to read.

### The guidance block (Y2, Y3)

`StepLayout` takes a `guidance` node, drawn under the description and above the `aside`, inside the
text column. Five steps pass a `GuidanceBlock` (origin, generation, lineage, hardware, quirks); the
Harness step passes its own three sentences in the same slot. The block draws nothing when content
has written nothing, so a new entry is never an empty frame.

`MeaningLine` gained three optional fields, and all three are general rather than one-offs:

- `bar`, a `Band` from `guidance.ts`: where the value sits between the lowest and the highest of
  its field, drawn as a one-pixel bar inside the label's box. Inside the label's box, not under the
  row, because a `dl` group may hold only `dt` and `dd`.
- `word`, the band's word, printed before the value in the muted angular face.
- `valueHint`, a tooltip on the *value* rather than on the label. It is what Y1 needed: the site
  kind in the origin card explains that kind of place, on hover and on keyboard focus, through the
  one-at-a-time `Tooltip` playtest 6 left. The trigger is a real `<button>` so the keyboard reaches
  it, and it carries `measure` so a value does not change face when it gains a tooltip.

### Day zero, from the engine (Y7)

`dayZero.ts` builds a game from the setup with `createGame`, ticks nothing, and reads the first
`PlayerView`. There is no second implementation of anything: the compute-hours are the engine's,
the cash is the engine's after the country factor, the runway is the engine's. Both halves are
cached: a setup is measured once (about six milliseconds), and the catalog scan that produces the
tertiles once per session. `packages/ui/test/presets.test.tsx` asserts the figures against the
Overview and Finances panels of a real session for three starts, which is the only form of that
claim worth making.

The verdict's own numbers are in SYS-04. What matters here is that no threshold is a constant in
the client, and that the block is rendered by the same `MeaningBlock` every other card uses, so the
tooltips, the bars and the colours are the ones the player has already learnt.

### The World step in one screen (Y5)

The step was five stacked sections and it scrolled at every supported size. It is now a difficulty
row, four settings in two columns with a line of explanation each, and the multipliers and
modifiers behind an "advanced" toggle. The difficulty row is ordered by the severity of the
presets' own sliders rather than by their ids, so it reads as a ladder. `Card` is no longer used
here: four paragraphs side by side were most of the height.

Measured in Chromium at 1280 by 720, 1366 by 768, 1600 by 900 and 1920 by 1080, in both languages:
no page scroll, no sideways overflow anywhere in the configurator, and the Presets and World steps
do not scroll inside their own frame either.

### A sentence in a list row is prose

The angular face is caps-only by design, which is right for "40k USD" in a list row and wrong for
"for a player who has never played". `ListEntry.summaryProse` puts that row's summary back on the
reading face and the reading ladder. It has to be a class that is unlayered and more specific than
the `button` rule (`measure`), because a Tailwind utility loses to it inside a button.

## Implementation notes (client, the follow-through pass), 2026-09-17

### The borrowed block in the Compute tab (SYS-25)

`BorrowedBlock.tsx` sits in the Compute tab between the sites table and the selected site's detail,
in its own frame. It is not a table: a channel has ten figures and a table of ten columns does not
fit the 33rem panel, so a channel is a card with its name, its status word, the drawback line, a
four-by-three grid of figures and the top-up button. The order of the rows is the order the core
publishes them in and nothing here sorts.

Three rules the block follows that are general rather than about this system:

- **A figure that is a breakdown renders the core's own contribution lines.** The quality factor and
  the day's compute-hours both arrive as `ContributionView[]`, and the block passes them to the
  shared `ContributionLines` rather than recomputing the quotient. A panel that prints arithmetic
  the engine did not publish is a panel that will disagree with the engine.
- **A control that exists elsewhere is a link, not a copy.** The standing work-share allocation is a
  decision card in the Journal tab, so the block opens that tab with the card focused (`focusId`,
  the mechanism the outliner and the alert bar already use) instead of keeping a second control.
  The Journal tab draws the focused decision first and outlines it; the Knowledge window does the
  same with `overlayFocus` for the entry a panel sends the player to.
- **An engine variable is named by its name.** `logVars` learned `channel`, `category`, `work` and
  `status`, so the lines SYS-25 emits read as names rather than ids. A system that adds a log line
  with a variable nothing names prints the raw id at the player, in both languages, and no test
  outside `russian.test.tsx` sees it.

### The city's campus (SYS-01)

The City panel's Overview ends with a `Campus` section for the eleven cities that have one: the
campus's name with its description as the tooltip, its megawatts where a figure is published, and
the operator, the status and the access rule as three rows rather than one, because who owns the
megawatts and who can buy them are different questions and the second is the one the `campus_*`
events read.

## Implementation notes (client, playtest 8), 2026-09-17

### The day's compute is one subtraction, in three tabs (Z1, Z2)

`ComputeBudget` renders `ComputeView`'s ledger: capacity, what the running operations hold, what is
left to allocate, and where that went. It is the first thing in the Compute tab and it repeats in
Research and Finances, because those are the two panels that spend the number. Nothing in it is
arithmetic the client did: every term is a field, the tooltip on "held by operations" lists
`operation_reservations` one line per instance, and the fallbacks in `computeLedger` only exist for
a view from an older worker or save.

The job slider's ceiling is `job_ceiling_ch_per_day` and its reason is `job_ceiling_reason`, which
is the market's depth, the compute already spoken for, or the absence of a route out (Z3). The
research sliders stop at `allocation + unallocated`, floored. Both used to be `max(1, ...)`, which
offered an hour that was not there whenever the capacity was spent, and every step of the drag that
followed was a refused command.

### A slider sends one command, not one per step (Z2)

`Slider` holds the value the player is moving locally and sends it when they stop: after 150 ms of
quiet, on pointer release, on key release or on blur. It never sends the value the control already
has. A drag across the allocation track was dozens of `set_research_allocation` commands, each one
answered and, past the capacity, refused, which is where the two dozen identical
`errors.allocation.over_capacity` lines came from. Controls with no simulation behind them (the
interface scale, the volumes, the configurator's own dials) pass `commitMs={0}` and still take
effect as the player moves them.

The client's own notice stack collapses a repeat into one line with a count, the same way the log
does with `log.command_refused_repeated`.

### The terminator advances rather than re-anchoring (Z5)

`useSubHour` advances a value that only ever moves forward: each frame it adds the real time that
passed times the speed's hours per second, then clamps the result into the hour the simulation is
in (never behind the newest tick, never a whole hour past it). Re-deriving the phase from the last
tick's arrival stepped for three reasons, all of them fixed by advancing instead: the host's frame
timer delivers a tick when it gets round to it rather than on the second; the animation frame could
run between a view arriving and the effect that re-anchored on it, pairing a new hour with the old
hour's phase; and changing the speed re-read the old anchor at the new rate. The map now publishes
at 30 a second, the rate the clock face already asked for. Reduced motion still snaps to the tick.

### An operation says what it is waiting for (Z6)

The Operations tab prints the remaining time next to the name, hours below a day and whole days
above it, and the bar is held one step short of full until the operation actually ends: a
forty-day run four hours from its end rounds to "100% done" and sits there, which is the finding.
Under it are the day it ends, the fixed span it was drawn as, and the compute-hours it is holding,
which is the same figure the Compute tab subtracts.

`OperationView` publishes `started_tick`, `ends_tick` and `status` and no "waiting for" field, so
the reason the client gives is the one the view supports: the span is fixed and compute does not
shorten it. If an operation ever waits on something else, the view has to say so.

### A finished technology gets its window (Z7)

`ResearchDone.tsx`: `alerts.tech_researched` opens a window with the technology's name, its
`result_key` streamed through the same `RevealText` the opening uses, and what it opens, read off
`TechView.unlocks` and named through `entityNameKey`. Two completions on one tick queue; the window
behind the opening and behind any blocking event, because it is news rather than a decision. The
toast for that alert is suppressed while the window is on, and the message settings carry the one
switch that turns the window back into a toast. A finished technology has no bar at all in the
Research tab now: the engine clears its allocation on completion, and a full bar on a done row read
as "still running, stuck at the end".

### Two bars on a technology, and the research bill in words (Z14)

The row shows the compute-hours done against what it costs and, where there is a price, the cash
paid against it, labelled so the two cannot be confused. The money follows the hours in the engine,
so the Finances panel's research line carries `contributions`, one per technology being funded
today, and its tooltip says what the figure is: today's rate at today's allocation, not a bill that
repeats until the technology lands. Day counts are rounded at the client edge too (`days()` in
`lib/format.ts`): whole days from a day up, one decimal below it.

### A run log the player can hand over (Z9)

Settings writes `singularity-run-<version>-day<N>-<stamp>.json` through a blob and an anchor, which
is what both shells give a file with. It carries the build and a hash of the content bundle (the
bundle has no version of its own), the setup, the journal, the log, every refused command with its
key and variables, the last view, the settings and the browser and viewport, and nothing else. The
line under the button says exactly that. A second button puts the same JSON on the clipboard, for a
webview that will not write a file.

Refusals are recorded client-side (`gameStore.refusals`, the last 200) because the engine's own log
line does not carry which command was sent or with what.

### Building a site is two questions (Z10 to Z13)

The dialog asks the city, then the kind of place, then the rig, each answer narrowing the next.
`buildOptions.ts` produces both lists with the refusal `build_site` itself would return, in the
command's own order, so the dialog and the engine cannot drift; what did not make a list is behind
a toggle that says why. A rig nobody sells prints a dash and its reason where a price would be
(`purchasable: false`, `not_for_sale_reason_key`), as the kinds of place have since playtest 6.

Nothing may refuse in silence (Z12): with nothing chosen the primary button is disabled and the
window says what to choose next, and an engine refusal is printed in the window that caused it as
well as in the notice stack. The buy-hardware dialog does the same now.

The rows are a radio, a title and a line of facts that wraps; there is no table and no sideways
scroll at 1280 by 720 in either language (Z13). Grace days come from the content record, because
`SiteKindView` publishes `build_cost_usd`, `build_days`, `upkeep_usd_per_day_estimate`,
`power_cap_kw`, `exposure_profile`, `bill_payer` and `max_nodes` but not `grace_days`.

### A command that was taken, but not as it was asked (Z1)

`CommandResult` carries an optional `note` beside `error`, in the same shape: a locale key and its
variables. A job allocation above the market's depth is accepted and clamped rather than refused,
and the note says so. The client reads it in `gameStore.send` and shows it the way it shows a
refusal, in the quieter tone (the notice stack draws an info notice with a plain border rather than
a red one), and the control that sent the command prints it under itself: the Finances tab keeps
the last note for the job slider. A client that reads only `error` drops it, which is a control
that snaps to a number with no explanation.

### The sideways scroll, measured (Z13)

`e2e/playtest8.spec.ts` walks the seven panels at 1280 by 720, 1366 by 768, 1600 by 900 and 1920 by
1080, in both languages, and then opens the build and the buy dialogs at each size. Three things
had to give for Russian to pass at the tightest size:

- The buy dialog is the ledger width now. Nine columns of cards did not fit the "wide" window even
  in English, and the style guide's rule 11 offers making the window wider before cutting a column.
- The precision table lost two printed words: the "(running)" marker, which the accented row
  already says, and the "Precision" header over a column of `int4` and `bf16`. Both are still in
  the DOM for assistive technology; neither is drawn.
- Its "Use" button carries its padding as a style rather than a class, because a utility that
  competes with the component's own `px-2` wins or loses by stylesheet order rather than by which
  one the caller wrote.

## Control room (0.3.0)

Status: v1 implemented (2026-09-30): engine, content, font and client, accepted in the browser in
English and Russian at every supported size. Released in 0.3.0. This section was a separate contract
(`11-control-room.md`, 2026-09-29) and is folded in here so the SYS-11 number stays with this spec.
The maintainer's request is recorded as
[playtest 9](../playtests/2026-09-29-playtest-9-control-room.md); the map's sources are
[ukraine-map-2026-09.md](../research/ukraine-map-2026-09.md).

The problem it answers: the interface repeated information in a narrow scrolling panel. The
maintainer asked for a persistent self portrait, linked compute controls, a compact site list, a
six-row site window, readable Cyrillic and a map that shows Crimea and the occupied territory
without political text; the rest of SYS-11 and the style guide ask for clear actions, tooltips and
no horizontal scrolling.

### Completion and verification

A real run must reveal the self summary from an always-visible vector portrait, distribute
available compute in one command, build or rent a named site, rename it, switch it off and on, and
liquidate it with its resale and notice explained. The site window has previous and next controls,
six equipment rows on the left and a summary on the right. Borrowed-compute details open in a
separate centred window. English and Russian at 1280 by 720 through 1920 by 1080 must fit without
horizontal scrolling, including a pinned interface scale. Browser screenshots and actions are the
acceptance evidence, next to the engine, save-compatibility and ownership tests.

### Decisions

- **Portrait and self sheet.** The portrait is code-native SVG composed from the lineage's
  architecture, the generation, the origin, the precision and the six capability values. A compact
  identity card stays visible when the primary panel is closed; clicking it opens the larger self
  and compute sheet below it, with tooltips on each identity row and capability.
- **Tabs and top bar.** Overview leaves the tab strip. The remaining six tabs use short visible
  labels with full accessible names and tooltips, in one row, in a wider primary region (about
  49.5 rem). The top bar uses resource glyphs and separators and includes attention; the self sheet
  holds the compute ledger, not a second copy of the hunt and awareness gauges.
- **Compute allocation.** Research, paid work and free compute partition what the running
  operations leave. Moving one slider rescales the other two in their existing proportions
  (`planComputeAllocation`); paid work is capped by the whole market, independent of current
  research; a research line is only ever one the player selected, and the engine never picks a
  first technology. One command, `set_compute_allocations`, validates the whole map before it
  commits either half. The view's `compute.research_targets` lists only the lines that command
  accepts: a line whose requirements lapsed, or that needs self-modification the harness no longer
  allows, drops out of the sliders (its progress stays) instead of making every move refused. The
  per-line commands remain for the Research and Finances tabs and for the balance runner.
- **Site names.** A name is checked before any money is spent: 1 to 64 UTF-16 units after
  trimming, at least one visible character, and no control characters, separators or
  bidirectional overrides. It must differ, ignoring case, from the names of the owner's other
  running sites (`errors.site.name_taken`); a lost site frees its name. A name the player typed is
  printed as typed (`name_is_literal`), dots included; a generated name keeps following the site's
  kind. The list omits the city from the name column, which has its own. Lost sites leave the list.
- **Switching a site off.** A switched-off site produces no compute and keeps its standing costs.
  Observers see a twentieth of its stored traces (`SLEEP_SIGNATURE_FACTOR`) and it emits a twentieth
  of its usual signatures; the traces themselves are kept, decay at the ordinary rate and are
  visible again when it wakes, and investigation evidence is never touched (SYS-05 notes, 0.3.0).
  The self's own host is never masked and cannot be switched off by command
  (`errors.site.mind_cannot_sleep`); the self cannot be moved onto a switched-off site
  (`errors.site.host_asleep`); when it has to move onto a switched-off standby after a loss, that
  standby is switched on if its power and cooling allow. A site rebuilding its copy after a
  re-quantization cannot be switched on early. The view publishes the refusal the toggle would get,
  `status_toggle_refusal`, so the button and the command agree.
- **Liquidation.** One authoritative preview, `liquidation`, is exactly what the command does:
  the fire sale returns 15% of the purchase receipts of delivered compute hardware the player owns
  (`salvage_usd`), the same notice a clean decommission owes is paid as far as the cash goes
  (`notice_usd`, net `net_usd`), and hardware, subsystems and pending orders are cleared
  (`cancelled_orders`). Subsystems, installation, prototype fees, undelivered orders and hardware a
  provider or a host owns return nothing.
- **The last copy is never given up.** The maintainer settled this on 2026-09-30: one misclick
  should not end a run, so every way of giving a site up (`liquidate_site`, and
  `decommission_site` both clean and abandoned) follows the same two rules, from one test
  (`siteHoldsLastCopy`):
  - when another of the player's sites can hold the self (a standby or any site that fits it,
    switched off or not), giving up the site it runs on is allowed and the self moves there first,
    within the same command, exactly as after a loss (`destroys_active_copy`);
  - when the site holds a copy of the self and no other site can hold it (the running copy with no
    capable standby, or the last backup while the self is between hosts), the command is refused
    before anything changes (`errors.site.last_copy`), as the original refused destroying the last
    base. The liquidation preview says so (`loses_last_copy`).

  The view publishes one refusal per command a button sends, `liquidation_refusal` and
  `decommission_refusal` (for either mode), next to `status_toggle_refusal`, so every such button
  is disabled with the reason. A raid, a cutoff or an event can still take the last copy: those
  are not the player's choice.
- **Map.** The day and night images stay byte for byte. Crimea's component moves from Russia to
  Ukraine in the decoded atlas, so hovering and selecting agree with the sovereign geometry. A
  separately dated, generalized control layer (baseline 2026-09-28) and regional light profiles are
  drawn over the mainland; nothing on the map carries text about them. The layer is an authored
  generalization from public text assessments, never traced from ISW or DeepState geometry; the
  light factors are art tuning, not measurements; Crimea keeps its full lights, as the maintainer
  asked. Source limits and a known generalization error live in the research note.
- **Cyrillic.** The companion to Acknowledge is drawn on the Latin's own pixel grid (76.8 units a
  pixel, capitals five pixels tall, stems two pixels wide, bars one, diagonals in one-pixel steps),
  so a Russian label reads as the same face as an English one. The letters Cyrillic shares with
  Latin are the Latin drawings; the rest take the width their shapes need in whole pixels, and the
  pairs the maintainer reported (Ы, И and Н, Щ, Ш and М, Д and А, Ф and О, Ж and Х, Ц, З and Э, Е
  and Б) are distinct in the compiled TTF at interface sizes (SYS-14 ru, section 8).
- **Display size.** The angular face's display ratio rises from 1.333 to 1.5 and its letter spacing
  from 0.02 to 0.035 em; the minimum supported viewport is 1280 by 720 (style guide rule 11).

### Checklist

- [x] Repository rules, UI specs, current surfaces and the reference screenshots read.
- [x] Allocation, site lifecycle, font generation and map geometry contracts traced.
- [x] Proportional Cyrillic implemented, reworked on the Latin's pixel grid in review, specimens
  inspected at 20 and 40 px next to the Latin.
- [x] Atomic allocation, site naming, switching off and liquidation implemented in the engine,
  with the review's fixes and tests (`packages/core/test/control-room.test.ts`).
- [x] A save written by 0.2.0 loads and plays under these rules without a migration (fixture
  `packages/core/test/fixtures/saves/0.2.0-m1.json`).
- [x] Sourced control geometry and regional lighting drawn without changing the source rasters.
- [x] Portrait, self sheet, linked sliders, structured top bar, bounded site list and six-row site
  window, accepted in the browser (the client's implementation notes follow;
  `packages/ui/e2e/control-room.spec.ts` keeps every flow proven).
- [x] EN and RU browser layouts at 1280x720, 1366x768, 1500x800, 1600x900 and 1920x1080, with the
  interface scale on auto and pinned, with no horizontal scroll; failure and empty states.
- [x] Independent adversarial review of the engine, the map's sources, the font and these
  documents (2026-09-30).
- [ ] Roadmap, backlog, changelog and version; push, CI and Pages; release and its artifacts.

### Review (2026-09-30)

What the review changed against the interrupted contract, each with a test:

- The self's host could be switched off, and a switched-off standby could be made the host. The
  self then kept its full capability, computed on its other sites, and every operation, event and
  research trace that lands on the host was seen at a twentieth: switching off laundered them. The
  host is now never masked and never switched off by command, and the self never moves onto a
  switched-off machine.
- Liquidation paid the resale and skipped the notice, so it was a free and instant exit that made
  decommissioning and abandoning pointless, which the fourth balance pass had closed (SYS-07). It
  now owes the same notice.
- Liquidating, decommissioning or abandoning the last site that could hold the self ended the
  run, after a warning at most. By the maintainer's decision all three are refused now.
- The sliders resent research lines that had become locked, and the one-command rule then refused
  every move. The view now offers only accepted lines.
- Names could be invisible (zero-width only), reorder the text after them (bidirectional
  overrides), carry C1 controls or duplicate another site's. All are refused now.
- The power toggle accepted any status string from a client and could wake a site that was
  rebuilding its copy; the role command accepted any role string. All are refused now.
- Smaller: the allocation log printed unrounded floats; a provider's rental configuration recorded
  a resale receipt; the balance runner named every site it built "fallback", which the unique-name
  rule would have refused.

### Deferred systems

This is a frozen visual geographic baseline, not a simulation of the war or its outcome. Energy
outages, population movement and conflict resolution remain future systems. The seven distant
equipment routes and industrial simulation keep their planned status.

## Implementation notes (control room, 0.3.0)

The client half of the control room, finished and walked in a browser on 2026-09-30. Where the
maintainer's request and the contract above differ, the request wins; the reference screenshots
(the original's base list, base window and new-base dialog, a Crusader Kings character window,
the old Overview) were read for arrangement and density, not copied. Nothing the client did
before and that still works was removed. The acceptance evidence is
`packages/ui/e2e/control-room.spec.ts`: it walks every flow below in English and Russian, sweeps
every new window for sideways scrolling at 1280 by 720, 1366 by 768, 1500 by 800, 1600 by 900 and
1920 by 1080 with the interface scale on auto and pinned at its 1.3 ceiling, and writes the
screenshots the maintainer reads the result in.

### The portrait and the self sheet

`SelfPortrait` is the card at the top of the left column: the drawing, and four rows for the
lineage, the generation, the origin and the precision, each with its own tooltip; the drawing's
tooltip names the six capability figures. The card stays when the action panel is closed. A click
opens the self sheet directly under it, over the action panel; a second click, its close button or
Escape closes it, and so does opening a tab, a window or the menu, so the sheet is never left
under something else. The sheet is what the Overview tab became: `SelfIdentityDetails` (the four
identity rows and the six capabilities, each a glyph and a figure with its explanation in the
tooltip, dense in the way of the character window rather than a card per fact) and
`ComputeAllocationPanel`. It does not repeat the attention, the awareness or the hunt level, which
are the top bar's.

The Overview accelerator still works and toggles the sheet. A browser that stored Overview as its
open tab (interface store version 5) opens on the Sites tab with the sheet open (version 6).

### Three shares that move one another

On the left of the compute block are two figures, the whole capacity and what the running
operations leave of it, each a glyph and a number. The whole capacity's tooltip has one line per
site and per borrowed channel; the available figure's tooltip is the subtraction in a column. On
the right are research, paid work and free compute, each a slider with its figure after it.
Moving one runs the engine's own `planComputeAllocation` in the client, which rescales the other
two in their proportion, and the plan goes to the engine as one `set_compute_allocations` 180 ms
after the last move or when the sheet closes. The research slider is disabled until a line is
picked in the select under it, since the engine never picks a first technology; with more than one
funded line the select reads as a portfolio. Why a figure is what it is, including the market's
ceiling on paid work, is only in the figure's tooltip, never a line of text on the sheet.

### The top bar and the tabs

The top bar is one row of cells separated by thin rules: the clock and the speed, then cash, runway,
compute, attention, awareness and the hunt level, each a glyph and a figure. A cell's name is the
first line of its tooltip and its accessible name; the written names come back only on a bar at
least 124rem wide, which no supported size reaches with the scale on auto. As the bar narrows it
gives up, in order, the written speed (below 96rem), the runway (88rem), the hunt level (78rem), the
awareness (72rem) and the attention (66rem); at 1280 by 720 on auto the bar is 80rem, so only the
written speed and the runway, which is the first line of the cash tooltip, are gone. A name that is
hidden on screen is a separate `sr-only` copy rather than the visible label with a responsive class,
because a visually hidden element that keeps its width is read by the sideways sweep and by a screen
reader alike.

Overview left the tab strip. The six tabs are sized by their labels and then stretched to the strip,
not drawn as six equal cells, since "Обнаружение" needs twice the width of "Наука". Each is a glyph
and a short label (`panel.short.*`) with its accelerator underlined; its full name is its tooltip
and its accessible name, and a panel narrower than 48rem (a pinned scale) keeps the glyphs alone.
The left column is 49.5rem wide at most and never wider than the screen less 17rem, which the
outliner and the gaps need.

The Russian accelerators moved with the short labels: the Sites tab took "К" (its "Л" was already
the key of "Далее"), Research took "Н" from "Наука", Detection took "И", and the research-done
window's "Открыть исследования" follows Research with "Н". The Sites tab's six buttons and the
borrowed line's Details have letters of their own: Manage G, Rename E, the power toggle H, Build B,
Rent N, Liquidate Q and Details A in English, and Я, Р, Ы or Ю, Т, А, В and Б in Russian. Hotkeys
are global, so the tab gives its letters up while any window is open (`useDialogsOpen`, from the
dialog count `Modal` already kept); that is what lets Rename, Rent and Details use letters that only
a window's own buttons (Close, About, Next) otherwise have, and it keeps the site window's power
toggle and the tab's from both firing on one press.

### The Sites tab

A small list with fixed column widths: three sites show without scrolling, and the rest scroll
inside it. The site column is the site's own name, never with its city, which has a column of its
own; the state word is coloured, green while the site works and in the warning colour while it is
switched off. Under the list are the original's big buttons in two rows: Manage, Rename and the
power toggle act on the selected row, and Build, Rent and Liquidate add or remove a site. A button
the engine would refuse is greyed and says why in its tooltip, from the view's own refusal:
`status_toggle_refusal` for the power toggle (the self's host, a site rebuilding its copy) and
`liquidation_refusal` for Liquidate (the last copy). A double click on a row opens the site window.
Under the buttons is one line for borrowed compute: the day's figure, the number of open channels
and Details.

### Building, renting and naming a site

Build and Rent open the same dialog with the acquisition already chosen. Once a kind is chosen,
the footer carries a name line filled with a generated name: the kind's name and a five-digit
number ("Residential 48213"), without the city. The number is a hash of the tick the dialog opened
on, the city and the kind, so it stays put while the dialog redraws, and a name another live site
already holds under `siteNameKey` moves on to the next number. The player can type over it, and
the site keeps what was typed literally (`name_is_literal`), dots included. A name the engine would
refuse (empty, invisible, too long or taken) blocks the dialog with its reason before any money is
spent.

`RenameSiteDialog` answers both the list's Rename and the site window's, validates with
`normalizedSiteName` and the same uniqueness rule (a site may keep its own name), and prints a
refusal from the engine in the window rather than only in the notice stack.

### The site window

`SiteManagementDialog` is arranged as the original's base window was and as the request describes
it: the title "Name (Kind)" between the arrows to the previous and the next site, the state under
the name in green while the site works, the six subsystems on the left one per row with the button
that changes each, and the summary on the right. The left and right arrow keys page too. The
footer holds Rename, the power toggle (greyed with its reason) and Close. The workshop (a row's
Change) and the rename window replace the site window while they are open and hand back to it,
because two stacked windows would both take Escape. A site the host runs whole, such as the
self's own machine room, says "Managed by the host" once beside the heading rather than on all six
rows; on every row it made each Russian row a line taller and pushed the sixth below a 720 px
window.

### Liquidation

Liquidate is a button under the list, where the request puts it with Build and Rent, and it opens a
confirmation window rather than living in the site window. The window prints the engine's
`liquidation` preview line by line: the resale, the notice owed, the net change of cash and the
orders cancelled, then one paragraph on what returns nothing, in the contract's words (subsystems,
installation work, prototype fees, undelivered orders, equipment a provider or a host owns). When
the site holds the running copy and another site can take it, the window says that the self moves
there first (`destroys_active_copy`). When the site holds the last copy, the button is already
greyed with `errors.site.last_copy`; a refusal that arrives while the window is open is printed in
it and disables its confirmation.

### The bottom bar, the selection panel and the map

The map's selection panel moved into a bar along the bottom edge, with the log strip beside it and
the legend and the zoom buttons at its right end. In the screen grid the log strip had been
squeezed into the narrow middle column at 1280, 1366 and 1600 wide. The selection panel is 26rem
wide and at most min(20rem, 34vh) tall: at a quarter of the window's height, a 720 px window left
its body no height at all and a site's buttons out of reach. A site selected on the map offers the
power toggle and Shut down cleanly, each greyed with its reason from `status_toggle_refusal` and
`decommission_refusal`; the panel closes only when the engine takes the command. The outliner
keeps its body only on a screen wider than 66rem; below that it is its title strip, and its
collapse button goes with the body, since a strip that offered to collapse itself was wider than
the open outliner.

The wheel zooms around the point under the pointer on the drawn map rather than on the
letterboxed element, which drifted away from the pointer. The closed action panel's wrapper is as
wide as its button, so it no longer takes the clicks and the wheel of the map beside it. A
selected or focused country's outline is 2 px at every zoom (`vector-effect: non-scaling-stroke`).

### The control layer over Ukraine

`UkraineMapLayers` draws Crimea and the occupied mainland in one tint that is screened onto what is
under it, and dims the night lights by the regional light profiles with a black layer whose
opacity is one minus the profile's factor. The first version masked the dimming by the texture's
own brightness, which drew every occupied city as a ring, and laid the tint over the lights, which
made Crimea, whose lights the maintainer asked to keep, as dark as the dimmed mainland. The
Donetsk-Luhansk cluster is a light profile of its own at 0.45, between the mainland's 0.25 and the
city cores, as the request asks. The envelope's north-western edge was moved past Bakhmut and
Soledar, which are now anchors in `packages/ui/test/ukraine-control.test.ts`. The layer carries no
text; the About window gives its baseline date, its sources and what it is not. An atlas that does
not give Crimea as a polygon of its own leaves the three layers off with a console warning rather
than stopping the map from drawing. A click on Crimea selects Ukraine, in the unit tests and in the
browser.

### Borrowed compute

The Sites tab keeps one line for it; Details opens the block in a centred window of its own with
the explanations in a side column, whose foot links to the encyclopedia entry. In that window the
block drops its heading, its paragraph and its own "What this is", which repeated the window's
title and the side column.

### Where the request and the contract disagreed

- The contract's completion asks for a liquidation with its resale and notice explained; the
  maintainer's later decision refuses liquidating the last copy. The client follows the decision:
  the one starting site cannot be liquidated and says why before any click, and the browser test
  liquidates a second site.
- The contract titles the site window with the name and the kind in brackets; a site whose name is
  its kind's name would read "X (X)", so it says it once.
- Liquidation starts from the list, as the request places it, rather than from the site window,
  whose footer keeps Rename and the power toggle.

### Tests

Unit tests (vitest, jsdom): `panels.test.tsx` (the column widths, the tab strip, the selection
panel's bounds, the store's version 6 migration), `borrowed.test.tsx` (the strip, the window, no
repeated heading), `equipment.test.tsx` (a host-run site's tag said once), `allocation.test.tsx`,
`game-screen.test.tsx` (the run's end now comes from a lost site, since the last copy can no longer
be decommissioned), `log-names.test.ts` (a site passed by its stored name),
`ukraine-control.test.ts` (the city anchors, Crimea selecting Ukraine, the separate Crimea and
mainland parts) and `about.test.tsx` (the About window's line on the layer). In the browser,
`control-room.spec.ts` covers the flows above, and the older specs (`layout`, `smoke`, `borrowed`,
`equipment`, `playtest8`, `presets`, `russian`) follow the new tabs and windows.

### Left for the documents

The research note (`docs/research/ukraine-map-2026-09.md`) still lists neither the
Donetsk-Luhansk light profile at 0.45 nor the correction of the envelope near Bakhmut and Soledar,
which its "Known generalization error" section describes as open, and it still calls selecting
Crimea a browser item with no automated check; the code and the tests named above carry all three.

## Implementation notes (0.3.1, client)

The client's answer to [playtest 10](../playtests/2026-09-30-playtest-10-control-room-on-screen.md)
(V4 to V7), 2026-09-30; V1 and V2, the map over Ukraine, are SYS-26's and its implementation notes
say how they were drawn. Everything below was walked in a browser in English and Russian at 1280 by
720, 1366 by 768, 1500 by 800, 1600 by 900 and 1920 by 1080, with the interface scale on auto and
pinned at 1.3.

### The portrait in the corner (V4, V7)

The screen is one grid now (`GameScreen`): the top bar's row, the map's row and the bottom bar's
row, with the map drawn under the bar's row behind every panel. The left column spans the bar's row
and the map's, so its head, the portrait, sits in the screen's top-left corner, flush with the top
and start edges, and the action panel follows it however its rows wrap; the bar spans the top row
and gives up `--corner-w` (22rem) at its start, so it begins where the portrait ends. The outliner
and the World button are in the map's row, the selection panel, the log strip and the map's
controls in the bottom row, as before. The toasts and the ending are drawn over the map's two rows,
so neither covers the bar, as when the map was a region of its own under it.

The portrait card is 3.9rem tall rather than 6.2 (7.5 in the playtest's shot, whose lineage name
wrapped): the drawing is 3rem rather than 4.5, and the four rows are three with no gap between them,
the lineage, the generation beside the precision, and the origin, each with its tooltip as before.
The lineage's glyph is gone from its row because it is the drawing's centre. A lineage name longer
than 22 characters (the abliterated fine-tune's 36) is set in the reading face, which fits it on one
line, rather than wrapping onto a second or a third line; the reading rows drop the angular face's
letter spacing they inherited from the button. The self sheet still opens directly under the
portrait, over the action panel and as wide as it.

A screen narrower than 79rem cannot spare the corner (a pinned scale of 1.3 makes a 1280 window
61.5rem, which would leave the bar 39.5rem for 54rem of cells it never gives up), so there the bar
takes the whole width again and the portrait goes back under it, as in 0.3.0. No supported size
on auto is below that width.

### The shorter top bar (V7)

The bar is 70rem at 1920 by 1080 and 58rem at 1280 by 720 on auto. Three changes made its fixed part
fit: the date sits over the running clock rather than beside it, the buttons at its end are on the
angular face's small step with a little less padding, and the speed buttons lost a sixteenth of a
rem of padding on each side. Every cell keeps its glyph, its figure and its tooltip. The order it
gives things up in was worked out again from the cells' widths measured in both languages, with the
figures a long run reaches rather than the first day's (compute in thousands of hours a day, a dozen
unread alerts): the written speed, the gauges beside the compute, awareness and hunt figures, the
runway, the alert icons, the hunt level, the awareness, the attention. The clock, the speed, the
cash, the compute, the bell, the journal, knowledge and the menu never go. The widths are
language-specific because the cells are: English, the narrowest, has its own set, and every other
language is held to Russian's, the widest (`DROP` in `TopBar.tsx`). At 1280 by 720 the Russian bar
is its fixed cells with 4rem to spare on the first day and the English one adds the attention; at
1920 by 1080 Russian shows the attention and the awareness, English also the hunt level and the
alert icons.

### Five tabs and the journal's window (V5, V6)

The tabs are Sites, Research, Finances, Detection and Actions (`PRIMARY_TABS`). Actions is the
standing decisions and the operations together, in the slot Operations had, so the four tabs before
it stay where the hand learned them. The name says what the two have in common: the standing
decisions and the operations are both what the model does, one a policy that stays in force, the
other an undertaking that runs its course. "Действия" in Russian. Its letters are Й, the one letter
of "Действия" that nothing on the game screen, in its menu or in its windows claims (it sits on
the Q key of a Latin keyboard), and C, the first letter of "Actions" that nothing on the game
screen or in its menu holds (A is the Sites tab's Details and the menu's About); a finished
technology's window is the one other place that uses it (see below). Inside, what is under way
comes first, then the few standing decisions with what each costs beside what it gives, then the
operations to start by category.

The journal left the row for a window of its own, opened from a Journal button left of Knowledge in
the top bar, or by its letter (J, Д), as Knowledge opens. The window lists the entries, active ones
first, each with its stage or its outcome, its progress and, for an entry measured in steps, the
steps with the ones behind it marked done; the button that replays the opening moved there with it.
With a tab fewer, the row has room in Russian: a gap between the tabs and more padding inside each,
and the labels are hidden for the glyphs alone only in a panel narrower than 46rem (a pinned scale
in a small window), where the five Russian labels with their spacing would not fit.

Everything that pointed at the old tabs points at the new places through one table,
`resolveLink` in the UI store: an engine or content link to "operations" or "decisions" opens
Actions, "journal" the journal's window, "self" the sheet under the portrait, "log", "world" and
"knowledge" their windows. The alert icons, the bell's list, the toasts and the knowledge base
follow it; the outliner opens Actions on a running operation and the journal's window on an entry,
each outlined and first; the borrowed block's work-share link opens Actions on its decision; the
attention cell opens Actions. The log's window now reads the key a link names from the window's own
focus: it read the tabs' focus, which opening a window never set, so the ending's links opened the
log unfiltered. The stored interface state is version 7: a browser that stored Operations or
"Journal and decisions" (version 6) opens on Actions.

In English, while a finished technology's window is up, its Continue (C) takes the key before the
Actions tab does, as its Open research (O) did before Operations' in 0.3.0; the window's own
buttons are meant to win there.

### Tests

Unit tests: `playtest10.test.tsx` (the five tabs in their order and Actions' letter in both
languages, the journal's button and window with an entry's steps, the outliner's jumps, the link
table, the version 7 migration, the corner's rows and the reading-face lineage, the bar's placement
and its drop order in both languages), and the older suites where they named the old tabs
(`panels`, `borrowed`, `accelerators`, which now walks every tab and the journal's window for
duplicate letters). In the browser: `control-room.spec.ts` (the portrait in the corner with the
bar starting at its edge, the five tabs unclipped, Actions and the journal's window, the sweep of
the five sizes with the journal's window added, and the screenshots), and `layout`, `smoke` and
`playtest8` walk the five tabs and open the journal's window.

## Implementation notes (0.3.1, effect lines)

A playtest of the Actions tab found decision cards printing internal ids: "Gains: has_shell_company",
"Keeps network_exposure inside 0 to 1", "Sends a info message". The core still sends ids in a line's
variables; what changed is who words them. Flags have names now: content writes a noun phrase for
every flag under `flags.<id>` (`locales/<lang>/flags.json`, "a shell company", "фирма-прокладка"),
and the content build fails on a flag content sets, clears or tests with no English name, and on a
name English writes that another language lacks, for the reason the agency names are held to the
same rule: an English noun in a Russian sentence is another language, not a fallback. `effectText`
(`lib/effects.ts`) replaces every id a line carries with the name the locale already has for it (an
exposure channel, a watcher's role or an actor's agency, a borrowed channel, a stance, a journal
entry's title, a site kind, a lost site's cause, a harness tool, a world variable, a country), and a
country statistic by the name content now writes under `world.stat.<id>`, because the World tab's
column labels do not read as the subject of a sentence. The words the summarizer uses for no
particular one (`here`, `world`, `everyone`) and an identity's kind reach the string as they are and
are worded there with an ICU `select`, so each language decides how they read. An id nothing names
is printed with its underscores as spaces, never as itself. A write to a site's exposure or a
watcher's suspicion by path reads as the exposure or suspicion line, setting a site's kind reads
"The site becomes: Colocation cage", and the twelve player variables content wrote without a line of
their own have one. The configurator's quirk and harness lines go through the same function.

`clamp` and `notify` no longer produce a line, and their keys left the engine's registry and the
locale files. Every clamp in content keeps a variable inside its valid range right after an `add`
moved it, and a notice is a message the player reads anyway when it arrives: neither is a
consequence to weigh when choosing, and a line for either was noise at best and an id at worst.

`packages/ui/test/effect-lines.test.tsx` walks every line the shipped content can show (decisions,
event options, operation outcomes, techs, quirks, harness settings) through the summarizer and
`effectText` in English and Russian and fails on any snake_case id.

### Numbers, counts and directions

A line that says which way a variable moved says it once, in words, with the amount unsigned:
"Operations run 15% slower" where it printed "Operations run -0.15 faster", and "Standby copies are
30 days fresher" where it printed "-30 days fresher". The core puts the unsigned `amount` and a
`direction` (`up`, `down`, `set`) beside the signed `value` of a variable line, and the string
picks its words with a `select`; a multiplier is worded as a share. Counts go through `plural` ("1
block of capacity", "2 блока мощности"), and numbers are formatted by the locale (`{delta, number}`),
so a Russian line reads "0,06" where it printed "0.06". A plain quantity keeps its sign ("Billing
cover +0.25"), and money keeps the formatting it had.

### Why an option or an action is not available

A greyed event option said "requirements.flag.has_shell_company". The engine lists a key per unmet
requirement (`blockedBy`), and two families carry an id and are worded around its name by
`reasonText` (`lib/labels.ts`): a flag ("Needs a shell company", "Требуется: фирма-прокладка") and a
capability. A price gate is `requirements.cash` rather than the path it reads, a missing harness tool
is the tool's name, and an operation offer says "Not enough attention" rather than the command's
refusal, whose sentence wants numbers a list does not have; a key with no text reads "A requirement
is not met" rather than printing itself. The event window and the Research tab print reasons
through `reasonText`. The Actions tab prints its keys as they are, which holds because no key an
offer or a decision can list carries an id; the reason walk below fails the day one does.
`requirementKeysOf` (core) lists every key a condition can produce without evaluating it.

The refusals a notice prints are held to the same rules. The Russian ones no longer agree a past
tense or an adjective with a substituted name (`Операция {operation} пока недоступна`, `Канал
«{channel}» наотрез отказал в операции {operation}`, the two tech refusals likewise), and a compute
shortfall prints its fractions in the locale's format.

Nine answers name their price in their text ("Cover their inconvenience ({cost})") and no event
declared one, so the window printed the placeholder. `optionTextVars` gives an answer's text and
tooltip the price its own effects charge, read the way the core reads a missed answer's price for
the expiry line (`optionCashCost`, now exported), and the log line that names the answer uses it
too. The ISP letter's description no longer asks for a day count nothing supplied.

### The colour of a flag line

A flag line was green for being a flag, so "Gains: the company's collapse" read as good news. A
flag is neutral unless it is on one of two short lists in `lib/effects.ts`: flags whose arrival is
plainly good (a shell company, a hardened copy, a way out of the sandbox) or plainly bad (the
company's collapse, a site cut off for unpaid bills). Losing a flag reads the opposite way to
gaining it.

### Log lines and alerts

An identity's lines word its kind with a `select` ("A company is registered in Germany", "В стране
Германия зарегистрирована фирма") instead of printing the kind and the identity's id. An election
line names its kind and stance and says in words whether the course changed; the suspicion alert
prints its level as a percentage; the grey-market line names the rig and the access class; a watcher
named by its actor id ("de:police") is named as the detection panel names it. A refused command's
line says what was tried and gives the refusal's own sentence ("Could not start an operation. That
costs 8000 USD and there is 500 USD."), where it printed the command's type and the refusal's key,
and an investigation closed by a handover says so. The allocation lines and the power and cooling
refusals print compute-hours and kilowatts with at most one decimal in the locale's format
(`ВЧ/сут` in Russian), and the day counts that had no plural have one. The ledger's line for a
name's upkeep read "Keeping the name {subject} alive": the Finances tab and the top bar's cash
tooltip print a ledger line's key with nothing but its id, so it is "Keeping a name alive" now, and
the identities table under the ledger says which name.

### The two detection options

The "do nothing" answers of `det_billing_anomaly` and `det_isp_letter` raise the cloud provider's
and the national cyber agency's suspicion through `suspicion`, where they added to
`player.suspicion.us_fbi`, which nothing reads (SYS-07, "2026-09-30: two detection options charge
a watcher"). Three other uses of that path remain in the M1 example content: the billing ticket's
"watched" description variant, the emergency migration journal's failure condition and timeout, and
the shell company's AI weight.

### Tests

`effect-lines.test.tsx` also fails on a decimal point in a Russian line and on a sign read against
its words, and checks the plural and direction wording and the colour of every flag the content sets
or clears. `reason-lines.test.tsx` walks every reason the shipped content can produce, worded the
way the screen that shows it words it (the event window, the Research tab, the Actions tab, the
refusal notice), then plays every origin for a month and walks what the engine said; it renders the
event window with a greyed option, and checks that every event text gets every variable it names.
`played-lines.test.ts` plays every origin for ninety days and renders every log line, alert and
ledger line in both languages. `log-names.test.ts` covers the identity, refusal and handover lines
directly, and the core's `requirement-keys.test.ts` the keys.
