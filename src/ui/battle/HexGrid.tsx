import { BOARD_HEXES } from '../../hex/board'
import { hexCorners, hexKey, type Hex } from '../../hex'
import { HEX } from './layout'

/**
 * The battlefield.
 *
 * Unreachable hexes sink into the dark rather than reachable ones lighting up:
 * with a speed-8 stack the lit version covers 122 of 165 cells, which is noise
 * rather than information. HoMM3 does it the same way round.
 */
export function HexGrid({
  reachable,
  path,
  activeHex,
  targetHex,
  onPick,
}: {
  reachable: ReadonlySet<string>
  path: ReadonlySet<string>
  activeHex: Hex | null
  targetHex: Hex | null
  onPick: (hex: Hex) => void
}) {
  const activeKey = activeHex ? hexKey(activeHex) : null
  const targetKey = targetHex ? hexKey(targetHex) : null

  return (
    <g className="grid">
      {BOARD_HEXES.map((hex, i) => {
        const key = hexKey(hex)
        const state =
          key === targetKey
            ? 'target'
            : key === activeKey
              ? 'active'
              : path.has(key)
                ? 'path'
                : reachable.has(key)
                  ? 'open'
                  : 'dark'
        return (
          <polygon
            key={key}
            className={`hex hex--${state}`}
            /* Faint mottling so the ground is not a flat field of cells. */
            data-tone={i % 4 === 0 ? 'b' : 'a'}
            points={hexCorners(hex, HEX)}
            onClick={() => onPick(hex)}
          />
        )
      })}
    </g>
  )
}
