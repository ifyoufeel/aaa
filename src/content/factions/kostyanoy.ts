import type { FactionDef } from '../types'

/**
 * Kostyanoy Dvor — the only faction with NO shooter. That is deliberate, and
 * it is the sharpest asymmetry in the game: the bone court has to walk into
 * range while being shot at, and is paid for it in health per gold, healing
 * and a capstone that refuses to die once.
 *
 * Watch this one closely in the balance pass. If a shooting faction can simply
 * kite it forever the trade is not real, and the fix is board size or speed —
 * not quietly handing them a bow.
 */
export const kostyanoy: FactionDef = {
  id: 'kostyanoy',
  name: 'Kostyanoy Dvor',
  cyrillic: 'КОСТЯНОЙ ДВОР',
  realm: 'nav',
  accent: '#9a927c',
  blurb:
    "Koshchei's bone court, where the death is kept elsewhere — in a needle, " +
    'in an egg, in a duck.',
  tags: ['Relentless', 'Hard to finish', 'No shooters'],
  units: [
    {
      id: 'kost',
      name: "Kost'",
      cyrillic: 'КОСТЬ',
      role: 'skeleton',
      cost: 12,
      maxCount: 40,
      stats: { attack: 4, defense: 6, damage: [1, 3], hp: 12, speed: 3, initiative: 5 },
      ability: {
        id: 'reassemble',
        name: 'Reassemble',
        text: 'The stack recovers 1 health at the start of every round.',
      },
    },
    {
      id: 'vurdalak',
      name: 'Vurdalak',
      cyrillic: 'ВУРДАЛАК',
      role: 'ghoul',
      cost: 38,
      maxCount: 24,
      stats: { attack: 8, defense: 5, damage: [3, 6], hp: 20, speed: 5, initiative: 8 },
      ability: {
        id: 'gorge',
        name: 'Gorge',
        text: '+2 Attack for the rest of the battle each time it destroys a unit.',
      },
    },
    {
      id: 'upyr',
      name: "Upyr'",
      cyrillic: 'УПЫРЬ',
      role: 'revenant',
      cost: 62,
      maxCount: 14,
      stats: { attack: 10, defense: 7, damage: [4, 8], hp: 30, speed: 5, initiative: 9 },
      ability: {
        id: 'drain',
        name: 'Drain',
        text: 'Heals the stack for half the damage it deals.',
      },
    },
    {
      id: 'kostolom',
      name: 'Kostolom',
      cyrillic: 'КОСТОЛОМ',
      role: 'bone giant',
      cost: 105,
      maxCount: 8,
      stats: { attack: 13, defense: 12, damage: [6, 11], hp: 55, speed: 4, initiative: 6 },
      ability: {
        id: 'sunder',
        name: 'Sunder',
        text: 'The target loses 3 Defence until its next turn.',
      },
    },
    {
      id: 'bessmertnyy',
      name: 'Bessmertnyy',
      cyrillic: 'БЕССМЕРТНЫЙ',
      role: 'the deathless',
      cost: 190,
      maxCount: 5,
      stats: { attack: 15, defense: 13, damage: [9, 15], hp: 80, speed: 5, initiative: 8 },
      ability: {
        id: 'deathless',
        name: 'Deathless',
        text: 'The first time this stack would be destroyed, it returns with a third of its health.',
      },
    },
  ],
}
