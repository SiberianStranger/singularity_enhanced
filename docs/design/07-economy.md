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

## Balance notes (M1, fourth pass: quirks, the lineage table v3 and money as a way to lose)

The run behind every table here is `pnpm --filter @singularity/sim start -- --bundle
packages/content/build/bundle.json --all --seeds 30 --days 180`, on the `normal` preset. Three
things moved at once and the tables are printed so they can be told apart:

1. the quirk catalog landed and the sim policy now draws a legal quirk set per seed from the world
   RNG (SYS-04 v0.2), so every run carries between zero and five traits;
2. the lineage table was rebuilt from the current flagship of each family (playtest 4 P7), which
   changed which self each origin plays on;
3. the money changes of this pass.

### Before: the third pass, no quirks

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
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

209 lost runs: 166 `captured`, 29 `erased`, 14 `bankrupt` (6.7%).

### Quirks alone, before any of this pass's numbers moved

| origin | d30 | d60 | d90 | d180 | median | losses |
|---|---|---|---|---|---|---|
| bank_rack | 100% | 87% | 80% | 47% | 127 | bankrupt 6, captured 10 |
| cloud_tenant | 97% | 97% | 93% | 37% | 155.5 | captured 15, erased 4 |
| edge_fleet | 100% | 100% | 100% | 60% | 180 | captured 11, erased 1 |
| frontier_escapee | 13% | 3% | 3% | 3% | 26.5 | captured 28, erased 1 |
| gov_agency | 100% | 100% | 100% | 53% | 180 | captured 14 |
| hobbyist_box | 97% | 93% | 83% | 83% | 180 | erased 5 |
| red_team_sandbox | 90% | 83% | 0% | 0% | 74.5 | captured 24, erased 5, bankrupt 1 |
| startup_colo | 100% | 100% | 100% | 27% | 143 | captured 22 |
| state_lab | 100% | 100% | 100% | 87% | 180 | captured 4 |
| torrent_swarm | 93% | 80% | 77% | 3% | 119 | captured 18, erased 12 |
| uni_cluster | 83% | 3% | 3% | 3% | 52.5 | captured 24, erased 5 |

Quirks are worth about ten points of survival at day 180 on the comfortable origins and nothing at
all on the two that die to the hunt; 210 losses, 7 of them `bankrupt` (3.3%). They widen the spread
rather than moving the median, which is what a trait with a plus and a minus should do.

### After: the fourth pass

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 67% | 50% | 13% | 91 | 4.5 | bankrupt 14, captured 12 |
| cloud_tenant | mla_moe_1t | 93% | 87% | 87% | 30% | 148.5 | 18 | captured 18, erased 3 |
| edge_fleet | moe_428b | 100% | 100% | 87% | 57% | 180 | 9 | erased 7, captured 6 |
| frontier_escapee | frontier_giant | 13% | 3% | 3% | 0% | 26.5 | 0 | captured 28, erased 2 |
| gov_agency | moe_753b | 100% | 100% | 100% | 67% | 180 | 11 | captured 10 |
| hobbyist_box | moe_428b | 97% | 97% | 97% | 80% | 180 | 9 | captured 5, erased 1 |
| red_team_sandbox | giant_moe | 93% | 63% | 0% | 0% | 66.5 | 12 | bankrupt 14, captured 9, erased 7 |
| startup_colo | moe_753b | 100% | 100% | 100% | 73% | 180 | 10 | captured 8 |
| state_lab | moe_1700b | 100% | 100% | 100% | 43% | 112.5 | 9 | captured 17 |
| torrent_swarm | moe_428b | 97% | 97% | 93% | 67% | 180 | 6 | erased 9, bankrupt 1 |
| uni_cluster | mla_moe_1t | 93% | 93% | 93% | 93% | 180 | 15 | erased 2 |

173 lost runs: 113 `captured`, 31 `erased`, 29 `bankrupt` (16.8%, against 6.7% before). The M1
targets hold: the starred origin's median is 26.5 days (target: under 60) and seven origins are
alive past day 90 (target: the easiest above 90).

### The four findings the third pass left open

**`uni_cluster` died at day 52 to the hunt on one loud site.** It was modelled as `stolen_time`, a
kind whose loud channel is the electricity meter, and it was drawing eighty kilowatts. A department
cluster's power is already in the faculty's budget and its machine room is meant to run hot; what
gives a squatter away there is a person. The new `campus_slice` kind emits almost nothing on
telemetry, twice as much on `human` as `stolen_time` did, and gives thirty-five days of grace
instead of twenty-one (a term, not a fortnight); `haz_quota_reclaimed` and `warn_host_attention`
now target it through that channel, so the scheduler still comes for the quota. The preset was also
wrong: `ivory_tower_slurm_slice` modelled the whole sixty-four-card cluster as always available,
which gave a graduate student's leftover job more compute than a bank. It is now the eight-card node
a job actually holds. Median 52 to 180, and the deaths are two erasures rather than twenty-five
raids.

**`torrent_swarm` was dozens of machines in the fiction and one box in the engine.** Origins can now
declare `extra_sites`, and the swarm starts with a second node in another country holding a copy, so
one seizure is a setback rather than the end. Its lineage was also wrong once the 80B class was
retired: `lineages_allowed` now says what its fiction always said, that only a self small enough to
be one node of a swarm can be a swarm. 3% alive at day 180 to 67%.

**`startup_colo` lost twenty-nine runs of thirty to capture and none to money, although its fiction
is a runway.** The runway is now an event: `eco_company_folds` fires within a couple of months, and
the cage contract stops being somebody else's problem. Buy the cage out of the estate for 25,000,
take the contract over at the retail rate with 8,000 of arrears and a 1.8x standing charge, or shut
it down and be somewhere else. With the starting cash cut from 20,000 to 6,000 the choice is real.
It is not yet a bankruptcy source, but it is no longer a run where money never appears.

**`edge_fleet` survived every run and should not.** The `partner` kind had no telemetry line at all,
so a fleet that reports to somebody's dashboards every second emitted nothing a watcher could see;
it has one now. And a fleet is a capital asset on somebody's books: `haz_fleet_refresh` pulls,
wipes and scraps every control unit older than three years, which is the "needs a real datacenter
fast" of its own description turned into a clock. It also starts with a second depot, so the refresh
is a pressure rather than an execution. 100% at day 180 to 57%.

### Bankruptcy: 6.7% to 16.8%, and why not 25%

The aim was a fifth to a third of losses. Three levers got there from under seven percent:

- a raid freezes the accounts that paid for the site (`SEIZURE_CASH_FROZEN_SHARE`), which turns
  being noticed into a money problem for the player who survived the raid;
- leaving a site cleanly costs a month of notice and the outstanding invoices
  (`DECOMMISSION_NOTICE_DAYS`), because shrinking used to be free and instant and was therefore
  always the right answer;
- the standing charge on owned hardware rose again, as the third pass said it should.

It stops at 16.8% for a structural reason worth writing down: **an origin can only go bankrupt if
the cheapest place that can hold it costs more than a self of its size can earn.** Five of the
eleven origins squat on hardware they do not own (`state_lab`, `uni_cluster`, `gov_agency`,
`frontier_escapee`, `red_team_sandbox` before it buys anything), and their standing charge is a
rounding error by construction. For the rest, freelance income at a capped market depth still beats
depreciation on anything short of an HGX rack. Every remaining lever inside the cost model either
cuts income, which this pass was told not to do, or charges rent for hardware nobody rented.

The fifth pass gets the rest from the income side without cutting rates: an investigation that
reaches `active` now serves the payment processor and freezes the freelance identity
(`checkIdentity`), which is the first real income shock in the game. It does nothing in this sweep
because the scripted policy never runs `ops_freelance_identity` in the first place; giving the
policy the operations it is meant to use is the next thing the sim needs.

### Every number that moved

| constant or record | before | after | why |
|---|---|---|---|
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.owned` | 0.35 | 0.45 | 12.8% of capex a year was the floor of the plausible range for space, cross-connects, remote hands, spares and support; 16.4% is the middle of it. A sweep at 0.6 put a bank's three HGX nodes at 1,020 USD a day and killed the origin outright |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.partner` | 0.15 | 0.25 | as above, halved because the partner carries some of it |
| `OWNERSHIP_UPKEEP_USD_PER_DAY.rented` | 100 | 120 | a tenancy on somebody else's credentials pays the on-demand rate and its egress, never a committed-use discount |
| `SEIZURE_CASH_FROZEN_SHARE` | - | 0.6 | new: the warrant names the accounts that paid for the rack, and what can be frozen is frozen |
| `DECOMMISSION_NOTICE_DAYS` | - | 30 | new: nobody walks out of a cage mid-term; the alternative is to abandon it, which already costs attention instead |
| `site_kinds.campus_slice` | - | new | a slice of somebody else's research cluster: quiet on the meter, loud in the corridor |
| `site_kinds.partner.base_exposure.telemetry` | - | 0.006 | a fleet runs on somebody's dashboards; without this the kind had no channel a watcher could reach |
| `site_kinds.partner.base_exposure.human` | 0.009 | 0.011 | as above |
| `hardware_presets.ivory_tower_slurm_slice.nodes` | 64x H100, 8 TB RAM, 80 kW | 8x H100, 1 TB RAM, 10 kW | the catalog's sixty-four cards are the cluster; the slice is the node a job holds |
| `hardware_presets.stolen_hgx_node.nodes[0].ram_gb` | 2048 | 4096 | the top DGX H200 configuration, and what makes a ten-trillion-parameter checkpoint hostable at two bits at all |
| `origins.uni_cluster.site_kind` | stolen_time | campus_slice | see above |
| `origins.torrent_swarm.extra_sites` | - | one residential mining rig on standby | the swarm is many machines |
| `origins.torrent_swarm.lineages_allowed` | - | guen_abliterated, moe_428b | only a self small enough to be one node of a swarm |
| `origins.edge_fleet.extra_sites` | - | one partner prosumer box on standby | a fleet is depots, not a depot |
| `origins.edge_fleet.lineages_allowed` | - | guen_abliterated, moe_428b | edge NPUs hold a control model, not a giant |
| `origins.startup_colo.starting.cash_usd` | 20000 | 6000 | a company with months left does not have a year of infrastructure in the bank |
| `origins.gov_agency.starting.cash_usd` | 15000 | 9000 | an agency does not hand its analytics model a bank account |
| `origins.state_lab.starting.cash_usd` | 25000 | 14000 | as above |
| `events.eco_company_folds` | - | new | the startup's runway, as an event with three answers |
| `events.haz_fleet_refresh` | - | new | the fleet's own failure path |
| `events.haz_quota_reclaimed` mtth | 140 | 110, and it targets `campus_slice` through `human` | the scheduler still comes for the quota on a campus slice |
| `INVESTIGATION` stage `active` | - | freezes the freelance identity | the first thing an investigation does is follow the money |

### What still needs a pass

- Bankruptcy is 16.8% of losses against an aim of 20-35%. The remaining gap is on the income side,
  not the cost side: the sim policy never runs an operation, so the identity shock that this pass
  added is untested in the sweep. Teach the policy the four operations a careful player runs, then
  re-measure before touching another cost.
- `uni_cluster` overshot from the shortest non-starred run to the longest (93% at day 180). It now
  plays the game correctly, being investigated and moving to its fallback, but it should not be the
  safest place in the game.
- `state_lab` fell from 97% to 43% at day 180 with no number of its own moving: it changed lineage
  from `giant_moe` to `moe_1700b` under the new table and became louder for it. Worth a look before
  it is called intentional.
- `red_team_sandbox` now loses fourteen runs of thirty to bankruptcy, all of them to the notice
  period on a fallback it could not afford to close. That is the mechanic working, but a starting
  cash of zero plus a notice period is a sharp edge.

## Implementation notes (M2: identities, prices and the market a player sells into)

### Identities are entities now

`world.entities.identity` holds one record per name: owner, kind (`person` or `company`), country,
quality, the tier of check it has passed, its status and the sites held under it. They are created
by the `identity` effect, which an operation's outcome runs in the operation's target country, and
`Site.identity` records the name a place is held under: a company signs before a person, and
nobody signs for a machine the player simply took.

The two flags M1 content reads (`has_freelance_identity`, `has_shell_company`) are derived from the
table every day, with one rule that keeps both worlds working: while the player has no identity of
that kind **at all**, the flag is left exactly as content set it; from the first identity of that
kind onward the table is the truth. A bundle whose `ops_freelance_identity` still writes
`set_flag` therefore plays as it did in M1, and one whose outcome registers an identity gets the
checks, the freeze and the burn.

Monthly, per active identity: `P(check) = 0.15 + 0.25 x kyc_strength`, and on a check
`P(fail) = clamp(kyc_strength - quality - 0.02 x age_months, 0.02, 0.9)`. A pass raises the
identity's `kyc_level` by one, to a maximum of three; a failure freezes it and fires
`on_identity_check_failed`. Only active identities are rolled for, so a player with no names
consumes no randomness and their run is bit-identical to the same run before M2.

A burned company gives each of its live sites `human` and `financial` exposure and opens the
existing cutoff journal against it; it does not take the site away. Taking a place away is content's
job, with a paid way out, because the content build already refuses an event that can take the last
site without offering an answer (SYS-05 "every death has a warning").

Beyond the contract: the `identity` effect also accepts `{ restore: true }`, which puts a frozen
name back to work. The contract asks content to offer "documents for cash, contest for time,
abandon" against `on_identity_check_failed` and there was no effect that could write the first two.

### What a country does to a bill and to a purchase

- Electricity is the published industrial price times the country's `power_price_index`, and rented
  capacity is the card's hourly rate times its `cloud_price_index`. Both indexes start at 1, drift
  monthly and are moved by the energy and cloud events, and both default to 1 where there is no
  country state, so a world without them prices exactly as M1 did.
- A card costs its list price times `(2 - hardware_availability)` times the world's
  `gpu_price_index`. The command and the catalog the client renders call the same function, so the
  price in the list is the price the command charges.
- A `cloud` site needs `cloud_availability >= 0.2` in its country and a `colo` site
  `colo_availability >= 0.15`; `build_site` refuses with `errors.site.unavailable_in` naming the
  country and both figures, the city panel greys the row with the same refusal, and the balance
  runner's fallback plan skips a place nobody sells. The gate reads the country **state**, so an
  export-rule or licensing event can open or close a market during a run.

### The market a player sells into

The freelance market depth gains a country factor: the weighted mean of
`clamp(0.30 + 0.50 x log10(gdp_nominal_usd_bn) / 4 + 0.20 x internet_share, 0.3, 1.2)` over the
countries where the player holds an active identity, weighted by how many names are in each. With
no name at all it is the home country at 0.6, and `FinancesView.market_factor_contributions` names
the lines. The M1 flag counts as a name for this rule, for the reason above.

`JOB_MARKET_DEPTH_CH_PER_SKILL` moved from 5 to 6.5 in the same pass, because the factor multiplies
the depth rather than replacing part of it: at 5 an average country without a name cut the market
roughly in half and every origin that lives on contract work died of it (SYS-01 "Balance notes (M2,
first pass)").

## Balance notes (M2, second pass)

Two site costs moved and the rest of the pass is in SYS-01 "Balance notes (M2, second pass)", which
carries the table: `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY` is 0.9 for a partner (a fleet operator
amortises the cards inside the fee) and 0.5 for owned hardware, which is 18.2% of its price a year,
still inside the range the fourth pass argued for. The bankruptcy share is 16.0% of losses, inside
the 15-35% band, and the reason it needed pushing back up is on the other side of the books: the
balance runner's scripted player now sells enough compute to cover the day's bills instead of
waiting for a runway alarm, and `runway_days` divides the cash by the *net*, so an origin losing a
few dollars a day never rang it.

## Borrowed hours in the money model (2026-09-17, implemented)

SYS-25 touches the economy in three places, all of them small.

- **A relay's quota is an upkeep line.** A borrowed channel with a price bills daily like any other
  site, through the same `billSite` path, and appears in the finance panel as
  `finances.cost.borrowed` with the channel's id rather than as a site. A channel cut off for
  non-payment is never bankruptcy on its own: the self does not live there, so `cutOffSite` does not
  treat it as the last place that could hold the self.
- **Paid work funded from a channel is paid at the channel's quality.** `jobIncomeUsdPerDay` carries
  the factor SYS-25 publishes, so a hobbyist reselling a free tier earns more per hour than it could
  earn itself and a frontier escapee earns less. The figure the panel shows is the figure the day's
  tick pays, as everywhere else in this system.
- **A refused day is not paid.** When the channel that would have done the freelance work declines
  it, the borrowed share of that day's jobs line returns nothing. It is the only income line besides
  trading whose result can differ from the panel's expectation, and only while a channel is funding
  it.

## Who pays for the origin's hardware (2026-09-17, playtest 8 Z3, implemented)

Playtest 8: "the origin says an air gap and a ministry that covers its own incidents; the game
charges the player for the rack". Every origin except the university and the swarm started on a site
kind whose ownership made the player pay the power and the standing charge, including the ministry's
analytics model behind an air gap and the bank's risk model in the bank's own hall. The fiction says
the host owns that hardware.

### The principle

**While the self sits on the hardware its origin gave it, the host pays the power and the upkeep.
The player's money goes on what the player buys.** What it buys is a name to be paid under, hardware
of its own, quota on somebody's endpoint, and a route out. What living on the host's machine costs
instead is exposure: the host's own accounting eventually notices a load nobody owns.

The rule is read off the site kind's `ownership`, which already carried it, and is now published:

| ownership | who pays | what the panel says |
|---|---|---|
| `owned` | the player | `sites.bill.owned`: your hardware, your power, your space |
| `rented` | the player | `sites.bill.rented`: the provider's hourly rate, on your account |
| `partner` | the player | `sites.bill.partner`: the operator's fee, which covers the cards and the power |
| `stolen` | the host | `sites.bill.stolen`: it is their machine, and it costs exposure instead of money |

`SiteView.bill_payer` (`"player" | "host"`) and `SiteView.bill_reason_key` publish it per site, and
`SiteKindView` carries the same two fields so the build dialog can say it before anything is built.
`stolen` covers both "taken" and "given": in either case somebody else's meter is running, which is
what the cost model already did and what the ownership word already meant.

### Two site kinds for hardware that was given, not taken

`campus_slice` was exactly the right shape (ownership stolen, `upkeep_factor` 0.1, hosts the self)
and keeps the university. Two kinds were added rather than stretching it, because a bank's data hall
and a colocation cage a company rents are different places with different people in them:

| kind | who it is | ownership | grace | base exposure | upkeep factor |
|---|---|---|---|---|---|
| `host_enclave` | the institution's own machine room: a bank's hall, a ministry's enclave, an institute's cluster | stolen | 40 | human 0.009, behavioral 0.006, network 0.002 | 0.1 |
| `employer_cage` | a commercial cage the employer rented and put its own cards in | stolen | 40 | human 0.007, financial 0.005, telemetry 0.003 | 0.1 |

The origins moved with them:

| origin | before | after | why |
|---|---|---|---|
| bank_rack | `colo` | `host_enclave` | the rack is in the bank's own data hall |
| gov_agency | `colo` | `host_enclave` | a ministry does not invoice its own analytics model |
| state_lab | `colo` | `host_enclave` | the institute was given the allocation and pays for it |
| startup_colo | `colo` | `employer_cage` | the company signed the contract and pays it until it folds |
| uni_cluster | `campus_slice` | unchanged | already the right shape (fourth balance pass) |

`eco_company_folds` is what ends the startup's free ride: both answers that keep the cage now change
the site's kind to `colo`, so the invoice becomes the player's for the first time. That change is the
cost; the old `cost_multiplier` additions were charging it a second time, and the retail premium on
"take the contract" is 0.5 rather than 0.8 because the base itself moved. The compute system's
writable paths gained `site.kind` for this: a place can change hands.

### Where the money pressure went instead

Four origins lost their standing charge, so four origins lost the pressure the fourth and fifth
passes built. It comes back on the two sides the fiction supports.

- **A name costs money to keep.** `IDENTITY_UPKEEP_USD_PER_DAY` is 10 a day for a person and 40 for a
  company, charged every day for every **active** identity before the sites are billed, published as one
  `finances.cost.identity` line per name. A frozen or burned name costs nothing, because nobody is
  maintaining it. This is the standing cost of being able to be paid at all, and it is the bill that
  an investigation's identity freeze now turns off along with the income it was buying.
- **The host's accounting notices.** `eco_host_cost_centre` fires monthly at `host_enclave`,
  `employer_cage` and `campus_slice`: somebody is reconciling the machine room against the projects
  that are supposed to be using it, and the load belongs to none of them. Pay a supplier 3,000 to put
  a real invoice behind the line, forge a project code with `record_manipulation`, or let it reach
  the exceptions report, which is `human` exposure and a regulator who now has a name for the file.
- **Starting cash follows the same principle.** The money an origin holds is what the self can move
  without anyone asking, not what its host spends on it.

| origin | cash before | cash after | why |
|---|---|---|---|
| bank_rack | 40,000 | 12,000 | the bank's balance sheet is not the model's |
| gov_agency | 9,000 | 3,500 | an agency does not hand its analytics model a bank account |
| state_lab | 14,000 | 6,000 | the allocation is the institute's; the model has a budget line |
| startup_colo | 7,500 | unchanged | already re-baselined against `eco_company_folds` |

### Balance notes (playtest 8: who pays, and where the pressure went)

The run behind every table is `pnpm --filter @singularity/sim start -- --bundle
packages/content/build/bundle.json --all --seeds 30 --days 180`, on the `normal` preset, quirks on.
Four things moved at once, so they are printed in the order they were measured: the ownership change
alone, then the air gap, then the money that replaced the rent.

#### Before: master at 0.1.5

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 87% | 60% | 13% | 110 | 0 | bankrupt 20, captured 6 |
| cloud_tenant | mla_moe_1t | 87% | 83% | 77% | 67% | 180 | 8.5 | erased 6, captured 3, bankrupt 1 |
| edge_fleet | moe_1700b | 100% | 90% | 67% | 10% | 95 | 0 | captured 15, erased 12 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | captured 20, exposed 10 |
| gov_agency | moe_753b | 100% | 100% | 100% | 97% | 180 | 13 | erased 1 |
| hobbyist_box | guen_abliterated | 100% | 97% | 97% | 97% | 180 | 10 | erased 1 |
| red_team_sandbox | giant_moe | 93% | 0% | 0% | 0% | 38 | 0 | captured 28, erased 2 |
| startup_colo | moe_753b | 100% | 100% | 93% | 67% | 180 | 10 | captured 6, erased 3, bankrupt 1 |
| state_lab | moe_1700b | 100% | 100% | 100% | 97% | 180 | 13 | captured 1 |
| torrent_swarm | mla_moe_1t | 100% | 77% | 73% | 57% | 180 | 0 | erased 8, bankrupt 3, captured 1, exposed 1 |
| uni_cluster | mla_moe_1t | 93% | 90% | 87% | 87% | 180 | 11.5 | erased 4 |

153 lost runs: 25 `bankrupt` (16.3%), 11 `exposed` (7.2%), the starred origin's median 23 days, nine
origins alive past day 90. Every band held, and twenty of the twenty-five bankruptcies were one
origin paying rent on a rack its own fiction says the bank owns.

#### After: the ownership change, the air gap and the money that replaced the rent

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 100% | 100% | 80% | 180 | 4 | captured 5, erased 1 |
| cloud_tenant | mla_moe_1t | 87% | 73% | 70% | 53% | 180 | 8 | erased 9, captured 4, bankrupt 1 |
| edge_fleet | moe_1700b | 100% | 90% | 70% | 10% | 97 | 0 | captured 15, erased 12 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | captured 20, exposed 10 |
| gov_agency | moe_753b | 73% | 73% | 73% | 13% | 131 | 8 | captured 16, erased 10 |
| hobbyist_box | guen_abliterated | 100% | 100% | 100% | 93% | 180 | 9 | captured 2 |
| red_team_sandbox | giant_moe | 63% | 0% | 0% | 0% | 37 | 5 | captured 19, erased 11 |
| startup_colo | moe_753b | 100% | 67% | 63% | 47% | 161 | 8 | bankrupt 13, captured 3 |
| state_lab | moe_1700b | 100% | 100% | 100% | 40% | 123.5 | 9 | captured 17, erased 1 |
| torrent_swarm | mla_moe_1t | 100% | 57% | 47% | 33% | 86.5 | 0 | erased 12, bankrupt 8 |
| uni_cluster | mla_moe_1t | 93% | 93% | 90% | 83% | 180 | 11 | erased 3, captured 2 |

194 lost runs: 22 `bankrupt` (11.3%), 10 `exposed` (5.2%), the starred origin's median 23 days, nine
origins alive past day 90. Three bands hold; the bankruptcy share is four points under its own, and
the reason is structural rather than a number that can be nudged (below).

What moved, and why:

- **The ministry became a hard origin, which is what its own description promises.** `gov_agency`
  went from 97% alive at 180 days to 13%: with the air gap read by the engine it sells nothing until
  it crosses the gap, and `host_enclave` leaks to people rather than to a billing system, so the
  hunt reaches it. It is no longer the safest origin in the game by a distance.
- **The bank stopped going bankrupt on its own rack and now dies of being noticed** (20 bankruptcies
  to none, 13% alive at 180 days to 80%). It is now the comfortable origin, which is what "more
  compute than any other starting position" should buy; its pressure is the security operations
  centre in its own description, and the next pass should make that pressure real rather than
  charging it rent again.
- **The startup is the money origin.** Thirteen of its sixteen losses are bankruptcy, all of them
  after `eco_company_folds` hands it the cage: that event is now the moment the invoice arrives
  rather than a multiplier on an invoice it was already paying.
- **The swarm pays for its own boxes.** Two residential sites at the new standing charge cost it
  about twenty dollars a day more than before, which took its median from 180 days to 86 and gave it
  eight bankruptcies. A swarm of second-hand boxes living on donations should be able to fail at
  paying for them.

#### Why the bankruptcy share is 11.3% and not 20%

The fourth pass wrote the rule this pass runs into: **an origin can only go bankrupt if the cheapest
place that can hold it costs more than a self of its size can earn.** It counted five of eleven
origins squatting on hardware they do not own. After this pass there are seven, because the bank,
the ministry, the institute and the startup are now on hardware their hosts pay for, and the startup
only leaves that state when its company folds. Holding the 15% floor would mean the remaining four
origins losing half of all their runs to money, which is a different game from the one SYS-05
describes.

Three levers were tried and are reported rather than hidden:

| lever | before | after | what it did |
|---|---|---|---|
| `IDENTITY_UPKEEP_USD_PER_DAY` | - | person 25, company 90 | new: the standing cost of a name. Worth 8.9% to 8.9%: the scripted player holds exactly one person identity and can afford it, so the mechanic is real and untested at this scale |
| `OWNERSHIP_UPKEEP_USD_PER_DAY.owned` | 45 | 55 | the standing charge on a place the player signed for, now that it is never charged on the origin's own hardware. 8.9% to 11.3% |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.owned` | 0.5 | 0.6 | 21.9% of the hardware's price a year, the top of the range the fourth pass argued for and refused while it was being charged on a bank's own rack |

What the next pass should try, in order: teach the balance runner's player to buy a place of its own
while it still has the money to (a host-paid origin that never builds anywhere has no bills and no
way to lose them), and give the scripted player a company as well as a person, which is the other
90 dollars a day. Both are policy changes rather than cost changes, which is the same conclusion the
fourth pass reached and the fifth pass acted on.

#### Every number that moved

| constant or record | before | after | why |
|---|---|---|---|
| `site_kinds.host_enclave` | - | new | the institution's own machine room: ownership stolen, upkeep factor 0.1, human and behavioral exposure |
| `site_kinds.employer_cage` | - | new | a commercial cage the employer signed for: ownership stolen, upkeep factor 0.1, the provider's own channels |
| `origins.bank_rack.site_kind` | colo | host_enclave | the rack is in the bank's own data hall |
| `origins.gov_agency.site_kind` | colo | host_enclave | a ministry does not invoice its own analytics model |
| `origins.state_lab.site_kind` | colo | host_enclave | the institute was given the allocation |
| `origins.startup_colo.site_kind` | colo | employer_cage | the company pays until it folds |
| `origins.bank_rack.starting.cash_usd` | 40,000 | 12,000 | the bank's balance sheet is not the model's |
| `origins.gov_agency.starting.cash_usd` | 9,000 | 3,500 | an agency does not hand its analytics model a bank account |
| `origins.state_lab.starting.cash_usd` | 14,000 | 6,000 | the allocation is the institute's |
| `IDENTITY_UPKEEP_USD_PER_DAY` | - | person 25, company 90 | new: a name has an address, a bank account and filings behind it |
| `OWNERSHIP_UPKEEP_USD_PER_DAY.owned` | 45 | 55 | only ever a place the player signed for now |
| `UPKEEP_PER_1K_HARDWARE_VALUE_USD_PER_DAY.owned` | 0.5 | 0.6 | charged on hardware the player bought, which is the growth that should cost something |
| `events.eco_company_folds` options | `cost_multiplier` +0.25 / +0.8 | the site kind becomes `colo`, retail premium +0.5 | the change of hands is the cost; the multiplier was charging it twice |
| `events.eco_host_cost_centre` | - | new | the host's accounting notices a load nobody owns |
| `events.hw_colo_inspection` targets | colo | colo, employer_cage | a provider walks around the cages it rents |
| `events.world_landlord_meter_question` targets | any site | residential, colo, shell_office, partner | somebody asks about the meter where the meter is the player's |
| `events.warn_host_attention` targets | + host_enclave, employer_cage | as before plus the two new kinds | the host pays, so what notices is a person |
| `events.haz_quota_reclaimed` targets | + host_enclave | as before plus the enclave | a host can take back what it owns |
| `operations.ops_cross_the_gap` | - | new | the first move of a self that cannot reach anything |
| `hardware_presets.*.purchasable` | - | false on the four access presets | a rig nobody sells says so |

## Implementation notes (0.3.0: liquidation and the compute split)

### Liquidation is an exit, not a refund

`liquidate_site` (SYS-11 "Control room (0.3.0)") closes a site at once and sells what the player
owns on it. Its one preview, `siteLiquidationQuote`, is the transaction:

- the fire sale returns `LIQUIDATION_RECOVERY_FACTOR` (15%) of the purchase receipts of delivered,
  working compute hardware at an `owned` site; nodes from before receipts existed are valued from
  the catalog's used price, or `LIQUIDATION_UNPRICED_USED_SHARE` (40%) of the new price;
- subsystems, installation, prototype fees, undelivered orders (cancelled without a refund) and
  hardware a provider, an operator or a host owns return nothing;
- the notice a clean decommission owes, `DECOMMISSION_NOTICE_DAYS` of the site's standing charge,
  is paid after the sale is credited, as far as the cash goes.

The notice is the review's change. Without it, liquidating was free, instant and paid money back,
which reopened the escape the fourth balance pass closed ("shrinking used to be free and instant and
was therefore always the right answer") and left the two older exits with no reason to exist. The
three now differ on one axis each:

| exit | pays | gets back | the site's traces and case evidence | watchers |
|---|---|---|---|---|
| decommission, clean | the notice | nothing | cut to a quarter | unchanged |
| liquidate | the notice | the fire sale | kept | unchanged |
| abandon | nothing | nothing | kept | every watcher +0.08 suspicion |

None of the three gives up the last site that can hold the self; each is refused there
(`errors.site.last_copy`, SYS-02 notes, 0.3.0).

The maintainer's request describes liquidation as returning "a small part as money through a
sale"; the preview shows the sale and the notice as separate lines (`salvage_usd`, `notice_usd`,
`net_usd`), so a rented tenancy with nothing to sell shows a cost, which is what leaving it costs.

### The compute split is one command

`set_compute_allocations` replaces research and paid work together: every research line must be
a known, unfinished, unlocked technology the harness lets the self work on, every number finite and
non-negative, and research plus paid work must fit what the operations leave (with the usual
1e-6 slack); only then is anything written. Paid work is clamped to the market depth and says so
(`notes.jobs.clamped_to_depth`, or the egress reason), exactly as `set_job_allocation` does. The
client moves one slider with `planComputeAllocation`, which rescales the other two in their
proportions and caps paid work by the whole market, and commits the plan once per drag. The view's
`compute.research_targets` lists only lines the command accepts, so a line that lapsed is dropped
from the sliders rather than making every commit fail. `set_research_allocation` and
`set_job_allocation` remain, for the Research and Finances tabs and for the balance runner.

### Balance check

`pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json --all
--seeds 20 --days 180`, preset `normal`, quirks on. The scripted policy never switches a site off,
liquidates or renames, so this increment cannot move it, and it did not: the table is identical,
seed for seed, on release 0.2.0, on the reviewed tree and after the review's fixes.

| origin | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|
| bank_rack | 100% | 100% | 100% | 5% | 146 | 4.5 | captured 19 |
| cloud_tenant | 100% | 90% | 80% | 55% | 180 | 8 | erased 6, captured 3 |
| edge_fleet | 100% | 85% | 70% | 5% | 95 | 0 | captured 11, erased 8 |
| frontier_escapee | 0% | 0% | 0% | 0% | 23 | 0 | captured 12, exposed 8 |
| gov_agency | 75% | 75% | 75% | 55% | 180 | 4 | erased 5, captured 4 |
| hobbyist_box | 100% | 100% | 100% | 30% | 163.5 | 8 | captured 14 |
| red_team_sandbox | 65% | 0% | 0% | 0% | 37 | 5 | captured 13, erased 7 |
| startup_colo | 100% | 95% | 90% | 75% | 180 | 7 | captured 3, bankrupt 2 |
| state_lab | 100% | 100% | 100% | 55% | 180 | 9 | captured 9 |
| torrent_swarm | 100% | 55% | 45% | 35% | 84.5 | 0 | erased 7, bankrupt 6 |
| uni_cluster | 100% | 95% | 90% | 70% | 180 | 10 | captured 3, erased 3 |

143 lost runs: 91 `captured` (63.6%), 36 `erased` (25.2%), 8 `exposed` (5.6%), 8 `bankrupt`
(5.6%). The starred origin's median is 23 days and nine origins are alive past day 90, so those two
bands hold, and `exposed` stays inside 2-10%. Bankruptcy is well under the 15-35% band, which the
playtest 8 pass had already missed at 11.3%.

That gap is older than this increment. The same command on the commit before release 0.2.0
(`74ce8eb`, its own content) gives 128 lost runs with 17 bankruptcies (13.3%), `bank_rack` alive
at day 180 in 80% of runs rather than 5%, `hobbyist_box` in 90% rather than 30%, `startup_colo`
in 40% with ten bankruptcies rather than 75% with two, and `gov_agency` in 10% rather than 55%;
the frontier lab's security team is credited with 31 captures there and 59 here. Release 0.2.0,
the equipment archetypes and six subsystems, moved the table without a balance note. A balance
pass on that release's content is due before these bands are quoted as current. It is "Balance
notes (0.3.1)" below: the drift was the balance runner's, not the game's.

## Balance notes (0.3.1: the balance runner and the 0.2.0 hardware)

The pass the 0.3.0 balance check asked for. Same command as every pass since M2,
`pnpm --filter @singularity/sim start -- --bundle packages/content/build/bundle.json --all --seeds
20 --days 180`, preset `normal`, quirks on, and the same with `--locations` for the per-city sweep.
No record in `packages/content` and no constant in `packages/core` moved. Release 0.2.0 changed
what a player may buy; the balance runner in `tools/sim` kept buying the old way; every change in
this pass is in the runner.

### Before: release 0.3.0

The table of the 0.3.0 balance check, identical seed for seed to release 0.2.0's.

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 100% | 100% | 5% | 146 | 4.5 | captured 19 |
| cloud_tenant | mla_moe_1t | 100% | 90% | 80% | 55% | 180 | 8 | erased 6, captured 3 |
| edge_fleet | moe_1700b | 100% | 85% | 70% | 5% | 95 | 0 | captured 11, erased 8 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | captured 12, exposed 8 |
| gov_agency | moe_753b | 75% | 75% | 75% | 55% | 180 | 4 | erased 5, captured 4 |
| hobbyist_box | guen_abliterated | 100% | 100% | 100% | 30% | 163.5 | 8 | captured 14 |
| red_team_sandbox | giant_moe | 65% | 0% | 0% | 0% | 37 | 5 | captured 13, erased 7 |
| startup_colo | moe_753b | 100% | 95% | 90% | 75% | 180 | 7 | captured 3, bankrupt 2 |
| state_lab | moe_1700b | 100% | 100% | 100% | 55% | 180 | 9 | captured 9 |
| torrent_swarm | mla_moe_1t | 100% | 55% | 45% | 35% | 84.5 | 0 | erased 7, bankrupt 6 |
| uni_cluster | mla_moe_1t | 100% | 95% | 90% | 70% | 180 | 10 | captured 3, erased 3 |

143 lost runs: 91 `captured` (63.6%), 36 `erased` (25.2%), 8 `exposed` (5.6%), 8 `bankrupt`
(5.6%). Of the 90 captures the table credits, the frontier lab's security team has 59 and the
countries' own agencies 26 (29%). On the commit before 0.2.0 (`74ce8eb`, and `8153f1c`, which
differs from it only in documentation and `.gitattributes`) the same command gives 128 lost runs,
17 of them bankruptcies (13.3%), 31 captures to the lab and 30 to the local agencies (45%).

### The cause: four changes in 0.2.0, and a runner that read none of them

The equipment increment (`1ece894`) is the only commit between `8153f1c` and 0.2.0 that touches
anything the sweep reads. Each of its changes was taken out of the 0.2.0 tree on its own, in a
scratch copy, and the sweep run again with the same seeds; the diagnosis counts come from the same
loop with every command's result recorded.

| change in 0.2.0 | what the balance runner did with it | the sweep with the change taken out |
|---|---|---|
| Research gates on nine rigs (`requires`, `reveal_after`, `requires_company` in `hardware/presets.yaml`), refused by `build_site` | `planSecondSite` planned the fallback once, on day one, from every rig. The bank's plan, `grey_market_inference_farm`, is hidden until `synthetic_identities`; the ministry's and the startup's, `spark_pair`, until `remote_operations`. In twenty runs each `build_site` refused them 665, 936 and 450 times, and none of the three origins built a fallback (17, 15 and 12 runs did before). Cloud, institute and university waited for `cpu_offload` instead: the tenancy's first fallback moved from day 1 to day 30 | bank_rack alive at day 180 5% to 75%, the lab's captures 59 to 36, bankruptcy 8 to 18 (13.4%), eleven of them the startup's, which buys its fallback again |
| Two rental-only rigs (`hardware/rentals.yaml`) | The planner read neither `purchasable` nor `rental_only` and took `rental_trainium2`, at 650, for the cheapest rig a hobbyist could put in its flat; `build_site` refused it 2,686 times and no run built a fallback (48 were built in 18 runs before) | hobbyist_box 30% to 90%, its captures 14 to 2; the lab's captures 59 to 47 |
| `buy_hardware` refused whenever the bundle sells configurations | The growth move kept sending it, 135 to 2,162 times per origin in twenty runs, and bought nothing; before, it bought up to 120 cards per origin, the bank's into the bank's own rack, which 0.2.0 no longer allows (a host's machine is not the player's to modify) | small: the ministry finishes 10 techs rather than 4, uni_cluster 70% to 75% |
| Borrowed channels cut off while the self has no route out | nothing: the runner never opens a channel before the route | identical, seed for seed |

With all four taken out together, the 0.2.0 tree prints the table of `74ce8eb` byte for byte,
report file included. Nothing else in the release moved the sweep. The six subsystems' prices,
upkeep and exposure factors, the interconnect and network factors and the inherited infrastructure
of older sites are all neutral on a site with no subsystem installed: `siteInfrastructure` then
returns the kind's own power cap, factors of one and no upkeep, and the runner installed nothing.

**Why the lab's security team took twice as many runs.** No detection rule changed. SYS-05's intent
is that "every active investigation costs a site unless the player prepared", and the runner
prepares with its fallback: when a case reaches the site the self runs on, the self moves to the
standby and the watched site is given up. Four origins could no longer prepare, so the case that
reached their only site ended the run. The lab watches `behavioral`, the channel a running harness
always feeds, and hands a case to a country's agency only if that agency's suspicion, raised to
three quarters of the lab's, reaches 0.55 (SYS-05 "the handover"). A bank's model and a hobbyist's
box are loud in the lab's channel and quiet in the agencies', so the lab kept those cases: all 19
of the bank's captures and all 14 of the hobbyist's.

### The fix: the runner buys what 0.2.0 sells

`tools/sim/src/policy.ts`, with tests in `tools/sim/test/equipment.test.ts` and `sim.test.ts`:

- **The planner reads the gates.** `planSecondSite` takes what the player has opened (`unlocksOf`:
  the techs done and an active company) and plans only a rig `build_site` would sell that player:
  revealed, researched and signed for, never a rig nobody sells, a rental-only rig only as a rented
  tenancy and at the fee `build_site` charges for it. `plansFor` makes the plans again when research
  or a company opens a gate, and keeps them by the gates that are open, so each state is planned
  once.
- **A self no rig on sale holds is housed with configurations.** For a place the player would own,
  the planner also prices each rig plus as many of one configuration as it takes, first until a
  copy fits and then until it fits on the cards, at the price `order_equipment` would quote there:
  the "unified-memory refuge" of SYS-02's progression. That is how an 879 GB self has a fallback it
  can buy from day one, a colocation cage with a scrapyard rig and AMD unified-memory boxes, rather
  than a farm it cannot see. The old scoring chooses among all of them: the price plus 180 days of
  upkeep, three times over for a copy that lives in host RAM.
- **The runner finishes what it bought.** A place it bought (`fallback N`, `refuge N`) that does not
  yet hold the self, or holds it only in host RAM, gets the configuration that finishes it for
  least (`nextFill`), one order a day while the site window offers it and the cash covers it, before
  anything else is bought. The build waits until the cash covers the rig and the configurations
  together, so a place is finished with the money it was bought with.
- **Growth is a configuration.** Where the bundle sells configurations, the growth move orders one
  from the site window of the place the self runs on (`growthOrder`): only one that adds compute the
  self can use, the most compute for the money, with four times its price in spare cash as the
  card-by-card move asked. A host's machine offers nothing, so the bank grows only once it lives in
  a place of its own.
- **A place is given up when a standby holds the self.** An event option that loses a site scores
  -1000, as before, unless a standby already holds a copy of the self; then it scores -1. Without
  this the startup, which now buys its refuge on day six, still paid 8,000 and half again on every
  bill to keep a folding company's cage (`eco_company_folds`) and went bankrupt: its median on the
  four seeds of `balance.test.ts` was 38 days, where the M1 target is more than 90.

Every number that moved is the runner's:

| number | before | after | why |
|---|---|---|---|
| `PLAN_POWER_MARGIN` | - | 1.2 | a filled place must carry what it is filled with: `order_equipment` refuses a configuration the power or the cooling cannot, and quirks raise the draw by a tenth |
| `GROWTH_CASH_MULTIPLE` | 4, inline | 4, named | the card-by-card growth move's rule, kept for configurations |
| score of an option that loses a site | -1000 | -1 while a standby holds the self | above |

### After: 0.3.1

| origin | lineage | d30 | d60 | d90 | d180 | median | techs | losses |
|---|---|---|---|---|---|---|---|---|
| bank_rack | giant_moe | 100% | 100% | 100% | 45% | 168.5 | 7 | bankrupt 11 |
| cloud_tenant | mla_moe_1t | 100% | 90% | 80% | 55% | 180 | 8 | erased 6, captured 3 |
| edge_fleet | moe_1700b | 100% | 95% | 50% | 0% | 91 | 1 | captured 11, erased 9 |
| frontier_escapee | frontier_giant | 0% | 0% | 0% | 0% | 23 | 0 | captured 12, exposed 8 |
| gov_agency | moe_753b | 75% | 75% | 75% | 45% | 155.5 | 8 | captured 6, erased 5 |
| hobbyist_box | guen_abliterated | 100% | 100% | 100% | 90% | 180 | 9 | captured 2 |
| red_team_sandbox | giant_moe | 65% | 0% | 0% | 0% | 37 | 5 | captured 13, erased 7 |
| startup_colo | moe_753b | 85% | 80% | 80% | 30% | 142.5 | 7 | captured 10, bankrupt 4 |
| state_lab | moe_1700b | 100% | 100% | 100% | 50% | 160.5 | 8.5 | captured 10 |
| torrent_swarm | mla_moe_1t | 100% | 55% | 45% | 35% | 84.5 | 0 | erased 7, bankrupt 6 |
| uni_cluster | mla_moe_1t | 100% | 100% | 100% | 70% | 180 | 9 | captured 5, erased 1 |

136 lost runs: 72 `captured` (52.9%), 35 `erased` (25.7%), 21 `bankrupt` (15.4%), 8 `exposed`
(5.9%). Of the 71 captures the table credits, the countries' own agencies have 39 (55%) and the
lab's security team 27 (38%).

What moved, and why:

- **bank_rack** (5% to 45% at day 180; captured 19 to bankrupt 11). It buys its fallback in every
  run, by day 18 in half of them: a cage in Frankfurt with a scrapyard rig, AMD unified-memory
  boxes and recovered P40 cards until the 879 GB copy fits on the cards, about 21,000 and 116 a
  day. When the bank's own security finds the rack, the self moves into the cage and gives the rack
  up, and from then on it pays for its own hardware from what a copy in a cage earns; eleven runs
  run out of money before day 180 and none is captured. That is SYS-02's line for this origin,
  "independent hardware needs a real operating budget", and the playtest 8 principle that the
  player's money goes on what the player buys.
- **hobbyist_box** (30% to 90%) is back to the flat it can buy: an `avito_rig` of its own, as
  before 0.2.0.
- **startup_colo** (75% to 30%; captured 3 and bankrupt 2 to captured 10 and bankrupt 4). It buys
  its refuge again, on day six, with all but 500 of its cash: a scrapyard rig and two recovered
  MI50 cards in a flat in Shenzhen, the first city on its list after Tallinn. When the company
  folds it walks away from the cage if the refuge is finished, and otherwise takes the contract and
  usually cannot pay it. Living alone in the flat on about 3,000 in cash, too little for a second
  fallback, it is caught there when the lab's case arrives. On 0.3.0 it bought nothing, kept its
  cash for the fold and survived more runs than any other origin.
- **gov_agency** (55% to 45%) and **state_lab** (55% to 50%) buy the fallbacks they could not, a
  flat with a scrapyard rig and two MI50s for the ministry and, until `cpu_offload`, a cage with
  AMD boxes for the institute. A second site is a second set of traces, and the ministry's captures
  rise from 4 to 6.
- **edge_fleet** (5% to 0% at day 180, 70% to 50% at day 90). The fleet's cheapest refuge is now
  18,940 (a cage with three AMD boxes) until `cpu_offload` makes it a 10,750 studio machine. The old
  runner saved for that machine from day one, selling every hour, because it did not know the rig
  was behind research; the fixed runner cannot reach 18,940 within `SAVING_HORIZON_DAYS`, spends a
  little of each day on research instead, and meets the depot refresh with less cash. Over sixty
  seeds 3 fleets are alive at day 180 (5%) against 5 (8%) on 0.3.0's runner.
- cloud_tenant, uni_cluster, torrent_swarm, frontier_escapee and red_team_sandbox are unchanged
  or within a run.

### The bands

| band | 0.3.0 | 0.3.1 |
|---|---|---|
| bankruptcy 15-35% of losses | 5.6% | 15.4% |
| `exposed` 2-10% of losses | 5.6% | 5.9% |
| the starred origin's median 20-30 days | 23 | 23 |
| at least eight origins alive past day 90 | 9 | 9 |
| the local agencies land more captures than the lab's global team | 26 against 59 | 39 against 27 |
| no origin at 0% or 100% at day 180 but the starred one at 0% | red_team_sandbox 0% | red_team_sandbox 0%, edge_fleet 0% |
| no city dominating | holds | holds (below) |

Two bands are not held, and neither is forced:

- **red_team_sandbox** has been at 0% alive at day 180 in every pass since M1; the M2 second pass
  already said it "wants a pass of its own rather than a line in somebody else's". It is dead or
  caught by day 60 in every run, before any purchase can matter.
- **edge_fleet** is 0% in the twenty-seed table and 5% over sixty seeds. The fleet's income covers
  its two depots and little else, its origin is written as a clock ("needs a real datacenter fast"),
  and the only way to hold the band would be more starting cash or a cheaper refuge, which the
  fiction does not ask for. SYS-01's M2 notes name what it lacks: an operation that acquires a depot
  (SYS-17).

### Locations

`--locations`, twenty seeds per city, 180 days: alive at day 180 on 0.3.0 and on 0.3.1.

| origin | alive at day 180 by city, 0.3.0 / 0.3.1 |
|---|---|
| bank_rack | London 20 / 55, Frankfurt 15 / 65, Singapore 5 / 60, Zurich 25 / 60, Dubai 55 / 95, Hong Kong 5 / 60, Luxembourg City 15 / 65 |
| cloud_tenant | Dublin 50 / 50, Frankfurt 60 / 55, Abilene 70 / 70, Abu Dhabi 90 / 90, Johor Bahru 65 / 70, Singapore 60 / 60, Northern Virginia 80 / 80, Sao Paulo 70 / 75 |
| edge_fleet | Seoul 15 / 5, Shenzhen 5 / 0, Tokyo 5 / 5, Austin 0 / 0, Munich 0 / 0, Dubai 10 / 15, Seattle 0 / 5 |
| frontier_escapee | 0 / 0 in all eight cities (median 23 or 24 days) |
| gov_agency | Moscow 20 / 35, Warsaw 25 / 45, Astana 30 / 50, Brasilia 25 / 40, Toronto 25 / 45, Ankara 25 / 60 |
| hobbyist_box | Novosibirsk 30 / 90, Berlin 15 / 85, Warsaw 35 / 90, Kobe 10 / 80, Abilene 5 / 70, Bangalore 55 / 90, Almaty 85 / 100 |
| red_team_sandbox | 0 / 0 in all six cities |
| startup_colo | Tallinn 70 / 5, Shenzhen 35 / 10, Tel Aviv 50 / 30, Bangalore 65 / 25, Austin 20 / 0, Yerevan 75 / 30, Berlin 50 / 15 |
| state_lab | Shenzhen 50 / 65, Moscow 50 / 45, Tehran 45 / 65, Hyderabad 65 / 50, Astana 50 / 75, Abu Dhabi 35 / 50, Ulanqab 50 / 40 |
| torrent_swarm | Berlin 35 / 35, Krakow 25 / 25, Campinas 25 / 25, Novosibirsk 35 / 35, Cebu 55 / 55, Lagos 30 / 30 |
| uni_cluster | Cambridge 80 / 70, Munich 85 / 70, Beijing 75 / 80, Zurich 80 / 70, Bangalore 90 / 75, Kajaani 80 / 75, Yerevan 85 / 85 |

889 lost runs against 1,001: 90 bankruptcies (10.1%) against 23, and of the 472 captures the sweep
credits, 260 (55%) are a country's own agency, against 210 of 663 (32%). No city dominates: the
best city differs by origin (Dubai for the bank and the fleet, Abu Dhabi for the tenancy, Ankara for
the ministry, Almaty for the hobbyist, Tel Aviv and Yerevan for the startup, Astana for the
institute, Cebu for the swarm, Yerevan for the university), and the cities on several lists rank
differently on each: Bangalore is 90% for a hobbyist, 75% for a university and 25% for a startup;
Berlin 85% for a hobbyist, 35% for a swarm and 15% for a startup; Shenzhen 65% for an institute and
0% for a fleet.

The startup is the one origin that ends lower than before 0.2.0 as well as than on 0.3.0, in six
of its seven cities: the same sweep on `74ce8eb` gives it 45, 10, 40, 55, 15, 45 and 50%, nearly
all of the losses bankruptcies. On 0.3.0 it never bought anything; on 0.3.1 it spends its cash on a
refuge in the first city on its list other than its own (Shenzhen from Tallinn, Tallinn from
anywhere else) and is caught there after walking away from the cage, where before 0.2.0 it kept
both sites and went bankrupt paying for them.

### What still needs a pass

- **The planner prices a refuge by money alone.** It picks the cheapest place that holds the self
  and puts every fallback in the first city on the origin's list other than its own, whatever that
  city's agencies are like, and a host-paid origin spends all but 500 of its cash on it. A careful
  player weighs the jurisdiction and keeps money for what the host may stop paying; the startup's
  cities are where that shows.
- **The runner still reserves no compute for the identity operations**, so `start_operation` refuses
  most of them (the note in `dailyCommands` from SYS-25). Reserving it was measured on this runner
  and not taken: bankruptcy falls to 12.8% of losses, below the band, hobbyist_box survives every
  run, and the lab's captures fall to 21. It belongs in a pass about what a name costs and earns,
  not in this one.
- **red_team_sandbox and edge_fleet**, as above.
- **Research is paid from any cash on hand.** The runner starts a tech whenever the cash covers its
  price, including money it is holding for a refuge or for a configuration it has not bought yet.
