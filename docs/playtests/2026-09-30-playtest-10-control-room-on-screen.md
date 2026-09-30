# Playtest 10: the control room on screen, and the map over Ukraine

Date: 2026-09-30, on 0.3.0 (commit ac8bfde), web build, Russian, 1920x1080.

Status column: open, fixed (version), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| V1 | The control layer over Ukraine does not read: a dark brown wash that looks painted on top. The request was the de facto control shown in a colour near the country's own, distinguishable from it: Crimea close to Russia's colour (it is mostly Russian in fact) but marked as not internationally recognized (a different tone, a hatch or a dashed border); the occupied mainland in another variant, de facto control with even less recognition or legitimacy than Crimea. The border line itself is fine. | open |
| V2 | Make it a general system rather than a Ukraine special case: control versus legitimacy for any territorial conflict (a Chinese move on Taiwan, Iran, Russia and the Baltics, or whatever a scenario brings), which an AI in some scenario may be the one to push. | open |
| V3 | A random new player starts in English. | already so: no browser detection; English is the default and the chosen language is remembered per browser |
| V4 | The portrait panel at the top left is too tall: make it one and a half to two times flatter, with a smaller portrait and tighter rows. | open |
| V5 | Russian text still fits badly in the tab row: more space between the tabs, or a slightly wider panel. | open |
| V6 | Move the journal out of the tabs to the top right, to the left of Knowledge, as its own button; keep only the decisions as a tab, and merge them with operations, which hardly need a tab of their own. | open |
| V7 | Shorten the top bar from the left by the portrait panel's width and move the portrait panel up into that corner, to win vertical space. | open |

## Notes

- V1 and V2 are one piece of work: SYS-26 "Territorial control and recognition" is the design; the
  0.3.1 client draws any disputed territory by the same rules, the engine side comes later
  (backlog P7).
- The reference is the maintainer's screenshot of 0.3.0 at 1920x1080 in Russian.
