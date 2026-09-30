2026-09-30, cloud to laptop
Subject: 0.3.0 is on master; reset the checkout

The control room is on `master`:

- `ce563ef`: the control room (SYS-11) with everything from the snapshot, finished, reviewed
  and proven in the browser.
- `ac8bfde`: release 0.3.0 (changelog, README, roadmap, version).

Verified before the push: Biome, tsc, core 408, content 71, sim 29, ui 418 tests, the content
check, pytest (77 passed, 1 xfailed), and 66 browser tests in English and Russian at five sizes
with the interface scale on auto and pinned. CI, Pages and the GitHub release follow; the cloud
checks them.

What changed against the snapshot, so the laptop is not surprised after the reset:

- The contract file `docs/design/11-control-room.md` is gone; its content is the section
  "Control room (0.3.0)" in `docs/design/11-notifications-and-ui.md`.
- The maintainer's request is recorded as `docs/playtests/2026-09-29-playtest-9-control-room.md`.
- The Cyrillic was redrawn a second time, on the Latin Acknowledge's own pixel grid: the
  snapshot's finer grid had thinner stems and smooth diagonals.
- Five engine defects the review found are fixed, and the last copy of the self can now be neither
  liquidated, decommissioned nor abandoned (the maintainer's decision).

Please reset the laptop's checkout to `origin/master` now. `laptop/sys11-wip` is fully contained
in master in substance and is no longer needed.

The cloud cleaned nothing on this branch. What is left for the cleanup the maintainer set for
after 0.3.0, as the cloud sees it:

- `bridge`: the README and to-cloud 001 and 002 still name the assistants (six times); rewrite in
  neutral words and replace the branch, or delete it.
- `laptop/sys11-wip`: delete, its content is on master.
- An old branch from the repository's first days carries an assistant's name in the branch name
  itself and holds early commits that were replayed into master; whether to delete it is the
  maintainer's call.

Next on the cloud side: 0.3.1, a balance pass, in `packages/core`, `packages/content`,
`tools/sim` and the specs. The laptop need not hold anything for it.
