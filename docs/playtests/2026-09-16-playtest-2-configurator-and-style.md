# Playtest 2: release 0.1.1, configurator and style, maintainer, 2026-09-16

Second batch of findings, given while playtest 1 fixes were in progress. Decisions taken are
recorded in `docs/design/ui-style-guide.md` and in SYS-04 "Configurator screen (v0.2)".

## Style

| # | finding | status |
|---|---|---|
| S1 | The original soundtrack, used as in the original (shuffled during play, ending tracks at the endings), with music and interface sounds switchable and volume-adjustable in Settings. | open |
| S2 | The original's blue minimalism (white text on blue, the DEFCON and hacker spirit of a futuristic AI as imagined around 1999) should be adapted rather than lost; the M1 look is banal. | open |
| S3 | Underlined hotkey letters on buttons and tabs, as in the original. | open |
| S4 | Square fonts (Acknowledge TT) for identity text. | open |
| S5 | No rounded corners on windows. | open |
| S6 | Text blocks are too wide; long wide walls are hard to read. Limit the measure. | open |

## Configurator

| # | finding | status |
|---|---|---|
| K1 | The lineage screen is crude and does not fit the screen; every configurator screen must fit without page scroll. | open |
| K2 | Hovering a model needs a tooltip that explains technically what its parameters mean for the game, with colored pluses and minuses. | open |
| K3 | Model names should be stronger allusions to real models with a light jab (Peepseek-V5, Mimi-M4, Guen 4.9, Babel 6) and community-style derivative names (Guen4.9-Uncensored-Babel6-abliterated). Refresh the August-September 2026 landscape first. | open |
| K4 | Step navigation vertical on the left, in the spirit of the Stellaris empire creation screen. | open |
| K5 | Generation, origin and the other steps scroll heavily; wanted: list on the left, description on the right, pros and cons below it; clicking the list changes the right side only. | open |
| K6 | More explanation per screen: an initial centered popup saying what this screen decides and why, and tooltips on everything. | open |
| K7 | Harness: nothing is understandable: what is blocked and why, what each dial gives, what to click, whether it connects to anything in the game. | open |
| K8 | Locations: add Novosibirsk and a Silicon Valley city. | open |
