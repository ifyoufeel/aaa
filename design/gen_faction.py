#!/usr/bin/env python3
"""Generates FactionSelect.dc.html."""

from sigils import SIGILS

# key, name, cyrillic, accent, flavour, tags
YAV = [
    ("kitezh", "Kitezh", "КИТЕЖ", "#a24d33",
     "The sunken city&rsquo;s druzhina, still answering a prince six centuries drowned. "
     "Slow, ordered, impossible to shift.",
     ["Shield walls", "Heavy foot", "Low speed"]),
    ("borovina", "Borovina", "БОРОВИНА", "#5f7f39",
     "Leshy&rsquo;s old forest, which has never once agreed to be walked through. "
     "Wolves, wood-wights, things wearing bark.",
     ["Fast", "Swarm", "Fragile"]),
    ("gromoboy", "Gromoboy", "ГРОМОБОЙ", "#6f8fa8",
     "Perun&rsquo;s thunder-host, down off the ridge for one afternoon only. "
     "Strikes first, strikes hard, does not keep.",
     ["High initiative", "Shooters", "Thin HP"]),
]

NAV = [
    ("kostyanoy", "Kostyanoy Dvor", "КОСТЯНОЙ ДВОР", "#9a927c",
     "Koshchei&rsquo;s bone court, where the death is kept elsewhere &mdash; in a needle, "
     "in an egg, in a duck.",
     ["Relentless", "Hard to finish", "Slow"]),
    ("topyla", "Topyla", "ТОПЫЛА", "#3d7a76",
     "Vodyanoy&rsquo;s drowned mire. Rusalki who count your steps, bolotniks who hold "
     "the last one.",
     ["Control", "Drag-under", "Middling"]),
    ("yagaya", "Yagaya Pushcha", "ЯГАЯ ПУЩА", "#7b5a93",
     "Baba Yaga&rsquo;s wildwood, fenced in lit bone. The hut turns to face you "
     "whichever way you come.",
     ["Hexes", "Attrition", "Erratic"]),
]

CHOSEN_YAV = "kitezh"
CHOSEN_NAV = "topyla"


def tag(text: str, colour: str, border: str) -> str:
    return (f'<span style="font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; '
            f'color: {colour}; border: 1px solid {border}; padding: 3px 8px;">{text}</span>')


def card(key, name, cyr, accent, flavour, tags, *, mine: bool, chosen: bool) -> str:
    """One faction card.

    `mine` is your own side; the opponent's unchosen halls stay recessed, since
    what they might have picked is not yours to study.
    """
    plaque_bg = "#0e1210" if mine else "#0c1012"

    if chosen:
        frame = (f'position: relative; background: linear-gradient(180deg, #1c2019 0%, #161a15 100%); '
                 f'border: 1px solid {accent}; '
                 f'box-shadow: 0 0 0 1px {accent}33, 0 14px 30px -18px rgba(0,0,0,0.9), '
                 f'inset 0 1px 0 rgba(233,225,206,0.05);')
        title_colour, cyr_colour, body_colour = "#e9e1ce", "#6d7468", "#b3ad9c"
    elif mine:
        frame = "background: #12160f; border: 1px solid #262e28;"
        title_colour, cyr_colour, body_colour = "#cfc8b6", "#6d7468", "#9aa090"
    else:
        frame = "background: #0f1416; border: 1px solid #242c2e; opacity: 0.55;"
        title_colour, cyr_colour, body_colour = "#9aa09c", "#5b6466", "#7b8486"

    corners = ""
    if chosen:
        corners = (
            '<div style="position: absolute; top: -1px; left: -1px; width: 10px; height: 10px; '
            'border-top: 2px solid #c9a227; border-left: 2px solid #c9a227;"></div>'
            '<div style="position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; '
            'border-bottom: 2px solid #c9a227; border-right: 2px solid #c9a227;"></div>'
        )

    badge = ""
    if chosen:
        label = "Chosen" if mine else "Locked in"
        colour = "#c9a227" if mine else "#5f9e99"
        badge = (f'<span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; '
                 f'color: {colour};">{label}</span>')

    # Tags are the hall's tactical shape. You see your own three, and whichever
    # one the opponent actually locked -- not the two they passed over.
    tag_row = ""
    if mine or chosen:
        t_colour = "#c2a98f" if mine else "#7fa5a3"
        t_border = "#3b332b" if mine else "#2a3536"
        tag_row = ('<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px;">'
                   + "".join(tag(t, t_colour, t_border) for t in tags) + '</div>')

    return f'''      <article style="display: flex; gap: 18px; padding: 18px; {frame}">
        {corners}
        <div style="flex: 0 0 auto; width: 74px; height: 88px; display: grid; place-items: center; background: {plaque_bg}; clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);">
          <svg width="44" height="50" viewBox="0 0 46 52" fill="{accent}" color="{accent}" style="margin-bottom: 8px;" aria-hidden="true">{SIGILS[key]}</svg>
        </div>
        <div style="flex: 1 1 auto; min-width: 0;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
            <h3 class="display" style="margin: 0; font-size: 23px; letter-spacing: 0.05em; color: {title_colour};">{name}</h3>
            {badge}
          </div>
          <p style="margin: 3px 0 0; font-size: 12px; letter-spacing: 0.14em; color: {cyr_colour};">{cyr}</p>
          <p style="margin: 9px 0 0; font-size: 13.5px; line-height: 1.55; color: {body_colour}; text-wrap: pretty;">{flavour}</p>
          {tag_row}
        </div>
      </article>'''


yav_cards = "\n".join(
    card(*f, mine=True, chosen=f[0] == CHOSEN_YAV) for f in YAV
)
nav_cards = "\n".join(
    card(*f, mine=False, chosen=f[0] == CHOSEN_NAV) for f in NAV
)

HTML = f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Forum&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap">
  <style>
    body {{ margin: 0; }}
    a {{ color: #c9a227; }} a:hover {{ color: #e6c14a; }}
    .fs * {{ box-sizing: border-box; }}
    .fs {{
      width: 1440px; height: 900px; position: relative; overflow: hidden;
      background: #0d100e;
      font-family: Spectral, 'Iowan Old Style', Georgia, serif;
      color: #e9e1ce; font-size: 14px;
    }}
    .fs__grain {{
      position: absolute; inset: 0; pointer-events: none; opacity: 0.045; z-index: 5;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
    }}
    .fs__vignette {{
      position: absolute; inset: 0; pointer-events: none; z-index: 4;
      background: radial-gradient(ellipse 80% 65% at 50% 42%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.62) 100%);
    }}
    .display {{ font-family: Forum, 'Trajan Pro', Palatino, serif; font-weight: 400; }}
    .tnum {{ font-variant-numeric: tabular-nums; }}
  </style>
</helmet>

<div class="fs">

  <!-- Two realms, two grounds: Yav' reads warmer, Nav' colder. -->
  <div style="position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr;">
    <div style="background: radial-gradient(ellipse 90% 70% at 40% 30%, #161b14 0%, #0d100e 70%);"></div>
    <div style="background: radial-gradient(ellipse 90% 70% at 60% 30%, #101619 0%, #0b0e10 70%);"></div>
  </div>

  <div style="position: absolute; left: 719px; top: 96px; bottom: 96px; width: 2px; background: linear-gradient(180deg, rgba(56,66,58,0) 0%, #38423a 18%, #38423a 82%, rgba(56,66,58,0) 100%); z-index: 2;"></div>
  <div style="position: absolute; left: 706px; top: 50%; margin-top: -14px; z-index: 3;">
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="7.5" fill="#0d100e" stroke="#4b5a4c" stroke-width="1"/>
      <path d="M14 4v6M14 18v6M4 14h6M18 14h6" stroke="#4b5a4c" stroke-width="1"/>
      <circle cx="14" cy="14" r="2.2" fill="#c9a227"/>
    </svg>
  </div>

  <header style="position: relative; z-index: 3; padding: 34px 56px 0; text-align: center;">
    <p style="margin: 0 0 10px; font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #7d8478;">
      Выбор крепости
    </p>
    <h1 class="display" style="margin: 0; font-size: 40px; letter-spacing: 0.06em; color: #e9e1ce;">
      Choose your castle
    </h1>
    <p style="margin: 12px 0 0; font-size: 13px; color: #7d8478;">
      Each side fields <span class="tnum" style="color: #c9a227;">1500</span> gold. Pick a hall, then spend it.
    </p>
  </header>

  <div style="position: relative; z-index: 3; display: grid; grid-template-columns: 1fr 1fr; padding: 38px 56px 0;">

    <section style="padding-right: 46px; display: flex; flex-direction: column; gap: 18px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #262e28; padding-bottom: 12px;">
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <h2 class="display" style="margin: 0; font-size: 26px; letter-spacing: 0.12em; color: #cfc5ad;">ЯВЬ</h2>
          <span style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #7d8478;">The Waking World</span>
        </div>
        <span style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #c9a227; border: 1px solid #5c4d1c; padding: 4px 9px;">You</span>
      </div>
{yav_cards}
    </section>

    <section style="padding-left: 46px; display: flex; flex-direction: column; gap: 18px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #262e28; padding-bottom: 12px;">
        <span style="font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #6d7468; border: 1px solid #2c332a; padding: 4px 9px;">Opponent</span>
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <span style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #7d8478;">The Beyond</span>
          <h2 class="display" style="margin: 0; font-size: 26px; letter-spacing: 0.12em; color: #cfc5ad;">НАВЬ</h2>
        </div>
      </div>
{nav_cards}
    </section>
  </div>

  <div style="position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 0 56px 34px;">
    <div style="padding-right: 46px;">
      <button style="width: 100%; padding: 15px 20px; font-family: Forum, Palatino, serif; font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #120f06; background: linear-gradient(180deg, #e6c14a 0%, #c9a227 100%); border: 1px solid #f0d878; cursor: pointer; box-shadow: 0 10px 26px -12px rgba(201,162,39,0.6);">
        Lock in Kitezh
      </button>
      <p style="margin: 10px 0 0; text-align: center; font-size: 11.5px; letter-spacing: 0.1em; color: #6d7468;">
        You can still change until you lock.
      </p>
    </div>
    <div style="padding-left: 46px; text-align: center;">
      <div style="padding: 15px 20px; border: 1px dashed #2a3536; color: #7fa5a3; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;">
        Opponent ready
      </div>
      <p style="margin: 10px 0 0; font-size: 11.5px; letter-spacing: 0.1em; color: #5b6466;">
        Waiting on you.
      </p>
    </div>
  </div>

  <div class="fs__vignette"></div>
  <div class="fs__grain"></div>
</div>
</x-dc>
<script data-dc-script data-props='{{"$preview":{{"width":1440,"height":900}}}}'>
class Component extends DCLogic {{}}
</script>
</body>
</html>
'''

with open("FactionSelect.dc.html", "w", encoding="utf-8") as fh:
    fh.write(HTML)

print(f"FactionSelect: {len(YAV) + len(NAV)} halls, chosen {CHOSEN_YAV} vs {CHOSEN_NAV}")
