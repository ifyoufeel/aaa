#!/usr/bin/env python3
"""Emits src/ui/art.ts from the same shapes the design canvas uses.

Generated rather than retyped so a unit cannot end up looking like one thing on
the mockups and another in the game.
"""
from silhouettes import SILHOUETTES, NAMES
from sigils import SIGILS

def block(name: str, doc: str, data: dict[str, str], key_type: str) -> str:
    rows = "\n".join(
        f"  {k!r}: {v!r},".replace("'", '"', 2) if False else f"  {k}: `{v}`,"
        for k, v in sorted(data.items())
    )
    return f"/** {doc} */\nexport const {name}: Record<{key_type}, string> = {{\n{rows}\n}}\n"

out = f'''/**
 * Unit silhouettes and faction crests, as raw SVG path markup on a 46x52 grid.
 *
 * GENERATED FILE -- do not edit by hand.
 * Source: design/silhouettes.py and design/sigils.py, via design/gen_art_ts.py.
 * The design canvas draws from the same shapes, so a stack cannot look like one
 * thing on the mockups and another on the battlefield.
 *
 * Silhouettes differ by OUTLINE rather than by detail -- bow-arc, shield-diamond,
 * quadruped, crowned, spiked -- because at token size nothing finer registers.
 *
 * Crests are geometric sigils rather than little pictures of creatures: a wolf
 * at crest size collapses into a blob (an early pass produced one that read as
 * a cat), and Slavic folk carving is geometric anyway.
 */

import type {{ FactionId }} from '../content/types'

{block("UNIT_ART", "Silhouette markup by unit id.", SILHOUETTES, "string")}
{block("FACTION_ART", "Crest markup by faction id.", SIGILS, "FactionId")}
/** Display names, for alt text and tooltips. */
export const UNIT_ART_NAMES: Record<string, string> = {{
{chr(10).join(f"  {k}: {v!r}," for k, v in sorted(NAMES.items()))}
}}
'''
# Normalise Python repr quotes to TS single quotes.
out = out.replace("\\'", "'")
with open("../src/ui/art.ts", "w", encoding="utf-8") as fh:
    fh.write(out)
print(f"src/ui/art.ts — {len(SILHOUETTES)} silhouettes, {len(SIGILS)} crests")
