import type { FactionDef } from '../types'

/**
 * Yagaya Pushcha — attrition and interference. Nothing it does is decisive on
 * its own; the damage comes from the opponent's numbers being slightly wrong
 * for four rounds running.
 *
 * The hut is a unit rather than a battlefield feature. It is the most
 * defensible stack in the game and cannot be flanked out of a lane.
 */
export const yagaya: FactionDef = {
  id: 'yagaya',
  name: 'Yagaya Pushcha',
  cyrillic: 'ЯГАЯ ПУЩА',
  realm: 'nav',
  accent: '#7b5a93',
  blurb:
    "Baba Yaga's wildwood, fenced in lit bone. The hut turns to face you " +
    'whichever way you come.',
  tags: ['Hexes', 'Attrition', 'Erratic'],
  units: [
    {
      id: 'zmora',
      name: 'Zmora',
      cyrillic: 'ЗМОРА',
      role: 'night-mare',
      cost: 18,
      stats: { attack: 4, defense: 3, damage: [1, 4], hp: 9, speed: 7, initiative: 11 },
      ability: {
        id: 'nightmare',
        name: 'Nightmare',
        text: 'The target deals 10% less damage until its next turn.',
      },
    },
    {
      id: 'vedma',
      name: 'Vedma',
      cyrillic: 'ВЕДЬМА',
      role: 'witch',
      cost: 44,
      stats: { attack: 7, defense: 4, damage: [3, 6], hp: 17, speed: 5, initiative: 10 },
      ranged: { shots: 9, meleePenalty: 0.5 },
      ability: {
        id: 'curse',
        name: 'Curse',
        text: 'The stack it hits rolls minimum damage on its next attack.',
      },
    },
    {
      id: 'likho',
      name: 'Likho',
      cyrillic: 'ЛИХО',
      role: 'one-eyed woe',
      cost: 68,
      stats: { attack: 10, defense: 7, damage: [4, 8], hp: 30, speed: 6, initiative: 9 },
      ability: {
        id: 'misfortune',
        name: 'Misfortune',
        text: 'Rolls its damage twice and keeps the better; the target keeps the worse.',
      },
    },
    {
      id: 'izba',
      name: 'Izba',
      cyrillic: 'ИЗБА',
      role: 'the hut',
      cost: 130,
      stats: { attack: 13, defense: 14, damage: [6, 12], hp: 70, speed: 6, initiative: 5 },
      ability: {
        id: 'turns-to-face',
        name: 'Turns to Face',
        text: 'Retaliates against every attack, not just the first each round.',
      },
    },
    {
      id: 'yaga',
      name: 'Baba Yaga',
      cyrillic: 'БАБА ЯГА',
      role: 'the grandmother',
      cost: 210,
      stats: { attack: 15, defense: 11, damage: [9, 16], hp: 65, speed: 7, initiative: 12 },
      ability: {
        id: 'mortar',
        name: 'Mortar and Pestle',
        text: 'Moves over occupied hexes. Every third attack strikes twice.',
      },
    },
  ],
}
