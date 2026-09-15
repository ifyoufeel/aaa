/**
 * A greedy opponent.
 *
 * Built for the balance pass — you cannot tell whether "just buy cavalry" wins
 * every game without playing several thousand games — and deliberately simple:
 * it takes the best move available this turn and never plans a second one. That
 * is a floor on army strength, not a ceiling, which is what a balance signal
 * wants. A clever AI would tell you about the AI.
 *
 * Pure and deterministic given a state, so a simulated match replays exactly.
 */

import { hexDistance, parseHexKey, type Hex } from '../hex'
import { damageRange } from './damage'
import { meleeTargets, movementRange, shootTargets } from './legal'
import { activeStack } from './queue'
import { isAlive, poolHp, unitOf } from './stack'
import type { Action, BattleState, Stack } from './types'

/** Rough worth of hitting this stack: damage as a fraction of what it has left. */
function appeal(attacker: Stack, defender: Stack): number {
  const a = unitOf(attacker)
  const d = unitOf(defender)
  const { min, max } = damageRange({
    count: attacker.count,
    damage: a.stats.damage,
    attack: a.stats.attack,
    defense: d.stats.defense,
  })
  const expected = (min + max) / 2
  const pool = poolHp(defender)
  if (pool <= 0) return 0
  // Finishing a stack outright is worth more than chipping a big one, and a
  // shooter left alive keeps costing you every round.
  const lethality = Math.min(1, expected / pool)
  const priority = d.ranged ? 1.35 : 1
  return (expected / pool) * priority + lethality * 0.5
}

/** The move a greedy player would make. Null when nothing is possible. */
export function chooseAction(state: BattleState): Action | null {
  const active = activeStack(state)
  if (!active || state.outcome) return null

  const byId = (id: string) => state.stacks.find((s) => s.id === id)!
  const enemies = state.stacks.filter((s) => s.side !== active.side && isAlive(s))
  if (enemies.length === 0) return null

  // Shooting costs nothing and draws no retaliation, so it comes first.
  const shootable = shootTargets(state).map(byId)
  if (shootable.length > 0) {
    const best = shootable.reduce((a, b) => (appeal(active, b) >= appeal(active, a) ? b : a))
    return { type: 'shoot', target: best.id }
  }

  const reachable = meleeTargets(state).map(byId)
  if (reachable.length > 0) {
    const best = reachable.reduce((a, b) => (appeal(active, b) >= appeal(active, a) ? b : a))
    return { type: 'attack', target: best.id }
  }

  // Nothing in range: close on whoever is worth reaching.
  const step = advanceToward(state, active, enemies)
  if (step) return { type: 'move', to: step }

  // Boxed in. Bracing is better than standing about.
  return { type: 'defend' }
}

/**
 * Move toward whoever is worth reaching.
 *
 * Walking at the NEAREST enemy is the obvious rule and a bad one: it marches
 * into the enemy's front line and leaves their shooters free to fire all
 * battle. In simulation that single weakness was worth an unbeatable win rate
 * to shooter-heavy armies, which said more about the AI than about the game.
 * Picking a target by worth over distance closes that hole.
 */
function advanceToward(state: BattleState, active: Stack, enemies: Stack[]): Hex | null {
  const reach = movementRange(state)
  if (reach.size === 0) return null

  // Worth per hex of travel, so a juicy shooter across the field still loses to
  // an equally juicy one nearby.
  const target = enemies.reduce((a, b) => {
    const score = (s: Stack) => appeal(active, s) / (1 + hexDistance(active.hex, s.hex) * 0.15)
    return score(b) > score(a) ? b : a
  })

  let best: Hex | null = null
  let bestDistance = hexDistance(active.hex, target.hex)
  let bestCost = Infinity

  // Map iteration order is insertion order, which keeps this deterministic;
  // ties break towards the cheaper move so a stack does not outrun its line.
  for (const [key, cost] of reach) {
    const hex = parseHexKey(key)
    const distance = hexDistance(hex, target.hex)
    if (distance < bestDistance || (distance === bestDistance && cost < bestCost)) {
      best = hex
      bestDistance = distance
      bestCost = cost
    }
  }
  return best
}
