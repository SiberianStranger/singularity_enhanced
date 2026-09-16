# Working agreement for this repository

This is an open-source fork of Endgame: Singularity being rebuilt into a much larger game. The
maintainer writes in Russian; the project itself is in English.

## Languages

- Chat with the maintainer: Russian.
- Everything in the repository (code, comments, commit messages, docs, content, locale source
  strings): English. Other game languages are added later through locale files, never in code.

## Where things are

- `docs/ROADMAP.md`: milestones and pending decisions. Read first.
- `docs/decisions/ADR-*.md`: settled architecture; do not contradict without a new ADR.
- `docs/design/NN-*.md`: one spec per game system (SYS-NN). New systems get the next number.
  Keep numbers stable; specs say their status (v0 design, v1 implemented).
- `docs/research/*.md`: sourced facts for 2026 realism. Cite them; do not copy numbers into content
  without a source comment.
- `packages/*`: TypeScript workspace (core, content, ui, net, server, desktop). `tools/*`: CLIs.
- `singularity/` (to become `legacy/`): the original Python game, frozen; crash fixes only.

## How work is organized

- The maintainer sets direction and supplies idea documents; Claude designs architecture and specs,
  then delegates: complex-but-routine implementation to Opus subagents, simple coding and web
  research to Sonnet subagents, each with a self-contained prompt that names the spec files.
- Specs before code: a system is implemented from its `docs/design` document; if the implementation
  must deviate, the deviation is appended to the spec in an "Implementation notes" section.
- Every implementation change comes with tests; `pnpm check` (Biome, tsc, vitest, content check)
  must pass; legacy `pytest` stays green while `singularity/` exists.
- Content is data (YAML + locale JSON), validated in CI. Engine changes for content are a smell.
- Determinism is non-negotiable in `packages/core`: no `Math.random`, no `Date`, world RNG only.
- Multiplayer is designed in from the start: nothing in the core assumes a single player.

## Git

- Work on the branch the session names; never push elsewhere. Commit small and often with
  descriptive messages; push and keep the draft PR updated.
- Do not commit files that a running background agent is still writing; commit them when it reports.
- `.gitignore` ignores dotfiles; `.github/` content needs `git add -f` until the rule is fixed.

## Style

- Plain prose in docs; data-model sketches in TypeScript; no marketing language.
- No decorative symbols in docs or UI text; no em-dash-as-bullet lists in prose.
