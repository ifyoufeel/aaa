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
import { isAlive, unitOf } from './stack'

function compare(a: Stack, b: Stack): number {
  // Waited stacks act after everyone who did not.
  if (a.waited !== b.waited) return a.waited ? 1 : -1
  const ia = unitOf(a).stats.initiative
  const ib = unitOf(b).stats.initiative
  if (ia !== ib) return ib - ia
  if (a.side !== b.side) return a.side === 'yav' ? -1 : 1
  return a.id < b.id ? -1 : 1
}

/** Stacks still to act this round, in the order they will act. */
export function pendingQueue(state: BattleState): Stack[] {
  return state.stacks.filter((s) => isAlive(s) && !s.acted).sort(compare)
}

/**
 * The full order of the current round, acted stacks included, for display.
 * Stacks that have already gone are listed first so the strip reads as a
 * timeline rather than jumping about.
 */
export function roundOrder(state: BattleState): Stack[] {
  const alive = state.stacks.filter(isAlive)
  return [...alive.filter((s) => s.acted).sort(compare), ...alive.filter((s) => !s.acted).sort(compare)]
}

export function activeStack(state: BattleState): Stack | null {
  if (!state.activeId) return null
  return state.stacks.find((s) => s.id === state.activeId) ?? null
}
