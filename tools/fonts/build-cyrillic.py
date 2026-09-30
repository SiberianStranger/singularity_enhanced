#!/usr/bin/env python3
"""Cyrillic companion to Acknowledge TT, drawn on the Latin face's own pixel grid (SYS-14 ru, section 8).

Acknowledge TT (`packages/ui/src/assets/acknowtt.ttf`, untouched) is a pixel face. Every Latin
outline point sits on a grid of 76.8 font units (1024 x 0.075) on a 1024 unit em: capitals are five
pixels tall (cap height 384), vertical stems are two pixels wide, horizontal bars one pixel tall,
counters two pixels wide, and diagonals are staircases of one-pixel steps (N, Z, K, V, X, M, W).
Letters are six pixels wide, M and W seven, and every advance is the drawn width plus a 76 unit gap
(537 and 614). Lowercase is a component of the capital.

This script writes `packages/ui/src/assets/acknowtt-cyrillic.ttf` on exactly that grid, so the
stylesheet can load it under the same family name behind `unicode-range: U+0400-04FF` and a Russian
label reads as the same face as an English one: same stroke weight, square corners, stepped
diagonals, cap height and spacing rhythm.

- The eleven letters Cyrillic shares with Latin (А В Е К М Н О Р С Т Х) are the Latin drawings,
  pixel for pixel and with the same advance; `test_cyrillic.py` checks them against the Latin font.
- The letters the maintainer reported as unreadable in 0.2.0 get the width their shapes need rather
  than a six-pixel box: И has a real one-pixel staircase (seven pixels) and no crossbar, so it cannot
  read as Н; Ш and Щ have three separate stems (eight and nine pixels) and no V, so neither reads as
  М; Ж is ten pixels with a centre stem and stepped arms, unlike Х; Ы keeps a one-pixel gap between
  its soft sign and its stem (nine pixels); Д has feet below the baseline and a stepped left leg,
  unlike А; Ф is eight pixels with its stem through a bowl, unlike О; З has a short waist tick where
  Э has a long bar and rounded corners; Б's top bar reaches a pixel past its bowl (seven
  pixels), so its silhouette is not Е's.
- Marks use the rows the Latin accents use: Ё carries the dots of Ë in the row above the cap
  (461-538), Й a two-row breve. Д, Ц and Щ descend one pixel below the baseline, like Q's tail.
- The glyphs are traced outlines of the pixel set (outer loops clockwise, holes counter-clockwise),
  the way the Latin draws them, rather than overlapping rectangles.

Run: python3 tools/fonts/build-cyrillic.py [--specimen DIR] [--preview]
Requires fonttools (and Pillow for --specimen). The output is committed and reproducible.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable

PIXEL = 76.8
GAP = 76
UPM = 1024
CAP_ROWS = 5
FONT_TIMESTAMP = int((datetime(2026, 9, 30) - datetime(1904, 1, 1)).total_seconds())

# One string per pixel row, top to bottom. The five plain rows are the cap band (row 4 at the top,
# row 0 on the baseline). A row starting with "^" sits above the cap: the first at row 6 (461-538),
# a second at row 5. A row starting with "_" is the descender row below the baseline (-77-0).
LETTERS: dict[str, tuple[str, ...]] = {
    "А": ("######", "##..##", "######", "##..##", "##..##"),
    "Б": ("#######", "##.....", "#####..", "##..##.", "#####.."),
    "В": ("######", "##..##", "#####.", "##..##", "######"),
    "Г": ("######", "##....", "##....", "##....", "##...."),
    "Д": ("..#####.", "..##.##.", ".##..##.", ".##..##.", "########", "_##....##"),
    "Е": ("######", "##....", "####..", "##....", "######"),
    "Ё": ("^##..##", "######", "##....", "####..", "##....", "######"),
    "Ж": ("##..##..##", ".##.##.##.", "..######..", ".##.##.##.", "##..##..##"),
    "З": ("######", "....##", "...##.", "....##", "######"),
    "И": ("##...##", "##..###", "##.#.##", "###..##", "##...##"),
    "Й": ("^.#...#.", "^..###..", "##...##", "##..###", "##.#.##", "###..##", "##...##"),
    "К": ("##..##", "##.##.", "####..", "##.##.", "##..##"),
    "Л": ("..#####", "..##.##", ".##..##", ".##..##", "##...##"),
    "М": ("##...##", "###.###", "#######", "##.#.##", "##...##"),
    "Н": ("##..##", "##..##", "######", "##..##", "##..##"),
    "О": ("######", "##..##", "##..##", "##..##", "######"),
    "П": ("######", "##..##", "##..##", "##..##", "##..##"),
    "Р": ("######", "##..##", "######", "##....", "##...."),
    "С": ("######", "##....", "##....", "##....", "######"),
    "Т": ("######", "..##..", "..##..", "..##..", "..##.."),
    "У": ("##..##", "##..##", ".#####", "....##", "#####."),
    "Ф": ("...##...", ".######.", "##.##.##", ".######.", "...##..."),
    "Х": ("##..##", "##..##", ".####.", "##..##", "##..##"),
    "Ц": ("##..##.", "##..##.", "##..##.", "##..##.", "#######", "_.....##"),
    "Ч": ("##..##", "##..##", "##..##", ".#####", "....##"),
    "Ш": ("##.##.##", "##.##.##", "##.##.##", "##.##.##", "########"),
    "Щ": ("##.##.##.", "##.##.##.", "##.##.##.", "##.##.##.", "#########", "_.......##"),
    "Ъ": ("###....", ".##....", ".#####.", ".##..##", ".#####."),
    "Ы": ("##.....##", "##.....##", "#####..##", "##..##.##", "#####..##"),
    "Ь": ("##....", "##....", "#####.", "##..##", "#####."),
    "Э": ("#####.", "....##", ".#####", "....##", "#####."),
    "Ю": ("##.######", "##.##..##", "#####..##", "##.##..##", "##.######"),
    "Я": ("######", "##..##", ".#####", ".##.##", "##..##"),
}

# The Latin capital each shared letter is drawn from; the tests hold them to it pixel for pixel.
LATIN_TWINS = {
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H",
    "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X",
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


def unit(pixels: int) -> int:
    """A grid line in font units; round(i * 76.8) reproduces the Latin's 77, 154, 230, 307, 384."""
    return round(pixels * PIXEL)


def cells(letter: str) -> tuple[int, set[tuple[int, int]]]:
    """The width in pixels and the filled (column, row) cells, with row 0 on the baseline."""
    rows = LETTERS[letter]
    marks = [row[1:] for row in rows if row.startswith("^")]
    below = [row[1:] for row in rows if row.startswith("_")]
    body = [row for row in rows if row[0] not in "^_"]
    assert len(body) == CAP_ROWS and len(marks) <= 2 and len(below) <= 1, letter
    width = len(body[0])
    assert all(len(row) == width for row in body + marks + below), letter
    filled: set[tuple[int, int]] = set()
    for index, row in enumerate(marks):
        filled |= {(x, 6 - index) for x, mark in enumerate(row) if mark == "#"}
    for index, row in enumerate(body):
        filled |= {(x, CAP_ROWS - 1 - index) for x, mark in enumerate(row) if mark == "#"}
    for row in below:
        filled |= {(x, -1) for x, mark in enumerate(row) if mark == "#"}
    return width, filled


def advance(letter: str) -> int:
    return unit(cells(letter)[0]) + GAP


def trace(filled: set[tuple[int, int]]) -> list[list[tuple[int, int]]]:
    """The boundary of a pixel set as closed loops in font units.

    Every cell contributes its own clockwise square (y up); an edge two cells share cancels, and the
    edges left over are chained into loops. Outer loops come out clockwise and holes
    counter-clockwise, which is the TrueType winding the Latin glyphs use. Where two loops touch
    at a single corner the walk turns right, so each loop stays simple.
    """
    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for x, y in sorted(filled):
        square = [(x, y), (x, y + 1), (x + 1, y + 1), (x + 1, y)]
        for start, end in zip(square, square[1:] + square[:1]):
            reverse = edges.get(end)
            if reverse is not None and start in reverse:
                reverse.remove(start)
                if not reverse:
                    del edges[end]
            else:
                edges.setdefault(start, []).append(end)
    loops: list[list[tuple[int, int]]] = []
    while edges:
        start = min(edges)
        loop = [start]
        current, heading = start, None
        while True:
            options = edges[current]
            if heading is None or len(options) == 1:
                following = options[0]
            else:
                # The cross product is negative for a right turn in a y-up space.
                following = min(
                    options,
                    key=lambda point: heading[0] * (point[1] - current[1])
                    - heading[1] * (point[0] - current[0]),
                )
            options.remove(following)
            if not options:
                del edges[current]
            heading = (following[0] - current[0], following[1] - current[1])
            current = following
            if current == start:
                break
            loop.append(current)
        corners = [
            point
            for index, point in enumerate(loop)
            if (point[0] - loop[index - 1][0]) * (loop[(index + 1) % len(loop)][1] - point[1])
            != (point[1] - loop[index - 1][1]) * (loop[(index + 1) % len(loop)][0] - point[0])
        ]
        loops.append([(unit(x), unit(y)) for x, y in corners])
    return loops


def build(destination: Path) -> None:
    glyph_order = [".notdef", "space"]
    glyphs: dict[str, object] = {}
    metrics: dict[str, tuple[int, int]] = {}
    cmap: dict[int, str] = {32: "space"}

    for name in (".notdef", "space"):
        glyphs[name] = TTGlyphPen(None).glyph()
        metrics[name] = (unit(6) + GAP, 0)

    for letter in LETTERS:
        name = GLYPH_NAMES[letter]
        _, filled = cells(letter)
        pen = TTGlyphPen(None)
        for loop in trace(filled):
            pen.moveTo(loop[0])
            for point in loop[1:]:
                pen.lineTo(point)
            pen.closePath()
        glyphs[name] = pen.glyph()
        metrics[name] = (advance(letter), unit(min(x for x, _ in filled)))
        glyph_order.append(name)
        cmap[ord(letter)] = name
        # Lowercase is a component of the capital, exactly as the Latin of this face is drawn.
        lower_name = f"{name}.lc"
        component = TTGlyphPen({name: glyphs[name]})
        component.addComponent(name, (1, 0, 0, 1, 0, 0))
        glyphs[lower_name] = component.glyph()
        metrics[lower_name] = metrics[name]
        glyph_order.append(lower_name)
        cmap[ord(letter.lower())] = lower_name

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
            "uniqueFontIdentifier": "AcknowledgeTT Cyrillic; Rogue AI 2027; 3",
            "fullName": "AcknowledgeTT Cyrillic",
            "psName": "AcknowledgeTTCyrillic",
            "version": "Version 3.000",
            "copyright": (
                "Cyrillic companion to Acknowledge TT by Brian Kent (GMA Fonts), "
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
        xAvgCharWidth=round(sum(advance(letter) for letter in LETTERS) / len(LETTERS)),
        usWeightClass=400,
        usWidthClass=5,
        fsType=0,
    )
    builder.setupPost(isFixedPitch=0)
    # The same rasterizer request as the Latin (grayscale, no grid fitting), so a browser that
    # reads `gasp` renders both halves of a mixed label the same way.
    gasp = newTable("gasp")
    gasp.version = 1
    gasp.gaspRange = {0xFFFF: 0x0002}
    builder.font["gasp"] = gasp
    # A reproducible font build makes the committed binary independently checkable.
    builder.font.recalcTimestamp = False
    builder.font["head"].created = FONT_TIMESTAMP
    builder.font["head"].modified = FONT_TIMESTAMP
    destination.parent.mkdir(parents=True, exist_ok=True)
    builder.save(str(destination))


def render(letter: str) -> str:
    """The pixel table of one letter, top row first, for --preview."""
    width, filled = cells(letter)
    return "\n".join(
        f"{row:>2} " + "".join("#" if (column, row) in filled else "." for column in range(width))
        for row in range(6, -2, -1)
        if any((column, row) in filled for column in range(width)) or 0 <= row < CAP_ROWS
    )


SPECIMEN_LABELS = ("ПРОИСХОЖДЕНИЕ", "ЖЕЛЕЗО", "ЩИТ", "ВЫЧИСЛЕНИЯ И ПЛОЩАДКИ", "ОБНАРУЖЕНИЕ",
                   "ДНЕВНИК И РЕШЕНИЯ")


def specimen(font_path: Path, destination: Path) -> None:
    """Render the built TTF next to the Latin at 20 and 40 px, one font per script as CSS does."""
    from PIL import Image, ImageDraw, ImageFont

    root = Path(__file__).resolve().parents[2]
    assets = root / "packages/ui/src/assets"
    caption = ImageFont.truetype(str(assets / "DejaVuSans.ttf"), 15)
    image = Image.new("RGB", (1500, 560), "#000032")
    draw = ImageDraw.Draw(image)

    def run(x: float, baseline: float, text: str, size: int) -> float:
        latin = ImageFont.truetype(str(assets / "acknowtt.ttf"), size)
        cyrillic = ImageFont.truetype(str(font_path), size)
        for character in text:
            face = cyrillic if 0x0400 <= ord(character) <= 0x04FF else latin
            draw.text((round(x), round(baseline)), character, font=face, anchor="ls", fill="white")
            # The game sets the angular face with 0.035 em of letter spacing.
            x += face.getlength(character) + 0.035 * size
        return x

    draw.text((24, 14), "Acknowledge Latin and its Cyrillic companion; actual TTFs, 1 image pixel "
              "= 1 CSS pixel, 0.035 em letter spacing", font=caption, fill="#a0a0ff")
    y = 70
    for size in (20, 40):
        draw.text((24, y - 26), f"{size} px", font=caption, fill="#a0a0ff")
        lines = [
            "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
            "H M X E B O A 3   Н И Ш М Х Ж Е Б Ф О Д А З Э",
            "ЫЬI   И Н   Щ Ш М   Д А   Ф О   Ж Х   Ц   З Э   Е Б",
            "ORIGIN  HARDWARE  RESEARCH  " + "  ".join(SPECIMEN_LABELS[:3]),
            "  ".join(SPECIMEN_LABELS[3:]),
        ]
        for text in lines:
            run(24, y + size * 0.5, text, size)
            y += int(size * 1.15) + 8
        y += 40
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        for letter in LETTERS:
            print(f"{letter}  advance {advance(letter)}")
            print(render(letter))
            print()
    else:
        root = Path(__file__).resolve().parents[2]
        target = root / "packages" / "ui" / "src" / "assets" / "acknowtt-cyrillic.ttf"
        build(target)
        print(f"wrote {target} ({target.stat().st_size} bytes, {len(LETTERS)} letters)")
        if "--specimen" in sys.argv:
            specimen(target, Path(sys.argv[sys.argv.index("--specimen") + 1]))
