import type { FactionDef } from '../types'

/**
 * Borovina — cheap, fast and numerous at the bottom, immovable at the top.
 * It wants to reach you before its chaff evaporates.
 */
export const borovina: FactionDef = {
  id: 'borovina',
  name: 'Borovina',
  cyrillic: 'БОРОВИНА',
  realm: 'yav',
  accent: '#5f7f39',
  blurb:
    "Leshy's old forest, which has never once agreed to be walked through. " +
    'Wolves, wood-wights, things wearing bark.',
  tags: ['Fast', 'Swarm', 'Fragile'],
  units: [
    {
      id: 'kikimora',
      name: 'Kikimora',
      cyrillic: 'КИКИМОРА',
      role: 'sprite',
      cost: 14,
      stats: { attack: 3, defense: 3, damage: [1, 3], hp: 8, speed: 6, initiative: 10 },
      ability: {
        id: 'skitter',
        name: 'Skitter',
        text: 'May move again after destroying a unit.',
      },
    },
    {
      id: 'borovik',
      name: 'Borovik',
      cyrillic: 'БОРОВИК',
      role: 'spore-thrower',
      cost: 30,
      stats: { attack: 7, defense: 5, damage: [3, 5], hp: 14, speed: 4, initiative: 8 },
      ranged: { shots: 10, meleePenalty: 0.5 },
      ability: {
        id: 'spore-burst',
        name: 'Spore Burst',
        text: 'When a unit of this stack dies, adjacent enemies take 4 damage.',
      },
    },
    {
      id: 'volk',
      name: 'Volk',
      cyrillic: 'ВОЛК',
      role: 'wolf',
      cost: 38,
      stats: { attack: 8, defense: 5, damage: [3, 6], hp: 20, speed: 9, initiative: 12 },
      ability: {
        id: 'pack',
        name: 'Pack',
        text: '+3 Attack against a stack an ally is already adjacent to.',
      },
    },
    {
      id: 'dubovik',
      name: 'Dubovik',
      cyrillic: 'ДУБОВИК',
      role: 'oak-wight',
      cost: 85,
      stats: { attack: 10, defense: 12, damage: [5, 9], hp: 48, speed: 5, initiative: 6 },
      ability: {
        id: 'bark',
        name: 'Bark',
        text: 'Ignores the first 4 damage of every hit taken.',
      },
    },
    {
      id: 'leshy',
      name: 'Leshy',
      cyrillic: 'ЛЕШИЙ',
      role: 'forest lord',
      cost: 180,
      stats: { attack: 14, defense: 11, damage: [8, 14], hp: 70, speed: 7, initiative: 9 },
      ability: {
        id: 'lead-astray',
        name: 'Lead Astray',
        text: "Halves the target's movement on its next turn.",
      },
    },
  ],
}
