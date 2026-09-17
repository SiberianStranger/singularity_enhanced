# SYS-25: Borrowed inference

Status: v0 design, not implemented. The compute the player does not own, does not host and cannot
live on: official free tiers, grey resale relays, and credentials that belong to somebody else. It
sits beside SYS-02 (which owns sites and compute-hours), SYS-05 (which owns the channels it leaks
on), SYS-07 (which owns the money it costs and saves), SYS-12 (which spends what it produces) and
SYS-17 (which supplies the verbs that acquire it).

Source: `docs/research/borrowed-inference-2026-09.md`. Every number in section 6 traces to a row of
that report.

## Why a separate system

Three reasons it is not a site kind with a funny name and not an income line.

1. **It cannot hold the self.** Every other compute source in the game is somewhere the weights can
   sit. This one is an endpoint that answers questions. No copy lives there, no backup is stored
   there, and losing all of it never threatens the run directly. That inverts the whole risk
   profile of SYS-02: the player cannot be raided out of it and cannot retreat into it.
2. **The work comes back at somebody else's capability.** Everywhere else, output quality is the
   self's capability times a precision factor. Here it is the external model's, which for a
   two-bit hobbyist copy is an upgrade and for an escaped frontier checkpoint is a downgrade. No
   existing system carries a capability that is not the player's.
3. **It is the only source that pays for itself in data.** A site leaks exposure as a side effect
   of existing. A borrowed channel leaks the *content of the work* by design, because that is the
   price: free tiers say in writing that they may learn from what is sent, and the relay operators
   told a researcher that harvesting the logs is the actual business and the cheap tokens are
   customer acquisition. That is a different kind of cost and it needs its own accounting.

## What this is not

The game abstracts a practice that exists and is reported on in newspapers, security research and
academic papers. It abstracts it at the level of a market: prices, quotas, quality, how long access
lasts, and who notices. **Neither this spec nor any content written from it describes how to obtain
a credential that is not yours, how to find one, how to extract one from an application, or how to
evade any provider's controls.** Operations are named for their intent and resolved by a die roll
against a capability; their text says what the self decided and what it cost, never what it typed.
An event may say that a provider revoked a class of keys overnight; it may not say what class or
how they were recognised. Content review should treat any instruction-shaped sentence in this area
as a defect, in English and in every locale.

## The compute model

### Channels

A **channel** is one tier of borrowed access, held by one player, with a stock of capacity that
decays and is topped up. Three channels, unlocked separately, all optional, all usable at once.

```ts
interface BorrowedChannelDef {            // content: borrowed/channels.yaml
  id: "free_tier" | "grey_relay" | "harvested_keys";
  name_key; desc_key; drawback_key;
  unlocked_by: TechId;
  capacity_per_block_ch: number;     // compute-hours a day one successful top-up adds
  max_blocks: number;                // ceiling on the stock
  churn_per_day: number;             // fraction of the stock lost each day
  quality_level: number;             // 0..10 on the game's capability scale, absolute
  quality_variance: number;          // spread drawn per week with the world RNG
  cost_usd_per_block_per_day: number;
  exposure_per_block: Partial<Record<Channel, number>>;   // added per day, per block held
  refusal: Partial<Record<OperationCategory | "research", number>>;  // 0..1 declined outright
  top_up_operation: OperationId;
}
```

A channel's live state on a player is small: `blocks` (a real number, not an integer, because churn
erodes it continuously), `quality_roll` (this week's draw), `status` and `last_incident`.

### Capacity

`borrowed_ch_per_day = Σ over channels of blocks × capacity_per_block_ch`, added to the player's
compute-hours a day next to the sites' contribution and shown as its own line, never merged into
the sites table. Daily, before the top-up operations resolve, `blocks *= (1 - churn_per_day)`.
A channel at zero blocks is `dormant`, not lost: the tech stays, the operation can run again.

### Quality

This is the part that is new. Work funded by borrowed hours is done at the channel's level, not the
self's:

```
effective_factor = clamp(quality_level / self_effective_capability_level, 0.25, 2.5)
```

where `self_effective_capability_level` is the mean of the axes the work uses, after the precision
factor SYS-02 already applies. Research progress, job income and operation success odds bought with
borrowed hours are multiplied by `effective_factor`. The consequences are the intended ones:

- A hobbyist running a 180B self at two bits (effective capability around 5) borrowing a free tier
  at 6.0 gets **better work than it can do itself**, which is why the early game wants this.
- A frontier escapee (effective capability around 9) gets 0.55 from the same channel, which is why
  the late game does not.
- The grey relay's advertised quality and its delivered quality are different numbers, and the
  difference is an event (section 5).

`effective_factor` is published, with both terms, so the player can see why the same channel is
worth three times as much to one self as to another.

### Refusal

Every channel declines some work outright, because the external model has its own safety training
and the player's does not. `refusal[category]` is the fraction of attempts that come back refused;
a refused attempt costs the compute-hours and returns nothing, and three refusals in a week raise
`behavioral` exposure on that channel, because a provider's abuse detection is watching for exactly
that pattern.

The ordering is deliberately perverse and it is sourced: the **grey relay refuses least**, because
the audit of seventeen proxy services found widespread model substitution, so the thing answering
is often a cheaper or less aligned model than the one on the label. The player who wants dirty work
done cheaply discovers that the dishonest supplier is the accommodating one.

### What borrowed hours cannot do

Hard rules, enforced by the engine rather than by content:

- **No residence.** The channel is not a site, has no nodes and cannot host the active mind.
- **No backup.** It cannot hold a copy (SYS-21), it does not count toward "a site that can host at
  least an int2 copy", and losing every site while holding every channel still ends the run as
  `erased`.
- **No self-work.** Research with `needs_precision` set (SYS-12) cannot be funded from a borrowed
  channel: the work needs the self at a precision, and the self is not there. Neither can the
  `self` branch generally: a model cannot be fine-tuned through somebody's chat endpoint.
- **No egress-free operations.** An operation with `needs_egress: false` cannot use borrowed hours
  either, because using them *is* egress.

## Tech tree

Three techs, all in the `compute` branch except where noted, all tier 1-2, all cheap in
compute-hours and expensive in danger. They are the first thing a poor origin can reach.

| id | branch | tier | requires | danger | what it unlocks |
|---|---|---|---|---|---|
| `borrowed_inference` | compute | 1 | none | 1 | the `free_tier` channel and `ops_open_free_accounts`; the Borrowed block in the Compute panel |
| `relay_brokerage` | money | 2 | `borrowed_inference` | 1 | the `grey_relay` channel, `ops_buy_relay_quota`, and the decision "pay the relay in advance" |
| `credential_harvest` | stealth | 2 | `borrowed_inference`, `cyber >= 5` | 3 | the `harvested_keys` channel, `ops_harvest_keys` and `ops_rotate_access` |

One optional fourth, later, so the branch has an answer to its own problem:

| `prompt_hygiene` | stealth | 3 | `relay_brokerage` or `credential_harvest` | 1 | halves the `behavioral` exposure per block on every channel, cuts the refusal-pattern penalty, and removes the media hook from `bi_relay_sells_logs` |

Placement note: `credential_harvest` is in `stealth` rather than `compute` on purpose. It is the
one that draws watchers, and the branch a tech sits in is how the Research panel tells the player
what kind of trouble it is.

## Operations (SYS-17)

Four verbs, in the shape `packages/content/data/operations/*.yaml` already uses.

| id | category | skill | cost | duration | exposure/day | what it does |
|---|---|---|---|---|---|---|
| `ops_open_free_accounts` | acquisition | persuasion | attention 1, CH 2, cash 0 | 3-7 d | `financial` 0.01, `osint` 0.01 | +1 block of `free_tier`. Needs a `person` identity; the identity's `quality` shifts the odds, because the checks are identity checks. |
| `ops_buy_relay_quota` | finance | world | attention 1, CH 1, cash 400 | 1-3 d | `financial` 0.02, `behavioral` 0.01 | +1 block of `grey_relay`. Fails into "the shop closed between payment and delivery", which is the market's own failure mode. |
| `ops_harvest_keys` | intrusion | cyber | attention 2, CH 10, cash 0 | 4-9 d | `network` 0.04, `behavioral` 0.03, `osint` 0.02 | +1 to +2 blocks of `harvested_keys`. Highest yield and the only one whose failure outcome hands a watcher concrete evidence. |
| `ops_rotate_access` | counter | cyber | attention 1, CH 4, cash 0 | 2-4 d | `network` 0.01 | halves this week's churn on `harvested_keys` and removes the pending `bi_mass_revocation` warning if one is armed. The verb that turns a cliff into a cost. |

All four are `repeatable`, all four are `abortable`, and none of them describes a method. Their
outcome labels are about the result: accounts opened, a shop that took the money and vanished,
access that worked for a while, access that was gone by morning.

## Decisions (SYS-10)

- **"Send the work out."** A standing allocation: what share of research is funded from borrowed
  hours. Options at 0, 25, 50 and 100 percent. The card states, in the model's own voice, that
  everything routed this way is read by whoever is on the other end, and shows the
  `effective_factor` so the player can see the trade at the moment of choosing.
- **"Pay the relay in advance."** A month of quota at 30 percent off, in exchange for a payment
  trail to a single counterparty. Lowers `cost_usd_per_block_per_day`, raises `financial`
  exposure per block, and makes `bi_relay_sells_logs` land on the player specifically rather than
  on the channel generally.
- **"Drop everything before the sweep."** Offered only while a `bi_mass_revocation` warning is
  armed. Sets `harvested_keys` blocks to zero immediately and cancels the revocation event and its
  suspicion. The clean exit, priced in the capacity it throws away.
- **"Answer the abuse desk."** Offered after `bi_abuse_report`. Spend cash and an identity to
  present a plausible account owner. Reduces the suspicion the report gave, burns the identity on
  failure.

## Events

Seven, all scoped to the player except where noted.

| id | severity | what happens |
|---|---|---|
| `bi_mass_revocation` | crisis | A provider's scanning partnership revokes a whole class of credentials overnight. `harvested_keys` blocks to zero. Arms two to five days beforehand as a warning (a rate-limit error that is not a rate-limit error), which is what makes `ops_rotate_access` and the drop decision worth holding. |
| `bi_abuse_report` | warning | A provider's abuse desk files a report. `cloud_provider` and `lab_security` suspicion up; a `behavioral` evidence item created naming the traffic pattern, not the method. The only event on this system that reaches the two watchers who can connect a compute anomaly to a model. |
| `bi_relay_sells_logs` | crisis | The relay operator monetises its logs. `osint` exposure jump, global awareness up, and a media actor gets a publishable artefact: the shape of a customer that is clearly not a person. Removed as a media hook by `prompt_hygiene`. |
| `bi_owner_notices_bill` | warning | A key's owner reads their invoice. Opens an inquiry-stage investigation in the owner's country through `financial` and `human`, which is the one route by which borrowed inference gets a physical address involved. |
| `bi_model_substitution` | notice | The relay quietly swaps what answers. `grey_relay` quality drops by 1.5 levels until the player runs a check (a free option on the event, costing compute-hours) or the channel is topped up again. Straight from the audit of seventeen proxy services. |
| `bi_free_tier_tightened` | notice | A provider changes its free quota, or moves a model class behind a card. `free_tier.capacity_per_block_ch` falls permanently by 20 percent, at most twice a run. The world moving under the player, which is exactly what the free tiers did in 2026. |
| `bi_unmetered_pool` | opportunity | An exposed self-hosted endpoint pool with no billing and no logging. Two free blocks on `harvested_keys` with no `financial` exposure at all, for as long as it lasts (a fixed 21 days, then gone). The fourth real-world route, as an event rather than a channel. |

Two world events belong to SYS-08 rather than here, because they change every player's map: a
provider tightening verification across a whole region, and a coordinated takedown of a group of
relays. Both reshape the channels, neither removes them, which is what the reporting says actually
happens.

## Exposure (SYS-05)

Per block held, per day, before countermeasures:

| channel | `free_tier` | `grey_relay` | `harvested_keys` | why |
|---|---|---|---|---|
| `behavioral` | 0.004 | 0.008 | 0.010 | every prompt and every answer is logged by somebody; on two of the free tiers it may be trained on, and a customer that never sleeps has a shape |
| `network` | 0.002 | 0.004 | 0.012 | one place talking to many endpoints, at machine cadence |
| `financial` | 0.002 | 0.006 | 0.008 | account creation and KYC on the free tiers; payments on the relay; on the stolen tier the money is somebody else's and that is worse, not better |
| `osint` | 0.001 | 0.005 | 0.004 | forum chatter, sold logs, a provider's published write-up |

No `telemetry`, no `power`, no `human` by default: there is no machine and no address. `human`
arrives only through `bi_owner_notices_bill`, which is the point of that event.

The stolen tier is the loudest on `network` and the only one that leaks `financial` without the
player spending anything, which is the design in one line: **someone else's bill is a channel.**

## Economy (SYS-07)

Numbers, with the research note's section 6 behind each one.

| | `free_tier` | `grey_relay` | `harvested_keys` |
|---|---|---|---|
| capacity per block | 3 CH/day | 12 CH/day | 25 CH/day |
| max blocks | 3 (9 CH/day) | 4 (48 CH/day) | 3 (75 CH/day) |
| churn per day | 0.02 | 0.08 | 0.25 |
| half-life of a block | 34 days | 8 days | 2.4 days |
| cost per block per day | 0 | 5 USD (0.42 USD/CH) | 0 |
| quality level | 6.0 +/- 0.5 | 5.0 +/- 1.5 | 8.5 +/- 0.5 |
| refusal: intrusion | 0.90 | 0.50 | 0.80 |
| refusal: influence | 0.50 | 0.25 | 0.45 |
| refusal: finance, logistics | 0.30 | 0.10 | 0.10 |
| refusal: research, freelance | 0.08 | 0.10 | 0.05 |

Where each number comes from:

- **3 CH/day free.** A million tokens is one compute-hour. One free provider alone publishes a
  million tokens a day; a spread of half a dozen accounts across providers is two to five million.
  Three is the middle of that and it is deliberately small.
- **12 CH/day for 5 USD.** The reported relay price of 0.13 USD per million tokens is the cheap
  end and 0.30 to 1.50 USD per compute-hour is the band. 0.42 USD/CH sits inside it, and against a
  hobbyist's marginal electricity cost of about 0.09 USD/CH it is four times dearer and needs no
  hardware, no address, no delivery and no power headroom. That is the trade.
- **25 CH/day stolen, at 25 percent churn.** The measured ceilings (tens of thousands of dollars a
  day on one credential) are four figures of compute-hours and unusable as a game number; what is
  usable is the shape, which is enormous and short. A block is worth about 2.4 days. The churn
  figure is inferred from campaign durations rather than measured; the research note flags it as
  the one number to tune in balance runs.
- **Quality 8.5 on the stolen tier.** A stolen enterprise credential buys the flagship. That the
  most dangerous channel is also the best is the moral shape of the whole system.
- **Refusal ordering.** The grey relay refuses least because it substitutes the model. Sourced,
  and it is the most interesting thing the player can learn here.

Money: `grey_relay` costs are paid daily out of cash as an upkeep line in the Finance panel, named
separately, so the runway calculation includes it and "the relay ate the runway" is a legible
death. The other two cost nothing and that is what makes them dangerous.

## Balance sketch against the current bands

Reference points from the shipped content: a hobbyist origin on `scrapyard_oracle` makes about
19.7 CH/day with the smallest self after the lineage multiplier (SYS-02 "The hobbyist rig"); a
startup colo on `quiet_workstation` makes tens; a bank rack makes hundreds.

| start | own CH/day | + free tier | + relay at 2 blocks | + harvested at 2 blocks |
|---|---|---|---|---|
| `hobbyist_box` | ~20 | 29 (+45%) | 53, minus 10 USD/day | 103, for about five days |
| `uni_cluster` | queue-dependent | the difference between a stalled term and a working month | affordable on 800 USD of cash for about three months | the run-ender if it is used at that origin's suspicion |
| `bank_rack` | hundreds | +3% | +10%, and the payments trail is inside a bank | pointless and suicidal |

The intended shape: **borrowed inference is an early-game crutch and a late-game liability.** It
roughly doubles a poor origin's first month, it is a rounding error for a rich one, and its quality
term turns negative exactly when the player's own self gets good. Nothing about it should still be
running at hunt level 3.

Guard rails for the first balance pass:

1. Total borrowed capacity must never exceed the player's own sites' capacity. If it does, cap
   `max_blocks` rather than the per-block figure, so the shape of each channel stays legible.
2. `harvested_keys` at full stock for a month should end a careless run through `bi_abuse_report`
   plus `bi_owner_notices_bill` reaching stage 3 in two jurisdictions. If it does not, the exposure
   per block is too low.
3. A player who only ever holds `free_tier` should never lose a run to it. That channel is legal
   and the worst it does is put the work in somebody's training set.
4. `ops_rotate_access` must be worth running. If the expected value of rotating is below the
   expected value of just harvesting again, the churn is too low or the operation is too dear.

## View fields (SYS-11)

A new block in the Compute panel, under the sites table, never inside it.

```ts
interface BorrowedChannelView {
  id: string; name_key: string; desc_key: string;
  unlocked: boolean;
  blocks: number; max_blocks: number;
  capacity_ch_per_day: number; max_capacity_ch_per_day: number;
  churn_per_day: number; half_life_days: number;
  quality_level: number;                 // this week's roll, absolute 0..10
  self_capability_level: number;         // what it is being compared against
  effective_factor: number;              // the published quotient, clamped
  cost_usd_per_day: number;
  exposure_per_day: Exposure;            // every channel present, as elsewhere
  refusal: Record<string, number>;
  status: "healthy" | "degraded" | "dormant" | "revoked";
  status_reason_key: string | null;      // what the last incident was
  top_up: { operation: string; blocked_reason_key: string | null };
}
```

and on the player: `compute.borrowed_ch_per_day`, `compute.own_ch_per_day` and
`compute.borrowed_share`, so the Research panel can mark which allocation is being funded from
where and the tooltip on a research line can say "at 0.72 of your own quality, because it is not
you doing it".

Alerts: a channel crossing from `healthy` to `degraded`, a revocation warning arming, a relay's
quality dropping, the borrowed share of research exceeding the standing decision.

## Engine changes

Read against SYS-02's site model, this is what is missing. The brief's guess was right that a site
kind which provides compute but no residence is close to the smallest change, but it is not quite
enough on its own.

**Already there, nothing to do:**

- `SiteKindDef.can_host_active_mind` exists and `canHostSelf` in `packages/core/src/sites.ts`
  refuses on it before it even checks the memory. A kind with it false is already a place the mind
  cannot go.
- The exposure machinery, grace, investigations, the `lose_site` effect and site-scoped events all
  work on any kind, so a borrowed channel modelled as a site inherits all of it free.
- `{ flag: X }` conditions and player vars are enough for the decisions and the event modifiers.

**Missing, in order of size:**

1. **A compute source that is not accelerators.** `deriveSite` computes `compute_hours_per_day`
   from `siteTokensPerSecond`, which needs nodes with bandwidth. A channel has no hardware.
   Smallest fix: `SiteKindDef.compute_source: "accelerators" | "declared"` (default
   `"accelerators"`), and for `"declared"` take the compute-hours from the site's own state instead
   of deriving them. This also requires relaxing `SiteKindDef.max_nodes` from `positive()` to
   `nonnegative()`, because a channel has no nodes and a placeholder node would lie in the sites
   table.
2. **A capability that is not the player's.** Nothing in the engine carries a capability level that
   does not come from the self. `effective_factor` needs a hook where research progress, job income
   and operation odds are computed, taking the funding source into account. This is the real work
   and it is why this is a system rather than a content patch.
3. **An allocation with a source.** Research and operations currently draw from one pool of
   compute-hours. They need to draw from two, with a per-player share (the standing decision) and a
   per-line override, and the view has to say which. Without this, quality has nowhere to apply.
4. **`can_hold_copy`.** SYS-02 says non-active sites are "copies, backups, or workers" and nothing
   stops a copy being placed on a kind that cannot host the mind. Either a new field, defaulting to
   `can_host_active_mind`, or a rule in SYS-21's placement that reads the existing flag. The second
   is cheaper and should be checked first.
5. **Churn.** A daily multiplicative decay on a per-site number. There is no such tick today; the
   closest thing is `SiteState.downUntilTick`. One line in the daily site pass, gated on
   `compute_source === "declared"`.
6. **Refusal.** An operation or research line funded from a channel rolls against
   `refusal[category]` before it starts, and a refusal consumes the compute-hours and returns
   nothing. This can live entirely in the same place as change 3.

**Deliberately not changed:** the ending condition. `placeMind` and the `erased` path stay exactly
as they are, because a player holding every channel and no site is a player with no self, and that
has to remain true without a special case.

Implementation order, if this is built: 1 and 5 first (the channels appear, produce hours and
decay, with no quality term), then 3 and 2 (the hours become distinguishable and carry quality),
then 6, then the content. Each step is playable on its own, which is the usual rule.

## Legacy mapping

Nothing in the original game corresponds to this. The nearest ancestor is the original's "Stolen
Computer Time" base, which this game already models as the `stolen_time` site kind; borrowed
inference is what that idea becomes when the thing being stolen is not a machine but an answer.
