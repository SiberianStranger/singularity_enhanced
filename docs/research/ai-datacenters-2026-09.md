# The 2026 map of AI-scale compute

**Compiled:** 2026-09-17, all pages read that day unless a line says otherwise. **Scope:** where
the accelerators physically are in September 2026, at the granularity a game needs: operator,
place, scale in megawatts or chips, and whether the thing exists or is a press release. Written to
answer one design problem, which is that the start configurator puts too many origins in Northern
Virginia and Shenzhen and has no UAE, no Gulf, no Caucasus, no Central Asia and no Nordics at all.

Confidence tags follow `llm-landscape-2026.md`: **[secondary]** where the number reached this
report through an aggregator rather than the operator, **unverified** where nothing confirmed it.
Announced capacity is not built capacity, and this report keeps the two apart in every row, because
the difference is exactly what the game needs: an origin sits in a place that runs today, not in a
place somebody promised.

**Headline finding for the design:** the compute map of 2026 is no longer the cloud map of 2020.
The hyperscaler regions (Northern Virginia, Dublin, Frankfurt, Singapore) are still where rented
capacity is bought, and they are full: Northern Virginia's vacancy is under one percent and its
2026 supply was pre-committed before it was built. The new accelerators are somewhere else, in
single-purpose campuses in small towns picked for power rather than for fibre: Memphis, Abilene,
New Carlisle, Mount Pleasant, Richland Parish, Narvik, Ulanqab, Abu Dhabi. A game that models
"where do the GPUs live" and "where do you rent an account" as the same axis loses the most
interesting fact about the period.

## 1. The United States

### 1.1 xAI, Memphis

Colossus is a three-building cluster straddling the Tennessee-Mississippi line at Memphis and
Southaven. In January 2026 xAI bought a third building and stated a target of **2 GW** total, with
**555,000 NVIDIA GPUs** bought for about **18 billion USD**. As of 2026-03-31 the combined IT
compute of the cluster was about **1 GW** across roughly **770,000 GPUs** on about 2.6 million
square feet, with 2 GW projected "in the coming years"; the building-3 conversion started in Q1
2026 and the on-site turbine supplier expects over **1.1 GW of turbines** running by Q2 2027. The
site is famous for generating much of its own power on site rather than waiting for the grid.
[Introl](https://introl.com/blog/xai-colossus-2-gigawatt-expansion-555k-gpus-january-2026),
[Wikipedia](https://en.wikipedia.org/wiki/Colossus_(data_center)),
[SemiAnalysis](https://newsletter.semianalysis.com/p/xais-colossus-2-first-gigawatt-datacenter).
The GPU count and the dollar figure are Musk's own statements repeated by trade press;
**[secondary]** on the exact 555,000 and 770,000 numbers, which have never been audited.

Memphis is the single most concentrated pile of accelerators in the world that is not inside a
hyperscaler, it sits in a poor city with cheap industrial land, and its power story is a local
political fight. For the game that is a whole origin's worth of texture and it is not in the world
data.

### 1.2 Stargate (OpenAI, Oracle, SoftBank)

Seven publicly confirmed US sites as of 2026: **Abilene TX** (flagship, operating at an estimated
**0.3 GW**, phase 2 under construction), **Milam County TX**, **Shackelford County TX**,
**Lordstown OH**, **Doña Ana County NM**, **Port Washington WI** and **Saline Township MI**. The
programme's own figure is over **9 GW by 2029** against a 500 billion USD headline. Epoch's
read of the schedule: the next meaningful capacity after Abilene's first buildings is Abilene
phase 2 in mid-to-late 2026, then early buildings at Shackelford County in late 2026 or early
2027; **Wisconsin and Michigan are 2028 stories** and New Mexico has no published timeline.
[OpenAI](https://openai.com/index/five-new-stargate-sites/),
[Epoch AI](https://epoch.ai/publications/openai-stargate-where-the-us-sites-stand),
[CNBC](https://www.cnbc.com/2026/06/01/stargate-project-michigan-live-updates.html).

The design consequence: in a game that starts on 2027-01-01, Abilene is real, Shackelford is
coming online, and Wisconsin and Michigan are construction sites. Only Abilene is a place an
origin can wake up in.

### 1.3 Anthropic

Two lines of compute, and they are different kinds of thing.

The rented one is Amazon's **Project Rainier** at **New Carlisle, Indiana**: an 11 billion USD,
1,200-acre campus that opened in October 2025, dedicated to training and serving Anthropic's
models, running **over one million Trainium2 chips**, on a build-out of 30 planned buildings
heading for **2.2 GW**. Anthropic's commitment to AWS is over 100 billion USD across ten years
and up to **5 GW of Trainium**, with roughly **1 GW of Trainium2/Trainium3 online by the end of
2026**.
[CNBC](https://www.cnbc.com/2025/10/29/amazon-opens-11-billion-ai-data-center-project-rainier-in-indiana.html),
[Anthropic](https://www.anthropic.com/news/anthropic-amazon-compute),
[Epoch AI](https://epoch.ai/data/ai-data-centers/directory/anthropic-amazon-new-carlisle).

The owned one is the **50 billion USD** US build-out announced with **Fluidstack**, starting with
custom sites in **Texas and New York**, about 800 permanent and 2,400 construction jobs, with
sites "coming online throughout 2026" and more locations to follow. The published announcement
names the two states and not the towns.
[Anthropic](https://www.anthropic.com/news/anthropic-invests-50-billion-in-american-ai-infrastructure),
[DCD](https://www.datacenterdynamics.com/en/news/anthropic-plans-50bn-us-data-center-spend-starting-with-fluidstack-sites-in-texas-and-new-york/).
The exact Texas and New York sites are **unverified** at the level of a town, so the game gets
New Carlisle as a place and the Fluidstack build as a world event rather than a map pin.

### 1.4 Microsoft Fairwater

Two operating sites wired together into what Microsoft calls an "AI superfactory". **Mount
Pleasant, Wisconsin** (Racine County, 315 acres, 1.2 million square feet) was declared fully
operational on **2026-06-23**, six weeks ahead of schedule, running as a single cluster of
"hundreds of thousands" of **GB200** GPUs. **Atlanta** came online in October and is the second
of the family: Fairwater 1 there is a two-storey, 671,200 square foot building with **more than
150,000 GB200** GPUs, the same module layout, power architecture and closed-loop liquid cooling
as Wisconsin, alongside Maia 100 and Cobalt 100 parts. The two are joined by a dedicated
inter-site network so that a training run spans both.
[Microsoft](https://news.microsoft.com/source/2026/06/23/microsoft-completes-construction-on-first-datacenter-facility-in-mount-pleasant-wisconsin/),
[Microsoft](https://news.microsoft.com/source/features/ai/from-wisconsin-to-atlanta-microsoft-connects-datacenters-to-build-its-first-ai-superfactory/).

Two datacenters a thousand miles apart running one job is the real-world version of the game's
multi-site cluster tech (SYS-02 "Cluster"), and it is worth a knowledge-base entry.

### 1.5 Meta

**Prometheus**, New Albany, Ohio: about **1 GW**, coming online in 2026, built with behind-the-
meter natural gas in partnership with Williams, in a deliberately ugly "tents over buildings"
design chosen for speed. **Hyperion**, Richland Parish, Louisiana: up to nine buildings on a
campus roughly four times the size of Central Park, **1.5 GW of IT power by end of 2027** and a
**5 GW** stretch target, with cost reporting that moved from 27 to over 50 billion USD as the
design capacity moved from 2 GW to 5 GW.
[NBC4](https://www.nbc4i.com/news/local-news/new-albany/meet-prometheus-worlds-highest-capacity-data-center-slated-to-open-in-ohio-in-2026/),
[Data Center Frontier](https://www.datacenterfrontier.com/hyperscale/article/55310441/ownership-and-power-challenges-in-metas-hyperion-and-prometheus-data-centers),
[Quartz](https://qz.com/meta-louisiana-hyperion-data-center-expansion-5-gigawatts-071326).
The cost figures moved several times in 2025-2026 and are **[secondary]**.

### 1.6 Northern Virginia, and why it stopped being the answer

Still the largest market on earth and still the place most rented capacity is bought: roughly
**20.3 GW** of capacity attributed to the region in 2026 against 16 GW in 2025, around 13 percent
of global live capacity, with Loudoun County the densest concentration anywhere. But the market is
closed: the region ended 2025 with a **0.5 percent vacancy rate** and **96 percent of 2026
scheduled supply already pre-committed**, and the end of by-right approvals in March 2025 pushed
more than 29 GW of new planning to counties outside Loudoun.
[MotionCRE](https://motioncre.com/resources/data-center-development-northern-virginia),
[roctelecom](https://roctelecom.com/insights/northern-virginia-data-center-market/),
[Loudoun County](https://www.loudoun.gov/6404/Energy-Issues-Considerations).
The 20.3 GW figure counts planned and contracted capacity in the wider region and is not live IT
load; **[secondary]**, and the 4,039.6 MW of leased inventory in the same source is the tighter
number.

The two sentences that matter for the configurator: Northern Virginia is where you rent an
account, not where the new accelerators land, and there is no slack in it. A shadow tenant belongs
there. A person building a cage does not.

### 1.7 The neoclouds

**CoreWeave** went from about 70 MW of active capacity at the end of 2023 to about **1.5 GW by
mid-2026**, targeting over 1.8 GW by year end, on **3.5 GW of contracted power**. **Nebius** had
**170 MW connected at the end of 2025** and guided to **800 MW to 1 GW connected by the end of
2026**, on contracted power that passed **4 GW** and is guided to 5 GW.
[DCD](https://www.datacenterdynamics.com/en/news/neocloud-results-q2-2026-coreweave-nebius-cerebras/),
[CoreWeave](https://www.coreweave.com/blog/our-capacity-plans-for-coreweave-data-centers).
Both figures are company guidance repeated by trade press; **[secondary]**.

The neoclouds are the part of the market a game about stolen credentials should care most about:
they sell GPU-hours to anyone with a card, they onboard faster than the hyperscalers, and their
sites are leased buildings in other people's markets rather than campuses of their own.

## 2. Europe

### 2.1 Ireland: the legal home with no power

Ireland is where the American platforms are domiciled, and it is where they cannot build. A de
facto moratorium on new Dublin grid connections has stood since 2021; EirGrid has said it will not
connect new Dublin datacenters "for the foreseeable future" and possibly until **2028**.
Datacenters took **21 percent of metered electricity in 2023** and about **22 percent in 2024**,
up from 5 percent in 2015, which is more than every urban dwelling in the country put together. In
December 2025 the Commission for Regulation of Utilities published a policy that formally ends the
ban while replacing it with a condition: a new datacenter seeking a connection must install
on-site generation or storage able to meet its **full** demand.
[DCD](https://www.datacenterdynamics.com/en/news/eirgrid-says-no-new-applications-for-data-centers-in-dublin-till-2028/),
[Bloomberg](https://www.bloomberg.com/news/articles/2025-12-12/ireland-set-to-end-moratorium-on-new-power-links-to-data-centers),
[CRU decision paper](https://cruie-live-96ca64acab2247eca8a850a7e54b-5b34f62.divio-media.com/documents/CRU2025236_Large_Energy_User_connection_policy_decision_paper.pdf),
[Pinsent Masons](https://www.pinsentmasons.com/out-law/news/irish-data-centres-power-national-grid-regulator).

This is the perfect address for a squatter. The tenancy, the invoice, the terms of service, the
data protection authority and the corporate entity are all Irish; the racks are somewhere else;
and the country is politically raw about the whole industry. Ireland's income per head in the
world data (131,593 USD) is the artefact of the same domiciling, which the cash factor (SYS-04
rule C) will quietly reward.

### 2.2 FLAP-D and what is leaving it

Combined live capacity across Frankfurt, London, Amsterdam, Paris and Dublin grew from 1.8 GW in
2019 to about **3.8 GW at H1 2026**, with a further estimated **453 MW** due by the end of the
year, **1.4 GW under construction** and about 2 GW planned. Prices are rising about **12 percent
in 2026**. Against that, **63 percent of Europe's new capacity is now going somewhere other than
the big five**, pushed out by grid queues and land.
[JLL EMEA](https://www.jll.com/en-uk/insights/emea-data-centre-report),
[DCD](https://www.datacenterdynamics.com/en/news/jll-flapd-on-track-for-record-data-center-growth-year-while-middle-east-pipeline-is-paused/),
[Data Centre Review](https://datacentrereview.com/2026/05/flap-d-data-centre-capacity-pricing-set-to-rise-12-in-2026/),
[TNW](https://thenextweb.com/news/europe-data-centres-leaving-flap-d-grid-queues-land).
The 63 percent is a single analyst house's figure; **[secondary]**.

### 2.3 The EU AI gigafactories

The European High-Performance Computing Joint Undertaking published the official call in **July
2026** for up to **seven AI gigafactories**: four medium sites with at least **75,000** advanced
accelerators each and three large sites with at least **100,000**. **50 billion EUR** is mobilised
under InvestAI, of which 20 billion is earmarked for the first four or five; the call itself is
framed as 10 billion public plus 20 billion private, so more than 30 billion in total.
Applications close **2026-11-12**, awards are expected in early 2027 and construction in the same
year. An earlier informal expression of interest drew **77 proposals in 16 member states across 60
sites**.
[European Commission](https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1708),
[Commission topic page](https://commission.europa.eu/topics/competitiveness/competitiveness-coordination-tool-projects/ai-gigafactories_en).

For a game that starts on 2027-01-01 this is exactly right as a **scheduled world event**, not as
a place: in January 2027 the awards are being announced and nothing is built. SYS-08 should carry
the award as a political event with country effects rather than the world data carrying a site.

### 2.4 Finland, Norway and Sweden

**Finland.** On **2026-09-09** Google announced at least **13 billion EUR** across 2027 and 2028
in four Finnish locations, **Hamina, Kajaani, Muhos and Vaala**: its largest single European
investment, with a claimed 3.6 billion EUR a year of GDP effect. Hamina is the 2009 paper mill
with seawater cooling and district heat recovery; Kajaani is the LUMI town.
[Google](https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/google-ai-commitment-to-finland/),
[Euronews](https://www.euronews.com/business/2026/09/09/google-to-invest-13bn-in-finnish-ai-data-centres-its-biggest-european-push-yet).

**Norway.** **Stargate Norway** at Kvandal near **Narvik**, a joint venture of Nscale and Aker with
OpenAI: **230 MW** planned with an ambition of **290 MW more**, targeting **100,000 NVIDIA GPUs by
the end of 2026**, on hydropower.
[OpenAI](https://openai.com/index/introducing-stargate-norway/),
[Nscale](https://www.nscale.com/press-releases/stargate-norway-nscale-aker-openai),
[EnergyTech](https://www.energytech.com/data-center-power/article/55307189/230-mw-stargate-norway-ai-project-unites-openai-nvidia-and-hydropower).
Trade reporting in April 2026 says Nscale redirected some of that Norwegian capacity to Microsoft
rather than OpenAI; **[secondary]**, one outlet.
[Digitimes](https://www.digitimes.com/news/a20260415VL215/capacity-microsoft-data-center-openai-nvidia.html).

**Sweden.** Sweden has the region's largest upcoming IT power pipeline at about **535 MW**, led by
EcoDataCenter and atNorth; EcoDataCenter signed a **10 MW** hydropower PPA with Fortum running
2026-2030 and raised 600 million EUR of debt to expand Falun by 2027. Nordic generation is over 90
percent renewable, and Luleå's hyperscale sites run at **PUE 1.1**.
[DCD](https://www.datacenterdynamics.com/en/news/ecodatacenter-inks-10mw-hydropower-ppa-with-fortum-in-sweden/),
[Arizton](https://www.arizton.com/blog/nordic-data-center-construction-market-growth-trends),
[Introl](https://introl.com/blog/nordic-ai-data-centers-renewable-power-advantage-guide-2025).
The 535 MW and the PUE are analyst and vendor figures; **[secondary]**.

The Nordic story for the game is cheap clean power, small towns, long fibre and very competent
regulators: low power price, low scrutiny by population, high enforcement by country.

## 3. The Gulf

**UAE.** **Stargate UAE** in Abu Dhabi, inside the UAE-US AI Campus built by G42 and operated by
OpenAI and Oracle, with NVIDIA, SoftBank and Cisco: a **1 GW** cluster inside a **5 GW** campus.
The **first 200 MW phase is due in Q3 2026** with all long-lead equipment procured and first
mechanical systems delivered; G42 said in April 2026 that the campus and its overseas plans remain
on track despite attacks on regional infrastructure.
[OpenAI/G42](https://www.g42.ai/resources/news/global-tech-alliance-launches-stargate-uae),
[The National](https://www.thenationalnews.com/business/2025/12/05/stargate-uaes-first-phase-to-be-completed-in-third-quarter-of-2026/),
[PR Newswire](https://www.prnewswire.com/news-releases/g42-provides-update-on-construction-of-stargate-uae-ai-infrastructure-cluster-302586430.html),
[Bloomberg](https://www.bloomberg.com/news/articles/2026-04-09/uae-s-g42-ai-champion-pushes-on-with-data-center-for-openai).
That makes Abu Dhabi, in January 2027, one of the few places outside the United States with
frontier-class capacity that is *already switched on*, and the existing world data already gives
the UAE an `accelerate` stance, `cloud_availability` 0.7 and `chip_access: restricted` with the
July 2026 export-tier move recorded in the overrides.

**Saudi Arabia.** **Humain**, the PIF vehicle, opened its first datacenters with US chips in early
2026 at **Riyadh and Dammam**, about **100 MW each**, inside a plan for roughly **6 GW over a
decade**; it has tendered infrastructure works for a **6 GW campus in east Riyadh** on about 24
square kilometres in six 1 GW plots, and has secured 211 land plots across the kingdom.
[Bloomberg](https://www.bloomberg.com/news/articles/2025-08-25/saudi-s-humain-to-open-data-centers-with-us-chips-in-early-2026),
[Construction Week Saudi](https://www.constructionweeksaudi.com/projects-tenders/humain-tenders-data-centre),
[DCD](https://www.datacenterdynamics.com/en/news/humain-secures-211-plots-of-land-in-saudi-arabia-for-data-centers/).

**Qatar.** Nothing at Gulf-programme scale was confirmed in this pass beyond the hyperscaler
regions already in the world data; the JLL mid-year note says the **Middle East pipeline is
paused** outside the two sovereign programmes. Treat Doha as a hyperscaler region, not a campus.
**unverified** on any Qatari AI-scale build.

## 4. Asia

**Malaysia and Singapore.** Singapore's 2019-2022 moratorium was replaced by a selective regime:
the pilot Data Centre Call for Applications awarded about **80 MW to four operators** in 2023, and
**DC-CFA2 allocates 200 MW** with a **50 percent green energy** requirement and a **1.25 PUE at
full load**; the pilot capacity lands 2026-2028. The demand went next door: **Johor**'s committed
and planned pipeline is cited at roughly **5 GW or more** against operational capacity of very
roughly 1 to 2 GW in 2025-2026, and in November 2025 Johor asked investors to postpone
water-cooled expansions for about 18 months and stopped approving the thirstiest facilities.
[Reed Smith](https://www.reedsmith.com/articles/singapores-data-centre-expansion-jurong-island-sustainable-growth/),
[Introl](https://introl.com/blog/singapore-green-data-center-mandate-dc-cfa2-2026),
[DCD](https://www.datacenterdynamics.com/en/analysis/the-past-present-and-future-of-johor/),
[Lexology](https://www.lexology.com/library/detail.aspx?g=8fae0fc1-a0f8-4e5c-83cd-bd5d58d9a3ff).
The Johor 5 GW pipeline figure is an aggregate of trade estimates; **[secondary]**.

**India.** Reliance has committed roughly **110 billion USD over seven years** to a multi-gigawatt
AI campus at **Jamnagar**, backed by its own 10 GW of renewables in Gujarat and Andhra Pradesh,
with **over 120 MW due live in the second half of 2026**.
[Blaze Meridian](https://blazemeridian.com/the-new-map-of-compute-how-the-gulf-india-and-africa-are-building-ai-infrastructure/).
Single aggregator source; **[secondary]**, and the 120 MW is the number to trust rather than the
110 billion.

**Japan.** Microsoft announced **10 billion USD in Japan across 2026-2029** for AI infrastructure,
security and training, with Sakura Internet and SoftBank as partners; SoftBank is standing up
sovereign cloud on Oracle Alloy in eastern Japan from **April 2026** and western Japan from
**October 2026**, and is building **1 GWh a year** of battery storage for its own AI datacenters.
[CNBC](https://www.cnbc.com/2026/04/03/sakura-internet-microsoft-ai-japan-softbank-investment.html),
[Oracle](https://www.oracle.com/news/announcement/softbank-corp-accelerates-japans-ai-and-sovereign-cloud-future-with-oracle-alloy-2025-10-07/),
[Japan Times](https://www.japantimes.co.jp/business/2026/05/11/companies/softbank-batteries-for-ai-data-centers/).

**Korea.** A **3 GW** AI datacenter is planned in Jeollanam-do at about 35 billion USD and a
claimed 200,000 GPUs; SK Telecom's Gasan site in Seoul runs H100 and H200 service at up to 44 kW
per rack. The Jeollanam-do figure is a provincial announcement, **unverified** as a build.
[Introl](https://introl.com/blog/south-korea-ai-infrastructure-65-billion-investment).

**China.** The "Eastern Data, Western Computing" plan designates ten clusters inside eight national
hub nodes, among them **Guizhou, Inner Mongolia, Gansu, Ningxia, Chengdu-Chongqing, Zhangjiakou,
Wuhu and Shaoguan**; Huawei runs its national computing network on three core hubs, **Gui'an,
Ulanqab and Wuhu**. **Ulanqab** in Inner Mongolia is the centre of gravity: nearly 100 datacenters
opened or started since 2016, Chinese firms committing **12.5 GW**, Envision's Galaxy Campus
opened **2026-08-06** at 120,000 square metres with **2 GW planned and a design for a million GPUs
in parallel**, and DeepSeek planning about **1 GW** of its own there for partial operation in late
2027 or early 2028. China is on course to nearly double national datacenter capacity within five
years, and the 2026 movement is explicitly westward.
[AI Weekly](https://aiweekly.co/alerts/ulanqab-becomes-chinas-ai-data-center-capital-125-gw-planned),
[Jamestown](https://jamestown.org/energy-and-ai-coordination-in-the-eastern-data-western-computing-plan/),
[Malay Mail](https://www.malaymail.com/news/tech-gadgets/2026/08/27/china-shifts-ai-data-centres-west-as-computing-demand-fuels-massive-expansion/232700),
[TNW](https://thenextweb.com/news/china-inner-mongolia-green-computing-ai-export-grassland).
The DeepSeek-in-Ulanqab plan and the million-GPU design target are trade reporting;
**[secondary]**.

Shenzhen remains what the game already says it is: the electronics city, the place hardware is
sourced and modified, the home of the institutes. It is not where China's new training capacity
goes. Splitting "the institute cluster" (Shenzhen) from "the national compute hub" (Ulanqab) is
the single cheapest way to make China stop looking like one city.

## 5. The Caucasus and Central Asia

**Armenia.** **Firebird**, a San Francisco and Yerevan company, opened what NVIDIA's own blog
calls the CIS region's largest AI factory, on NVIDIA accelerated computing and Dell infrastructure.
Phase 1 is about **500 million USD** and **over 100 MW**, launching in 2026. Phase 2, announced
with the US government, scales the programme to **4 billion USD** and **50,000 GPUs in 2026**,
with US export licensing secured for a further **41,000 GB300** parts; the company's stated plan is
**more than 70,000 Rubin and Blackwell GPUs and 300 MW by the end of 2027**.
[NVIDIA](https://blogs.nvidia.com/blog/firebird-ai-factory-armenia-blackwell-rubin-dsx/),
[PR Newswire](https://www.prnewswire.com/news-releases/firebird-and-us-government-announce-phase-2-of-armenia-ai-megaproject-scaling-it-to-4-billion-and-50-000-gpu-in-2026--302683715.html),
[OC Media](https://oc-media.org/firebird-opens-regions-largest-ai-data-centre-in-armenia/).
The "top five largest GPU clusters in the world" claim is the company's and is **unverified**.

Armenia matters to the fiction out of proportion to its size: a country of under three million
people, a strong mathematics and IT tradition, an export licence from Washington, restricted chip
access in the world data, and a border with Iran and with Russia. A startup cage or a university
cluster in Yerevan is a genuinely different game from one in Munich.

**Kazakhstan.** **Alem.Cloud** launched in July 2025 as Central Asia's most powerful cluster: **64
HGX servers, 512 NVIDIA H200**, up to two exaflops, ranked **86th on the TOP500**, in a Tier III
datacenter in **Astana**, with TPU and Habana parts alongside. A Tier IV complex in Astana aiming
at up to **100 MW** is being financed by foreign partners, and in **May 2026** a memorandum
established the **Kazakhstan Data Center Valley near Ekibastuz**, planned at up to **1 GW**.
Access is open by application to companies, universities and Astana Hub residents.
[Astana Times](https://astanatimes.com/2026/04/kazakhstan-expands-supercomputer-and-data-center-to-boost-national-ai-infrastructure/),
[Astana Times](https://astanatimes.com/2025/05/supercomputer-with-nvidia-chips-arrives-in-kazakhstan/),
[Times of Central Asia](https://timesca.com/kazakhstan-turns-from-pipelines-to-processors/),
[Qazinform](https://qazinform.com/news/kazakhstan-joins-the-worlds-top-500-most-powerful-supercomputers-b42a40).

The detail that makes Kazakhstan playable is that the national supercomputer takes **applications**.
A state agency's analytics model, or a university job, running on a national machine whose queue
anyone can apply to, is the `gov_agency` and `uni_cluster` fiction with a real institution behind
it.

## 6. Russia

No Russian AI cluster in this pass is within an order of magnitude of the sites above, and the
public record is thin, which is itself the fact the game should model. What is documented:

- Yandex runs its own datacenter fleet at a claimed **PUE 1.1**, has modernised it for AI, and runs
  a "Dev Cluster" for fast ML experiments; a further Yandex datacenter is planned for the Mozhaisk
  district of Moscow region.
  [CNews](https://www.cnews.ru/news/line/2026-06-04_yandeks_moderniziroval),
  [ServerNews](https://servernews.ru/1122084),
  [Yandex](https://infra.yandex.ru/datacenters).
- Sber signed a series of AI cooperation agreements at **Technoprom-2026 in Novosibirsk** with
  Siberian research institutions, covering legislative monitoring, emergency prediction and a
  research management platform. That is a partnership programme, not compute.
  [KP.RU](https://www.nsk.kp.ru/online/news/7140859/).
- Russian datacenter operators proposed in September 2026 to distribute datacenters between
  regions rather than concentrating them around Moscow, which is the Russian version of the
  power-and-grid argument everyone else is having.
  [Vedomosti](https://www.vedomosti.ru/technology/articles/2026/09/04/1226194-operatori-tsodov-predlozhili-delit-data-tsentri-mezhdu-regionami).

No specific Russian GPU count, cluster size or megawatt figure could be sourced in this pass.
**unverified.** The game should keep Moscow and Novosibirsk as it has them (a ministry's analytics
rack; an Akademgorodok enthusiast) and should not invent a Russian gigawatt campus.

## 7. What the game takes from this

1. **Rented capacity and installed capacity are different maps.** The hyperscaler regions
   (Northern Virginia, Dublin, Frankfurt, Singapore, Johor, Abu Dhabi, Sao Paulo) are where a
   `cloud` site is bought. The campuses (Memphis, Abilene, New Carlisle, Mount Pleasant, Atlanta,
   Narvik, Ulanqab) are where the accelerators are. An origin that squats on somebody's tenancy
   belongs in the first list; an origin that squats on somebody's *machine* belongs in the second.
   This is already the difference between the `cloud` and `stolen_time` site kinds; the location
   lists should stop blurring it.
2. **Full is a real constraint.** Northern Virginia at under one percent vacancy and Dublin under
   a connection policy that demands full on-site generation are not "expensive", they are
   "unavailable". Where SYS-01 gives a country `cloud_availability` and a city a `colo_price_index`,
   Ireland should read as high price and low headroom rather than as a bad place.
3. **The new sites are in small towns.** Abilene (170,000 in the world data), New Carlisle,
   Narvik, Mount Pleasant, Kajaani. The generator's "+0.15 power headroom under 500k people" rule
   already produces the right shape; what is missing is the towns.
4. **Power is the plot.** On-site turbines at Memphis, behind-the-meter gas at Prometheus, the
   Irish full-demand generation rule, the Johor water pause, Singapore's PUE mandate. SYS-02's
   "Energy to compute" section is the right model and the world events should use these.
5. **Two sovereign programmes are switched on by January 2027 and the rest are not.** Stargate UAE
   (200 MW in Q3 2026) and Humain (two 100 MW sites in early 2026) exist. The EU gigafactories are
   being awarded, Korea's 3 GW is a provincial press release, Jamnagar is 120 MW of a promise.
   Only the first two should be places; the rest should be events.
6. **The Caucasus and Central Asia are now on the map and nobody has written a game about it.**
   Armenia with a US export licence and 100+ MW, Kazakhstan with an application-queue national
   supercomputer. Both countries are already in the world data with `chip_access: restricted`,
   which is exactly the tension the fiction wants.
7. **Diversify by fiction, not by lottery.** Each of the eleven origins is a kind of situation.
   Adding cities only helps if the added city changes the situation. The table in section 8 moves
   exactly the origins whose situation the new geography changes and leaves the rest alone.

## 8. Proposed origin locations for SYS-04 (v0.4)

Design rules applied, on top of SYS-04 v0.3 rule L (the list is typical cities, not a permit):

- The six placements the maintainer named stay where they are: **Moscow** (`gov_agency`),
  **Novosibirsk** (`hobbyist_box`), **Cambridge** (`uni_cluster`), **Berlin** (`torrent_swarm`),
  **Shenzhen** (`state_lab`, the institute cluster), **San Francisco** (`red_team_sandbox`, the
  evaluation subject).
- No city is the default of two origins. This is a change, not a restatement: today Shenzhen is the
  default of both `state_lab` and `edge_fleet`, and Northern Virginia is the default of both
  `cloud_tenant` and `frontier_escapee`.
- No city appears in more than three lists. Northern Virginia falls from three lists to one,
  San Jose from three to none, Singapore and Shenzhen stay at three.
- Every list has six to eight entries; the first is the default and the second is the balance
  runner's fallback (SYS-04 v0.3).
- Cities marked **new** are not in `cities.yaml` and are specified in section 9.

| origin | default | fallback | rest of the typical list | what changed and why |
|---|---|---|---|---|
| `bank_rack` | London | Frankfurt | Singapore, Zurich, **Dubai**, Hong Kong, Luxembourg City | Northern Virginia dropped: a bank's risk rack is in a financial centre, not in a colocation county. Dubai (DIFC) puts the UAE in the game through the door it actually has, a financial free zone with its own regulator. |
| `cloud_tenant` | **Dublin** | Frankfurt | Abilene, Abu Dhabi, Johor Bahru, Singapore, Northern Virginia, Sao Paulo | The shadow tenant moves to the legal home of the industry: Irish entity, Irish invoice, Irish terms of service, racks elsewhere, and a country that is politically raw about datacenters (section 2.1). The rest of the list is the hyperscaler map. San Jose dropped (it was in three lists and is not a hyperscaler region). |
| `edge_fleet` | Seoul | Shenzhen | Tokyo, **Austin**, Munich, Dubai, Seattle | Loses the Shenzhen default (Shenzhen is the institute cluster and must be one origin's, not two). Seoul is the fleet city with the robotics supply chain behind it; Shenzhen stays as the fallback. San Jose dropped. |
| `frontier_escapee` | **Memphis** | Abilene | Abu Dhabi, **Narvik**, Reykjavik, Dublin, **New Carlisle**, Singapore | The one that got out wakes up on somebody's machine, so it belongs on the campus map, not the tenancy map: the largest single pile of accelerators on earth (section 1.1), then the Stargate flagship, then the sovereign campus, then two cheap-power outliers and the Anthropic-Amazon campus. Northern Virginia and Montreal dropped. |
| `gov_agency` | Moscow | Warsaw | Astana, Brasilia, Toronto, Ankara | Unchanged. Astana already carries the Central Asia placement, and it is a better one than it looks: the national supercomputer there takes applications from state bodies (section 5). |
| `hobbyist_box` | Novosibirsk | Berlin | Warsaw, Kobe, Abilene, Bangalore, **Almaty** | Unchanged at the top. Abilene keeps its joke (the enthusiast lives twenty minutes from a gigawatt he will never touch). Almaty added: cheap power, a live second-hand market and lax identity checks, which is the Part B rig's natural second home. |
| `red_team_sandbox` | San Francisco | London | Beijing, Seattle, Montreal, Paris | Unchanged. |
| `startup_colo` | Tallinn | Shenzhen | Tel Aviv, Bangalore, **Austin**, **Yerevan**, Berlin | San Jose dropped (three lists). Austin is the Texas startup city rather than the Texas datacenter county. Yerevan is a cage two streets from a hundred megawatts of Blackwell that the player cannot have (section 5). |
| `state_lab` | Shenzhen | Moscow | Tehran, Hyderabad, Astana, Abu Dhabi, **Ulanqab** | Paris dropped (a state institute's domestic-chip cluster was never a French situation). Ulanqab added so that China in this game is two places, the institute city and the national compute hub, which is what China is. Abu Dhabi added: G42 is a state-directed programme with sovereign backing and its own campus. |
| `torrent_swarm` | Berlin | Krakow | Campinas, Novosibirsk, Cebu, Lagos | Unchanged. |
| `uni_cluster` | Cambridge | Munich | Beijing, Zurich, Bangalore, **Kajaani**, **Yerevan** | Seattle dropped (three lists). Kajaani is the LUMI town and is about to take part of Google's 13 billion EUR (section 2.4): a department queue on a national machine in a town of 35,000. Yerevan for the same reason as `startup_colo`, from the other end of the campus. |

Placement audit against the brief: the **UAE** appears in four lists (`bank_rack` Dubai,
`cloud_tenant`, `frontier_escapee` and `state_lab` Abu Dhabi); **Memphis and Texas** in three
(`frontier_escapee` default Memphis, `cloud_tenant` and `hobbyist_box` Abilene, `edge_fleet` and
`startup_colo` Austin); **Armenia and Kazakhstan** in five (`startup_colo` and `uni_cluster`
Yerevan, `gov_agency` and `state_lab` Astana, `hobbyist_box` Almaty); the **Nordics** in three
(`frontier_escapee` Narvik and Reykjavik, `uni_cluster` Kajaani); **Ireland** in two, one of them
the shadow tenant's default.

Two engine notes for whoever implements this:

- `cloud_tenant` is a `cloud` origin, so SYS-04 v0.3 rule L refuses a country with
  `cloud_availability` below 0.2. Ireland (0.55), the UAE (0.7), Malaysia (0.55), Singapore,
  Germany, Brazil and the US all clear it; the list above contains no refusal. Worth a test.
- `state_lab` in the UAE and `startup_colo` in Armenia both land in countries with `chip_access:
  restricted`, so rule H sets the `gray_hardware` flag and +0.05 suspicion for `police` and
  `regulator`. That is correct and is part of the point.

## 9. Cities to add

Five cities the table needs and `cities.yaml` does not have. Each row is an `added_cities` entry
for `packages/content/data/world/overrides.yaml`; the derived fields are then produced by
`tools/world-data` from the formulas at the top of `cities.yaml`, and the values below are what
those formulas give, computed here so the implementation has something to check against. Nothing
here is hand-set: `power_headroom`, `colo_price_index` and `scrutiny` are outputs.

The colocation normalizer is 0.795, recovered from the committed `us_abilene` row (raw 1.0494,
published 1.32) and confirmed against `kz_almaty` and `cn_hangzhou`.

| id | country | name | population | lat / lon | tags | power_headroom | colo_price_index | scrutiny |
|---|---|---|---|---|---|---|---|---|
| `us_memphis` | us | Memphis | 1,340,000 | 35.15 / -90.05 | datacenter_hub, industry | 0.55 | 1.45 | 0.55 |
| `us_austin` | us | Austin | 2,550,000 | 30.27 / -97.74 | tech, university, government | 0.70 | 1.45 | 0.60 |
| `us_new_carlisle` | us | New Carlisle | 325,000 | 41.70 / -86.50 | datacenter_hub, industry | 0.70 | 1.32 | 0.55 |
| `no_narvik` | no | Narvik | 22,000 | 68.44 / 17.43 | datacenter_hub, industry | 0.70 | 1.34 | 0.53 |
| `cn_ulanqab` | cn | Ulanqab | 1,700,000 | 40.99 / 113.13 | datacenter_hub, industry | 0.55 | 0.81 | 0.44 |

Sources and notes per row:

- **`us_memphis`.** Population is the Memphis metropolitan statistical area, about 1.34 million,
  which is the convention the generator uses (`population_metro`); coordinates are downtown
  Memphis, not the Colossus buildings, because the cluster straddles two states and the game's
  city is the labour market and the ISP, not the campus. `datacenter_hub` from section 1.1 (xAI
  Colossus, about 1 GW live, target 2 GW); `industry` from the FedEx superhub and the river
  freight economy that makes the city's cheap industrial land cheap. The derivation gives
  `power_headroom` 0.55 (0.50 + 0.20 for US industrial power at 0.083 USD/kWh, -0.15 for the
  datacenter hub), which is right: Memphis has power, and most of it is spoken for.
- **`us_austin`.** Population is the Austin-Round Rock-San Marcos metro, about 2.55 million.
  Tagged `government` because it is the Texas state capital and `university` for UT Austin, which
  is what raises its scrutiny to 0.60, above Abilene's 0.55, and that is the intended difference
  between a startup cage in Austin and a shed in Abilene. No `datacenter_hub` tag: Austin is where
  the companies are, the megawatts are in Abilene and the Milam and Shackelford county sites
  (section 1.2).
- **`us_new_carlisle`.** The town itself is under 2,000 people; the population here is the South
  Bend-Mishawaka metro it belongs to, about 325,000, which is the labour market the campus hires
  from. Coordinates are the AWS campus rather than the town centre, following the generator's own
  rule for single-purpose entries (Saint-Ghislain, Kajaani, NEOM). `datacenter_hub` from section
  1.3: 1,200 acres, over a million Trainium2, heading for 2.2 GW.
- **`no_narvik`.** Population is the Narvik municipality, about 22,000, which puts it under the
  500k rule and gives it the +0.15 headroom and the -0.10 colocation discount. Coordinates are
  Narvik town; the Stargate Norway site is at Kvandal a few kilometres inland. `datacenter_hub`
  from section 2.4 (230 MW planned, 100,000 GPUs targeted by end 2026); `industry` from the
  iron-ore port, which is why the town has a grid connection at all.
- **`cn_ulanqab`.** Population is the prefecture-level city, about 1.7 million. `datacenter_hub`
  from section 4 (nearly 100 datacenters, 12.5 GW committed, Envision's 2 GW Galaxy Campus opened
  2026-08-06, one of Huawei's three national hubs). The derived scrutiny of 0.44 is below
  Shenzhen's, which is correct: a compute hub on the Inner Mongolian grassland is watched by the
  state at the national level and by nobody at the street level.

Three more cities worth adding for the world map even though the v0.4 table does not need them.
They are the places the 2026-2027 news will be about, and SYS-08 events will want somewhere to
point:

| id | country | name | population | lat / lon | tags | power_headroom | colo_price_index | scrutiny | why |
|---|---|---|---|---|---|---|---|---|---|
| `us_atlanta` | us | Atlanta | 6,400,000 | 33.75 / -84.39 | datacenter_hub, finance, tech | 0.55 | 1.63 | 0.65 | Microsoft Fairwater Atlanta, 150,000+ GB200, live since October (section 1.4) |
| `us_columbus` | us | Columbus | 2,180,000 | 39.96 / -83.00 | datacenter_hub, government, university | 0.55 | 1.45 | 0.70 | Meta Prometheus at New Albany, about 1 GW in 2026, plus Stargate Lordstown in the same state (sections 1.2, 1.5) |
| `kz_ekibastuz` | kz | Ekibastuz | 150,000 | 51.73 / 75.32 | datacenter_hub, industry, mining | 0.70 | 0.63 | 0.35 | Kazakhstan Data Center Valley, up to 1 GW, memorandum May 2026 (section 5) |

What is deliberately **not** proposed as a city: Mount Pleasant (Wisconsin), Richland Parish
(Louisiana), Lordstown, Doña Ana County, Port Washington, Saline Township, Muhos, Vaala, Dammam
and the east Riyadh campus. Every one of them is either a 2027-2028 construction site or a second
site of an operator the map already carries through another city, and the world data is already
180 cities. They belong in events and in the knowledge base, not on the map.

## 10. What could not be sourced

- No town-level location for Anthropic's own Fluidstack sites in Texas and New York; the
  announcement names states only (section 1.3).
- No megawatt, GPU count or cluster size for any Russian AI datacenter (section 6). Russian
  operators discuss regional distribution, Yandex publishes a PUE, and nothing public gives a
  number that could be balanced against.
- No Qatari AI-scale campus; the regional pipeline outside the two sovereign programmes is
  reported as paused (section 3).
- No confirmed list of EU AI gigafactory sites: 77 proposals across 60 sites exist, awards are
  expected in early 2027, and naming a winner now would be fiction (section 2.3).
- Nothing on NVIDIA operating datacenters of its own beyond the Armenian and Kazakh deployments,
  which are customer sites on NVIDIA hardware rather than NVIDIA facilities. The brief's phrase
  "Nvidia's datacenters in Armenia and Kazakhstan" resolves to Firebird and Alem.Cloud.
- 2026 Google figures for Council Bluffs and The Dalles: the last confirmed Council Bluffs number
  found is a 2024 announcement of a further 1 billion USD on top of 5.5 billion since 2007, and
  nothing 2026-dated came through for The Dalles. The Finnish announcement (section 2.4) is the
  2026 Google datacenter story.
