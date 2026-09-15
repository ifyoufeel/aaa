/**
 * Regenerates docs/factions.md from the roster in src/content/factions.
 *
 * The TypeScript is canonical — edit the faction files, then run
 * `npm run docs:factions`. Never hand-edit the markdown; it is overwritten.
 */
import { writeFileSync } from 'node:fs'
import { BOARD, GOLD_BUDGET } from '../src/content/balance'
import { FACTIONS, factionsOf } from '../src/content/factions'
import type { FactionDef, Realm } from '../src/content/types'

const REALM_TITLE: Record<Realm, string> = {
  yav: "Явь · Yav', the Waking World",
  nav: 'Навь · Nav’, the Beyond',
}

const REALM_NOTE: Record<Realm, string> = {
  yav: 'The player who sends the invite link picks from these three.',
  nav: 'The player who opens the link picks from these three.',
}

function unitTable(faction: FactionDef): string {
  const head =
    '| Unit | Cost | Max | Att | Def | Dmg | HP | Spd | Ini | Ability |\n' +
    '| --- | --: | --: | --: | --: | --- | --: | --: | --: | --- |'
  const rows = faction.units.map((u) => {
    const s = u.stats
    const shoots = u.ranged ? ` _(shoots, ${u.ranged.shots} shots)_` : ''
    return (
      `| **${u.name}** <br><sub>${u.cyrillic} · ${u.role}</sub> | ${u.cost} | ${u.maxCount} | ` +
      `${s.attack} | ${s.defense} | ${s.damage[0]}–${s.damage[1]} | ${s.hp} | ` +
      `${s.speed} | ${s.initiative} | **${u.ability.name}** — ${u.ability.text}${shoots} |`
    )
  })
  return [head, ...rows].join('\n')
}

function factionSection(faction: FactionDef): string {
  const oneOfEach = faction.units.reduce((sum, u) => sum + u.cost, 0)
  const shooters = faction.units.filter((u) => u.ranged).length
  return [
    `### ${faction.name}`,
    '',
    `<sub>${faction.cyrillic} · ${faction.tags.join(' · ')}</sub>`,
    '',
    faction.blurb.replace(/&rsquo;/g, '’'),
    '',
    unitTable(faction),
    '',
    `<sub>One of each costs **${oneOfEach} g** of the ${GOLD_BUDGET} g budget · ` +
      `${shooters === 0 ? 'no shooters' : `${shooters} shooter`}</sub>`,
  ].join('\n')
}

function realmSection(realm: Realm): string {
  return [
    `## ${REALM_TITLE[realm]}`,
    '',
    REALM_NOTE[realm],
    '',
    factionsOf(realm).map(factionSection).join('\n\n'),
  ].join('\n')
}

const doc = `# Factions

<!--
  GENERATED FILE — do not edit by hand.
  Source of truth is src/content/factions/*.ts; run \`npm run docs:factions\`.
-->

Six castles, three to a side. Each fields five unit types and a **${GOLD_BUDGET} gold**
budget. There are no heroes and no spells, so which units you buy is the entire
pre-battle game.

${realmSection('yav')}

${realmSection('nav')}

## Reading the numbers

- **Att / Def** feed the damage modifier: every point of attack over the target's
  defence adds 5% (capped at ×3), every point of defence over attack removes
  2.5% (floored at ×0.3).
- **Dmg** is rolled per unit in the stack, so a stack of 24 Kmet rolls 24 times.
- **HP** is per unit. A stack's pool is HP × count, and damage eats it from the top.
- **Max** is how many of that unit one side may field. See below.
- **Spd** is hexes per turn on the ${BOARD.cols}×${BOARD.rows} board.
- **Ini** sets turn order within a round, highest first.

## Why recruitment is capped

A stack of N units deals N × damage **and** has N × health, so its effectiveness
goes as N², and value for money goes as \`(hp × damage) / cost²\`. Measured that
way the cheapest unit in every hall beat the dearest by roughly seven to one,
and in simulation armies of pure chaff won about 97% of their battles. No amount
of stat tuning fixes a quadratic.

HoMM3 never had this problem because dwellings limit how many of a creature you
can recruit — gold was never the binding constraint. The **Max** column does the
same job here. Caps are set so a full complement of any one unit costs roughly
40–48% of the purse, which forces every army to be at least three units wide.

## Deliberate asymmetries

- **Kostyanoy Dvor has no shooter at all.** It has to walk into range while being
  shot at, and is paid for it in health per gold, healing, and a capstone that
  refuses to die once. If playtesting shows it can simply be kited forever, the
  fix is board size or speed — not quietly handing it a bow.
- **Topyla's Siren Song ignores Kitezh's Shield Wall.** Every hall should have at
  least one line drawn at another.
- **Yagaya's hut is a unit,** not a battlefield feature: the most defensible stack
  in the game, and one that cannot be flanked out of a lane.
- **Kitezh's capstone is support, not a monster.** Every other hall tops out in
  something enormous; the Volkhv is a wardspeaker. An army built *around* it
  loses, and is supposed to — Kitezh wants one or two of them behind a line of
  Gridin, not five of them in a field.

## Tuning

Every number above lives in \`src/content/factions/*.ts\`, with the budget, board
and damage curve in \`src/content/balance.ts\`. Change those, run
\`npm run docs:factions\`, and this file catches up.
`

writeFileSync('docs/factions.md', doc)

const units = FACTIONS.reduce((n, f) => n + f.units.length, 0)
console.log(`docs/factions.md — ${FACTIONS.length} factions, ${units} units`)
