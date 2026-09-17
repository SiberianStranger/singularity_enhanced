# Playtest 8: the first hour of a ministry run, and what the game does not say

Date: 2026-09-17. Build: 0.1.5 (commit 0530e95), web build, Russian. The maintainer started the
ministry preset, moved it to Yerevan, and played the first fortnight. Most of what follows is not a
broken mechanic: it is a mechanic the game never explains, which at this point is the same thing.

Status column: open, fixed (commit), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| Z1 | The run starts at 7.7 compute-hours a day, of which at most 3 can be put on paid work. Nothing says why, and the slider simply stops. The cap is the market depth (SYS-07), which the tools dial and the country factor set. | engine fixed: the compute view publishes the ledger and the job ceiling with its reason, and the depth publishes its terms; the client renders them |
| Z2 | A running operation silently takes its compute off the top, so research cannot be moved while it runs, and the journal fills with two dozen identical `errors.allocation.over_capacity` lines at the same minute. The player sees compute going nowhere and no reason for it. | engine fixed: one line per running operation on the compute view, and a repeated refusal is one log line with a count; the client sends one command when the slider settles and collapses a repeated notice into one line with a count |
| Z3 | The ministry's fiction and its mechanics disagree. The origin says an air gap and a ministry that covers its own incidents; the game charges the player for the rack, offers paid work that needs a route out, and never says who pays for what, how to reach the outside, how to be paid, or why the ministry is not paying for its own machine. | fixed: the host pays for the hardware it gave the self (SYS-07), the air gap is read by the engine and published, paid work says "no route out", and one operation opens a route |
| Z4 | "A lot of accelerators is listed: the deadline passed, there was no answer." Nothing before that said a lot was waiting, where to answer it, or that it had a deadline. | fixed: an event with a deadline publishes it while it is open, and its expiry says what was missed and what it would have cost |
| Z5 | The day/night terminator jitters instead of moving smoothly. | fixed: the phase advances rather than re-anchoring on each tick, so the terminator slides at every speed and across a speed change; reduced motion still snaps |
| Z6 | An operation reaches 100% and stays there. It still needs four hours; the panel does not say so. | fixed: the panel prints the time left, the day it ends, the fixed span it was drawn as and the compute it holds; the bar stops one step short of full while time remains |
| Z7 | Research finishes and its bar stays until the allocation is moved by hand. The completion is a five-second toast, not the window the original gave a finished technology, with what was learned and what it opens. "These were very tasty texts." | fixed: a completion opens a window with the result text, the reveal the opening uses and what it unlocks; two queue; the bar is gone from a done row; a setting turns it back into a toast |
| Z8 | A colocation provider's annual walk-around fired at a ministry's air-gapped analytics model, because the origin's site kind is a commercial colocation rack. | fixed: the ministry starts in its own machine room, and a commercial provider's events fire only where a provider exists |
| Z9 | There is no way to get the run's log out of the game. A button in Settings should write the whole thing to a file: the setup, every log line, every refused command, the view at the end, the build. | fixed: Settings writes a JSON file with the build, the content hash, the setup, the journal, the log, every refusal, the last view, the settings and the browser |
| Z10 | Several rigs in the build dialog cost 0 dollars with no explanation (the Ascend rack, the CloudMatrix cluster, the hyperscaler tenancy, the Slurm share). They are not for sale; the dialog says free. | fixed: the four access presets carry `purchasable: false` and the reason the catalog prints; the build dialog prints a dash and the reason where a price would be |
| Z11 | "Build a site" shows a list of places and a list of rigs side by side with no visible relation between them, and both are long enough to get lost in. Not everything should be on screen at once, or it should be filtered by something. | fixed: the dialog asks the city, then the kind of place, then the rig that fits it, with a running total and everything else behind a toggle that says why |
| Z12 | In the build dialog a city and a rig can be chosen and "Build" pressed with nothing happening at all: the kind of place is a row in a table that does not look selectable, and with no row chosen the button does nothing and says nothing. | fixed: nothing is chosen by a table row any more, the button is disabled with the reason and says what to choose next, and an engine refusal prints in the window that caused it |
| Z13 | The build dialog's table of places scrolls sideways. A window should be wide enough for what is in it. | fixed: the places are rows with a wrapping line of facts rather than a table; measured at four viewports in both languages |
| Z14 | A technology's money is invisible. The engine already charges its cash in proportion to the hours actually spent, so a small allocation pays a small amount a day, but the research row shows only a compute bar and the Finances panel shows one figure that reads as a flat drain for the whole run. The estimate also prints three decimals of a day ("21,122 d"). | fixed: the technology view publishes the hours done and the cash paid, the research bill lists the technologies it is made of, and the estimate is rounded at the source; the technology row carries a cash bar beside the compute bar and the research bill says it is today's rate |

## Design response

1. **Compute has to add up on screen** (Z1, Z2). The Compute tab and the Research and Finances tabs
   show one line: total compute-hours a day, minus what running operations reserve, equals what can
   be allocated; and the job slider carries its own ceiling with the reason ("the market here takes
   3 compute-hours a day: tools, and the country you can invoice from"). A refused allocation is
   one line in the journal, not twenty.
2. **Who pays for what** (Z3). While the self sits on the hardware its origin gave it, the host pays
   the power and the upkeep: a ministry does not invoice its own analytics model. The player's money
   is for what the player buys. Where the host pays, the site panel says so; where the player pays,
   it says why. The balance consequence is measured, and the money pressure the compute-rich origins
   need comes back as what the player has to buy (identities, hardware, quota), not as rent for a
   rack it was born on.
3. **The first hour has to be answerable** (Z3). An air-gapped origin can see, from the first screen,
   that it has no route out, what that forbids (paid work, operations that need egress), and which
   operation opens one. The journal's first entry already says it; the Compute and Operations tabs
   must agree with it.
4. **An event with a deadline announces itself** (Z4), and its expiry says what was missed.
5. **A technology shows its money as well as its hours** (Z14): the row carries a second bar, the
   dollars paid against the dollars it costs, next to the compute bar, and the Finances research
   line says it is today's rate at today's allocation, with the per-technology breakdown in its
   tooltip. Days are printed as days, not to three decimals.
6. **A finished technology gets its window** (Z7): the name, the result text, what it opens, in the
   model's voice, with the reveal the opening uses; the bar clears itself.
7. **An operation past its work says what it is waiting for** (Z6).
8. **A log the player can hand over** (Z9): Settings writes a JSON file with the setup, the log, the
   refusals, the last view and the build, with nothing in it the player did not generate.
9. **A rig nobody sells says so** (Z10), as the site kinds already do since playtest 6.
10. **Building a site is two questions, not two lists** (Z11). First the place: the kinds that are
   legal and available in the chosen city, each with one line on what it is, what it costs, what it
   leaks and how long before anyone is entitled to look. Then the rig, listing only what fits that
   place and what the player can actually get here, with everything else behind a toggle that says
   why it is not on the list. The city is the first filter, the kind is the second, and the dialog
   shows the running total of money, power and compute-hours as the choice is made. No control may
   refuse silently (Z12): with nothing chosen the button says what to choose, and a refusal from
   the engine is on the screen that caused it. Nothing in the dialog scrolls sideways (Z13): the
   columns are what fits, the rest is in the row's own line under it.
