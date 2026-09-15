import type { FactionDef } from '../types'

/**
 * Topyla — control. It rarely wins a straight exchange; it wins by deciding
 * where the exchange happens and who is allowed to answer it.
 *
 * Siren Song is a deliberate hard counter to Kitezh's Shield Wall. Every
 * faction should have at least one line drawn at another.
 */
export const topyla: FactionDef = {
  id: 'topyla',
  name: 'Topyla',
  cyrillic: 'ТОПЫЛА',
  realm: 'nav',
  accent: '#3d7a76',
  blurb:
    "Vodyanoy's drowned mire. Rusalki who count your steps, bolotniks who hold " +
    'the last one.',
  tags: ['Control', 'Drag-under', 'Middling'],
  units: [
    {
      id: 'mavka',
      name: 'Mavka',
      cyrillic: 'МАВКА',
      role: 'drowned girl',
      cost: 16,
      stats: { attack: 4, defense: 4, damage: [1, 4], hp: 11, speed: 6, initiative: 9 },
      ability: {
        id: 'beckon',
        name: 'Beckon',
        text: 'A stack that ends its move adjacent to this one loses 1 Speed next round.',
      },
    },
    {
      id: 'rusalka',
      name: 'Rusalka',
      cyrillic: 'РУСАЛКА',
      role: 'siren',
      cost: 42,
      stats: { attack: 7, defense: 4, damage: [3, 5], hp: 18, speed: 5, initiative: 11 },
      ranged: { shots: 10, meleePenalty: 0.5 },
      ability: {
        id: 'siren-song',
        name: 'Siren Song',
        text: 'Shield Wall does not reduce this damage.',
      },
    },
    {
      id: 'bolotnik',
      name: 'Bolotnik',
      cyrillic: 'БОЛОТНИК',
      role: 'mire-warden',
      cost: 58,
      stats: { attack: 9, defense: 10, damage: [4, 7], hp: 34, speed: 4, initiative: 6 },
      ability: {
        id: 'mire',
        name: 'Mire',
        text: 'Enemies adjacent to it may move at most 2 hexes.',
      },
    },
    {
      id: 'drekavac',
      name: 'Drekavac',
      cyrillic: 'ДРЕКАВАЦ',
      role: 'screamer',
      cost: 95,
      stats: { attack: 12, defense: 7, damage: [6, 10], hp: 36, speed: 8, initiative: 12 },
      ability: {
        id: 'shriek',
        name: 'Shriek',
        text: 'The target may not retaliate this round.',
      },
    },
    {
      id: 'vodyanoy',
      name: 'Vodyanoy',
      cyrillic: 'ВОДЯНОЙ',
      role: 'lord of the mere',
      cost: 185,
      stats: { attack: 14, defense: 12, damage: [8, 14], hp: 75, speed: 5, initiative: 7 },
      ability: {
        id: 'drag-under',
        name: 'Drag Under',
        text: 'After it attacks, the target is pulled one hex towards it.',
      },
    },
  ],
}
