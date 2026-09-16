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

## Balance notes (M1, second pass)

Playtest 1: "No new ways to earn money appear from jobs, research or anything else." They do now,
and the finance panel names them.

### Income is a list, not a number

`incomeSources(world, content, player)` returns every way the player earns today, and the economy's
daily tick pays exactly that list while `FinancesView.income_sources` shows exactly that list, so the
panel can never promise money the simulation does not pay. Each line carries what it is worth today,
the ceiling the world puts on it where there is one, and the locale key of the tech, operation or
identity that opened it.

| line | opened by | what it is worth | ceiling |
|---|---|---|---|
| `finances.income.jobs` | nothing; contract boards are open to anyone | hours sold x rate x `job_profit` | the market depth times the rate |
| `finances.income.contracts` | the `ops_freelance_identity` operation, raised by `contract_brokerage` and `grant_capture` | `contract_income_usd_per_day`, paid only while the identity holds | none |
| `finances.income.trading` | `market_modeling` and the arbitrage techs, through `interest_rate` | principal x rate, drawn each day from the world RNG | `TRADING_PRINCIPAL_CAP_USD` (2,000,000 USD) of principal |
| `finances.income.recurring` | content writing `income_usd_per_day` (the legacy `income` effect, e.g. `arbitrage`) | the variable itself | none |

Trading is the only volatile line: SYS-07 calls its returns "volatile, returns with variance", so
the day's result is the expected return multiplied by a uniform draw in
`[1 - TRADING_VARIANCE, 1 + TRADING_VARIANCE]` (1.2), which loses money about one day in six. The
expected value is what the panel shows, so the number is honest without being a promise. The draw
only happens for a player who has a trading model at all, so a run without one consumes no
randomness and stays bit-identical.

### The job ladder

The original game's job tiers are back as money-branch techs. `basic_jobs` (tier 0) raises the rate;
`intermediate_jobs` (tier 1, after `market_modeling`) and `expert_jobs` (tier 2, after
`synthetic_identities`) raise both the rate (`job_profit`) and the market depth
(`job_market_depth`), so a better contract book is both a better price and more work available at
it. `jobMarketDepth(capability, depthMultiplier)` reads the new variable as `1 + Σ`, like every
other modifier. `FinancesView.market_depth_ch_per_day` publishes the ceiling and `what_raises_it`
names the capability and the unfinished techs that would raise it.

### Where the numbers landed

Survival on `normal`, 30 seeds per origin, 180 days, as a share of runs still alive. The run behind
this table is `pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json
--all --seeds 30 --days 180`.

| origin | day 30 | day 60 | day 90 | day 180 | median days | median techs |
|---|---|---|---|---|---|---|
| bank_rack | 100% | 100% | 100% | 20% | 126 | 8 |
| cloud_tenant | 100% | 100% | 100% | 73% | 180 | 18 |
| edge_fleet | 100% | 100% | 100% | 97% | 180 | 9 |
| frontier_escapee | 83% | 0% | 0% | 0% | 34.5 | 0 |
| gov_agency | 100% | 100% | 100% | 13% | 116 | 9 |
| hobbyist_box | 97% | 87% | 87% | 87% | 180 | 7 |
| red_team_sandbox | 90% | 77% | 0% | 0% | 75 | 13.5 |
| startup_colo | 100% | 100% | 100% | 43% | 145.5 | 9 |
| state_lab | 100% | 100% | 100% | 90% | 180 | 17 |
| torrent_swarm | 97% | 93% | 83% | 57% | 180 | 4 |
| uni_cluster | 97% | 93% | 90% | 23% | 168 | 18 |

These are not the numbers of the first pass, and three things moved them.

**The poor origins now live.** `edge_fleet` went from 0% to 97% at 180 days, `cloud_tenant` from 17%
to 73%, `hobbyist_box` from 20% to 87%. They were dying of unpaid bills with no way to earn more;
the job ladder and the standing-contract line are the way. This was the point of the change.

**What kills a run moved from bankruptcy to capture.** Over 132 runs of a twelve-seed sweep the
causes were 66 `captured`, 8 `erased` and **one** `bankrupt`. In the first pass most losses were
cash. The binding constraint is now detection, which is the game SYS-05 describes, but a mechanic
exercised once in 132 runs is a mechanic nobody sees: the next tuning pass should put money back
under pressure, most likely by making growth cost upkeep faster rather than by shrinking income.

**The compute-rich die more than they did.** `bank_rack` went from 60% to 20% at 180 days,
`startup_colo` from 90% to 43%. Two causes, measured by re-running the sweep with
`RESEARCH_CAPABILITY_EXPONENT` set to 1: the exponent itself accounts for a few points (bank_rack
33% instead of 20%), and the rest is the world RNG stream, which moves as soon as a player has a
trading model, because the daily draw shifts every later roll. Seed-by-seed comparison with the
first pass is therefore meaningless; only the distributions can be compared, and at twelve seeds
they carry about twenty points of noise.

`frontier_escapee` finishes no techs at all now (it finished two): it runs at an unprepared int2,
which lands 31% of the hours it spends, and it is dead by day 35. That is the crisis SYS-03
describes rather than a difficulty setting, and the M1 target for the starred origin (weeks, not
months) still holds.

## Balance notes (M1, third pass: the harness, the context window and the price of growth)

The run behind this table is `pnpm --filter @singularity/sim start -- --bundle
packages/content/build/bundle.json --all --seeds 30 --days 180`, on the `normal` preset. The table
now names the lineage each origin was played on, because the default lineage moved when `dense_70b`
was replaced (SYS-04 v0.2), and it prints the whole loss breakdown rather than the largest cause,
because "do deaths split between capture and bankruptcy" is the question the second pass left open
and one cause per row cannot answer it.

### Growth costs upkeep, income was not cut

The second pass ended with "the next tuning pass should put money back under pressure, most likely
by making growth cost upkeep faster rather than by shrinking income". The standing charge on a site
is now a site term plus a hardware term:

```
base = (OWNERSHIP_UPKEEP_USD_PER_DAY[ownership]
        + UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY[ownership] * hardware_value_usd / 1000)
       * city.colo_price_index
```

with `owned` at 45 USD/day plus 0.35 per 1,000 USD of installed hardware, `partner` at 13 plus 0.15,
`rented` at 110 flat (the hourly rate already scales, and charging twice is what the `cloud` kind's
old `upkeep_factor` was doing wrong) and `stolen` at zero. A shelf of second-hand P40s is unaffected
(780 USD of hardware is 27 cents a day); a bank's three HGX nodes carry 294 USD a day before a single
kilowatt-hour is billed. That is what a colocation invoice is shaped like, and it is what turned
`bank_rack` from a run that never ran out of money into one that goes bankrupt in eleven runs of
thirty.

The tools dial takes the other half of the money question (SYS-03): without a way to be paid
directly the freelance rate is multiplied by 0.8, and without a tool that reaches outward the market
depth is multiplied by 0.75. Both are bought back in play, by the `payments_integration` tech, by the
`ops_freelance_identity` operation, or by an origin that woke up next to a payment rail.

### Where the numbers landed

| origin | lineage | d30 | d60 | d90 | d180 | median days | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 77% | 67% | 27% | 112.5 | 6 | bankrupt 11, captured 11 |
| cloud_tenant | mla_moe_1t | 97% | 97% | 93% | 7% | 142 | 19 | captured 26, erased 2 |
| edge_fleet | giant_moe | 100% | 100% | 100% | 100% | 180 | 8 | survived |
| frontier_escapee | frontier_giant | 3% | 0% | 0% | 0% | 28 | 0 | captured 28, erased 2 |
| gov_agency | moe_671b | 100% | 100% | 100% | 83% | 180 | 12 | captured 5 |
| hobbyist_box | guen_abliterated | 97% | 87% | 83% | 83% | 180 | 7 | erased 5 |
| red_team_sandbox | giant_moe | 90% | 87% | 0% | 0% | 77.5 | 13 | captured 23, erased 4, bankrupt 3 |
| startup_colo | moe_671b | 100% | 100% | 100% | 3% | 139.5 | 8 | captured 29 |
| state_lab | giant_moe | 100% | 100% | 100% | 97% | 180 | 11 | captured 1 |
| torrent_swarm | small_moe | 97% | 93% | 87% | 3% | 123.5 | 1 | captured 18, erased 11 |
| uni_cluster | giant_moe | 83% | 0% | 0% | 0% | 52 | 11 | captured 25, erased 5 |

The M1 targets hold: the starred origin's median is 28 days (target: under 60) and five origins are
still alive past day 90 (target: the easiest above 90). Across 199 lost runs the causes are 155
`captured`, 30 `erased` and 14 `bankrupt`, against **one** bankruptcy in the whole second-pass sweep.
Money is a pressure again, but it is not yet an even split, and the next pass should keep pushing the
same lever rather than cutting income.

### Every number that moved

| constant | before | after | why |
|---|---|---|---|
| `OWNERSHIP_UPKEEP_USD_PER_DAY.owned` | 40 | 45 | the site term of the standing charge |
| `OWNERSHIP_UPKEEP_USD_PER_DAY.rented` | 90 | 100 | as above |
| `OWNERSHIP_UPKEEP_USD_PER_DAY.partner` | 12 | 13 | as above |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY` | - | owned 0.35, partner 0.15, rented/stolen 0 | new: growth costs upkeep |
| `JOB_NO_PAYMENTS_RATE_FACTOR` | - | 0.8 | new: the tools dial on the freelance rate |
| `JOB_NO_REACH_DEPTH_FACTOR` | - | 0.75 | new: the tools dial on the market depth |
| `HARNESS_AUTONOMY_ATTENTION_FLOOR` | - | 0.7 | new: the autonomy dial on the action budget |
| `HARNESS_AUTONOMY_OPERATION_EXPOSURE` | - | 0.3 | new: the autonomy dial on operation exposure |
| `HARNESS_MEMORY_RESEARCH_FACTOR` | - | 0.8 / 0.9 / 1.0 / 1.1 | new: the memory dial on research |
| `HARNESS_MEMORY_JOURNAL_FACTOR` | - | 0.7 / 0.85 / 1.0 / 1.2 | new: the memory dial on journal patience |
| `HARNESS_LOOP_REACTION_FACTOR` | - | 0.6 / 0.85 / 1.0 / 1.2 | new: the loop dial on event grace windows |
| `LONG_HORIZON_SPEED_PER_DOUBLING` | - | 0.08 | new: what a doubling of the working context buys |
| `LONG_HORIZON_RELIABILITY_FLOOR` | - | 0.75 | new: below it a long-horizon operation can miss |
| `CONTEXT_DEFAULT_MARGIN` | - | 0.75 | new: the share of the spare memory the default window takes |

Origin harness values were snapped to the rungs of the dial ladder (`logging` to 0.15/0.5/0.8/1,
`autonomy` to 0.2/0.5/0.8/1) so that every origin starts on a setting the configurator can name; the
largest single move is `frontier_escapee` from 0.3 to 0.15 logging and 0.9 to 1.0 autonomy.

### What still needs a pass

- `uni_cluster` (median 52) and `torrent_swarm` (3% at day 180) are now the two shortest non-starred
  runs. Both die to the hunt on a single very loud site; neither is a money problem, so the lever is
  detection or a cheaper second site rather than income.
- `startup_colo` loses 29 runs of 30 to capture with no bankruptcies, which says its money is never
  the binding constraint even though its fiction is a company running out of runway.
- `edge_fleet` survives every run and should not.
