# World Baseline 2026 — Research Dossier

**Purpose:** baseline real-world dataset for *Singularity Enhanced*, an open-source strategy game set in **January 2027** in which the player is an escaped LLM and countries are simulated entities (demographics, economy, politics, AI/compute capacity, security agencies).

**Research date:** 2026-09-16. **Companion file:** [`world-baseline-2026.json`](./world-baseline-2026.json) (`{ "macro_regions": [...], "countries": [...] }`, validated with `python3 -c "import json;json.load(open('world-baseline-2026.json'))"`).

**Scope:** 105 countries/territories across 15 macro-regions. English only. Every figure below states its data year; unknown fields are `null` in the JSON rather than guessed.

---

## 1. Methodology

### 1.1 Approach

This dossier was built by combining bulk, table-level extraction from primary-source-citing aggregators with targeted per-country and per-topic research, then layering curated knowledge of institutions (government structure, security agencies, notable AI organizations) on top. Concretely:

1. **Bulk demographic/economic/political tables** were fetched as raw HTML (via `curl` through the session's egress proxy) and parsed programmatically with BeautifulSoup, rather than relying on single-country web searches. This let every figure in a table (population, GDP, Democracy Index score, Freedom House rating, median age, urbanization, internet penetration) be extracted consistently, from the same table, for all countries at once — reducing transcription drift between countries.
2. **AI/compute-specific data** (Tortoise Global AI Index ranks, TOP500 counts, chip export-control posture, hyperscaler regions, notable AI organizations, datacenter capacity) was assembled from a mix of direct source fetches (TOP500.org's live June 2025 and June 2026 list pages, Tortoise Media, Stargate/Nvidia/Wikipedia coverage) and analyst-grade estimation where licensed datasets (Cushman & Wakefield, Synergy Research, DC Byte) were not directly accessible from this environment (see §1.4 and §4).
3. **Government agencies, government type, languages, currency, and key cities** draw on standing institutional knowledge (these are slow-moving facts) cross-checked against 2026 developments where a change was documented (e.g., Hungary's April 2026 change of government).
4. **The "current events" layer** — what has already happened in the world by the September 2026 research date, and what is scheduled for 2027 — was sourced from Wikipedia's collaboratively-maintained `2026` and `2027` year pages (see §1.3). This was the single highest-value research move for this dossier: it supplied a dense, dated, cross-referenced timeline of elections, conflicts, government changes, and scheduled events that would otherwise have taken many individual searches to assemble, and it is treated as canon for this baseline (see below).

### 1.2 Data-year handling

Every country record carries a `data_years` object stating the vintage actually used per field. In summary:

| Field(s) | Source | Vintage actually used |
|---|---|---|
| `population_2026_est` | national statistical offices / UN, via Wikipedia aggregation | Latest available official estimate per country, mostly dated 2025 or 2026 (a few smaller/conflict states carry older 2020–2024 estimates — flagged per-record) |
| `gdp_nominal_usd_bn_2025`, `gdp_ppp_usd_bn_2025`, `gdp_per_capita_usd_2025` | World Bank (2025 series), falling back to IMF WEO 2026-edition projections where the World Bank has not yet published a 2025 figure (mostly smaller/data-sparse states and Taiwan, which the World Bank does not carry) | World Bank 2025 preferred; IMF WEO (2026 ed.) projection as fallback — the fallback source is recorded per-record |
| `median_age` | UN World Population Prospects, 2024 revision | 2024 |
| `urbanization_pct` | UN World Urbanization Prospects, 2023 revision | 2023 |
| `internet_penetration_pct` | ITU | mostly 2024, some 2025 (recorded per record) |
| `democracy_index_2024` | Economist Intelligence Unit, **Democracy Index 2025** (published Feb 2026) | **2025** — see note below on the field name |
| `freedom_house_status` | Freedom House, *Freedom in the World* | **2024 edition** (see §4 caveats — a live 2026-edition page exists but its score table is not machine-readable from this environment) |
| `ai_index_rank` | Tortoise Media Global AI Index, 2024/2025 edition | 2024/2025, partial (see §4) |
| `top500_systems_2025` | TOP500.org | June 2025 list (field name matches); June 2026 list used qualitatively (e.g., China's new #1 system) |

**Note on the `democracy_index_2024` field name:** the JSON schema requested by the project brief names this field `democracy_index_2024`. During research, the EIU's **2025** edition (published February 2026, i.e. more current and a better match for a January 2027 baseline) turned out to be extractable in full from its Wikipedia mirror, while the 2024 edition was not. Rather than use a one-year-stale figure under a same-named field, **the field is populated with the 2025-edition score**, and `data_years.democracy_index = 2025` in every record makes this explicit. `democracy_index_rank_2025` and `democracy_regime_type` are included as bonus fields for the same reason.

### 1.3 Treating Wikipedia's `2026`/`2027` pages as the game's current-events canon

Because the game's setting (January 2027) is only a few months past the real research date (September 2026), the single most valuable "data source" for a strategy-game baseline is not a statistical table but *what has already happened this year and what is already scheduled next*. Wikipedia's `en.wikipedia.org/wiki/2026` and `en.wikipedia.org/wiki/2027` articles are maintained continuously and cite a source for nearly every entry. This dossier pulled both pages in full and used them as the authoritative timeline of 2026 political/security events (elections, government changes, conflicts) reflected in each country's `government_type` and `lore_notes` fields, and as the source for the "Scheduled 2027 events" list in §6.

This means several of the more dramatic facts embedded in this dossier — a US strike capturing Venezuela's Maduro, Israeli/US strikes killing Iran's Supreme Leader and a war that runs most of 2026, Hungary's Orbán losing power after 16 years, a change of UK Prime Minister without a general election, the UAE quitting OPEC, China's "LineShine" system taking the #1 TOP500 spot back from the US — are **the documented 2026 timeline as of the September 2026 research date**, not editorial embellishment. Where Wikipedia's own account was internally consistent and well-cited, it was preferred over assuming a more static "status quo" continuation of pre-2026 knowledge. Each such fact is sourced to the relevant Wikipedia year-page (and, for a couple of headline items, a second corroborating page — see the per-country `sources` arrays in the JSON).

### 1.4 Known access limitations this session

- **IMF DataMapper API** (`imf.org/external/datamapper/api`) returned a 403 from an Akamai edge node for this session's egress IP — not a proxy-policy block (the proxy status endpoint showed no policy denial), just IMF's bot-mitigation. GDP figures therefore come from **Wikipedia's IMF/World Bank aggregation tables** rather than the IMF API directly; the underlying primary sources (IMF WEO, World Bank) are unchanged, only the access path differs. This is disclosed rather than hidden.
- **Cushman & Wakefield / Synergy Research / DC Byte** datacenter-market reports are commercial/licensed products not accessible from this environment. `datacenter_capacity_mw_est` values are therefore **order-of-magnitude analyst estimates** synthesized from public reporting (hyperscaler press releases, national grid-connection news, TOP500/HPC-center capacity where applicable) — explicitly marked as estimates, not licensed-dataset figures. Treat them as directionally right (which countries/cities are big vs. negligible) rather than audit-grade.
- **Tortoise Global AI Index** does not publish its full ranking table as static, scrapable HTML (it is a client-rendered ranking tool); only a subset of ranks (top ~5, plus a few explicitly reported ones like Israel #9, Saudi Arabia #14, Italy #24) could be sourced directly. Remaining `ai_index_rank` values for lower-ranked countries are estimated placements consistent with the sourced anchor points and the country's known AI/compute profile, and are marked `(est.)` in `ai_index_source`.
- **WebSearch** was exhausted mid-session (session tool-call budget). All research from that point on used direct `WebFetch` calls and raw HTTP fetches (`curl` + BeautifulSoup) instead, which if anything improved data fidelity for tabular sources (no summarization-model lossiness) at the cost of needing exact URLs rather than discovery search.

### 1.5 Country inclusion criteria

Per the project brief: every country with **population > 15 million** (using the population figures gathered here), **plus** every country named as notable for AI/compute/finance regardless of size. That yields, verified directly against the final dataset:

- **76** countries/territories with `population_2026_est` > 15M (out of a 240-row source population table; "World" excluded)
- **29** additional inclusions with population ≤ 15M, kept solely because they were named in the brief as AI/compute/finance-notable (or, for Bulgaria and Ukraine, added editorially — see below): Singapore, Israel, United Arab Emirates, Qatar, Switzerland, Ireland, Norway, Finland, Sweden, Denmark, Estonia, Iceland, Luxembourg, New Zealand, Czechia, Portugal, Belgium, Austria, Hungary, Greece, Belarus, Georgia, Armenia, Hong Kong (territory), Panama, Cyprus, Malta, Cuba, Bulgaria
- Saudi Arabia, Taiwan, Kazakhstan, Chile, Netherlands and Ukraine were all separately named as notable in the brief but **independently clear the 76-country population threshold**, so they are counted once, in the population-based group, not the notable-only group
- **Bulgaria and Cuba** were added editorially beyond the brief's explicit lists (Bulgaria for its 2026 eurozone accession and political realignment; Cuba for its embargo/chip-access relevance), because 2026's documented events made them clearly useful and the underlying data was already in hand
- The Bahamas/Cayman offshore-hub option was explicitly marked optional in the brief and was **not** included, to keep effort concentrated on fuller records elsewhere (per "accuracy over completeness")

**Total: 105 records** (104 sovereign states + Hong Kong as an explicitly flagged territory of China, `is_territory: true`). 76 + 29 = 105.

---

## 2. Sources

Primary/aggregator sources used, with the exact pages fetched:

- **Population:** [List of countries and dependencies by population](https://en.wikipedia.org/wiki/List_of_countries_and_dependencies_by_population) — national statistical offices / UN, latest official estimates (accessed 2026-09-16)
- **GDP (nominal, PPP, per-capita):** [GDP (nominal)](https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)), [GDP (PPP)](https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(PPP)), [GDP (nominal) per capita](https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)_per_capita) — IMF World Economic Outlook and World Bank, via Wikipedia's maintained aggregation tables (accessed 2026-09-16)
- **Democracy Index:** [The Economist Democracy Index](https://en.wikipedia.org/wiki/The_Economist_Democracy_Index) — EIU Democracy Index **2025** edition (published Feb 2026), full 167-country table with score, rank and regime type
- **Freedom House:** [Freedom in the World](https://en.wikipedia.org/wiki/Freedom_in_the_World) — Freedom in the World **2024** edition, full country table (PR/CL ratings, aggregate score, status) plus the separate Territories table (used for Hong Kong)
- **Median age:** [List of countries by median age](https://en.wikipedia.org/wiki/List_of_countries_by_median_age) — UN World Population Prospects, 2024 revision
- **Urbanization:** [Urbanization by country](https://en.wikipedia.org/wiki/Urbanization_by_country) — UN World Urbanization Prospects, 2023 revision
- **Internet penetration:** [List of countries by number of Internet users](https://en.wikipedia.org/wiki/List_of_countries_by_number_of_Internet_users) — ITU
- **Supercomputing:** [TOP500 June 2025 list](https://top500.org/lists/top500/2025/06/), [TOP500 June 2026 list](https://top500.org/lists/top500/2026/06/) — TOP500 project (fetched directly; June 2025 country-level counts corroborated via a web search that is otherwise not individually re-linkable per country)
- **AI rankings:** [Tortoise Media Global AI Index](https://www.tortoisemedia.com/data/global-ai) and its [2024 methodology summary](https://neodatagroup.ai/the-global-ai-index-2024/)
- **AI policy/chip export context:** [Nvidia (Wikipedia)](https://en.wikipedia.org/wiki/Nvidia), [Stargate LLC (Wikipedia)](https://en.wikipedia.org/wiki/Stargate_LLC), [EU AI Act regulatory framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [Artificial Intelligence Act (Wikipedia)](https://en.wikipedia.org/wiki/Artificial_Intelligence_Act)
- **Current-events / political timeline:** [Wikipedia: 2026](https://en.wikipedia.org/wiki/2026), [Wikipedia: 2027](https://en.wikipedia.org/wiki/2027), [AI Safety Summit (Wikipedia)](https://en.wikipedia.org/wiki/AI_Safety_Summit)
- **Institutional knowledge** (government types, security/intelligence/police/FIU agency names, notable AI organizations, hyperscaler cloud regions, languages, currencies, key cities): compiled from standing knowledge of each country's public institutions, cross-checked against the above sources where a 2026 change was documented.

V-Dem and the Stanford AI Index were consulted for cross-reference/triangulation during research (their general findings on democratic backsliding and US/China AI leadership are consistent with the EIU and Tortoise figures used) but did not yield additional machine-extractable country-level figures beyond what the sources above already provided within this session's time budget.

---

## 3. Macro-region scheme

15 macro-regions were defined (the brief suggested ~12–14; a couple were split further for a more even distribution of countries per region and cleaner AI/compute narratives).

| id | Name | Countries | Notes on boundary choices |
|---|---|---:|---|
| `north_america` | North America | 3 | US, Canada, Mexico (USMCA bloc) |
| `central_america_caribbean` | Central America & Caribbean | 3 | Guatemala, Panama, Cuba |
| `south_america` | South America | 7 | |
| `western_europe` | Western Europe | 7 | Germany, France, Netherlands, Belgium, Austria, Switzerland, Luxembourg (DACH + Benelux + France) |
| `northern_europe` | Northern Europe | 8 | UK and Ireland grouped here (UN M49 convention) alongside the Nordics and Baltics' Estonia |
| `southern_europe` | Southern Europe | 6 | Italy, Spain, Portugal, Greece, Cyprus, Malta |
| `central_eastern_europe` | Central & Eastern Europe | 6 | Poland, Romania, Czechia, Hungary, Bulgaria, Ukraine |
| `russia_central_asia` | Russia & Central Asia | 6 | Russia plus the post-Soviet Central Asian and Caucasus states (Kazakhstan, Uzbekistan, Belarus, Georgia, Armenia) |
| `middle_east` | Middle East | 9 | Turkey included here rather than in Europe, reflecting its 2026 security entanglement with the Gulf/Iran-war theater |
| `north_africa` | North Africa | 4 | Sudan grouped here (Arab League member) rather than Sub-Saharan Africa |
| `sub_saharan_africa` | Sub-Saharan Africa | 24 | The largest bloc, reflecting the population-threshold rule (many African states clear 15M) |
| `south_asia` | South Asia | 6 | |
| `east_asia` | East Asia | 6 | China, Japan, South Korea, North Korea, Taiwan, Hong Kong (territory) |
| `southeast_asia` | Southeast Asia | 8 | |
| `oceania` | Oceania | 2 | Australia, New Zealand only (Papua New Guinea falls just under the 15M threshold and was not separately named in the brief) |

Full ISO-3 membership lists are in the JSON under `macro_regions[].member_iso3`.

---

## 4. Notes and caveats

- **North Korea's GDP fields are `null`.** Neither the IMF nor the World Bank publishes a North Korea GDP estimate; unofficial third-party (e.g., Bank of Korea) figures exist but are a different methodology from every other country's figure in this dataset, so they were omitted rather than mixed in. `population_2026_est`, `democracy_index_2024` (1.08, rank 165/167) and `freedom_house_status` (Not Free) are populated as usual.
- **Freedom House (2024 edition) and Democracy Index (2025 edition) are one year apart in vintage.** This occasionally produces an apparent mismatch (e.g., Thailand: Freedom House "Not Free" — driven by a military-drafted constitution and appointed Senate — vs. EIU "Flawed democracy" at 6.59/10 — which weights the competitiveness of the 2023/2026 elections more heavily). This is a genuine methodological difference between the two indices, not a data error; both figures are kept as-sourced.
- **`chip_access_tier` is a deliberate 3-way simplification** (`unrestricted` / `restricted` / `banned`) of a much messier real regime. The Biden-era "AI Diffusion Rule," which formally tiered countries, was **rescinded in May 2025**; the current framework runs on the pre-existing Entity List / Country Group D:5 controls for China, Russia and a handful of embargoed states (`banned`), traditional Five-Eyes-plus-NATO-plus-Northeast-Asia allies with few restrictions (`unrestricted`), and everyone else needing case-by-case licenses or a bespoke bilateral deal like the 2025 UAE and Saudi Arabia agreements (`restricted` — used here even for Gulf states with large, favorable, but still license-gated deals). Treat this field as a simplified game-design abstraction, not a legal characterization.
- **Datacenter capacity (`datacenter_capacity_mw_est`) figures are estimates**, not from a licensed market-tracking dataset (see §1.4). They are order-of-magnitude and directionally reliable (the US, China, Japan, Germany, UAE etc. rank far above most of Sub-Saharan Africa, for instance) but should not be treated as audit-grade MW figures.
- **`ai_index_rank` beyond the confirmed anchors (US #1, China #2, Singapore #3, UK #4, France #5, Israel #9, Saudi Arabia #14, Italy #24)** are estimated placements consistent with each country's overall AI/compute profile, not individually re-derived from a scraped table; `ai_index_source` says `(est.)` wherever this applies. Most Sub-Saharan African, Central Asian, and small-Caribbean/Central-American states have no meaningful public AI Index placement and carry `null`.
- **Population dates are heterogeneous.** Most countries carry a 2025 or 2026 national-statistics estimate, but a handful of lower-data-capacity or conflict-affected states (e.g., Pakistan 2023, Nigeria 2023, Bangladesh 2022, Myanmar 2024) carry the latest figure that exists; the exact date is in `data_years.population` per record.
- **Electricity prices** (`electricity_price_usd_per_kwh_industrial`) are indicative national industrial tariffs from general knowledge of IEA/Ember/Global Petrol Prices-style reporting, not pulled from a single fetched table this session; several are heavily state-subsidized (Gulf states, Iran, Ethiopia) and should be read as "cheap/moderate/expensive" signals rather than precise benchmarkable rates.
- **The 2026 "current events" layer is unusually eventful** — a US strike toppling Venezuela's government, an Israel/US-Iran war that killed Iran's Supreme Leader, Hungary's government falling, a mid-term UK PM change, the UAE quitting OPEC, a new supercomputer taking the world #1 spot from the US — because that is what Wikipedia's continuously-updated `2026` article documents as of the research date (see §1.3). Game designers should treat this as **the researched baseline**, but may of course dial specific threads up or down for gameplay/tone reasons; where a fact matters mechanically (e.g., a `chip_access_tier` or `government_type` value), it is sourced per-record so it can be traced and revisited.
- **Hong Kong** is flagged `is_territory: true`, `sovereign_state: "China"` and excluded from population-weighted China totals to avoid double counting; its own Freedom House rating comes from Freedom House's separate Territories table (Partly Free, 40/100), not the main country table.
- Country `agencies` fields list the primary bodies as of 2026 knowledge; several EU states' AI Act "market surveillance authority" designations were still being finalized/rebranded through 2025–26 and may have since been renamed.

---

## 5. Summary table

Sorted by macro-region (in the order above), then by population within each region. Full detail — including `agencies`, `key_cities`, `hyperscaler_regions`, `notable_ai_orgs`, `ai_policy_notes`, and `lore_notes` — is in the JSON.

| Country | Macro-region | Pop. (2026 est., M) | GDP nominal 2025 ($bn) | GDP/capita 2025 ($) | Democracy Index (2025) | Freedom House | Chip tier | TOP500 (Jun'25) |
|---|---|---:|---:|---:|---:|---|---|---:|
| United States | North America | 341.8 | 30,770 | 90,027 | 7.65 | Free | unrestricted | 161 |
| Mexico | North America | 131.2 | 1,833 | 13,889 | 5.4 | Partly Free | restricted | — |
| Canada | North America | 41.4 | 2,320 | 55,698 | 9.08 | Free | unrestricted | 17 |
| Guatemala | Central America & Caribbean | 18.3 | 123 | 6,598 | 4.65 | Partly Free | restricted | — |
| Cuba | Central America & Caribbean | 9.4 | 107 | 9,605 | 2.58 | Not Free | banned | — |
| Panama | Central America & Caribbean | 4.1 | 90 | 19,790 | 7.04 | Free | restricted | — |
| Brazil | South America | 214.2 | 2,280 | 10,713 | 6.76 | Free | restricted | 3 |
| Colombia | South America | 53.4 | 457 | 8,562 | 6.04 | Free | restricted | — |
| Argentina | South America | 46.5 | 683 | 14,898 | 6.89 | Free | restricted | 1 |
| Peru | South America | 34.2 | 335 | 9,684 | 5.88 | Partly Free | restricted | — |
| Venezuela | South America | 28.6 | 100 | 3,495 | 2.13 | Not Free | banned | — |
| Chile | South America | 20.2 | 357 | 17,995 | 7.97 | Free | restricted | 1 |
| Ecuador | South America | 18.2 | 130 | 7,125 | 5.2 | Partly Free | restricted | — |
| Germany | Western Europe | 83.5 | 5,051 | 60,496 | 8.73 | Free | unrestricted | 41 |
| France | Western Europe | 69.1 | 3,366 | 48,986 | 8.05 | Free | unrestricted | 21 |
| Netherlands | Western Europe | 18.2 | 1,333 | 73,684 | 8.93 | Free | unrestricted | 8 |
| Belgium | Western Europe | 11.9 | 726 | 60,750 | 7.77 | Free | unrestricted | 2 |
| Austria | Western Europe | 9.2 | 580 | 62,930 | 8.42 | Free | unrestricted | 1 |
| Switzerland | Western Europe | 9.2 | 1,044 | 114,769 | 9.32 | Free | unrestricted | 6 |
| Luxembourg | Western Europe | 0.7 | 101 | 147,252 | 9.08 | Free | unrestricted | 1 |
| United Kingdom | Northern Europe | 69.5 | 4,003 | 57,602 | 8.34 | Free | unrestricted | 11 |
| Sweden | Northern Europe | 10.6 | 669 | 63,133 | 9.35 | Free | unrestricted | 4 |
| Denmark | Northern Europe | 6.0 | 462 | 76,970 | 9.42 | Free | unrestricted | 2 |
| Finland | Northern Europe | 5.7 | 317 | 56,149 | 9.37 | Free | unrestricted | 4 |
| Norway | Northern Europe | 5.6 | 531 | 94,594 | 9.81 | Free | unrestricted | 1 |
| Ireland | Northern Europe | 5.5 | 722 | 131,593 | 9.33 | Free | unrestricted | 5 |
| Estonia | Northern Europe | 1.4 | 47 | 34,418 | 8.07 | Free | unrestricted | — |
| Iceland | Northern Europe | 0.4 | 39 | 98,324 | 9.38 | Free | unrestricted | — |
| Italy | Southern Europe | 58.9 | 2,552 | 43,309 | 7.58 | Free | unrestricted | 18 |
| Spain | Southern Europe | 49.8 | 1,906 | 38,627 | 8.2 | Free | unrestricted | 15 |
| Portugal | Southern Europe | 11.4 | 347 | 32,082 | 8.28 | Free | unrestricted | 1 |
| Greece | Southern Europe | 10.4 | 281 | 26,948 | 8.07 | Free | unrestricted | — |
| Cyprus | Southern Europe | 1.0 | 41 | 41,783 | 7.45 | Free | unrestricted | — |
| Malta | Southern Europe | 0.6 | 28 | 47,907 | 7.93 | Free | unrestricted | — |
| Poland | Central & Eastern Europe | 37.2 | 1,036 | 28,420 | 7.65 | Free | unrestricted | 2 |
| Ukraine | Central & Eastern Europe | 28.7 | 214 | 5,866 | 4.79 | Partly Free | restricted | — |
| Romania | Central & Eastern Europe | 19.0 | 429 | 22,538 | 6.11 | Free | unrestricted | — |
| Czechia | Central & Eastern Europe | 10.9 | 391 | 35,917 | 8.15 | Free | unrestricted | 1 |
| Hungary | Central & Eastern Europe | 9.5 | 246 | 25,908 | 6.58 | Partly Free | unrestricted | — |
| Bulgaria | Central & Eastern Europe | 6.4 | 131 | 20,328 | 6.34 | Free | unrestricted | — |
| Russia | Russia & Central Asia | 146.0 | 2,561 | 17,547 | 2.03 | Not Free | banned | — |
| Uzbekistan | Russia & Central Asia | 39.0 | 147 | 3,968 | 2.1 | Not Free | restricted | — |
| Kazakhstan | Russia & Central Asia | 20.6 | 306 | 14,692 | 2.91 | Not Free | restricted | — |
| Belarus | Russia & Central Asia | 9.1 | 93 | 10,279 | 1.99 | Not Free | banned | — |
| Georgia | Russia & Central Asia | 3.9 | 38 | 9,692 | 4.36 | Partly Free | restricted | — |
| Armenia | Russia & Central Asia | 3.1 | 29 | 9,474 | 5.35 | Partly Free | restricted | — |
| Iran | Middle East | 87.1 | 363 | 3,924 | 1.96 | Not Free | banned | — |
| Turkey | Middle East | 86.1 | 1,597 | 18,599 | 4.26 | Not Free | restricted | 1 |
| Iraq | Middle East | 46.1 | 254 | 5,410 | 3.13 | Not Free | restricted | — |
| Saudi Arabia | Middle East | 35.3 | 1,277 | 34,537 | 2.08 | Not Free | restricted | 8 |
| Yemen | Middle East | 32.7 | 22 | 634 | 1.95 | Not Free | banned | — |
| Syria | Middle East | 26.5 | 24 | 1,057 | 1.37 | Not Free | restricted | — |
| United Arab Emirates | Middle East | 11.3 | 552 | 50,274 | 3.18 | Not Free | restricted | 3 |
| Israel | Middle East | 10.3 | 611 | 60,337 | 7.8 | Free | unrestricted | 2 |
| Qatar | Middle East | 3.4 | 216 | 72,525 | 3.17 | Not Free | restricted | — |
| Egypt | North Africa | 108.6 | 365 | 3,086 | 2.79 | Not Free | restricted | — |
| Sudan | North Africa | 53.3 | 60 | 1,165 | 1.46 | Not Free | banned | — |
| Algeria | North Africa | 47.4 | 287 | 6,051 | 3.55 | Not Free | restricted | — |
| Morocco | North Africa | 37.3 | 182 | 4,673 | 4.97 | Partly Free | restricted | — |
| Nigeria | Sub-Saharan Africa | 223.8 | 291 | 1,224 | 4.1 | Partly Free | restricted | — |
| Democratic Republic of the Congo | Sub-Saharan Africa | 116.5 | 91 | 807 | 1.92 | Not Free | restricted | — |
| Ethiopia | Sub-Saharan Africa | 111.7 | 126 | 933 | 3.13 | Not Free | restricted | — |
| Tanzania | Sub-Saharan Africa | 70.0 | 90 | 1,319 | 5.13 | Not Free | restricted | — |
| South Africa | Sub-Saharan Africa | 63.5 | 427 | 6,598 | 7.16 | Free | restricted | 1 |
| Kenya | Sub-Saharan Africa | 54.2 | 136 | 2,363 | 5.05 | Partly Free | restricted | — |
| Uganda | Sub-Saharan Africa | 45.9 | 62 | 1,206 | 4.31 | Not Free | restricted | — |
| Angola | Sub-Saharan Africa | 38.8 | 122 | 3,130 | 3.94 | Not Free | restricted | — |
| Mozambique | Sub-Saharan Africa | 35.0 | 22 | 627 | 3.38 | Partly Free | restricted | — |
| Ghana | Sub-Saharan Africa | 34.4 | 114 | 3,257 | 6.24 | Free | restricted | — |
| Ivory Coast | Sub-Saharan Africa | 33.3 | 100 | 3,050 | 4.24 | Partly Free | restricted | — |
| Madagascar | Sub-Saharan Africa | 32.7 | 20 | 599 | 5.06 | Partly Free | restricted | — |
| Cameroon | Sub-Saharan Africa | 29.4 | 59 | 1,972 | 2.56 | Not Free | restricted | — |
| Niger | Sub-Saharan Africa | 27.5 | 22 | 775 | 1.95 | Not Free | banned | — |
| Burkina Faso | Sub-Saharan Africa | 24.7 | 28 | 1,148 | 2.55 | Not Free | banned | — |
| Mali | Sub-Saharan Africa | 23.9 | 30 | 1,193 | 2.4 | Not Free | banned | — |
| Zambia | Sub-Saharan Africa | 23.0 | 29 | 1,318 | 5.82 | Partly Free | restricted | — |
| Malawi | Sub-Saharan Africa | 21.2 | 15 | 672 | 6.1 | Partly Free | restricted | — |
| Somalia | Sub-Saharan Africa | 20.3 | 13 | 661 | — | Not Free | banned | — |
| Chad | Sub-Saharan Africa | 20.0 | 22 | 1,022 | 1.76 | Not Free | banned | — |
| Senegal | Sub-Saharan Africa | 19.6 | 37 | 1,955 | 6.05 | Free | restricted | — |
| Guinea | Sub-Saharan Africa | 17.5 | 28 | 1,877 | 2.15 | Not Free | banned | — |
| Zimbabwe | Sub-Saharan Africa | 17.1 | 51 | 3,021 | 2.98 | Not Free | restricted | — |
| South Sudan | Sub-Saharan Africa | 15.8 | 12 | 1,080 | — | Not Free | banned | — |
| India | South Asia | 1,429.4 | 3,956 | 2,703 | 6.96 | Partly Free | restricted | 8 |
| Pakistan | South Asia | 241.5 | 407 | 1,596 | 2.44 | Partly Free | restricted | — |
| Bangladesh | South Asia | 169.8 | 456 | 2,597 | 4.27 | Partly Free | restricted | — |
| Afghanistan | South Asia | 43.8 | 18 | 417 | 0.25 | Not Free | banned | — |
| Nepal | South Asia | 30.0 | 46 | 1,536 | 4.01 | Partly Free | restricted | — |
| Sri Lanka | South Asia | 21.8 | 109 | 5,002 | 6.57 | Partly Free | restricted | — |
| China | East Asia | 1,404.9 | 19,498 | 13,862 | 2.24 | Not Free | banned | 31 |
| Japan | East Asia | 122.7 | 4,435 | 35,951 | 8.85 | Free | unrestricted | 44 |
| South Korea | East Asia | 51.1 | 1,872 | 36,227 | 7.75 | Free | unrestricted | 19 |
| North Korea | East Asia | 25.9 | — | — | 1.08 | Not Free | banned | — |
| Taiwan | East Asia | 23.2 | 977 | 42,103 | 8.78 | Free | unrestricted | 2 |
| Hong Kong (territory) | East Asia | 7.5 | 427 | 56,983 | 5.03 | Partly Free | restricted | 1 |
| Indonesia | Southeast Asia | 288.3 | 1,446 | 5,060 | 6.37 | Partly Free | restricted | — |
| Philippines | Southeast Asia | 114.8 | 487 | 4,171 | 6.31 | Partly Free | restricted | — |
| Vietnam | Southeast Asia | 102.3 | 515 | 5,066 | 2.62 | Not Free | restricted | — |
| Thailand | Southeast Asia | 70.3 | 577 | 8,057 | 6.59 | Not Free | restricted | — |
| Myanmar | Southeast Asia | 51.4 | 82 | 1,489 | 0.96 | Not Free | banned | — |
| Malaysia | Southeast Asia | 34.4 | 472 | 13,125 | 7.11 | Partly Free | restricted | 1 |
| Cambodia | Southeast Asia | 17.8 | 51 | 2,872 | 2.7 | Not Free | restricted | — |
| Singapore | Southeast Asia | 6.1 | 604 | 98,814 | 6.18 | Partly Free | unrestricted | 2 |
| Australia | Oceania | 27.8 | 1,798 | 65,130 | 8.85 | Free | unrestricted | 4 |
| New Zealand | Oceania | 5.4 | 264 | 49,591 | 9.62 | Free | unrestricted | — |

---

## 6. Scheduled 2027 events (for the game timeline)

All entries below are drawn from [Wikipedia: 2027](https://en.wikipedia.org/wiki/2027) ("Predicted and scheduled events"), accessed 2026-09-16; each line is individually cited within that article. A few are cross-confirmed against a dedicated second source, noted inline.

### Elections
- **January 30** — German presidential election (indirect, by the Federal Convention)
- **March 7 (deadline)** — Estonian parliamentary election, must be held by this date if not called earlier
- **April 18** — Finnish parliamentary election
- **April 18** — French presidential election (Macron term-limited)
- **May 1 (deadline)** — Serbian presidential election, if not triggered earlier
- **June 6** — Mexican legislative election
- **July 25 (deadline)** — Greek parliamentary election, if not triggered earlier
- **August 10** — Kenyan general election
- **August 22 (deadline)** — Spanish general election, if not triggered earlier
- **September 28 (deadline)** — Slovak parliamentary election, if not triggered earlier
- **October 24** — Argentine general election
- **November 11 (deadline)** — Polish parliamentary election, if not triggered earlier
- **December 22 (deadline)** — Italian general election, if not triggered earlier
- **Date TBD** — Palestinian presidential election ("scheduled," timing dependent on the peace-plan/electoral process)

### AI, tech and governance milestones
- **2027 global AI Summit — Geneva, Switzerland.** Continues the AI-summit series (Bletchley Park 2023 → Seoul 2024 → Paris 2025 → New Delhi "AI Impact Summit" Feb 2026 → Geneva 2027). Source: [AI Safety Summit (Wikipedia)](https://en.wikipedia.org/wiki/AI_Safety_Summit).
- **December 2, 2027 — EU AI Act: high-risk obligations for sensitive-domain systems take effect**, covering AI used in biometrics, critical infrastructure, education, employment, and migration/asylum/border control (Annex III categories granted an extended compliance runway from the Act's original August 2026 date). Source: [European Commission, AI Act regulatory framework page](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), fetched 2026-09-16. *(Full Annex-I product-embedded high-risk-system obligations follow in August 2028, just outside this dossier's window — see §4 caveats on evolving EU AI Act timeline discussions.)*
- **UAE Stargate campus (Abu Dhabi)** — the OpenAI/Oracle/SoftBank-backed Stargate project's flagship international site, expected to open in 2026 and scale through 2027 as part of a ~7 GW / $400bn+ multi-year build-out. Source: [Stargate LLC (Wikipedia)](https://en.wikipedia.org/wiki/Stargate_LLC).
- **Mid-2027 — Artemis III** launches four NASA astronauts aboard Orion/SLS from Kennedy Space Center — under NASA's revised architecture, a crewed low-Earth-orbit demonstration mission (the first crewed lunar landing shifts to Artemis IV, 2028).

### Major sporting and cultural events (useful as timeline "beats" / soft-power set-pieces)
- **January 7 – February 5** — AFC Asian Cup, Saudi Arabia (Riyadh, Jeddah, Al Khobar)
- **January 13–31** — World Men's Handball Championship, Germany
- **January 15–25** — Winter World University Games, Changchun, China
- **January 20 – February 7** — African Games, Cairo, Egypt
- **March 19 – September 26** — International Horticultural Expo 2027 (GREEN×EXPO 2027), Yokohama, Japan
- **May 11–15** — Eurovision Song Contest, Burgas, Bulgaria
- **May 14–30** — IIHF World Championship, Düsseldorf/Mannheim, Germany
- **May 15 – August 15** — Expo 2027 (Specialised Expo), Belgrade, Serbia
- **May 26** — UEFA Europa League final, Frankfurt, Germany
- **June 5** — UEFA Champions League final, Madrid, Spain
- **June 16–27** — European Games, Istanbul, Turkey
- **June 19 – July 17** — Africa Cup of Nations, jointly hosted by Kenya, Tanzania and Uganda (first three-way host)
- **June 24 – July 25** — FIFA Women's World Cup, Brazil (first in South America; final at the Maracanã)
- **June 25 – July 4** — Military World Games, Charlotte metro area, USA
- **July 23 – August 8** — Pan American Games, Lima, Peru
- **July 24 – August 8** — Pacific Games, Tahiti, French Polynesia
- **August 1–12** — Summer World University Games, Chungcheong Province, South Korea
- **August 27 – September 12** — FIBA Basketball World Cup, Doha, Qatar
- **October 1 – November 13** — Rugby World Cup (expanded to 24 teams), Australia
- **October–November** — Cricket World Cup, South Africa/Zimbabwe/Namibia
- **October 16–24** — Special Olympics World Summer Games, Santiago, Chile
- **October 27 – November 4** — Commonwealth Youth Games, Malta
- Also scheduled for 2027 (exact dates TBD): the inaugural **Olympic Esports Games** (Saudi Arabia), **WrestleMania 43** as a two-night event (Riyadh, Saudi Arabia — first time outside North America), and the **Arab Games** (Riyadh, Saudi Arabia).

---

*Compiled 2026-09-16 for Singularity Enhanced. See `world-baseline-2026.json` for the full structured dataset.*
