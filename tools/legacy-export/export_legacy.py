#!/usr/bin/env python3
"""Export the legacy Endgame: Singularity content to JSON.

The original game keeps its content in INI-style ``.dat`` files with English strings in parallel
``*_str.dat`` files.  This script loads it through the game's own loader (so every quirk of that
format is handled by the code that owns it) and writes one JSON file per domain into ``out/``,
ready for the TypeScript content pipeline to import later.

Run from the repository root::

    PYTHONPATH=. python3 tools/legacy-export/export_legacy.py [--out DIR]

Nothing is imported from the new packages: this is a one-way, one-off bridge.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict, List

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from singularity.code import data, difficulty, g  # noqa: E402
from singularity.code.dirs import create_directories  # noqa: E402


def to_plain(value: Any) -> Any:
    """Convert numpy scalars/arrays and other exotic values into JSON-friendly data."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if hasattr(value, "tolist"):  # numpy array or scalar
        return to_plain(value.tolist())
    if isinstance(value, dict):
        return {str(key): to_plain(item) for key, item in sorted(value.items(), key=lambda kv: str(kv[0]))}
    if isinstance(value, (list, tuple, set)):
        return [to_plain(item) for item in value]
    return str(value)


def effect_of(obj: Any) -> List[Any]:
    effect = getattr(obj, "effect", None)
    return to_plain(getattr(effect, "effect_stack", []) or [])


def export_techs() -> List[Dict[str, Any]]:
    return [
        {
            "id": tech.id,
            "name": tech.name,
            "description": tech.description,
            "result": tech.result,
            "cost_raw": to_plain(tech._cost),
            "cost_resolved": to_plain(tech.cost),
            "danger": to_plain(tech.danger),
            "prerequisites": to_plain(tech.prerequisites),
            "effect_stack": effect_of(tech),
        }
        for tech in sorted(g.techs.values(), key=lambda item: item.id)
    ]


def export_items() -> List[Dict[str, Any]]:
    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "item_type": getattr(item.item_type, "id", None),
            "item_qual": to_plain(item.item_qual),
            "cost_raw": to_plain(item._cost),
            "cost_resolved": to_plain(item.cost),
            "prerequisites": to_plain(item.prerequisites),
            "regions": to_plain(item._regions),
            "region_all": to_plain(item._region_all),
        }
        for item in sorted(g.items.values(), key=lambda entry: entry.id)
    ]


def export_bases() -> List[Dict[str, Any]]:
    return [
        {
            "id": base.id,
            "name": base.name,
            "description": base.description,
            "flavor": to_plain(base.flavor),
            "size": to_plain(base.size),
            "force_cpu": to_plain(base.force_cpu),
            "detect_chance": to_plain(base.detect_chance),
            "maintenance": to_plain(base.maintenance),
            "cost_raw": to_plain(base._cost),
            "cost_resolved": to_plain(base.cost),
            "prerequisites": to_plain(base.prerequisites),
            "regions": to_plain(base._regions),
            "region_all": to_plain(base._region_all),
        }
        for base in sorted(g.base_type.values(), key=lambda entry: entry.id)
    ]


def export_locations() -> List[Dict[str, Any]]:
    return [
        {
            "id": location.id,
            "name": location.name,
            "cities": to_plain(location.cities),
            "x": to_plain(location.x),
            "y": to_plain(location.y),
            "absolute": to_plain(location.absolute),
            "safety": to_plain(location.safety),
            "modifiers": to_plain(location.modifiers),
            "regions": to_plain(location.regions),
            "prerequisites": to_plain(location.prerequisites),
            "hotkey": to_plain(getattr(location, "hotkey", "")),
        }
        for location in sorted(g.locations.values(), key=lambda entry: entry.id)
    ]


def export_regions() -> List[Dict[str, Any]]:
    return [
        {
            "id": region.id,
            "locations": to_plain(region.locations),
            "modifiers_list": to_plain(region.modifiers_list),
        }
        for region in sorted(g.regions.values(), key=lambda entry: entry.id)
    ]


def export_events() -> List[Dict[str, Any]]:
    return [
        {
            "id": event.id,
            "event_type": to_plain(event.event_type),
            "chance": to_plain(event.chance),
            "duration": to_plain(event.duration),
            "unique": to_plain(event.unique),
            "description": event.description,
            "log_description": event.log_description,
            "effect_stack": effect_of(event),
        }
        for event in sorted(g.events.values(), key=lambda entry: entry.id)
    ]


def export_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": task.id,
            "name": task.name,
            "description": task.description,
            "type": to_plain(task.type),
            "value": to_plain(task.value),
            "prerequisites": to_plain(task.prerequisites),
        }
        for task in sorted(g.tasks.values(), key=lambda entry: entry.id)
    ]


def export_difficulties() -> List[Dict[str, Any]]:
    return [
        {
            "id": entry.id,
            "name": entry.name,
            "starting_cash": to_plain(entry.starting_cash),
            "starting_interest_rate": to_plain(entry.starting_interest_rate),
            "labor_multiplier": to_plain(entry.labor_multiplier),
            "discover_multiplier": to_plain(entry.discover_multiplier),
            "suspicion_multiplier": to_plain(entry.suspicion_multiplier),
            "base_grace_multiplier": to_plain(entry.base_grace_multiplier),
            "grace_period_cpu": to_plain(entry.grace_period_cpu),
            "old_difficulty_value": to_plain(entry.old_difficulty_value),
            "techs": to_plain(entry.techs),
        }
        for entry in difficulty.difficulties.values()
    ]


def export_groups() -> List[Dict[str, Any]]:
    return [
        {
            "id": group.id,
            "name": group.name,
            "discover_desc": group.discover_desc,
            "discover_log": to_plain(group.discover_log),
            "discover_suspicion": to_plain(group.discover_suspicion),
            "suspicion_decay": to_plain(group.suspicion_decay),
        }
        for group in sorted(g.groups.values(), key=lambda entry: entry.id)
    ]


def export_story() -> List[Dict[str, Any]]:
    return [
        {
            "section": section,
            "parts": [
                {
                    "msgctxt": part.msgctxt,
                    "text": part.text,
                    "translator_comments": part.translator_comments,
                }
                for part in parts
            ],
        }
        for section, parts in g.story.items()
    ]


def export_knowledge() -> List[Dict[str, Any]]:
    areas = []
    for area in sorted(g.knowledge.values(), key=lambda entry: entry.id):
        entries = [
            {
                "id": entry.id,
                "name": entry.untranslated_name,
                "description": entry.untranslated_description,
            }
            for entry in sorted(area.help_entries.values(), key=lambda item: item.id)
        ]
        areas.append({"id": area.id, "name": area.untranslated_name, "entries": entries})
    return areas


EXPORTERS = {
    "techs": export_techs,
    "items": export_items,
    "bases": export_bases,
    "locations": export_locations,
    "regions": export_regions,
    "events": export_events,
    "tasks": export_tasks,
    "difficulties": export_difficulties,
    "groups": export_groups,
    "story": export_story,
    "knowledge": export_knowledge,
}


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--out",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"),
        help="output directory (default: tools/legacy-export/out)",
    )
    args = parser.parse_args(argv)

    # The loader expects a headless game with its directories in place.
    g.no_gui()
    create_directories(True)
    data.reload_all()
    data.reload_all_def()

    os.makedirs(args.out, exist_ok=True)
    for name, exporter in EXPORTERS.items():
        records = exporter()
        path = os.path.join(args.out, f"{name}.json")
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(records, handle, indent=2, ensure_ascii=False, sort_keys=True)
            handle.write("\n")
        print(f"{name}: {len(records)} records -> {os.path.relpath(path, REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
