# Playtest 3: 0.1.2 and the in-progress style pass, maintainer, 2026-09-16

| # | finding | status |
|---|---|---|
| R1 | Text is too small and, where the angular face is used for paragraphs (the lineage cards), unreadable. Prose must be in the readable face and bigger; the angular face only for short labels, titles, buttons and numbers, never below 14 px; base prose 16 px; not "a million windows with tiny cubic text". | fixed (0.1.3), tests pending |
| R2 | Progressive text reveal, as in the original: event, story and journal text streams in instead of appearing as a wall; click to complete; off under reduced motion. | fixed (0.1.3), tests pending |
| R3 | Russia still stretches across the whole map width: a selection or hover frame spans the map. No bounding boxes for highlights; highlight through the clipped path only. | fixed (0.1.3), tests pending |
| R4 | The Compute and sites panel does not fit in width; compact it slightly and never wrap a number onto two lines (tabular figures, unit abbreviations, narrower columns). | fixed (0.1.3), tests pending |
| R5 | Settings needs a visible switch between the angular and the regular face. | fixed (0.1.3), tests pending |
| R6 | Some countries are uncolored and show a letter code instead of a name (Libya shows "LY"). Every country on the map gets a name (fallback from the atlas) and a neutral fill. | fixed (0.1.3), tests pending |
| R7 | City dots should not all glow all the time: only the player's active sites glow; hovering a country lights its dots; a dot with the player's site can carry a small block with numbers or icons. | fixed (0.1.3), tests pending |
| R8 | The log is a strip at the bottom center of the screen, as in Paradox games, showing the last one or two lines with their dates; it is not a tab in the primary panel (a click opens the full log). | fixed (0.1.3), tests pending |
| R9 | Knowledge is a window opened from a button in the top-right corner, drawn on top of everything; it is not one of the primary panels on the left. | fixed (0.1.3), tests pending |
| R10 | World is a separate ledger window, as in Paradox games: centered, on top, with its own tabs (countries table, map modes, treaties); opened from a button at the right edge of the screen (bottom-right), not a primary panel. | fixed (0.1.3), tests pending |
| R11 | The top bar is too thick: make it one flat row by packing label and value side by side (value to the right of its label, not under it) and redistributing the gauges. | fixed (0.1.3), tests pending |
| R12 | An opening in the model's own voice, as the original had: one or two event-style windows at the start with streamed text, per origin, describing what happened to it and what it must do now; skippable and replayable from the journal. | fixed (0.1.3), tests pending |
| R13 | The text size setting should be finer and more flexible than three steps: a slider from about 80% to 160% in small steps, separate for prose and for the angular labels if cheap, with a live preview. | fixed (0.1.3), tests pending |
| R14 | Pan the map with the mouse (drag) and the arrow keys, at least horizontally, and zoom with the wheel and the plus and minus keys; the primary panel currently covers the Americas with no way to move the map. Horizontal panning may wrap around the antimeridian. | fixed (0.1.3), tests pending |
| R15 | More iconography and visuals in the configurator, at least on Lineage, Generation, Origin, Hardware, Harness and Quirks, so a choice can be read at a glance without reading every paragraph. | fixed (0.1.3), tests pending |

## Continuation list for the next agent run (after the 0.1.3 snapshot)

Client (packages/ui):
1. Tests not yet written: configurator master-detail, no page scroll at 1366 by 768, lock
   explanations with the jump, intro-window persistence; hotkey uniqueness per screen; music
   shuffle and volume; the meaning generator; the progressive reveal; glyph coverage for every
   bundle id; map tests for R3 (no Russia highlight wider than half the map), R14 (wrap, arrow
   keys, session persistence) and R7 (dot states); the Compute panel fits at 1366 px; the two
   opening windows; the e2e walks the configurator with the keyboard, the opening windows and a
   started game.
2. Quirk effects shown as colored pros and cons (needs the quirk effect summaries from the core).
3. Migrate every panel header to the shared Frame component; sweep Card usages; underline the
   active sort key in tables; regenerate or delete the client fallback bundle (it still carries
   dense_70b and lacks the context fields).
4. Wire `configurator.meaning.*` and `configurator.intro.*` strings from the bundle and add a
   usage check so unused keys fail.

Core and content (packages/core, packages/content, tools/sim):
5. Quirk catalog v0.2 from SYS-04 (seventeen quirks, budget 3, conflicts) with effect summaries
   published for the configurator (`QuirkDef` gains the same summary the event options have) and
   the sim policy picking quirks.
6. Balance, fourth pass: uni_cluster and torrent_swarm die to the hunt on one loud site,
   startup_colo loses only to capture although its fiction is a runway, edge_fleet never dies,
   bankruptcy is 7% of losses instead of a split.
7. PPT-7 Zenith needs a place to appear (an NPC or knowledge entry; likely with M3).
8. A usage check for the configurator meaning and intro keys once the client references them.
