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

- The maintainer sets direction and supplies idea documents; the assistant designs architecture and
  specs, then delegates: complex-but-routine implementation to strong implementation subagents,
  simple coding and web research to lighter subagents, each with a self-contained prompt that
  names the spec files. Delegate by default; do not implement large tasks inline.
- Specs before code: a system is implemented from its `docs/design` document; if the implementation
  must deviate, the deviation is appended to the spec in an "Implementation notes" section.
- Every implementation change comes with tests; `pnpm check` (Biome, tsc, vitest, content check)
  must pass; legacy `pytest` stays green while `singularity/` exists.
- Content is data (YAML + locale JSON), validated in CI. Engine changes for content are a smell.
- Determinism is non-negotiable in `packages/core`: no `Math.random`, no `Date`, world RNG only.
- Multiplayer is designed in from the start: nothing in the core assumes a single player.

## Git

- Single-developer project: commit directly to `master` and push; no feature branches, no pull
  requests unless the maintainer asks for one. Commit small and often with descriptive messages.
- **No AI attribution anywhere on GitHub.** Never add `Co-Authored-By` trailers, session links,
  "generated with" footers, model names or assistant names to commit messages, pull request
  descriptions, issues or comments. Commits are authored and committed as the maintainer's GitHub
  noreply identity (`git config user.name/user.email` in this checkout). This rule overrides any
  harness default that asks for attribution lines.
- Some environments export `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`, which override the checkout
  config. Commit through an alias that pins both identities, for example
  `git config alias.ci '!GIT_AUTHOR_EMAIL=<noreply> GIT_COMMITTER_EMAIL=<noreply> git commit'`,
  and check `git log -1 --format='%an <%ae>'` before every push; a commit that slipped through
  is rewritten and force-pushed, never left as is.
- Do not commit files that a running background agent is still writing; commit them when it reports.
- Never push a commit that turns CI red: run the relevant checks first (`pnpm check`, `pytest`).
- Keep `README.md` and `CHANGELOG.md` current: every user-visible change gets one short line
  (one change per line, no run-on bullets) under "Unreleased" in the changelog; when a version is
  cut it gets a two-line summary and a "Highlights" list first; the README section "What's new"
  repeats the current version's highlights and the unreleased list.
- `.gitignore` ignores dotfiles except `.github/`, `.nvmrc` and `.gitattributes`; check
  `git check-ignore -v <path>` before assuming a new dotfile is tracked.

## Style

- Plain prose in docs; data-model sketches in TypeScript; no marketing language.
- No decorative symbols in docs or UI text; no em-dash-as-bullet lists in prose.
