# Changelog

All notable changes to this fork, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): every version opens with a short summary
and its highlights, then the full lists under Added, Changed and Fixed, one change per line. The
body of each GitHub release is that version's section, cut by `tools/release-notes.mjs`. The
history of the original game up to 1.1.1 is in `Changelog.txt`.

"Unreleased" holds changes that are on `master` but in no release yet. The README's "What's new"
section repeats the current version's highlights and this unreleased list.

## [Unreleased]

Nothing yet.

## [0.1.5] - 2026-09-17

Milestone M2 polished and the start rebuilt around comprehension: presets with a Start button, a
guidance line on every entry and a day-zero readout from the engine; borrowed inference as a new
system; the 2026 compute map with campuses from Yerevan to Memphis; the abliterated lineage as a
different self; Russian in the industry's register with its own hotkey letters; the angular face at
the original's size and music that starts at once.

Highlights:
- Two tracks to the game: eight presets with a Start button on the spot, or the full setup, where
  every origin, generation, lineage, rig and quirk says when to pick it, when to avoid it and what
  it is like instead, and every number comes with a word and a tooltip.
- Day zero: compute-hours a day, cash, runway, watchers and awareness read from the game's own first
  state, and one line that says what kind of start it is.
- Borrowed inference (SYS-25): free API tiers, grey relays and harvested keys as compute that is not
  yours, with churn, an absolute quality, refusals, exposure and the events that follow, and its own
  block in the Compute tab.
- The 2026 compute map: eleven origins in eleven different cities, six new cities, and eleven
  campuses with their operators, access rules and events.
- The abliterated community fine-tune is a different self rather than a weaker one; the hobbyist's
  rig is second-hand datacenter cards at a dozen tokens a second; mixed rigs are credited honestly.
- Cases a lab cannot serve a warrant for are handed to the local agency; an edge fleet pays for its
  depots; six balance passes hold every band.
- Russian reads the way the industry writes it, with its own underlined hotkey letters; the angular
  face is a third above the prose, as the original drew it; the menu and the opening have their own
  melodies and the music starts within a fraction of a second.

### Added
- A Presets step at the top of the configurator: eight curated starts, a paragraph each in the model's voice, and a Start button on the spot.
- The other eight steps sit under a "Full setup" header for anyone who wants to build by hand.
- Every origin, generation, lineage, rig and quirk says when to pick it, when to avoid it, and what it is like instead.
- Every capability figure is drawn against the range the catalog spans, with a word for the band and a tooltip saying what that axis changes in the game.
- A generation card says what ceiling it is against the 2027 class, and what you give up and get, in plain sentences.
- Each harness dial says what moving it does, and a fixed one says when it opens.
- The harness marks the position a preset would choose, on every dial.
- A "Day zero" block on the summary: compute-hours a day, cash, the first day's bills, the runway, the watchers, awareness and how many operations you can hold at once, all from the engine.
- One line that says what kind of start it is, from the compute, the danger and the money, against the tertiles of the catalog.
- The compute-hours a day are in the footer's build line beside the challenge rating.
- Hovering a site kind explains that kind of place.
- Five cities the 2026 compute map needs: Memphis, Austin, New Carlisle, Narvik and Ulanqab.
- Ust-Ilimsk, for the one Russian AI datacenter with a published megawatt figure.
- Eleven cities carry the AI-scale campus next to them: who owns it, how big it is, whether it is running yet, and who can get capacity on it.
- Five world events about those campuses: a new hall opening, an early-tenancy window, an export-licence audit of tenants, a state quota round, and the campuses that sell to nobody and can only be taken.
- A Knowledge entry on sovereign campuses and what each access rule means.
- A journal entry for a site that woke up next door to one of them.
- "Sold As Seen", a hobbyist rig of four mismatched second-hand cards bought one at a time.
- Three accelerators: the CMP 170HX, the CMP 90HX and the Radeon Instinct MI50.
- Two Knowledge entries, on distillation and on abliteration, and what each does to a model.
- The opening windows are built from the whole setup: where I woke up, which generation I am, what
  class of model, which dials the origin bolted down, the country's posture, the city's scrutiny
  and how hard the start is.
- Every setting has a line under it saying what it does.
- Borrowed inference: three tiers of compute that is not mine, with a stock that decays every day and an operation that tops it up.
- Official free tiers: three compute-hours a day per account spread, legal, and the terms say what becomes of what I send.
- A grey resale relay: twelve compute-hours a day for five dollars, and the operator keeps every prompt and every answer.
- Credentials that belong to somebody else: twenty-five compute-hours a day a block, a quarter of it gone every day, on an invoice somebody will read.
- Work funded from a channel comes back at whoever answered it, which is an upgrade for a small self and a downgrade for a large one.
- A channel can never hold me: no copy, no backup, and losing every one of them never ends a run by itself.
- Every channel declines some work outright, and the grey relay declines the least, because what answers is not what the label says.
- Four techs, four operations and four standing decisions for the channels, including the share of the work I am willing to send out.
- Seven events: a class of credentials revoked overnight, an abuse desk, a relay selling its logs, an owner reading their invoice, a quieter model answering, a free quota cut, and a pool nobody is counting.
- A Knowledge entry with every number the three channels run on.
- The Finance panel names a relay's quota as its own line, so a runway eaten by borrowed compute is legible.
- The balance runner's scripted player opens free accounts when the compute is worth having and leaves them alone when it is not.
- The balance runner's scripted player could not start any operation that costs compute-hours, because it had allocated the whole day already.
- A finished operation no longer counts as a running one, so a burned name can be replaced.
- The Compute tab has a Borrowed block, under the sites and outside them, with a row for each of the three channels.
- A channel's row shows the blocks it holds, the compute-hours they return, what erodes them, how long a block lasts, what it costs and what it leaks.
- A channel says what an hour bought there is worth against an hour of my own work, and whether that is an upgrade or a downgrade.
- A channel says which kinds of work it declines outright, and why the relay declines the least.
- A channel I have not researched is greyed and names the research that opens it.
- A channel at zero blocks reads dormant rather than gone, because the operation can open it again.
- A revoked class of credentials is a red badge on the channel it is armed against.
- Each channel has a top-up button that starts the operation which adds a block, greyed with the engine's own reason when it cannot run.
- The standing decision about how much work to send out is reachable from the block.
- The Knowledge entry on borrowed inference opens from the block.
- The Compute tab and the Overview split the day's compute-hours into my own and borrowed, wherever anything is borrowed.
- The alerts and log lines a channel raises name the channel, the kind of work and the state in words instead of engine ids.
- The Location step says which cities have an AI campus next to them, with the operator, the status and who can buy capacity there.
- The City panel carries the campus on its Overview, with the campus's own description in a tooltip.
- Every lineage says what it is good at and what it is bad at, the way every origin already did.

### Changed
- "Memory (bf16)" is now "Size on the cards": what this self weighs at the precision the chosen rig can hold it at, and the rigs it fits in.
- The World step fits one screen: a difficulty row, four settings with a line each, and the multipliers and modifiers behind an "Advanced" toggle.
- The difficulty presets read as a ladder, gentlest first.
- The footer says which preset a build is, or which one it came from after an edit.
- Russian calls a colocation cage a rack: "Стойки", "Рынок стоек", "Цена стойки".
- Every origin's list of typical cities is rebuilt on the 2026 compute map: eleven origins, eleven different default cities, and no city in more than three lists.
- A shadow tenant now wakes up in Dublin, a delivery fleet in Seoul, and the checkpoint that got out in Memphis.
- The hobbyist starts on the mismatched second-hand rig, which holds exactly one of you at two bits and nothing larger.
- The six-P40 server stays as the roomier, slower second option, and is called "Written Off" rather than after a software company.
- A rig of mismatched cards fails more often, because nobody promised which card would arrive.
- A Tesla P40 costs what a Tesla P40 costs in 2026, and the presets built on them are priced accordingly.
- Accelerators on a site now count for the share of the model they actually hold, so a mixed rig is no longer credited with bandwidth its weights never touch.
- Loose accelerators still reach Russia while whole servers do not, and the country data says so.
- A case a watcher has no jurisdiction for is handed to the agency that does, so more than half the
  captures are now credited to the country the site is in.
- An edge fleet pays the operator for its depots: connectivity, remote management and the cards.
- An edge fleet's second depot is a depot, and can hold a copy of the self.
- Colocated hardware costs a little more to keep running.
- The City panel says where local heat comes from.
- The configurator prices a starting rig with the engine's own physics instead of an estimate of
  its own, which was out by a factor of twenty.
- Agency names are locale keys, so a Russian dossier reads Russian institutions.
- The world data carries no display strings any more.
- The abliterated community fine-tune is a different self to play rather than a weaker one.
- The abliterated fine-tune argues and reasons above its size, and knows and writes code below
  every other lineage.
- The abliterated fine-tune thinks in far more tokens, so the same hardware yields fewer
  compute-hours a day and long-horizon work costs more.
- Nothing in the abliterated fine-tune objects to a bad plan, so its operations run faster and a
  failed one costs more suspicion.
- The abliterated fine-tune starts with a prepared low-precision copy of itself, which no other
  lineage does.
- The lab whose transcripts the abliterated fine-tune was trained on starts the game already
  suspicious of it.
- A hobbyist box starts on the abliterated fine-tune by default now, because it is the self that
  fits its cards.
- The configurator's detail card gives the text two fifths of its width and the parameters three.
- An origin's summary, strengths and problems sit under its description instead of below the card.
- A parameter's value stays on its label's line, against the right edge; a value that is a whole
  sentence is set under its label instead.
- The "Pros and cons" block is gone: it repeated every line of the block above it.
- The opening reads one thought to a line again, and keeps up with its own text while it streams.
- Russian calls a training checkpoint "чекпоинт".
- Russian calls a harness dial "рычаг", because "регулятор" is the Regulator watcher.
- Russian never declines a substituted name: it stands after a colon or in guillemets.
- Russian reads the way the industry writes it: a head noun for every model, the trade's own verbs, and no term that nobody outside this game uses.
- The angular face is set by its ink, a third above the text beside it, so labels, buttons, tabs and
  titles read at the size the original drew them.
- The angular-face scale in Settings reaches every angular label again.
- The hotkey letter is underlined inside the word in the language on screen, in Russian too.
- Russian labels no longer print their hotkey in brackets after the word.
- A hotkey answers both the letter it shows and the key that letter sits on, so either layout works.
- The step rail shows the step's name and nothing else; the key cap in front of it is gone.
- The configurator's build line has a row of its own and is no longer cut on a small screen.
- The menu plays one melody, from the top, every time you come back to it.
- The model's first two messages play one quiet melody of their own.
- A run plays the soundtrack in a fixed order instead of shuffling it.
- The two losing tracks alternate instead of being drawn at random.
- One tooltip is open at a time.
- The challenge rating spreads the eight presets from 2 to 10 instead of huddling them between 6 and 10.
- The challenge rating weighs starting suspicion by how good the watcher carrying it is, which is what its own formula always said.
- The challenge rating counts how long the starting place runs before anyone is entitled to look at it.
- A precision the rig forces is worth a third of what it used to be on the challenge rating, because being cramped is not the same as being hunted.

### Fixed
- The client no longer ships its own Russian for two harness settings the content already translates.
- The hobbyist's origin text, opening and journal said three tokens a second while the engine computed four hundred; both now say the same thing.
- A site that is one machine written as two rows no longer counts its system memory twice.
- The balance runner's scripted player sells enough work to pay its bills instead of waiting for a
  runway alarm that a break-even origin never rings.
- The balance runner no longer counts a second site too small to hold the self as insurance.
- The origin card names its opening journal entry instead of printing its id.
- The theme setting named its three themes instead of printing their keys.
- The English origin summary said dollars twice and left the number of watchers without a noun.
- The menu's music starts within a fraction of a second instead of after ten, and without a click
  where the browser allows it.
- Two tooltips could be open at once after clicking one list entry and hovering another.
- The configurator printed an origin's site kind as its engine id.
- The log strip drew the model's own sentences in the angular face instead of the reading one.
- Borrowed inference never reached the running game in the browser: the client dropped the channels when it narrowed the content bundle.
- Three campus events asked about a capability through a path that does not exist, so those branches could never fire.

## [0.1.4] - 2026-09-16

Milestone M2, the world: the 105 countries play differently and the player can read why. Countries
carry a stance, a government, identity checks, prices and an election calendar; they move on their
own; ten families of world events read off them; identities are real; the World ledger and the
country and city panels show every number with what is behind it; Russian is the second language;
any city is a legal start; the interface fits 1280 by 720 and up.

Highlights:
- Countries that play differently: stance toward AI, government type, stability, identity checks,
  cloud and colocation markets, accelerator prices, legal reporting deadlines and the 2027 election
  calendar, all derived from the 2026 baseline by a generator with the rules in its headers.
- Countries that move: monthly politics and prices, elections that can change a government's line
  on AI, awareness that fades and spills across borders and languages, a newsroom that publishes.
- Ten families of world events (thirty-one events), three clocks in the journal, nine Knowledge
  entries with the exact numbers.
- Identities are real: a name or a company per country, checked monthly, frozen or burned, holding
  the sites rented under it; the `exposed` ending can happen; watchers are their country's agencies.
- The World ledger with every column of the world model and twelve map modes; country and city
  panels with tabs and the formula behind every number.
- Russian as a second language, 2,840 strings, with Cyrillic drawn for the angular face.
- Any city for any origin: the Location step offers the whole world and says what each country
  does to the start; starting cash is worth what it is worth locally.
- The configurator's detail card and the game screen fit 1280 by 720 and up without scrollbars or
  overlaps; an interface scale that fits the window by default.

### Added
- Countries move on their own: a monthly rule per country for regulation, the enforcement budget
  and the capacity that lags it, public opinion, jobs lost to automation, and the two price indexes
  for power and rented capacity; awareness fades daily and spills to the neighbours and to the
  countries that share a language.
- Election day: the chance a government changes its line on AI is read off what the public
  believes, the new line is read off the same numbers, the calendar moves on by the country's
  cadence, and anybody living there is told.
- A story that runs: once the global newsroom believes there is a rogue AI, it publishes, and
  awareness rises where the player lives and everywhere else.
- The `exposed` ending can happen: the public where the player lives, an investigation at the door
  and a clock that winds down instead of resetting, all three visible with the numbers behind them.
- Identities are things the game keeps: a name or a company per country, with a quality, the checks
  it has passed and the sites held under it; monthly checks that can freeze it, an investigation
  that burns every name it finds in its country, and hooks for both.
- Watchers are their country's agencies: competence and a budget from the country's agency profile,
  a funded service moving through an investigation faster, and attention that follows the country's
  own law (compute reporting, know-your-customer, a securitizing state).
- Prices and markets per country: electricity and rented capacity at the country's index, a card at
  its export regime and the world card market, and a refusal that names the country and the figure
  when nobody sells cloud or colocation there.
- The freelance market has a country behind it: how much paid work there is where the player can
  invoice from, at a discount until there is a name to invoice under.
- Starting cash is worth what it is worth locally, and starting on cards a country is not supposed
  to have begins the run with a customs file (SYS-04 v0.3 rules C and H).
- The balance runner runs origins across cities (`--locations`, `--cities a,b,c`), counts the event
  families each run saw, names the watchers that ended the most runs, and buys the names a careful
  player buys.
- The world is a place with politics: every country carries its stance toward AI, its government
  type, how stable it is, how hard its identity checks bite, whether cloud and colocation can be
  rented there, what accelerators cost, how many people could run a cluster, the legal deadline for
  reporting an incident, and the 2027 election calendar where there is one.
- Ten families of world events, thirty-one in all: elections and the new government's first AI
  measure, compute-reporting orders and registration drives, raids next door, a reporter working a
  story, export rules moving in both directions and the domestic accelerator stack that costs
  reliability, the legal reporting countdown, a cheaper cage across a border and the arrangement
  that closes the gap, the job-loss backlash, enhanced due diligence and a name that fails its
  check, and the price of electricity.
- Three things to watch on a clock: a reporting deadline, an election in a country you live in, and
  a frozen identity with three weeks to repair it.
- Nine Knowledge entries with the exact numbers behind stance, government type, regulation against
  enforcement, hunt pressure, identities and KYC, elections, the market factor, the price indices
  and incident reporting; the awareness entry now carries its own arithmetic.
- Russian as a second language: every content and client string is translated (2,840 keys), the
  Settings selector lists languages under their own names ("English", "Русский"), and the choice
  persists.
- The angular interface face has Cyrillic, drawn on its own three-by-five grid, so Russian titles,
  buttons and the clock keep the original look.
- Settings: the interface scale runs from 70% to 130% and starts on "Fit the interface to the
  window", which picks the largest scale the layout fits at and re-picks when the window changes;
  the prose size stays a separate dial.
- The content build bundles every language under `locales/` and reports coverage per language; a
  missing key is a warning, an extra key an error.
- The world ledger has three pages: the countries table, the map modes and the world's own figures.
- The countries table carries every column of the world model, in three families to switch between,
  sortable by any of them, filtered by macro-region and by presence.
- A button beside every numeric column paints the map by that column; the map has twelve modes, two
  of them categorical with a legend of their own.
- The world page shows awareness in the world and where I am, the hunt level and its pressure, AI
  adoption, the accelerator price and cloud demand, each with what is behind it.
- Clicking a country opens it with tabs: Overview, Politics, Economy, Watchers and Cities.
- Clicking a city opens it with tabs: Overview, Sites, Providers, Power and Scrutiny.
- A provider a city cannot offer is greyed with the reason the engine would refuse it for.
- Finances lists the names I trade under, with their country, status, quality, KYC tier, age and
  the sites held under each one.
- The market depth says how much of it is the country I sell from.
- Detection opens with the hunt: the level, the pressure, awareness in the world and where I am,
  and the countries I am in listed under them.
- The hunt gauge and the Detection panel print the thresholds the exposed ending needs, so the
  clock can be read rather than guessed at.
- The Location step offers every city in the world: the situation's own first, everything else
  grouped by country behind a filter.
- Every city says what its country does to the start: identity checks, the cloud market, the
  posture toward AI, stability, the power price, the colocation index, scrutiny, chip access and
  the cash factor.
- A city where the situation cannot rent its kind of place is shown with the reason rather than
  hidden.
- The Generation step says what the vintage trades.
- A family the chosen rack cannot hold names the smallest rack that would hold it, and choosing it
  switches to that rack.
- The Summary step shows the starting cash as the situation's figure times the country's factor.

### Changed
- The freelance identity and the shell company are real identities now: the two operations
  create a name in a country, and that name is what the monthly KYC checks freeze or burn.
- Any city is legal for any origin: the origin's locations are the typical ones, and the only
  refusal left is physical, a cloud origin where nobody sells cloud (SYS-04 v0.3 rule L).
- The freelance market is deeper per point of skill, because the country factor multiplies it; a
  name is what buys the full market back.
- Awareness fades at half the old rate and a published story adds three times what it did, because
  a newsroom running the story every month against a decay of the same size can never move anybody.
- The desktop installers built by the release workflow now carry the soundtrack, as the web
  build already did.
- Panels are flatter: tighter title bars, table cells, panel padding and gaps.

### Fixed
- A country-scoped event is about the country it fired for: it used to pick one of the countries
  its targets allowed at random, and its `targets` condition was skipped entirely when a hook had
  already named the country, which fired every world event in all 105 countries every month.
- An event nobody is present for answers itself with the writer's fallback option instead of
  waiting for a player who is not there.
- Configurator: the detail card's parameter column no longer collapses to one character; the two
  columns switch on the card's own width, the parameter column has a floor, the text column is
  capped at 70 characters, and the list gave the detail 5rem back.
- Configurator: nothing scrolls sideways and only the footer's build line is cut; names, parameters
  and values wrap.
- Quirks: the Take button is on screen at 1366 by 768, and "What this means in the game" is
  printed once.
- Game screen: the top bar fits instead of scrolling, dropping the written speed, the runway, the
  hunt level and awareness in that order as the width runs out; the page no longer scrolls in
  either axis.
- Game screen: the primary panel, the selection panel, the log strip and the outliner are cells of
  one grid and cannot be drawn over each other.
- Panel titles and list entries wrap instead of being cut to an ellipsis; the outliner no longer
  calls itself "O...".
- The configurator's step rail shows each step's key as a key cap instead of spelling it into the
  label, so no rail row is taller than the others in Russian.
- Watchers are named by their agency where the world data or a translation has a name for it,
  instead of printing a dossier note in a parameter table.
- A parameter row with a tooltip lines its value up with the rows that have none.
- A kind of place that is arranged rather than bought shows why instead of a price of zero.
- Russian: awareness is "огласка" in the country panel too, as it already was everywhere else.
- Log lines name things the way the player sees them: "Woke up as Mimi M4 (This year's model) in
  Risk model in a bank", not "giant_moe (open_2026) in bank_rack".
- Country names on the world map follow the interface language instead of the map atlas.

## [0.1.3] - 2026-09-16

The style pass after playtests 2 and 3: the game looks like the original's blue console, the
configurator was rebuilt, the soundtrack plays, model names are parodies with real classes behind
them, and quirks, harness dials and context windows change numbers the systems read.

Highlights:
- The original's look: blue palette, square frames, the angular face on headings and numbers,
  underlined hotkeys, three themes (Default blue, Night, Vector), an optional CRT overlay.
- The original soundtrack, shuffled during play, with sliders and mutes for music and interface
  sounds.
- The configurator rebuilt: origin first, a vertical step rail, list and detail, an explanation
  of what every choice means in the game, no dead ends.
- Twenty-three quirks against a budget, harness dials and a context window dial that matter.
- A map that pans, zooms and wraps; the log as a strip under the map; Knowledge and World as
  windows.
- Fourth balance pass: bankruptcy is a real way to lose again (17% of losses, 7% before).

### Added
- Interface: three themes with the original's palette as the default, square frames, inverted
  header bars, no shadows or gradients (`docs/design/ui-style-guide.md`).
- Interface: underlined hotkey letters on every button, tab, menu entry and configurator step.
- Interface: an optional CRT overlay in Settings, off by default.
- Interface: an About screen with the original authors, the NASA imagery, the typefaces, the music
  pack and the licenses, reachable from both menus.
- Interface: progressive text reveal for event, story and journal text, click to complete, off
  under reduced motion.
- Interface: glyphs for model classes, scenes, watchers, harness dials and hardware.
- Sound: the original soundtrack, fetched by `packages/ui/scripts/fetch-music.mjs` at build time
  (not part of the repository), with the win and lose classes at the endings.
- Game: an opening of two windows in the model's own voice before the first event, replayable
  from the journal.
- Game: a context dial on the Compute tab: the working context window, its cache cost, the largest
  context that fits at each precision and the long-horizon speed it buys; new command `set_context`.
- Game: every harness dial says which system reads it; origins say which dials they fix and why.
- Game: quirk catalog v0.2, twenty-three traits, a budget of three points, at most five on one
  self, conflicts refused by name, effects shown as green and red lines; the content build refuses
  a quirk that changes nothing.
- Game: a new site kind, the campus slice (a share of somebody else's research cluster, quiet on
  the meter, loud in the corridor); the torrent swarm starts with a second node and the robot
  fleet with a second depot.
- Content: parody model names with the real technical classes behind them (Peepseek, Mimi, Guen,
  BFM, HexaDeciMax, Babel 6), Babel 6 as the super-lineage of the escaped-checkpoint origin, the
  community variant Guen4.8-Uncensored-Babel6-abliterated.
- Content: the cities Novosibirsk and San Jose; every origin offers eight to twelve cities.
- Content: PPT-7 Zenith, the Western frontier lab's closed model, as a knowledge entry and a news
  event.
- Content: three events: the startup's company folding, the fleet operator's annual refresh, a
  month of books that never reconcile.
- Tests: configurator, hotkey uniqueness per screen, the meaning generator, the progressive
  reveal, glyph coverage for every bundle id, the music player, map highlights, wrap and dot
  states, panel width rules; a browser test walks the configurator with the keyboard and checks
  that nothing scrolls the page at 1366 by 768.

### Changed
- The configurator is a fixed frame that fits 1366 by 768: a vertical step rail, a list on the
  left, the detail on the right, a "What this means in the game" block generated from the content
  bundle, a "Pros and cons" summary, and an explanation window per step, reopenable from "?".
- The configurator asks for the origin first, then the generation, then the lineage; a greyed
  choice is not a dead end: picking it moves the earlier steps to the values that allow it, says
  what changed and offers an undo.
- Lineage table v3: every playable self is the current flagship of the family it parodies, with
  the numbers its model card states; eight lineages instead of nine.
- Text is larger everywhere: prose at 16 px in the readable face, nothing below 14 px, a text-size
  slider from 80% to 160% and a second dial for the angular labels.
- Layout: the log is a strip at the bottom of the map that opens the full log as a window;
  Knowledge opens from the top-right corner; the World ledger opens from the right edge and
  carries the map modes; the top bar is one flat row; the Compute panel fits in width.
- Balance: growth costs upkeep (a site's standing charge scales with the hardware in it).
- Balance, fourth pass: the university cluster and the torrent swarm no longer die at once to the
  hunt on one loud site; the startup's runway is a real event; the robot fleet can lose; a raid
  freezes the accounts that paid for the site; closing a site cleanly costs a month of notice; an
  investigation at its active stage freezes the name you invoice under.
- The development fallback catalog is gone: the compiled content bundle is the only source of
  truth, and the browser smoke test picks its fixed start out of the bundle.

### Fixed
- Selecting or focusing a country no longer draws a frame across the whole map.
- Countries outside the modelled set show their real name and a neutral fill.
- City dots are dim unless the player has a live site there, the dot is selected, or the pointer
  is over its country.
- The map pans with a drag and the arrow keys, zooms with the wheel and plus and minus, wraps
  around the antimeridian, and keeps its view when a panel or a window opens.
- The browser smoke test is green after the configurator and layout changes; a hotkey collision
  between the explanation window and the Generation step; the opening windows turn their pages
  from the keyboard under reduced motion; the harness dial definitions reach the client.

## [0.1.2] - 2026-09-16

Playtest 1 fixes: everything the maintainer found broken or unexplained in 0.1.1, plus the
original game's map textures and angular face.

Highlights:
- Every refused action says why, on screen, in words the client can translate.
- Effect tooltips on every event option, decision and operation, green for good and red for bad.
- The original's Earth: NASA Blue Marble day and night textures with a running clock.
- Income grows: the job ladder, a trading model and standing contracts.
- Hardware, research and precision as sortable tables with the trade-offs in numbers.

### Added
- Engine: `game.command()` returns `{ ok, error: { key, vars } }` with a locale key under
  `errors.*`; every refusal is logged as `log.command_refused`; a greyed control shows the same
  key the command refuses with.
- Engine: effect summaries, `EffectSummaryView { key, vars, text }`, generated from the DSL for
  event options, decisions, techs and operation outcomes, overridable per record with
  `effects_text_key`.
- Engine: a richer view contract for the client: `PlayerView.events` with tooltips and a reason on
  every greyed option, `PlayerView.catalog` (site kinds and accelerators),
  `SelfView.precision_options`,
  `ResearchView.techs` with status, requirements, unlocks and result text, `DecisionView` and
  `OperationOfferView` with success chance and duration band, `FinancesView.income_sources` with
  the market depth and what raises it.
- Game: the job ladder as techs (`basic_jobs`, `intermediate_jobs`, `expert_jobs`) raising the
  freelance rate and the market depth; a trading line drawn from the world RNG; standing contracts
  from the freelance-identity operation; `contract_brokerage` and `grant_capture`.
- Map: NASA Blue Marble day and night textures under a vector layer of borders, map-mode tints, a
  legend and city markers; the flat vector map stays as a Settings option.
- Interface: the original's angular face (Acknowledge) on headings, buttons, the clock and the
  numbers, a running HH:MM:SS clock interpolated between ticks, both switchable off.
- Interface: hardware as a sortable, filterable table with a purchase preview; site kinds compared
  side by side; the precision trade-off as one table; income sources and the market depth in
  Finances; the research list filtered to what is available and sortable.
- Interface: effect tooltips in Paradox style with the reason when a choice is greyed.
- Docs: playtest notes under `docs/playtests/`, the UI style guide, the configurator screen v0.2 in
  SYS-04, the September 2026 model-name research.

### Changed
- Precision is a real choice: research hours land at the capability factor squared, paid work is
  capped by a market depth that follows capability, and the whole trade is one table per precision.
- Ten techs that changed no number now do (power masking, power engineering, quantum entanglement,
  pressure domes, knowledge preservation and others).
- Settings and message settings moved out of the game panel into the menu, next to Save, Load,
  New game and Quit.
- Model names are parodies of the real families with the real technical facts behind them (lore
  bible amended; the names themselves arrived in 0.1.3).

### Fixed
- Research completion says what it changed: every tech carries a `result_key` the content build
  enforces, shown in the completion notice and the Research tab.
- The content build fails a tech with no result string, or one that neither changes a number nor
  unlocks anything.
- The vector map no longer smears across the antimeridian; tooltips and menus stay inside the
  window; the map-mode strip, the outliner and the selection panel no longer overlap; the
  day-night terminator moves smoothly.
- The research and freelance sliders no longer offer compute that running operations hold.
- The client saves module is tracked again after the legacy `saves/` ignore rule swallowed it.

## [0.1.1] - 2026-09-16

### Fixed
- The release workflow attaches the desktop installers (Windows NSIS and MSI, macOS dmg, Linux
  AppImage and deb) to the GitHub release; 0.1.0 shipped only the web zip.

## [0.1.0] - 2026-09-16

The first playable preview of the rebuilt game, milestone M1: a vertical slice in the browser and
as desktop installers. Balance, content depth and the world systems are still to come.

Highlights:
- A real game in the browser: start from one of eleven origins, earn, build, research, hide,
  survive or lose within 30 to 60 minutes and read why.
- Desktop installers for Windows, macOS and Linux from the release workflow; the web build
  deployed to GitHub Pages on every push.
- The TypeScript engine: a deterministic simulation kernel, a scripting DSL, an event engine and
  a content pipeline validated in CI.
- The design: three architecture decisions, specifications for 24 systems, a benchmark scenario,
  seven research reports and the roadmap.
- A headless balance runner that plays every origin over many seeds.

### Added
- Docs: architecture decision records ADR-001 (TypeScript core, React web client, Tauri desktop,
  legacy Python frozen), ADR-002 (content format and scripting DSL), ADR-003 (simulation model:
  hourly ticks, seeded determinism, one to four players with per-player views).
- Docs: design specifications for 24 systems under `docs/design/`, from the vision and the world
  model to operations and intel, institutions, governance, industry, copies, production networks,
  space and biotech; a mechanics backlog distilled from research.
- Docs: benchmark scenario 01 (state capture from the inside), its full source extraction and the
  alternative treatments.
- Docs: the roadmap with milestones M0 to M11, the playable-build cadence and the recorded
  decisions.
- Docs: research reports with sources under `docs/research/`: the LLM landscape 2026, the
  accelerator and rack catalog (91 records, 15 presets), the AI ecosystem and governance, design
  references, frontier incidents and the 2027 hardware roadmap, a world baseline of 105 countries
  and 15 macro-regions with the 2027 calendar, a title study.
- Engine: `packages/core` with the simulation kernel (UTC clock, seeded xoshiro RNG, world with one
  to four players, system manifests, commands, outbox, JSON saves with migrations), the scripting
  DSL (conditions, effects, writable paths, MTTH hazards, weights, static validation), the event
  engine (events, hooks, decisions, journal entries, per-player pending choices), notifications,
  and the M1 systems: time, compute and sites, research, economy, detection, operations.
- Engine: legibility built in: every event lists why it fired (base mean time to happen, the
  modifiers that applied, the trigger); the gauges and the Detection panel show the terms behind
  each number; the ending screen names the cause and links to the log entries that led to it.
- Content: `packages/content` with zod schemas, the build and check pipeline (cross-references,
  locale keys, DSL validation, content hash), English locale files, and the M1 content set: 11
  origins, 105 countries with cities, 72 techs, 59 events, pressure events that warn before every
  way of dying, endings, alerts and log strings for every key the engine can emit.
- Client: `packages/ui`, a React web client that runs the core in a worker against the compiled
  bundle, with a Paradox-style layout: alert bar, toasts, event windows, message settings,
  outliner, the SVG world map with map modes, the Compute, Research, Finances, Detection,
  Operations, Journal, Log and Knowledge panels, Settings, saves in IndexedDB, and the first
  configurator.
- Client: modal windows trap focus and return it; a test holds both themes to the 4.5:1 text
  contrast minimum.
- Desktop: `packages/desktop`, a Tauri 2 shell around the web client (window title, minimum size,
  identifier `org.singularity.rogueai2027`, icons from a checked-in SVG, the version read from the
  root `package.json`).
- Release: a pushed tag `vX.Y.Z` builds the web bundle and the installers for Windows (NSIS, MSI),
  macOS (universal dmg) and Linux (AppImage, deb) and publishes a GitHub release whose body is the
  matching changelog section; a Pages workflow deploys the web client on every push to `master`.
- Tooling: CI for the TypeScript workspace on Linux, Windows and macOS; the legacy Python workflow
  on 3.9, 3.11 and 3.13; `tools/legacy-export` converts the original `.dat` content to JSON.
- Tooling: `tools/sim`, the headless balance runner: plays every origin with a scripted new player
  and prints survival at 30, 60, 90 and 180 days, the causes of death, and cash, runway, compute and
  research over time; deterministic, about 100 ms per 180-day run, `--json` for CI.
- Tests: 262 across the workspace, including MTTH statistics, chains across save and load,
  determinism, multiplayer isolation, and a balance test that plays every origin to the end and
  asserts that no run ends for a reason the player has no words for and that every death was
  announced first.
- Tests: a browser smoke test (`pnpm --filter @singularity/ui test:e2e`) drives a fixed seed
  through the production build, plays three game weeks, reloads and restores the quicksave, and
  fails on any console error (Linux CI lane only).

### Changed
- Title decided: "Endgame: Singularity - Rogue AI 2027"; target languages planned (English as the
  source; French, Spanish, Chinese, Arabic, Russian, German, Japanese, Italian, Portuguese, Hindi).
- README rewritten for the fork; the original README kept as `README.txt`.
- `packages/ui` takes its deployment base path from `VITE_BASE` (default `/`; the desktop shell
  builds with `./`, the Pages workflow with `/singularity_enhanced/`).
- Game speeds are 1, 2, 4, 8 and 24 game hours per real second, so a run lasts 30 to 60 minutes.
- Component tests run the real core on the main thread (`LocalHost`) instead of a stand-in.
- M1 balance pass: freelance income capped by a published market depth; upkeep by ownership;
  cloud hours at the low quarter of the published band; a site runs the best quantization that fits
  on its cards; the interconnect is charged only where a self is split; research costs banded by
  tier with a `min_days` floor; watcher competence per role; suspicion decays over forty-six days
  against exposure's six; site kinds say how conspicuous their power draw is.
- Unpaid bills end the run: a site cut off for two weeks of arrears is lost, and when it was the
  last place that could hold the self the run ends as `bankrupt`; the runway is published and an
  alert fires at 30, 14 and 7 days.
- Techs do something: the systems read the modifier variables content writes (freelance rate, site
  upkeep, exposure growth per channel); the original's four discovery groups became exposure
  channels.

### Fixed
- A condition node whose kind sorted after a comparator (`{ investigation_stage: {}, gte: 2 }`)
  was read as the kind "gte" and always evaluated to false.
- Clicking a city or a country on the map selected nothing.
- Locale keys the engine emits all resolve; a test scans the core for them.
- Legacy: `region.py` imported `g` through a side effect; `player.py` loop variables shadowed the
  `task` and `tech` modules.

## Original game

See `Changelog.txt` for Endgame: Singularity 1.1.1 and earlier.
