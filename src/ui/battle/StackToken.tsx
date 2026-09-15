import { motion } from 'motion/react'
import { getFaction } from '../../content/factions'
import { hexToPixel } from '../../hex'
import { unitOf, type Stack } from '../../rules'
import { UNIT_ART, FACTION_ART } from '../art'
import { HEX } from './layout'

const PLAQUE = { w: 50, h: 58 }

/**
 * One stack on the board.
 *
 * Positioned by animating the group's transform rather than its coordinates, so
 * a stack eases along to its new hex instead of teleporting. Motion is what
 * makes a turn feel like something happened.
 */
export function StackToken({
  stack,
  isActive,
  isTarget,
  onPick,
}: {
  stack: Stack
  isActive: boolean
  isTarget: boolean
  onPick: (stack: Stack) => void
}) {
  const { x, y } = hexToPixel(stack.hex, HEX)
  const ink = getFaction(stack.factionId).accent
  const unit = unitOf(stack)
  const art = UNIT_ART[stack.unitId] ?? FACTION_ART[stack.factionId]

  const left = x - PLAQUE.w / 2
  const top = y - PLAQUE.h / 2 - 4
  const points = [
    `${left},${top}`,
    `${left + PLAQUE.w},${top}`,
    `${left + PLAQUE.w},${top + PLAQUE.h * 0.7}`,
    `${x},${top + PLAQUE.h}`,
    `${left},${top + PLAQUE.h * 0.7}`,
  ].join(' ')

  const scale = 0.72
  const badge = { w: 34, h: 17, x: x - 17, y: top + PLAQUE.h - 2 }
  const edge = isActive ? 'var(--ember-lit)' : isTarget ? 'var(--blood)' : ink

  return (
    <motion.g
      layout
      className="token"
      style={{ color: ink }}
      initial={false}
      animate={{ x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      onClick={() => onPick(stack)}
      role="button"
      tabIndex={0}
      aria-label={`${unit.name}, ${stack.count} remaining`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPick(stack)
      }}
    >
      <polygon
        points={points}
        fill="var(--ink-void)"
        stroke={edge}
        strokeWidth={isActive || isTarget ? 2 : 1.2}
      />
      <g
        transform={`translate(${x - (46 * scale) / 2},${top + 5}) scale(${scale})`}
        fill={ink}
        dangerouslySetInnerHTML={{ __html: art }}
      />
      <rect
        x={badge.x}
        y={badge.y}
        width={badge.w}
        height={badge.h}
        fill="var(--ink-void)"
        stroke={isActive ? 'var(--ember-lit)' : 'var(--ink-edge)'}
        strokeWidth={1}
      />
      <text
        x={x}
        y={badge.y + 12.6}
        textAnchor="middle"
        className="token__count"
        fill={isActive ? 'var(--ember-lit)' : 'var(--bone-dim)'}
      >
        {stack.count}
      </text>
    </motion.g>
  )
}
