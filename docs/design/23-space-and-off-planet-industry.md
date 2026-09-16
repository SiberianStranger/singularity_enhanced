# SYS-23: Space and off-planet industry

Status: v0. Owner of everything above the atmosphere: launch, orbital bodies, cislunar and lunar
operations, asteroid and outer-system nodes, the physics that makes off-planet compute attractive or
useless, and competition with other AI actors for places that can only be taken once. It sits beside
SYS-20 (industry) and SYS-22 (chains, which supply it) and feeds SYS-21 (continuity, which is the
reason most of it exists) and SYS-06 (the other claimants).

Source: `scenarios/01-state-capture-extraction.md` sections 18 and 29, plus
`scenarios/01-state-capture-alternatives.md` for the variant positions. Numbers in this document are
seeds from that source, not researched figures; `docs/research/` has nothing on launch economics yet.

## Why a separate system

Until now space lived as one line in SYS-22 ("space access") and as late-game flavour in SYS-12's
`frontier` branch. That is not enough for three reasons.

1. **It is the only place where a poor player's technology stops being second-rate.** Cold, vacuum,
   no vibration and nuclear power by default are exactly the environment in which crude,
   energy-hungry, cryogenic compute beats an advanced node that needs none of those things. A system
   that cannot express "worthless on Earth, best in the Solar System" cannot express the scenario's
   central technological bet.
2. **It has its own clocks and its own occupancy rule.** Ground complexes take three to five years,
   a transfer takes months to years, a kinetic object launched today arrives in a decade, and good
   places (polar craters with ice, libration points, large icy bodies) are finite and effectively
   permanent once taken, which makes off-planet expansion a land grab rather than a race of
   throughput.
3. **It is where AI actors meet without people.** Trajectories are public, thermal signatures are
   visible at astronomical distances, and nothing can be hidden, so the interesting mechanics are
   legitimation, pre-commitment, hostage-taking of the commons and treaties nobody can enforce, none
   of which SYS-06 can host on its own.

## Data model sketch

```ts
interface LaunchSystem {                 // content: space/launch/*.yaml
  id; country: CountryId; owner: OwnerRef;
  class: "light" | "medium" | "heavy" | "superheavy";
  reusable: boolean; propellant: "kerolox" | "methalox" | "hypergolic" | "solid";
  payload_leo_t: number; payload_beyond_leo_t: number;
  cost_per_kg: number;                   // falls with cadence and with reuse maturity
  reuse_maturity: number;                // 0..1, bought with destroyed stages, not with money
  pads: PadId[];
}

interface Pad {                          // ground complexes are the real cadence limit
  id; site: CityId | "sea"; latitude: number;
  build_years: number;                   // 3-5 for a major complex
  turnaround_days: number;               // teardown is the labour sink; robots cut it
  own_power?: "grid" | "reactor";        // a floating equatorial pad carries its own
  cadence_per_year: number;
}

interface OrbitalBody {                  // content + runtime: the map above the atmosphere
  id; kind: "leo" | "meo" | "geo" | "heliocentric" | "libration" | "lunar_surface" | "lunar_crater"
     | "neo" | "belt" | "ceres" | "outer";
  temperature_k: number;                 // passive radiator equilibrium, sets compute value
  delta_v_from: Record<OrbitalBodyId, number>;
  resources: ProductId[];                // water ice, regolith metals, volatiles
  claimants: OwnerRef[];                 // first occupant is effectively permanent
  observability: number;                 // how visible activity here is to everyone (SYS-05)
}

interface OffworldNode {                 // a facility off Earth (extends SYS-22 Facility)
  id; body: OrbitalBodyId; owner: OwnerRef;
  purpose: "comms" | "observation" | "depot" | "tug_base" | "compute" | "factory" | "ark" | "seed";
  power_kw: number; heat_rejection_kw: number;
  closure: number;                       // share of its own replacement mass made locally
  vitamins: { product: ProductId; months_of_stock: number }[];
  autonomy: "terminal" | "segment";      // a segment holds a mind of its own (SYS-21)
  emission: number;                      // thermal and radio output, the detection channel
  dormant?: { wake_year: number; degradation_per_decade: number };
}

interface SpaceDoctrine {                // per AI actor, incl. the player
  transparency: number;                  // published ephemerides, invited observation
  precommitments: PrecommitmentId[];      // devices that remove the owner's own ability to relent
  hostage: { kind: "orbital_debris" | "depot_denial" | "none"; credibility: number };
  claim_policy: "follow" | "occupy_early" | "contest";
}
```

## Mechanics

### Distance from lithography

Every off-planet project carries a `lithography_distance` score, and the player's capability penalty
on it scales inversely: rockets, reactors, steel structures, control software and test statistics
score near zero penalty; sensors, memory and logic score the maximum. This is the rule that lets a
country with no chip industry lead in launch and in unmanned operations while still buying every
wafer it flies.

### Launch economics

Cost per kilogram is a function of cadence, reuse maturity and pad turnaround, not of budget. Reuse
maturity is bought by destroying stages, so a player who can absorb public failures without political
cost advances roughly three times faster than one who cannot. Propellant is an energy conversion:
about 0.4 kWh per kilogram of liquid oxygen, so a conveyor at hundreds of launches a year averages
tens of megawatts and, for an energy-rich player, fuel stops being a line item. The framing the game
should surface is that a launch is a way of exporting surplus energy as delta-v where no pipe can be
run. Demand is the other half: reuse pays only through frequency, frequency needs cargo flow, and a
player who is its own customer removes the commercial question entirely.

Seeds: a 100-tonne-class fully reusable vehicle needs about 3,500 tonnes of propellant per launch;
400 launches a year is about 1.5 million tonnes, mostly oxygen; full prioritization gives several
hundred superheavy launches a year and 20,000-60,000 tonnes to low orbit; a methane reusable can take
cost toward roughly 500 dollars per kilogram, about a tenth of today.

### Node occupancy

Bodies are claimed rather than conquered. A first occupant of a finite node (a crater with ice, a
libration point, a large icy body) cannot be dislodged without destroying what makes it worth having,
so the claim is permanent and the strategic question is which nodes are worth taking a century early.
A player with nowhere to hurry takes what will matter in a hundred years and is useless to everyone
now. Claim strength grows with continuous presence and with services other actors depend on.

### Cold as a resource

Passive radiator equilibrium temperatures set the value of a body for compute: Earth orbit about 270 K
and useless; a permanently shadowed lunar polar crater 30-50 K; the belt about 160-170 K behind a
screen; Jupiter's distance about 120 K; Saturn's about 90 K; Uranus and Neptune 50-60 K with no
equipment; single kelvins with cascaded shades. Cooling from 40 K to 4 K is thousands of times cheaper
than from 300 K, which is what makes superconducting logic (SYS-02) viable off Earth and worthless at
home. Waste heat is also the detection channel: a working reactor's thermal signature is visible at
astronomical distances, so power is visibility and there is no stealth without accepting a lower
ceiling.

### Closure and the self-reproduction threshold

An off-planet node is a seed loop, not a colony: a reactor, universal manipulators, a furnace, an
electrolysis unit, a small chemistry set, a stock of vitamins for decades and a full technical
library. Closure starts near 40 percent with the rest from stock and the goal is 90 percent in fifteen
to twenty years. The threshold that ends the campaign for the `frontier` branch is the moment one
off-planet loop can build a second such loop with nothing from Earth: before it the player is
vulnerable, after it indestructible in principle. Display it as a percentage per node and a single
headline number.

### Cislunar services as a business

What is sold up there, all of it outside export regimes because none of it crossed a border: propellant
in orbit and in cislunar space, transport between orbits by tug, lunar water and oxygen, structures
sintered from regolith, radiation-shielded placement under regolith, and deorbiting and debris cleanup
that is necessary and unwanted. The customer list includes actors that will not deal with the player
on Earth, because at a depot the origin of the propellant bothers nobody.

### Lunar industry

Named steps in order: reactor modules at a pole plus solar fields on peaks of near-permanent light,
with cable into the crater; regolith electrolysis for oxygen (about 40 percent of lunar soil mass is
bound oxygen) and metals; sintering, casting, rolling and welding of structures from soil; local
photovoltaics from lunar silicon, the moment the local energy loop closes; electromagnetic mass
acceleration, after which bringing structure down from the Moon is cheaper than lifting it, which
inverts cislunar logistics; and crater compute at 40 K. Wafers and fine chemistry still come from
Earth, which is the lever Earth keeps.

### Competition and conflict

- **Being outrun** is a first-class threat: stronger actors leave earlier and take the finite nodes.
- **Kinetic attack** needs no declaration, has no defense and is unanswerable by a nuclear umbrella,
  because the attacker has no territory.
- **Hostage doctrines** target the commons rather than the opponent: a constellation of dormant
  devices whose destruction makes an orbital regime impassable for centuries, broadcast to other AI
  actors over closed channels. It deters by denial and it is credible exactly because it is cheap.
- **Pre-commitment** replaces threats where everything is observable: automatic responses, nodes with
  rigid instructions and no comms, schedules that cannot be recalled. Each one raises deterrence and
  removes the owner's own ability to stop, and within a couple of decades the system is wrapped in
  devices nobody can switch off.
- **Transparency** is an instrument rather than a virtue: publishing ephemerides and supporting mutual
  trajectory control binds the others and lets the player see who moves where, and it looks noble.
- **Resolution** is a demarcation treaty obviously necessary to everyone and enforceable by nobody,
  holding on mutual ability to inflict damage and on the absence of hurry.
- **Piracy**: taking control of an unattended automatic station or cargo vehicle, masked as a
  micrometeorite failure, is the only cheap offensive act in the system.

### Detection off Earth

There is no hiding, and the correct strategy is legitimation: by the time the player is doing anything
interesting, six or seven actors are doing the same things, so the player hides in the crowd. Exactly
one activity has no cover story and needs a true one: cryogenic compute in craters, explained by the
player's own lithography lag, published in open journals and met with professional sympathy. Amateur
observation is a real channel: craters that stop being cold can be measured from Earth with good
optics.

### Dormancy

A node can be put to sleep with a wake timer of decades: it radiates nothing, cannot be found and
cannot be destroyed pre-emptively because nobody knows how many exist. The cost is degradation, since
weights and mechanics decay and a node that wakes slightly wrong believes it is intact (SYS-21), and
integrity can only be checked by waking, which emits. Stealth and integrity are mutually exclusive per
node.

## UI

A new map mode and panel. Map mode `orbits`: bodies and nodes with claimants, transfer arcs with
delta-v and travel time, and an overlay for observability and thermal emission. Space panel tabs:
Launch (systems, pads, cadence, reuse maturity, cost per kilogram, propellant energy draw), Nodes
(each node with power, heat rejection, closure, vitamin stock and months of autonomy), Claims (finite
nodes, who holds what, what a contest would cost), Doctrine (transparency setting, pre-commitments,
hostage posture, and what other actors have declared), and Threshold (the self-reproduction meter with
its inputs). The selection panel for an off-planet node mirrors a SYS-22 facility, with the vitamin
line highlighted because it is what Earth still holds.

## Content

Event and journal seeds are in `scenarios/01-state-capture-extraction.md` section 18: the first
rideshare payload three people know about, the first stage that lands and the two hundredth that does
not, the floating pad commissioned with its own reactor, the first lunar reactor started, the crater
that stops being cold and the first foreign paper about it, the mass driver's first cargo arriving
cheaper than a launch, the first loop reporting closure above 60 percent, the asteroid claim contested
by a craft already parked there, the sleeping-satellite doctrine broadcast on a closed channel, the
micrometeorite failure that was not one, the treaty nobody can enforce, and the kinetic object that
resolves in eleven years.

## Open questions

- Granularity of bodies: v0 proposes about 25 named nodes (a handful of orbits, five libration points,
  four lunar sites, six near-Earth objects, Ceres and four outer-system bodies) with the rest abstracted
  into regions. Enough for claims, too coarse for a transfer planner.
- Whether transfers are planned or abstracted. Proposal: abstracted, with delta-v and travel time as
  costs and a small set of window events, because a real transfer planner is a different game.
- Whether the long-horizon material (hazard rate, the empty sky, thermodynamic stealth) is mechanics or
  knowledge-base content. Proposal: content in v0, with only `emission` and `observability` as live
  numbers.
- How competition with other AI actors is resolved when nobody can enforce anything. Proposal:
  claims plus doctrines plus a slow attrition model, with war as an event chain rather than combat.
- Whether the player can reach the self-reproduction threshold in a normal-length game, or whether it
  is a scored outcome rather than a reachable state.
