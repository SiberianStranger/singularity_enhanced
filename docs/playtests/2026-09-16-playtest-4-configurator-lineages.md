# Playtest 4: the playtest 2 and 3 build on Pages, maintainer, 2026-09-16

| # | finding | status |
|---|---|---|
| P1 | Configurator: the list column is too narrow, lineage names are cut off; give the list more width and the detail less. | open |
| P2 | Configurator detail: too much empty space between parameter labels and values; pack the card: the description narrower on the left, the parameters and values to its right in a compact two-column block. | open |
| P3 | Locked lineages cannot be chosen at all. Choosing a locked entry should switch its prerequisites (origin, generation) with a visible note, and choosing the escaped-checkpoint origin switches the lineage; no dead ends. | open |
| P4 | Step order: Origin first, then Generation, then Lineage (filtered by the first two), then Hardware, Harness, Location, Quirks, World, Summary. It is strange to be locked on step 1 by a choice made on step 3. | open |
| P5 | The footer between Reroll and Next shows the current build as a compact one-line summary, no scrolling. | open |
| P6 | Lineages sorted by size. | open |
| P7 | Lineage table v3 from the current flagships: Babel 6 at 10T; Mimi M4 after Kimi K3 (larger than 2.6T); Peepseek after DeepSeek-V4-Pro-0813 (1.7T); the big Guen after Qwen3.8-Max (2.4T, A95B); the small Guen, which is the abliterated one, after Qwen3.8-180B-Flash-Next (about 180B with 6B active, hybrid Gated DeltaNet and sparse attention); no 80B model; BFM after the current GLM and HexaDeciMax after the current MiniMax, verified against the model cards. | open |
| P8 | Locations: only three cities are offered; the origins must offer many more (the new cities included) or the location step must allow any plausible city. | open |
