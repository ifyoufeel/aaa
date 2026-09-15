/**
 * Hex grid maths.
 *
 * Positions are stored as AXIAL coordinates `{q, r}`. Axial keeps neighbours,
 * distance and pathfinding free of the parity special-cases that make offset
 * coordinates such a reliable source of off-by-one bugs; offset `{col, row}` is
 * used only at the two edges of the system — the rectangular board definition
 * and the renderer.
 *
 * The board is odd-r offset: odd rows are shoved half a hex to the right, and
 * hexes are pointy-topped, as in Heroes of Might & Magic 3.
 *
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */

export interface Hex {
  readonly q: number
  readonly r: number
}

export interface Offset {
  readonly col: number
  readonly row: number
}

/** Stable string form, for Map and Set keys. */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`
}

export function parseHexKey(key: string): Hex {
  const [q, r] = key.split(',').map(Number)
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`bad hex key: ${key}`)
  }
  return { q, r }
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r
}

export function hexAdd(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r }
}

/**
 * The six axial directions, in clockwise order starting from due east.
 * Order is fixed and depended upon: it keeps pathfinding deterministic, which
 * the two clients rely on to agree about where a stack walked.
 */
export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function neighbors(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => hexAdd(h, d))
}

export function isAdjacent(a: Hex, b: Hex): boolean {
  return hexDistance(a, b) === 1
}

/** Distance in hexes, via the cube-coordinate identity. */
export function hexDistance(a: Hex, b: Hex): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  // The third cube axis is -q-r, so its delta is -(dq + dr).
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

// ── Offset conversion (odd-r) ────────────────────────────────────────────────

export function offsetToAxial({ col, row }: Offset): Hex {
  return { q: col - (row - (row & 1)) / 2, r: row }
}

export function axialToOffset({ q, r }: Hex): Offset {
  return { col: q + (r - (r & 1)) / 2, row: r }
}

// ── Pixel layout ─────────────────────────────────────────────────────────────

export interface HexLayout {
  /** Full width of one hex in pixels. */
  readonly width: number
  /** Full height of one hex in pixels. */
  readonly height: number
  readonly originX: number
  readonly originY: number
}

/** Centre of a hex in pixels. */
export function hexToPixel(h: Hex, layout: HexLayout): { x: number; y: number } {
  const { col, row } = axialToOffset(h)
  const { width, height, originX, originY } = layout
  return {
    x: originX + col * width + (row & 1 ? width / 2 : 0) + width / 2,
    y: originY + row * height * 0.75 + height / 2,
  }
}

/** The six corners of a pointy-topped hex, as an SVG points string. */
export function hexCorners(h: Hex, layout: HexLayout): string {
  const { x, y } = hexToPixel(h, layout)
  const hw = layout.width / 2
  const hh = layout.height / 2
  const qh = layout.height / 4
  return [
    [x, y - hh],
    [x + hw, y - qh],
    [x + hw, y + qh],
    [x, y + hh],
    [x - hw, y + qh],
    [x - hw, y - qh],
  ]
    .map(([px, py]) => `${(px as number).toFixed(1)},${(py as number).toFixed(1)}`)
    .join(' ')
}
