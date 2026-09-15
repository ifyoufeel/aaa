import { motion } from 'motion/react'
import { getFaction } from '../../content/factions'
import { roundOrder, unitOf, type BattleState } from '../../rules'
import { Plaque } from '../Plaque'

/**
 * Initiative order for the round.
 *
 * `layout` on each entry means a stack that waits visibly slides to the back
 * rather than the strip snapping to a new arrangement — the reorder is the
 * information.
 */
export function TurnQueue({ battle }: { battle: BattleState }) {
  const order = roundOrder(battle)

  return (
    <div className="queue">
      <p className="kicker">Order of battle</p>
      <ol className="queue__strip">
        {order.map((stack) => {
          const isActive = stack.id === battle.activeId
          const unit = unitOf(stack)
          return (
            <motion.li
              key={stack.id}
              layout
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={[
                'queue__item',
                isActive ? 'queue__item--active' : '',
                stack.acted ? 'queue__item--spent' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={`${unit.name} ×${stack.count} · initiative ${unit.stats.initiative}`}
            >
              <Plaque
                factionId={stack.factionId}
                unitId={stack.unitId}
                ink={getFaction(stack.factionId).accent}
                width={isActive ? 50 : 40}
                height={isActive ? 58 : 47}
                active={isActive}
                label={unit.name}
              />
              <span className="tnum queue__count">{stack.count}</span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
