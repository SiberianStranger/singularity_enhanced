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
