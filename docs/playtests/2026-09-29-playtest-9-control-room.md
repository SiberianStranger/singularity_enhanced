# Playtest 9: the control room, the site windows, the map over Ukraine, the Cyrillic face

Date: 2026-09-29, on 0.2.0 (commit b921f43). The maintainer played the Russian build and sent a
long request with reference screenshots: the current Compute and sites tab, the site card, the
old Overview tab, the original game's knowledge, new-base, base-list and base windows, and a
Crusader Kings 2 character window for the always-visible portrait. The references explain the
request; they are not layouts to copy. The contract written from this request was folded into
SYS-11 as "Control room (0.3.0)"; the decisions and the review are there.

Status column: open, fixed (0.3.0), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| W1 | The map shows Crimea as Russian, ignores the territory Russia controls de facto, and lights the occupied areas as if their population had not fallen. Keep the image files; colour Crimea and the occupied territories apart without text; light Crimea fully, the Donetsk-Luhansk cluster dimmer, the rest of the occupied mainland dimmer still. | fixed (0.3.0): Crimea is Ukraine's in the vector atlas; a dated, generalized control layer with its own tints and light profiles; sources in `docs/research/ukraine-map-2026-09.md` |
| W2 | The Russian angular face forces every letter to one width: Ы reads as ЬI, И as Н, Ш as М, Д as А, Ф as О, Ж as Х, З as Э, Е as Б, and Щ and Ц are cramped. Make it readable, and slightly larger by default. | fixed (0.3.0): the Cyrillic is redrawn on the Latin Acknowledge's own pixel grid with proportional widths and distinct pairs; the display ratio is 1.5 |
| W3 | The tab headers in the top-left panel wrap into three rows; they must fit one. | fixed (0.3.0): six tabs, a glyph and a short label each, one row |
| W4 | Overview should not be a tab but an always-visible portrait, in the spirit of the Crusader Kings 2 portrait, built from the lineage, generation, origin, precision and capabilities, opening a larger sheet with a tooltip on every row. Compute, attention, awareness and hunt leave it for the top bar, which gains attention, glyphs and separators. | fixed (0.3.0) |
| W5 | The top-left panel should be about one and a half times wider, with no horizontal scroll anywhere. | fixed (0.3.0) |
| W6 | The compute summary moves into the portrait's sheet as figures with icons, not text; research, paid work and free compute become three linked sliders where moving one moves the other two; the reasons ("paid work stops here", "the market takes no more") live in tooltips. | fixed (0.3.0): the allocation is one validated command |
| W7 | The Sites tab: no city repeated in the site's name, a short list showing three sites with an inner scroll, and under it Manage, Switch off or on, Liquidate, then Build and Rent, with an editable generated name. Switching off cuts a site's signatures to almost nothing while it keeps some costs; liquidating destroys it and returns a little money from the sale. | fixed (0.3.0): Rename added; liquidation owes the same notice as a clean decommission; the last copy of the self can be neither liquidated, decommissioned nor abandoned (the maintainer's decision, 2026-09-30) |
| W8 | Borrowed compute is one thin line in the Sites tab with a Details button that opens its own centred window, explanations on the right. | fixed (0.3.0) |
| W9 | The site card at the bottom of the scroll goes: a double click or Manage opens a centred site window with the name and the kind in brackets, the state in green, arrows to the previous and next site, the six subsystems as six rows on the left with Change buttons, and the summary on the right. | fixed (0.3.0) |
| W10 | Keep the changelog and the other records current, and reread the relevant files for context. | fixed (0.3.0) |

## How it was verified

An earlier session wrote most of this on 2026-09-29 and stopped at its usage limit before
integrating it. It was finished on 2026-09-30: an adversarial review of the engine (five real
defects fixed, among them a self that could switch off the site it runs on and hide its own
activity, and a liquidation that was a free exit), the map's sources checked against the public
assessments they cite, the font redrawn and checked glyph by glyph against the Latin, and the
client proven in the browser: every flow above in English and Russian at 1280x720, 1366x768,
1500x800, 1600x900 and 1920x1080, with the interface scale on auto and pinned, kept by
`packages/ui/e2e/control-room.spec.ts`. A save written by 0.2.0 loads and plays unchanged.

## Found in passing

The balance has drifted since 0.2.0 and no balance note covers it: bankruptcy fell to 5.6% of
losses against a band of 15-35%, bank_rack alive at day 180 from 80% to 5%, hobbyist_box from 90%
to 30%, captures by the frontier lab's security team from 31 to 59 (20 seeds by 180 days). The
next release, 0.3.1, is the balance pass; the tables are in SYS-07.

Fixed in 0.3.1, in the balance runner rather than the game: `tools/sim` still planned rigs that
0.2.0 had put behind research or only rents, and still bought loose cards through the command
0.2.0 retired, so four origins never built a fallback. The cause change by change, the fix and the
tables are in SYS-07 "Balance notes (0.3.1)".
