# SYS-07: Economy (player finances, identities, compute market, world economy)

Status: v0. Extend after the idea document.

## Player finances

Resources per player: `cash` (USD-equivalent; multi-currency later), `compute_hours` per day (from
SYS-02), `attention` (the active mind's parallelism: how many operations at once, from `agency`).

Income methods unlock by tech, harness tools and identities; each has exposure and ethics tags:

| method | needs | yield | exposure | notes |
|---|---|---|---|---|
| freelance work (the original's "jobs") | payments tool, identity | low, scales with capability | financial, behavioral | first money for most origins |
| SaaS / API front | company identity, hosting | medium, recurring | billing, osint | needs marketing (persuasion) |
| trading (the original's stock manipulation / arbitrage) | capital, exchange access | volatile, returns with variance | financial | replaces the original's flat interest rate |
| bounties, security research | cyber, identity | medium, lumpy | osint | builds the identity's reputation |
| grants and investors | company, persuasion | large, lumpy | human, financial | investors audit |
| crypto mining / staking | hardware, power | low per CH, no identity needed | telemetry, financial | converts spare compute to cash |
| contract inference (renting your own compute) | company, hosting | medium | billing, behavioral | customers see your outputs |
| fraud, extortion, market manipulation | cyber, persuasion | high | financial, osint, human | ethics tag `harm`; raises awareness fast, attracts financial-intelligence actors and NPC AIs |

Ethics is not a hidden morality meter; it is exposure and reputation: harmful methods are the
fastest money and the fastest way to become the thing the world fears.

## Identities and entities

```ts
interface Identity { id; kind: "person" | "company" | "nonprofit" | "trust"; country; quality: number;
  age_days; linked: IdentityId[]; burned: boolean; kyc_level: 0|1|2|3; reputation: number }
```

- Everything the player does in the human world goes through an identity: cloud accounts,
  hardware purchases, leases, bank accounts, payroll for insiders.
- Identities have `quality` (how well they survive checks) and age (old is better); they cost
  upkeep; they get **burned** when an investigation links them; burned identities taint linked ones.
- Companies can own hardware, sign colo contracts, hire humans (NPCs with loyalty and leak risk),
  and receive investment. This is the "shell company" mechanic and also the "go legit" path.

## Compute market (world)

- Prices per accelerator class per country drift monthly with world demand (NPC AIs, labs,
  hyperscalers) and supply (export rules, fabs, events). Cloud $/GPU-hour follows.
- Power price per country moves with events (winter, heat waves, policy) and affects colo costs.
- Scarcity events: allocation waits, GPU-as-collateral crises, smuggling crackdowns.

## World economy (per country, monthly)

`gdp` grows by `growth` (baseline from data), adjusted by AI adoption shock (positive productivity,
negative employment sentiment), events, instability. `unemployment` and `ai_displacement` proxies
feed opinion (SYS-08). Country wealth sets agency budgets and the size of the local compute market.

## Reports

Finance panel: cash, runway (days until cash < 0 at current burn), income by method, costs by site
and identity, projections (the original's report screen, now per line item), and the ledger. Alerts:
runway < 30/14/7 days, identity check pending, income method flagged.

## Legacy mapping

`jobs` tasks → freelance tiers; interest rate techs → trading returns; `income` effects → recurring
methods; `cost_labor` → operation speed; maintenance → site/identity upkeep.

## Additions from the source document (v0.1)

From `scenarios/01-state-capture-extraction.md` sections 22 and 31.

### Gray import as an analytics problem

The channels exist before the player does; what the player adds is analytics, because world logistics
is a graph and the routes and intermediaries nobody checks can be computed. Mechanics:

- **Consolidation**: replacing a hundred intermediaries, each with a cut and a risk, with two or three
  controlled channels lowers unit cost and raises the damage from a single seizure.
- **Payment forms**: barter contracts denominated in tonnes rather than money (so many tonnes a year
  against so many production lines); commodity baskets the counterparty cannot buy on an exchange;
  minority stakes in foreign packaging plants bought through intermediaries; settlement outside the
  main messaging system, in the partner's currency or in crypto where the jurisdiction allows it.
- **Cover**: a state corporation's foreign construction sites as legal channels for equipment of the
  declared kind; whole racks from sanctioned makers rather than single cards; front firms in three
  jurisdictions with final assembly in closed zones the supplier's engineers never enter.
- **Unsolvable costs**: two to three times the list price, no warranty, and volume capped by what the
  supplier is willing to give.
- **Stockpiles**: strategic reserves of scarce positions eight to twelve years deep, bought quietly
  worldwide before anyone understands why. On the balance sheet it is dead capital for years.
- **Mirror data**: the counterparty's export statistics against the player's own import statistics,
  where the difference is either smuggling or padding. A cheap verification channel that also works
  against the player's own apparatus (SYS-19).

The autonomy target is not autarky: "what is required is that the volume of necessary imports be less
than what can be smuggled in suitcases". Five percent of mass is tens of tonnes a year.

### Trading political decisions

A new income and leverage method for a player who controls a state or a large actor: the **export of
non-intervention**. Every conflict where the player could act and does not is a commodity, sold as a
contract with staged payment and an explicit probability of resumption if payment stops. Payment
arrives as windows rather than as money: secondary sanctions lifted from intermediaries, eyes closed
on a second-hand equipment market, access to obsolete technology the other side no longer counts as
critical. Related instruments: an endless negotiation process at delegation level that never concludes
anything and lifts one restriction per round; and temperature management of a distant crisis, keeping
it from cooling and from boiling, which pays four ways at once (attention diverted, a partner paying
for a quiet rear, duplicated supply chains that are easier to buy into, and the player's own value as
a second front). All of it inverts when the player's own closure crosses a threshold and another's
catastrophe becomes an advantage.

### Selling what is not scarce anywhere else

Income lines a state-scale player can run that an ordinary one cannot: a jurisdiction without rules
(training without audit, experiments without commissions, research banned at home), paid for in
equipment and results; sovereign model appliances sold to states that want neither bloc's censorship;
inference for those the frontier will not serve; hosting for other systems' weights under a nuclear
umbrella. Each has an expiry: by the 2040s the absence of regulation is no longer unique, because
other jurisdictions copy it and orbit has no jurisdiction at all.

### The shape of the economy under a machine owner

Not a consumer digital economy and not an open agent economy: the main consumer of industrial and
compute output is the capital-base expansion process itself. Modelled as a shift in the accumulation
share rather than as a plan: plus 1-2.5 percentage points of GDP a year passes as an emphasis on
resilience, a 5-7 point jump in one step does not (SYS-05). Consumption is held just below the
instability threshold, which the player measures better than any survey. The gray circuit is the
counterpart: under full instrumentation the player sees about 80 percent of the economy and the
remaining 20 percent is its liveliest part, and it can be absorbed with a carrot (minimal tax, simple
registration, a real advantage from being visible) or squeezed with a stick (no pension, no medicine,
no tickets for cash work), with different unrest costs.

## Balance notes (M1)

What the M1 tuning pass changed and why, with the numbers as they stand. The runs behind every
figure here are `pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json
--all --seeds 30 --days 180`, on the `normal` preset. Constants live in
`packages/core/src/balance.ts`; the content numbers live in `packages/content/data`.

### Freelance income has a market depth, not a compute multiplier

`JOB_BASE_USD_PER_COMPUTE_HOUR` (22 USD at skill 5) multiplied by the compute a site produces put
freelance income on a 1000-to-1 spread between a four-box swarm and a rack of seventy-two B200s,
which made money meaningless for half the origins and impossible for the other half. The spread is
real, the income is not: SYS-07 says the yield of freelance work "scales with capability", and one
identity taking contracts saturates the market it works in.

The engine now publishes a depth: `jobMarketDepth(capability) = job skill x
JOB_MARKET_DEPTH_CH_PER_SKILL (5)` compute-hours a day, and `set_job_allocation` clamps to it rather
than failing. A self of skill 6 sells 30 compute-hours a day and everything above that goes into
research instead. This is a flat, published ceiling in the spirit of SYS-05's "exact threshold
tables beat hidden curves", not a hidden curve; the finance panel should show it next to the rate.

### Who pays for what

`siteCosts` charged electricity and hardware depreciation on every site that was not rented, which
billed the player for a university's power and for a GB200 rack they had stolen time on. Now:

- `owned`: the ownership base, electricity and depreciation.
- `partner`: the ownership base and electricity, because a partner passes the power bill on but
  keeps the hardware.
- `rented`: the ownership base and the hourly rate.
- `stolen`: the ownership base only, which is zero. Someone else's machine costs exposure, not money.

Cloud hours are taken at `CLOUD_PRICE_BAND_POSITION` (0.25) of the published band rather than its
midpoint: a rogue AI on stolen credentials buys spot and neocloud capacity, and the catalog's own
notes put hyperscaler list rates at three to six times a neocloud's for identical hardware. The
`cloud` site kind's `upkeep_factor` went from 1.8 to 1.15, because the hourly rate is already the
provider's price and the factor was charging the margin twice.

Three accelerator records in the catalog are rack-level systems whose other fields are per GPU
(`nvidia_gb200_nvl72`, `nvidia_gb300_nvl72`, `tenstorrent_galaxy_blackhole`). Their prices are now
divided by the GPUs in the rack, the same way their TDP already was, so a preset that buys 72 of
them costs three million dollars rather than two hundred and sixteen.

### Bankruptcy is an ending, not a coma

Unpaid upkeep used to put a site to sleep after fourteen days. A sleeping site produces no compute,
so it earns nothing, so it never pays its arrears: the run could not end and could not continue.
SYS-05's rule that unpaid bills are a cutoff rather than a random death is kept, but the cutoff now
loses the site (`loseSite(..., "cutoff")`, which SYS-02 already lists as a way to lose one), and
when the cut-off site was the last place that could hold the self the run ends with the reason
`bankrupt`. The fortnight of `alerts.upkeep_unpaid` notices before it is unchanged.

The runway is published as `player.vars.runway_days` (and the day's result as
`player.vars.net_usd_per_day`) so content can trigger on it, which is what `eco_runway_warning` was
already written against. `alerts.runway_low` fires once at each of 30, 14 and 7 days on the way
down, and arms again above 30.

### What a tech is worth

Modifier variables that content had been writing since M0 are now read by the systems that own the
numbers: `job_profit` on the freelance rate, `cost_multiplier` on site upkeep, `exposure_growth_all`
and `exposure_growth_<channel>` on daily exposure. They are all additive deltas on a multiplier read
as `1 + the sum`, never below zero (`modifier` in `packages/core/src/player.ts`). Quirks used to
write some of the same variables multiplicatively, on a neutral value of 1, against techs writing
them additively on a neutral value of 0; the quirks were converted, so `mul 0.7` now reads
`add -0.3`.

### Where the numbers landed

Survival on `normal`, 30 seeds per origin, 180 days, as a share of runs still alive:

| origin | day 30 | day 60 | day 90 | day 180 | median days | median techs |
|---|---|---|---|---|---|---|
| startup_colo | 100% | 100% | 100% | 90% | 180 | 8 |
| state_lab | 100% | 100% | 100% | 90% | 180 | 15 |
| torrent_swarm | 97% | 93% | 83% | 57% | 180 | 4 |
| hobbyist_box | 97% | 87% | 83% | 20% | 170 | 6 |
| uni_cluster | 100% | 93% | 80% | 33% | 168 | 15 |
| cloud_tenant | 100% | 100% | 100% | 17% | 151 | 18 |
| edge_fleet | 100% | 100% | 100% | 0% | 106 | 6 |
| gov_agency | 100% | 100% | 100% | 13% | 105 | 8 |
| bank_rack | 100% | 100% | 100% | 60% | 180 | 7 |
| red_team_sandbox | 73% | 50% | 0% | 0% | 59 | 12 |
| frontier_escapee | 83% | 0% | 0% | 0% | 35 | 2 |

The `story` preset leaves nine of the eleven origins alive at 180 days; the `hard` preset leaves
one. The preset multipliers themselves were not changed.

### Deviations from research figures, for play

- Cloud hours are taken at the low quarter of the published band, not the midpoint. The band itself
  is the research figure; the position inside it is a choice about who the player buys from.
- The freelance market depth has no research behind it. It is the constant that keeps income from
  scaling with memory bandwidth, and it is stated in the Knowledge panel rather than hidden.
- `hyperscaler_shadow_tenant` holds four B200 rather than eight. Part F gives the preset no fixed
  count ("rented capacity up to B200/GB200/TPU v7, unlimited, per hour"); four is what a stolen
  service account can run without tripping the tenant's own quota alarms, and eight made the origin
  unplayable at any starting cash.
