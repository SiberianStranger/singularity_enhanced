# SYS-02: playable archetypes and site equipment

Status: v1 implemented and released in 0.2.0, 2026-09-28. Supersedes the default catalog UI proposed on
2026-09-20. The maintainer requested actual game implementation, documentation and release.

INTENT: code sells raw accelerator records; the task requires gradually revealed singular archetypes, material research outputs and distinct site subsystems; SYS-02 and the maintainer require understandable tradeoffs and physical installation constraints.

## Committed implementation

The primary item is a complete configuration with a singular archetype name. A small number of
authored variants carries at most one visible modifier, with real product names in an expandable
basis line. Variant effects are the configuration's actual characteristics, never a second brand
multiplier. All 94 accelerator records remain reference components. The normal purchase flow does
not expose them as 94 choices. The catalog only sends discovered equipment offers for this player.

Content defines configurations for Compute, Power, Cooling, Network, Interconnect and Security &
Ops. Compute may contain several assemblies; the other five slots each have one installed option
and at most one pending replacement. Inherited service is the neutral default for existing sites.
Host-controlled and borrowed sites do not grant physical modification rights. The rules are checked
by the engine and used by its quote, so a forged command cannot bypass the interface.

Research dependencies unlock products and infrastructure. A custom assembly has a one-time
prototype stage, followed by manufacturing/delivery. A queued order reserves its capacity and costs
cash once. It contributes no compute before installation. Subsequent runs can reproduce a validated
design. The initial production model is an order chain, not a full fabrication-facility simulator.

Power and Cooling constrain installed load; Cooling also changes the facility overhead. Network
changes reachability/traffic exposure without making a chip faster. Interconnect improves supported
parallel work, without creating NVLink on a card. Security changes future exposure accrual and
service cost, never erases already accumulated evidence. Cost and supply values in new content are
explicit game tuning. Inherited configurations remain unchanged until the player chooses an upgrade.

The distant seven-rung proposal is a map of optional research directions, not a forced convergence
of all products. Unsupported space/biological/new-physics devices are not sold as working hardware.
Real products and announced supplier developments remain distinct from authored future branches.

## Execution checklist

- [x] Inspect code, content, UI, migrations and deployment; verify Jalapeño primary sources.
- [x] Add equipment content, validation, per-player reveal and bounded variants.
- [x] Implement authoritative quotes, orders, installation, subsystem effects and save migration.
- [x] Replace raw shopping with archetypes; expose slots and material research outputs.
- [x] Exercise early starts, custom production, invalid orders, save/load and multiplayer isolation.
- [x] Run project checks, legacy tests, browser flows and visual EN/RU checks.
- [x] Update readable Russian explanation, README/changelog/version; publish and verify release.

## Verification and assumptions

Done means an actual player can order a discovered configuration, read its cost and limiting
requirement, wait for its installation, and observe the same result the quote promised. At least
one prototype order and one infrastructure replacement must survive a save/load round trip.
Core refusals must match the quoted reason. Existing pnpm checks and legacy tests stay green;
the built browser must be inspected at narrow supported sizes in both languages. Release artifacts
and the deployed version must be observed after push.

No new hardware throughput formula is claimed as a real benchmark. The existing simulation's
memory/bandwidth model is retained with explicit bounded infrastructure effects. The full workload
estimator, industrial supply graph and offworld map remain separate systems; new UI does not imply
that these have already shipped.

## Open tuning questions

Use playtests to refine the first revealed set and the price/time of prototypes. The first release
should measure choices and resulting tradeoffs before adding random affixes or more archetypes.

## Implementation notes

The shipped increment contains 13 physical compute archetypes and one provider rental archetype,
21 compute offers and 15 supporting subsystem configurations. Four compute archetypes are initially
known. The detailed Russian guide is [here](02-hardware-player-guide.ru.md).

Content-build and jsdom screen integration suites have a 30-second test budget and at most two
workers. Repeated catalog builds exceeded the default five-second timeout on the local Windows
host; their functional assertions and ordinary assertion wait limits are unchanged. Core tests
retain their existing timing configuration. This is an integration-test I/O budget, not a claimed
gameplay performance improvement.

## Publication

[Release 0.2.0](https://github.com/SiberianStranger/singularity_enhanced/releases/tag/v0.2.0)
was published after successful Windows, macOS and Linux workspace checks. The six release
artifacts and the deployed web version were observed. See the
[verification report](../playtests/2026-09-28-equipment-archetypes.md) for the evidence and boundaries.
