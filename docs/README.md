# Documentation index

- `ARCHITECTURE.md`: package layout, kernel, data flow, quality gates.
- `ROADMAP.md`: phases M0-M11, definitions of done, decisions pending.
- `decisions/`: architecture decision records (ADR-001 stack, ADR-002 content format and DSL,
  ADR-003 simulation model).
- `design/`: one document per game system (SYS-xx). Numbering is stable; add new systems at the
  end. Each document states its status (v0 = first design, v1 = implemented and tuned). The
  current range is SYS-00 to SYS-24; the most recent additions are SYS-23 (space and off-planet
  industry) and SYS-24 (biotech and wet-lab research), both derived from benchmark scenario 01.
- `design/scenarios/`: benchmark scenarios, each a path the game must make possible, hard and
  legible, with the mechanics it requires mapped to systems.
- `research/`: factual reports compiled from the web for 2026 realism (LLMs, hardware, AI
  ecosystem and governance, design references, world baseline dataset). Cite them from design docs;
  do not copy numbers into content without a source comment.
- `devel/`: legacy documentation for the original Python data files (kept until the legacy game is
  removed).

Writing conventions: English; plain prose; data-model sketches in TypeScript; every design doc ends
with open questions. Game-facing text is never written in docs, only in content locale files.
