import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from text2path import path_for

# Uso: python build_brand.py <pasta-com-Baloo2.ttf-e-Nunito.ttf> <pasta-de-saída>
# Gera os SVGs de design/brand/. Precisa de fonttools (pip install fonttools).
FONTS = sys.argv[1]; OUT = sys.argv[2]
BALOO = f'{FONTS}/Baloo2.ttf'; NUNITO = f'{FONTS}/Nunito.ttf'
NAVY, BLUE, BLUE_DEEP, AMBER, WHITE = '#1b2a55', '#4c7ef3', '#1e3f94', '#f5a623', '#ffffff'
os.makedirs(OUT, exist_ok=True)

# ---- símbolo A, grade 256 (já com correção óptica: pacote +1 px, conjunto 2 px acima/à esquerda) ----
PACKET = (69, 126, 25)
BRICKS = [(116, 64, 44), (168, 64, 44),
          (116, 109, 18), (142, 109, 44), (194, 109, 18),
          (116, 154, 44), (168, 154, 44)]
BRICK_H, BRICK_R = 34, 7
# versão pequena (≤ 32 px): menos tijolos e maiores, o padrão desencontrado continua
PACKET_S = (64, 128, 31)
BRICKS_S = [(112, 56, 104), (112, 108, 48), (168, 108, 48), (112, 160, 104)]
BRICK_H_S, BRICK_R_S = 40, 9

def glyph(wall, packet, small=False):
    bricks, h, r = (BRICKS_S, BRICK_H_S, BRICK_R_S) if small else (BRICKS, BRICK_H, BRICK_R)
    cx, cy, cr = PACKET_S if small else PACKET
    rects = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}"/>' for x, y, w in bricks)
    return f'<g fill="{wall}">{rects}</g><circle cx="{cx}" cy="{cy}" r="{cr}" fill="{packet}"/>'

def tile(gid='bg', small=False):
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="256" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{BLUE_DEEP}"/></linearGradient></defs>'
            f'<rect width="256" height="256" rx="56" fill="url(#{gid})"/>' + glyph(WHITE, AMBER, small))

def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><title>{title}</title>{body}</svg>\n'

def write(name, content):
    open(f'{OUT}/{name}', 'w').write(content)

write('firewall-icon.svg', svg(1024, 1024, f'<g transform="scale(4)">{tile()}</g>', 'Firewall: A Última Defesa'))
write('firewall-icon-small.svg', svg(256, 256, tile(small=True), 'Firewall (tamanho pequeno)'))
write('firewall-symbol.svg', svg(256, 256, glyph('#000000', '#000000'), 'Firewall: símbolo'))
write('firewall-symbol-color.svg', svg(256, 256, glyph(NAVY, AMBER), 'Firewall: símbolo em cor'))

# ---- logo horizontal: tile + "Firewall" (Baloo 2 ExtraBold) + "A ÚLTIMA DEFESA" (Nunito ExtraBold) ----
def wordmark(x, base, size, title_color, sub_color):
    d1, w1, _, _ = path_for(BALOO, 800, 'Firewall', size, tracking=-0.01)
    sub_size = size * 0.215
    d2, w2, _, _ = path_for(NUNITO, 800, 'A ÚLTIMA DEFESA', sub_size, tracking=0.2)
    sx = x + size * 0.04
    body = (f'<path transform="translate({x:.1f} {base:.1f})" fill="{title_color}" d="{d1}"/>'
            f'<path transform="translate({sx:.1f} {base + size * 0.42:.1f})" fill="{sub_color}" d="{d2}"/>')
    return body, max(w1, w2 + size * 0.04)

for name, title_c, sub_c in (('firewall-logo-horizontal.svg', NAVY, '#c17e0f'), ('firewall-logo-horizontal-dark.svg', WHITE, AMBER)):
    wm, ww = wordmark(296, 158, 150, title_c, sub_c)
    write(name, svg(round(296 + ww + 8), 256, tile() + wm, 'Firewall: A Última Defesa'))

# ---- banner social / topo do README, 1280x640 ----
pattern = []
for row in range(9):
    y = 20 + row * 72
    off = -60 if row % 2 else 0
    for col in range(7):
        x = 820 + off + col * 120
        pattern.append(f'<rect x="{x}" y="{y}" width="108" height="60" rx="14"/>')
wm, ww = wordmark(410, 300, 140, WHITE, AMBER)
d3, w3, _, _ = path_for(NUNITO, 600, 'Um tower defense educativo sobre segurança de redes', 30)
banner = (
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="640" gradientUnits="userSpaceOnUse">'
    f'<stop offset="0" stop-color="{NAVY}"/><stop offset="1" stop-color="#121d3d"/></linearGradient>'
    '<linearGradient id="fade" x1="820" y1="0" x2="1280" y2="0" gradientUnits="userSpaceOnUse">'
    '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.07"/></linearGradient></defs>'
    '<rect width="1280" height="640" fill="url(#sky)"/>'
    f'<g fill="url(#fade)">{"".join(pattern)}</g>'
    f'<g transform="translate(120 200) scale(0.94)">{tile("bgb")}</g>'
    + wm +
    f'<path transform="translate(412 420)" fill="#ffffff" fill-opacity="0.8" d="{d3}"/>'
)
write('firewall-banner.svg', svg(1280, 640, banner, 'Firewall: A Última Defesa'))
print('ok', round(ww), round(w3))
