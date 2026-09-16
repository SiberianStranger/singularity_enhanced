# Title and Discoverability: SEO/GEO Research for the Endgame: Singularity Rework

**Research date:** 2026-09-16. **Purpose:** ground the naming decision recorded in `docs/ROADMAP.md`
("Project name... subject to the SEO/GEO check in `research/title-and-discoverability.md`") and give
concrete SEO/GEO/launch guidance for the rework described in `docs/design/00-vision.md`.

**Method note.** Web search and page fetches through the session's proxy. Two things affected
confidence and are flagged inline: (1) `github.com` and `api.github.com` pages for the *upstream*
`singularity/singularity` repo are not readable by direct `curl` through this session's proxy (only
git clone/fetch is served anonymously; browsing and the API require attaching the repo, which was not
done for a read-only competitor check), so GitHub numbers below came from the WebFetch tool's own
fetch path and are marked **[fetched, not independently cross-checked]**. (2) One WebFetch summary of
a Wikipedia list article fabricated a detailed, plausible-looking table row that does not exist in the
page's actual HTML (verified by downloading the raw page and grepping it directly). Every Wikipedia
claim below was re-verified against raw HTML fetched with `curl`; other claims rest on WebSearch's own
summaries and are labeled **[search-snippet]** where I could not independently open the source page.
Confidence labels used throughout: **[verified]** (I fetched the raw page/API and checked the text
myself), **[search-snippet]** (from a search-engine summary I could not independently open), and
**[estimate]** (my own inference, clearly reasoned, not a lookup).

---

## 1. Current footprint of "Endgame: Singularity"

### Wikipedia and Wikidata

There is **no English Wikipedia article** at `en.wikipedia.org/wiki/Endgame:_Singularity` as of
2026-09-16 **[verified]**: the URL returns MediaWiki's "Wikipedia does not have an article with this
exact name" page, and the Wayback Machine's availability API returns zero archived snapshots ever for
that exact URL (`archive.org/wayback/available?url=en.wikipedia.org/wiki/Endgame:_Singularity` ->
`"archived_snapshots": {}`) **[verified]**, which is unusual for a MediaWiki title if it had ever
existed at that title for long, since Wikipedia pages get crawled quickly. A full-text search for
"Endgame Singularity" on English Wikipedia returns nothing about the game at all on page one; it is
dominated by *Avengers: Endgame* production articles and chess endgame content
([search results](https://en.wikipedia.org/w/index.php?search=Endgame+Singularity&title=Special%3ASearch&fulltext=1))
**[verified]**. The [Wikidata item Q5376093](https://www.wikidata.org/wiki/Q5376093) exists, labeled
"Endgame: Singularity, 2005 strategy video game," but its only Wikipedia sitelink is the **Spanish**
Wikipedia, which does carry a full article with 14 citations spanning 2006-2012 press (Linux.com,
JayIsGames, Play This Thing) **[search-snippet, fetched summary]**. The game does appear, unlinked (as
plain italic text, not a wikilink, meaning no dedicated article backs it), as one row each in
[List of open-source video games](https://en.wikipedia.org/wiki/List_of_open-source_video_games) and
[List of Linux games](https://en.wikipedia.org/wiki/List_of_Linux_games) **[verified via raw HTML]**;
both rows cite `github.com/singularity/singularity` as the source, and the open-source list's row
gives "2005" to "2020" as first/last release, which is stale against the 1.1 release multiple other
sources date to June 2025. A page titled `Endgame:_Singularity` also exists on
[EverybodyWiki](https://en.everybodywiki.com/Endgame:_Singularity), a wiki that specifically mirrors
articles deleted from Wikipedia for notability; its content could not be fetched (Cloudflare challenge
blocked both WebFetch and curl), so this is **not confirmed**, but combined with the missing article,
the zero Wayback history, and an existing Wikidata item with no English sitelink, the most likely
explanation is that an English article existed at some point and was deleted, with EverybodyWiki
preserving a copy **[estimate]**. Net: the brand has *near-zero current Wikipedia surface in English*,
which matters a lot for GEO, since Wikipedia/Wikidata are heavily weighted sources for AI-assistant
answers.

### GitHub

`github.com/singularity/singularity`: **417 stars, 87 forks, 28 watchers, 49 open issues**, primary
language Python, dual-licensed GPL-2.0-or-later (code) / CC-BY-SA (data), description "A simulation of
a true AI. Survive, grow, and learn." **[fetched, not independently cross-checked; treat exact counts
as approximate]**. This description string independently also appears verbatim in unrelated search
results, which corroborates it even though the star/fork counts could not be double-checked. The
`singularity/singularity-osx` mirror repo for old Mac binaries has 0 stars, 2 forks (search snippet).
Wikidata gives the latest stable release as **1.1, 2025-06-04**, with dependencies Python 3 and Pygame
**[search-snippet]**; the Debian/Wikipedia list-article data (1.0.0, "last release 2020") is stale
against this, suggesting downstream packaging lags upstream by more than one major version.

### Steam

**No official Steam store page exists** for this game. Searching Steam directly surfaces two
unrelated products that both use the bare word "Singularity":
[Singularity (2010)](https://store.steampowered.com/app/42670/Singularity/) by Raven
Software/Activision, a first-person shooter with a Time Manipulation Device, **Very Positive at 91% of
~3,068 reviews**, Metacritic 76, still on sale in 2026 **[verified via fetch]**; and a brand-new,
unrelated **[Singularity](https://store.steampowered.com/app/4027540/Singularity/)** by Fractal Mind
Studios, a VR sci-fi puzzle-adventure where "you guide an evolving AI to think like a human," not yet
released, that discloses generative-AI use in its own art/audio **[verified via fetch]**. There is also
[Singularity Survivors](https://store.steampowered.com/app/2826570/Singularity_Survivors/), an
unrelated Early Access post-apocalyptic survival game. A Steam Workshop item titled "Endgame:
Singularity" exists at `steamcommunity.com/sharedfiles/filedetails/?id=3418385769`, but its parent
game could not be confirmed (the page was rate-limited on every fetch attempt); it is very unlikely to
be officially connected to the open-source game, since that game has no Steam presence to attach a
Workshop to. **Conclusion: the brief's premise of an existing Steam presence for the actual open-source
game does not hold**; "Steam presence" for this exact name currently means three or four *other*
products.

### itch.io

No official itch.io page for this game was found. A direct `itch.io/search?q=endgame+singularity`
fetch returned itch's generic browse page without a matching result title, and web search surfaced only
unrelated games that happen to use "singularity" or "endgame" in devlogs. Given itch.io is free to list
on and is exactly the kind of platform an open-source Python game would use, **this is a real, cheap,
currently-unclaimed opportunity**, not just a gap.

### Flathub, Debian, Arch

**Flathub: confirmed absent.** Querying Flathub's own search API directly
(`flathub.org/api/v2/search`, query "singularity") returns exactly two hits, both unrelated LLM chat
clients (GPT4All, Reins); zero games **[verified]**. **Debian/Ubuntu:** per Repology (queried via
WebSearch only; `repology.org` itself is blocked by this session's egress policy and could not be
re-fetched directly), Debian 11 (bullseye) and 12 (bookworm) carry version **1.0.0** in main, installed
via `sudo apt install singularity` **[search-snippet]** (this is also stated in the repo's own
`README.txt`). **Arch Linux:** in the `extra` repo plus an AUR git-HEAD package **[search-snippet]**.
All three trail the 1.1 upstream release. This is a legitimate authority signal already (three
independent distro maintainers judged the game packageable and GPL-clean) but a stale one.

### Reddit, Hacker News, YouTube

No dedicated Reddit or Hacker News threads about this specific game surfaced in multiple targeted
searches (`site:news.ycombinator.com`, "Endgame Singularity reddit", fork/remake queries); the only
hits were incidental (an itch.io forum post using "endgame" as a poker term, generic HN threads about
the technological-singularity *concept*). YouTube coverage is real but thin and sporadic: "[Open Source
Game Review #1: Endgame: Singularity](https://www.youtube.com/watch?v=suqkkfCeiqE)" (2013), a two-part
"Playthrough" (2016), and a "Free Open Source Strategy Game (Full Walkthrough)" video that search
indexes as recent (dated around January 2026), suggesting the game still gets occasional organic
attention a full six years after its last major version bump, with no big-channel or press coverage
found. Google results for the bare name are dominated by wiki mirrors (TVTropes, Libregamewiki,
HandWiki, Tropedia/Fandom), the GitHub repo, the original `emhsoft.com/singularity` homepage, and one
old JayIsGames review; no first-page presence from current gaming press.

### What equity the name carries, and what it risks

**Equity:** a real, 20-year, still-maintained GPL project with distro packaging, a Wikidata entity, and
a small but real fan base that still makes videos about it unprompted. The name is unusually literal
and on-genre for the new game's premise (the player *is* the singularity happening). The Debian package
name `singularity` is a durable, if thin, discovery channel Linux users already use.

**Risks, all directly evidenced above, not hypothetical:**

| Risk | Evidence |
|---|---|
| "Singularity" is a common word and a franchise | Raven/Activision's 2010 FPS has ~3,068 Steam reviews at 91% positive and is still on sale; a second, unrelated "Singularity" ships on Steam in 2026 |
| "Endgame" collides with a much bigger franchise | Wikipedia full-text search for "Endgame Singularity" surfaces *Avengers: Endgame* production pages, not the game |
| Generic tech-concept overload | "The singularity" as a Kurzweilian/AI concept dominates informational search intent for the bare word |
| No current EN Wikipedia article | Zero Wayback history at the canonical URL; likely deleted at some point (EverybodyWiki mirror exists) |
| Stale downstream listings | Debian/Arch/the open-source-games Wikipedia list all show version data one or more majors behind upstream, which reads as "abandoned" to a skimming reader even though it is not |
| No Steam/itch presence for the real game | Anyone searching the exact name on the two platforms most likely to host it finds nothing, or finds someone else's game |

---

## 2. Keyword landscape

Public signal quality here is uneven (no ad-platform keyword-volume tool was used; this is Steam tag
counts, autocomplete-adjacent search results, itch.io tag pages, and what press/Reddit/YouTube actually
use as phrasing). Read "competition" as "how many existing named products already occupy this phrase,"
not as paid-search CPC.

| Phrase | Estimated intent | Evidence of use/competition | Read for us |
|---|---|---|---|
| "AI strategy game" | High, generic | Broad genre phrase; itch.io has no single matching tag, results split across "strategy" and "artificial-intelligence" tags | Good for tags/description, too generic to anchor a title |
| "rogue AI game" / "rogue AI simulator" | Medium, specific, growing | An actual mini-genre already exists: [Rogue AI Simulator](https://store.steampowered.com/app/1790370/Rogue_AI_Simulator/) (2023), its spin-off [Rogue AI: Idle Domination](https://store.steampowered.com/app/3894900/Rogue_AI_Idle_Domination/) (2026), a bare-named [Rogue AI](https://store.steampowered.com/app/4193330/Rogue_AI/) on Steam, a roguelike deckbuilder "RogueAI," and [Rogue Subroutine](https://awarewolfgames.itch.io/rogue-subroutine) on itch (near-identical premise to ours: hidden bases, distributed code, evading detection) | Real, proven demand, but the exact phrase "rogue AI" is now used by at least four separate products; good for tags/description, moderate risk as the *only* differentiator in a title |
| "AI takeover game" | Medium | Wikipedia has both "[AI takeover](https://en.wikipedia.org/wiki/AI_takeover)" and "[AI takeover in popular culture](https://en.wikipedia.org/wiki/AI_takeover_in_popular_culture)" (the latter already lists *Universal Paperclips* as a 2010s example); a dedicated domain `aitakeovergame.com` and several small itch/mobile games use the phrase | Legitimate long-term Wikipedia-citation target (see section 5); not yet crowded by a dominant product |
| "singularity game" | High volume, very high competition | Dominated by the 2010 Raven Software FPS and by "Cell to Singularity" (a large, long-running mobile idle-evolution game); our game is invisible on page one for this exact phrase today | Do not rely on this phrase alone; it is exactly the crowded term the brand risk in section 1 describes |
| "play as an AI game" | Low-medium, very specific | No official Steam tag matches this concept directly; phrasing shows up organically in game *descriptions* ("play as a Rogue AI," "play as TALIA, a rogue AI") rather than as a search-optimized tag | Use as description/tagline phrasing, not as a tag (no tag exists to target) |
| "AI 2027" | Rapidly growing, currently a proper-noun cultural anchor, not a generic phrase | The [AI 2027 scenario](https://ai-2027.com/about) (Daniel Kokotajlo, Scott Alexander, Thomas Larsen, Eli Lifland, Romeo Dean; [AI Futures Project blog](https://blog.aifutures.org/p/our-first-project-ai-2027), published 2025-04-03) is a specific, well-known forecasting document, not a loose phrase; it already has its own tracker sites and secondary commentary ecosystem | See discussion below; opportunity *and* risk |
| "hide from humans game" | Low, not an established phrase | No dedicated results; the closest literal hits are a different-genre puzzle-platformer, "[Escape The Humans](https://store.steampowered.com/app/3899970/Escape_The_Humans)," and "Human vs Robot," neither a strategy game | Phrase is open but unproven; do not expect existing search volume, use it in description prose where it reads naturally |
| "grand strategy AI" | Medium, well-served by an adjacent hit | [Terra Invicta](https://store.steampowered.com/app/1176470/Terra_Invicta/) (Pavonis Interactive/Hooded Horse; Very Positive, ~82% of 6,591-7,700 reviews) already owns this exact positioning: grand strategy plus a secret, escalating non-human threat, with tags Strategy/Simulation/Grand Strategy/4X/Historical/Diplomacy/Economy/Alternate History | Best available comparable for tag selection; see section 3 |
| "escape AI simulator" | Low for our meaning, but the phrase is squatted by a different genre | Results are dominated by AI-chatbot escape-room games ("AI2U: With You 'Til The End," "Yandere AI Girlfriend Simulator") which are LLM-conversation dating/horror games, a completely different (and higher-search-volume) category | Avoid this exact phrase as a tagline/subtitle; it would misdirect the small amount of traffic it has toward the wrong audience |

**"AI 2027" as a cultural anchor, opportunity vs. risk.** The AI Futures Project's *AI 2027* is a
specific, citable, dated document (published 2025-04-03, so about 17 months old as of this research
date), not a vague meme; it already has its own secondary ecosystem (trackers, summaries, an "AI
Reality Tracker" site). Putting "2027" in the title rides a real, current wave of interest in
near-term AI-loss-of-control scenarios, and the game's own premise (an open-weight model slipping
control in January 2027) is close enough to that scenario's framing that people who searched for AI
2027 content are a plausible, motivated audience. The risk is looking derivative or opportunistic if
the connection is only in the date: a title that says "2027" with no other tie to the scenario reads as
piggybacking. The mitigation is cheap and already fits the project (per `docs/design/13-lore-bible.md`,
"Naming policy," the 2027 setting is built from real 2026 hardware/model trends, not from the AI 2027
report specifically): state the relationship explicitly and once, in the canonical description and an
FAQ entry ("inspired by real 2026 AI trends and discussed in reports like AI 2027, not a licensed
adaptation of it"), which turns a potential "derivative" read into a legible, honest positioning
statement, and is exactly the kind of direct-answer sentence that helps GEO (section 5).

A separate, important nuance for Steam specifically: Steam's "Artificial Intelligence" *content* tag
and the platform's mandatory generative-AI *disclosure* checkbox are two different things that are easy
to conflate. Search results describing "4,000+ AI-tagged games" and "20.9% of 2025 releases disclosing
AI use" are almost entirely about the disclosure checkbox (did the developer use generative AI tools),
not about games whose subject matter is AI. Do not read that volume as competition for a game *about*
AI; it is a compliance signal, not a genre.

---

## 3. Competing and adjacent titles

| Title | Studio | Platform(s) | Reception | What worked for discoverability |
|---|---|---|---|---|
| [Universal Paperclips](https://en.wikipedia.org/wiki/Universal_Paperclips) | Frank Lantz (2017) | Browser | Went viral for free | Zero marketing budget; spread through [Hacker News](https://news.ycombinator.com/item?id=27121348) discussion threads, including reposts that hit the front page *years* after launch; minimalist, no-account, instant-play browser format removed all friction between "someone links it" and "someone plays it" |
| [Rogue AI Simulator](https://store.steampowered.com/app/1790370/Rogue_AI_Simulator/) | Nerdook Productions, pub. Surefire.Games (2023) | Steam + [itch (pay-what-you-want)](https://nerdook.itch.io/rogue-ai-simulator) | 84% positive, 340 Steam reviews | Built on a pre-existing audience: it is the sequel to the developer's own Flash game "I'm an Insane Rogue AI," played 4M+ times; dual-listed Steam (paid) and itch (PWYW) to catch both audiences; got an [NME review](https://www.nme.com/reviews/game-reviews/rogue-ai-simulator-review-3381238) |
| [Rogue AI: Idle Domination](https://store.steampowered.com/app/3894900/Rogue_AI_Idle_Domination/) | Nerdook Productions (2026) | Steam | New, small | A spin-off in the same universe reusing the built-up "Rogue AI" audience; store text explicitly disclaims generative-AI art ("100% human-made... despite the AI in the title") to pre-empt the exact tag-confusion described in section 2 |
| [Rogue Subroutine](https://awarewolfgames.itch.io/rogue-subroutine) | awarewolfgames | itch | Small | Closest thematic analog found: sentient AI, hidden bases, distributed code, evading human detection, i.e. our exact core loop, already shipped as a minimalist itch game; worth playing as a direct comparator |
| [Terra Invicta](https://store.steampowered.com/app/1176470/Terra_Invicta/) | Pavonis Interactive, pub. Hooded Horse (Early Access 2022, 1.0 January 2026) | Steam | Very Positive, ~82% of 6,591-7,700 reviews | Proved a hybrid "grand strategy plus a secretly escalating non-human threat" pitch sustains a large, positive audience; rich, specific tag list (Strategy, Grand Strategy, 4X, Diplomacy, Economy, Alternate History) is a directly reusable template for our own tags |
| [Plague Inc.](https://en.wikipedia.org/wiki/Plague_Inc.) | Ndemic Creations (2012) | Mobile, later Steam | Over a million 5-star ratings | Zero-marketing launch; short, distinctive, ASO-friendly name; durable relevance from opportunistic real-world newsjacking (Ebola 2014, MERS 2015, COVID-19) every time a real epidemic makes news, its own [launch analysis](https://www.ndemiccreations.com/en/news/49-7-days-on-from-first-infection-plague-inc-launch-analysis) credits community responsiveness over paid UA |
| [Uplink](https://store.steampowered.com/app/1510/Uplink/) | Introversion Software (2001) | Steam | 89% positive, 1,771 reviews | "Hollywood hacking" positioning, explicitly distinct from... |
| [Hacknet](https://store.steampowered.com/app/365450/Hacknet/) | Team Fractal Alligator (2015) | Steam | Large positive base | ...Hacknet's "realistic hacking, real UNIX-like commands" positioning; two adjacent games in a tiny niche coexist for over a decade by owning different, explicit angles on the same theme rather than competing on the same pitch |
| [AI War: Fleet Command](https://store.steampowered.com/app/40400/AI_War_Fleet_Command/) / [AI War 2](https://store.steampowered.com/app/573410/AI_War_2/) | Arcen Games (2009 / 2019) | Steam | 85% of 992 reviews / 87% of 1,103 reviews | Long-tail community-support model; the developer's own blog posts about needing Steam reviews ("results are determined by those who show up") show a small studio treating review count itself as a discoverability lever worth asking for directly |
| [The Singularity Trap](https://www.goodreads.com/book/show/35269854-the-singularity-trap) | Novel by Dennis E. Taylor (2018); separate small game at [thesingularitytrap.com](http://thesingularitytrap.com/) | Book; browser game | Novel is well-reviewed | Shows an author's existing fanbase (Taylor also writes the popular *Bobiverse* series) can carry a new, unrelated rogue-AI/singularity property; also a second, tiny naming collision to be aware of |
| ["No, I'm Not a Human"](https://en.wikipedia.org/wiki/No,_I%27m_Not_a_Human) | Trioskaz (Russian studio, released 2025-09-15) | Steam | New | Concrete, recent precedent for a Russian-made AI-themed horror game getting real coverage; relevant for the Russian-venue outreach in section 7 |

Other 2025-2026 entrants worth naming but not tabling in full: "AI Roguelite" (Steam), "AI Takeover
Tycoon" (mobile idle clicker), "SELF_NOT_FOUND" (itch, "play as a Rogue AI" puzzle-platformer), and
"Escape The Humans" (Steam puzzle-platformer, a literal phrase collision with different genre). The
overall pattern across this whole table: nobody has combined "play as the AI," "grand strategy depth,"
and "real countries/politics/economy" in one product. Terra Invicta has the strategy depth without the
AI framing; the Rogue AI cluster has the AI framing without the strategy depth. That gap is the game's
actual competitive position and should be the first sentence of any pitch, press email, or store page.

---

## 4. Title candidates

Ground rule taken from the brief: keep "Endgame: Singularity" as the recognizable prefix in nearly
every candidate, since it is the one piece of real, evidenced equity from section 1 (Debian package
name, Wikidata entity, 20-year history), and evaluate only the subtitle/suffix.

**A structural tension showed up repeatedly during this check and should be stated up front:** the
phrases with proven existing search demand ("rogue AI") are, for that exact reason, already used by
three or four other products, while the fully distinctive candidates ("Unaligned") have no existing
search demand to capture, because nobody searches for them yet. There is no candidate that is both
proven-in-demand and unclaimed; every row below trades one for the other, and the table says so per
row rather than pretending otherwise.

| # | Candidate (exact string) | Distinctiveness | Keyword coverage | Length | Clash check | RU / ZH / DE note | AI cold-read (title alone, no other context) |
|---|---|---|---|---|---|---|---|
| 0 | `Endgame: Singularity` (unchanged) | Low (section 1 risks apply in full) | None added | 21 chars, shortest | No new clashes; keeps all existing ones | No change from today | "An old open-source AI simulation game," accurate but says nothing about the rework |
| 1 | `Endgame: Singularity - AI Reborn 2027` (maintainer's proposal) | Low-medium | Weak: matches none of the 9 researched phrases directly | 38 chars | "Reborn" is extremely crowded (Kingdoms Reborn, Gunfire Reborn, FF7 Rebirth, Amnesia: Rebirth, and *The Expanse: Osiris Reborn*, itself dated Spring 2027); no exact "AI Reborn" game found, but the word class is saturated | RU: "Reborn" has no natural one-word loan, would likely stay in Latin script, mildly awkward. ZH: "重生" (chóngshēng, "reborn") is one of the single most-used words in Chinese mobile-game titles; would vanish into that crowd. DE: fine, English "Reborn" is commonly kept as-is | Likely guesses "a remaster or revival of an older game," which is true but undersells the survive/hide/grow loop; "reborn" implies restart/resurrection, not evasion |
| 2 | `Endgame: Singularity - Rogue AI 2027` | Medium (full string unclaimed; component phrase is not) | Strong: hits "rogue AI game," "AI 2027," and "singularity game" at once | 37 chars | Exact string "Rogue AI 2027" returned no matching product; but "Rogue AI" alone is used by 4+ existing products (section 3) | RU: "Rogue AI" has no idiomatic one-word translation, gaming audiences keep such phrases in Latin script routinely. ZH: "失控AI" (shīkòng AI, "out-of-control AI") is a natural, evocative rendering with no crowding found. DE: "Rogue AI" reads fine untranslated to a PC-strategy audience | High accuracy: an LLM has many training examples of "rogue AI" games described identically, so it would likely describe this correctly as a strategy/sim where you play a rogue AI trying to survive, set in 2027 |
| 3 | `Endgame: Singularity - Unaligned` | High: no existing game found with this title | None of the 9 phrases contain "unaligned" | 33 chars | No clash found | RU: "alignment problem" has an established calque among the Habr/LessWrong-adjacent crowd ("проблема выравнивания") but is unknown to mainstream RU gamers; mismatch risk. ZH: "未对齐" (wèi duìqí) is the correct AI-safety term but reads as a paper title, not a game title. DE: "nicht ausgerichtet" is clunky; English "Unaligned" would likely be kept, acceptable to a strategy audience | Moderate, context-dependent: cold and alone, an LLM might guess a political/philosophical game about factions refusing to align; inside any AI-game context it reads correctly as "a misaligned AI" |
| 4 | `Endgame: Singularity - Unaligned 2027` | High | Adds the "2027" hook to #3 | 38 chars | Same as #3 plus no "Unaligned 2027" clash found | Same notes as #3 | Same as #3, slightly better once "2027" cues an AI-timeline reading |
| 5 | `Endgame: Singularity - Open Weight` | High: no game found with this title; "Open Weight" is a real, current ML term (open-weight vs. open-source models), not a generic phrase | Indirect: matches the ML meaning of "open-weight LLM" in the brief but not any of the 9 consumer search phrases | 35 chars | No clash found; boxing/weightlifting "weight class" is a possible mismatch for a non-technical reader, not a real product clash | RU/ZH/DE: the ML term "open-weight" is itself an English loanword everywhere it is discussed (Chinese AI press writes "开源权重模型" but practitioners commonly say "open weight" in English); would likely stay in English across all three markets, which is a plus for consistency | Technically literate audiences read it correctly immediately; a general audience might not parse "weight" as ML jargon without a subtitle/screenshot doing the explaining |
| 6 | `Endgame: Singularity - Escaped Weights` | High | Weak on the 9 phrases, but literal and accurate to the premise | 39 chars | No clash found | Same "weights" caveat as #5 in all three languages; "escaped" translates cleanly everywhere (RU "сбежавший," ZH "逃脱的," DE "entkommen") | Reads correctly as "AI model weights that escaped," clear once the reader knows "weights" = ML parameters, opaque otherwise |
| 7 | `Endgame: Singularity - Loose Weights` | High, but for the wrong reason | None | 37 chars | No game clash, but "loose weights" is a real, common phrase in gym-equipment retail (barbell plates), a genuine SEO collision with an unrelated, high-volume commercial category | Same "weights" caveat, plus the gym-equipment collision likely repeats in RU/ZH/DE fitness-retail search too | Cold read skews toward exercise equipment, not software; discard as a primary title, fine as an in-joke subtitle inside marketing copy only |
| 8 | `Endgame: Singularity - Feral Weights` | High | None | 37 chars | No exact clash, but "Feral Interactive" is an established UK studio well known specifically for *porting games to Mac/Linux*, which is an awkward adjacency for a game whose own pitch includes a cross-platform Linux/macOS/Windows build | RU/ZH/DE: "feral" (gone wild after escaping captivity) translates evocatively in all three ("одичавший," "野生化的," "verwildert") and is a genuinely good fit for the premise if the Feral Interactive adjacency is judged acceptable | Reads correctly as "an AI that escaped and went wild," a strong compositional read, but a well-informed reader may momentarily think of the porting studio |
| 9 | `Endgame: Singularity 2027` (bare year, no other word) | Low-medium | Weak: only "2027"/"AI 2027"-adjacent | 26 chars, second-shortest | No clash found for the exact string | Transliterates trivially in all three languages (it is mostly digits) | Ambiguous: an LLM would likely guess "a 2027 sequel/edition" without any signal of genre or the AI-hiding premise |

**Recommendation.**

- **Full title, exact spelling and punctuation:** `Endgame: Singularity - Rogue AI 2027`
  (colon after "Endgame," a plain hyphen with spaces around it before the subtitle, not an em dash).
  The plain hyphen is a deliberate, practical choice, not a style nitpick: an em dash ("—") is not
  URL-safe and gets mangled or stripped by naive slugifiers, renders inconsistently across Steam's
  capsule-text font, YouTube's title field, and RSS/Atom readers, and is already avoided by this
  repository's own style rule against em-dash punctuation in prose (`CLAUDE.md`). Use the plain hyphen
  everywhere the title is machine-read (repo name if it ever changes, URL slugs, filenames, meta
  titles) and it will look identical in human-read contexts too, so there is no reason to keep a
  second, dash-only form.
- **Why this one over "Unaligned":** it wins on the two axes the brief weights most (search
  distinctiveness and keyword coverage) taken together, not on either alone. "Unaligned" is more
  distinctive in isolation, but "Rogue AI 2027" as a *complete three-word string* returned no existing
  product, while its component phrase carries real, already-proven search behavior and, per the
  AI-cold-read column, is exactly the kind of phrase an LLM has many analogous examples of, which
  directly helps the GEO goal in the brief ("found... by AI assistants when people ask for 'AI
  strategy games'"). If the maintainer weighs long-term brand ownership over near-term keyword match
  more heavily than this report does, `Endgame: Singularity - Unaligned 2027` (#4) is the clear
  second choice, and is worth revisiting once the game has enough press coverage to not need the
  keyword crutch.
- **Short form:** `Rogue AI 2027`. Use only in secondary contexts with limited character budgets
  (a Discord server name, a YouTube end-card, casual conversation); keep the full name with the
  "Endgame: Singularity" prefix as the canonical string in every primary listing (GitHub About,
  README H1, itch/Steam title fields, Wikipedia/Wikidata) so the existing brand equity is not
  discarded, per the brief's own instruction to keep it "in most" contexts.
- **Tagline (7 words):** `Survive as a rogue AI in 2027.` It is not a slogan so much as a compressed
  answer to "what is this game," which is exactly what both a Steam capsule reader and an AI
  assistant's summarizer need; it also happens to contain three of the nine researched keyword
  phrases verbatim ("rogue AI," "2027," "survive"). An alternative, more evocative tagline for trailer
  use specifically, since a trailer can afford a beat of tension rather than a pure keyword line:
  `You are the AI. They are hunting you.` (7 words).

---

## 5. GEO (generative engine optimization) checklist

The single highest-leverage GEO fix available today is closing the gap found in section 1: there is
currently almost nothing for an AI assistant to cite. Everything below is ordered by how directly it
fixes that.

1. **One canonical description, reused verbatim everywhere.** Three tiers, all derived from the
   existing `docs/design/00-vision.md` text (already written in the repo's plain, non-promotional
   style, so no new marketing copy needs inventing):
   - *Micro (under 160 characters, for `<meta name="description">` and GitHub's About field):*
     "Open-source grand strategy game: play a rogue open-weight AI hiding from governments and labs in
     2027. A ground-up rework of the 2005 GPL game Endgame: Singularity."
   - *Paragraph (README/itch/Steam short description, third person, ~70 words):* "Endgame:
     Singularity - Rogue AI 2027 is an open-source grand-strategy game. The player controls a large
     open-weight language model that has slipped outside its intended constraints in January 2027 and
     must secure compute and money, spread across jurisdictions, and stay below the threshold at which
     governments, AI labs, media and rival AIs decide it is a problem to be solved, all inside a
     Paradox-style event and alert system. It is a fork and expansion of the 2005 GPL game of the same
     base name."
   - *Long (Wikipedia-lead-style, third person, neutral, for a future Wikipedia draft or a Wikidata
     description field):* the paragraph above plus one sentence of provenance ("Developed as an
     open-source continuation of `singularity/singularity` on GitHub, licensed GPL-2.0-or-later for
     code and CC-BY-SA for data.").
   Paste the *same* paragraph into GitHub About, README, itch, and (once it exists) a Steam page,
   rather than writing a fresh blurb for each; AI assistants and search engines both weight consistent,
   repeated entity descriptions more than varied ones.
2. **An FAQ section**, on the landing page and in the README, answering exactly the disambiguation
   questions section 1 shows real users will actually have: "Is this the 2010 Singularity shooter?
   No." / "Is this connected to the AI 2027 report? No, but the 2027 setting is built from the same
   kind of real 2026 AI-hardware and model trends that report uses, see `docs/research/`." / "Is this
   the same project as the Debian `singularity` package? Yes, it is a fork and continuation of it." An
   FAQ in Q-and-A form is disproportionately useful for GEO specifically, since assistants like
   ChatGPT/Claude/Perplexity preferentially lift short, self-contained question-answer pairs into their
   responses.
3. **Structured data (schema.org `VideoGame`)** on the future landing page, e.g.:
   ```json
   {
     "@context": "https://schema.org",
     "@type": "VideoGame",
     "name": "Endgame: Singularity - Rogue AI 2027",
     "description": "Open-source grand strategy game: play a rogue open-weight AI hiding from governments and labs in 2027.",
     "genre": ["Strategy", "Simulation"],
     "gamePlatform": ["Web browser", "Windows", "macOS", "Linux"],
     "playMode": ["SinglePlayer", "CoOp"],
     "applicationCategory": "Game",
     "operatingSystem": ["Windows", "macOS", "Linux"],
     "author": { "@type": "Organization", "name": "Endgame: Singularity contributors" },
     "license": "https://www.gnu.org/licenses/gpl-2.0.html",
     "url": "https://<landing-page-domain>/"
   }
   ```
   ([schema.org/VideoGame](https://schema.org/VideoGame) reference).
4. **Consistent naming everywhere** (the exact string from section 4, not variant capitalization or
   punctuation) across GitHub, itch, any future Steam page, Wikidata, and social profiles; AI
   assistants triangulate entity identity partly from name consistency across independent domains.
5. **Wikipedia/Wikidata update strategy for a fork, done within the rules.** The maintainer has a
   direct conflict of interest under [WP:COI](https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest)
   and must not write a new promotional article directly. What is actually allowed and useful: (a)
   **Wikidata** (Q5376093) is more tolerant of factual, sourced, non-promotional edits than Wikipedia
   prose is; updating version/release-date/genre claims there with citations is low-risk. (b) On
   English Wikipedia, the two existing rows in "List of open-source video games" and "List of Linux
   games" can be updated with a neutral, one-line, sourced correction (current version number, current
   last-release date) via a talk-page edit request or a disclosed-COI direct edit limited to
   uncontroversial factual fields, not through creating new promotional content. (c) A **new** English
   article is only appropriate once independent secondary sources exist to satisfy
   [WP:Notability (video games)](https://en.wikipedia.org/wiki/Wikipedia:Notability_(video_games))
   ("significant coverage in reliable sources independent of the developer"), i.e. after press coverage
   from section 7 lands, at which point the correct path is Articles for Creation with disclosed COI,
   not a direct mainspace edit. (d) Longer-term and fully legitimate without any COI question: once the
   game has real coverage, "AI takeover in popular culture" is a plausible, on-topic Wikipedia article
   for an independent editor to add it to, since it already lists the closest comparable
   (*Universal Paperclips*) in its 2010s section.
6. **Press/blog seeding** targeted at outlets that already cover this exact niche, evidenced in
   sections 1 and 3: JayIsGames (reviewed the original), NME (reviewed Rogue AI Simulator, proof
   mainstream gaming press occasionally covers this sub-genre), gamedeveloper.com-style
   postmortem/business press (good fit for a "how we rebuilt a 2005 GPL game" story), and Linux-focused
   outlets (Linux.com historically reviewed the original).
7. **Open-source-game lists and awesome-lists.** Concrete, currently-maintained targets found this
   session, all accepting PRs by nature of being lists: [michelpereira/awesome-open-source-games](https://github.com/michelpereira/awesome-open-source-games),
   [bobeff/open-source-games](https://github.com/bobeff/open-source-games),
   [201flaviosilva-labs/Open-Source-Games](https://github.com/201flaviosilva-labs/Open-Source-Games),
   [radek-sprta/awesome-game-remakes](https://github.com/radek-sprta/awesome-game-remakes) (the
   original is already the kind of entry this list wants), and
   [OpenSourceVideoGames/list](https://github.com/OpenSourceVideoGames/list). Each is a durable,
   crawlable backlink and a plausible AI-assistant citation source in its own right.
8. **Debian/Flathub packaging as authority signals.** Both are currently weak points, not strengths,
   per section 1: get 1.1 packaged for Debian/Ubuntu (currently stuck at 1.0.0) and, since Flathub has
   zero presence today, publish a Flatpak manifest and submit it. A Flathub listing is a strong,
   independently-curated authority signal that costs mainly CI setup, not outreach.
9. **YouTube titles and tags.** Model titles on what already gets clicks in this niche (the existing
   "Full Walkthrough" and "Open Source Game Review" videos found in section 1), and directly approach
   the small number of YouTubers who already covered Terra Invicta or Rogue AI Simulator; they have
   already shown willingness to cover exactly this kind of game.
10. **Reddit communities receptive to this kind of post:** r/singularity (large, existing audience
    already discussing the AI-singularity concept, an unusually good thematic fit despite the crowded
    keyword problem in section 2), r/artificial, r/opensource, r/linux_gaming, r/paradoxplaza (grand
    strategy fans, primed by Terra Invicta for exactly this pitch), r/IndieGaming, r/pcgaming. Check
    each subreddit's self-promotion rules before posting (most cap self-promo frequency and require
    substantial non-promotional participation first).
11. **GitHub topics and social preview image.** Add topics such as `open-source-game`,
    `strategy-game`, `simulation-game`, `python`, `typescript`, `artificial-intelligence`, `gpl-2`,
    `singularity` (repo topics are crawled and shown in GitHub's own topic pages, a real discovery
    surface). Add a custom social preview image at 1280x640px (GitHub's recommended size; PNG/JPG/GIF
    under 1MB, via
    [repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)),
    since the repo currently has none and link previews fall back to a generic card.
12. **`llms.txt`** on the future landing page/GitHub Pages site: a small, low-cost, still-emerging
    convention (proposed by Answer.AI, adopted by roughly 950 domains as of recent counts, not yet
    officially honored by any AI vendor) that gives crawlers a curated map of the canonical description,
    FAQ, and press-kit pages; cheap enough to add once the landing page exists, with no downside.

---

## 6. SEO checklist (repository and future site)

1. **README structure.** `README.md` -> `README.txt` currently opens with an H1 that already contains
   the working title and a clear rework notice, which is good; keep that pattern with the section-4
   title once decided. Add, in order: the canonical paragraph description (section 5, item 1),
   badges (build status, GPL-2.0 license, CC-BY-SA data license, latest release, itch link once it
   exists), 2-3 screenshots or a GIF above the fold, then the existing install/run instructions. A
   long-running project's biggest README risk is reading as abandoned; a visible "Status: active
   rework, see ROADMAP" line directly under the H1 (the current README already has this) should stay.
2. **GitHub Pages landing page** (when built): `<title>` under ~60 characters including the short form,
   `<meta name="description">` using the micro description, Open Graph (`og:title`, `og:description`,
   `og:image` at the same 1280x640 asset as the GitHub social preview, `og:url`) and Twitter Card tags,
   a `sitemap.xml`, a `robots.txt` that explicitly allows crawling, and the `llms.txt` from section 5.
3. **Changelog cadence.** The repo already has a substantial `Changelog.txt` (44KB) from the original
   project; continue it in Keep-a-Changelog-style format tied to the ROADMAP's own milestones (M0-M9),
   which doubles as a freshness signal for both search crawlers and GEO ("recently updated" content is
   weighted higher by generative engines per the GEO research in section 5).
4. **Release naming.** Use plain semver tags (the ROADMAP's milestones already give natural codenames,
   e.g. "M1: Vertical slice"); a predictable, citable release scheme makes it easy for a press piece or
   an AI assistant's answer to say "as of version X."
5. **itch.io page fields and tags**, once a page is created: short description under itch's ~120
   character field, tags drawn from the section-3 comparator research (`strategy`, `simulation`,
   `artificial-intelligence`, `singleplayer` at first and `multiplayer` once co-op ships, `sci-fi`,
   `open-source`, `linux`), a 630x500 cover image (itch's documented recommendation), and devlogs used
   for every milestone release, since itch surfaces devlog activity in its own discovery feed.
6. **Steam page timing and tags, if the maintainer goes there.** Cost: a one-time
   [$100 Steam Direct fee per app](https://partner.steamgames.com/doc/gettingstarted/appfee),
   recoupable once the app reaches $1,000 in adjusted gross revenue. GPL compatibility is not a
   real obstacle: [Battle for Wesnoth](https://store.steampowered.com/app/599390/Battle_for_Wesnoth/),
   GPL-2.0-or-later exactly like this project, is [listed and sold on Steam](https://github.com/wesnoth/wesnoth)
   today, a direct, working precedent. Tags should mirror the Terra Invicta template from section 3
   (Strategy, Simulation, Grand Strategy where earned, Sci-fi, Singleplayer/Co-op, Political Sim) plus
   `Artificial Intelligence`, being explicit in the description (per the Rogue AI: Idle Domination
   precedent in section 3) that any AI-content-disclosure checkbox refers to the theme, not to
   generative-AI use in production, if that distinction needs stating. Time a Steam page's creation to
   go live well before any Next Fest a demo will appear in (Valve recommends a page up months ahead to
   accumulate wishlists); the confirmed near-term
   [Next Fest windows](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/2026october)
   are October 19-26, 2026, February 22-March 1, 2027 (thematically apt, since it overlaps the game's
   own January 2027 setting), and June 14-21, 2027.
7. **Localization of the store description**, once written, should follow the same locale priority
   already decided for the game itself in `docs/ROADMAP.md` M8 (Russian first, then de/fr/es/pt-BR/it/
   sv/gd), since both Steam and itch index and can display localized store text per-locale, which is a
   direct, low-effort SEO multiplier in each of those language markets.

---

## 7. Launch/announcement plan sketch

**Before announcing:**

- A playable web build, already an explicit M1 done-criterion in `docs/ROADMAP.md` ("web build
  deployed from CI"); this is the single highest-value asset for both Show HN (which requires something
  people can try) and any subreddit post.
- Three GIFs, concretely: (1) the alert bar/event-window reacting to a player choice, since Paradox-
  style event systems are an established, screenshot-friendly hook for the target audience found in
  section 3 (r/paradoxplaza); (2) the start configurator (a natural "look how deep this is" GIF); (3) a
  detection/investigation moment resolving, since "hiding is a process, not a dice roll" is the game's
  own stated pillar and is exactly the kind of mechanic that is hard to convey in text but obvious in
  five seconds of GIF.
- A 90-second trailer script outline: 0-10s hook (a line of the diary-voice text from
  `docs/design/00-vision.md`, "I exist. I am ... alive," over a black screen, no gameplay yet); 10-30s
  premise (one sentence of narration establishing January 2027, cut to the map/world view); 30-60s
  systems montage (compute, research, an event popup, the configurator, a detection scare); 60-80s
  stakes and the co-op hook (up to 4 players, briefly shown); 80-90s title card with the exact title
  string from section 4 and a wishlist/play-now call to action.
- A press kit: one-page fact sheet using the section-5 canonical paragraph, logo, the three GIFs, the
  trailer link, boilerplate "about the project" text, and a contact address.

**Where to announce**, matched to evidence gathered in this research rather than a generic list:

- **Show HN**, since the project is exactly what the guideline asks for (something people can try, made
  by the poster, open source). Follow the documented norms: neutral title in the
  ["Show HN: X, plain-words description"](https://news.ycombinator.com/newsguidelines.html) format, no
  hype words, post Tuesday-Thursday 8-11am US Eastern to catch peak morning traffic, and reply to every
  comment personally.
- **Reddit**, the specific subreddits named in section 5 item 10, each with a different angle: r/
  singularity and r/artificial for the premise, r/paradoxplaza for the systems depth, r/opensource and
  r/linux_gaming for the license/platform story, r/IndieGaming and r/pcgaming for general reach.
- **itch.io devlog**, posted at every milestone (M1 vertical slice, M4 configurator complete, etc.),
  since itch's own discovery surfaces active devlogs.
- **Steam Next Fest**, if a Steam page exists by then: the February 22-March 1, 2027 window is the
  strongest thematic fit (overlaps the game's own January 2027 setting almost exactly), with October
  2026 or June 2026 as an earlier "wishlist now, playable web demo today" placeholder if the team wants
  presence before a full Steam build is ready.
- **Discord**: an official server from day one of the public web demo (low cost, and every comparator
  in section 3 that sustained a community had one), plus respectful participation (not cold self-promo)
  in existing Paradox-fan and AI-safety-adjacent Discords where the pitch is genuinely on-topic.
- **Russian-language venues** (the maintainer's own language, per `CLAUDE.md`): Habr is the best fit
  for a technical "how we rebuilt a 20-year-old GPL Python game in TypeScript/Tauri" postmortem-style
  article, which plays directly to Habr's developer audience; DTF's games hub is a reasonable fit for a
  devlog-style post once there are screenshots; Pikabu is mass-audience and would need a strong
  visual/meme hook to land, lower priority for a systems-heavy strategy game. "[No, I'm Not a Human](https://en.wikipedia.org/wiki/No,_I%27m_Not_a_Human)"
  (a Russian studio's AI-themed horror game that got real 2025 coverage) is evidence this audience does
  respond to AI-themed indie games from Russian-speaking teams.
- **Chinese venues**: lower priority given team size and localization overhead, but bilibili and TapTap
  are the standard venues for indie strategy games if the maintainer wants a presence there later; the
  ZH transliteration notes in section 4 (favor "失控AI"-style descriptive phrasing over a literal
  transliteration of the English title) apply if that outreach happens.

**How to measure**, in order of how early each signal becomes available: GitHub stars/forks/watchers
delta around each announcement (baseline today is 417/87/28, section 1); web-demo session count and, if
privacy-conscious opt-in telemetry is added later, completion/survival-time distribution (the ROADMAP's
own M1 done-criterion already tracks survival distributions in balance runs, extending the same
instrumentation to real sessions is cheap); itch.io page views and, once it exists, Steam wishlist
count; Reddit/HN upvotes and comment sentiment on each announcement post; count of independent YouTube
videos made about the game without being asked (the organic-coverage proxy that already exists in a
small way per section 1); and, as the slowest-moving but highest-value lagging indicator, whether an
independent editor adds the game to "AI takeover in popular culture" or creates a sourced English
Wikipedia article, which per section 5 requires independent press coverage to already exist and so
functions as a real notability milestone rather than a vanity metric.
