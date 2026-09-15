/**
 * The damage formula.
 *
 * HoMM3's, with its two clamps: every point of attack above the target's
 * defence adds 5% up to triple damage, and every point of defence above the
 * attacker's attack removes 2.5% down to 30%. Those clamps are what stop a
 * heavily outmatched stack from either evaporating or becoming immortal.
 */

import { DAMAGE } from '../content/balance'
import type { Rng } from '../engine/rng'

/** How many individual rolls a stack makes, however many units it holds. */
export const MAX_ROLLS = 10

/** Multiplier from the attack/defence difference alone. */
export function attackModifier(attack: number, defense: number): number {
  if (attack >= defense) {
    return Math.min(1 + (attack - defense) * DAMAGE.perAttackPoint, DAMAGE.attackCap)
  }
  return Math.max(1 - (defense - attack) * DAMAGE.perDefensePoint, DAMAGE.defenseFloor)
}

/**
 * Rolls the base damage for `count` units.
 *
 * Rolling once per unit would cost a 40-strong stack forty random draws per
 * attack, and every one of those has to travel to the other client for replay.
 * So we roll at most ten and scale — which also matches HoMM3, where large
 * stacks converge on their average rather than swinging wildly.
 */
export function rollBaseDamage(
  rng: Rng,
  count: number,
  min: number,
  max: number,
): number {
  if (count <= 0) return 0
  const rolls = Math.min(count, MAX_ROLLS)
  let total = 0
  for (let i = 0; i < rolls; i++) total += rng.int(min, max)
  return Math.floor((total * count) / rolls)
}

/**
 * How the dice fall.
 *
 * `min` is Curse; `best` and `worst` are the two halves of Misfortune, which
 * rolls twice and keeps the luckier result for its owner.
 */
export type RollMode = 'normal' | 'min' | 'best' | 'worst'

export interface DamageInput {
  readonly rng: Rng
  readonly count: number
  readonly damage: readonly [number, number]
  readonly attack: number
  readonly defense: number
  /** Everything else: charge bonus, shield wall, ward, range penalty, ... */
  readonly multipliers?: readonly number[]
  /** Flat reduction applied per hit before multipliers, as Bark does. */
  readonly ignored?: number
  readonly roll?: RollMode
}

function rollWith(input: DamageInput): number {
  const [min, max] = input.damage
  switch (input.roll ?? 'normal') {
    case 'min':
      return min * input.count
    case 'best':
    case 'worst': {
      const a = rollBaseDamage(input.rng, input.count, min, max)
      const b = rollBaseDamage(input.rng, input.count, min, max)
      return input.roll === 'best' ? Math.max(a, b) : Math.min(a, b)
    }
    default:
      return rollBaseDamage(input.rng, input.count, min, max)
  }
}

export function computeDamage(input: DamageInput): number {
  const base = rollWith(input)
  const modifier = attackModifier(input.attack, input.defense)
  const extra = (input.multipliers ?? []).reduce((acc, m) => acc * m, 1)
  // Bark eats the first points of the blow before anything scales it.
  const after = Math.max(0, base - (input.ignored ?? 0))
  return Math.max(0, Math.floor(after * modifier * extra))
}

/**
 * The damage a stack would deal, without rolling: the min and max it could
 * produce. This is what the attack preview panel shows, and it must not
 * consume randomness — the preview is drawn on hover, on one client only.
 */
export function damageRange(
  input: Omit<DamageInput, 'rng'>,
): { readonly min: number; readonly max: number } {
  const modifier = attackModifier(input.attack, input.defense)
  const extra = (input.multipliers ?? []).reduce((acc, m) => acc * m, 1)
  const scale = modifier * extra * input.count
  return {
    min: Math.max(0, Math.floor(input.damage[0] * scale)),
    max: Math.max(0, Math.floor(input.damage[1] * scale)),
  }
}
