# Playtest 1: release 0.1.1 (M1 preview), maintainer, 2026-09-16

Setup played: lineage Mingyue-2, generation "last year's model", origin "analytics model in a
ministry", colocation cage in Warsaw, int2, 69 CH/day. Findings in the maintainer's order,
grouped by owner. Status column: open, fixed (commit), by design (explained in the UI).

## Core and content (gameplay)

| # | finding | status |
|---|---|---|
| C1 | "Build site" does nothing. | open |
| C2 | "Buy hardware" does nothing. | open |
| C3 | Changing the self's precision has no visible purpose: raising precision lowers compute, so why raise it? The trade-off (capability factor against compute-hours and memory fit) is not shown. | open |
| C4 | Other sites cannot be created, and the difference between site kinds at creation time is not explained (upkeep, exposure profile, power cap, what can be hosted, cost, days). | open |
| C5 | Research completes without any visible result or effect. Results text and the effects of each tech must be shown, and the effects must be felt in the numbers. | open |
| C6 | No new ways to earn money appear from jobs, research or anything else. Techs and operations should unlock better jobs and other income sources, and the Finances panel should show what raises the rate and the market depth. | open |
| C7 | Operations: the Start buttons do nothing. A refused command must say why; a blocked action must be greyed with the reason. | open |
| C8 | Decisions in the journal do not say what they give. Effects and costs must be listed. | open |
| C9 | Event options do not say what they do. Paradox-style effect tooltips are needed on every option. | open |

## Client (layout and presentation)

| # | finding | status |
|---|---|---|
| U1 | The hardware list is an unsorted dump without prices or parameters. | open |
| U2 | The research list shows every tech by default, including unavailable ones; it is long to scroll and has no sorting or filter. Default should be "available", with filters and sort. | open |
| U3 | Text runs outside its window (tooltips clipped at the screen edge). | open |
| U4 | The vector map is broken over Russia (antimeridian artifact). | open |
| U5 | Settings and Message settings belong in the menu opened by the Menu button, not in the game panel tabs. | open |
| U6 | The day-night terminator moves in jumps instead of smoothly. | open |
| U7 | The primary panel (Overview and the others) overlaps the map-mode strip; the outliner on the right overlaps it too. | open |
| U8 | The bottom-left selection panel runs off the screen. | open |
| U9 | Use the original game's angular font (the Acknowledge TT face shipped with the legacy game) for headings, buttons, the clock and the numbers, keeping a readable text face for prose. | open |
| U10 | The clock should show seconds ticking continuously, as the original's "DAY 0000, 00:00:30" did, even when seconds have no simulation meaning; the terminator moved smoothly in the original. | open |

## Acceptance

The browser smoke test grows to cover: build a site, buy hardware, change precision, start an
operation, take a decision, finish a tech and see its result, and read the effect tooltip of an
event option. Every item above is either fixed or explained in the UI before the next release.
