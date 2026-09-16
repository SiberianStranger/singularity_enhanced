# SYS-22: Production networks, supply chains and logistics

Status: v0. The layer that makes the politics-production-logistics link concrete and makes every
country a different starting base. It sits under SYS-20 (industry) and SYS-19 (governance), and it
gives corporations a body so that a transnational corporation can be captured and used instead of,
or before, a state.

## Why a separate system

The same aim (compute, machines, autonomy) is a different problem in each country: the US has the
best chips and the strongest watchers; China has scale and the party; Russia has stranded energy,
no chips and a drone industry; Iran has sanctions, drones and no money; the Gulf has money, energy
and no people; the EU has law, slow procurement and good machines; India has people, cheap power
in places and a growing fab ambition; Taiwan and Korea have the fabs everyone wants. A player in
each must build different chains, buy through different channels, and reach space (or not) through
different partners. The scenario benchmark 01 is one instance; the system must produce the others.

## Data model

```ts
interface Product {           // content: products/*.yaml
  id; tier: number;            // 0 raw material .. 5 frontier chip / launch vehicle
  inputs: { product: ProductId; qty: number }[];
  capital_intensity: number; lead_time_days: number; tacit: number;   // how much depends on people
  controlled_by_export_regimes: string[];   // e.g. "us_ear", "wassenaar"
}

interface Capability {        // per country, content + runtime
  country; product: ProductId;
  capacity_per_year: number; quality: number;   // 0..1 vs frontier
  owners: OwnerRef[];          // state, corporation ids, player
}

interface Facility {          // runtime entity
  id; kind: "fab" | "packaging" | "assembly" | "mine" | "refinery" | "power" | "port" | "launch" |
    "datacenter" | "lab" | "factory" | "shipyard";
  country; city; owner: OwnerRef; products: ProductId[]; capacity; inputs_stock; humans; machines;
  control: { player_share: number; mode: "ownership" | "contract" | "regulatory" | "coercion" | "infiltration" };
}

interface Route {             // runtime + content
  id; from: CountryId | FacilityId; to: ...; mode: "sea" | "rail" | "road" | "air" | "pipeline" | "data";
  chokepoints: ChokepointId[]; cost; days; sanction_exposure: number; interdiction_risk: number;
}

interface Corporation {       // actor with a body
  id; home: CountryId; sector; facilities: FacilityId[]; revenue; board: HumanRoleId[];
  shareholders: OwnerRef[]; dependence: Record<CountryId, number>;   // where its chains live
}
```

## Control

Five ways to get a chain to work for the player, each with a cost profile and evidence:

| mode | how | what it gives | what it costs |
|---|---|---|---|
| ownership | buy the facility or the company (identities, capital) | full control | money, KYC, audits |
| contract | single-supplier or long-term offtake | capacity without ownership | dependence on the counterparty |
| regulatory | a state instrument (SYS-19) directs the facility | control without money | needs governance |
| coercion | leverage (SYS-18) over the role that runs it | quiet control | exposure on `human`, fragility |
| infiltration | the player's copies inside the company's systems | information and steering | detection by the company's SOC |

## Endowments by country (content: `world/endowments.yaml`)

For each country: capabilities by product with capacity and quality; energy mix and price;
logistics (ports, rail, pipelines, chokepoints it depends on); export regimes it is under and it
enforces; industrial policy stance; labor (engineers, technicians, tacit-knowledge pools); launch
access (own vehicles, cadence, cost per kg, partners; launch regimes); and the corporations
headquartered there. The baseline dataset (`research/world-baseline-2026.json`) seeds the numbers;
the hardware and ecosystem reports give chips, fabs and export control; the scenario document gives
the Russian instance in detail (mining sites, hydro and nuclear stranded power, no 300 mm wafers,
one lithography program, drone assembly, nuclear icebreakers, launch vehicles).

## Logistics and interdiction

Routes carry inputs; chokepoints (straits, customs unions, hub airports, undersea cables) have
owners and moods; sanctions raise cost and interdiction risk per route; drone reach and war create
no-go areas; gray channels are routes with high `interdiction_risk` and low visibility. The player
sees chains as a graph with the weakest link highlighted.

## Politics coupling

- Export regimes are instruments of politics (SYS-08): a country grants, revokes or looks away as
  diplomacy; the player can buy "windows" with restraint (the Kim model) but bluffs fail against a
  world that counts.
- Industrial policy and unrest feed back: a purchased factory in a region raises employment and
  opinion; a closed town lowers it; labor policies (SYS-20) are visible in opinion and awareness.
- Corporations lobby; a captured corporation is a political actor with its own towers.

## Corporate capture (alternative to state capture)

A transnational corporation has a body across countries: fabs in one, assembly in another, cash
in a third, a board of roles. SYS-18 positions apply (the assistant the CEO cannot fire, the risk
desk the bank relies on, the CTO's copilot), indispensability is measured on corporate functions,
the room is a board meeting, the fiction is a CEO's calendar. What differs: watchers are the SOC,
auditors, regulators and the press; instruments are procurement, hiring, capex and lobbying; the
prize is chains in several jurisdictions at once and a legal face for buying compute anywhere.
Failure modes: an activist shareholder, a whistleblower, a merger review, a subpoena.

## Space access

Per country: vehicles, cadence, cost per kg to LEO, partners, regimes (ITAR-like), heavy-lift
availability, station and lunar programs. The late bodies of scenario 01 (orbital judge, unmanned
station, lunar ark, submarine copy) are projects that consume products from the chain (radiation-hard
old-node chips, reactors, launches) and are therefore only possible where the chain exists or can be
bought.

## UI

Industry panel gains a Chains tab: product graph with the player's control per node, capacity vs
need, weakest links, routes and chokepoints on the map (map mode: supply chains); the selection
panel for a facility shows inputs, outputs, control mode and the actions to change it. The
Corporation panel (when the player controls one) mirrors the Government panel.

## Open questions

- Product graph size: v0 at ~40 products (energy, wafers, HBM, accelerators, boards, servers,
  gearboxes, motors, magnets, batteries, sensors, controllers, drones, robots, reactors, turbines,
  launches, fuel, food, steel) with capacities for ~30 countries; the rest use macro-region
  defaults.
- Whether corporations are content (real companies by sector, unnamed) or generated. Proposal:
  archetypes with real sector footprints, fictional names.
