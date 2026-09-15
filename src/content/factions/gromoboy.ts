import type { FactionDef } from '../types'

/**
 * Gromoboy — the glass cannon. Acts first, hits hardest, and cannot take a
 * second round of anything. Its whole game is killing a stack before that
 * stack ever gets a turn.
 */
export const gromoboy: FactionDef = {
  id: 'gromoboy',
  name: 'Gromoboy',
  cyrillic: 'ГРОМОБОЙ',
  realm: 'yav',
  accent: '#6f8fa8',
  blurb:
    "Perun's thunder-host, down off the ridge for one afternoon only. " +
    'Strikes first, strikes hard, does not keep.',
  tags: ['High initiative', 'Shooters', 'Thin HP'],
  units: [
    {
      id: 'oblachnik',
      name: 'Oblachnik',
      cyrillic: 'ОБЛАЧНИК',
      role: 'cloud-rider',
      cost: 20,
      maxCount: 40,
      stats: { attack: 5, defense: 3, damage: [2, 4], hp: 9, speed: 7, initiative: 13 },
      ability: {
        id: 'first-light',
        name: 'First Light',
        text: 'Acts before every other stack in round one.',
      },
    },
    {
      id: 'alkonost',
      name: 'Alkonost',
      cyrillic: 'АЛКОНОСТ',
      role: 'bird-maiden',
      cost: 45,
      maxCount: 24,
      stats: { attack: 9, defense: 4, damage: [4, 7], hp: 16, speed: 6, initiative: 12 },
      ranged: { shots: 8, meleePenalty: 0.5 },
      ability: {
        id: 'keening',
        name: 'Keening',
        text: 'The stack it hits loses 2 Initiative until its next turn.',
      },
    },
    {
      id: 'gromovik',
      name: 'Gromovik',
      cyrillic: 'ГРОМОВИК',
      role: 'storm-smith',
      cost: 60,
      maxCount: 14,
      stats: { attack: 11, defense: 6, damage: [5, 8], hp: 26, speed: 6, initiative: 11 },
      ability: {
        id: 'chain',
        name: 'Chain',
        text: 'Also strikes one other enemy adjacent to the target, for half.',
      },
    },
    {
      id: 'zharptitsa',
      name: 'Zhar-ptitsa',
      cyrillic: 'ЖАР-ПТИЦА',
      role: 'firebird',
      cost: 120,
      maxCount: 8,
      stats: { attack: 13, defense: 8, damage: [7, 12], hp: 38, speed: 10, initiative: 14 },
      ability: {
        id: 'flight',
        name: 'Flight',
        text: 'Moves over occupied hexes, and leaves the target burning for 3 a round.',
      },
    },
    {
      id: 'molnienosets',
      name: 'Molnienosets',
      cyrillic: 'МОЛНИЕНОСЕЦ',
      role: 'thunderbearer',
      cost: 200,
      maxCount: 5,
      stats: { attack: 16, defense: 10, damage: [10, 18], hp: 60, speed: 8, initiative: 13 },
      ability: {
        id: 'thunderbolt',
        name: 'Thunderbolt',
        text: 'Once a battle, strike any hex on the field for 40 to 70.',
      },
    },
  ],
}
