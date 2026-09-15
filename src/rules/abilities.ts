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
import type { BattleState, EffectKind, Stack } from './types'

/**
 * Abilities the engine actually enforces.
 *
 * The faction screen reads this set and refuses to offer a hall whose abilities
 * are not all in it. An ability belongs here only once a test asserts what it
 * does to the board -- `hasAbility` returns false for anything absent, so an
 * implemented-but-unlisted ability is simply inert.
 */
export const IMPLEMENTED: ReadonlySet<AbilityId> = new Set<AbilityId>([
  // Kitezh
  'pike-wall',
  'volley',
  'shield-wall',
  'charge',
  'ward',
  // Borovina
  'skitter',
  'pack',
  'spore-burst',
  'bark',
  'lead-astray',
  // Gromoboy
  'first-light',
  'keening',
  'chain',
  'flight',
  'thunderbolt',
  // Kostyanoy Dvor
  'reassemble',
  'gorge',
  'drain',
  'sunder',
  'deathless',
  // Topyla
  'beckon',
  'siren-song',
  'mire',
  'shriek',
  'drag-under',
  // Yagaya Pushcha
  'nightmare',
  'curse',
  'misfortune',
  'turns-to-face',
  'mortar',
])

export function hasAbility(stack: Stack, id: AbilityId): boolean {
  return IMPLEMENTED.has(id) && unitOf(stack).ability.id === id
}

/** Total size of an effect on a stack, or zero when it is not present. */
export function effectAmount(stack: Stack, kind: EffectKind): number {
  return stack.effects
    .filter((e) => e.kind === kind)
    .reduce((n, e) => n + (e.amount ?? 1), 0)
}

export function hasEffect(stack: Stack, kind: EffectKind): boolean {
  return stack.effects.some((e) => e.kind === kind)
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
  // Gorge and its like are earned for the rest of the battle, not for a turn.
  let bonus = ctx.attacker.attackBonus

  // Volley: a shooter that held its ground this round aims better.
  if (hasAbility(ctx.attacker, 'volley') && ctx.kind === 'shoot' && ctx.attacker.movedThisTurn === 0) {
    bonus += 2
  }
  // Pack: wolves pile onto something already engaged.
  if (hasAbility(ctx.attacker, 'pack')) {
    const engaged = ctx.state.stacks.some(
      (s) =>
        s.id !== ctx.attacker.id &&
        s.side === ctx.attacker.side &&
        isAlive(s) &&
        isAdjacent(s.hex, ctx.defender.hex),
    )
    if (engaged) bonus += 3
  }
  return base + bonus
}

/** Defence stat to use against this strike. */
export function effectiveDefense(ctx: AttackContext): number {
  const base = unitOf(ctx.defender).stats.defense
  // Sunder strips armour until the target's next turn.
  let bonus = -effectAmount(ctx.defender, 'sundered')

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

  // Nightmare: something sat on its chest last night.
  const cowed = effectAmount(ctx.attacker, 'cowed')
  if (cowed > 0) out.push(Math.max(0, 1 - cowed))

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

/** Flat damage the defender simply shrugs off, before multipliers. */
export function damageIgnored(defender: Stack): number {
  // Bark: the first few points of every blow go into the wood.
  return hasAbility(defender, 'bark') ? 4 : 0
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
 * Retaliations a unit gets each round. The hut answers everything.
 *
 * Keyed off the ability rather than a live stack so that deployment can use it
 * too -- an earlier cut hardcoded one retaliation at setup, which quietly left
 * Turns to Face doing nothing at all for the whole of round one.
 */
export function retaliationsForAbility(id: AbilityId): number {
  return IMPLEMENTED.has(id) && id === 'turns-to-face' ? Number.MAX_SAFE_INTEGER : 1
}

export function retaliationsPerRound(stack: Stack): number {
  return retaliationsForAbility(unitOf(stack).ability.id)
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
  speed -= effectAmount(stack, 'slowed')
  // Lead Astray: the forest rearranged itself behind you.
  if (hasEffect(stack, 'lost')) speed = Math.floor(speed / 2)

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

/** Initiative after any effect on it, for the turn queue. */
export function effectiveInitiative(stack: Stack): number {
  return Math.max(1, unitOf(stack).stats.initiative - effectAmount(stack, 'deafened'))
}

/** Every ability of this hall that the engine actually enforces. */
export function factionReadiness(units: readonly { ability: { id: AbilityId } }[]): {
  live: number
  total: number
  ready: boolean
} {
  const live = units.filter((u) => IMPLEMENTED.has(u.ability.id)).length
  return { live, total: units.length, ready: live === units.length }
}

/** Whether this specific ability does anything yet. */
export function abilityIsLive(id: AbilityId): boolean {
  return IMPLEMENTED.has(id)
}
