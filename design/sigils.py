"""Faction crests as geometric sigils.

Drawn on a 46x52 grid, like the unit silhouettes.

These deliberately are NOT little pictures of creatures: a wolf or a rusalka at
crest size collapses into an unreadable blob (an early pass produced a wolf that
read as a cat). Slavic folk carving and embroidery is geometric anyway -- solar
rosettes, sown-field rhombuses, the six-spoke thunder mark -- so the authentic
reference is also the legible one.
"""

SIGILS = {
    # Kitezh: the sown-field rhombus inside a ring. Order, enclosure, a walled city.
    "kitezh": (
        '<circle cx="23" cy="26" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/>'
        '<path d="M23 9l14 17-14 17-14-17z"/>'
        '<path d="M23 17.5l7 8.5-7 8.5-7-8.5z" fill="#0e1210"/>'
        '<rect x="20" y="23" width="6" height="6"/>'
    ),
    # Borovina: a three-tier conifer over a trunk. Reads as forest at any size.
    "borovina": (
        '<rect x="21" y="30" width="4" height="18"/>'
        '<path d="M23 2l9 13H14z"/>'
        '<path d="M23 12l12 15H11z"/>'
        '<path d="M23 22l15 16H8z"/>'
    ),
    # Gromoboy: the gromovoy znak, the six-spoke thunder mark. A real Slavic motif.
    "gromoboy": (
        '<circle cx="23" cy="26" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/>'
        '<path d="M23 6v40M5.7 16l34.6 20M5.7 36l34.6-20" stroke="currentColor" '
        'stroke-width="2.6" fill="none"/>'
        '<circle cx="23" cy="26" r="4.5"/>'
    ),
    # Kostyanoy Dvor: Koshchei's death -- a needle, eye and all, through the egg.
    "kostyanoy": (
        '<ellipse cx="23" cy="31" rx="13" ry="17" fill="none" stroke="currentColor" stroke-width="2.6"/>'
        '<rect x="21.7" y="10" width="2.6" height="40"/>'
        '<circle cx="23" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2.6"/>'
    ),
    # Topyla: a whirlpool closing over one wave. Being pulled under.
    "topyla": (
        '<path d="M38 22c0-9-7-16-15-16S8 13 8 22c0 7 5 13 12 13 5 0 9-4 9-9 0-4-3-7-7-7-3 0-5 2-5 5" '
        'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'
        '<path d="M4 44c5-5 9-5 14 0s9 5 14 0 9-5 10-2" fill="none" stroke="currentColor" '
        'stroke-width="2.6" stroke-linecap="round"/>'
    ),
    # Yagaya Pushcha: the hut, and the legs it turns on.
    "yagaya": (
        '<path d="M23 4l17 13v15H6V17z"/>'
        '<rect x="18" y="21" width="10" height="11" fill="#0e1210"/>'
        '<path d="M15 32l-4 9M31 32l4 9" stroke="currentColor" stroke-width="3" fill="none"/>'
        '<path d="M6 46l5-5 5 5M30 46l5-5 5 5" stroke="currentColor" stroke-width="2.6" fill="none"/>'
    ),
}
