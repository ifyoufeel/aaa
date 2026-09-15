/**
 * Unit abilities.
 *
 * Implemented as a handful of explicit questions the combat code asks —
 * "what multiplies this damage?", "may the defender answer?" — rather than a
 * generic hook framework. There are only thirty abilities and they are read far
 * more often than they are written, so being able to see every rule that
 * touches damage in one function is worth more than extensibility theatre.
 *
 * NOT every ability is live yet. `IMPLEMENTED` is the honest list, and a test
 * asserts it, so the gap between the roster and the engine stays visible
 * instead of silently doing nothing on the battlefield.
 */

import { CHARGE, RANGED } from '../content/balance'
import type { AbilityId } from '../content/types'
import { hexDistance, isAdjacent } from '../hex'
import { isAlive, unitOf } from './stack'
import type { BattleState, Stack } from './types'

/**
 * Abilities the engine actually enforces. The rest are written on the cards
 * and in docs/factions.md but do nothing yet; they land as the remaining four
 * factions are brought in.
 */
export const IMPLEMENTED: ReadonlySet<AbilityId> = new Set<AbilityId>([
  // Kitezh
  'pike-wall',
  'volley',
  'shield-wall',
  'charge',
  'ward',
  // Topyla
  'beckon',
  'siren-song',
  'mire',
  'shriek',
  'drag-under',
])

export function hasAbility(stack: Stack, id: AbilityId): boolean {
  return IMPLEMENTED.has(id) && unitOf(stack).ability.id === id
}

export type AttackKind = 'melee' | 'shoot' | 'retaliate'

export interface AttackContext {
  readonly state: BattleState
  readonly attacker: Stack
  readonly defender: Stack
  readonly kind: AttackKind
  /** Hexes the attacker crossed on the way in; what Charge is paid on. */
  readonly moved: number
}

/** Living stacks on `side`, adjacent to `hex`. */
function alliesAround(state: BattleState, stack: Stack): Stack[] {
  return state.stacks.filter(
    (s) => s.id !== stack.id && s.side === stack.side && isAlive(s) && isAdjacent(s.hex, stack.hex),
  )
}

function enemiesAround(state: BattleState, stack: Stack): Stack[] {
  return state.stacks.filter((s) => s.side !== stack.side && isAlive(s) && isAdjacent(s.hex, stack.hex))
}

/** Attack stat to use for this strike, abilities and status included. */
export function effectiveAttack(ctx: AttackContext): number {
  const base = unitOf(ctx.attacker).stats.attack
  let bonus = 0

  // Volley: a shooter that held its ground this round aims better.
  if (hasAbility(ctx.attacker, 'volley') && ctx.kind === 'shoot' && ctx.attacker.movedThisTurn === 0) {
    bonus += 2
  }
  return base + bonus
}

/** Defence stat to use against this strike. */
export function effectiveDefense(ctx: AttackContext): number {
  const base = unitOf(ctx.defender).stats.defense
  let bonus = 0

  // Pike Wall: braced against a rider that closed the distance.
  if (hasAbility(ctx.defender, 'pike-wall') && ctx.kind === 'melee' && ctx.moved > 0) {
    bonus += 2
  }
  // Defending trades the turn for a third again as much defence.
  if (ctx.defender.defending) bonus += Math.round(base * 0.3)

  return base + bonus
}

/** Multipliers on damage the attacker deals. */
export function outgoingMultipliers(ctx: AttackContext): number[] {
  const out: number[] = []

  // Charge: harder the further it came, but capped -- uncapped it was worth
  // +150% across the field and cavalry beat everything 96% of the time.
  if (hasAbility(ctx.attacker, 'charge') && ctx.kind === 'melee' && ctx.moved > 0) {
    out.push(Math.min(1 + CHARGE.perHex * ctx.moved, CHARGE.cap))
  }

  if (ctx.kind === 'shoot') {
    // Shooting with someone in your face.
    if (enemiesAround(ctx.state, ctx.attacker).length > 0) out.push(RANGED.adjacentPenalty)
    // And shooting across the whole field.
    if (hexDistance(ctx.attacker.hex, ctx.defender.hex) > RANGED.longRange) {
      out.push(RANGED.longRangePenalty)
    }
  }

  return out
}

/** Multipliers on damage the defender takes. */
export function incomingMultipliers(ctx: AttackContext): number[] {
  const out: number[] = []

  // Shield Wall halves incoming fire -- unless the singer ignores it.
  if (
    hasAbility(ctx.defender, 'shield-wall') &&
    ctx.kind === 'shoot' &&
    !hasAbility(ctx.attacker, 'siren-song')
  ) {
    out.push(0.5)
  }

  // Ward: a wardspeaker standing alongside takes the edge off.
  if (alliesAround(ctx.state, ctx.defender).some((a) => hasAbility(a, 'ward'))) {
    out.push(0.8)
  }

  return out
}

/** May the defender strike back at this attack? */
export function canRetaliate(ctx: AttackContext): boolean {
  if (ctx.kind !== 'melee') return false
  if (!isAlive(ctx.defender)) return false
  if (ctx.defender.retaliations <= 0) return false
  // Shriek: the target is too busy screaming to answer.
  if (hasAbility(ctx.attacker, 'shriek')) return false
  return true
}

/**
 * Hexes this stack may cross on its turn, after abilities.
 *
 * Mire is the interesting one: it is an enemy's aura, so a stack's own speed
 * is not knowable from the stack alone.
 */
export function effectiveSpeed(state: BattleState, stack: Stack): number {
  let speed = unitOf(stack).stats.speed

  // Beckon: something drowned counted your steps last round.
  if (stack.effects.some((e) => e.kind === 'slowed')) speed -= 1

  // Mire: bogged down while standing next to a mire-warden.
  if (enemiesAround(state, stack).some((e) => hasAbility(e, 'mire'))) {
    speed = Math.min(speed, 2)
  }

  return Math.max(0, speed)
}

/** Does this stack move over occupied hexes? */
export function isFlier(stack: Stack): boolean {
  return hasAbility(stack, 'flight') || hasAbility(stack, 'mortar')
}
