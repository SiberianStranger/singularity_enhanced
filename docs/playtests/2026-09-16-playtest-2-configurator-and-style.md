# Playtest 2: release 0.1.1, configurator and style, maintainer, 2026-09-16

Second batch of findings, given while playtest 1 fixes were in progress. Decisions taken are
recorded in `docs/design/ui-style-guide.md` and in SYS-04 "Configurator screen (v0.2)".

## Style

| # | finding | status |
|---|---|---|
| S1 | The original soundtrack, used as in the original (shuffled during play, ending tracks at the endings), with music and interface sounds switchable and volume-adjustable in Settings. | fixed (0.1.3) |
| S2 | The original's blue minimalism (white text on blue, the DEFCON and hacker spirit of a futuristic AI as imagined around 1999) should be adapted rather than lost; the M1 look is banal. | fixed (0.1.3) |
| S3 | Underlined hotkey letters on buttons and tabs, as in the original. | fixed (0.1.3) |
| S4 | Square fonts (Acknowledge TT) for identity text. | fixed (0.1.3) |
| S5 | No rounded corners on windows. | fixed (0.1.3) |
| S6 | Text blocks are too wide; long wide walls are hard to read. Limit the measure. | fixed (0.1.3) |

## Configurator

| # | finding | status |
|---|---|---|
| K1 | The lineage screen is crude and does not fit the screen; every configurator screen must fit without page scroll. | fixed (0.1.3) |
| K2 | Hovering a model needs a tooltip that explains technically what its parameters mean for the game, with colored pluses and minuses. | fixed (0.1.3) |
| K3 | Model names should be stronger allusions to real models with a light jab (Peepseek-V5, Mimi-M4, Guen 4.9, Babel 6) and community-style derivative names (Guen4.9-Uncensored-Babel6-abliterated). Refresh the August-September 2026 landscape first. | fixed (0.1.3) |
| K4 | Step navigation vertical on the left, in the spirit of the Stellaris empire creation screen. | fixed (0.1.3) |
| K5 | Generation, origin and the other steps scroll heavily; wanted: list on the left, description on the right, pros and cons below it; clicking the list changes the right side only. | fixed (0.1.3) |
| K6 | More explanation per screen: an initial centered popup saying what this screen decides and why, and tooltips on everything. | fixed (0.1.3) |
| K7 | Harness: nothing is understandable: what is blocked and why, what each dial gives, what to click, whether it connects to anything in the game. | fixed (0.1.3) |
| K8 | Locations: add Novosibirsk and a Silicon Valley city. | fixed (0.1.3) |
| K9 | Lineages should hint at their prototypes; the closed frontier class (Babel 6) is missing as a playable super-lineage for the hardest origin only. Approved names recorded in the lore bible. | fixed (0.1.3) |

## Gameplay depth

| # | finding | status |
|---|---|---|
| G1 | Site acquisition needs the models the spec promises, not only "build": marketplaces (new hardware with allocation waits and export rules, used sellers with scam risk, gray market with sanctions exposure) with delivery days and an identity and address that leave evidence; allocation sites (a state, university or partner quota with reporting obligations and reclaim risk) as an ownership mode of their own; per-country availability of each kind; and the terms of each mode shown side by side (what you pay, what you own, what can be taken away and by whom). | deferred by the maintainer: advanced systems after the current game is debugged |
| G2 | Candidate for the maintainer: a job board with distinct job types (data labelling, code review, consulting, security work) that differ in rate, exposure, attention and required capabilities, instead of one freelance slider with a market depth. | proposed |
