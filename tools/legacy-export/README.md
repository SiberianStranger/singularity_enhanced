# legacy-export

One-off exporter that reads the frozen Python game (`singularity/`) with its own loader and writes
the original content to JSON, so the TypeScript content pipeline can import it later instead of
re-typing it.

## Run

```sh
cd <repo root>
PYTHONPATH=. python3 tools/legacy-export/export_legacy.py           # writes tools/legacy-export/out/
PYTHONPATH=. python3 tools/legacy-export/export_legacy.py --out /tmp/legacy
```

Requirements: the same ones the game has (pygame, numpy, polib). The script calls `g.no_gui()` and
`dirs.create_directories(True)` before `data.reload_all()`, the pattern `tests/test_game_run.py`
uses, so no window is opened.

## Output

`out/<domain>.json`, one JSON array per domain, sorted by id, with numeric fields and the English
strings (names, descriptions, results, flavor, story text, knowledge entries):

| file | records | notes |
|---|---|---|
| `techs.json` | 57 | `cost_raw` is the data-file triple, `cost_resolved` the loader's seconds |
| `items.json` | 26 | `item_qual` holds the per-item quality map |
| `bases.json` | 13 | includes `detect_chance` per channel and `flavor` lines |
| `locations.json` | 12 | map coordinates, cities, modifiers |
| `regions.json` | 1 | region modifier tables |
| `events.json` | 8 | `effect_stack` is the legacy token stack, not translated |
| `tasks.json` | 5 | jobs and the CPU pool |
| `difficulties.json` | 6 | multipliers and starting values |
| `groups.json` | 4 | suspicion groups |
| `story.json` | 5 | story sections with their translator comments |
| `knowledge.json` | 1 | in-game help areas and entries |

The `out/` directory is **not** under version control (see `.gitignore`); re-run the script whenever
you need it. `effect_stack` is exported verbatim; converting those tokens into the new effect DSL is
a separate step, done per domain when the owning system exists.
