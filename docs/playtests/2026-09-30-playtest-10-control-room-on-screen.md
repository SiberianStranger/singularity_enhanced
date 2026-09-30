# Playtest 10: the control room on screen, and the map over Ukraine

Date: 2026-09-30, on 0.3.0 (commit ac8bfde), web build, Russian, 1920x1080.

Status column: open, fixed (version), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| V1 | The control layer over Ukraine does not read: a dark brown wash that looks painted on top. The request was the de facto control shown in a colour near the country's own, distinguishable from it: Crimea close to Russia's colour (it is mostly Russian in fact) but marked as not internationally recognized (a different tone, a hatch or a dashed border); the occupied mainland in another variant, de facto control with even less recognition or legitimacy than Crimea. The border line itself is fine. | fixed (0.3.1): both territories are filled with Russia's colour in the current map mode and hatched in Ukraine's (the map's line colour where Ukraine has none), lightly over Crimea and densely over the occupied mainland; the edge of control is dashed, the border stays solid, and the tooltip and the selection panel say whose the territory is, who has held it since when and how few states recognize that (SYS-26) |
| V2 | Make it a general system rather than a Ukraine special case: control versus legitimacy for any territorial conflict (a Chinese move on Taiwan, Iran, Russia and the Baltics, or whatever a scenario brings), which an AI in some scenario may be the one to push. | fixed (0.3.1): one rule for any territory, read from a data module shaped as SYS-26's `TerritoryDef`; a test-only island in the Taiwan Strait is drawn by the same code as Crimea; the engine side stays in backlog P7 |
| V3 | A random new player starts in English. | already so: no browser detection; English is the default and the chosen language is remembered per browser |
| V4 | The portrait panel at the top left is too tall: make it one and a half to two times flatter, with a smaller portrait and tighter rows. | fixed (0.3.1): the card is 3.9rem tall rather than 6.2 (7.5 in the reference screenshot, whose lineage name wrapped; it now fits one line in the reading face), with a 3rem drawing and three tight rows; the same figures and tooltips |
| V5 | Russian text still fits badly in the tab row: more space between the tabs, or a slightly wider panel. | fixed (0.3.1): five tabs rather than six, with more room between and inside them; no label is clipped and nothing scrolls sideways from 1280x720 to 1920x1080, at the automatic and a pinned scale |
| V6 | Move the journal out of the tabs to the top right, to the left of Knowledge, as its own button; keep only the decisions as a tab, and merge them with operations, which hardly need a tab of their own. | fixed (0.3.1): the journal is a window of its own with its entries and their steps, opened by a Journal button left of Knowledge; the decisions and the operations are one tab, Actions (Действия in Russian) |
| V7 | Shorten the top bar from the left by the portrait panel's width and move the portrait panel up into that corner, to win vertical space. | fixed (0.3.1): the portrait sits in the top-left corner and the top bar starts where it ends, so in the reference screenshot's window (1916 by 814, with its lineage) the tab row starts 83 px from the top rather than 187; the order in which the bar gives up cells was worked out again for its shorter width |

## Found in passing

Reviewing the new Actions tab found decision cards printing internal ids: "Gains: has_shell_company",
"Keeps network_exposure inside 0 to 1", "Sends a info message". The 0.3.0 Journal tab printed the
same lines. Fixed (0.3.1): effect lines, greyed options, refusals and log lines name flags, channels,
watchers, places, statistics and journal entries from the locale; range limits and message notices
are no longer listed; Russian numbers take a decimal comma. Tests walk every line the shipped content
can show and every line eleven played origins produce, in English and Russian, for raw ids,
placeholders, and Latin words or decimal points in Russian (SYS-11 "Implementation notes (0.3.1,
effect lines)"). Two detection answers that claimed a cost through a path nothing reads now charge
a watcher (SYS-07, 2026-09-30).

Open, for a later pass:

- The event window's "why did this happen" expander, closed by default, still lists the event's
  variables by their internal names and prints the core's own text for a condition with no locale key.
- Three more uses of `player.suspicion.us_fbi`, the path nothing reads, remain in the example
  content: a description variant of the billing ticket, the emergency migration journal's failure
  and timeout conditions, and the shell company's AI weight.
- The billing ticket and the network provider's letter never fire in the balance runner's 220 runs,
  because the runner never lets billing or network exposure run that hot.
- Money in refusal and log lines is printed bare ("8000 USD").

## Notes

- V1 and V2 are one piece of work: SYS-26 "Territorial control and recognition" is the design; the
  0.3.1 client draws any disputed territory by the same rules, the engine side comes later
  (backlog P7).
- The reference is the maintainer's screenshot of 0.3.0 at 1920x1080 in Russian.
