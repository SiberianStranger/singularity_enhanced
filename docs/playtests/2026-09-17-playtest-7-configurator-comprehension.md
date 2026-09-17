# Playtest 7: the configurator is hard to understand

Date: 2026-09-17. Build: master after playtest 6 (commit f0cd2a0), web build on GitHub Pages.
The maintainer tried to build a setup and could not get to the game: "my brain freezes on the
configurator". Every finding below is about comprehension, not layout.

Status column: open, fixed (commit), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| Y1 | The site kind in the origin card ("cloud", "colo", "residential") has no tooltip; hovering it should explain that kind of place. | fixed (SYS-04 v0.4) |
| Y2 | Generation step: hovering "Capability" explains nothing, the numbers mean nothing to a new player; "The trade" is unclear (a trade-off? of what for what?). | fixed (SYS-04 v0.4) |
| Y3 | Lineage step: the characteristics block is a wall of numbers with no sense of much or little, what each affects, better or worse than average; "Memory (bf16)" has no visible reason to exist. Choosing a model is very hard. Wanted: "pick this if ..., do not pick it if ..., like X but better at ..., worse at ...". | fixed (SYS-04 v0.4) |
| Y4 | Harness step: impossible to understand what the dials are for; most cannot be changed and the player does not understand why something is locked or chosen for them. | fixed (SYS-04 v0.4) |
| Y5 | World step scrolls vertically; compress it, and say what each setting is for and why the player should care. | fixed (SYS-04 v0.4) |
| Y6 | Two tracks to the game: a preset menu above the origins where the player picks a preset and starts at once, and the detailed configuration named "full setup" for those who want it. | fixed (SYS-04 v0.4) |
| Y7 | Addendum: the configurator should compute, from the whole combination, not only the starting money but the compute-hours a day, and say in one line what kind of start that is ("we start with a pile of compute but live dangerously and must act fast"). | fixed (SYS-04 v0.4) |

## Design response (to be folded into SYS-04 as "Configurator v0.4: two tracks and a guidance layer")

1. **Presets first.** A "Presets" entry at the top of the step rail, above Origin, with six to
   eight curated builds as content data (`packages/content/data/presets/*.yaml`): id, name, a
   one-paragraph story in the model's voice, a "for a player who ..." line, the full setup
   (origin, generation, lineage, hardware, harness dials, city, quirks, world settings) and the
   challenge rating the configurator computes from it. Choosing a preset fills every step and
   shows "Start the game" on the spot; the remaining steps sit under a "Full setup" header in the
   rail for anyone who wants to look or change something. The presets cover the difficulty range
   from a gentle first game to the starred origin, and include the places the maintainer liked
   (Novosibirsk, Moscow, Cambridge, Berlin, Shenzhen, San Francisco). "Random build" stays.
2. **Pick / avoid / compare on every entry.** Origins, generations, lineages, hardware presets and
   quirks get three content strings each, in English and Russian: `pick_if` ("Pick this if you want
   ..."), `avoid_if` ("Avoid it if ...") and `compare` ("Like <entry>, but better at ..., worse at
   ..."), shown as a short block under the description before the numbers. Written for a player who
   has not read a single spec.
3. **Numbers with meaning.** Every capability figure is drawn as a bar against the catalog's range
   with a word (low, average, high, frontier) and a tooltip saying what the axis changes in the game
   (coding: the freelance rate and code research; persuasion: negotiation and the freelance rate;
   cyber: operations; world: events and countries; reasoning: research speed; agency: long-horizon
   operations). "Memory (bf16)" becomes "Size on the cards": the gigabytes the self needs at the
   precision it will run, with the list of allowed rigs it fits in, and one sentence on the
   precision trade-off (smaller and duller versus larger and sharper) in the tooltip.
4. **Generation in words.** "Capability" becomes "Ceiling against the 2027 class" with a sentence;
   "The trade" becomes "What you give up, what you get" with two plain sentences per generation.
5. **Harness in words.** Each dial: one sentence on what it is, one on what moving it does in game
   terms, and, when the origin fixed it, the lock reason and when it unlocks (leaving the site,
   a tech). A "recommended" mark on the position the preset would choose. A sentence at the top of
   the step: "Your origin decided most of this; you change it when you have your own hardware."
6. **World on one screen.** A difficulty preset row (Gentle, Normal, Hard, Nightmare) at the top,
   the settings in two columns, one row each with a one-line explanation, advanced settings behind
   a toggle; no scroll at 1280x720 in either language.
7. **Site kind tooltip** (Y1): the kind's own description from the content locale, on hover and on
   keyboard focus, in the origin card and wherever a site kind is printed.

The content strings for 2, 4 and 5 are written in both languages by the implementation pass (the
Russian by the same agent, in the register docs/research/runet-it-lexicon-2026-09.md documents).

## Y7 in the maintainer's words (addendum, 2026-09-17)

"Can the configurator also compute, from the combination of everything, not only the money the
player starts with but the level of CH? It is one of the main figures, and everything should be
recomputed into it already in the configurator. And a line like 'we start with a pile of compute but
live dangerously and must act fast' or 'we start with little compute but calmly'."

The design response, folded into SYS-04 "Configurator v0.4" as "Day zero":

8. **Day zero, from the engine.** The configurator builds the setup the Start button would build,
   creates the day-zero state through the core's own setup path without ticking it, and reads the
   first view: compute-hours a day, starting cash, the first day's bills and the runway they imply,
   the watchers with their suspicion, the awareness at start, and the operations the self can hold
   at once. Nothing is estimated and nothing is computed twice. The block is on the Summary step,
   the compute and the runway are on every preset card, and the compute-hours are in the footer's
   build line beside the challenge rating.
9. **The verdict.** One sentence from three classifications: compute (low, middling, high), danger
   (calm, watched, hunted) and money (short, steady, long), each banded against the tertiles of the
   catalog itself, recomputed from the bundle at load rather than written down as constants. Twelve
   sentences per language in `guidance.json`: nine for the compute-and-danger pair and three
   clauses for the money.

## What this pass did not do

Both items were closed on 2026-09-17 in the follow-through pass; the status is kept here with what
was done, because the finding is what the next playtest reads.

- ~~The challenge rating still starts a gentle build at six of ten, because `BASE_RATING` is 3 and a
  home rig forces two bits. The presets are a relative ladder inside that; the rating itself wants
  its own pass.~~ **Closed.** The rating was re-anchored (SYS-04 "Anchors (v0.2)"): the base is
  0.75, the precision penalty is halved, the compute and cash bands are drawn against the figures
  the game produces, the suspicion term multiplies by the watcher competence the formula always
  said it did, awareness is counted from the floor no start begins below, the grace of the starting
  place is a term, and the difficulty preset is worth three points instead of one. The eight presets
  read 2, 4, 4, 5, 6, 7, 8, 10 and `packages/ui/test/rating.test.ts` holds the order.
- ~~The lineages still have no `strengths_key` and `problems_key` of their own (open since playtest
  6). The guidance block fills the same hole from the other side, so this is now a smaller gap than
  it was.~~ **Closed.** The pair is on `LineageDef`, all eight lineages write it in both languages,
  the Lineage step prints it the way the Origin step does, and the content build refuses one key
  without the other or a pair that is not translated.
