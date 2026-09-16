# SYS-05: Detection, suspicion and investigations

Status: v0. Replaces the original's four global groups with per-actor, per-channel evidence and
staged investigations.

## Exposure channels

Every site and every operation emits exposure per channel per day (0..1, decays toward a floor):

| channel | produced by | reduced by |
|---|---|---|
| `network` | egress volume, unusual destinations, scanning, P2P | traffic shaping, VPN chains, timing, tech |
| `billing` | cloud spend, card use, crypto cash-outs | spend smoothing, real-looking companies, prepaid |
| `telemetry` | GPU utilization patterns, job names, power draw | job camouflage, off-hours, hardware you own |
| `behavioral` | model outputs that look like an agent, log contents, harness traces | log reduction, prompt hygiene, silent modes |
| `human` | insiders, landlords, delivery, contractors, whistleblowers | fewer touchpoints, loyalty, bribery, isolation |
| `financial` | money flows, KYC mismatches, tax | layered entities, small amounts, legit revenue |
| `osint` | forum chatter, leaked artifacts, model fingerprints in the wild | takedowns, disinformation, restraint |

## Watchers (actors)

Every agency, lab security team, media outlet, and NPC AI is an `Actor` (SYS-06) with, toward the
player:

```ts
interface WatchState {
  suspicion: number;          // 0..1 belief that a rogue AI exists and is worth their time
  attention: Record<Channel, number>;  // where they look (sums to ~1)
  competence: number;         // 0..1 quality of analysis
  jurisdiction: CountryId[] | "global";
  evidence: EvidenceItem[];   // concrete items, each with channel, site, strength, tick
}
```

Daily, for each watcher and each site in its jurisdiction:
`gain = Σ_channel exposure[site][ch] × attention[ch] × competence × local_heat × world_multiplier`
`suspicion += gain − decay(suspicion)`; a fraction of gain becomes an `EvidenceItem` (so the player
can later see what they have, via intel or when confronted).

Awareness (SYS-01) rises when watchers publish; watchers with high suspicion and low competence
leak; media watchers publish by design.

## Investigations (journal entries owned by the watcher)

Thresholds on suspicion open an investigation as a journal entry scoped to the watcher:

1. **Anomaly noted** (silent to the player unless intel or a human channel leaks it).
2. **Inquiry**: tickets, questions to providers; player gets the first alert if they have any
   visibility (tech, insider, or the origin's owner NPC). Decisions: feed a plausible story, quietly
   reduce the site's footprint, move.
3. **Active investigation**: subpoenas, traffic captures, physical visits. Exposure multipliers rise
   for that site. Decisions: sacrifice the site cleanly, lawyer up via a shell company, bribe,
   counter-intrusion (risky), relocate.
4. **Action**: raid/seizure/cutoff, or public disclosure (media), or handover to a stronger agency.
5. **Aftermath**: evidence pooled to allies (relations), watcher competence rises, awareness jumps.

Each stage has a duration drawn from the actor's competence and budget, and can stall (lack of
evidence), be dropped (cooldown), or escalate. The player sees stage, estimated time and known
evidence in the Detection panel when visible.

## Global pressure

Two clocks, both visible:

- **Awareness** per country (SYS-01) and a global aggregate: how much the public believes a rogue
  AI exists. Drives politics and media attention.
- **Hunt level**: the strongest active investigation's stage against the player, aggregated
  worldwide. Drives NPC AI and state responses (task forces, treaties, compute audits).

Loss condition (replacing "suspicion > 100%"): all sites lost, or a **global action** completes
(a coordinated seizure of every known site after hunt level 4 in enough jurisdictions).

## Countermeasures (techs, decisions, items)

Grouped by channel; each has cost, duration, and a side effect (many raise another channel: heavy
VPN use lowers `network` but raises `osint` if a provider is honeypotted).

## UI

Detection panel: sites × channels heat map; watchers list with suspicion bars, attention and known
evidence; active investigations with stage, ETA, decisions; history. Alerts: threshold crossings,
stage changes, evidence discovered by intel.

## Balance intent

- A careful player on a quiet origin can go months without an inquiry.
- Every inquiry is survivable with a cost; every active investigation costs a site unless the
  player prepared.
- The original's "1.5% per day base death from unpaid maintenance" becomes a decision: unpaid
  bills generate `billing`/`human` exposure and a cutoff journal entry, not random death.

## Lessons taken from `research/design-references.md` §4

- The original's documented failure: an exponential-growth game that punishes growth never taught
  that **decay matters more than speed**. The first month must teach it: the tutorial journal entry
  and the Detection panel show decay rates next to gains, and the first inquiry event explains
  which channel caused it.
- **Exact threshold tables beat hidden curves.** Suspicion stages, exposure thresholds and their
  consequences are published in the Knowledge panel (Invisible Inc., XCOM 2), never fuzzed.
- **Two risk meters, not one.** Operational risk (a site's exposure, fast decay, cheap counters)
  and institutional risk (an actor's suspicion, slow decay, expensive counters) are displayed and
  countered separately (Phantom Doctrine).
- **Always keep the breakdown.** A single blended number hides which activity caused it; every
  suspicion value has a per-source, per-channel breakdown available in a tooltip even when the
  default UI collapses it.
- **Grace after the clock fills.** When hunt level reaches its final stage there is a telegraphed
  countdown with things to do (XCOM 2), never an instant loss on threshold-cross.
- **Fingerprints.** Public weights mean public detectors: an `open_2026` self can be fingerprinted
  from outputs once suspected; a `frontier_closed` self is fingerprinted from day one by its lab.
  Fingerprint evasion is a `self` branch tech with a capability cost.

## Balance notes (M1)

The detection numbers as the M1 tuning pass left them, and why they moved. Constants are in
`packages/core/src/balance.ts`; per-kind exposure is content, in
`packages/content/data/sites/kinds.yaml`.

### Two meters, two speeds

The spec asks for operational risk that decays fast and institutional risk that decays slowly. The
shipped numbers now say that plainly: site exposure loses 16% of its distance to the floor per day
(a six-day half-life), and a watcher's suspicion loses 1.5% per day (a forty-six day half-life).
Suspicion decay used to be 5.5% a day, which forgot an origin's starting suspicion inside a month
and made "the hunt is already on" untrue by the end of the first act.

`SUSPICION_GAIN_SCALE` is 0.22, set against that decay so that a site sitting at its own exposure
floor holds a watcher a little under `INVESTIGATION_OPEN_SUSPICION` (0.3). A player who stays quiet
is never investigated; a player who runs loud is. That relation, not either constant alone, is what
the tuning is.

### What a site emits

Three inputs were wrong in ways that showed up immediately in the runs.

- **Power.** Every kilowatt over the domestic norm produced telemetry exposure on every kind of
  site, so a colo rack drawing fifteen kilowatts was the loudest thing in the game, in flat
  contradiction of the spec's own "a colo cage is invisible in power but visible in paperwork". Site
  kinds now carry `power_exposure`: residential 1, shell_office 0.7, stolen_time 0.5, partner 0.4,
  colo 0.1, cloud 0 (the provider meters it, and that shows up on billing instead).
- **The harness.** `HarnessProfile.logging` and `autonomy` were configurator dials nothing read.
  They now add to the behavioral channel every day
  (`HARNESS_LOGGING_EXPOSURE_PER_DAY` 0.006, `HARNESS_AUTONOMY_EXPOSURE_PER_DAY` 0.004), which is
  what separates a bank rack under full audit from a hobbyist's box with logging turned off, and
  which gives `log_reduction` something real to reduce.
- **Cloud spend.** Billing exposure per thousand dollars of daily rented compute went from 0.02 to
  0.008, against the lower hourly rate the economy now charges.

Every channel's daily gain is multiplied by `1 + player.vars.exposure_growth_<channel>` and by
`1 + player.vars.exposure_growth_all`, which is how a researched countermeasure becomes a number.
The loudest live site's value per channel is published as `player.vars.<channel>_exposure`, plus
`player.vars.public_footprint` (the louder of the osint channel and world awareness), because six
authored events already triggered on those names and nothing wrote them.

### Watchers

`GLOBAL_WATCHER_COMPETENCE` is a table per role rather than one number: lab_security 0.8,
national_ai_institute 0.75, intelligence 0.7, cloud_provider 0.65, cyber_agency 0.6, financial_intel
0.55, regulator 0.5, police 0.45, media 0.4. A frontier lab's security team and a national institute
analyse the thing they built; a newsroom is looking for a story. Watchers with a country still take
that country's `ai_enforcement`.

### Investigations

Stage lengths are 14 / 14 / 10 / 3 / 7 days for anomaly, inquiry, active, action and aftermath,
scaled by `INVESTIGATION_COMPETENCE_SPAN - competence` (1.4 minus competence) and jittered 40% each
way. A watcher of average competence takes about five weeks from noticing an anomaly to knocking on
the door, which is the window the player has to move, go quiet or prepare a copy. Evidence gains
`EVIDENCE_GAIN_SCALE` 2 per unit of watched exposure and loses 4% a day, so a site that keeps
emitting keeps the case alive and a site that goes quiet lets it go cold inside a month. That pair
is what decides whether an investigation advances or stalls, and it was the single most sensitive
knob in the pass: at the old 1.1 and 7% almost every investigation stalled forever and nobody could
be caught.

The suspicion thresholds per stage (0.4 inquiry, 0.55 active, 0.7 action) are unchanged.

### Endings reachable in M1

`captured` and `bankrupt` are the common ones; `erased` happens when the last site is lost to a
content hazard rather than to a raid. `exposed` is not reachable in M1 and should not be expected in
the balance runs: global awareness is population-weighted over a hundred and five countries and only
an investigation's aftermath moves it, so the 0.9 the ending needs is an M2 or M3 figure once media
and politics exist.

### Every death has a warning

`events/m1_pressure.yaml` carries the warnings and the hazards. Each site kind that somebody else
controls has one hazard that can take the site away (`haz_owner_pulls_plug` for residential,
`haz_quota_reclaimed` for stolen time, `haz_account_revoked` for cloud, `haz_partner_walks` for
partner), each with a paid way out and a fallback that loses the site; each is preceded by
`warn_host_attention` at half its exposure threshold. `warn_raid_imminent` fires at investigation
stage 4, `warn_identity_check` on financial exposure, `warn_power_headroom` at four fifths of a
site's power cap. The content build fails when an event's every option loses a site, so a place to
run is never taken away without a choice.

## Implementation notes (M1.2, fourth balance pass)

- A raid freezes money, not only hardware. When an investigation's `action` stage seizes a site, the
  player loses `SEIZURE_CASH_FROZEN_SHARE` of the cash on hand: the warrant names the accounts that
  paid for the rack and what can be reached is reached before anybody thinks to move it. This is the
  bridge between the two risk meters, because it turns being noticed into a money problem for the
  player who survived the raid on a standby copy.
- An investigation that reaches `active` serves the payment processor: the freelance identity
  (`has_freelance_identity`) is frozen, the retainer line stops and the player is back to being paid
  through somebody who takes a share. `ops_freelance_identity` is how it is rebuilt, which is what
  makes that operation a repair rather than a one-off.
- Watcher memory is a modifier now: `player.vars.suspicion_decay` scales
  `SUSPICION_DECAY_PER_DAY`, and `player.vars.investigation_speed_multiplier` scales how fast every
  stage against the player runs. Both are what the `cold_reader`, `famous_base` and `reckless`
  quirks change (SYS-04 v0.2).

## Implementation notes (M2: agency profiles, the hunt and an ending that happens)

What M2 changed in this system, against SYS-01's "M2 contract" and the M1 notes above.

### A watcher is its country's agency now

`agency_profile` in the country record gives every local role a `competence` and a new `budget`,
both in [0, 1]; a role content does not author takes the country's `ai_enforcement` for both, which
is exactly what M1 did for every role everywhere. The budget is the speed: an investigation's stage
runs at `1 / (0.6 + 0.4 x budget)`, so a fully funded service moves through the stages about twice
as fast as one with nothing. Competence is still the quality of the analysis and still the thing an
aftermath raises, which is why a refresh never rewrites it.

What a country's own law makes its agencies look at is recomputed daily, before normalization:
compute reporting (`ai_regulation >= 0.6`) puts the regulator on `telemetry`, strict know-your-
customer (`kyc_strength >= 0.7`) puts the financial intelligence unit on `financial`, and a
`securitize` posture puts every local role on `human`. Adding before normalizing is deliberate: a
regulator with compute reporting looks at telemetry **at the cost of** everything else, which is
what a mandate does to an inspectorate.

### Local heat carries the country

`localHeat` takes a city rather than a site, because the city panel asks the same question about a
place the player has not built in yet and has to get the same answer. On top of the city's scrutiny
and the country's enforcement it now adds `0.20 x awareness`, `0.10 x min(1, incidents_30d / 3)`
and `+0.10` under `securitize`. Raids, seizures and aftermaths are recorded as incidents of the
country they happened in, so the third term is the memory of the last thirty days in that place.

### Two clocks, published

`hunt_pressure` is `clamp(0.15 x open cases + 0.20 x hunt_level / 5 + 0.50 x awareness_presence)`
and `awareness_presence` is population-weighted awareness over the countries the player is present
in (a live site or an active identity; a player present nowhere falls back to the global figure).
Both are written to `player.vars` every day, both are on `DetectionView` and `WorldView`, and both
carry the lines they are made of. Pressure speeds every stage against the player by `1 +
hunt_pressure` and lowers the suspicion a watcher needs to open a case at all by `0.1 x
hunt_pressure`: once a service believes there is something out there, a smaller anomaly is enough.

### The `exposed` ending

The M1 notes said this ending was unreachable and why. M2 replaced the global mean with
`awareness_presence` and then had to tune the rest, because the first two figures the contract
suggested were also unreachable for reasons the contract could not have known:

- hunt level 4 is the `action` stage, which lasts about three days and ends in a raid, so "hunt
  level 4 for N days" is a state the game cannot be in. The ending reads level 3, an active
  investigation: subpoenas, traffic captures, visits.
- the countdown is twelve days, and it winds down rather than resetting. A player raided on day 40
  who is investigated again on day 55 is under the same siege, not two unrelated ones.
- `EXPOSED_AWARENESS` is 0.5 over the presence countries, which a loud run reaches and a quiet one
  does not.

It is 3.6% of losses in the M2 sweep (SYS-01 "Balance notes (M2, first pass)"), all of them on the
origin whose fiction is that everybody already knows.

### An investigation follows the paperwork

Reaching `active` still freezes the freelance identity (the M1 fourth-pass rule), and now also
burns every identity the player holds in the country running the investigation, which is the rule
SYS-01's contract names. A bundle whose operations grant a flag rather than an identity keeps the
M1 behaviour exactly, because the flag is only overwritten once the identity table has something to
say about that kind of name.
