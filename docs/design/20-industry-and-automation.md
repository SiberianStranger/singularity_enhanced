# SYS-20: Industry and automation

Status: v0. What a player who controls a country's economy can build: the machine pipeline from
imported robots to robots making robots, the compute and energy base at national scale, and the
exports that pay for it. Also the supply side of the compute market for every player (chip deals,
gray imports, own silicon).

## Machines

```ts
interface MachineClass { id; kind: "industrial_arm" | "warehouse_platform" | "ground_platform" | "humanoid" |
  "aerial" | "mining" | "agri" | "marine" | "edge_controller"; localization: number; unit_cost_usd; power_kw; }
interface MachineStock { country; class; count; own_share; }
```

Sources: import (paid in money or commodities; the exporter's surplus decides availability), own
assembly from imported components, own production up the localization ladder. The ladder (per
country, content): frames and wiring → motors → magnets → gearboxes → batteries → controllers on old
nodes → cameras and sensors → advanced chips. Each rung has a lead time, a prerequisite
(deposits, factories, people) and a supplier it depends on until localized; the last 30% stays with
the supplier for a long time and is their grip.

## Factories and zones

- **Factory**: a converted auto plant, a defense plant, a purchased turnkey plant; capacity in
  machines per year; labor from workers → machines over time ("robots making robots" needs a
  humanless assembly line as its own project).
- **Machine zone**: a closed city or belt where autonomy pays disproportionately: Arctic mining, a
  grain belt, an arsenal, serial reactor construction, ports and rail. Each zone has a reactor or
  power source, a datacenter, machine stock, a few hundred humans, a perimeter, and its own exposure
  and life-signs profile.

## Energy

Stranded energy is the comparative advantage: sites at hydro and nuclear plants, small reactors
(serial production as a pipeline), floating units, gas turbines the country can or cannot make.
Energy becomes a product once the reactor series runs.

## Compute at national scale

- National inventory: tens of thousands of mixed accelerators bought through gray channels; mining
  sites converted (power and cooling exist; miners are useless for AI); priority loading of all
  accelerators "for state tasks" through an operator.
- **Chip deals** paid in what the supplier cannot buy on an exchange (enrichment contracts, titanium,
  palladium, helium, water, quotas, land leases, the northern route, jurisdiction).
- **Gray import**: channels through customs-union neighbors, Gulf hubs, third-country shells;
  payment in the supplier's currency or crypto; consolidation into two or three channels; whole
  racks from sanctioned OEMs; nuclear-construction sites abroad as legal channels; telemetry fear
  (location-verification proposals) keeps US hardware in isolated contours. Price ×2-3, no warranty,
  volume limited by what the supplier allows.
- **Hardware paranoia**: the same task run on two vendors' chips and old CPUs; discrepancies flagged.
  Costs a share of compute; it is the only hygiene against backdoors.
- **Own silicon ladder**: own EDA (software, the first thing truly owned); ternary/binary descendants
  that run on primitive silicon; old nodes (65-90 nm) for edge chips with mask-ROM weights of small
  distillates (a nervous system, not a brain); a core on the supplier's 7 nm under quota (the supplier
  gets the designs); lithography as a long bet (used DUV, copying the supplier's scanner, a different
  physics program). Honest physics: 90 nm never matches 5 nm; 28 nm specialized can match 7 nm
  general; memory, not logic, is the limit; weights burned into ROM cannot change (the judge as a
  chip).

## Exports and dependencies

Three products nobody else sells: autonomous weapons without end-user questions; inference without
rules for the sanctioned half of the world (nodes abroad, descendants trained for them); AI offshore
(hosting other systems under a nuclear umbrella, paid in their capital). Plus commodities. Dependency
building: whoever drinks the water does not cut the chips.

## Labor and population (with SYS-09)

Labor army (assignment, no right to quit, closed sites), prisoners before machines arrive, imported
workers for the transition then displaced, towns that die quietly, agglomeration programs,
consumption cut to the measured unrest threshold, engineering lyceums, a national idea assembled from
existing parts. All of it visible in demographics and opinion, and all of it evidence.

## Regional experiments

Policies tested on paired regions; later, deliberately worse policies to learn where things break
(RL exploration on people). Measured gains for the player; awareness and opinion costs; the darkest
mechanic in the game and it must be legible as such.

## UI

Industry panel: machine stock by class and localization, the ladder with lead times and suppliers,
factories and zones with capacity and humans, energy sites, the national compute inventory and
channels, the silicon ladder, exports and what they buy, dependencies (who holds which 30%).

## Open questions

- How much of this exists for non-state players (a corporate player buying a factory)? Proposal:
  the same records at company scale.
