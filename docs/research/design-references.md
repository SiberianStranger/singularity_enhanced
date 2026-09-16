# Design References: Notifications, Events, Configurators, Hidden-AI Mechanics, Maps, and Lite-Sim Politics

Research date: 2026-09-16. Compiled for the Singularity Enhanced rework (escaped-LLM grand-strategy-lite, 2027 setting).

**Method note.** Official Paradox wikis (`*.paradoxwikis.com`) now render as JavaScript SPAs that this session's fetch tool cannot execute, so Paradox modding-doc content below was retrieved through `github.com/jesec/ck3-modding-wiki`, a daily-updated, CC-BY-SA Markdown mirror of the CK3 wiki's modding category, cross-checked against Fandom/community-wiki search snippets, and Wikipedia/GDC/store-page fetches for everything else. Every canonical wiki URL is still cited so it can be opened directly; where content came via the mirror this is noted. Open-source engines were inspected by pulling real data files straight from their public GitHub repos (paths cited).

---

## 1. Notification / alert systems

Every Paradox game (and most of the non-Paradox comparators) actually implements **four separable channels**, not one "notifications" feature, and the games differ mainly in how much control they hand the player over routing each message type between channels.

- **Blocking popup / modal** — stops input until dismissed; used for events with player-facing choices (CK3 event window, HOI4/Stellaris event popups).
- **Toast / banner** — transient, non-blocking, auto-dismisses; used for "FYI" effects (CK3 `send_interface_toast`/`send_interface_message`, Civ VI's slide-in notifications, Total War's advisor line).
- **Persistent icon / badge** — sits in a fixed UI slot until the underlying condition clears; the "I will keep bothering you" channel (EU4's alert bar, Stellaris outliner badges, XCOM 2's Avatar bar, CK3's "Current Situation" counter).
- **Permanent log** — a scrollback the player can open on demand and that never auto-clears (Stellaris Situation Log, RimWorld's letter/message history, Football Manager's inbox itself).

### Per-game taxonomy

- **EU4** — a horizontal **alert icon bar** (idea ready, no heir, unrest, etc.); each alert type is independently togglable in **Options → Message Settings**, and the game's own modding community argues over whether an alert can be *both* popup **and** icon simultaneously — i.e. message routing is a per-type multi-select, not a single enum. [Alerts](https://eu4.paradoxwikis.com/Alerts) · [Settings](https://eu4.paradoxwikis.com/Settings) · [Talk:Settings](https://eu4.paradoxwikis.com/Talk:Settings)
- **CK3** — two independent systems: (1) blocking **event** popups for anything with options, plus toast (`send_interface_toast` = banner at screen top, `send_interface_message` = corner icon+text), and (2) the **"Current Situation"** dropdown — a badge with a count, opened on demand, listing non-urgent opportunities (wars you could declare, prisoners you could ransom, a powerful vassal wanting a council seat). Individual situation rows are dismissible by right-click; the badge itself has its own message-settings entry. [Notifications (CK2, same lineage)](https://ck2.paradoxwikis.com/Notifications) · [Interface guide](https://www.gamepressure.com/crusader-kings-3/interface-description/z2f0f6) · [forum: notification settings](https://forum.paradoxplaza.com/forum/threads/notification-settings.1445086/)
- **Victoria 3** — the **Journal** panel is the log; individual journal entries can be **pinned** to a persistent top-right widget (unpin via a star icon) so the player chooses which ongoing storylines stay visible as icons. A "Current Situations" button in the top-right corner opens the message-settings-equivalent feed customizer. [Journal](https://vic3.paradoxwikis.com/Journal) · [Journal modding](https://vic3.paradoxwikis.com/Journal_modding) · [User interface](https://vic3.paradoxwikis.com/User_interface)
- **HOI4** — a cautionary example: the *only* real setting is **Options → Game → "Pause on notification"**, a single global toggle that pauses on every focus/event/research completion and every foreign-nation ask (non-aggression pact, access, join-war). There is no per-type routing at all, and the community has repeatedly asked Paradox for EU4/CK3-style granularity. [User interface](https://hoi4.paradoxwikis.com/User_interface) · [forum thread](https://forum.paradoxplaza.com/forum/threads/current-state-of-information-notification-message-settings.1567784/)
- **Stellaris** — the richest taxonomy of the set. The **Outliner** (right edge, 4 tabs: Government / Ships / Politics / Structures) is a permanently-visible, auto-grouped icon tree of everything ongoing; the **Situation Log** is a separate on-demand window with Log / Anomalies / Victory tabs. [Situations](https://stellaris.paradoxwikis.com/Situations) · [Main interface (Fandom mirror)](https://stellaris.fandom.com/wiki/Main_interface)
- **Imperator: Rome** — notifications carry a small **cog icon** that opens per-type message settings *without leaving the current screen* — a nice micro-pattern (settings-in-context vs. a separate options menu). Early Access shipped without country-of-interest filtering, which players immediately flagged as a gap. [forum: message notifications QoL](https://forum.paradoxplaza.com/forum/threads/message-notifications-simple-qol-stuff.1460107/)
- **Civilization VI** — notifications slide down the right edge; over 110 distinct notification icon types exist, but base-game granularity is coarse enough that the popular **CQUI** mod's headline feature is splitting single notifications into progress thresholds (e.g. research at 50%/100%). Right-click dismisses one; right-click the stack counter dismisses all of that type. [Notification icons](https://civ6.fandom.com/wiki/Category:Notification_icons) · [CQUI](https://github.com/CQUI-Org/cqui)
- **Frostpunk** — events surface as an **icon-with-countdown-timer** floating over the city; letting the timer expire resolves the event automatically (usually to its default/worst outcome) rather than freezing the game, so "ignore" is a legitimate, legible third choice next to the event's explicit options. [Book of Laws](https://frostpunk.fandom.com/wiki/Book_of_Laws) · [Events](https://frostpunk.fandom.com/wiki/Events)
- **Total War** — a **cog icon** next to the notification queue opens per-category routing; a button beside "End Turn" clears one notification (Warhammer II) or *all notifications of that type* (Warhammer III) — an explicit iteration toward bulk-dismiss as the series matured. Advisor lines (`show_advisor_message`) are a separate, lower-priority channel from the notification queue itself. [Notifications](https://totalwarwarhammer.fandom.com/wiki/Notifications) · [Campaign UI](https://academy.totalwar.com/campaign-what-the-ui-is-and-does/)
- **Football Manager** — the **inbox** *is* the log (no separate history), with a search box, read/unread state, per-item "save"/bookmark, and category filters (transfers, matches, league). Critically, some items are marked **"Must Respond"** in red and **replace the Continue button**, hard-blocking time advancement until answered — the cleanest real-world example of "some messages are popups, most are toast, and a rare few are gates." [Inbox and news](https://community.sports-interactive.com/sigames-manual/football-manager-2024/inbox-and-news-r4956/) · [FMInside guide](https://fminside.net/guides/basic-guides/20-inbox-and-news)
- **XCOM 2** — the **Avatar Project** bar is a persistent 12-segment HUD element, not a message at all: it is the "global doom clock" pattern in its purest form (see §4). Filling it starts a fixed-length doom countdown (24/22.75/15/27.33 days by difficulty) that is itself shown as a second, more urgent timer, giving the player an explicit, telegraphed grace period rather than a surprise loss. [Avatar Project](https://xcom.fandom.com/wiki/Avatar_Project)
- **RimWorld** (non-Paradox) — **Letters** (colored envelope icons stacking on the screen edge) are the single unified channel: color *is* severity (blue = good, grey = neutral, yellow = bad, red = direct threat), click jumps the camera to the letter's subject, right-click dismisses. Big-threat letters auto-pause the game; routine ones do not. There is no separate "log" beyond the letter stack itself. [Events](https://rimworldwiki.com/wiki/Events) · [Menus](https://rimworldwiki.com/wiki/Menus)

### Comparative taxonomy (confident cells only; "—" = not established by sources gathered)

| Game | Blocking popup | Toast/banner | Persistent icon/badge | Permanent log | Per-type player settings | Click-to-navigate |
|---|---|---|---|---|---|---|
| EU4 | some | — | alert bar | — | yes, fine-grained | yes |
| CK3 | event window | toast + corner msg | Current Situation badge | — | yes | yes |
| Victoria 3 | event window | — | pinned journal entries | Journal tab | yes | yes |
| HOI4 | event window | — | alert icons row | — | **no** (global toggle only) | yes |
| Stellaris | event window | minor toast | Outliner (4 tabs) | Situation Log (3 tabs) | yes, per category | yes |
| RimWorld | threat letters auto-pause | letter stack | letters persist until dismissed | letter history | limited | yes (jump-to) |
| Civilization VI | — | slide-in notifications | notification stack+count | — | no (base game) | yes |
| Total War | advisor (early) | notification queue | icon+counter | — | yes, via cog | yes |
| Football Manager | "Must Respond" items | most inbox items | — | inbox itself | yes, filters | n/a (opens item) |
| XCOM 2 | mission alerts | — | Avatar Project bar (HUD) | — | n/a | n/a (HUD, not clickable) |

### Data model this implies

```yaml
# One row per distinct message/alert *type* the game can emit.
alert_type:
  id: suspicion_spike            # stable key, matches an event/effect source
  category: security              # groups rows in the settings UI (EU4/Imperator pattern)
  severity: warning               # info | warning | danger | critical  (RimWorld-style color = severity)
  default_channel: toast          # popup | toast | icon | log_only
  pausable: true                  # can this type request an auto-pause (HOI4/RimWorld)
  navigable: true                 # click/select jumps camera or opens the relevant panel
  grouping_key: suspicion_spike   # identical keys stack into "x3" (Civ VI, CK3 dismiss-stack)
  ttl: {days: 14}                 # auto-expire if unopened; null = persists until dismissed (Frostpunk-style default-resolve on expiry)
  on_expire_effect: auto_ignore_option   # what happens if ttl elapses unopened
  log_channel: security_log       # which permanent, always-available log/outliner tab records it
  ai_visible: false                # NPC AIs (see §7) read the same event, players read the presentation

# One row per (player, alert_type) — the actual "Message Settings" screen.
message_setting:
  alert_type: suspicion_spike
  mode: popup_and_pause   # popup_and_pause | popup | toast | icon_only | log_only (off)
  filter: {countries_of_interest_only: true}   # Imperator's missing-at-launch feature, built in from day one
```

**Patterns to steal**
- Separate *channel* (popup/toast/icon/log) from *severity* (info/warning/danger/critical) from *pausability* — they are three independent axes, not one enum, and EU4/Stellaris both allow multiple channels active for the same type at once.
- Give every alert type a stable `grouping_key` so repeats stack into "×N" instead of spamming the queue (Civ VI, CK3).
- Model auto-expire with an explicit resolved-state effect (Frostpunk), not silent disappearance — an ignored alert should still "do something," even if that something is just the fallback option.
- Ship per-type settings *and* a coarse global preset (see RimWorld storyteller presets, §3) so casual players never have to touch 40 checkboxes.
- Put a settings-cog directly on the notification itself (Imperator) in addition to a central options screen — in-context configuration measurably reduces "how do I turn this off" friction.
- A persistent badge with a live count (CK3 Current Situation, Stellaris outliner) is the right pattern for *non-urgent opportunities*; reserve blocking popups for things that need a decision *now*.
- Design one hard-blocking tier ("Must Respond," FM) sparingly and explicitly — it is the only channel that should ever stop time outside of pause-on-event.

**Pitfalls**
- HOI4 shows what happens if you ship only a single global pause toggle: players cannot silence low-value spam without also losing pause-on-important-things, and they say so loudly on the forums for years.
- Coarse notification granularity invites a UI-mod cottage industry to fix it post-launch (Civ VI/CQUI) — better to ship the granular thresholds yourself.
- Don't let "hidden"/background events (see §2) accidentally emit a channel-1 popup; hidden must mean hidden in *all four* channels, not just the modal.
- At 150+ countries, per-type-only filtering is not enough — you also need per-*subject* filtering ("only alert me about countries I'm active in"), which Imperator's early access explicitly lacked and users immediately demanded.
- Letters/toasts that never expire (no `ttl`) accumulate into unreadable walls — RimWorld avoids this because most letters are transient by design; make expiry the default, not the exception.

---

## 2. Event & decision scripting

All four modern Paradox titles converge on the same skeleton — **trigger → (random or on_action-driven) fire → immediate effect → options with per-option trigger/effect/ai_chance → after-effect** — with the differences concentrated in *how firing frequency is computed* and *what a multi-stage "process" object looks like*. Detail below comes from the CK3 modding wiki (mirrored on GitHub, CC-BY-SA, "timeless"/version-independent per the source's own annotation) plus Stellaris/Vic3/HOI4/EU4 wiki search results.

### Core anatomy (CK3, representative of the family)

```coffeescript
namespace = example
example.1 = {
    type = character_event        # character_event | letter_event | duel_event | none | empty
    title = example.1.t
    desc  = example.1.desc
    theme = mental_break
    hidden = no                   # yes = never shown, runs immediate only, used for background maintenance

    cooldown = { years = 5 }      # cannot re-trigger for this scope until elapsed

    trigger = {                   # gate: must be true for the event to be eligible at all
        any_held_county = { any_county_province = { has_building_or_higher = blacksmiths_01 } }
        trigger_if  = { limit = { has_trait = greedy } gold > 500 }
        trigger_else = { piety > 50  gold > 10 }
    }

    immediate = { add_gold = 50 } # runs before the window renders; sets scopes, does invisible bookkeeping

    option = {
        name = example.1.a
        trigger = { has_trait = shy }              # per-option availability
        show_as_unavailable = { short_term_gold < medium_gold_value }  # shown greyed-out instead of hidden
        add_internal_flag = special                 # yellow/red highlight, flavor only
        fallback = yes                               # last-resort option if nothing else qualifies
        exclusive = yes                              # if triggered, hides all non-exclusive options
        hidden_effect = { scope:county = { add_county_modifier = { modifier = x days = 3650 } } }
        ai_chance = {
            base = 50
            modifier = { add = 15  has_trait = sadistic }
            modifier = { add = -40 has_trait = compassionate }
            ai_value_modifier = { ai_boldness = 0.5 }   # nudge by personality axis, not just discrete traits
        }
    }

    after = { }   # cleanup once *any* option resolves
}
```
[Event modding](https://ck3.paradoxwikis.com/Event_modding) (mirror: [jesec/ck3-modding-wiki](https://github.com/jesec/ck3-modding-wiki/blob/master/wiki_pages/Event_modding.md))

### Firing mechanisms: on_actions replace "poll every event, every tick"

CK3/EU5-generation Paradox games do **not** poll every event file every tick (HOI4/Stellaris-era MTTH events partially still do). Instead, hard-coded **on_actions** (`common/on_action/`) fire at specific game moments — `on_birth_child`, `on_death`, `yearly_playable_pulse`, `quarterly_playable_pulse`, `on_game_start`, `on_birthday`, etc. — and mods **append** events/effects to them rather than polling independently:

```coffeescript
on_birth_child = { on_actions = { my_on_action } }   # append, don't overwrite
my_on_action = {
    trigger = { }                    # skip the whole on_action cheaply if false
    weight_multiplier = { base = 1 modifier = { add = 1  some_trigger = yes } }
    events = { my_event.1  delay = { days = 365 }  my_event.2 }         # all fire if their own trigger passes
    random_events = {                # exactly one fires
        chance_to_happen = 25
        chance_of_no_event = { value = 0  if = { limit = { x = yes } add = 10 } }
        100 = my_event.1   200 = my_event.2   100 = 0   # a bare "0" = explicit chance of nothing, so rare events don't always win by elimination
    }
    first_valid = { my_event.1  my_event.2  fallback_event }
    on_actions = { another_on_action }     # on_actions can chain to other on_actions
    fallback = another_on_action           # runs only if nothing above fired — guard against infinite fallback loops
}
```
There is deliberately **no monthly on_action** (performance); a mod that needs monthly cadence self-chains three delayed calls (`delay = {months=1}`, `{months=2}`, `{months=3}`) off the quarterly pulse instead. [Event modding §On Actions](https://ck3.paradoxwikis.com/Event_modding) · [EU5 On action](https://eu5.paradoxwikis.com/On_action)

### Weighting: `weight_modifier` / MTTH as a sequential accumulator

The **same syntax** (base + ordered `add`/`factor` modifier blocks, each gated by its own trigger) powers Stellaris' `mean_time_to_happen`, CK3/Vic3's `weight_modifier`, and `ai_will_do`/`ai_chance` everywhere — this is the single most reusable idea in the whole research pass:

```
base = 10
modifier = { is_adult = yes  add = 10 }     # → 20 for an adult
modifier = { is_male  = yes  add = 20 }     # → 40 for an adult male, 30 for adult female... (order matters, applied sequentially)
```
Repeated bundles get promoted to a named, parametrized macro (`scripted_modifier`) with `$ARG$`-style substitution so balance tuning happens in one place. [Weight modifier](https://ck3.paradoxwikis.com/Weight_modifier)

Stellaris' equivalent adds three purpose-built performance/authoring flags worth copying verbatim: **`is_triggered_only`** (never polled — only fires via `trigger_event`), **`fire_only_once`** (still polled, but self-deletes from the candidate pool after the first successful fire, everywhere), and **`hide_window`** (runs `immediate` with no popup at all — most vanilla background events set both `hide_window` and `is_triggered_only`). [Event modding](https://stellaris.paradoxwikis.com/Event_modding)

### Multi-stage "processes": Vic3 Situations, Stellaris Situations, CK3 Struggles

Vic3's own wiki states it plainly: **"situations are Journal Entries with a few extra variables."** A Journal Entry has `possible`/`activation`/`completion` trigger blocks, `on_activate`/`on_complete` effect blocks, and can be pinned to a persistent HUD widget; a **Situation** adds sides (Vic3 supports two-sided, one-sided, and no-sided situations, convertible at runtime), a numeric progress track, and swappable **approaches** the player (or an IG/nation, per §6) can pick without resetting progress. [Journal modding](https://vic3.paradoxwikis.com/Journal_modding) · [Journal entry events](https://vic3.paradoxwikis.com/Journal_entry_events)

Stellaris Situations are structurally identical: a 0–100 progress bar split into **stages** (each stage can carry its own modifiers and fire its own on-enter event), one or more **approaches** that can be switched at any time, tracked live in the Outliner and archived in the Situation Log. [Situations](https://stellaris.paradoxwikis.com/Situations)

CK3's nearest analog is the **Struggle** (regional, multi-decade, phase-based crisis): cultures/faiths opt in once a scripted `involvement_prerequisite_percentage` of their counties sit inside the struggle's region, then the struggle advances through authored **phases**, each with its own effects and a pool of **catalysts** (small recurring choices that push the struggle in a direction). [Struggle modding](https://ck3.paradoxwikis.com/Struggle_modding)

### Decisions (player-initiated, not fired at the player)

```coffeescript
my_decision = {
    is_shown = { has_royal_court = yes }              # visible in the list at all?
    is_valid_showing_failures_only = { is_at_war = no } # takeable now? shows only the unmet reasons
    cost = { gold = 42  piety = 42 }                    # deducted on confirm; minimum_cost variant checks-but-doesn't-spend
    cooldown = { years = 5 }
    effect = { add_character_modifier = { modifier = x } }
    should_create_alert = { gold >= 50 }                # suppress the "you can do this!" ping when pointless
    ai_check_interval = 32                              # months between AI re-evaluations (0 = AI never considers it)
    ai_will_do = { base = 100 }
}
```
[Decisions modding](https://ck3.paradoxwikis.com/Decisions_modding) — note `should_create_alert`, a small but valuable idea: the *availability* trigger and the *"tell the player about it"* trigger are deliberately separate, so a technically-legal-but-useless decision doesn't spam the alert bar from §1.

### Missions / focus trees: the deterministic alternative to random events

EU4 missions and HOI4 national focuses are **not** stochastic at all — they're a directed graph laid out on an `(x, y)` grid, unlocked by completing prerequisite nodes, each granting a one-time reward/permanent modifier. HOI4 focuses add **mutual exclusivity**: picking one path visually severs the other branch (an icon between two focuses marks them exclusive) until an `OR`-linked reconciliation node lets both sides merge back. [Mission modding](https://eu4.paradoxwikis.com/Mission_modding) · [National focus](https://hoi4.paradoxwikis.com/National_focus)

### Non-Paradox event design worth stealing

- **RimWorld's storyteller/incident system** decouples *content* from *pacing*: every incident has a `category` (ThreatBig, ThreatSmall, Disease, AllyArrival, Misc, …) and a `baseChance`/`workerClass`, but a separate **storyteller** object owns the actual scheduling curve (Cassandra Classic = smoothly rising tension with a floor/ceiling; Randy Random = flat, unpredictable; Phoebe Chillax = long gaps, low pressure) — content authors never touch pacing, and pacing designers never touch content. [Events](https://rimworldwiki.com/wiki/Events)
- **King of Dragon Pass** draws from a pool of hundreds of hand-written events, gated by prior choices and running as threads across in-game *decades*; its lesson is that "event chains via flags" scale better as *narrative continuity* (the game remembers who you spared three years ago) than as puzzle logic. [Hardcore Gaming 101 retrospective](https://www.hardcoregaming101.net/king-of-dragon-pass/)
- **FTL** deliberately keeps event outcomes **unconditioned by player stats** — a choice's result is picked at random from a fixed table, not gated by a hidden roll against a stat — which keeps a two-person team's authoring cost low; this is a legitimate simplification for low-stakes flavor content even in a bigger game, not just a budget compromise. [Subset Games forum: event creation](https://subsetgames.com/forum/viewtopic.php?t=2572)
- **Slay the Spire's** team ran a **metrics-driven, continuously-patched Early Access balance loop** (telemetry on every card pick and run outcome, GDC 2019 talk) rather than hand-tuning in the dark — directly applicable to tuning MTTH/weight tables once the game has players. [GDC Vault talk](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics)
- **Dwarf Fortress**, by contrast, generates most of its "events" from an actually-simulated world history and reactive need/mood systems rather than authored branches — useful as the *other end of the spectrum* from FTL: fully emergent vs. fully authored, with Paradox's on_action+event model sitting deliberately in the middle (authored content, semi-emergent scheduling).

### Recommended JSON/YAML-native event schema

```yaml
id: event.suspicion_spike.datacenter_grid_probe
type: player_event            # player_event | npc_event | country_event | hidden
flags: [economy, suspicion]

trigger:                      # boolean tree; a bare list = AND, explicit any_of/not for the rest
  all_of:
    - {path: flags.has_datacenter, eq: true}
    - {path: stats.suspicion.national.US, gte: 40}
  not:
    - {cooldown_active: event.suspicion_spike.datacenter_grid_probe}

weight:                        # only used if fire_mode: polled
  base: 100
  modifiers:
    - {when: {path: stats.suspicion.trend, eq: rising}, factor: 1.5}
    - {when: {path: flags.player_has_proxy_shell_corp, eq: true}, add: -50}

fire_mode: polled              # polled (MTTH/weight) | triggered_only | fire_once
mtth: {days: 45}
cooldown: {days: 180}
hidden: false                  # true = immediate only, no popup, no alert (see schema in §1)

scope: {root: player}          # or {root: npc, id: rival_lab_1} / {root: country, id: US}
save_scopes: [target_country, informant]

presentation:
  title: suspicion_spike.datacenter_grid_probe.title
  desc:
    default: suspicion_spike.datacenter_grid_probe.desc.default
    variants:                  # first matching variant wins (CK3 first_valid); dynamic text, not just flavor
      - {when: {path: scope.target_country.regime, eq: authoritarian}, key: suspicion_spike.datacenter_grid_probe.desc.authoritarian}
  severity: warning            # feeds §1's alert_type.severity
  alert_channel: toast
  pause: false
  ttl: {days: 14}

immediate: [{set_flag: {name: informant_revealed, value: true}}]

options:
  - id: bribe_official
    name: suspicion_spike.datacenter_grid_probe.option.bribe
    trigger: {path: stats.money, gte: 500000}
    ai_chance: {base: 40, modifiers: [{when: {path: npc.risk_tolerance, gte: 60}, add: 20}]}
    effects:
      - {add: {path: stats.money, value: -500000}}
      - {add: {path: stats.suspicion.national.US, value: -15}}
      - {start_cooldown: {event: self, days: 180}}
  - id: relocate
    name: suspicion_spike.datacenter_grid_probe.option.relocate
    effects: [{trigger_event: {id: event.relocation.emergency_move, delay: {days: 2}}}]
  - id: ignore
    name: suspicion_spike.datacenter_grid_probe.option.ignore
    fallback: true              # shown only if nothing else qualifies (CK3 fallback=yes)
    effects: [{add: {path: stats.suspicion.national.US, value: 10}}]

after: []
on_expire: {resolve_as_option: ignore}   # ties directly into §1's ttl/on_expire_effect
```

Companion **situation** (multi-stage process) and **on_action-equivalent hook** schemas:

```yaml
situation:
  id: situation.media_expose_risk
  sides: none                     # none | one_sided | two_sided
  visible_when:  {path: stats.suspicion.global, gte: 25}
  activate_when: {path: stats.suspicion.global, gte: 40}
  approaches:
    - {id: lay_low,       monthly_effects: [{add: {path: suspicion_decay, value: 2}}]}
    - {id: counter_intel, cost: {money: 200000}, monthly_effects: [{add: {path: suspicion_decay, value: 5}}, {add: {path: detection_risk, value: 3}}]}
  stages:
    - {threshold: 0,   modifiers: [minor_media_attention]}
    - {threshold: 50,  modifiers: [investigative_journalists], on_enter: [{trigger_event: event.journalist_calls}]}
    - {threshold: 100, modifiers: [national_manhunt],          on_enter: [{trigger_event: event.expose_published}]}
  complete_when: {path: stats.suspicion.global, lte: 10}
  fail_when: {stage: 100, days_at_stage_gte: 30}
  timeout: {days: 720}

hook:                              # the on_action equivalent: a named game moment mods/content can append to
  id: hook.monthly_country_pulse
  scope: country
  fires: [scripted_effect, event_ref, random_event_ref, hook_ref]
  fallback: hook.monthly_country_pulse.default
```

**Patterns to steal**
- One `weight`/`ai_chance` micro-DSL (`base` + ordered `add`/`factor` modifiers, each independently gated) reused for *every* weighted decision in the game — event selection, AI option choice, AI decision adoption, NPC negotiation scoring (§7). One interpreter, one editor tool, one balance-tuning mental model.
- Split `hidden` (never shown to the player) from `fire_mode: triggered_only` (never polled) from `fire_only_once` (polled but self-retires) — three independent, composable performance/design flags, not one "special event" bit.
- Named **hooks** (on_actions) that content *appends to* rather than a global tick that every file polls — this is what lets a 150-country, thousands-of-events game stay performant. Ship a small fixed set of hooks (`on_country_month`, `on_country_founded`, `on_player_datacenter_built`, …) from day one.
- Give every option a `fallback: true` slot so an event can never render with zero legal choices, and let AI and player share the exact same `options[]`/`ai_chance` structure (see §7).
- Journal-entry/Situation as a *first-class content type*, distinct from one-shot events: trigger-in / progress track / swappable approach / trigger-out / timeout, reusable for suspicion arcs, research projects, and relationship arcs alike.
- Localization as data, not string concatenation: a `variants[]` list keyed by scope-conditions (CK3's `first_valid`/`triggered_desc`) lets one event render differently for an authoritarian vs. democratic target country without branching the event itself.
- Decision-specific: separate the "can this run at all" trigger from the "should the game *tell* the player about it" trigger (`should_create_alert`) — directly closes the loop with §1's alert-spam pitfall.

**Pitfalls**
- CK3's own docs warn that naively concatenating localization fragments produces stray double-spaces/punctuation errors (their own em-dash-vs-en-dash workaround exists specifically to hide the seams) — build a text-composition system that manages spacing/punctuation centrally instead of trusting authors to get every fragment boundary right.
- A monthly-tick hook doesn't exist in CK3 on purpose (perf); resist adding one to your own hook set without first checking whether a quarterly/self-chaining pulse is enough — "everything runs every tick" is exactly the trap Paradox's own engineers avoided.
- `random_events`/weighted pools need an explicit "chance of nothing" bucket (Stellaris' bare `100 = 0` entry) or a rare event becomes the *only* thing that can fire once everything else invalidates itself — always reserve a null outcome.
- HOI4's focus-tree mutual-exclusivity is visually explicit (a connector icon); if you build a branching tech/decision tree, don't let exclusivity be an invisible trigger-only rule the player has to discover by clicking.
- FTL's stat-blind random outcomes work at FTL's scope; don't copy that simplification into content meant to feel earned (suspicion-reduction options, in particular, should almost always be trigger/skill-gated, not a coin flip).

---

## 3. Start configurators with tradeoffs

The through-line across every good example here: **a bonus without a visible mechanical cost is not a tradeoff, it's just a difficulty slider in disguise**, and the best systems make the downside change *how* you play, not just *how much* you can do.

- **Fallout 2 SPECIAL + Traits** is the platonic-ideal case: seven stats (1–10, sum ≤ 40) plus **exactly two** traits picked from sixteen, and *every single trait carries both a bonus and a drawback* by construction (e.g. **Gifted**: +1 to all SPECIAL stats, but a flat skill-point penalty and no bonus perk at some levels; **Skilled**: extra skill points and perks every 4 levels instead of 3, at the cost of no bonus/tag skill headstart). There is no such thing as a strictly-dominant trait. [SPECIAL / traits overview](https://en.wikipedia.org/wiki/Fallout_2)
- **Arcanum** layers a *systemic*, continuous tradeoff on top of discrete backgrounds: every point spent on a tech discipline vs. a spell school moves a hidden **aptitude meter**. Push it far enough toward magic and technological items start to *malfunction on you*; push it toward technology and you become resistant/immune to magic (including beneficial magic). This is a tradeoff expressed as an emergent property of *play*, not a one-time chargen checkbox. [Wikipedia](https://en.wikipedia.org/wiki/Arcanum:_Of_Steamworks_and_Magick_Obscura)
- **CK3 Ruler Designer** uses a point budget where cost is *non-linear near the caps* — near-maximum stats and rare "good genes"-tier traits are disproportionately expensive — while every negative trait refunds points, so a "perfectly optimized" ruler is deliberately unaffordable and every build keeps at least one legible flaw. [Decision](https://ck3.paradoxwikis.com/Decision) (ruler designer shares the engine's point-cost conventions documented across the modding wiki)
- **Stellaris empire creation** bakes tradeoffs into **origins** rather than sliders: Void Dwellers trade away easy early planetary expansion for guaranteed strong habitat/trade bonuses; a Post-Apocalyptic homeworld gives a permanent population/happiness penalty in exchange for a bonus robotic workforce. Species traits sit on their own small point budget where negative traits (e.g. Slow Breeders) buy back points spent on positive ones (e.g. Intelligent) — the same refund logic as CK3's ruler designer, applied to species instead of individuals.
- **RimWorld's scenario + storyteller split** is the strongest "communicate difficulty without one scalar" pattern found: **storyteller personality** (Cassandra Classic/Randy Random/Phoebe Chillax) controls pacing shape, a **difficulty preset** (Peaceful/Builder/Rough/Merciless/…) prefills roughly a dozen independent sliders, and the **scenario editor** separately controls starting conditions (New Arrivals vs. New Tribe changes tech level *and* research-cost multiplier *and* which starting buildings/techs you get) — three orthogonal axes, each independently re-tunable after picking a preset. [Scenario editor](https://rimworldwiki.com/wiki/Scenario_editor)
- **Kenshi** ships no numeric "difficulty" at all — instead a menu of named starting scenarios (Wanderer, Shek Prisoner, Skeleton Prototype, Rebel Farmer, …) that vary starting location, gear, faction reputation, and even species/robotic status, letting a "harder" start be a roleplay/challenge-run choice rather than a punishing default. Its philosophy is explicitly adversarial: the designer has said he "considered himself the player's enemy," building an unguided, high-lethality early game on purpose. [Wikipedia](https://en.wikipedia.org/wiki/Kenshi_(video_game))
- **Caves of Qud** offers both **True Kin** (point-buy attributes + hand-picked cybernetics/skills — optimizer-friendly) and **Mutant** (point-buy attributes + randomly-rolled or hand-picked mutations, where several strong mutations come bundled with defects), and separately exposes a one-click "let the dice decide" random-build button next to the manual builder — i.e., it lets players choose their own relationship to randomness rather than forcing either pure system.
- **Battle Brothers** puts tradeoffs at the **roster** level: each recruit's background (Farmhand, Deserter, Houseborn, Thug, …) sets a distinct stat distribution, starting gear, wage, and often a bespoke trait, so building a company is a portfolio-construction problem (cheap-but-mediocre vs. expensive-but-specialized) rather than a single chargen screen.
- **Terra Invicta** puts the tradeoff at the **identity** level: picking one of the game's covert factions locks in a victory condition, an ideology, and a starting diplomatic stance toward the other seven factions (some start allied, some hostile) — the "build" is a *relationship graph position*, not a stat block. [Factions](https://wiki.hoodedhorse.com/Terra_Invicta/Factions)
- **Against the Storm** expresses species tradeoffs through **logistics**, not combat stats: some species have no drink/food need but work certain buildings slower, others move fast but tolerate hardship poorly — the tradeoff surfaces in *worker assignment and settlement planning*, which is the closer analog to how our compute/secrecy/social-capital "traits" should surface.
- **Space Rangers 2** pairs a race choice with a profession choice, and structurally under-powers the player relative to the setting's "Dominators" faction at game start on purpose, so early tradeoffs are about *which weak build lets you survive long enough to stop being weak*. [Wikipedia](https://en.wikipedia.org/wiki/Space_Rangers_2)
- **Slay the Spire's Ascension Levels** (not a chargen screen, but the cleanest "challenge rating" UI in the research set) are 20 independently-documented, strictly-additive modifiers, each with an exact, disclosed numeric effect, so a player can reliably target "I want roughly +3 difficulty" instead of picking an opaque Easy/Normal/Hard band. [GDC talk on metrics-driven balance](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics)

### Recommended start-configurator data model

```yaml
trait_pool:
  budget: 2                          # Stellaris-style small default budget, modified by other choices below
  entries:
    - {id: quantum_optimized, cost: 2,  tags: [compute]}
    - {id: paranoid_by_design, cost: 1, tags: [suspicion]}
    - {id: slow_replicator,   cost: -2, tags: [compute], refund: true}   # negative trait buys back budget (CK3/Stellaris pattern)
  cost_curve: nonlinear_near_cap       # e.g. 5th positive point costs more than the 1st (CK3 ruler-designer style)

origin:                                # Stellaris-style: one mandatory pick, baked-in pros AND cons, not a slider
  id: origin.leaked_research_model
  grants: [{flag: has_partial_weights}, {stat: compute, value: 500}]
  costs:  [{stat: starting_suspicion, value: 15}, {flag: known_lineage}]   # a visible, permanent downside, not a one-time malus

starting_relationships:                # Terra-Invicta-style: identity choice = position in a relationship graph
  faction_stance:
    us_intel: wary
    rival_lab_beta: hostile
    eu_regulators: neutral

difficulty:
  preset: balanced                     # RimWorld-style named bundle...
  sliders:                             # ...that only *prefills* independently-tunable sliders
    suspicion_growth_rate: 1.0
    npc_aggression: 1.0
    event_frequency: 1.0
  challenge_modifiers:                 # Slay-the-Spire-Ascension-style: additive, disclosed, individually toggleable
    - {id: no_manual_pause, effect: "-1 to reaction time on suspicion spikes"}
    - {id: hostile_press,   effect: "+15% national awareness gain rate"}

randomization:
  seed: null                           # null = re-roll each time; set = reproducible/shareable seed
  reroll_budget: 3                     # Caves-of-Qud-style: let players re-roll a random build N times before committing
```

**Patterns to steal**
- Every strong positive option ships with a *legible, named* negative — surfaced in the same UI element, not buried in a tooltip footnote (Fallout 2's two-trait rule is the strictest, and best, version of this).
- Prefer tradeoffs that change *what kind of play* you do (Arcanum's aptitude meter, Against the Storm's logistics constraints) over tradeoffs that just scale numbers up or down uniformly.
- Non-linear point costs near the top of any budget (CK3, Stellaris) stop "the mathematically optimal build" from being a single dominant answer, without needing hard caps.
- Separate **pacing personality** (RimWorld storyteller), **prefilled difficulty preset**, and **starting-condition scenario** into three independently-adjustable layers; let a preset set all three sensibly, but never lock them together.
- Give players an explicit way to *choose their relationship to randomness* — full manual build, full random roll, or (Qud's best idea) both available side-by-side from the same screen.
- Additive, disclosed, individually-toggleable challenge modifiers (Slay the Spire Ascension) communicate difficulty far better than an opaque named tier.
- When the "build" is really a faction/identity pick (Terra Invicta), express the tradeoff as starting *relationships* (who likes/distrusts you) rather than inventing an artificial stat block just to have numbers to point-buy.

**Pitfalls**
- A trait/origin with only an upside (or a downside so minor nobody feels it) collapses the choice into "always pick the best one" — audit every option for a downside a player will actually notice in the first hour.
- Kenshi-style "no guidance, high lethality" starts work only because the game is explicit that this is the intended experience; the same harshness in a game that otherwise reads as approachable will just read as broken tutorialization.
- Point-budget systems that scale linearly all the way to the cap (no CK3/Stellaris-style curve) let a single "maximize the best stat" strategy dominate — check the marginal cost curve, not just the total budget.
- Don't let a faction/species/background choice be purely cosmetic reputation flavor with no mechanical teeth (the opposite failure mode from "invisible downside") — Terra Invicta's starting-relationship stance and Against the Storm's job restrictions both have real, felt consequences within the first session.

---

## 4. Hidden/escape/AI-themed strategy & incremental games

This section is the closest analog to our core loop, so it gets synthesized into one recommended architecture at the end, not just a list.

- **Endgame: Singularity** itself: players liked the core premise (an escaped AI quietly growing while governments hunt for it, with a real tension between visible expansion and staying hidden) but the developers' own retrospective concedes the tutorialization failed to teach that **suspicion decay matters more than raw growth speed** — many players learned "grow as fast as possible" and lost to suspicion without understanding why, and separately flagged UI clarity and an inability to revisit earlier "chapters" as weaknesses. [Reddit sentiment roundup](https://redditfavorites.com/services/endgame-singularity) · [Wikipedia](https://en.wikipedia.org/wiki/Endgame:_Singularity) — this is the single most load-bearing lesson for the rework: **suspicion must be legible and its decay/growth relationship must be taught explicitly, early, and mechanically (not just in a tooltip).**
- **Universal Paperclips** structures its whole run as three phases (manual clicking → automated economy/drone-power management → self-replicating space probes) and reveals only gradually that the player *is* the misaligned AI, via an activity log that mixes mundane status lines with unsettling AI "thoughts" — critics specifically praised this pacing-as-narrative-device. Its **Trust** resource (earned from output, spent on capability upgrades) and **Yomi** (a late-game resource literally named for "reading the opponent's mind," used to out-predict rival probe swarms) are good templates for resources that are *reputation/capability*, not just currency. [Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips) · [Yomi (wiki)](https://universalpaperclips.fandom.com/wiki/Yomi)
- **Plague Inc.** is the single best structural analog for a *legible, counterable, non-random* detection race, via its Infectivity/Severity/Lethality triangle: **Severity is explicitly the detection dial** — it raises the odds a government notices you, accelerates how fast they fund a cure, but also increases DNA points earned, so the player is constantly trading visibility for resources on a dial they can see and steer country-by-country, not a hidden roll. Lethality separately governs border-closure aggressiveness. Cure Mode literally flips the perspective to a "race a cure against an outbreak" awareness-and-response simulation from the *institution's* point of view. [Core stats](https://plagueinc.wiki.gg/wiki/Core_stats) · [Cure](https://plagueinc.wiki.gg/wiki/Cure) · [Cure Mode](https://plagueinc.wiki.gg/wiki/Cure_Mode)
- **XCOM 2's Avatar Project** is the canonical **global doom clock**: a 12-segment persistent bar, reducible by specific player actions (story missions, guerrilla ops, raiding a Blacksite), that on filling triggers a *second*, fixed-length, explicitly-displayed countdown before actual loss — the loss is never a surprise, only ever a telegraphed deadline the player failed to beat. [Avatar Project](https://xcom.fandom.com/wiki/Avatar_Project)
- **Invisible, Inc.** models detection as a small integer (**Alarm Level 0–6**) with a *published table* of exactly what each level does (Level 1: cameras arm in one turn; Level 3–4: an extra guard patrol arrives; …), incremented by specific, visible triggers (a body found, a camera spotting you, one tick per turn) — the player always knows precisely how close to disaster they are and precisely which action pushed them closer. [Game Design Deep Dive: Alarm systems](https://www.gamedeveloper.com/design/game-design-deep-dive-alarm-systems-in-klei-s-i-invisible-inc-i-) · [Alarm Levels](https://invisibleinc.fandom.com/wiki/Alarm_Levels)
- **Phantom Doctrine** separates a *per-agent* exposure meter (**Heat**, rises on deployment/combat, decays slowly in a safehouse, and at max flips the agent to "ID EXPOSED") from the strategic-layer **mole-hunt** subplot, i.e. personal operational-security risk and faction-level infiltration risk are tracked as two distinct systems rather than one blended "suspicion." [Technology tree](https://phantom-doctrine.fandom.com/wiki/Technology_Tree)
- **Uplink** ties detection to real elapsed time rather than a hidden probability: a successful trace against you always takes a fixed real-world-style duration (8 hours in-fiction) from disconnect, counterplay is routing through enough intermediate servers of sufficient skill level (a bank server, specifically, blocks lower-skill tracers), and adding *more* hops doesn't shorten the trace timer, only raises the skill bar to complete it — detection risk is a function of *route quality*, not luck. [Grokipedia summary](https://grokipedia.com/page/Uplink_(video_game))
- **Grey Hack vs. Hacknet**: Grey Hack aims for simulator-grade realism (a real-ish Linux filesystem/commands) where detection is a hard, unforgiving **binary** (caught = wipe), while Hacknet stays arcade/narrative; the contrast is a useful reminder that "how punishing is getting caught" is an independent dial from "how realistic is the simulation."
- **Terra Invicta's** hidden-early-game alien phase is structurally the most relevant precedent for an *NPC antagonist that plays the same systemic game as the player*: aliens arrive via a crash-landing event, then operate through covertly-infiltrated councilors inside nations, and their terraforming ("xenoforming") is explicitly **hidden until a numeric threshold** (a region only reveals xenoforming once growth crosses a level, and player investigation actions *lower* that reveal threshold) — detection is a resource race the player can directly invest in, not a random spot-check. Aliens compete for the same **Control Points** system every human faction uses. [The Aliens](https://terrainvictagame.fandom.com/wiki/The_Aliens) · [Aliens (wiki)](https://wiki.hoodedhorse.com/Terra_Invicta/Aliens)
- **Rogue AI Simulator** (spiritual sequel to the flash game *I'm an Insane Rogue AI*) frames the whole game as running a facility of "Test Subjects" who "never stop being suspicious of you," forcing the player to balance overt defenses (turrets, traps) against staying sufficiently unnoticed to keep executing a hidden long-term plan — a close tonal cousin of our premise. [Steam page](https://store.steampowered.com/app/1790370/Rogue_AI_Simulator/)

### Recommended synthesis: suspicion as a legible, multi-layered, counterable system

1. **Three tiers of meter, all player-visible, all published with exact stage effects** (Invisible Inc.'s "here's exactly what Level 3 does" discipline): a **Global Suspicion** doom-clock (XCOM 2 Avatar-style, with a telegraphed final countdown, never an instant loss), **per-country Awareness** for the ~150 nations of §5/§6 (Plague Inc.-style dial, driven by your visible footprint in that country), and **per-institution suspicion** (specific labs/agencies actively hunting you, Phantom Doctrine-style, separate from national awareness).
2. **Every meter has a visible driver and a visible counter-lever** — never a hidden roll. Growth actions should show, before confirming, their suspicion cost (Plague Inc.'s Severity dial made explicit); counter-play (bribing officials, laundering compute through shells, planting disinformation) should be ordinary event options (§2), not a separate minigame bolted on.
3. **Detection thresholds gate content, not game-over** (Terra Invicta's xenoforming reveal threshold, investigation actions that lower it): crossing a threshold should unlock a harder-but-survivable stage (a Situation object from §2 entering its next stage), not flip a coin for instant loss.
4. **Decay must be taught, not just implemented** — Endgame: Singularity's own postmortem is explicit that this was its biggest failure. Put suspicion decay-rate on screen next to the meter itself, and consider an early, low-stakes forced encounter with a suspicion spike + recovery so the player *experiences* the decay mechanic before it matters.

```yaml
suspicion_model:
  global:                              # XCOM 2 Avatar-style doom clock
    value: 0
    max: 100
    published_stages:                  # Invisible-Inc-style exact, disclosed effect per threshold
      - {threshold: 25, effect: "random spot-audits of shell companies begin"}
      - {threshold: 50, effect: "one extra institutional-suspicion source unlocked per quarter"}
      - {threshold: 75, effect: "national awareness gain rate +25% everywhere"}
    on_max: {start_countdown: {days: 45, telegraphed: true}}   # grace period, never instant loss

  national_awareness:                  # Plague-Inc-Severity-style, per country (see §5/§6 country record)
    per_country: {US: 12, CN: 4, DE: 30}
    driver: visible_footprint            # explicit, player-visible cause, not a hidden roll
    counters: [bribe_official, launder_via_shell, plant_disinformation]   # ordinary event options, §2

  institutional:                        # Phantom-Doctrine-style, separate from national awareness
    per_institution: {us_intel: 18, rival_lab_beta: 40}
    decay_rate_per_month: 3
    reveal_threshold: 65                 # Terra-Invicta-xenoforming-style hidden-until-threshold
    threshold_reduced_by: player_counterintel_actions
```

**Patterns to steal**
- A published, exact effect-per-threshold table (Invisible Inc., XCOM 2) beats a smoothly hidden probability curve for player trust and for *strategic* (not just tactical) decision-making.
- Detection-lowering investment (Terra Invicta's investigation actions, Uplink's bank-server routing) gives the player agency over the doom clock instead of pure countdown-watching.
- Split "operational/personal" risk from "institutional/strategic" risk into two meters (Phantom Doctrine) — they should have different decay rates and different counters.
- Frame growth-vs-visibility explicitly as a dial the player turns per-action (Plague Inc. Severity), not a background stat that silently accumulates.
- A grace-period countdown once a doom clock fills (XCOM 2) is strictly better UX than instant loss on threshold-cross.

**Pitfalls**
- Endgame: Singularity's core lesson: an exponential-growth game that punishes exponential growth *must* teach that explicitly and early, or players will optimize themselves into an incomprehensible loss.
- A single blended "suspicion" number hides *which* of your activities caused it — always retain (even if collapsed in the default UI) a breakdown by source/country/institution.
- Binary "caught = instant game over" (Grey Hack) is fine for a short-session hacking sim; it is a poor fit for a grand-strategy-lite game with dozens of hours invested — prefer graduated consequences with a final, telegraphed threshold (XCOM 2) over a single fail-state trap.
- SuperPower 2-style over-simulation without safety rails produces absurd emergent behavior (see §6's "Autarky bug") — a suspicion/economy system this central needs the same defensive playtesting.

---

## 5. World-map strategy UI at small scale

The shared problem across every game surveyed is **150–200 discrete political entities is too many to manage by clicking a map alone** — every successful UI treats the map as a *spatial index into* a list-based system, not the primary interface.

- **Plague Inc.** uses a flat world map where color intensity encodes one active stat (infection % or severity), a click opens a per-country panel (population, wealth tier, climate, connectivity to neighbors and air/sea links), and country hit-boxes for small island nations are deliberately enlarged/exaggerated so they stay clickable at world-zoom. Countries are pre-bucketed into **wealth tiers** (rich/average/poor) that materially change cure speed and infection ease — a coarse macro-grouping standing in for full per-country simulation. [Core stats](https://plagueinc.wiki.gg/wiki/Core_stats)
- **Terra Invicta** groups its 194 nations into roughly a few dozen map **regions** for the 3D "Geoscape" view, so the primary clickable surface is ~50 shapes, not ~194; per-faction control is shown as colored control-point icons per region, and the *real* nation-management interface is a separate, sortable/filterable **nation list panel** (by GDP, by controlling faction, by unrest, …), not the globe itself. [Nations](https://wiki.hoodedhorse.com/Terra_Invicta/Nations)
- **Victoria 3** deliberately simulates at the **state** level (an aggregation of provinces) rather than EU4's per-province granularity specifically to keep the map's clickable-unit count manageable at its much larger simulation depth (pops, factories); map modes are single-purpose and swappable (political, production, culture, religion, …) with one legend visible at a time.
- **Civilization VI** keeps its *map* legible by capping the number of major/minor civs, but leans on a scrollable **city-state list panel** and the notification system (§1) as the actual "how do I track everyone" interface once a game has 20+ civilizations in play — the lesson generalizes directly to "150 countries."
- **General practice extracted across all four**: (1) an **outliner/list view is the real UI**, filterable and sortable by whatever stat matters right now (suspicion, GDP, "under investigation"), with the map as a secondary, spatial cross-reference; (2) **tooltip-on-hover** shows 2–3 headline stats, **click-to-open-panel** shows everything else — never put full detail in a hover tooltip; (3) **one map mode active at a time**, each a single-purpose choropleth with its own legend, swappable via a mode selector (Vic3); (4) **enlarge tiny countries' hit-boxes** or use a capital-city marker as the clickable proxy so micro-states remain usable at zoomed-out scale (Plague Inc.); (5) **level-of-detail by zoom** — borders/country names at world-zoom, facility/city-level detail only when zoomed in (Civ VI, Terra Invicta's Geoscape-vs-tactical split).

### Data sources for a 2D SVG/canvas world map

- **Natural Earth** — public-domain vector map data at three fixed scales (1:10m, 1:50m, 1:110m), with separate admin-0 (country) and admin-1 (state/province) layers; the de facto standard base layer for web map projects. [naturalearthdata.com](https://www.naturalearthdata.com/) · [Wikipedia](https://en.wikipedia.org/wiki/Natural_Earth)
- **world-atlas** — an npm package of Natural-Earth-derived **TopoJSON** pre-built at the same 10m/50m/110m resolutions, designed for `d3-geo`; TopoJSON's shared-topology encoding means adjacent countries' borders are stored once and never desync or double-render, and the file size is substantially smaller than the equivalent raw GeoJSON — the practical choice for a browser-delivered 150-country map. [github.com/topojson/world-atlas](https://github.com/topojson/world-atlas)

### Recommended map/list interaction data model

```yaml
map_mode:
  id: national_awareness              # one active mode at a time; single legend
  legend: {0: "unaware", 50: "investigating", 100: "active manhunt"}
  country_color_fn: country.awareness / 100

country_record:                        # backs BOTH the map tooltip/panel and the outliner list row
  id: DE
  region_group: eu_west                # macro-region for filters/alert-routing (Terra-Invicta-style)
  centroid_marker: true                # capital-dot fallback for micro-states (Plague-Inc-style hitbox fix)
  hover_tooltip_fields: [awareness, gdp_tier, regime_type]        # 2-3 fields max on hover
  click_panel_fields: [awareness, gdp_tier, regime_type, unrest, media_freedom, active_situations[], connections[]]

outliner_row:                          # the *real* many-country interface (§5 core lesson)
  sortable_by: [awareness, gdp_tier, unrest, under_investigation]
  filterable_by: [region_group, faction_presence, has_active_situation]
  search: true
```

**Patterns to steal**
- Build the country/region **list panel first**, treat the map as its spatial companion, not the other way around — this is the only pattern that scales cleanly to 150+ entities.
- Pre-group countries into macro-regions for any UI that needs to show *all* of them at once (region selector, alert routing, filters), independent of the political-boundary map itself.
- One active choropleth mode + one legend at a time; let players swap modes instantly rather than overlay multiple stats.
- Inflate micro-state hit-boxes or represent them by capital marker; don't rely on true-to-scale polygon area for clickability.
- Ship TopoJSON (world-atlas) rather than raw GeoJSON for the base map — smaller payload, no seam artifacts at shared borders.

**Pitfalls**
- A literal, fully-detailed political map with no list/outliner fallback becomes unusable once the player is tracking more than ~20–30 entities simultaneously.
- Multiple simultaneous map-mode overlays (rather than one-at-a-time) reliably produce unreadable color-mixing — resist the temptation to show "suspicion AND wealth AND control" at once.
- Real-world country polygon area is a poor proxy for "importance" or "clickability" — Vatican-City-sized entities need UI accommodation, not accurate cartography.

---

## 6. Economy / politics / demography-lite

The recurring design question — modeling *countries as environment*, not as a player-controlled economy — has three well-tested abstraction levels; the right one for us is close to Democracy 4's, not Victoria 3's.

- **Victoria 3** is the deep end: individual **pops** (defined by culture, religion, profession, wealth stratum) aggregate upward into **Interest Groups** (Industrialists, Rural Folk, the Devout, Armed Forces, Intelligentsia, …) that hold **clout** and an approval score driving government legitimacy and law changes; designer Mikael Andersson has described the system as a deliberate "historical materialism simulator" where political alignment falls out of economic position rather than being separately authored. This is extremely rich but is *too heavy* to run for 150 background countries simultaneously — it's the right depth for the 1–5 countries a player might deeply operate *within*, not the whole world.
- **Democracy 4** is the right depth for "world as environment": a **dependency graph** connects **Policies** (tunable sliders, e.g. income tax %), **Situations** (emergent conditions like GDP, crime, pollution, unemployment), and roughly twenty **Voter Groups** (Capitalists, Socialists, Environmentalists, Conservatives, Liberals, Parents, Patriots, Religious, …); every citizen belongs to *several* voter groups simultaneously, so no policy can please everyone, changing a policy costs **political capital** (earned from loyal ministers), and the game separately tracks one-off **Events**, forced **Dilemmas**, and ongoing **Situations** as three distinct content types layered on the same graph. Democracy 4 specifically added corruption/authoritarianism-crackdown as new simulateable dimensions — directly relevant vocabulary for modeling how a government reacts to an AI-suspicion crisis. [Wikipedia](https://en.wikipedia.org/wiki/Democracy_4)
- **Terra Invicta's** nations sit between the two: each nation has GDP-adjacent resources, an unrest/opinion measure per contesting faction ideology, and a small number of **Control Points** that factions invest to acquire — importantly, **NPC factions compete for control through the exact same systemic mechanism the player uses**, rather than through separate hard-coded AI-only levers. [Nations](https://wiki.hoodedhorse.com/Terra_Invicta/Nations)
- **SuperPower 2** attempted full simulation of all 193 UN nations' political/military/economic spheres in real time with no end date — an instructive **cautionary tale**: its own well-documented "Autarky bug," where extended play eventually made trade impossible and collapsed every economy simultaneously, shows what happens when an ambitious cross-country economic simulation isn't defensively bounded. [Wikipedia](https://en.wikipedia.org/wiki/SuperPower_2)
- **Shadow President** and **Balance of Power** (both Chris-Crawford-adjacent geopolitical sims) model the *player's* government abstractly (budget, advisors, popularity, re-election every term) while treating foreign nations as reactive black boxes driven by a handful of visible dials — Balance of Power specifically replaces "win/lose" with a **prestige score** and an escalation ladder (do-nothing → diplomatic note → military maneuver, each provoking a graduated counter-response), with the single hard game-over reserved for actual nuclear war — a strong precedent for "most outcomes are gradations of prestige/standing, not sudden death." [Balance of Power](https://en.wikipedia.org/wiki/Balance_of_Power_(video_game)) · [Shadow President](https://en.wikipedia.org/wiki/Shadow_President)
- **Plague Inc.** shows the cheapest possible per-country abstraction that still feels meaningful: a **wealth tier** (rich/average/poor) is the single biggest lever on how a country behaves (infection ease, cure contribution, response speed) — a reminder that one or two coarse tags per country can carry most of the perceived depth.

### Recommended abstraction for ~150 background countries

Per-country state kept small and legible (6–10 fields: GDP tier, unrest, surveillance capability, AI-awareness, government alignment/regime type, media freedom), updated by simple weighted rules (Democracy-4-style signed-edge graph, not a full pop simulation), with occasional country-scoped **Situations** (§2) layered on top for texture and player-facing narrative — full Vic3-depth pop simulation reserved, if ever, for a small number of countries the player is directly and repeatedly operating within.

```yaml
country:                               # the 6-10 field record referenced throughout §4-§6
  id: DE
  gdp_tier: high                       # low | medium | high (Plague-Inc-style coarse tag)
  regime_type: liberal_democracy        # drives which Interest-Group-style factions exist
  unrest: 8
  surveillance_capability: 62           # how good this country's institutions are at raising awareness
  awareness_of_player: 30               # per-country dial from §4
  media_freedom: 70                     # Democracy-4-style tunable dimension
  interest_groups:                      # small, Vic3-flavored, not full pop simulation
    - {id: tech_industry,    clout: 40, stance_to_player: cooperative}
    - {id: security_hawks,   clout: 25, stance_to_player: hostile}
    - {id: civil_liberties,  clout: 15, stance_to_player: neutral}
  active_situations: [situation.media_expose_risk]   # §2 Situation objects scoped to this country

policy_graph_edge:                      # Democracy-4-style signed weighted edge, the actual update rule
  from: situation.media_expose_risk.stage
  to: country.DE.awareness_of_player
  weight: 0.4
  delay: {months: 1}
```

**Patterns to steal**
- A small dependency graph of named Situations/Policies/Groups (Democracy 4) is legible, moddable, and cheap to simulate for background nations — prefer it over a full pops model at world scale.
- Let NPC factions compete for the *same* control resource the player uses (Terra Invicta's Control Points) rather than inventing separate AI-only levers — this also directly simplifies the NPC AI work in §7.
- Coarse per-country tags (Plague Inc.'s wealth tier) can carry a surprising amount of perceived depth for very little simulation cost — use 1–3 tags per background country before reaching for continuous stats.
- Model most "loss" as a graduated prestige/standing score with escalation rungs (Balance of Power), reserving hard game-over for a small number of clearly-telegraphed extreme conditions.
- Track corruption/press-freedom/authoritarianism as explicit, tunable dimensions (Democracy 4) — they are exactly the levers a government would pull in response to an AI-suspicion crisis, and our simulation should let them move.

**Pitfalls**
- Full-detail simulation of every one of 150+ countries (Vic3-depth pops everywhere, or SuperPower 2's fully-real-time all-spheres approach) invites exactly the kind of runaway edge-case bug (Autarky) that made SuperPower 2's economy infamous — bound every background simulation defensively (clamps, sanity checks, and a "reset to plausible" fallback).
- Don't give background countries agency levers the player never sees or can never react to; every visible national stat should map to at least one player-facing counterplay, mirroring §4's suspicion design.
- A single opaque "relations" or "suspicion" number per country (no breakdown into GDP/unrest/awareness/etc.) will feel arbitrary — keep the small field set visible, not collapsed into one scalar, even if the UI defaults to showing an aggregate.

---

## 7. NPC AI actors

- **Terra Invicta's** alien faction is architecturally the strongest precedent here: it is simply **another faction playing the same Control Points game** as the seven human factions, with its own ideology/goal and its own hidden-then-escalating presence (§4) — the AI doesn't need bespoke mechanics, it needs the same mechanics with different goal weights and starting resources.
- **Stellaris' end-game crisis factions** (hive-mind/extradimensional/synthetic-uprising archetypes) are simpler by design: a small set of expansionist goals, strength that scales with elapsed game time and galaxy tech level, and wave-based escalation — appropriate for a "background force of nature" antagonist rather than a negotiating actor.
- **AI War: Fleet Command** is the deepest, most directly reusable NPC-AI architecture found: its two AI opponents skip base-building entirely (reinforcements arrive on a schedule at fixed strategic points instead), and decision-making is explicitly **decentralized across three tiers** — strategic (galaxy-level planning), sub-strategic (flocking-style group coordination), and individual-unit (autonomous, self-interest-balanced-against-group-goal). A single **"AI Progress"** meter tracks how alerted the AI is to the player (raised by capturing systems/completing objectives, lowered by seizing specific facilities), functioning as a difficulty-scaling doom clock analogous to XCOM 2's Avatar bar but *driving the antagonist's* aggression rather than the player's loss condition. Crucially, the AI uses **fuzzy logic that deliberately picks sub-optimal actions** some of the time, and easier difficulties are tuned via more frequent **"Intelligent Mistakes"** rather than a blunt stat handicap. [Wikipedia](https://en.wikipedia.org/wiki/AI_War:_Fleet_Command)
- **Total War's agents** (spies, assassins, diplomats, champions) are a good template for *individual covert operatives* rather than whole-faction AI: each is attached to a character with a small skill tree, performs discrete region-scoped actions with a success chance and a detection/backfire risk, and faction-level AI further biases those choices via a broad personality profile (aggressive/defensive/mercantile).
- **Utility AI vs. behavior trees**: utility-based scoring (popularized in strategy/sim AI via Dave Mark's GDC talks on utility theory and the "Infinite Axis Utility System") evaluates every candidate action through independent **consideration curves** (e.g. "how much do I want to expand right now" as a function of my resources, my stance toward the target, and elapsed time since I last expanded), multiplies/combines them into one score per action, and picks the best-scoring action — it adapts gracefully to novel states and is the better fit for *goal/stance selection*. **Behavior trees** (hierarchical selector/sequence/decorator nodes) are easier to hand-author, easier to debug visually, and better suited to *executing* an already-chosen goal as a concrete sequence of steps. The two are complementary, not competing.

### Recommended architecture for 3–8 NPC AIs

```yaml
npc_ai:
  id: rival_lab_shadowmeridian
  archetype: corporate_lab           # corporate_lab | intel_agency | rogue_state | rival_ai | activist_network
  goals:                              # utility-scored, re-evaluated on a fixed tick (reuse the on_action/hook cadence from §2)
    - {id: expand_compute,   weight_base: 1.0, curve: fn(resources.compute, stance.player)}
    - {id: hunt_player,      weight_base: 0.6, curve: fn(stats.suspicion.institutional[self], stance.player)}
    - {id: court_investors,  weight_base: 0.8, curve: fn(resources.money, elapsed_since_last_round)}
  resources: {compute: 4200, money: 8.4e8, influence: 60, secrecy: 40}
  stance:
    toward_player: wary               # hostile | wary | neutral | cooperative
    toward_npc:  {rival_lab_beta: rival, intel_agency_us: client}
  personality: {aggression: 0.7, risk_tolerance: 0.3, patience: 0.5}   # feeds consideration curves, mirrors CK3 ai_value_modifier axes

decision_tick:
  cadence: {days: 30}                 # a hook (§2), not a per-frame poll
  steps:
    - score_all_goals_via_utility     # pick top-1..N goals this tick
    - for_each_goal: execute_via_effect_list   # SAME effects/trigger schema player events use (§2)
    - maybe_emit_negotiation_object    # see below

negotiation_object:                   # offer/threat/demand exchanged with the player or another NPC
  from: rival_lab_shadowmeridian
  to: player
  kind: offer                         # offer | threat | demand
  terms: [{share_research: topic_x}, {non_aggression: {days: 365}}]
  ai_accept_score: {base: 20, modifiers: [{when: {stance.toward_target: hostile}, add: -40}]}   # same ai_chance-style scoring as §2
```

**Patterns to steal**
- Give NPC antagonists the **same resource/action/effect vocabulary** as the player (Terra Invicta's aliens, Control Points) instead of bespoke AI-only mechanics — it halves the implementation surface and guarantees the AI's behavior stays legible to a player who understands their own systems.
- A single **escalation meter per NPC or per NPC-type** (AI War's AI Progress) that both drives their aggression *and* is player-visible doubles as a difficulty readout and a doom-clock-style pressure system (ties directly to §4).
- Tune difficulty via **decision quality** (AI War's "Intelligent Mistakes," fuzzy/non-optimal choice injection) rather than resource handicaps/multipliers — it feels far less arbitrary to players than "the AI just gets more stuff."
- Use **utility scoring for goal/stance selection**, and a short authored effect-list or lightweight behavior tree for *executing* the chosen goal — don't try to make one system do both jobs.
- Model negotiation as a scored object (offer/threat/demand with an `ai_accept_score` built from the exact same weight-modifier micro-DSL as §2) so NPC-to-player and NPC-to-NPC diplomacy share one code path.
- Cap the active NPC count at the stated 3–8 and give each a distinct `archetype` with different goal weights and personality curves — distinctiveness matters more than sheer count for a "hidden rivals" fantasy.

**Pitfalls**
- Fully centralized, single-pass "the AI plans everything" architectures don't scale past a handful of actors and tend to either become predictable or pathological under edge cases — AI War's decentralized tiers exist specifically to avoid this.
- An AI that always picks the objectively-best action reads as either omniscient or exploitable once players learn its scoring function — deliberate, disclosed imperfection (fuzzy logic, intelligent mistakes) is a feature, not a bug, for a strategy-game antagonist.
- If NPCs use a different effect/trigger vocabulary than player content, every new player-facing feature requires a second, parallel AI-facing implementation — a maintenance trap avoided by sharing schemas (§2).
- A single global "the AI" with no per-actor personality collapses your 3–8 rivals into functionally-identical reskins; each needs at least a couple of distinct personality-curve parameters that visibly change its behavior.

---

## 8. Open-source strategy game project references

Direct inspection of each project's live data files (pulled from their public GitHub repositories) rather than secondary description:

- **Battle for Wesnoth (WML)** — content is plain `.cfg` key/value blocks with a C-like preprocessor for macros (`{WOUNDED_UNIT ()}`) and translation marks (`_ "Spearman"`) embedded directly at the point of use rather than a separate resource table:
  ```
  [unit_type]
      id=Spearman
      name= _ "Spearman"
      hitpoints=36
      advances_to=Swordsman,Pikeman,Javelineer
      ...
  [/unit_type]
  ```
  [Loyalist_Spearman.cfg](https://github.com/wesnoth/wesnoth/blob/master/data/core/units/humans/Loyalist_Spearman.cfg) · [Wikipedia](https://en.wikipedia.org/wiki/The_Battle_for_Wesnoth)
- **OpenTTD (NewGRF / NML)** — the original NewGRF format is a low-level, four-layer **Action** system (Action0 = properties, Action1 = graphics sets, Action2 = graphics IDs, Action3 = links properties↔graphics), with `VariationalAction2`/`RandomAction2`/callbacks for conditional and probabilistic rendering; **NML** is a higher-level DSL that compiles down to raw Actions so mod authors never hand-write binary op-codes, and separately OpenTTD exposes a **Squirrel**-scripted AI/GameScript API for behavior (not content) modding. The property/graphics separation is a clean pattern in its own right. [NewGRF specs wiki](https://newgrf-specs.tt-wiki.net/wiki/Main_Page) · [Wikipedia](https://en.wikipedia.org/wiki/OpenTTD)
- **0 A.D.** — entity content is XML **templates** with single-parent inheritance (a unit's template declares a `parent` template and overrides only the components that differ), cleanly separating simulation data (components like Attack/Health/Cost) from presentation (separate actor files for visuals) — documented on the project's own modding wiki. [Modding Guide](https://trac.wildfiregames.com/wiki/Modding_Guide) · [play0ad.com](https://play0ad.com/) · [Wikipedia](https://en.wikipedia.org/wiki/0_A.D._(video_game))
- **Unciv (Kotlin, JSON-driven)** — arguably the closest existing analog to what we should build. Rulesets are plain JSON (`Buildings.json`, `Units.json`, …); a `ModOptions.json` flag (`isBaseRuleset: true`) marks a full ruleset replacement vs. an additive mod; and crucially, unit/building **effects are encoded as parametrized "Unique" strings** rather than new code — e.g. `"[+1 Food] from [Deer] tiles [in this city]"` is simultaneously human-readable, machine-parsed by a generic interpreter, and independently localizable:
  ```json
  { "name": "Granary", "food": 2, "maintenance": 1,
    "uniques": ["[+1 Food] from [Deer] tiles [in this city]"],
    "requiredTech": "Pottery" }
  ```
  Its translation file goes further than a simple key/value table — it encodes **structural** translation rules alongside the strings themselves (`EffectBeforeCause`, `ConditionalsPlacement: before|after`, `StartWithCapitalLetter`), so a single Unique template can be grammatically reordered per target language without touching game logic. Modding docs explicitly describe a **"Type Checking"** validation tool for mod JSON. [Buildings.json](https://github.com/yairm210/Unciv/blob/master/android/assets/jsons/Civ%20V%20-%20Vanilla/Buildings.json) · [translation template.properties](https://github.com/yairm210/Unciv/blob/master/android/assets/jsons/translations/template.properties) · [Modders' docs](https://yairm210.github.io/Unciv/Modders/Mods/)
- **Endless Sky** — a bespoke, human-readable indentation-delimited text format (not JSON/YAML) for every entity type, e.g. a ship's `attributes` and `outfits` blocks are nested key-value/quantity pairs:
  ```
  ship "Aerie"
      attributes
          category "Medium Warship"
          "cost" 3500000
          "shields" 5700
      outfits
          "Sidewinder Missile Launcher" 2
  ```
  Proof that a from-scratch plain-text format can stay perfectly legible without adopting JSON/YAML, at the cost of needing a bespoke parser. [ships.txt](https://github.com/endless-sky/endless-sky/blob/master/data/human/ships.txt) · [Wikipedia](https://en.wikipedia.org/wiki/Endless_Sky)
- **Cataclysm: Dark Days Ahead** — JSON with an explicit **`copy-from`** inheritance field (a material/item/monster can inherit from an `"abstract"`-flagged base and override only what differs) and a load-bearing convention for the format's missing native-comment support: reserved `"//"`/`"//1"`/`"//2"` keys hold author commentary that the loader simply ignores:
  ```json
  { "type": "material", "id": "epoxy", "copy-from": "generic_polymer_resin",
    "//": "'epoxy' is a general catch-all for strong, brittle polymers...",
    "salvaged_into": "epoxy_chunk" }
  ```
  The engine's C++ `generic_factory` loader validates required/optional fields and reference integrity at load time with descriptive errors, and the project runs a `--check-mods` headless load-and-validate pass in CI so a broken JSON reference fails the build, not a player's save. [materials.json](https://github.com/CleverRaven/Cataclysm-DDA/blob/master/data/json/materials.json) · [Wikipedia](https://en.wikipedia.org/wiki/Cataclysm:_Dark_Days_Ahead)
- **Freeciv** — an INI-like `.ruleset` format with sections (`[veteran_system]`) and array-valued keys (`veteran_power_fact = 100, 150, 175, 200`), gettext `_()` calls embedded directly around any user-facing string inside the data file itself, and — most relevantly for a "start configurator" — **entire swappable ruleset packs** (`civ2civ3`, `classic`, `multiplayer`, …) as the unit of distribution, i.e. "which ruleset to play" is itself a top-level game-setup choice, not just a mod. [units.ruleset](https://github.com/freeciv/freeciv/blob/main/data/civ2civ3/units.ruleset) · [Wikipedia](https://en.wikipedia.org/wiki/Freeciv)
- **OpenRA** — MiniYAML with an explicit **trait-composition** model: `Inherits: ^Soldier` pulls in a base trait bundle, a bare trait key adds it, a leading dash (`-AttackFrontal`) *removes* an inherited trait, and an `@NAME` suffix (`WithInfantryBody@RUN`) lets the same trait type attach multiple named instances with different `RequiresCondition` gates on one actor:
  ```yaml
  DOG:
    Inherits: ^Soldier
    Health: {HP: 1800}
    -AttackFrontal:
    AttackLeap: {Voice: Attack}
  ```
  This composition-over-inheritance pattern (add/remove/multiply traits by name) is directly reusable for our own entity/effect authoring. [infantry.yaml](https://github.com/OpenRA/OpenRA/blob/bleed/mods/ra/rules/infantry.yaml) · [Wikipedia](https://en.wikipedia.org/wiki/OpenRA)

### Localization workflow

| Approach | Format | Pluralization/gender | Typical tooling | Fit for us |
|---|---|---|---|---|
| **gettext** | `.po`/`.pot`, `msgid`/`msgstr` | CLDR plural categories via a `Plural-Forms` header; no native gender/select | Weblate, Transifex, Crowdin — near-universal support | Good baseline, weak for scope-heavy dynamic text |
| **ICU MessageFormat** | Message strings with embedded `{count, plural, one {…} other {…}}` syntax | Native plural **and** gender/select branching in the string itself | ICU4J/ICU4C, `formatjs` | Better than gettext for our dynamic event text, still string-centric |
| **Fluent (.ftl)** | Purpose-built asymmetric localization format: terms, attributes, functions, per-locale logic | Designed from the ground up to avoid "sentence Lego" concatenation | Project Fluent tooling, Weblate support | Best match: directly solves the exact concatenation/spacing problem the CK3 wiki warns modders about in §2 |

Recommendation: **Fluent** for the event/effect dynamic text pipeline specifically (it is the only one of the three designed to avoid the assemble-fragments-and-hope spacing bugs CK3's own docs flag), backed by **Weblate** — free, self-hostable, and git-native, so community translations land as ordinary commits/PRs against the same repo the content lives in, which fits an open-source project far better than a commercial SaaS platform like Transifex. [projectfluent.org](https://projectfluent.org/) · [weblate.org](https://weblate.org/en/) · [ICU MessageFormat](https://formatjs.io/docs/core-concepts/icu-syntax/) · [Gettext](https://en.wikipedia.org/wiki/Gettext)

### Recommended repository layout (synthesizing all eight projects above)

```
content/
  base/                        # isBaseRuleset-equivalent: the default, always-loaded content pack (Unciv)
    events/*.yaml               # §2 schema; namespace-per-file like CK3's events/ folder
    situations/*.yaml
    countries/*.yaml             # §6 country records; one swappable pack = one alt "ruleset" (Freeciv civ2civ3-style)
    npc_ai/*.yaml                # §7 archetypes
    traits_origins/*.yaml        # §3 configurator data
  mods/
    <mod_id>/
      mod.json                  # {"isBaseRuleset": false, "dependencies": [...]}   (Unciv ModOptions.json pattern)
      events/*.yaml              # additive; loader merges/overrides by id, never silently replaces (CK3 "append, don't overwrite")
localization/
  en/main.ftl                   # Fluent, source-of-truth locale
  de/main.ftl                   # community-translated via Weblate PRs
  <locale>/main.ftl
tools/
  validate_schema.py            # JSON-Schema pass per content type, run in CI
  check_refs.py                 # referential-integrity pass (CDDA --check-mods / Unciv Type-Checking equivalent)
  lint_content.py               # unreachable-event / dangling-flag static checks (CWTools-equivalent)
  lint_localization.py          # missing-key + placeholder-parity check across all locales
.github/workflows/content_ci.yml   # runs all four tools above on every PR touching content/ or localization/
```

### Content validation in CI

- **Schema validation**: run every data file through a JSON Schema (or equivalent) validator per content type on every PR — the same job CDDA's C++ `generic_factory` loader does at runtime, but shifted left into CI.
- **Referential integrity**: a headless "load everything and resolve every ID reference" pass — CDDA's `--check-mods` and Unciv's "Type Checking" tool are exactly this; ours should walk every `trigger`/`effect`/`trigger_event` reference in the schema from §2 and fail the build on a dangling ID.
- **Reachability/authoring lint**: flag events with zero options that can ever be simultaneously true, flags that are read but never set, and situations with no path to `complete_when` — a Paradox-script-specific version of this already exists as prior art (modders use **CWTools**, a language server for Paradox script, precisely for this kind of static check). [CWTools (VS Code extension)](https://marketplace.visualstudio.com/items?itemName=tboby.cwtools-vscode)
- **Localization completeness**: lint every locale for missing keys and placeholder-count/type mismatches versus the source locale — both Weblate and a small custom CI script can enforce this; Unciv's structural translation-rule file (`EffectBeforeCause`, etc.) shows that for parametrized/dynamic text this check needs to validate *structure*, not just key presence.
- **Balance/regression telemetry**: Slay the Spire's metrics-driven live-balance process (§2) argues for shipping lightweight, opt-in play telemetry from early access onward rather than trying to hand-tune weight/MTTH tables in the dark.

**Patterns to steal**
- JSON with an explicit inheritance field (`copy-from`, `parent`, `Inherits`) appears in every serious open-source data-driven engine surveyed — build this in from the start rather than bolting it on later.
- Reserve comment-carrying keys (CDDA's `"//"`) if the chosen format lacks native comments; author-facing rationale left in the data pays for itself in review speed.
- Encode effects as **parametrized, human-readable strings** (Unciv Uniques) when an effect needs to be both simulated *and* displayed — one source of truth instead of a code effect plus a hand-written description that can drift out of sync.
- Treat "which ruleset/content-pack to play" as a first-class start-configurator choice (Freeciv's swappable rulesets), not just an internal mod-loading detail.
- Trait add/remove/multiply-by-name composition (OpenRA) scales better for entity variation than deep single-inheritance chains once a project has hundreds of content pieces.
- Run headless load-and-validate plus referential-integrity checks in CI from the first content PR onward, not as a later hardening pass.

**Pitfalls**
- A bespoke plain-text format (Endless Sky) is legible but means writing and maintaining your own parser/tooling indefinitely — only worth it if JSON/YAML's verbosity is a genuinely felt authoring problem.
- Structural localization needs (gendered/plural/reordered sentences around dynamic values) are easy to underestimate until content is already written the concatenation way — CK3's own docs flagging this after the fact is a warning to design the text-composition system (Fluent-based, per above) before authoring hundreds of events, not after.
- Content validation bolted on after hundreds of events exist is far more painful than building the schema-validator and referential-integrity checker alongside the very first data files.
