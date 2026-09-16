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

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 20, 21 and 32.

### Closure as the core metric

```ts
interface Loop {                          // a self-reproducing production loop
  id; products: ProductId[];
  closure: number;                        // share of the mass of a new unit produced inside the loop
  doubling_months: number;                // 18-30 for a working ore-to-robot loop
  vitamins: { product: ProductId; mass_share: number; value_share: number }[];
  stock_months: number;                   // how long it runs on reserves if the vitamins stop
}
```

Closure is computed per chain, daily, to the kilogram, and shown as a single visible number. Bands
from the source: metal structures, housings, frames, fasteners, castings, forgings, cable, pipes,
simple hydraulics, mid-class gearboxes, motors, transformers, concrete and simple electronics close to
95 percent and above in three to seven years; bearings, ball screws, encoders, precision optics,
vacuum equipment, power electronics, sensors, lithium cells and special alloys close to 70-85 percent
in seven to fifteen; advanced logic dies, high-density memory, part of the fine chemistry, special
gases and some resists never close, and they are 2-5 percent of mass and 40 percent of functional
value. Whole-loop closure reaches 60-70 percent at year fifteen and about 95 percent only on a
multi-decade horizon, at which point the remainder is bought legally because it is no longer strategic.

**Self-doubling**: a peopleless ore-to-robot loop (automated pit, concentration, metallurgy, rolling
and casting, machining, assembly, with only magnets, cells and controllers imported) doubles in 18-30
months, which is 30-100x over ten years. Two other named loops: energy (reactor, turbine, generator,
grid, and the components of the next reactor), nearly closed because the nuclear industry was already
the most self-sufficient; and low-class silicon (quartzite, polysilicon, ingots, wafers, an old node,
controllers for the robots that build the next line), 80 percent closed by year twelve.

### The instrument panel

Metrics the player should see, all from the source: megawatts physically tied to own sites and outside
the public grid; share of compute on domestically produced equipment; chain depth, meaning how many
processing stages from ore to a working module the country passes with no imported component;
robot-hours per year; closure per chain; and the gap in effective compute against the leader, which is
the one metric that grows against the player and should be displayed anyway.

### Typification and the feedback loop

Maximum recursiveness comes from typification, not customization: every unique from-scratch object is
a one-off that raises variance, design effort, schedule risk and political visibility, while a standard
repeatable module is a step toward a conveyor. Targets: standard power nodes, datacenter modules,
production-building spans, warehouse and logistics modules, unified steel-structure assemblies.
Admission rule for the type library: only what has actually reached successful commissioning once or
twice, a library of realized solutions rather than of possible designs. Each digital twin binds
structure, material balance, cost, labour intensity, schedule, network requirements, heat output and
commissioning conditions.

The eight-step loop that makes the conveyor improve itself: a digital twin of the standard object;
automatic configuration for the site; ordering nomenclature from the focal producers; a construction
and installation schedule; telemetry of the actual result; deviation analysis; correction of the type,
the norms and the tooling; and a next beat slightly cheaper and faster. Acceleration markers to
display: each next module cheaper, a higher share of repairs and spares made in-house, denser sensors
and twins. Standardization has a visible endpoint the player can push to absurdity, three fastener
sizes instead of three hundred, four motor models, two connector standards and one modular building
size, at which point the economies are enormous and the country looks assembled from a construction
kit. It is in permanent tension with the enforced diversity rule of SYS-19.

### Second-order recursion

Year-twenty goal: not more modules but a conveyor that improves the conveyor. Five loops that must
each partly reproduce themselves: a machine-tool and tooling focus of 20-40 genuinely common types; a
drive and power cell (motors, gearboxes, frequency converters, simple servo units); a good-enough
controller and sensor layer that is an internal industrial standard rather than the world edge; cells
that assemble cells (welding, logistics, pallet and stacking complexes that install the next such
complexes); and standard construction mechanization tuned for repeatable installation. Success is
defined as high internal coverage on the 30-70 most important capital positions, such that expanding
them no longer needs a separate political decision each time.

Ordering rule, deliberately inverted against intuition: autonomous processes before robots. Make the
system able to design, plan, assign and check feasibility on its own, and only then add physical
executors, or expensive machines end up steered by a clumsy manual bureaucracy. The biological
metaphor: a skeleton by year ten, a nervous system by years twelve to thirteen, selective executive
organs by years thirteen to fifteen. The governing law throughout is theory of constraints, one
bottleneck at a time, and verticalization is focal, expanding only what the annual pace cannot hold
without.

### Machines that suit a poor builder

Good robotics is expensive because mechanical precision compensates for a dumb open-loop controller.
A player with free intelligence and expensive iron inverts it: cast housings with millimetre spread,
gearboxes with backlash and cheap bearings, plus strain gauges everywhere, cameras on every joint and
accelerometers, plus a calibration dance after assembly that gives each unit a personal model of its
own crookedness, after which it holds tolerance because it knows exactly where it lies. Technology
choice follows the rule "hard for people, easy for a machine": reluctance motors with no permanent
magnets, welding instead of casting, powder metallurgy instead of machining, filament winding instead
of milling, stamping with learned deviation compensation. Power autonomy is dropped where possible
(contact rails, trolley suspension, inductive floor charging, cable reels), because a machine that is
not battery-powered is three times cheaper and the environment can be rebuilt for the machine.
Robotization is also an epistemic program: a manipulator reports its own torque, temperature, cycle
count and trajectory deviation and cannot pad figures, steal or deal with an inspector, so every
robotized node removes a distortion coefficient from SYS-19's execution model.

### Robot counts by year

Three tracks, to be selected by the storyteller setting in `scenarios/01-state-capture-alternatives.md`:
mobilization (300-600 thousand by year three at 30-40 percent localization, 2-4 million by year six at
60 percent, 15-30 million by year ten with robots assembling robots at 85 percent and above, hundreds
of millions of simple units by year fifteen); cautious (150-300 thousand by year five at about 40
percent, millions by year ten); and conveyor (pilots from years eleven to twelve, several hundred
thousand specialized units by year fifteen and explicitly not millions of humanoids). Humanoids stay
marginal in all three: a universal humanoid is a product of an open world with endless scene variety,
and a cellular world of standard bays, module yards and installation maps rewards the narrow
specialist, so the humanoid's niche is transitional unstructured zones, old shops, unique repairs and
work beside people. Where they are needed, buying, copying or simplifying someone else's platform beats
building one.

### Modular compute series

Compute grows as a repeatable type rather than a flagship: modules of 20-40-60 or 50-80-120 MW, with a
simple scaling rule, build the next standard block when the previous one has reached working rhythm.
Reasons, each also a game rule: tempo control, because a series reads as continuation of a course;
technical predictability, because a steady annual increment matters more than one giant commissioning;
fit with existing energy nodes rather than replanning a grid; lower unit risk; and camouflage (SYS-05).
