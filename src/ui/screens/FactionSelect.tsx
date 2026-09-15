import { factionsOf } from '../../content/factions'
import type { FactionId } from '../../content/types'
import type { Side } from '../../rules'
import { Plaque } from '../Plaque'
import { FACTION_VAR } from '../theme/factions'

const REALM = {
  yav: { cyrillic: 'ЯВЬ', name: 'The Waking World' },
  nav: { cyrillic: 'НАВЬ', name: 'The Beyond' },
} as const

/**
 * Both sides on one screen, each choosing from their own pool of three.
 *
 * You see every hall on your own side, but only the tags of whichever one the
 * opponent actually locked — what they might have picked is not yours to study.
 */
export function FactionSelect({
  side,
  picks,
  onPick,
}: {
  side: Side
  picks: Partial<Record<Side, FactionId>>
  onPick: (id: FactionId) => void
}) {
  const mine = picks[side]
  const theirSide: Side = side === 'yav' ? 'nav' : 'yav'

  return (
    <main className="screen faction">
      <header className="faction__head">
        <p className="kicker">Выбор крепости</p>
        <h1 className="display title title--sm">Choose your castle</h1>
        <p className="lede lede--sm">
          Each side fields <span className="tnum accent">1500</span> gold. Pick a hall, then
          spend it.
        </p>
      </header>

      <div className="faction__realms">
        <Realm side={side} mine picks={picks} onPick={onPick} />
        <div className="faction__seam" aria-hidden />
        <Realm side={theirSide} mine={false} picks={picks} onPick={onPick} />
      </div>

      <footer className="faction__foot">
        <p className="faction__status">
          {mine ? (
            picks[theirSide] ? (
              <>Both halls are chosen. Muster your army.</>
            ) : (
              <>
                <span className="pulse" /> Waiting for your opponent to choose&hellip;
              </>
            )
          ) : (
            <>Choose a hall to continue.</>
          )}
        </p>
      </footer>
    </main>
  )
}

function Realm({
  side,
  mine,
  picks,
  onPick,
}: {
  side: Side
  mine: boolean
  picks: Partial<Record<Side, FactionId>>
  onPick: (id: FactionId) => void
}) {
  const chosen = picks[side]
  return (
    <section className={`realm ${mine ? 'realm--mine' : 'realm--theirs'}`}>
      <div className="realm__head">
        <h2 className="display realm__cyrillic">{REALM[side].cyrillic}</h2>
        <span className="realm__name">{REALM[side].name}</span>
        <span className={`tag ${mine ? 'tag--you' : ''}`}>{mine ? 'You' : 'Opponent'}</span>
      </div>

      {factionsOf(side).map((faction) => {
        const isChosen = chosen === faction.id
        const showTags = mine || isChosen
        return (
          <article
            key={faction.id}
            className={[
              'hall',
              isChosen ? 'hall--chosen' : '',
              !mine && !isChosen ? 'hall--hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--accent': FACTION_VAR[faction.id] } as React.CSSProperties}
          >
            {mine ? (
              <button
                type="button"
                className="hall__hit"
                onClick={() => onPick(faction.id)}
                aria-pressed={isChosen}
              >
                <span className="visually-hidden">Choose {faction.name}</span>
              </button>
            ) : null}

            <Plaque factionId={faction.id} ink={FACTION_VAR[faction.id]} />

            <div className="hall__body">
              <div className="hall__title">
                <h3 className="display">{faction.name}</h3>
                {isChosen && (
                  <span className="hall__badge">{mine ? 'Chosen' : 'Locked in'}</span>
                )}
              </div>
              <p className="hall__cyrillic">{faction.cyrillic}</p>
              <p className="hall__blurb">{faction.blurb}</p>
              {showTags && (
                <div className="hall__tags">
                  {faction.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

