"""Inspect the compiled Cyrillic companion against the Latin Acknowledge it has to match.

The font is checked as a font and as FreeType pixels, not only as its construction table: every
outline point on the Latin's 76.8-unit grid, only square corners, the shared letters identical to
the Latin, the reported pairs distinct when rasterized at interface sizes, and a byte-identical
rebuild. Run: python -m pytest tools/fonts/test_cyrillic.py (fonttools, pytest and Pillow required).
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
LATIN = ROOT / "packages/ui/src/assets/acknowtt.ttf"
COMMITTED = ROOT / "packages/ui/src/assets/acknowtt-cyrillic.ttf"
SOURCE = Path(__file__).with_name("build-cyrillic.py")
spec = spec_from_file_location("cyrillic_builder", SOURCE)
assert spec is not None and spec.loader is not None
builder = module_from_spec(spec)
spec.loader.exec_module(builder)

GRID = {round(i * 76.8) for i in range(-2, 14)}

# The pairs the maintainer reported as reading alike in 0.2.0 (SYS-11 "Control room (0.3.0)").
REPORTED_PAIRS = ["ИН", "ШМ", "ДА", "ФО", "ЖХ", "ЗЭ", "ЕБ"]


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    path = tmp_path_factory.mktemp("cyrillic") / "font.ttf"
    builder.build(path)
    with TTFont(path) as font:
        yield path, font


@pytest.fixture(scope="module")
def latin():
    with TTFont(LATIN) as font:
        yield font


def pixels(font: TTFont, character: str) -> set[tuple[int, int]]:
    """The glyph sampled at the centre of every grid pixel, as (column, row) cells."""
    glyphs = font.getGlyphSet()
    name = font.getBestCmap()[ord(character)]
    width = round(font["hmtx"][name][0] / 76.8) + 1
    filled = set()
    for column in range(-1, width + 1):
        for row in range(-2, 8):
            pen = PointInsidePen(glyphs, ((column + 0.5) * 76.8, (row + 0.5) * 76.8))
            glyphs[name].draw(pen)
            if pen.getResult():
                filled.add((column, row))
    return filled


def raster(path: Path, text: str, size: int) -> Image.Image:
    image = Image.new("L", (int(size * 4), int(size * 1.6)))
    ImageDraw.Draw(image).text(
        (4, int(size * 1.2)), text, font=ImageFont.truetype(str(path), size), anchor="ls", fill=255
    )
    return image


def runs(cells: set[tuple[int, int]], row: int) -> int:
    columns = sorted(column for column, y in cells if y == row)
    return sum(1 for index, column in enumerate(columns) if index == 0 or columns[index - 1] != column - 1)


def test_complete_alphabet_and_matching_lowercase_metrics(built):
    _, font = built
    cmap = font.getBestCmap()
    assert len(builder.LETTERS) == 33
    for letter in builder.LETTERS:
        assert ord(letter) in cmap and ord(letter.lower()) in cmap
        upper, lower = cmap[ord(letter)], cmap[ord(letter.lower())]
        assert font["hmtx"][upper] == font["hmtx"][lower]
        assert font["glyf"][lower].isComposite()
        assert font["glyf"][lower].components[0].glyphName == upper


def test_vertical_family_metrics_match_the_latin(built, latin):
    _, font = built
    assert font["head"].unitsPerEm == latin["head"].unitsPerEm == 1024
    assert (font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap) == (
        latin["hhea"].ascent, latin["hhea"].descent, latin["hhea"].lineGap)
    assert (font["OS/2"].sTypoAscender, font["OS/2"].sTypoDescender) == (
        latin["OS/2"].sTypoAscender, latin["OS/2"].sTypoDescender)
    assert (font["OS/2"].usWinAscent, font["OS/2"].usWinDescent) == (
        latin["OS/2"].usWinAscent, latin["OS/2"].usWinDescent)
    assert font["gasp"].gaspRange == latin["gasp"].gaspRange
    for letter, name in builder.GLYPH_NAMES.items():
        glyph = font["glyf"][name]
        assert glyph.yMax <= (538 if letter in "ЁЙ" else 384), letter
        assert glyph.yMin >= (-77 if letter in "ДЦЩ" else 0), letter
        assert glyph.xMax < font["hmtx"][name][0], letter


def test_every_outline_is_square_and_on_the_latin_pixel_grid(built):
    _, font = built
    for letter, name in builder.GLYPH_NAMES.items():
        points, ends, _ = font["glyf"][name].getCoordinates(font["glyf"])
        first = 0
        for last in ends:
            contour = list(points[first:last + 1])
            for a, b in zip(contour, contour[1:] + contour[:1]):
                assert a[0] in GRID and a[1] in GRID, (letter, a)
                # A smooth diagonal would move both coordinates at once.
                assert a[0] == b[0] or a[1] == b[1], (letter, a, b)
            first = last + 1


def test_the_letters_shared_with_latin_are_the_latin_drawings(built, latin):
    _, font = built
    latin_cmap = latin.getBestCmap()
    for cyrillic, twin in builder.LATIN_TWINS.items():
        assert pixels(font, cyrillic) == pixels(latin, twin), cyrillic
        assert font["hmtx"][font.getBestCmap()[ord(cyrillic)]] == latin["hmtx"][latin_cmap[ord(twin)]]


def test_the_outline_is_exactly_the_designed_pixels(built):
    _, font = built
    for letter in builder.LETTERS:
        assert pixels(font, letter) == builder.cells(letter)[1], letter


def test_widths_are_whole_pixels_and_the_reported_letters_are_wider(built, latin):
    _, font = built
    cmap = font.getBestCmap()
    regular = latin["hmtx"][latin.getBestCmap()[ord("H")]][0]
    assert regular == font["hmtx"][cmap[ord("Н")]][0] == 537
    for letter in builder.LETTERS:
        assert (font["hmtx"][cmap[ord(letter)]][0] - 76) in GRID, letter
    for letter in "ИЫЩШЖФДЦ":
        assert font["hmtx"][cmap[ord(letter)]][0] > regular, letter
    assert font["hmtx"][cmap[ord("Ж")]][0] > font["hmtx"][cmap[ord("Х")]][0]
    assert font["post"].isFixedPitch == 0


@pytest.mark.parametrize("pair", REPORTED_PAIRS)
def test_reported_pairs_differ_on_the_grid(built, pair):
    _, font = built
    left, right = pixels(font, pair[0]), pixels(font, pair[1])
    assert len(left ^ right) >= 3, pair


@pytest.mark.parametrize("size", [20, 24, 40])
@pytest.mark.parametrize("pair", REPORTED_PAIRS)
def test_reported_pairs_remain_distinct_when_rasterized_at_ui_sizes(built, size, pair):
    path, _ = built
    left, right = raster(path, pair[0], size), raster(path, pair[1], size)
    changed = sum(value > 60 for value in ImageChops.difference(left, right).tobytes())
    union = sum(value > 60 for value in ImageChops.lighter(left, right).tobytes())
    assert changed / union >= 0.1, (pair, size, changed, union)


def test_soft_sign_and_stem_of_yery_stay_apart(built):
    _, font = built
    cells = pixels(font, "Ы")
    width = builder.cells("Ы")[0]
    empty = [column for column in range(width) if not any((column, row) in cells for row in range(5))]
    assert empty, "Ы needs a column of air between its soft sign and its stem"


@pytest.mark.parametrize("letter,row,stems", [("Ш", 2, 3), ("Щ", 2, 3), ("Ф", 2, 3), ("Ж", 4, 3),
                                               ("Ы", 1, 3), ("И", 2, 3), ("М", 4, 2)])
def test_wide_letters_keep_their_separate_strokes(built, letter, row, stems):
    _, font = built
    assert runs(pixels(font, letter), row) == stems


def test_i_has_a_staircase_where_en_has_a_crossbar(built):
    _, font = built
    i, en = pixels(font, "И"), pixels(font, "Н")
    assert runs(i, 2) == 3 and runs(en, 2) == 1


@pytest.mark.parametrize("letter,feet", [("Д", 2), ("Ц", 1), ("Щ", 1)])
def test_descenders_are_visible_below_the_baseline(built, letter, feet):
    _, font = built
    glyph = font["glyf"][font.getBestCmap()[ord(letter)]]
    assert glyph.yMin == -77
    assert runs(pixels(font, letter), -1) == feet


def test_rebuild_matches_the_committed_font_byte_for_byte(built):
    path, _ = built
    assert path.read_bytes() == COMMITTED.read_bytes()
