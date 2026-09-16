# Playtest 4: the playtest 2 and 3 build on Pages, maintainer, 2026-09-16

| # | finding | status |
|---|---|---|
| P1 | Configurator: the list column is too narrow, lineage names are cut off; give the list more width and the detail less. | fixed (0.1.3) |
| P2 | Configurator detail: too much empty space between parameter labels and values; pack the card: the description narrower on the left, the parameters and values to its right in a compact two-column block. | fixed (0.1.3) |
| P3 | Locked lineages cannot be chosen at all. Choosing a locked entry should switch its prerequisites (origin, generation) with a visible note, and choosing the escaped-checkpoint origin switches the lineage; no dead ends. | fixed (0.1.3) |
| P4 | Step order: Origin first, then Generation, then Lineage (filtered by the first two), then Hardware, Harness, Location, Quirks, World, Summary. It is strange to be locked on step 1 by a choice made on step 3. | fixed (0.1.3) |
| P5 | The footer between Reroll and Next shows the current build as a compact one-line summary, no scrolling. | fixed (0.1.3) |
| P6 | Lineages sorted by size. | fixed (0.1.3) |
| P7 | Lineage table v3 from the current flagships: Babel 6 at 10T; Mimi M4 after Kimi K3 (larger than 2.6T); Peepseek after DeepSeek-V4-Pro-0813 (1.7T); the big Guen after Qwen3.8-Max (2.4T, A95B); the small Guen, which is the abliterated one, after Qwen3.8-180B-Flash-Next (about 180B with 6B active, hybrid Gated DeltaNet and sparse attention); no 80B model; BFM after the current GLM and HexaDeciMax after the current MiniMax, verified against the model cards. | done: eight lineages, each row cited in `lineages.yaml` against the model card it was read from (SYS-04 "Lineage table v3"). `small_moe`, `moe_671b`, `moe_235b` and `moe_355b` are gone; `moe_1700b`, `moe_2400b` and `moe_753b` replace them; `guen_abliterated` is the 180B Flash entry and the smallest self in the game |
| P8 | Locations: only three cities are offered; the origins must offer many more (the new cities included) or the location step must allow any plausible city. | done: eight to twelve cities per origin across several countries; the schema cap moved from five to twelve. The first two entries of each list are unchanged so the balance tables stay comparable |
