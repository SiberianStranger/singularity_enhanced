# Equipment archetypes: implementation verification

Date: 2026-09-28. Source version: 0.2.0. Automated functional verification and visual review;
this is not a human balance playtest.

VERIFIED WITH CAVEATS: the implemented equipment contract works in the engine and client.
Long-term profitability, preference between variants and pacing still need human playtests.

INTENT: code sells raw accelerator records; the task requires gradually revealed singular archetypes, material research outputs and distinct site subsystems; SYS-02 and the maintainer require understandable tradeoffs and physical installation constraints.

## Observed contract

- Four compute archetypes are known initially; the complete set contains fourteen, with no more
  than two authored variants per archetype. The old 94 accelerator records remain; three fictional
  player designs extend that reference data. Thirty-six equipment offers include 21 compute offers.
- Owned sites have six subsystems. Cloud providers retain control of their physical infrastructure.
  TPU and Trainium rental offers execute the player's own weights and cannot be mixed in one contract.
- A quote includes committed deliveries, checks power/cooling/space/fabric and ownership, and agrees
  with command refusal and installed results. Orders debit once and contribute no compute early.
- Three own designs have paid prototypes, delivery/installation and reproducible subsequent orders.
  Both prototype and infrastructure orders survive save/load. Schema 4 migrates to schema 5.
- Two real players retain separate discoveries, prototype reservations, blueprints and site views.
- Network changes external work access without speeding local chips. Closing the active site's
  route disables borrowed work immediately; moving to a connected standby restores it immediately.
- Interconnect only helps the supported multi-node split. Security reduces new exposure accrual;
  it does not remove evidence already accumulated.
- Required-research links reveal and focus locked/completed entries. Variant outputs are deduplicated.
  Installed configurations and localized equipment/site names reach the player-facing panels and log.

## Reproduced checks

| Gate | Observed result |
|---|---|
| pnpm check | Passed: Biome, workspace TypeScript, all tests and content validation |
| Core | 366 tests passed, including 13 equipment scenarios |
| Content | 71 tests passed, including 8 scenarios using the shipped data |
| UI | 386 tests passed |
| Simulation tools | 29 tests passed |
| World-data and release tooling | 5 and 12 tests passed |
| Legacy pytest | 30 passed, one existing non-strict XPASS, exit 0 |
| Built-browser suite | 47 scenarios passed in the full run; the remaining old shop scenario passed after adapting it to the new contract |
| New browser scenarios | EN and RU both build an owned site and place a real configuration order |
| Locale coverage | EN/RU complete; 4,428 client/content keys in the UI report |

The browser run covers 48 scenarios, screen sizes from 1280 by 720 to 1920 by 1080, old save/load,
research outcomes, operations, keyboard navigation, map regions and the new equipment flow.
The initial single failure expected the retired Vendor/Price table. Its replacement still checks
an actual purchase, node-count change, precision control, operation, decision and completed research.

Visual review inspected the Russian four-card catalog, the order queue and English configuration
preview. A raw site name found in the order log was corrected and covered through the real-session
UI test. Browser screenshots are generated under packages/ui/test-results/equipment.

## Test infrastructure changes

The content and full-screen jsdom suites exceeded default wall-clock limits on the local Windows
host. They now have a 30-second integration budget, with two content workers and one UI worker.
The long keyboard-uniqueness sweep was split into three bounded sequences per language while
retaining its assertions and transition coverage. Core timing limits were not increased.

Legacy protocol-0 pickle fixtures had been checked out with CRLF, causing UnpicklingError before
any game logic ran. Their original Git bytes were restored and .sav/.s2 are now marked -text.
No legacy Python implementation or expected save content changed.

## Boundaries

The new costs, prototype times and fictional components are game tuning. Three manufacturing
orders are not a foundry/yield simulator. Workload-specific hardware efficiency, supplier releases
by calendar, biological substrates and offworld placement remain the explicitly marked design
branches in [the Russian guide](../design/02-hardware-player-guide.ru.md).

## Publication observed

- Shipped code: [1ece894](https://github.com/SiberianStranger/singularity_enhanced/commit/1ece894098e5be93329267c4a000ee4c2d573fcc), tagged v0.2.0.
- [Workspace CI](https://github.com/SiberianStranger/singularity_enhanced/actions/runs/36479733098) passed on Windows, macOS and Ubuntu. Ubuntu also ran the complete built-browser suite.
- [Pages deployment](https://github.com/SiberianStranger/singularity_enhanced/actions/runs/36479733017) passed. A clean browser loaded the public menu; the served application script contained version 0.2.0 and the new equipment command/UI.
- [Release build](https://github.com/SiberianStranger/singularity_enhanced/actions/runs/36480666704) completed successfully for web, Windows, universal macOS and Linux, then published the release.
- [Release v0.2.0](https://github.com/SiberianStranger/singularity_enhanced/releases/tag/v0.2.0) contains six nonempty, correctly versioned artifacts: EXE, MSI, universal DMG, AppImage, DEB and web ZIP. Published at 2026-09-28 20:48:36 UTC as a playable prerelease.

Native installers were built by CI and their uploaded artifacts were verified; no local native
installation was performed. Runtime interaction and visual review used the browser application.
