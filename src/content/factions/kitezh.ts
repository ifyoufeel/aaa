import type { FactionDef } from '../types'

/**
 * Kitezh — the reference faction. Everything else is balanced against this one:
 * a straight line of foot, shooters and one heavy rider, with no tricks beyond
 * standing where it was told to stand.
 */
export const kitezh: FactionDef = {
  id: 'kitezh',
  name: 'Kitezh',
  cyrillic: 'КИТЕЖ',
  realm: 'yav',
  accent: '#a24d33',
  blurb:
    "The sunken city's druzhina, still answering a prince six centuries drowned. " +
    'Slow, ordered, impossible to shift.',
  tags: ['Shield walls', 'Heavy foot', 'Low speed'],
  units: [
    {
      id: 'kmet',
      name: 'Kmet',
      cyrillic: 'КМЕТЬ',
      role: 'spearman',
      cost: 15,
      stats: { attack: 4, defense: 5, damage: [1, 3], hp: 10, speed: 4, initiative: 8 },
      ability: {
        id: 'pike-wall',
        name: 'Pike Wall',
        text: '+2 Defence against a rider that charged in.',
      },
    },
    {
      id: 'strelets',
      name: 'Strelets',
      cyrillic: 'СТРЕЛЕЦ',
      role: 'archer',
      cost: 25,
      stats: { attack: 6, defense: 3, damage: [2, 4], hp: 9, speed: 4, initiative: 9 },
      ranged: { shots: 12, meleePenalty: 0.5 },
      ability: {
        id: 'volley',
        name: 'Volley',
        text: '+2 Attack in any round it has not moved.',
      },
    },
    {
      id: 'gridin',
      name: 'Gridin',
      cyrillic: 'ГРИДЕНЬ',
      role: 'guard',
      cost: 45,
      stats: { attack: 8, defense: 9, damage: [3, 6], hp: 22, speed: 4, initiative: 7 },
      ability: {
        id: 'shield-wall',
        name: 'Shield Wall',
        text: 'Halves damage taken from shooters.',
      },
    },
    {
      id: 'bogatyr',
      name: 'Bogatyr',
      cyrillic: 'БОГАТЫРЬ',
      role: 'champion',
      cost: 90,
      stats: { attack: 12, defense: 10, damage: [6, 10], hp: 40, speed: 8, initiative: 11 },
      ability: {
        id: 'charge',
        name: 'Charge',
        text: '+25% damage for every hex crossed to reach the target.',
      },
    },
    {
      id: 'volkhv',
      name: 'Volkhv',
      cyrillic: 'ВОЛХВ',
      role: 'wardspeaker',
      cost: 140,
      stats: { attack: 10, defense: 8, damage: [5, 9], hp: 35, speed: 5, initiative: 10 },
      ability: {
        id: 'ward',
        name: 'Ward',
        text: 'Neighbouring friendly stacks take 15% less damage.',
      },
    },
  ],
}
