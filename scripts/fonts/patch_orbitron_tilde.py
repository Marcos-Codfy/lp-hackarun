# corrige o til da Orbitron (Ã Õ ã õ Ñ ñ): o original parece acento grave em título grande
# uso: python scripts/fonts/patch_orbitron_tilde.py   (precisa de fonttools e brotli)
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.TupleVariation import TupleVariation

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "node_modules/@fontsource-variable/orbitron/files/orbitron-latin-wght-normal.woff2"
OUT = ROOT / "src/assets/fonts/orbitron-pt-latin-wght.woff2"

# linha central do til em degraus (sobe, topo, desce, base, sobe), no espaço do tildecomb
CENTER = [(-185, 694), (-118, 792), (-42, 792), (42, 694), (118, 694), (185, 792)]
# espessura do traço no peso 400 e 900 (a haste do I vai de 82 a 153)
THICK = {400: 64, 900: 116}


def offset_outline(points, thickness):
    # contorno fechado do traço com junções em esquadria (estilo geométrico da Orbitron)
    half = thickness / 2

    def normal(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = (dx * dx + dy * dy) ** 0.5
        return (-dy / length, dx / length)

    def side(sign):
        out = []
        for i, p in enumerate(points):
            prev_n = normal(points[i - 1], p) if i > 0 else None
            next_n = normal(p, points[i + 1]) if i < len(points) - 1 else None
            if prev_n and next_n:
                mx, my = prev_n[0] + next_n[0], prev_n[1] + next_n[1]
                ml = (mx * mx + my * my) ** 0.5
                mx, my = mx / ml, my / ml
                scale = half / max(0.35, mx * next_n[0] + my * next_n[1])
                out.append((p[0] + sign * mx * scale, p[1] + sign * my * scale))
            else:
                n = prev_n or next_n
                out.append((p[0] + sign * n[0] * half, p[1] + sign * n[1] * half))
        return out

    left, right = side(1), side(-1)
    return [(round(x), round(y)) for x, y in left + right[::-1]]


def build_glyph(points):
    glyph = Glyph()
    glyph.numberOfContours = 1
    glyph.coordinates = GlyphCoordinates(points)
    glyph.endPtsOfContours = [len(points) - 1]
    glyph.flags = bytearray([1] * len(points))
    glyph.program = ttProgram.Program()
    glyph.program.fromBytecode(b"")
    glyph.recalcBounds(None)
    return glyph


def main():
    font = TTFont(SRC)
    thin = offset_outline(CENTER, THICK[400])
    bold = offset_outline(CENTER, THICK[900])

    for name, dx in (("tildecomb", 0), ("tilde", 202)):
        pts = [(x + dx, y) for x, y in thin]
        font["glyf"][name] = build_glyph(pts)
        deltas = [(b[0] - a[0], b[1] - a[1]) for a, b in zip(thin, bold)] + [(0, 0)] * 4
        font["gvar"].variations[name] = [TupleVariation({"wght": (0.0, 1.0, 1.0)}, deltas)]
        advance, _ = font["hmtx"][name]
        font["hmtx"][name] = (advance, min(x for x, _ in pts))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(OUT)
    print(OUT.relative_to(ROOT), OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
