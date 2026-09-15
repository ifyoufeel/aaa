#!/usr/bin/env python3
"""Generates the battlefield SVG for Main.dc.html.

Hand-writing 117 hexes is error-prone and the reachability overlay has to be
actually correct for the mockup to be worth judging, so the geometry is
computed here and pasted in as literal SVG.
"""

COLS, ROWS = 15, 11   # HoMM3's battlefield dimensions
W, H = 78.0, 70.0          # hex width / height (wider than tall, as in HoMM3)
RS = H * 0.75              # row spacing
PAD = 10.0

BOARD_W = COLS * W + W / 2 + PAD * 2
BOARD_H = (ROWS - 1) * RS + H + PAD * 2


def origin(col: int, row: int) -> tuple[float, float]:
    """Top-left of the hex's bounding box (odd rows shove right by half a hex)."""
    return PAD + col * W + (W / 2 if row % 2 else 0.0), PAD + row * RS


def centre(col: int, row: int) -> tuple[float, float]:
    x, y = origin(col, row)
    return x + W / 2, y + H / 2


def points(col: int, row: int) -> str:
    x, y = origin(col, row)
    pts = [
        (x + W / 2, y),
        (x + W, y + H / 4),
        (x + W, y + H * 3 / 4),
        (x + W / 2, y + H),
        (x, y + H * 3 / 4),
        (x, y + H / 4),
    ]
    return " ".join(f"{px:.1f},{py:.1f}" for px, py in pts)


def to_cube(col: int, row: int) -> tuple[int, int, int]:
    """odd-r offset -> cube coordinates."""
    q = col - (row - (row & 1)) // 2
    return q, row, -q - row


def hex_distance(a: tuple[int, int], b: tuple[int, int]) -> int:
    ax, ay, az = to_cube(*a)
    bx, by, bz = to_cube(*b)
    return max(abs(ax - bx), abs(ay - by), abs(az - bz))


# ── The depicted position: round 3, armies closed ────────────────────────────
KITEZH = "#a24d33"
TOPYLA = "#3d7a76"

# (col, row, unit key, count, side)
STACKS = [
    (3, 4, "kmet", 24, "yav"),
    (3, 6, "gridin", 6, "yav"),
    (1, 3, "strelets", 12, "yav"),
    (4, 5, "bogatyr", 4, "yav"),      # active
    (1, 7, "volkhv", 1, "yav"),
    (11, 4, "rusalka", 9, "nav"),
    (11, 5, "bolotnik", 5, "nav"),
    (12, 6, "vodyanoy", 1, "nav"),
    (12, 3, "drekavac", 7, "nav"),
    (11, 7, "mavka", 14, "nav"),
]
OCCUPIED = {(c, r) for c, r, *_ in STACKS}

ACTIVE = (4, 5)          # Bogatyr
SPEED = 8
TARGET = (11, 5)         # Bolotnik
ATTACK_FROM = (10, 5)
PATH = [(5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5)]

from silhouettes import SILHOUETTES, NAMES  # noqa: E402



out: list[str] = []
add = out.append

add(f'<svg viewBox="0 0 {BOARD_W:.0f} {BOARD_H:.0f}" width="{BOARD_W:.0f}" height="{BOARD_H:.0f}" '
    'style="display: block; max-width: 100%;" aria-label="Battlefield">')
add('  <defs>')
add('    <radialGradient id="groundGlow" cx="50%" cy="46%" r="62%">')
add('      <stop offset="0%" stop-color="#1a211b"/><stop offset="100%" stop-color="#0c0f0d"/>')
add('    </radialGradient>')
add('    <filter id="tokenShadow" x="-60%" y="-60%" width="220%" height="220%">')
add('      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.75"/>')
add('    </filter>')
add('  </defs>')
add(f'  <rect width="{BOARD_W:.0f}" height="{BOARD_H:.0f}" fill="url(#groundGlow)"/>')

# ── Hex cells ────────────────────────────────────────────────────────────────
reachable: set[tuple[int, int]] = set()
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) == ACTIVE:
            continue
        if (c, r) in OCCUPIED:
            continue
        if hex_distance((c, r), ACTIVE) <= SPEED:
            reachable.add((c, r))

add('  <g stroke-width="1">')
for r in range(ROWS):
    for c in range(COLS):
        pts = points(c, r)
        if (c, r) == TARGET:
            fill, stroke, sw = "rgba(184,65,47,0.20)", "#b8412f", 1.8
        elif (c, r) in PATH:
            fill, stroke, sw = "rgba(201,162,39,0.07)", "rgba(201,162,39,0.42)", 1.2
        elif (c, r) == ACTIVE:
            fill, stroke, sw = "rgba(230,193,74,0.12)", "#e6c14a", 1.8
        elif (c, r) in reachable:
            # Faint irregular mottling so the ground is not a flat field of cells.
            tone = "#1f2820" if (c * 3 + r * 5) % 4 else "#1b241c"
            fill, stroke, sw = tone, "#36422f", 1.0
        else:
            # Out of reach this turn: sunk right back into the dark.
            fill, stroke, sw = "#080a09", "#101410", 1.0
        add(f'    <polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
add('  </g>')

# ── Charge path ──────────────────────────────────────────────────────────────
ax, ay = centre(*ACTIVE)
line = f"M{ax:.1f},{ay:.1f}" + "".join(
    f" L{centre(*p)[0]:.1f},{centre(*p)[1]:.1f}" for p in PATH
)
add(f'  <path d="{line}" fill="none" stroke="#c9a227" stroke-width="2" '
    'stroke-dasharray="5 6" stroke-linecap="round" opacity="0.85"/>')
tx, ty = centre(*ATTACK_FROM)
gx, gy = centre(*TARGET)
add(f'  <path d="M{tx:.1f},{ty:.1f} L{gx:.1f},{gy:.1f}" fill="none" stroke="#b8412f" '
    'stroke-width="2.5" stroke-linecap="round"/>')
add(f'  <circle cx="{gx:.1f}" cy="{gy:.1f}" r="7" fill="none" stroke="#b8412f" stroke-width="2"/>')

# ── Stack tokens ─────────────────────────────────────────────────────────────
PW, PH = 50.0, 58.0
for c, r, key, count, side in STACKS:
    cx, cy = centre(c, r)
    ink = KITEZH if side == "yav" else TOPYLA
    is_active = (c, r) == ACTIVE
    px, py = cx - PW / 2, cy - PH / 2 - 4

    add(f'  <g filter="url(#tokenShadow)" color="{ink}">')
    plaque = (f"{px:.1f},{py:.1f} {px + PW:.1f},{py:.1f} {px + PW:.1f},{py + PH * 0.7:.1f} "
              f"{cx:.1f},{py + PH:.1f} {px:.1f},{py + PH * 0.7:.1f}")
    add(f'    <polygon points="{plaque}" fill="#0b0f0e" stroke="{"#e6c14a" if is_active else ink}" '
        f'stroke-width="{2 if is_active else 1.2}"/>')
    scale = 0.72
    sx = cx - (46 * scale) / 2
    sy = py + 5
    add(f'    <g transform="translate({sx:.1f},{sy:.1f}) scale({scale})" fill="{ink}">'
        f'{SILHOUETTES[key]}</g>')
    # count badge
    bw, bh = 34.0, 17.0
    bx, by = cx - bw / 2, py + PH - 2
    add(f'    <rect x="{bx:.1f}" y="{by:.1f}" width="{bw}" height="{bh}" fill="#0b0f0e" '
        f'stroke="{"#e6c14a" if is_active else "#38423a"}" stroke-width="1"/>')
    add(f'    <text x="{cx:.1f}" y="{by + 12.6:.1f}" text-anchor="middle" '
        'font-family="Spectral, Georgia, serif" font-size="12" font-weight="500" '
        f'fill="{"#e6c14a" if is_active else "#cfc8b6"}">{count}</text>')
    add('  </g>')

add('</svg>')

with open("_battlefield.svg", "w", encoding="utf-8") as fh:
    fh.write("\n".join(out))

print(f"board {BOARD_W:.0f}x{BOARD_H:.0f}, {COLS * ROWS} hexes, "
      f"{len(reachable)} reachable, {len(STACKS)} stacks")


# ── Turn queue strip ─────────────────────────────────────────────────────────
# Initiative order for round 3. The active stack leads and is drawn larger.
QUEUE = [
    ("bogatyr", 4, "yav", 11, True),
    ("rusalka", 9, "nav", 10, False),
    ("volkhv", 1, "yav", 10, False),
    ("strelets", 12, "yav", 9, False),
    ("mavka", 14, "nav", 9, False),
    ("kmet", 24, "yav", 8, False),
    ("gridin", 6, "yav", 7, False),
    ("bolotnik", 5, "nav", 7, False),
    ("drekavac", 7, "nav", 6, False),
    ("vodyanoy", 1, "nav", 5, False),
]

q: list[str] = []
for key, count, side, ini, active in QUEUE:
    ink = KITEZH if side == "yav" else TOPYLA
    w, h = (52, 60) if active else (42, 49)
    border = "#e6c14a" if active else "#313b32"
    op = "1" if active else "0.82"
    sil_scale = (w - 14) / 46
    q.append(
        f'<div title="{NAMES[key]} &times;{count} &middot; initiative {ini}" '
        f'style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: {op};">'
        f'<div style="width: {w}px; height: {h}px; display: grid; place-items: center; background: #0b0f0e; '
        f'border: {"2px" if active else "1px"} solid {border}; '
        f'clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);">'
        f'<svg width="{46 * sil_scale:.0f}" height="{52 * sil_scale:.0f}" viewBox="0 0 46 52" '
        f'fill="{ink}" color="{ink}" style="margin-bottom: 6px;">{SILHOUETTES[key]}</svg>'
        f'</div>'
        f'<span style="font-size: 10px; font-variant-numeric: tabular-nums; '
        f'color: {"#e6c14a" if active else "#7d8478"};">{count}</span>'
        f'</div>'
    )

with open("_queue.html", "w", encoding="utf-8") as fh:
    fh.write("\n".join(q))

print(f"queue: {len(QUEUE)} tokens")
