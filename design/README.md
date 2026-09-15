# Design source

Working files for the published design canvas
(<https://claude.ai/artifact/XRHYWTjjWpgV2rbnMJVj1H>).

Each `*.dc.html` is one artboard; `canvas.json` places them. Three of the four
are generated, so edit the generator rather than the HTML:

```bash
python3 gen_faction.py    # -> FactionSelect.dc.html
python3 gen_recruit.py    # -> Recruitment.dc.html
python3 gen_battle.py     # -> _battlefield.svg + _queue.html
```

`Main.dc.html` (the battle screen) is `battle_template.html` with the generated
SVG and queue strip pasted in — see the assembly step in the session that built
it, or re-run it by hand:

```python
tpl = open('battle_template.html').read()
open('Main.dc.html', 'w').write(
    tpl.replace('<!--BATTLEFIELD-->', open('_battlefield.svg').read())
       .replace('<!--QUEUE-->', open('_queue.html').read()))
```

`silhouettes.py` holds the unit shapes and `sigils.py` the faction crests, both
shared across screens so a stack looks the same wherever it appears.

The battlefield geometry is generated rather than hand-written because the
reachability overlay has to be genuinely correct for the mockup to be worth
judging — and 165 hexes is too many to place by hand without errors.

The seeded canvas file itself is gitignored: it is 2.5 MB of packaged editor
and is rebuilt from these sources.
