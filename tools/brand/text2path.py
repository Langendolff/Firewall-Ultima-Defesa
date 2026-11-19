"""Texto -> path SVG. Uso como módulo: path_for(font_path, wght, text, size, tracking=0) -> (d, width, ascent, descent)."""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

_cache = {}

def _font(path, wght):
    key = (path, wght)
    if key not in _cache:
        f = TTFont(path)
        if 'fvar' in f:
            f = instantiateVariableFont(f, {'wght': wght})
        _cache[key] = f
    return _cache[key]

def path_for(font_path, wght, text, size, tracking=0.0):
    f = _font(font_path, wght)
    upm = f['head'].unitsPerEm
    s = size / upm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f['hmtx']
    pen = SVGPathPen(gs)
    x = 0.0
    for i, ch in enumerate(text):
        g = cmap.get(ord(ch))
        if g is None:
            continue
        tp = TransformPen(pen, (s, 0, 0, -s, x, 0))
        gs[g].draw(tp)
        x += hmtx[g][0] * s + (tracking * size if i < len(text) - 1 else 0)
    os2 = f['OS/2']
    return pen.getCommands(), x, os2.sTypoAscender * s, -os2.sTypoDescender * s
