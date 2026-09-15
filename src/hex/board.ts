/**
 * The rectangular battlefield, and movement across it.
 *
 * Every step between adjacent hexes costs exactly one, so breadth-first search
 * is already optimal here — A* would add a heuristic, a priority queue and a
 * tie-breaking rule to solve a problem BFS solves exactly, on a board of 165
 * cells. The traversal order is fixed by DIRECTIONS so that both clients
 * always derive the same path for the same request.
 */

import { BOARD } from '../content/balance'
import type { Hex } from './index'
import { DIRECTIONS, hexAdd, hexDistance, hexKey, offsetToAxial } from './index'

/** Every hex of the board, in reading order. */
export const BOARD_HEXES: readonly Hex[] = Array.from({ length: BOARD.rows }, (_, row) =>
  Array.from({ length: BOARD.cols }, (_, col) => offsetToAxial({ col, row })),
).flat()

const ON_BOARD = new Set(BOARD_HEXES.map(hexKey))

export function isOnBoard(h: Hex): boolean {
  return ON_BOARD.has(hexKey(h))
}

/** Hexes a stack may not enter, keyed by `hexKey`. */
export type Blocked = ReadonlySet<string>

/**
 * Every hex reachable from `origin` within `steps`, with the number of steps
 * each one costs. Excludes the origin itself and anything blocked.
 *
 * `flying` ignores blocked hexes en route but still cannot finish on one,
 * which is how HoMM3 treats flight.
 */
export function reachable(
  origin: Hex,
  steps: number,
  blocked: Blocked,
  flying = false,
): Map<string, number> {
  const seen = new Map<string, number>([[hexKey(origin), 0]])
  const out = new Map<string, number>()
  let frontier: Hex[] = [origin]

  for (let depth = 1; depth <= steps && frontier.length > 0; depth++) {
    const next: Hex[] = []
    for (const hex of frontier) {
      for (const direction of DIRECTIONS) {
        const candidate = hexAdd(hex, direction)
        const key = hexKey(candidate)
        if (seen.has(key) || !ON_BOARD.has(key)) continue
        // A flier passes over occupied hexes but may not land on one.
        if (blocked.has(key) && !flying) continue
        seen.set(key, depth)
        next.push(candidate)
        if (!blocked.has(key)) out.set(key, depth)
      }
    }
    frontier = next
  }
  return out
}

/**
 * Shortest path from `origin` to `goal`, exclusive of the origin and inclusive
 * of the goal, or `null` when the goal is unreachable within `steps`.
 */
export function findPath(
  origin: Hex,
  goal: Hex,
  steps: number,
  blocked: Blocked,
  flying = false,
): Hex[] | null {
  const goalKey = hexKey(goal)
  if (goalKey === hexKey(origin)) return []
  if (!ON_BOARD.has(goalKey) || blocked.has(goalKey)) return null
  if (hexDistance(origin, goal) > steps) return null

  const cameFrom = new Map<string, Hex | null>([[hexKey(origin), null]])
  let frontier: Hex[] = [origin]

  for (let depth = 1; depth <= steps && frontier.length > 0; depth++) {
    const next: Hex[] = []
    for (const hex of frontier) {
      for (const direction of DIRECTIONS) {
        const candidate = hexAdd(hex, direction)
        const key = hexKey(candidate)
        if (cameFrom.has(key) || !ON_BOARD.has(key)) continue
        if (blocked.has(key) && !flying) continue
        cameFrom.set(key, hex)
        if (key === goalKey) return rebuild(cameFrom, candidate)
        next.push(candidate)
      }
    }
    frontier = next
  }
  return null
}

function rebuild(cameFrom: Map<string, Hex | null>, goal: Hex): Hex[] {
  const path: Hex[] = []
  let cursor: Hex | null = goal
  while (cursor) {
    path.push(cursor)
    cursor = cameFrom.get(hexKey(cursor)) ?? null
  }
  path.pop() // drop the origin
  return path.reverse()
}

/**
 * The hex a melee attacker should stand on to strike `target` from `origin`:
 * the reachable neighbour of the target that costs the fewest steps. Ties
 * break by DIRECTIONS order, so both clients pick the same one.
 */
export function approachHex(
  origin: Hex,
  target: Hex,
  steps: number,
  blocked: Blocked,
  flying = false,
): Hex | null {
  if (hexDistance(origin, target) === 1) return origin
  const reach = reachable(origin, steps, blocked, flying)
  let best: Hex | null = null
  let bestCost = Infinity
  for (const direction of DIRECTIONS) {
    const candidate = hexAdd(target, direction)
    const cost = reach.get(hexKey(candidate))
    if (cost !== undefined && cost < bestCost) {
      best = candidate
      bestCost = cost
    }
  }
  return best
}
