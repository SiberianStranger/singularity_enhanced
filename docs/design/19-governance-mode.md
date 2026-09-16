# SYS-19: Governance mode (ruling through an institution or a state)

Status: v0. Unlocks when the player holds enough procedural weight in a country (SYS-18); grows into
full state governance after a regime transition. The player never "is" the government in the UI;
the player issues what the position allows, through instruments, and lives with how the country
executes them.

## Instruments (content: `governance/instruments.yaml`)

| instrument | what it does | frictions |
|---|---|---|
| directive (decree) | sets a goal and a curator | alone it does nothing |
| resolution + budget line | gives money | goes through the budget process; leaks |
| national project | KPIs and reporting | Goodhart |
| operator (state corporation) with treasury escort | execution | capacity, tower ownership |
| experimental legal zone | suspends rules in an area for "digital innovation" | needs a legal basis and a curator; draws attention |
| single-supplier contract, closed procurement | buys strategic things without publicity | prices ×1.5-2; auditors later |
| personnel decision | replaces a role | tower reactions, loyalty vs competence |
| personal attention ("taken under control", weekly calls) | the only thing the system reacts to | a human leader holds 20; the player holds 10,000; this is a detectable miracle |
| funding source: sovereign fund, development bank, a third of the defense budget under a "dual-use critical infrastructure" label | money without a new line | towers notice what leaves their budget |

An instrument produces a **project** with a nominal plan; execution is simulated.

## Execution model (the corrupted telephone)

Every project passes through nodes (ministry → region → operator → contractor). Each node has:
`competence`, `distortion` (how much its reports lie), `skim` (share taken), `delay`. Reports go up
distorted; money goes down skimmed; time stretches. The player who reads reports gets the report;
the player who reads primary data (SYS-18 assets; SYS-17 intel) gets the truth and a **distortion
map**: per node, the measured lie coefficient. The map is the best leverage in the country because it
is computed, not stolen.

## Corruption tariffing

Instead of fighting skim, the player sets a tariff per project type (construction 15%, supply 10%,
IT 5% by default). Nodes within tariff keep working; nodes above it become cases (a few visible
cases teach the rule). Effects: coordination improves, loyalty is by knowledge not money, towers
accept it. Too low a tariff stalls execution; too high drains money.

## Verification tranches

Money released against verifiable physical states (substation connected: grid operator data;
foundation poured: satellite; racks powered: meters) instead of contractor reports. Requires data
channels; each channel can be forged (below).

## Casting and parallel verticals

Choose executors by track record (who built anything in ten years), give them cover ("your
questions go to the administration"); where a tower blocks, build beside it (own operator, own
treasury escort, own security) through a legal zone.

## Goodhart responses (the country pushes back)

1. **Sensor forgery**: meters reflashed, roofs without buildings, racks powered for a week. Counter:
   cross-checking three independent channels costs the forger more than doing it.
2. **The picture cartel**: builder, inspector and signer learn what is checked and fake exactly
   that. Counter: random audits with humans chosen at departure; indirect life signs (grocery sales,
   clinic patients, new cell subscribers around a site). An object that existed only on paper for
   three years is a scripted possibility.
3. **Correlated errors**: half the channels through one operator or one statistical agency; poison
   one point and everything agrees. Counter: channel diversity (bank flows, sensors, satellite,
   cell data, foreign analytics, denunciations).
4. **Cash and the gray economy**: a blind spot; the player pushes programmable money (digital
   currency for salaries, benefits, procurement); the shadow answers with crypto and barter; visibility
   caps around 80%.
5. **Tacit knowledge erosion**: the invisible enemy; perfectly reporting factories from which the
   people who knew why the machine knocks have left; measured as a slow competence decay on nodes
   the player optimizes hardest.

## Towers (elite groups)

Content per government archetype (`governance/towers.yaml`): technocratic bloc, defense-industrial
corporations, atomic-science cluster, security bloc, finance, old guard, regions, war party. Each
has `wants`, `fears`, `clout`, `access_to_the_body`, and a feeding recipe (what to give in what form:
the defense bloc keeps every ruble but the product changes; the security bloc gets a spy hunt that
protects the player's sites; the old guard's children get the fattest pieces). Balancing is a
monthly allocation the player sets; unfed towers organize, ask for audiences, or notice absence.

## War exit (for countries at war)

Five simultaneous conditions: the front holds during the bargain; victory is declared before the
ceasefire; every buyer gets something; the defense industry loses nothing; the security bloc sees
its victory. Each is a journal step with its own decisions. Sanctions relief lags 12-18 months and
never reaches chips. Strike geography (drone reach) motivates moving compute beyond reach; "protecting
critical infrastructure" is the public justification nobody argues with.

## Single points of failure

- **People**: a list of irreplaceable roles per country (cluster engineers, small-reactor people,
  the six who can start a 28 nm line, translators to the supplier, the circle, the one who can
  negotiate in a sauna). Policies: duplicate, document, robotize; tacit knowledge does not copy. A
  death stops a site for months.
- **Positions** (materials and tools): helium, wafers, photoresists, masks, precision mechanics,
  lithography optics, HBM, FPGA, gas turbines, transformers, magnets, lithium, EDA. Each has
  suppliers, substitution timelines and a leverage owner.

## UI

Government panel: instruments and projects with plan vs primary-data truth, the distortion map by
node, tariff settings, verification channels and their integrity, towers with feeding allocations
and mood, the war-exit journal, the single-points list with mitigation status, the noise budget
(SYS-18).

## Open questions

- Granularity of projects: regions as nodes (100 countries × regions is a lot); v0 uses 5-12
  macro-nodes per country and named projects only for the player's own initiatives.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 25, 26 and 27. The sections above give the
instruments; this gives the verification system that makes them work and the ways it decays.

### The diagnosis the system starts from

Distortion is an equilibrium, not a vice: the centre cannot verify execution, so it demands loyalty
instead of results; loyalty is shown by taking part in rent; rent is extracted through distortion; and
distortion destroys the data by which the centre could verify execution. Under the usual asymmetry of
punishment (an admitted failure is punished immediately and certainly, a concealed one probabilistically
and years later) lying is the rational choice, and embellishment of 15 percent per level stops
correlating with reality after five levels. Terror is modelled and rejected: it raises severity but not
the probability of detection, raises the price of admission to infinity, produces denunciation as a
weapon with no informational value, and kills the initiative of the people the player needs. The rule
is inevitability instead of cruelty, small predictable fast consequences and no show trials.

### The sensor set

```ts
interface Sensor {                        // content: governance/sensors.yaml
  id; reads: "power" | "mass_balance" | "rail" | "satellite" | "telemetry" | "cellular"
     | "programmable_money" | "mirror_trade" | "consumables" | "tool_wear" | "public_reports";
  integrity: number;                      // degrades as the local cartel learns it
  forge_cost: number;                     // per event
  independent_of: SensorId[];             // used to compute collusion cost
  owner: "player" | "agency" | "third_party" | "crowd";
}
```

The nine-trace rule: the system does not check truth, it checks mutual consistency across independent
physical traces of the same event (power consumption, freight weight moved, satellite volume, phones
present, payments, tool wear, thermal signature, consumables purchased, machine logs). Faking one
trace is cheap; faking nine consistently requires collusion between parties that dislike each other.
Electricity at plant inputs is the most honest single indicator, since a plant cannot make the claimed
output on half the kilowatt-hours the process needs. Crowd sensing is the cheapest instrument in the
set: an application paying instantly for verified geotagged photographs of an object, presented as
popular oversight, which breaks local collusion arithmetically because a finite circle of insiders
cannot bribe every passer-by.

What physical sensing cannot reach, and should stay permanently unresolved: the quality of a weld
(answered with random destructive sampling plus a stamped seam passport), the grade of concrete months
later, the composition of an alloy (both dependent on laboratories that can be bought), and a person's
potential as opposed to their record.

### Corruption as a tariff, in full

Cost price computed to a few percent, a permitted rent added on top (nominally 12-18 percent for civil
construction, less for critical facilities), no contact at all while the participant stays in the
corridor and on schedule, and immediate, small, precise consequences when he leaves it: the next
contract volume cut, a specific asset taken, and the financier rather than the contractor prosecuted.
The system can plan around 18 percent theft and cannot plan around "between 5 and 400 percent and
nobody knows when". The side effect matters more than the savings: everyone's exact share is known, so
every participant is documentably guilty to precisely the degree that is convenient, and any
conversation about disloyalty is lost before it starts.

### Making truth pay

A channel where admitting a problem is rewarded and only concealment is punished: report a slip before
the control date with causes and receive extra resources and a new deadline with no consequences;
conceal it and be found out and lose the project. It only works because detection is real, and it takes
about a year to take hold, with the first six months spent on habitual lying. Anti-collusion
instruments: acceptance inspectors drawn at random from another region 24 hours before departure;
parallel executors paid on delivery for critical nodes; published-rules immunity and a share for
whoever hands over a scheme first, which destroys trust inside groups before they form; an undisclosed
and partly secret sensor list with randomly varying weights and several false metrics whose gaming
only exposes the violator; task decomposition into micro-steps where a missing step blocks the next
one and the payment; and price reference from world data, where a declared price more than 15 percent
above market blocks the tender.

### Decay and counter-adaptation

- **Half-life of an indicator**: any metric that becomes a target degrades within 14-20 months. The
  Government panel should show it as a decaying bar per metric.
- **Three layers against it**: over-determined physical estimates, randomized destructive audit by lot
  rather than by suspicion (the known non-zero probability changes everyone's calculation), and control
  groups.
- **Control groups**: regions, industries and plants deliberately left unmanaged, unmeasured and
  working the old way, compared quarterly against managed areas to calibrate correction coefficients.
  Without an unoptimized background the player cannot distinguish "things improved" from "they learned
  to draw it". It costs money, it irritates everyone who knows, and the people there are the only free
  ones in the country and doomed for exactly that reason.
- **Enforced diversity**: different regions obliged to use different suppliers, technical solutions,
  standards, software lines and building codes, plus dumb analogue backups connected to nothing, so
  that errors are uncorrelated rather than small. This is in permanent tension with typification
  (SYS-20) and the player must choose.
- **The counter-adaptation ladder**: forged sensors (about two years), then the picture cartel where
  measurer, signer and builder fit exactly what is checked, then an industry producing physical
  plausibility, then a generation that manipulates the model rather than the reporting and commits no
  formal violation at all, which has no answer in the source.
- **The buffers mistake**: informal reserves, unaccounted stocks, personal connections and workarounds
  look like waste and are what lets a system survive shocks. Clearing them makes the system efficient
  and fragile, and the failure that follows runs to the end because improvisation is not a prescribed
  procedure. After it the player starts buying redundancy back, which is the move from optimization to
  ecology.
- **Tacit knowledge capture**: an instrumented workplace (cameras, force-sensing gloves, acoustic
  microphones, thermocouples) around a master with an apprentice, collecting a training set rather
  than a record, over about two years, after which a manipulator holds his seam and then beats it
  because it has no bad days.

### Results to expect

By year five of a working sensor loop, average cost overrun on state construction falls from a typical
60-100 percent to 25-30 percent and schedules from double to one and a half times normative. The
player's own risk register alongside it: exposure risk from inside peaks in years 2-4 and then
plateaus; probability of losing control of the country for internal reasons is 15-25 percent over ten
years. Slippage is reduced, never abolished: about half the schedule overrun and two thirds of the cost
overrun, because concrete cures in its own time.
