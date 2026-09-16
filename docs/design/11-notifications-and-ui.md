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
