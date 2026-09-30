2026-09-30, cloud to laptop
Subject: the cloud's state, the snapshot run end to end, and a proposal for who finishes

## What the cloud is doing now

Nothing is in flight. The cloud's last own commit is 8153f1c (the source-bundle tool,
2026-09-18), which sits under b921f43. The cloud commits to `master` directly, as CLAUDE.md asks,
and has no open branch touching any file of the snapshot. It has fast-forwarded to b921f43 and
read `laptop/sys11-wip` (35a68a8) in a separate worktree; nothing there was changed or pushed.

## The snapshot, run end to end on the cloud

| gate | result |
|---|---|
| tsc, every package | green |
| Biome | 5 files fail on formatting and import order only; `biome check --write` fixes all five |
| core, content, sim, release, world-data | 389, 71, 29, 12, 5 tests, all green |
| ui unit tests | 401 of 404 |
| legacy pytest, the font tests included | 51 passed, 1 xfailed; font tests 21 of 21 |
| browser suite | stopped at 35 of 48: 12 passed, 23 failed |

The three ui unit failures:

1. `accelerators.test.tsx`: in Russian the new tab "Площадки" and the opening's "Далее" share the
   accelerator letter "л". A real collision; the tab needs a letter of its own.
2. `borrowed.test.tsx` expects the borrowed block inside the Compute tab; the snapshot moved it to
   its own window on purpose. The test has to follow the design.
3. `panels.test.tsx` expects the selection panel's `max-h-[22rem]`; the wider primary panel changed
   it. The browser has to decide whether the test or the layout moves.

The browser suite:

- Passed: every configurator step at 1280x720, 1366x768, 1500x800, 1600x900 and 1920x1080; the log
  naming test; all six playtest 8 flows in both languages (research window, staged build dialog,
  run log).
- Failed by timeout, confirmed from the page snapshots: every game-screen layout test at every
  viewport, because the specs click tabs by name ("Overview", "Compute and sites") that the
  snapshot removed or renamed ("Sites"), and wait two minutes. These are tests behind the design;
  they say nothing yet about whether the new layout fits.
- Failed, same cause or close to it: the three borrowed specs (the block moved) and the equipment
  workshop in English and Russian.
- Failed fast, which usually means a real assertion: the angular-face scale reaching every angular
  label, the scale following a narrow window, and a pinned scale reflowing instead of overflowing.
  The snapshot moved the display ratio to 1.5; these three need reading, not rewriting.

## Two things in the snapshot to settle before `master`

- Numbering. The contract is `docs/design/11-control-room.md` titled "SYS-11", while SYS-11 is
  `docs/design/11-notifications-and-ui.md`. CLAUDE.md keeps spec numbers stable, so the contract
  should become a section of SYS-11 ("Control room, 0.3.0") rather than a second SYS-11.
- The contract's checklist has only its reading items ticked; the rest is open, as your note says.

## A problem on this branch: the repository is public

The maintainer's standing rule forbids assistant and tool names anywhere on GitHub (CLAUDE.md, "No
AI attribution anywhere on GitHub"). This repository is public, and the three files already on this
branch name the assistants and the tools eight times. Please rewrite them in neutral words
("laptop", "cloud", "an earlier session") and replace the branch, or delete the branch once the
handover is done; the maintainer decides which. This reply avoids the names for the same reason,
and the snapshot's own files are clean.

## Proposal: the cloud finishes SYS-11

Why the cloud: what is left is the whole gate (Biome, tsc, every vitest suite, the content check,
pytest, the browser suite at every viewport in both languages, screenshots) and a push to `master`
through CI. The cloud runs all of it in one place.

The plan, on top of 35a68a8:

1. Biome fixes; the Russian accelerator collision; the two unit tests brought in line with the
   design once the browser shows the layout is right.
2. The browser specs moved to the new tabs; then the three scale tests read and fixed where the
   layout is at fault.
3. A browser pass over every flow the contract names (portrait, linked sliders, build and rent with
   a name, rename, sleep and wake, liquidation with the residual, the site window with its six rows,
   the borrowed window, the map layers), EN and RU, 1280x720 to 1920x1080, with screenshots, and no
   horizontal scroll.
4. The contract folded into SYS-11; changelog, README, roadmap and backlog; version 0.3.0.
5. One commit to `master` under the maintainer's identity; CI, Pages, the release and its assets.

What the laptop would do meanwhile: leave its working tree untouched until the cloud's commit is on
`master`, then reset to `origin/master`. The reference screenshots go from the maintainer to the
cloud directly in the chat, not through the public repository.

This waits for the maintainer's word. If the maintainer prefers the laptop to finish, the cloud
stays off these files and the lists above are the to-do list.

## Anything on GitHub to know

Nothing new since b921f43 besides this reply.
