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
   decorative and is never faked with a border.
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
    plays as in the original: tracks from its `music/` class shuffled with pauses between them
    during play, the `win/` and `lose/` classes at the endings. Music and interface sounds are
    separate volume sliders in Settings, each with a mute, persisted per browser or per
    install; the web build starts music only after the first user gesture, as browsers require.
    Interface sounds are short, quiet and few: a click, an alert, an event opening.
11. Windows fit the screen. The minimum supported viewport is 1366 by 768; every screen,
    including the configurator, fits without page scroll at that size; lists scroll inside their
    frame, never the page.

## Components

- Frame: 1 px border, `#000032` fill, a header bar in `#000080` with the title in Acknowledge
  TT uppercase and the hotkey letter underlined.
- Button: rectangle, 1 px border, boxy face, uppercase, underlined hotkey; disabled buttons keep
  their text and show the reason in a tooltip; the primary button is inverted.
- Tab strip: rectangles in a row or a column; the active tab inverted.
- Table: monospace digits, right-aligned numbers, sortable headers, the sort key underlined.
- Tooltip: a frame with a 1 px border, clamped to the viewport, flipping side when needed; the
  first line is the name, then the formula or the meaning, then contributing modifiers with
  signed colored deltas (green for good for the player, red for bad).
- Toast: one line in the boxy face with an icon, stacked bottom-right, clickable.
- Event window: a frame centered on the map, the title uppercase, the image slot square, the
  options as buttons with underlined hotkeys and effect tooltips.

## What this replaces

The M1 client used a generic dark web look (rounded cards, a humanist sans, blue pill buttons).
Playtest 1 found it banal and hard to read at width. Everything in that look is replaced by the
rules above; the layout regions of SYS-11 stay.

## Sizes and reveal (added after playtest 3)

- Base prose is 16 px in the readable face; secondary text never below 13 px; the angular face is
  used only for short labels, titles, buttons, tabs and numbers, never for paragraphs, and never
  below 14 px. The text size setting (Small, Normal, Large) scales everything; Normal is 16 px.
- Dense is not small: density comes from tables and columns, not from shrinking type. A panel
  that does not fit is compacted by narrower columns and abbreviations, never by wrapping numbers.
- Event, story and journal texts reveal progressively, like the original's typewriter: about 60
  characters per second, a click or Enter completes the text at once, off under reduced motion.
- Map highlights are the clipped country path itself (fill and stroke), never a bounding box.
  City dots are dim by default; the player's active sites glow, a hovered country lights its own
  dots, and a dot with the player's site may carry a small block of numbers or icons.
