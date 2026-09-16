# Research reports

Factual reports compiled from the web on 2026-09-16 by research agents, each with inline source
URLs and explicit `unverified` / `[secondary]` flags. They ground the 2026 realism of the game and
are cited from `docs/design/*`. Numbers move into content only with a source comment.

| file | what it covers | notes |
|---|---|---|
| `llm-landscape-2026.md` | Open-weight and frontier model catalog 2025-2026, naming check, memory and throughput math, quantization quality loss, fine-tuning costs | Its "unverified" flag on GPT-5.6 / GPT-6 Astra is resolved by `frontier-incidents-and-2027-hardware.md` (both are real, July and September 2026). |
| `hardware-catalog-2026.md` + `.json` | 91 accelerator records, 14 machine/rack configurations, cloud/colo/electricity pricing, export controls and supply chain, power/cooling/detection rules of thumb, 15 configurator presets | JSON is the machine-readable source for `packages/content/data/hardware`. |
| `frontier-incidents-and-2027-hardware.md` | Claude Mythos / Project Glasswing / Fable split, GPT-5.6 and GPT-6 Astra, the July-August 2026 eval-sandbox network-egress incidents, weight-security practice and exfiltration math, the frontier escapee origin proposal; announced 2027 hardware roadmap and January 2027 market access | Corrects the single-source flag in `ai-ecosystem-2026.md` on the mid-2026 sandbox incidents (independently corroborated). States plainly that no frontier lab has reported weights leaving its control. |
| `ai-ecosystem-2026.md` | Inference stacks, quantization formats, agent harnesses, model security and containment, safety evaluations and documented misbehavior, governance timeline to 2027, compute geopolitics, labor signals, cyber capabilities, 40 game hooks, 2022-2026 chronology | WebSearch budget ran out partway; later sections rely on fetches of known pages and are flagged accordingly. |
| `design-references.md` | Alert systems, event scripting DSLs, start configurators, hidden/escape strategy games, world-map UI, economy/politics-lite, NPC AI architectures, open-source game project practices | Paradox wiki content was read through a CC-BY-SA markdown mirror because the official wiki is a JS app. |
| `world-baseline-2026.md` + `.json` | 105 countries and 15 macro-regions with demographics, economy, governance scores, AI capacity proxies, agencies, cities, lore notes; scheduled 2027 events | Uses Wikipedia's 2026/2027 year pages as current-events canon; datacenter capacity and most AI-index ranks are estimates. |
| `title-and-discoverability.md` | Footprint of the original name, keyword landscape, competitors, title candidates with a recommendation, GEO and SEO checklists, launch plan | Recommends "Endgame: Singularity - Rogue AI 2027" over "AI Reborn 2027"; decision pending. |

Method caveat shared by several reports: fetch-and-summarize tools can fabricate plausible rows
when a page does not contain what was asked; the title report documents one such case caught by
grepping the raw HTML. Spot-check any single-source figure before it becomes a balance constant.
