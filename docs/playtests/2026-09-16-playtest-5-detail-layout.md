# Playtest 5: 0.1.3 configurator layout, maintainer, 2026-09-16

The two-column packing of the detail card (playtest 4, P2) regressed badly.

| # | finding | status |
|---|---|---|
| L1 | The right column of the detail card ("what this means in the game") is squeezed to about one character: its heading and every value wrap one letter per line, and values overlap each other. | fixed (on master after playtest 5; released in 0.1.4) |
| L2 | The list column is still too wide; the boundary between the list and the detail must move well to the left. | fixed (on master after playtest 5; released in 0.1.4) |
| L3 | The detail card scrolls horizontally, and text truncates into ellipses. Nothing in the configurator scrolls horizontally, and only the footer build line is allowed to truncate. | fixed (on master after playtest 5; released in 0.1.4) |
| L4 | On the Quirks step the Take button and the right side of the detail run off the screen. Every control stays inside the viewport at 1366 by 768. | fixed (on master after playtest 5; released in 0.1.4) |

## Rules for the fix

- No element inside the configurator has a horizontal scrollbar; every flex and grid child that holds
  text carries `min-width: 0` so it can shrink instead of forcing the parent wider.
- The detail card is two columns only while it has room for both: the text column and a parameter
  column of at least 18 rem. Below that the two stack vertically, the parameters first.
- The text column is capped at 70 characters but shrinks with the pane; it is never a fixed width.
- A parameter row is label and value on one line, the value right after the label, wrapping to a
  second line when it must, never overlapping.
- Only the footer build line truncates. Names, descriptions, parameters and values wrap.
- Every button of a step, the Take button included, is inside the viewport at 1366 by 768 without
  scrolling the page.

## The game screen, same class of bug (maintainer, second look)

| # | finding | status |
|---|---|---|
| L5 | The top bar does not fit and grows a horizontal scrollbar. Tighten the gaps and the paddings until it fits; a bar that does not fit drops its least important indicator rather than scrolling. | fixed (on master after playtest 5; released in 0.1.4) |
| L6 | The page has a horizontal scrollbar at the bottom and a vertical scrollbar at the right. The game screen is exactly the viewport: nothing scrolls except the inside of a panel. | fixed (on master after playtest 5; released in 0.1.4) |
| L7 | Absurd truncations: the outliner's own title reads "O...", a site reads "Colocation cage, ...". Panel titles and list entries wrap or shorten by rule, never into a one-letter ellipsis. | fixed (on master after playtest 5; released in 0.1.4) |
| L8 | The log strip overlaps the bottom-left selection panel, and the selection panel overlaps the primary panel. The three regions never overlap: the log strip is centered between the left panels and the right edge, and the selection panel sits under the primary panel with a real gap. | fixed (on master after playtest 5; released in 0.1.4) |
| L9 | Vertical spacing is loose everywhere: tighten the paddings and the line gaps so the panels are flatter and more fits without scrolling. | fixed (on master after playtest 5; released in 0.1.4) |
| L10 | The log prints raw identifiers: "Woke up as giant_moe (open_2026) in state_lab", "Answered open_state_quarterly_review with produce_results". Log lines name things the way the player sees them (Mimi M4, last year's model, the institute cluster, the event's title and the option's text). | fixed (on master after playtest 5; released in 0.1.4) |

## The cause behind L5-L9 (maintainer, third look)

At 80% browser zoom everything fits. The layout therefore needs more width than the maintainer's
viewport gives it at 100%, and it does not reflow when it has less. Two fixes, not one:

| # | finding | status |
|---|---|---|
| L11 | The game screen and the configurator must fit and stay legible from 1280 by 720 CSS pixels upward, reflowing rather than overflowing: the outliner collapses first, then the selection panel becomes a bottom sheet, then the primary panel takes the full height. | fixed (on master after playtest 5; released in 0.1.4) |
| L12 | Settings gets an interface scale control, as Paradox games have: a slider over the whole interface (not only the text), with an "auto" default that picks the largest scale at which the layout fits the current window and re-picks on resize. Everything must be sized in rem for it to work. | fixed (on master after playtest 5; released in 0.1.4) |

## Continuation list after the layout pass

- The step rail wraps "ПРОИСХОЖДЕНИЕ (O)" onto two lines in Russian, so the first rail row is
  taller than the rest; the word cannot get shorter without becoming a different term. Either the
  rail gets a wider column budget in Russian or the hotkey moves off the label (below).
- Hotkeys are Latin letters, so a Russian label shows them bracketed after the word ("ЖЕЛЕЗО (H)")
  instead of underlining a letter inside it. Decide whether Russian gets its own hotkey letters
  (underlined in the Russian word) or keeps the bracket; the bracket is what makes rail entries
  long enough to wrap.
- The Location step shows every 0..1 country and city figure a hundred times too large
  ("Watcher competence 7,400%", "Local scrutiny 5,500%") in both languages: the meaning
  generator rounds the fraction to whole percent and then formats it with an ICU `percent`
  style, which multiplies again. One caller passes the fraction, the other the percent; settle
  `common.percent` on one convention and fix the callers.
- Agency names on the Location step and in the country panel are raw display strings from the
  world data ("NIST / Center for AI Standards and Innovation (CAISI, ex-AISI), Dept. of Commerce;
  White House OSTP sets policy"), so they stay English in Russian and read as a dossier note in
  English. They become locale keys with a short name per agency when the M2 agency profiles land
  in the client (SYS-01 "M2 contract", agency_profile).
