import { useMemo, useState } from 'react'
import { GOLD_BUDGET } from '../../content/balance'
import { getFaction } from '../../content/factions'
import type { FactionId } from '../../content/types'
import { abilityIsLive } from '../../rules'
import { Plaque } from '../Plaque'
import { FACTION_VAR } from '../theme/factions'

/**
 * Where the game is actually decided.
 *
 * With no hero and no spells, what you buy is your entire plan, so the screen
 * shows the shape of the army as you build it rather than leaving you to do the
 * arithmetic: total health, how much of the purse went on shooters, and what
 * your slowest stack is.
 */
export function Recruit({
  factionId,
  opponentFactionId,
  onReady,
  waiting,
}: {
  factionId: FactionId
  opponentFactionId: FactionId | undefined
  onReady: (counts: Record<string, number>) => void
  waiting: boolean
}) {
  const faction = getFaction(factionId)
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(faction.units.map((u) => [u.id, 0])),
  )

  const spent = useMemo(
    () => faction.units.reduce((sum, u) => sum + u.cost * (counts[u.id] ?? 0), 0),
    [faction, counts],
  )
  const left = GOLD_BUDGET - spent

  const shape = useMemo(() => {
    const souls = faction.units.reduce((n, u) => n + (counts[u.id] ?? 0), 0)
    const health = faction.units.reduce((n, u) => n + u.stats.hp * (counts[u.id] ?? 0), 0)
    const bought = faction.units.filter((u) => (counts[u.id] ?? 0) > 0)
    const rangedGold = bought
      .filter((u) => u.ranged)
      .reduce((n, u) => n + u.cost * (counts[u.id] ?? 0), 0)
    const slowest = bought.length ? Math.min(...bought.map((u) => u.stats.speed)) : 0
    return {
      souls,
      health,
      stacks: bought.length,
      rangedShare: spent > 0 ? Math.round((rangedGold / spent) * 100) : 0,
      slowest,
    }
  }, [faction, counts, spent])

  const ink = FACTION_VAR[factionId]
  const canFight = shape.stacks > 0

  function adjust(unitId: string, delta: number) {
    setCounts((current) => {
      const unit = faction.units.find((u) => u.id === unitId)!
      const next = Math.min(unit.maxCount, Math.max(0, (current[unitId] ?? 0) + delta))
      const wouldSpend =
        faction.units.reduce(
          (sum, u) => sum + u.cost * (u.id === unitId ? next : (current[u.id] ?? 0)),
          0,
        )
      if (wouldSpend > GOLD_BUDGET) return current
      return { ...current, [unitId]: next }
    })
  }

  return (
    <main className="screen recruit" style={{ '--accent': ink } as React.CSSProperties}>
      <header className="recruit__head">
        <div className="recruit__hall">
          <Plaque factionId={factionId} ink={ink} width={54} height={64} />
          <div>
            <h1 className="display title title--sm">{faction.name}</h1>
            <p className="kicker">Муштра &middot; Muster your army</p>
          </div>
        </div>
        <div className="recruit__purse">
          <div>
            <p className="kicker">Spent</p>
            <p className="display tnum recruit__spent">{spent.toLocaleString('en-GB')}</p>
          </div>
          <div className="recruit__rule" aria-hidden />
          <div>
            <p className="kicker">Gold left</p>
            <p className="display tnum recruit__left">{left.toLocaleString('en-GB')}</p>
          </div>
        </div>
      </header>

      <div className="recruit__body">
        <section className="recruit__units">
          {faction.units.map((unit) => {
            const held = counts[unit.id] ?? 0
            const atCap = held >= unit.maxCount
            const affordable = unit.cost <= left && !atCap
            return (
              <article key={unit.id} className={`unit ${held || affordable ? '' : 'unit--dim'}`}>
                <Plaque
                  factionId={factionId}
                  unitId={unit.id}
                  ink={ink}
                  width={76}
                  height={90}
                  label={unit.name}
                />
                <div className="unit__body">
                  <div className="unit__title">
                    <h3 className="display">{unit.name}</h3>
                    <span className="unit__role">
                      {unit.cyrillic} &middot; {unit.role}
                    </span>
                  </div>
                  <dl className="stats">
                    <Stat label="Att" value={unit.stats.attack} />
                    <Stat label="Def" value={unit.stats.defense} />
                    <Stat label="Dmg" value={`${unit.stats.damage[0]}–${unit.stats.damage[1]}`} />
                    <Stat label="HP" value={unit.stats.hp} />
                    <Stat label="Spd" value={unit.stats.speed} />
                    <Stat label="Ini" value={unit.stats.initiative} />
                  </dl>
                  {/* An ability the engine does not enforce is marked, not
                      quietly printed as though it worked. */}
                  <p className={`unit__ability ${abilityIsLive(unit.ability.id) ? '' : 'unit__ability--dead'}`}>
                    <span className="unit__ability-name">{unit.ability.name}</span> &mdash;{' '}
                    {unit.ability.text}
                    {!abilityIsLive(unit.ability.id) && (
                      <span className="unit__ability-wip"> not in the game yet</span>
                    )}
                    {unit.ranged ? ` Shoots, ${unit.ranged.shots} shots.` : ''}
                  </p>
                </div>
                <div className="unit__buy">
                  <p className="unit__price tnum">
                    {unit.cost} g each &middot; max {unit.maxCount}
                  </p>
                  <div className="stepper">
                    <button
                      type="button"
                      className="step"
                      onClick={() => adjust(unit.id, -1)}
                      disabled={held === 0}
                      aria-label={`One fewer ${unit.name}`}
                    >
                      &minus;
                    </button>
                    <span className="tnum stepper__count">{held}</span>
                    <button
                      type="button"
                      className="step"
                      onClick={() => adjust(unit.id, 1)}
                      disabled={!affordable}
                      aria-label={`One more ${unit.name}`}
                    >
                      +
                    </button>
                  </div>
                  <p className="unit__subtotal tnum">
                    {atCap
                      ? `${held * unit.cost} g \u00b7 full`
                      : held > 0
                      ? `${held * unit.cost} g`
                      : affordable
                        ? /* Affordable, just none bought yet -- say nothing. */ '\u00a0'
                        : `${unit.cost - left} g short`}
                  </p>
                </div>
              </article>
            )
          })}
        </section>

        <aside className="recruit__rail">
          <div className="panel">
            <h2 className="display panel__title">Your army</h2>
            <p className="panel__sub">
              {shape.stacks} {shape.stacks === 1 ? 'stack' : 'stacks'} &middot; {shape.souls} souls
            </p>
            <div className="panel__rows">
              {faction.units
                .filter((u) => (counts[u.id] ?? 0) > 0)
                .map((u) => (
                  <div key={u.id} className="panel__row">
                    <span>
                      {u.name} <span className="tnum muted">&times;{counts[u.id]}</span>
                    </span>
                    <span className="tnum muted">{u.cost * (counts[u.id] ?? 0)}</span>
                  </div>
                ))}
              {shape.stacks === 0 && <p className="panel__empty">Nothing bought yet.</p>}
            </div>
          </div>

          <div className="panel">
            <h2 className="display panel__title panel__title--sm">Shape of it</h2>
            <div className="panel__rows">
              <div className="panel__row">
                <span className="muted">Health pool</span>
                <span className="tnum">{shape.health.toLocaleString('en-GB')}</span>
              </div>
              <div className="panel__row">
                <span className="muted">Gold in shooters</span>
                <span className="tnum">{shape.rangedShare}%</span>
              </div>
              <div className="panel__row">
                <span className="muted">Slowest stack</span>
                <span className="tnum">{shape.slowest || '—'} hexes</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            disabled={!canFight || waiting}
            onClick={() => onReady(counts)}
          >
            {waiting ? 'Waiting for them…' : 'Take the field'}
          </button>

          <div className="panel panel--quiet">
            <p className="panel__sub">
              <span className="pulse" />{' '}
              {opponentFactionId ? getFaction(opponentFactionId).name : 'Your opponent'} is
              recruiting
            </p>
            <p className="panel__note">
              You will not see what they bought until the first stack moves.
            </p>
          </div>
        </aside>
      </div>
    </main>
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
