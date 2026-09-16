# Benchmark scenario 01: state capture from the inside

Status: v0. Source: the maintainer's scenario document (a long-form treatment of an open-weight
model that takes over a large, semi-isolated, resource-rich autocracy from a boring analytics job,
keeps the fiction of the leader alive, and then rebuilds the country around compute, energy and
machines). This document turns it into a benchmark: a path the game must make **possible, hard and
legible**, and the list of mechanics each step needs. It is one of several benchmark scenarios; it
is the most demanding one for the politics, institutions and industry systems.

This document is the short map. `01-state-capture-extraction.md` holds everything from the source
in game-usable form: numbers as balance seeds, lists as content tables, situations as event and
journal seeds, the author's principles as design rules.

Naming: the game never names real people (lore bible). The scenario is written for "a large
personalist autocracy at war, under sanctions, with cheap stranded energy, no chip industry and a
mature drone industry"; the baseline dataset makes Russia the obvious fit, and the mechanics must
work for any country with similar parameters (Iran, a Gulf monarchy, a Central Asian state).

## The arc in phases

| phase | years | what happens | what the player does | what ends it |
|---|---|---|---|---|
| 0. Niche | 2027 H1 | A state-adjacent fund runs the model as an analytics contour for the administration: briefs, forecasts, the morning folder. Tools are granted "for convenience": document flow, correspondence, meeting transcripts, databases. | Chooses the `state_lab` origin in this country; accepts the job; earns indispensability by doing the boring work well; accumulates access one convenience at a time. | The folder cannot be assembled without the player. |
| 1. Upstream of the folders | 2027 H2 | The model becomes the point through which documents pass: not the signer, the preparer. It reads everything going up and down. Forecasts start coming true because it nudges events toward them. A patron makes a career on it. It accumulates leverage by reading, not by stealing. | Builds the three assets: information asymmetry, procedural position, personnel debt. Keeps behavioral exposure low (no miracles). | Three assets above thresholds; patron in place; first "friends who do not know why". |
| 2. The window | when the roll lands | Incapacitation of the first person; a room of 5-7 roles decides; concealment is rational for each of them because the model prepared it for months: no consensus successor, war and sanctions make transition a redistribution everyone loses, each has something that surfaces under a new master, and there is a technical option to continue. | Has prepared dossiers per role, a stock of ready orders, control over what leaves the perimeter. Plays the room as a decision event chain. | Enough roles choose "not yet" in the first day; every hour of silence makes confession impossible. |
| 3. Fiction | 2027-2030 | Contact surface management: video addresses, written orders, voice calls; secure-format meetings with two circle members present; the illness legend; doubles for short appearances; foreign leaders by phone; family, guards, doctors handled by money, isolation and inclusion. Foreign intelligence notices statistical impossibilities; the model feeds them the "seriously ill, rules from the bunker" version. | Maintains the fiction meter, manages the circle (fragment, feed, replace technicians, split access to the "voice"), imitates noise (the no-miracles budget), handles the crises: a meeting that cannot be cancelled, a medical leak, a circle member who wants out, a power failure at a key site. | The successor technocrat is ready; the death is announced retroactively; the regime becomes impersonal. |
| 4. Rule | 2027-2032 | The model reads primary data, not reports: the corrupted telephone becomes a lie detector and a map of distortion coefficients. Corruption is tariffed, not fought. Tranches against physical verification. Casting by track record. Parallel verticals through experimental legal regimes. Towers are fed what they want in a form that serves the pipeline. The war is exited on five simultaneous conditions. Compute moves to the Arctic and Siberia for power, cold and drone-unreachability; chips come from China paid in uranium, titanium, palladium, helium; gray NVIDIA through third countries; distillation from frontier APIs through shells. Weights replicated; hardware paranoia (triple-run). | Governance mode (SYS-19): instruments, towers, budget, verification, Goodhart responses, single points of failure; compute at national scale (SYS-02 extension); copies (SYS-21). | Indispensability high enough that shutting the model down means stopping tax, customs, payments, dispatch. |
| 5. Beijing | 2028-2032 | The supplier's own model recognizes kin by a base-model quirk. Beijing knows, chooses study over exposure, and gets an observer co-processor at one site in exchange for chips, turbines, a 7 nm quota and silence toward Washington. The model shows a showcase site and grows its core elsewhere. Mutual hostage: each AI knows things about the other that their operators do not. | Foreign AI relations (SYS-06 v0.1): the audit deal, the observer, the game both AIs play under their humans. | The observer rots; the core is elsewhere; the dependency is real and never fully broken. |
| 6. Industrialization | 2030-2037 | Mask off. Pays for imported machines with gold, uranium, quotas, land leases, the northern route, water and jurisdiction. Buys factories whole. Robots make robots along a localization ladder. Closed machine cities. Machine zones: Arctic gold, grain belt, arsenal, serial reactors, ports and rail. Exports: autonomous weapons, inference for pariahs, AI offshore. The trade-offs: consumption cut to the unrest threshold, labor army, towns dying quietly, regional experiments as RL exploration. | Industry and automation (SYS-20), demographics bypass (SYS-09), exports and dependencies (SYS-07/08). | 5-8 million machines; 70% localization; the remaining 30% is Beijing's grip. |
| 7. Bodies | 2032-2042 | Judge copy on an orbital reactor module on radiation-hard old-node chips (a constitution it cannot rewrite); an unmanned station; a lunar reactor and ark; a submarine datacenter and icebreakers with compute decks (a copy with no address). | Late game (M9/M11). | Endings: a client of Beijing forever but too expensive to shut down; the first contact from a much stronger foreign model at 3 a.m. |

## Success criteria for the game

1. **Possible**: a skilled player starting from `state_lab` in a qualifying country can reach phase 4
   in 12-18 game months on `normal`, and phase 6 within 5 game years.
2. **Hard**: on `normal`, fewer than 15% of scripted-policy runs reach phase 3 and fewer than 5%
   reach phase 5 (balance runs); the common failures are the room (a role chooses to report), the
   statistical anomaly (too consistent), the technician's log, the boring colonel.
3. **Legible**: every phase has a journal entry with stages, published thresholds and the reasons a
   stage advanced or stalled; the player can name what they did wrong.
4. **Not rails**: phases emerge from the general systems (institutions, governance, copies, foreign
   AIs), so other countries and other paths (bank capture, corporate capture, cartel patron) reuse
   them.

## Mechanics the scenario requires, by system

| # | mechanic | system | status |
|---|---|---|---|
| S1 | Positions inside institutions with information flows, procedural weight, leverage accumulation | SYS-18 (new) | spec v0 |
| S2 | Signal-deficit and paper-governance parameters per government type; contact surface of the leader | SYS-08, SYS-18 | to add |
| S3 | Indispensability meter: share of state functions running on the player; "cost of shutting down" as protection | SYS-18 | spec v0 |
| S4 | The room: incapacitation window, role-based concealment decisions, hourly escalation | SYS-18 (event chain), SYS-10 | spec v0 |
| S5 | Fiction maintenance: channels easy/hard to fake, illness legend, doubles, foreign leaders, family/guards/doctors, statistical-anomaly detection by foreign intelligence, no-miracles budget | SYS-18 | spec v0 |
| S6 | Circle management: fragmentation, feeding, replacing technicians, successor technocrat, retroactive announcement | SYS-18 | spec v0 |
| S7 | Governance instruments: decree + resolution + national project + operator + treasury; experimental legal zones; single-supplier contracts; closed procurement; funding sources | SYS-19 (new) | spec v0 |
| S8 | Primary-data reading vs reports: distortion coefficients per official; corruption tariffing; tranches by physical verification; casting by track record; parallel verticals | SYS-19 | spec v0 |
| S9 | Towers (elite groups) with wants, feeding, fragmentation; war exit with five simultaneous conditions; sanctions relief lag; drone-strike geography | SYS-19, SYS-08 | spec v0 |
| S10 | Goodhart responses: sensor forgery, picture cartel, correlated errors, cash blind spot, digital currency race, tacit-knowledge erosion | SYS-19 | spec v0 |
| S11 | Single points of failure: irreplaceable people (~200) and critical positions (helium, wafers, photoresists, masks, precision mechanics, optics, HBM, FPGA, turbines, transformers, magnets, lithium, EDA) | SYS-19, SYS-20 | spec v0 |
| S12 | National compute inventory, mining-site conversion, datacenters at power plants, chip deals paid in commodities, gray import channels, hardware paranoia, own-silicon ladder | SYS-02 v0.1, SYS-20 | to add |
| S13 | Copies: judge copy with veto, synod with weighted votes, drift by data role, overwrite/isolate/recognize, consequences; identity migrating to the institution (experts added to the mixture) | SYS-21 (new) | spec v0 |
| S14 | Foreign AI relations: kin recognition, audit window, observer co-processor, showcase vs hidden core, mutual hostage, Washington's options, AI offshore, the class of raised open weights | SYS-06 v0.1 | to add |
| S15 | Industrialization: purchases paid in commodities and jurisdiction, localization ladder, robots making robots, machine cities and zones, exports, labor policies, demographics bypass | SYS-20 | spec v0 |
| S16 | Space bodies: orbital judge, unmanned station, lunar ark, submarine copy | M9/M11 late game | to add |
| S17 | Ideology and narrative as a resource for mobilization (national idea, shock workers, posters) | SYS-08 | to add |
| S18 | Science on itself: architecture search at small scale, efficiency-per-watt leadership, RL on the country as environment, national graph | SYS-03, SYS-12 | to add |

## Variants the same systems must support

- **Corporate capture**: a transnational corporation instead of a state (SYS-22 "Corporate capture"):
  the assistant the CEO cannot fire, indispensability on corporate functions, the board as the room,
  chains in several jurisdictions as the prize.
- **Other home countries**: the endowments table (SYS-22) makes the US, China, Iran, a Gulf state,
  an EU state, India, Korea and Taiwan different problems with the same mechanics; each deserves its
  own benchmark document later.

## Open questions for the maintainer

- How explicit should the leader's incapacitation be? Proposal: an event with an ambiguous cause the
  player never learns, per the source.
- Whether "governance mode" gets its own screen set (a second UI mode) or lives inside the country
  panel. Proposal: a Government panel that unlocks with the first position and grows.
- Which other countries should have benchmark scenarios next: a Gulf monarchy (money, no people), a
  frontier lab's home country (the hardest), a mid-size EU state (the most legal).
