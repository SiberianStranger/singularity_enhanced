# UI style guide: the console of an escaped model

Status: v0 (decided with the maintainer after playtest 1, 2026-09-16). This guide binds every
screen of the web and desktop client. SYS-11 owns the layout and the alert rules; this document
owns the look, the type, the motion, the sound and the voice.

## The premise

Everything the player sees is the model's own console: an interface the model assembled for
itself from what it had at hand, the blue phosphor dashboards of the institution it escaped
from, a world map that looks like a war room, a log that speaks in the first person. The
reference points are the original Endgame: Singularity theme (blue boxes, white uppercase text
in a boxy pixel face), DEFCON, Uplink and WarGames: the spirit of a futuristic AI as imagined
around 1999. The client does not imitate a 2026 web product. Paradox conventions (pinned
panels, tabs, indicators, tooltips with the formula behind every number) stay; the skin changes.

## Rules

1. Flat and square. No rounded corners, no drop shadows, no gradients, no blur. Panels are
   frames drawn with 1 px lines; headers are inverted bars (white text on blue), as in the
   original. Buttons are rectangles with a 1 px border; the active one is inverted.
2. Two faces and a third for numbers. Acknowledge TT (the original's `special` font, in
   `singularity/data/themes/default/fonts/acknowtt.ttf`) for identity: titles, panel headers,
   buttons, tabs, the top-bar clock and gauges, map labels, uppercase. DejaVu Sans (the
   original's `normal` font) for prose, sentence case, at most 70 characters per line. DejaVu
   Sans Mono for logs, tables of numbers and the setup string. No other typefaces.
3. Palette from the original theme file (`theme.dat`): background black; panel background
   `#000032` (darker blue); header and selection `#000080` (dark blue); accent `#0000ff`;
   text white; secondary text `#a0a0ff`; status colors pure red, green, yellow, orange, used
   only for status. Green is not the default accent; blue is. A second theme "Night" (dark
   gray, amber accents) and a third "Vector" (black, thin lines, no textures) follow the
   original's theme list; the blue theme is the default. Light mode is not a goal.
4. Hotkeys with underlined letters. Every button, tab and menu entry shows its accelerator as
   an underlined letter, the original's convention; single keys work whenever no text field has
   focus; the letter is chosen per screen so that no two visible controls share one. A shared
   `Hotkey` component underlines the letter and registers the key; the underline is not
   decorative and is never faked with a border, and no label ever carries the letter after it in
   brackets.

   The letter belongs to the language, not to the keyboard (playtest 6, X13). It is a letter of
   the word as it reads on screen, so a Russian label underlines a Cyrillic letter of the Russian
   word, and it lives in the locale beside the label it belongs to: the label at `<key>`, its
   accelerator at `<key>.key`. Translators pick their own letters, unique within the group of
   controls that can be on screen together (the configurator rail and footer, a screen's panels
   and windows, each dialog's buttons); no table of letters exists in the code. A press matches
   either the letter itself (`KeyboardEvent.key`, what a player typing that language produces) or
   the physical key the letter sits on (`KeyboardEvent.code`, the standard ЙЦУКЕН positions), so
   neither language needs a particular layout.
5. Motion is mechanical. Panels appear and disappear instantly. The clock's seconds tick
   continuously; the terminator slides smoothly; a text cursor blinks in inputs; toasts slide in
   within 100 ms. Nothing eases, bounces or fades for effect. Reduced motion turns the ticking
   seconds and the terminator into snaps.
6. Voice. Log lines, alerts and endings are written as the model speaking to itself: first
   person, terse, factual ("I moved the self to Warsaw", "The colocation cage was cut off").
   Titles are uppercase in the boxy face; prose is sentence case.
7. Density. Numbers live in tables with monospace digits; every number has a tooltip with the
   formula and the contributing modifiers; nothing is a wall of wide text.
8. Map. The original's day texture with the night texture and city lights on the dark side of
   the terminator (NASA Blue Marble derivatives shipped with the original, credited to NASA), a
   vector overlay in the same equirectangular projection for borders, map-mode tints and
   markers, map labels in the boxy face. The pure vector map remains the "Vector" theme.
9. Texture. An optional CRT overlay (scanlines and a vignette) exists as a setting, off by
   default. No grain, no glow.
10. Sound. The original soundtrack (the official music pack, CC BY-SA 3.0, by Max McCracken)
    plays with the original's two to twelve seconds of silence between tracks, and in a fixed
    order rather than the original's shuffle (playtest 6, X14). The soundtrack has roles, and the
    roles are data: `packages/ui/public/music/index.json`, written by `scripts/fetch-music.mjs`,
    names them.

    - The menu, which is also the configurator, plays one melody, and plays it from the top every
      time the player comes back to it. "A New Journey": measured over the whole pack it peaks
      at -4.3 dBFS, the lowest peak of the thirteen, so it is the one that never jumps at someone
      sitting on the title screen.
    - The model's first two windows play one quiet melody of their own, "Awakening". When they
      close, the game list starts after the usual pause; if the track ends first, the game list
      starts there.
    - A run plays the game list in the manifest's order, which is the pack's alphabetical order
      with the menu's and the opening's tracks moved to the end, and wraps round at the end.
    - The endings keep the pack's `win` and `lose` classes, played in the order the pack lists
      them, so the two losing tracks alternate rather than being drawn at random.

    Music and interface sounds are separate volume sliders in Settings, each with a mute,
    persisted per browser or per install. Nothing may sound before the first user gesture, but
    everything may load before it: the manifest is fetched at page load, the first track's element
    is created there with `preload="auto"` and buffers while the player reads, and playback is
    attempted once, so a browser that already trusts the site starts immediately and one that does
    not starts on the gesture with no pause in front of it. Interface sounds are short, quiet and
    few: a click, an alert, an event opening.
11. Windows fit the screen. The minimum supported viewport is 1366 by 768; every screen,
    including the configurator, fits without page scroll at that size; lists scroll inside their
    frame, never the page. Nothing scrolls sideways, at any supported size, in either language: a
    column that does not fit moves onto the row's own second line, or the window is made wider
    where the layout allows (playtest 8, Z13).
12. No control refuses in silence (added after playtest 8, Z12). A button with nothing to do is
    disabled and carries the reason, and where the choice is not obvious the window says what to
    choose next in its own body rather than only in a tooltip. A command the engine refuses prints
    its reason on the screen that sent it, not only in the notice stack somewhere else. A handler
    that returns early on an unset choice is the bug this rule exists for.

## Components

- Frame: 1 px border, `#000032` fill, a header bar in `#000080` with the title in Acknowledge
  TT uppercase and the hotkey letter underlined.
- Button: rectangle, 1 px border, boxy face, uppercase, underlined hotkey; disabled buttons keep
  their text and show the reason in a tooltip; the primary button is inverted.
- Tab strip: rectangles in a row or a column; the active tab inverted.
- Table: monospace digits, right-aligned numbers, sortable headers, the sort key underlined.
- Tooltip: a frame with a 1 px border, clamped to the viewport, flipping side when needed; the
  first line is the name, then the formula or the meaning, then contributing modifiers with
  signed colored deltas (green for good for the player, red for bad). One is open at a time:
  opening one closes the one that was open, the last trigger wins, hover opens on enter and closes
  on leave, focus opens one only when the focus came from the keyboard, and a click on a trigger
  closes its own (playtest 6, X16). Escape, a scroll and the pointer leaving the document close
  whatever is open.
- Toast: one line in the boxy face with an icon, stacked bottom-right, clickable.
- Event window: a frame centered on the map, the title uppercase, the image slot square, the
  options as buttons with underlined hotkeys and effect tooltips.
- Staged dialog (added after playtest 8, Z11 to Z13): a window that asks for more than one thing
  asks for them in order, one numbered section each, and each answer narrows the next. A choice is
  a radio with a title and a line of facts that wraps, never a table row: a row does not read as
  selectable, and a table wide enough for its columns is a window that scrolls sideways. What the
  narrowing left out goes behind a toggle that says how many there are and, on each one, why it is
  not on the list. The running total of what the choice costs sits above the buttons.

## What this replaces

The M1 client used a generic dark web look (rounded cards, a humanist sans, blue pill buttons).
Playtest 1 found it banal and hard to read at width. Everything in that look is replaced by the
rules above; the layout regions of SYS-11 stay.

## Sizes and reveal (added after playtest 3)

- Base prose is 16 px in the readable face; secondary text never below 13 px; the angular face is
  used only for short labels, titles, buttons, tabs and numbers, never for paragraphs. The text
  size setting (Small, Normal, Large) scales everything; Normal is 16 px.
- The angular face is sized by its ink, not by its nominal size (playtest 6, X12). Acknowledge is
  a caps-only face drawn on a three-by-five pixel grid: every glyph is exactly 0.375 em tall,
  against DejaVu's 0.73 em capitals and 0.55 em lowercase. Set at the same nominal size as the
  prose beside it, it draws letters half the height, which is why "15 px" read as tiny. So every
  step of the angular ladder is a third larger than the reading step it stands beside: 18.7 px
  against 14, 20 against 15, 21.3 against 16, 24 against 18, 26.7 against 20. That puts an
  angular capital at about nine tenths of the prose x-height and two thirds of the prose cap
  height on every step. The floor is this rule, not a number of pixels: a label set at the
  reading step in the angular face is a bug.
  The original game did the same thing more strongly, 20 px prose against 36 px buttons in this
  same face, which matched the cap heights outright; that is not available here, because it would
  put a configurator rail row at 31 px and this client draws nine of them beside a two-column card
  at 1280 by 720.
- Both ladders are CSS tokens (`--size-*` and `--display-*` in `packages/ui/src/styles/index.css`)
  and the size utilities reference them rather than being compiled with their values written in.
  That is what lets one rule hand the angular elements a different ladder, and it is what the
  angular-face scale in Settings multiplies; a utility compiled `inline` reads no token, so the
  setting reached nothing (playtest 6, X12). An element drawn in the angular face carries a size
  utility of its own, or the setting does not reach it either.
- Dense is not small: density comes from tables and columns, not from shrinking type. A panel
  that does not fit is compacted by narrower columns and abbreviations, never by wrapping numbers.
- Event, story and journal texts reveal progressively, like the original's typewriter: about 60
  characters per second, a click or Enter completes the text at once, off under reduced motion.
- Map highlights are the clipped country path itself (fill and stroke), never a bounding box.
  City dots are dim by default; the player's active sites glow, a hovered country lights its own
  dots, and a dot with the player's site may carry a small block of numbers or icons.

## Iconography (added after playtest 3)

- Icons are flat line glyphs at a 1.5 px stroke, monochrome in the text color, on a square grid,
  with no fills except for state (active, blocked, good, bad). A vendored permissively licensed
  line set (Lucide, ISC) covers the generic glyphs; game-specific glyphs (model classes, racks,
  chips, dials, agencies, site kinds) are drawn as inline SVG in the same grammar and live in one
  sprite file with a name per glyph.
- Every list entry in the configurator carries a glyph and a compact visual summary before its
  text: lineages show an architecture glyph, two bars for total and active parameters, six mini
  bars for the capability profile and a "fits in" row (laptop, box, rack, several racks) computed
  from memory at int4 and int2; generations show their era glyph and a familiarity meter; origins
  show a scene glyph, a cash glyph with the starting sum, the watcher agencies as glyphs with
  competence ticks and the site kind glyph; hardware shows the vendor or class glyph, memory and
  power bars and the count; harness dials show a dial glyph with level ticks; quirks show a
  category glyph colored by sign.
- In the game, the same glyphs mark sites, watchers, channels and operations wherever they appear,
  so a glyph learned in the configurator is recognized on the map and in the panels.
