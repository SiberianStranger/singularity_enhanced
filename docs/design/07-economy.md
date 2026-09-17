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
