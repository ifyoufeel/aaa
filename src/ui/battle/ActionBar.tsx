import { getFaction } from '../../content/factions'
import { poolHp, unitOf, type Stack } from '../../rules'
import { Plaque } from '../Plaque'

/** The active stack, its numbers, and what it can do. */
export function ActionBar({
  active,
  yours,
  pendingTarget,
  onWait,
  onDefend,
  onCommit,
}: {
  active: Stack
  yours: boolean
  pendingTarget: Stack | null
  onWait: () => void
  onDefend: () => void
  onCommit: () => void
}) {
  const unit = unitOf(active)
  const ink = getFaction(active.factionId).accent
  const maxHp = unit.stats.hp * active.count

  return (
    <>
      <section className="active">
        <Plaque
          factionId={active.factionId}
          unitId={active.unitId}
          ink={ink}
          width={58}
          height={68}
          active
          label={unit.name}
        />
        <div className="active__body">
          <div className="active__title">
            <h2 className="display">{unit.name}</h2>
            <span className="tnum active__count">&times;{active.count}</span>
            <span className="active__turn">{yours ? 'your move' : 'their move'}</span>
          </div>
          <dl className="stats">
            <Stat label="Att" value={unit.stats.attack} />
            <Stat label="Def" value={unit.stats.defense} />
            <Stat label="Dmg" value={`${unit.stats.damage[0]}–${unit.stats.damage[1]}`} />
            <Stat label="HP" value={`${poolHp(active)}/${maxHp}`} />
            <Stat label="Spd" value={unit.stats.speed} />
            {unit.ranged ? <Stat label="Shots" value={active.ammo} /> : null}
          </dl>
          <p className="unit__ability">
            <span className="unit__ability-name">{unit.ability.name}</span> &mdash;{' '}
            {unit.ability.text}
          </p>
        </div>
      </section>

      <section className="actions">
        {yours ? (
          <>
            <div className="actions__pair">
              <button type="button" className="btn" onClick={onWait} disabled={active.waited}>
                Wait
              </button>
              <button type="button" className="btn" onClick={onDefend}>
                Defend
              </button>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onCommit}
              disabled={!pendingTarget}
            >
              {pendingTarget ? `Strike ${unitOf(pendingTarget).name}` : 'Choose a hex'}
            </button>
            <p className="actions__hint">
              {pendingTarget
                ? 'Click again to confirm, or pick another target.'
                : 'Click a lit hex to move, or an enemy to attack.'}
            </p>
          </>
        ) : (
          <p className="actions__waiting">
            <span className="pulse" /> Waiting for your opponent&hellip;
          </p>
        )}
      </section>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <dd className="tnum">{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}
