import { BOARD } from '../../content/balance'
import type { HexLayout } from '../../hex'

/**
 * Board geometry, shared by the grid and everything drawn on top of it.
 *
 * Hexes are wider than they are tall, as in HoMM3 — a square hex on a 15x11
 * board gives a field far taller than any screen.
 */
export const HEX: HexLayout = {
  width: 78,
  height: 70,
  originX: 10,
  originY: 10,
}

export const BOARD_PX = {
  width: BOARD.cols * HEX.width + HEX.width / 2 + HEX.originX * 2,
  height: (BOARD.rows - 1) * HEX.height * 0.75 + HEX.height + HEX.originY * 2,
} as const
