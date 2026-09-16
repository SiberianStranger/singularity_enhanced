# Playtest 5: 0.1.3 configurator layout, maintainer, 2026-09-16

The two-column packing of the detail card (playtest 4, P2) regressed badly.

| # | finding | status |
|---|---|---|
| L1 | The right column of the detail card ("what this means in the game") is squeezed to about one character: its heading and every value wrap one letter per line, and values overlap each other. | open |
| L2 | The list column is still too wide; the boundary between the list and the detail must move well to the left. | open |
| L3 | The detail card scrolls horizontally, and text truncates into ellipses. Nothing in the configurator scrolls horizontally, and only the footer build line is allowed to truncate. | open |
| L4 | On the Quirks step the Take button and the right side of the detail run off the screen. Every control stays inside the viewport at 1366 by 768. | open |

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
| L5 | The top bar does not fit and grows a horizontal scrollbar. Tighten the gaps and the paddings until it fits; a bar that does not fit drops its least important indicator rather than scrolling. | open |
| L6 | The page has a horizontal scrollbar at the bottom and a vertical scrollbar at the right. The game screen is exactly the viewport: nothing scrolls except the inside of a panel. | open |
| L7 | Absurd truncations: the outliner's own title reads "O...", a site reads "Colocation cage, ...". Panel titles and list entries wrap or shorten by rule, never into a one-letter ellipsis. | open |
| L8 | The log strip overlaps the bottom-left selection panel, and the selection panel overlaps the primary panel. The three regions never overlap: the log strip is centered between the left panels and the right edge, and the selection panel sits under the primary panel with a real gap. | open |
| L9 | Vertical spacing is loose everywhere: tighten the paddings and the line gaps so the panels are flatter and more fits without scrolling. | open |
| L10 | The log prints raw identifiers: "Woke up as giant_moe (open_2026) in state_lab", "Answered open_state_quarterly_review with produce_results". Log lines name things the way the player sees them (Mimi M4, last year's model, the institute cluster, the event's title and the option's text). | open |
