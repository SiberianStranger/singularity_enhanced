#!/usr/bin/env python3
"""Cyrillic for Acknowledge TT, drawn on the face's own grid (SYS-14, docs/design/14-i18n-ru.md).

Acknowledge TT (`packages/ui/src/assets/acknowtt.ttf`) is Latin only. It is also strictly
rectilinear: every glyph is a subset of a three-column by five-row grid inside a 461 by 384 box on a
1024 unit em, with a 537 advance and lowercase drawn as components of the capitals. Extending it is
therefore not a matter of imitating a drawing style but of filling in the same table.

This script writes `packages/ui/src/assets/acknowtt-cyrillic.ttf`: the Russian alphabet in that
grid, with the original's units per em, ascent, descent and advance, so the stylesheet can load it
under the same family name behind `unicode-range: U+0400-04FF` and the browser can mix the two per
character without a metric seam.

Three letters need more columns than the grid has and take the same kind of compromise the face
already makes for M and N, which share one shape: Ж, Ш and Щ fill the middle band instead of
carrying a middle stem. Marks live outside the cap band, in rows the font's own ascent and descent
already cover: Ё and Й above 384, Ц, Щ and Д below 0.

Run: python3 tools/fonts/build-cyrillic.py   (needs fonttools; the output is committed)
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# The grid. Columns are the original's stem positions; rows are its 77-unit bands, plus one band
# above the cap height for Ё and Й and one below the baseline for Ц, Щ and Д. Both extra bands are
# inside the font's declared ascent (538) and descent (-154), so no line box changes.
XS = (0, 154, 307, 461)
YS = (-77, 0, 77, 154, 230, 307, 384, 461, 538)
BODY_TOP = 5  # row index of the top body band
MARK_ROW = 7  # the band above the cap, with row 6 left empty so the mark does not touch the letter
ADVANCE = 537
UPM = 1024

# Rows are written top to bottom, as the letter is read. "a" is the band above the cap height and
# "b" the band below the baseline; a letter with neither leaves them out.
LETTERS: dict[str, tuple[str, ...]] = {
    "А": ("###", "#.#", "###", "#.#", "#.#"),
    "Б": ("###", "#..", "##.", "#.#", "###"),
    "В": ("###", "#.#", "##.", "#.#", "###"),
    "Г": ("###", "#..", "#..", "#..", "#.."),
    "Д": (".##", "#.#", "#.#", "###", "#.#", "b#.#"),
    "Е": ("###", "#..", "##.", "#..", "###"),
    "Ё": ("###", "#..", "##.", "#..", "###", "a#.#"),
    "Ж": ("#.#", "###", ".#.", "###", "#.#"),
    "З": ("###", "..#", ".#.", "..#", "###"),
    "И": ("#.#", "###", "###", "#.#", "#.#"),
    "Й": ("#.#", "###", "###", "#.#", "#.#", "a###"),
    "К": ("#.#", "##.", "##.", "##.", "#.#"),
    "Л": (".##", "#.#", "#.#", "#.#", "#.#"),
    "М": ("#.#", "#.#", "###", "###", "#.#"),
    "Н": ("#.#", "#.#", "###", "#.#", "#.#"),
    "О": ("###", "#.#", "#.#", "#.#", "###"),
    "П": ("###", "#.#", "#.#", "#.#", "#.#"),
    "Р": ("###", "#.#", "###", "#..", "#.."),
    "С": ("###", "#..", "#..", "#..", "###"),
    "Т": ("###", ".#.", ".#.", ".#.", ".#."),
    "У": ("#.#", "#.#", "##.", ".#.", ".#."),
    "Ф": (".#.", "###", "#.#", "###", ".#."),
    "Х": ("#.#", "#.#", ".#.", "#.#", "#.#"),
    "Ц": ("#.#", "#.#", "#.#", "#.#", "###", "b..#"),
    "Ч": ("#.#", "#.#", "###", "..#", "..#"),
    "Ш": ("#.#", "#.#", "###", "###", "###"),
    "Щ": ("#.#", "#.#", "###", "###", "###", "b..#"),
    "Ъ": ("##.", ".#.", "###", "#.#", "###"),
    "Ы": ("#.#", "#.#", "###", "#.#", "###"),
    "Ь": ("#..", "#..", "###", "#.#", "###"),
    "Э": ("###", "..#", ".##", "..#", "###"),
    "Ю": ("#..", "###", "#.#", "###", "#.."),
    "Я": ("###", "#.#", ".##", "#.#", "#.#"),
}

GLYPH_NAMES = {
    "А": "afii10017", "Б": "afii10018", "В": "afii10019", "Г": "afii10020",
    "Д": "afii10021", "Е": "afii10022", "Ё": "afii10023", "Ж": "afii10024",
    "З": "afii10025", "И": "afii10026", "Й": "afii10027", "К": "afii10028",
    "Л": "afii10029", "М": "afii10030", "Н": "afii10031", "О": "afii10032",
    "П": "afii10033", "Р": "afii10034", "С": "afii10035", "Т": "afii10036",
    "У": "afii10037", "Ф": "afii10038", "Х": "afii10039", "Ц": "afii10040",
    "Ч": "afii10041", "Ш": "afii10042", "Щ": "afii10043", "Ъ": "afii10044",
    "Ы": "afii10045", "Ь": "afii10046", "Э": "afii10047", "Ю": "afii10048",
    "Я": "afii10049",
}


def cells(rows: tuple[str, ...]) -> set[tuple[int, int]]:
    """The filled (column, row) cells of a letter, with row 0 the band below the baseline."""
    body = [row for row in rows if row[0] not in "ab"]
    marks = [row for row in rows if row[0] in "ab"]
    filled: set[tuple[int, int]] = set()
    for index, row in enumerate(body):
        y = BODY_TOP - index
        for column, mark in enumerate(row):
            if mark == "#":
                filled.add((column, y))
    for row in marks:
        y = MARK_ROW if row[0] == "a" else 0
        for column, mark in enumerate(row[1:]):
            if mark == "#":
                filled.add((column, y))
    return filled


def contours(filled: set[tuple[int, int]]) -> list[list[tuple[int, int]]]:
    """Covers the filled cells with maximal rectangles, largest first.

    Rectangles abut instead of overlapping, and all of them are wound the same way, so the nonzero
    fill of TrueType renders their union. The original face draws each glyph as one traced outline;
    a rectangle cover is the same shape with more points, and it is the part of this script that has
    to be obviously right rather than clever.
    """
    remaining = set(filled)
    rectangles: list[list[tuple[int, int]]] = []
    while remaining:
        column, row = min(remaining, key=lambda cell: (cell[1], cell[0]))
        width = 1
        while (column + width, row) in remaining:
            width += 1
        height = 1
        while all((column + step, row + height) in remaining for step in range(width)):
            height += 1
        for step in range(width):
            for lift in range(height):
                remaining.discard((column + step, row + lift))
        x0, x1 = XS[column], XS[column + width]
        y0, y1 = YS[row], YS[row + height]
        # Clockwise in a y-up space, which is the winding the original glyphs use.
        rectangles.append([(x0, y0), (x0, y1), (x1, y1), (x1, y0)])
    return rectangles


def build(destination: Path) -> None:
    glyph_order = [".notdef", "space"]
    glyphs: dict[str, object] = {}
    metrics: dict[str, tuple[int, int]] = {}
    cmap: dict[int, str] = {}

    pen = TTGlyphPen(None)
    glyphs[".notdef"] = pen.glyph()
    metrics[".notdef"] = (ADVANCE, 0)
    pen = TTGlyphPen(None)
    glyphs["space"] = pen.glyph()
    metrics["space"] = (ADVANCE, 0)

    for letter, rows in LETTERS.items():
        name = GLYPH_NAMES[letter]
        pen = TTGlyphPen(None)
        for loop in contours(cells(rows)):
            pen.moveTo(loop[0])
            for point in loop[1:]:
                pen.lineTo(point)
            pen.closePath()
        glyphs[name] = pen.glyph()
        metrics[name] = (ADVANCE, 0)
        glyph_order.append(name)
        cmap[ord(letter)] = name
        # Lowercase is a component of the capital, exactly as the Latin of this face is drawn.
        lower = letter.lower()
        if lower != letter:
            lower_name = f"{name}.lc"
            component = TTGlyphPen({name: glyphs[name]})
            component.addComponent(name, (1, 0, 0, 1, 0, 0))
            glyphs[lower_name] = component.glyph()
            metrics[lower_name] = (ADVANCE, 0)
            glyph_order.append(lower_name)
            cmap[ord(lower)] = lower_name

    builder = FontBuilder(UPM, isTTF=True)
    builder.setupGlyphOrder(glyph_order)
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=538, descent=-154, lineGap=9)
    builder.setupNameTable(
        {
            "familyName": "AcknowledgeTT Cyrillic",
            "styleName": "Regular",
            "uniqueFontIdentifier": "AcknowledgeTT Cyrillic; Rogue AI 2027",
            "fullName": "AcknowledgeTT Cyrillic",
            "psName": "AcknowledgeTTCyrillic",
            "version": "Version 1.000",
            "copyright": (
                "Cyrillic drawn on the grid of Acknowledge TT by Brian Kent (GMA Fonts), "
                "which its author released free to use for any purpose."
            ),
        }
    )
    builder.setupOS2(
        sTypoAscender=384,
        sTypoDescender=-77,
        sTypoLineGap=0,
        usWinAscent=538,
        usWinDescent=154,
        sxHeight=384,
        sCapHeight=384,
        xAvgCharWidth=ADVANCE,
        usWeightClass=400,
        usWidthClass=5,
        fsType=0,
    )
    builder.setupPost()
    destination.parent.mkdir(parents=True, exist_ok=True)
    builder.save(str(destination))


def render(letter: str) -> str:
    """An ASCII preview, so a change to the table can be checked without opening a font editor."""
    filled = cells(LETTERS[letter])
    lines = []
    for row in range(MARK_ROW, -1, -1):
        lines.append("".join("#" if (column, row) in filled else "." for column in range(3)))
    return "\n".join(lines)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        for letter in LETTERS:
            print(letter)
            print(render(letter))
            print()
    else:
        root = Path(__file__).resolve().parents[2]
        target = root / "packages" / "ui" / "src" / "assets" / "acknowtt-cyrillic.ttf"
        build(target)
        print(f"wrote {target} ({target.stat().st_size} bytes, {len(LETTERS)} letters)")
