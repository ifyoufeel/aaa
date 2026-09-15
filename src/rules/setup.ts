/**
 * Building the opening position.
 *
 * Both armies deploy in a column at their own edge, spread down the middle
 * rows. Deployment is fully determined by the army orders, so both clients
 * construct the identical opening state without exchanging it.
 */

import { BOARD } from '../content/balance'
import { getFaction } from '../content/factions'
import { offsetToAxial } from '../hex'
import type { ArmyOrder, BattleState, Stack } from './types'

/** Column each side deploys on. */
const DEPLOY_COL = { yav: 1, nav: BOARD.cols - 2 } as const

/**
 * Rows to deploy into, centred and spread out. Five stacks on an eleven-row
 * board sit two apart, which keeps a shooter from being screened by its own
 * front line on the first turn.
 */
function deployRows(stackCount: number): number[] {
  const middle = (BOARD.rows - 1) / 2
  const spacing = 2
  const first = middle - ((stackCount - 1) * spacing) / 2
  return Array.from({ length: stackCount }, (_, i) => Math.round(first + i * spacing))
}

function buildStacks(order: ArmyOrder): Stack[] {
  const faction = getFaction(order.factionId)
  // Roster order, not the order the counts happened to be written in, so
  // deployment is identical for identical armies.
  const bought = faction.units
    .map((unit) => ({ unit, count: order.counts[unit.id] ?? 0 }))
    .filter((entry) => entry.count > 0)

  const rows = deployRows(bought.length)
  return bought.map(({ unit, count }, i) => ({
    id: `${order.side}:${unit.id}`,
    side: order.side,
    factionId: order.factionId,
    unitId: unit.id,
    count,
    topHp: unit.stats.hp,
    hex: offsetToAxial({ col: DEPLOY_COL[order.side], row: rows[i]! }),
    ammo: unit.ranged?.shots ?? 0,
    retaliations: 1,
    defending: false,
    waited: false,
    acted: false,
    movedThisTurn: 0,
    effects: [],
  }))
}

export function createBattle(seed: number, yav: ArmyOrder, nav: ArmyOrder): BattleState {
  if (yav.side !== 'yav' || nav.side !== 'nav') {
    throw new Error('createBattle expects one yav order and one nav order')
  }
  const yavStacks = buildStacks(yav)
  const navStacks = buildStacks(nav)
  // A side with nothing on the field has already lost, which is not a battle.
  if (yavStacks.length === 0) throw new Error('cannot start a battle: yav has no stacks')
  if (navStacks.length === 0) throw new Error('cannot start a battle: nav has no stacks')
  const stacks = [...yavStacks, ...navStacks]

  const state: BattleState = {
    seed,
    round: 1,
    stacks,
    activeId: null,
    log: [],
    outcome: null,
  }
  // The first stack to act is simply the head of round one's queue.
  return { ...state, activeId: openingActor(state) }
}

function openingActor(state: BattleState): string | null {
  // Imported lazily to keep the module graph acyclic; queue.ts reads types only.
  const sorted = [...state.stacks].sort((a, b) => {
    const fa = getFaction(a.factionId).units.find((u) => u.id === a.unitId)!
    const fb = getFaction(b.factionId).units.find((u) => u.id === b.unitId)!
    if (fa.stats.initiative !== fb.stats.initiative) {
      return fb.stats.initiative - fa.stats.initiative
    }
    if (a.side !== b.side) return a.side === 'yav' ? -1 : 1
    return a.id < b.id ? -1 : 1
  })
  return sorted[0]?.id ?? null
}
