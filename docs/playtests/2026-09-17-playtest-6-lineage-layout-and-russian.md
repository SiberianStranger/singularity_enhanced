# Playtest 6: the abliterated lineage, the detail layout, Russian phrasing

Date: 2026-09-17. Build: master after 0.1.4 (commit ee1b5c7), web build on GitHub Pages, English
and Russian. The maintainer played the configurator and the opening in both languages.

Status column: open, fixed (commit), deferred (where to).

## Findings

| id | finding | status |
|---|---|---|
| X1 | `guen_abliterated` (the community fine-tune distilled from Babel 6 and abliterated) reads as "just a dumber model". The maintainer doubts that: such fine-tunes think longer and in more steps, and pull ahead on some benchmarks. Research the real 2025-2026 fine-tunes of Qwen distilled from Claude outputs and the abliterated variants, with numbers, and redesign the lineage so playing it is interesting in its own right: its own strengths, weaknesses and mechanics, not a flat penalty. | fixed: `docs/research/community-finetunes-2026-09.md` has the measured numbers, and the lineage is rewritten as a profile in SYS-04 "The abliterated lineage" (thinks in more tokens, argues and reasons above its size, knows and codes below it, never hedges, free prepared quant, recognizable style) with a balance table |
| X2 | The two opening windows in the model's voice ("What just happened to me", "What I must do now") are the same for every origin. They should vary by origin. | fixed: the two windows are composed from the setup (origin, generation, lineage class, the dials the origin fixed; then the country's posture naming its agency, the city's scrutiny and the challenge tier), in `packages/ui/src/screens/game/opening.ts` with the texts in `story_opening.json`; axes and order in SYS-11's playtest 6 notes |
| X3 | Configurator detail card: the left block (entry name and description) is wide with empty space under it, the right block ("What this means in the game", pros and cons) is a narrow, long column that scrolls. Redistribute: the left text narrower and taller, the right block wider and shorter. | fixed: the card is 45% text to 55% parameters, and the parameter block lost the "Pros and cons" read-back that printed every line of it twice |
| X4 | The origin summary in the model's voice ("You wake up on ...", strengths, problems) sits below both columns after the empty space and is invisible without scrolling. Make it part of the left column, under the description, so it fills that space. | fixed: `StepLayout` takes an `aside` and the Origin step puts its summary, strengths and problems under the description |
| X5 | Settings: some controls have no description. The theme radio shows raw keys (`settings.theme.default`, `settings.theme.night`, `settings.theme.vector`) in both languages. | fixed: the three themes are named (Default, Night mode, Vector; `dark` and `light` retired) and every control in Settings carries a one-line description |
| X6 | "Opening journal" shows the journal id (`first_bank_rack`) instead of the entry's title, in both languages. | fixed: `journalTitle` reads `journal.<id>.title`, and an untitled entry is left out rather than printed as an id |
| X7 | Russian: assembled sentences put substituted names into case-governed slots, so they read wrong: "Пробуждение на Теневой арендатор у гиперскейлера в городе Северная Виргиния ..." and "Заодно изменилось: Происхождение на Тот, кто вырвался, Поколение на Сбежавший передний край, Железо на Краденый узел HGX." Restructure the templates so a substituted name never has to decline (a colon, quotes, or a frame that takes the nominative), and write the rule into SYS-14. | fixed: rule R4 in SYS-14, and the templates reframed (`configurator.meaning.origin_summary`, `config.fix.item` with `config.step.<id>.inline`, the handover alerts, two event descriptions, `log.event_resolved`) |
| X8 | Russian: "контрольная точка" for checkpoint reads as a control point; use "чекпоинт" (the training checkpoint of a model) everywhere, and put it in the SYS-14 glossary. | fixed: "чекпоинт" everywhere in the Russian locales, with the glossary row and the Latin-loanword note in SYS-14 |
| X9 | Russian: "Locked dial" is "Закреплённый регулятор", and "регулятор" is the watcher role (Regulator). One term per concept: the dial needs another word. | fixed: a harness dial is "рычаг" in Russian, with the glossary row saying why |
| X10 | English origin summary: "with $40K dollars and 4 already paying some attention to you" says dollars twice and leaves "4" without a noun; the Russian mirrors it ("и 2 уже уделяют мне некоторое внимание"). | fixed: the English summary reads "with $40K and 4 watchers already paying some attention to you" through an ICU plural, and the Russian one is a frame with a colon; the client's dead copy of the key is retired |
| X11 | Detail card, Russian: a long label ("Подозрение: Служба безопасности лаборатории") wraps and its value ("5 %") drops to its own line, misaligned. | fixed: a row is no longer a wrapping flex line, so the label wraps and its value stays on the label's first line, right-aligned; a value content writes as a sentence is set under its label instead |

## Notes

- X1 is research first: a `docs/research` note with sources, then SYS-04 and the content.
- X3 and X4 are one layout change; the maintainer left the exact arrangement open ("think about what is best").
