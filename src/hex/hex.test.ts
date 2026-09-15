import { BOARD } from '../content/balance'
import {
  BOARD_HEXES,
  approachHex,
  findPath,
  isOnBoard,
  reachable,
} from './board'
import {
  axialToOffset,
  hexDistance,
  hexEquals,
  hexKey,
  isAdjacent,
  neighbors,
  offsetToAxial,
  parseHexKey,
} from './index'
import type { Hex } from './index'

const at = (col: number, row: number): Hex => offsetToAxial({ col, row })
const keys = (hexes: Hex[]) => new Set(hexes.map(hexKey))

describe('hex coordinates', () => {
  it('round-trips axial and odd-r offset across the whole board', () => {
    for (let row = 0; row < BOARD.rows; row++) {
      for (let col = 0; col < BOARD.cols; col++) {
        expect(axialToOffset(offsetToAxial({ col, row }))).toEqual({ col, row })
      }
    }
  })

  it('round-trips hex keys', () => {
    const h = { q: -3, r: 7 }
    expect(parseHexKey(hexKey(h))).toEqual(h)
    expect(() => parseHexKey('nope')).toThrow(/bad hex key/)
  })

  it('gives every hex six distinct neighbours, each one step away', () => {
    const h = at(7, 5)
    const ns = neighbors(h)
    expect(ns).toHaveLength(6)
    expect(keys(ns).size).toBe(6)
    for (const n of ns) {
      expect(hexDistance(h, n)).toBe(1)
      expect(isAdjacent(h, n)).toBe(true)
    }
  })

  it('measures distance symmetrically and to zero at home', () => {
    const a = at(2, 3)
    const b = at(11, 8)
    expect(hexDistance(a, a)).toBe(0)
    expect(hexDistance(a, b)).toBe(hexDistance(b, a))
  })

  it('shifts the diagonals by row parity, as odd-r requires', () => {
    // The classic offset-grid bug. On an EVEN row the two hexes below are at
    // (col-1, row+1) and (col, row+1); on an ODD row they are at (col, row+1)
    // and (col+1, row+1). Asserting the whole neighbour set both ways is the
    // only way to be sure the parity term is not simply inverted.
    const offsets = (h: Hex) => keys(neighbors(h).map((n) => n))

    expect(offsets(at(3, 4))).toEqual(
      keys([at(4, 4), at(2, 4), at(3, 3), at(2, 3), at(3, 5), at(2, 5)]),
    )
    expect(offsets(at(3, 5))).toEqual(
      keys([at(4, 5), at(2, 5), at(4, 4), at(3, 4), at(4, 6), at(3, 6)]),
    )

    // And the hexes an inverted parity term would wrongly call adjacent:
    expect(hexDistance(at(3, 4), at(4, 5))).toBe(2)
    expect(hexDistance(at(3, 5), at(2, 6))).toBe(2)
  })
})

describe('board', () => {
  it('holds exactly cols x rows hexes, all on board', () => {
    expect(BOARD_HEXES).toHaveLength(BOARD.cols * BOARD.rows)
    expect(BOARD_HEXES.every(isOnBoard)).toBe(true)
  })

  it('excludes hexes past the edge', () => {
    expect(isOnBoard(at(-1, 0))).toBe(false)
    expect(isOnBoard(at(BOARD.cols, 0))).toBe(false)
    expect(isOnBoard(offsetToAxial({ col: 0, row: BOARD.rows }))).toBe(false)
  })
})

describe('reachable', () => {
  const none: ReadonlySet<string> = new Set()

  it('finds the six neighbours at one step, and never the origin', () => {
    const origin = at(7, 5)
    const reach = reachable(origin, 1, none)
    expect(reach.size).toBe(6)
    expect(reach.has(hexKey(origin))).toBe(false)
    for (const cost of reach.values()) expect(cost).toBe(1)
  })

  it('records the true step cost of each hex', () => {
    const origin = at(7, 5)
    const reach = reachable(origin, 3, none)
    for (const [key, cost] of reach) {
      expect(cost).toBe(hexDistance(origin, parseHexKey(key)))
    }
  })

  it('is clipped by the board edge', () => {
    const corner = reachable(at(0, 0), 1, none)
    expect(corner.size).toBeLessThan(6)
  })

  it('will not route through a blocked hex', () => {
    // Wall off column 3 entirely; nothing to its left can reach its right.
    const wall = new Set(
      Array.from({ length: BOARD.rows }, (_, row) => hexKey(at(3, row))),
    )
    const reach = reachable(at(1, 5), 12, wall)
    for (const key of reach.keys()) {
      expect(axialToOffset(parseHexKey(key)).col).toBeLessThan(3)
    }
  })

  it('lets a flier cross a blocked hex but not land on one', () => {
    const wall = new Set(
      Array.from({ length: BOARD.rows }, (_, row) => hexKey(at(3, row))),
    )
    const reach = reachable(at(1, 5), 12, wall, true)
    const cols = [...reach.keys()].map((k) => axialToOffset(parseHexKey(k)).col)
    expect(Math.max(...cols)).toBeGreaterThan(3)
    for (const key of reach.keys()) expect(wall.has(key)).toBe(false)
  })

  it('never reports a blocked hex as reachable', () => {
    const blocked = new Set([hexKey(at(8, 5)), hexKey(at(7, 6))])
    const reach = reachable(at(7, 5), 4, blocked)
    for (const key of blocked) expect(reach.has(key)).toBe(false)
  })
})

describe('findPath', () => {
  const none: ReadonlySet<string> = new Set()

  it('returns the shortest path, excluding origin and including goal', () => {
    const origin = at(2, 5)
    const goal = at(8, 5)
    const path = findPath(origin, goal, 10, none)
    expect(path).not.toBeNull()
    expect(path).toHaveLength(hexDistance(origin, goal))
    expect(hexEquals(path!.at(-1)!, goal)).toBe(true)
    expect(path!.some((h) => hexEquals(h, origin))).toBe(false)
  })

  it('walks one hex at a time', () => {
    const path = findPath(at(1, 2), at(9, 7), 20, none)!
    const steps = [at(1, 2), ...path]
    for (let i = 1; i < steps.length; i++) {
      expect(hexDistance(steps[i - 1]!, steps[i]!)).toBe(1)
    }
  })

  it('is empty when already at the goal', () => {
    expect(findPath(at(4, 4), at(4, 4), 5, none)).toEqual([])
  })

  it('refuses a goal beyond the step budget', () => {
    expect(findPath(at(0, 5), at(14, 5), 3, none)).toBeNull()
  })

  it('refuses an occupied goal, and routes around a wall', () => {
    const goal = at(8, 5)
    expect(findPath(at(2, 5), goal, 10, new Set([hexKey(goal)]))).toBeNull()

    // A wall with one gap: the path must be longer than the straight line.
    const wall = new Set(
      Array.from({ length: BOARD.rows }, (_, row) => hexKey(at(5, row))).filter(
        (k) => k !== hexKey(at(5, 0)),
      ),
    )
    const around = findPath(at(2, 5), at(8, 5), 30, wall)
    expect(around).not.toBeNull()
    expect(around!.length).toBeGreaterThan(hexDistance(at(2, 5), at(8, 5)))
  })

  it('is deterministic: the same request always yields the same path', () => {
    const a = findPath(at(1, 1), at(11, 8), 25, new Set([hexKey(at(6, 4))]))
    const b = findPath(at(1, 1), at(11, 8), 25, new Set([hexKey(at(6, 4))]))
    expect(a).toEqual(b)
  })
})

describe('approachHex', () => {
  const none: ReadonlySet<string> = new Set()

  it('stays put when already adjacent', () => {
    const origin = at(7, 5)
    const target = at(8, 5)
    expect(approachHex(origin, target, 5, none)).toEqual(origin)
  })

  it('picks a hex adjacent to the target and within reach', () => {
    const origin = at(2, 5)
    const target = at(8, 5)
    const spot = approachHex(origin, target, 8, none)!
    expect(isAdjacent(spot, target)).toBe(true)
    expect(hexDistance(origin, spot)).toBeLessThanOrEqual(8)
  })

  it('returns null when the target cannot be reached', () => {
    expect(approachHex(at(0, 5), at(14, 5), 2, none)).toBeNull()
  })

  it('ignores neighbours that are themselves occupied', () => {
    const origin = at(6, 5)
    const target = at(8, 5)
    const blocked = new Set(neighbors(target).slice(0, 5).map(hexKey))
    const spot = approachHex(origin, target, 8, blocked)
    expect(spot).not.toBeNull()
    expect(blocked.has(hexKey(spot!))).toBe(false)
  })
})
