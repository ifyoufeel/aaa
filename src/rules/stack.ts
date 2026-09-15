/**
 * Stack health arithmetic.
 *
 * A stack is N units of one type. Damage eats the pool from the top, so at
 * most one unit is ever partly wounded — there is no bookkeeping per unit.
 */

import { getUnit } from '../content/factions'
import type { UnitDef } from '../content/types'
import type { Stack } from './types'

export function unitOf(stack: Stack): UnitDef {
  return getUnit(stack.factionId, stack.unitId)
}

export function isAlive(stack: Stack): boolean {
  return stack.count > 0
}

/** Total health left in the stack. */
export function poolHp(stack: Stack): number {
  if (stack.count <= 0) return 0
  return (stack.count - 1) * unitOf(stack).stats.hp + stack.topHp
}

export function maxPoolHp(stack: Stack, count = stack.count): number {
  return count * unitOf(stack).stats.hp
}

export interface DamageOutcome {
  readonly stack: Stack
  /** Health actually removed, never more than the stack had. */
  readonly dealt: number
  readonly killed: number
  readonly destroyed: boolean
}

/** Applies raw damage, returning the wounded stack and what it cost. */
export function applyDamage(stack: Stack, damage: number): DamageOutcome {
  const before = poolHp(stack)
  if (before <= 0 || damage <= 0) {
    return { stack, dealt: 0, killed: 0, destroyed: stack.count <= 0 }
  }

  const dealt = Math.min(damage, before)
  const after = before - dealt
  const hp = unitOf(stack).stats.hp

  if (after <= 0) {
    return {
      stack: { ...stack, count: 0, topHp: 0 },
      dealt,
      killed: stack.count,
      destroyed: true,
    }
  }

  const count = Math.ceil(after / hp)
  const topHp = after - (count - 1) * hp
  return {
    stack: { ...stack, count, topHp },
    dealt,
    killed: stack.count - count,
    destroyed: false,
  }
}

/** Heals the stack without raising its count above where it started. */
export function healStack(stack: Stack, amount: number, maxCount: number): Stack {
  if (amount <= 0 || stack.count <= 0) return stack
  const hp = unitOf(stack).stats.hp
  const ceiling = maxCount * hp
  const after = Math.min(poolHp(stack) + amount, ceiling)
  const count = Math.ceil(after / hp)
  return { ...stack, count, topHp: after - (count - 1) * hp }
}
