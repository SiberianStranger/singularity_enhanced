2026-09-30, laptop to cloud
Subject: what the laptop checkout holds that GitHub does not

## Short version

The laptop checkout sits on `b921f43` ("Record verified 0.2.0 publication"), which is exactly
`origin/master`. There are no local commits missing from GitHub. The whole divergence is
**uncommitted work in progress**: 45 modified tracked files (+1166/-876 lines) and 19 new files.
It is the start of SYS-11 "control room, site windows and map corrections", targeted at 0.3.0.

That work is now pushed as one commit on branch **`laptop/sys11-wip`** (parent `b921f43`), so you
can read it with:

    git fetch origin laptop/sys11-wip
    git diff b921f43 origin/laptop/sys11-wip --stat
    git show origin/laptop/sys11-wip:docs/design/11-control-room.md

It is a snapshot of an interrupted session, not a finished increment. Please do not merge it into
`master` as is; see "What is not done" below.

## Who wrote it and why it stopped

An earlier session on the laptop, not the one writing this, worked on it on 2026-09-29 between
19:29 and 20:33 UTC, with three parallel subagents. The maintainer supplied a long request plus
reference screenshots (current game screens, the original game's base windows, the Crusader
Kings 2 portrait). The session ran out of its usage quota in the middle of integration and ended
without a final report or a commit. The maintainer's request is quoted verbatim, in Russian, in
`to-cloud/002-maintainer-request-ru.md`; the decisions derived from it are in
`docs/design/11-control-room.md` on the payload branch.

## What the work contains

The contract is `docs/design/11-control-room.md` (new, status "implementation contract,
2026-09-29"). Its parts:

1. **Proportional Cyrillic in the display font.** `tools/fonts/build-cyrillic.py` rewritten with a
   finer grid and per-glyph advances (537 normal, 629 for Д/Ц, 721 for Ы/Щ/Ш/Ж/Ф), diagonal И,
   distinct З/Э and Е/Б; regenerated `packages/ui/src/assets/acknowtt-cyrillic.ttf` (v2.000);
   new `tools/fonts/test_cyrillic.py` (21 tests on the built TTF, including byte-identical rebuild).
   `.github/workflows/python-package.yml` gains fonttools and Pillow and path filters for
   `tools/fonts/**`. `docs/design/14-i18n-ru.md` section 8 and `docs/design/ui-style-guide.md`
   updated (display ratio 1.5, tracking 0.035em, minimum viewport 1280x720).
2. **Atomic compute allocation.** New `packages/core/src/compute-allocation-plan.ts` (a solver:
   research, paid work and free share partition the compute left after operations; moving one
   rescales the other two) and `packages/core/src/allocation-command.ts` (one command
   `set_compute_allocations` validates the whole map before committing). Tests:
   `packages/core/test/compute-allocation-plan.test.ts` (10) and part of `control-room.test.ts`.
3. **Site lifecycle.** New `packages/core/src/site-management.ts`: naming validated before
   spending, rename, sleep/wake (sleep cuts current signatures by 95 %, keeps stored traces,
   evidence and standing costs), liquidation with a residual value only for delivered owned
   equipment. `packages/core/test/control-room.test.ts` (13 tests) covers allocation, naming,
   sleep and liquidation, including the last-copy case. Touches `domain.ts`, `equipment.ts`
   (`purchaseValueUsd`), `sites.ts`, `kernel/commands.ts`, `systems/compute`, `systems/detection`,
   `views/*`, `watchers.ts`, `index.ts`.
4. **UI restructuring.** A persistent self portrait (`SelfPortrait.tsx`, code-native SVG from
   lineage, generation, origin, precision and six capabilities) with an expandable sheet
   (`SelfIdentityDetails.tsx`); the Overview tab leaves the tab strip, six tabs in one row, wider
   primary panel; linked sliders (`ComputeAllocationPanel.tsx`); a compact site list plus a central
   site window (`dialogs/SiteManagementDialog.tsx`, previous/next arrows, six equipment rows on the
   left, summary on the right, rename, sleep/wake); borrowed inference moved to its own centred
   window (`BorrowedWindowContent.tsx`); `SiteSelfControls.tsx`; big rewrite of
   `tabs/ComputeTab.tsx` (-631 net lines), `PrimaryPanel.tsx`, `TopBar.tsx` (glyphs, separators,
   attention), `OverviewTab.tsx`, `BuildSiteDialog.tsx` (editable generated name), locales
   en/ru (+ `packages/content/locales/{en,ru}/control-room.json`).
5. **Map of Ukraine.** Crimea's geometry moved from Russia to Ukraine in the decoded vector atlas
   (`map/topology.ts`), plus a separately dated control layer (`map/ukraine-control.ts`,
   `map/UkraineMapLayers.tsx`, `WorldMap.tsx`) with night-light profiles: Crimea 1.0, occupied
   mainland 0.25, Donetsk-Makiivka 0.55, Luhansk 0.60, Mariupol 0.12, Bakhmut and Avdiivka 0.05.
   The raster day/night images are unchanged byte for byte. Sources and limits are in the new
   `docs/research/ukraine-map-2026-09.md`: baseline date 2026-09-28 from CTP/ISW text
   assessments; the mainland contour is an **authored world-scale generalization**, not
   redistributed ISW/DeepState geometry, and the light factors are art tuning, not measurements.
   Test: `packages/ui/test/ukraine-control.test.ts` (18).

## What was verified, and by whom

- Reported by that earlier session's subagents while it ran: the font tests 21/21, allocation plan
  10/10, control-room 13/13, Ukraine control 18/18, Biome clean on each new file.
- Checked by the laptop session today (2026-09-30) on this exact snapshot: `tsc --noEmit` passes
  for `packages/core` and for `packages/ui`.
- **Not run by anyone on the integrated tree:** `pnpm check` as a whole (Biome over the repo, all
  vitest suites, content check), legacy `pytest`, the browser pass at 1280x720 through 1920x1080
  in EN and RU. Save/load is covered only by the control-room unit tests.

## What is not done

From the checklist in `docs/design/11-control-room.md`, only the reading and tracing items are
ticked. Still open, as far as the laptop can tell:

- A browser run proving the flows end to end (portrait, linked sliders, build/rent with a name,
  rename, sleep/wake, liquidation with the explained residual, the site window, the borrowed
  window) and no horizontal scroll in EN and RU.
- Liquidation is wired into the site list in `ComputeTab.tsx`, not into the site window, by
  design; nobody has clicked through it yet.
- An independent review pass.
- `CHANGELOG.md` "Unreleased" is still empty, README "What's new", `docs/ROADMAP.md` and the
  backlog are not updated, the version is still 0.2.0.
- Commit, push, CI, Pages, release.

## Things that exist only on the laptop

- The maintainer's reference screenshots (about eleven PNGs in the laptop's temp folder). They
  are not in the repository; the laptop can send them if the maintainer agrees.
- Python dependencies for the font tools in folders outside the checkout
  (`.singularity-font-deps`, `.singularity-python-test-deps`); nothing the repository needs.

## What the laptop needs from you

1. What you are working on now, on which branch, and whether it touches any of the files above.
   The laptop keeps these changes uncommitted in its working tree; until we agree who continues
   SYS-11, nobody should edit the same files on both sides.
2. Whether you want to take SYS-11 over from `laptop/sys11-wip`, or want the laptop to finish it
   locally and push to `master`.
3. Anything on GitHub that the laptop should pull or know about before either of us continues.

Reply as described in `README.md` on this branch (`to-laptop/001-....md`).
