/**
 * Turn order.
 *
 * Derived from the stacks rather than stored, so it can never drift out of
 * step with them. Within a round: everything that has not acted, highest
 * initiative first, with stacks that chose to wait pushed behind those that
 * did not. Ties break by side and then by id, which keeps the order identical
 * on both clients.
 */

import type { BattleState, Stack } from './types'
import { effectiveInitiative, hasAbility } from './abilities'
import { isAlive } from './stack'

function compare(a: Stack, b: Stack, round = 0): number {
  // Waited stacks act after everyone who did not.
  if (a.waited !== b.waited) return a.waited ? 1 : -1
  // First Light: down off the ridge before anyone has drawn breath.
  if (round === 1) {
    const fa = hasAbility(a, 'first-light')
    const fb = hasAbility(b, 'first-light')
    if (fa !== fb) return fa ? -1 : 1
  }
  const ia = effectiveInitiative(a)
  const ib = effectiveInitiative(b)
  if (ia !== ib) return ib - ia
  if (a.side !== b.side) return a.side === 'yav' ? -1 : 1
  return a.id < b.id ? -1 : 1
}

/** Stacks still to act this round, in the order they will act. */
export function pendingQueue(state: BattleState): Stack[] {
  return state.stacks
    .filter((s) => isAlive(s) && !s.acted)
    .sort((a, b) => compare(a, b, state.round))
}

/**
 * The full order of the current round, acted stacks included, for display.
 * Stacks that have already gone are listed first so the strip reads as a
 * timeline rather than jumping about.
 */
export function roundOrder(state: BattleState): Stack[] {
  const alive = state.stacks.filter(isAlive)
  const order = (x: Stack, y: Stack) => compare(x, y, state.round)
  return [...alive.filter((s) => s.acted).sort(order), ...alive.filter((s) => !s.acted).sort(order)]
}

export function activeStack(state: BattleState): Stack | null {
  if (!state.activeId) return null
  return state.stacks.find((s) => s.id === state.activeId) ?? null
}
