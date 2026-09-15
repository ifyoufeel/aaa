#!/usr/bin/env python3
"""Generates Recruitment.dc.html.

Generated rather than hand-written so the unit silhouettes stay identical to
the ones on the battlefield -- a stack you bought must be the stack you
recognise on the hexes.
"""

from silhouettes import SILHOUETTES

INK = "#a24d33"
BUDGET = 1500

# name, cyrillic, role, cost, att, def, dmg, hp, spd, ini, ability name, ability text, bought
UNITS = [
    ("Kmet", "КМЕТЬ", "spearman", 15, 4, 5, "1&ndash;3", 10, 4, 8,
     "Pike Wall", "+2 Def against a rider that charged in.", 24),
    ("Strelets", "СТРЕЛЕЦ", "archer", 25, 6, 3, "2&ndash;4", 9, 4, 9,
     "Shooter", "12 shots. Halves its damage in melee.", 12),
    ("Gridin", "ГРИДЕНЬ", "guard", 45, 8, 9, "3&ndash;6", 22, 4, 7,
     "Shield Wall", "Halves damage taken from shooters.", 6),
    ("Bogatyr", "БОГАТЫРЬ", "champion", 90, 12, 10, "6&ndash;10", 40, 8, 11,
     "Charge", "+25% damage for every hex crossed to reach the target.", 4),
    ("Volkhv", "ВОЛХВ", "wardspeaker", 140, 10, 8, "5&ndash;9", 35, 5, 10,
     "Ward", "Neighbouring friendly stacks take 15% less damage.", 1),
]

KEYS = ["kmet", "strelets", "gridin", "bogatyr", "volkhv"]

spent = sum(u[3] * u[12] for u in UNITS)
left = BUDGET - spent
total_hp = sum(u[7] * u[12] for u in UNITS)
souls = sum(u[12] for u in UNITS)
slowest = min(u[8] for u in UNITS if u[12])
# Share of the army's gold sunk into stacks that shoot.
ranged_gold = sum(u[3] * u[12] for u in UNITS if u[0] in ("Strelets", "Volkhv"))
ranged_share = round(ranged_gold / spent * 100)


def stat(value: str, label: str) -> str:
    return (f'<div class="stat"><b>{value}</b><span>{label}</span></div>')


rows: list[str] = []
for key, u in zip(KEYS, UNITS):
    (name, cyr, role, cost, att, dfn, dmg, hp, spd, ini,
     ab_name, ab_text, bought) = u
    subtotal = cost * bought
    can_buy_more = cost <= left
    # Dim only a stack you own none of and cannot afford. Owning four Bogatyrs
    # and being short of a fifth is not a greyed-out row.
    dim = "" if (bought or can_buy_more) else "opacity: 0.6;"
    plus_style = "" if can_buy_more else "opacity: 0.3; border-color: #2a3129;"
    if bought:
        trailing = f'<p class="tnum" style="margin: 0; font-size: 14px; color: #c9a227;">{subtotal} g</p>'
        if not can_buy_more:
            trailing += (f'<p class="tnum" style="margin: -4px 0 0; font-size: 11px; color: #6d7468;">'
                         f'{cost - left} g short of another</p>')
    else:
        trailing = (f'<p class="tnum" style="margin: 0; font-size: 12px; color: #8a5d3a;">'
                    f'{cost - left} g short</p>')
    rows.append(f'''      <article style="flex: 1 1 0; display: flex; align-items: center; gap: 20px; padding: 16px 20px; background: #141916; border: 1px solid #2a3129; border-left: 3px solid {INK}; {dim}">
        <div class="plaque">
          <svg width="46" height="52" viewBox="0 0 46 52" fill="{INK}" color="{INK}" style="margin-bottom: 8px;" aria-hidden="true">{SILHOUETTES[key]}</svg>
        </div>
        <div style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: baseline; gap: 11px;">
            <h3 class="display" style="margin: 0; font-size: 22px; letter-spacing: 0.04em;">{name}</h3>
            <span style="font-size: 11.5px; letter-spacing: 0.16em; color: #6d7468;">{cyr} &middot; {role}</span>
          </div>
          <div style="display: flex; gap: 22px;">
            {stat(str(att), "Att")}{stat(str(dfn), "Def")}{stat(dmg, "Dmg")}{stat(str(hp), "HP")}{stat(str(spd), "Spd")}{stat(str(ini), "Ini")}
          </div>
          <p style="margin: 0; font-size: 13px; color: #8f9789;">
            <span style="color: #c2a98f;">{ab_name}</span> &mdash; {ab_text}
          </p>
        </div>
        <div style="flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
          <p class="tnum" style="margin: 0; font-size: 12px; color: #6d7468;">{cost} g each</p>
          <div style="display: flex; align-items: center; gap: 9px;">
            <div class="step">&minus;</div>
            <span class="tnum" style="min-width: 38px; text-align: center; font-size: 21px; color: #e9e1ce;">{bought}</span>
            <div class="step" style="{plus_style}">+</div>
          </div>
          {trailing}
        </div>
      </article>''')

roster = "\n".join(
    f'''          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
            <span style="font-size: 14px; color: #cfc8b6;">{u[0]} <span class="tnum" style="color: #7d8478;">&times;{u[12]}</span></span>
            <span class="tnum" style="font-size: 13px; color: #8f9789;">{u[3] * u[12]}</span>
          </div>''' for u in UNITS
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
    .rc * {{ box-sizing: border-box; }}
    .rc {{
      width: 1440px; height: 900px; position: relative; overflow: hidden;
      background: radial-gradient(ellipse 95% 70% at 38% 8%, #171c15 0%, #0d100e 62%);
      font-family: Spectral, 'Iowan Old Style', Georgia, serif;
      color: #e9e1ce; font-size: 14px;
      display: flex; flex-direction: column;
    }}
    .rc__grain {{
      position: absolute; inset: 0; pointer-events: none; opacity: 0.045; z-index: 9;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
    }}
    .display {{ font-family: Forum, 'Trajan Pro', Palatino, serif; font-weight: 400; }}
    .tnum {{ font-variant-numeric: tabular-nums; }}
    .stat {{ display: flex; flex-direction: column; gap: 2px; min-width: 50px; }}
    .stat b {{ font-weight: 500; font-size: 17px; color: #e0d8c4; font-variant-numeric: tabular-nums; line-height: 1; }}
    .stat span {{ font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #6d7468; }}
    .step {{
      width: 30px; height: 30px; display: grid; place-items: center;
      border: 1px solid #38423a; background: #171c18; color: #c2bba8;
      font-size: 16px; line-height: 1; cursor: pointer;
    }}
    .step:hover {{ border-color: #c9a227; color: #e6c14a; }}
    .plaque {{
      flex: 0 0 auto; width: 76px; height: 90px; display: grid; place-items: center;
      background: #0e1210; clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
    }}
  </style>
</helmet>

<div class="rc">

  <header style="position: relative; z-index: 3; flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 44px 20px; border-bottom: 1px solid #262e28;">
    <div style="display: flex; align-items: center; gap: 18px;">
      <div class="plaque" style="width: 54px; height: 64px;">
        <svg width="33" height="37" viewBox="0 0 46 52" fill="{INK}" color="{INK}" style="margin-bottom: 6px;" aria-hidden="true">{SILHOUETTES['kmet']}</svg>
      </div>
      <div>
        <h1 class="display" style="margin: 0; font-size: 31px; letter-spacing: 0.06em;">Kitezh</h1>
        <p style="margin: 2px 0 0; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #6d7468;">
          Муштра &middot; Muster the druzhina
        </p>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 34px;">
      <div style="text-align: right;">
        <p style="margin: 0; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #6d7468;">Spent</p>
        <p class="tnum" style="margin: 2px 0 0; font-family: Forum, Palatino, serif; font-size: 25px; color: #9aa090;">{spent:,}</p>
      </div>
      <div style="width: 1px; height: 40px; background: #262e28;"></div>
      <div style="text-align: right;">
        <p style="margin: 0; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #6d7468;">Gold left</p>
        <p class="tnum" style="margin: 2px 0 0; font-family: Forum, Palatino, serif; font-size: 36px; color: #e6c14a; line-height: 1;">{left}</p>
      </div>
    </div>
  </header>

  <div style="position: relative; z-index: 3; flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 356px; gap: 30px; padding: 20px 44px 26px;">

    <section style="display: flex; flex-direction: column; gap: 11px; min-height: 0;">
{chr(10).join(rows)}
    </section>

    <aside style="display: flex; flex-direction: column; gap: 14px; min-height: 0;">
      <div style="background: #12170f; border: 1px solid #2a3129; padding: 20px;">
        <h2 class="display" style="margin: 0 0 3px; font-size: 17px; letter-spacing: 0.16em; text-transform: uppercase; color: #cfc5ad;">Your army</h2>
        <p style="margin: 0 0 15px; font-size: 11px; letter-spacing: 0.1em; color: #6d7468;">Five stacks &middot; {souls} souls</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
{roster}
        </div>
        <div style="height: 1px; background: #2a3129; margin: 16px 0 14px;"></div>
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <span style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6d7468;">Remaining</span>
          <span class="tnum" style="font-family: Forum, Palatino, serif; font-size: 23px; color: #e6c14a;">{left} g</span>
        </div>
      </div>

      <!-- What the gold actually bought. With no hero to lean on, the shape of
           the army IS the plan, so it gets stated rather than left to arithmetic. -->
      <div style="background: #12170f; border: 1px solid #2a3129; padding: 18px 20px;">
        <h2 class="display" style="margin: 0 0 13px; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: #8f9789;">Shape of it</h2>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #7d8478;">Health pool</span><span class="tnum" style="color: #cfc8b6;">{total_hp:,}</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #7d8478;">Gold in shooters</span><span class="tnum" style="color: #cfc8b6;">{ranged_share}%</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #7d8478;">Slowest stack</span><span class="tnum" style="color: #cfc8b6;">{slowest} hexes</span></div>
        </div>
        <p style="margin: 13px 0 0; font-size: 12px; line-height: 1.5; color: #5f6a5f; text-wrap: pretty;">
          Slow and thick. Topyla will try to outrange you &mdash; close the distance early.
        </p>
      </div>

      <button style="padding: 16px; font-family: Forum, Palatino, serif; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase; color: #120f06; background: linear-gradient(180deg, #e6c14a 0%, #c9a227 100%); border: 1px solid #f0d878; cursor: pointer; box-shadow: 0 10px 26px -12px rgba(201,162,39,0.55);">
        Take the field
      </button>

      <div style="margin-top: auto; background: #0f1416; border: 1px solid #242c2e; padding: 15px 18px;">
        <div style="display: flex; align-items: center; gap: 9px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #3d7a76; box-shadow: 0 0 9px #3d7a76;"></span>
          <span style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #7fa5a3;">Topyla is recruiting</span>
        </div>
        <p style="margin: 10px 0 0; font-size: 12.5px; line-height: 1.5; color: #6d7468; text-wrap: pretty;">
          You will not see what they bought until the first stack moves.
        </p>
      </div>
    </aside>
  </div>

  <div class="rc__grain"></div>
</div>
</x-dc>
<script data-dc-script data-props='{{"$preview":{{"width":1440,"height":900}}}}'>
class Component extends DCLogic {{}}
</script>
</body>
</html>
'''

with open("Recruitment.dc.html", "w", encoding="utf-8") as fh:
    fh.write(HTML)

print(f"Recruitment: spent {spent}, left {left}, {souls} souls, "
      f"{total_hp} hp, {ranged_share}% ranged")
