/**
 * What the active stack may do.
 *
 * The UI greys out buttons and tints hexes with exactly the code that enforces
 * the rules, so the two can never disagree about whether a move is allowed.
 */

import { seededRng } from '../engine/rng'
import type { Result } from '../engine/result'
import { ok } from '../engine/result'
import { hexKey, parseHexKey } from '../hex'
import { approachHex, reachable } from '../hex/board'
import { effectiveSpeed, isFlier } from './abilities'
import { applyAction, blockedHexes } from './apply'
import { activeStack } from './queue'
import { isAlive, unitOf } from './stack'
import type { Action, BattleState } from './types'

/**
 * Whether an action would be accepted.
 *
 * Implemented by running the reducer and discarding the result. The reducer is
 * pure, so this is free of side effects, and it guarantees that "legal" and
 * "accepted" can never drift apart — which two parallel implementations of the
 * same rules certainly would.
 */
export function validate(state: BattleState, action: Action): Result<null> {
  const attempt = applyAction(state, action, seededRng(state.seed))
  return attempt.ok ? ok(null) : attempt
}

/** Hexes the active stack could walk to, with the number of steps each costs. */
export function movementRange(state: BattleState): Map<string, number> {
  const active = activeStack(state)
  if (!active) return new Map()
  return reachable(
    active.hex,
    effectiveSpeed(state, active),
    blockedHexes(state, active),
    isFlier(active),
  )
}

/** Enemy stacks the active stack could reach and strike this turn. */
export function meleeTargets(state: BattleState): string[] {
  const active = activeStack(state)
  if (!active) return []
  const speed = effectiveSpeed(state, active)
  const blocked = blockedHexes(state, active)
  const flying = isFlier(active)

  return state.stacks
    .filter((s) => s.side !== active.side && isAlive(s))
    .filter((s) => approachHex(active.hex, s.hex, speed, blocked, flying) !== null)
    .map((s) => s.id)
}

/** Enemy stacks the active stack could shoot, if it shoots at all. */
export function shootTargets(state: BattleState): string[] {
  const active = activeStack(state)
  if (!active) return []
  if (!unitOf(active).ranged || active.ammo <= 0) return []
  return state.stacks.filter((s) => s.side !== active.side && isAlive(s)).map((s) => s.id)
}

/**
 * Every action the active stack could legally take.
 *
 * Used by the UI, and by the fuzz test that plays thousands of random battles
 * to prove the engine always terminates.
 */
export function legalActions(state: BattleState): Action[] {
  const active = activeStack(state)
  if (!active || state.outcome) return []

  const actions: Action[] = [{ type: 'defend' }]
  if (!active.waited) actions.push({ type: 'wait' })

  for (const key of movementRange(state).keys()) {
    actions.push({ type: 'move', to: parseHexKey(key) })
  }
  for (const target of meleeTargets(state)) {
    actions.push({ type: 'attack', target })
  }
  for (const target of shootTargets(state)) {
    actions.push({ type: 'shoot', target })
  }
  return actions
}

/** Convenience for tests and previews: is this hex occupied? */
export function stackAt(state: BattleState, hex: { q: number; r: number }) {
  const key = hexKey(hex)
  return state.stacks.find((s) => isAlive(s) && hexKey(s.hex) === key) ?? null
}
