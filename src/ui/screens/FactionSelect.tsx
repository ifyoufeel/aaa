import { useState } from 'react'
import { factionsOf, getFaction } from '../../content/factions'
import { factionReadiness } from '../../rules'
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
 * Choosing is two steps: a click highlights a hall, and a separate confirm
 * commits it. Clicking a card used to lock you in instantly, which made a
 * misclick permanent — you cannot change your castle once the other side has
 * seen it.
 *
 * You see every hall on your own side, but only the tags of whichever one the
 * opponent actually locked — what they might have picked is not yours to study.
 */
export function FactionSelect({
  side,
  picks,
  onPick,
  peerConnected,
  localOnly,
}: {
  side: Side
  picks: Partial<Record<Side, FactionId>>
  onPick: (id: FactionId) => void
  peerConnected: boolean
  /** True when the only transport available cannot leave this browser. */
  localOnly: boolean
}) {
  const committed = picks[side]
  const theirSide: Side = side === 'yav' ? 'nav' : 'yav'
  const theirs = picks[theirSide]
  const [selected, setSelected] = useState<FactionId | null>(null)

  // Once committed, the highlight follows the commitment rather than the click.
  const highlighted = committed ?? selected

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
        <Realm
          side={side}
          mine
          highlighted={highlighted}
          committed={committed}
          onSelect={setSelected}
        />
        <div className="faction__seam" aria-hidden />
        <Realm
          side={theirSide}
          mine={false}
          highlighted={theirs ?? null}
          committed={theirs}
          onSelect={() => {}}
        />
      </div>

      <footer className="faction__foot">
        {!committed ? (
          <>
            <button
              type="button"
              className="btn btn--primary faction__confirm"
              disabled={!highlighted}
              onClick={() => highlighted && onPick(highlighted)}
            >
              {highlighted ? `Confirm ${getFaction(highlighted).name}` : 'Choose a hall'}
            </button>
            <p className="faction__status">
              {highlighted
                ? 'You can still change your mind until you confirm.'
                : 'Click a hall on your side of the seam.'}
            </p>
          </>
        ) : (
          <p className="faction__status">
            {theirs ? (
              <>Both halls are locked. Mustering&hellip;</>
            ) : (
              <>
                <span className="pulse" /> {getFaction(committed).name} locked in. Waiting for
                your opponent to confirm&hellip;
              </>
            )}
          </p>
        )}

        {/*
          The single most common way for this screen to appear broken: both
          players confirm, on two different devices, and neither advances —
          because without a game server the invite link cannot leave the
          browser that made it. Say so here, where they are stuck, rather than
          only back in the lobby.
        */}
        {!peerConnected && localOnly && (
          <p className="notice notice--bad faction__warning">
            <strong>Your opponent has not joined.</strong> This build has no game server, so the
            invite link only reaches <strong>another tab of this same browser</strong> — a
            second device can never connect, and you will both wait here forever. Open the link
            in a new tab to try it, or add Supabase credentials for real remote play.
          </p>
        )}
        {!peerConnected && !localOnly && (
          <p className="notice faction__warning">
            <span className="pulse" /> Nobody has opened your invite link yet. Both sides must
            be here before either can muster.
          </p>
        )}
      </footer>
    </main>
  )
}

function Realm({
  side,
  mine,
  highlighted,
  committed,
  onSelect,
}: {
  side: Side
  mine: boolean
  /** Shown as picked out, whether merely selected or already confirmed. */
  highlighted: FactionId | null
  /** Set only once the choice has been sent to the other player. */
  committed: FactionId | undefined
  onSelect: (id: FactionId) => void
}) {
  const chosen = highlighted
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
        // A hall whose abilities the engine does not enforce is shown but not
        // offered. Its cards would promise things that simply do not happen.
        const { live, total, ready } = factionReadiness(faction.units)
        return (
          <article
            key={faction.id}
            className={[
              'hall',
              isChosen ? 'hall--chosen' : '',
              committed === faction.id ? 'hall--committed' : '',
              !mine && !isChosen ? 'hall--hidden' : '',
              !ready ? 'hall--unfinished' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--accent': FACTION_VAR[faction.id] } as React.CSSProperties}
          >
            {/* Locked in: no more clicking, on either side. */}
            {mine && ready && !committed ? (
              <button
                type="button"
                className="hall__hit"
                onClick={() => onSelect(faction.id)}
                aria-pressed={isChosen}
              >
                <span className="visually-hidden">Choose {faction.name}</span>
              </button>
            ) : null}

            <Plaque factionId={faction.id} ink={FACTION_VAR[faction.id]} />

            <div className="hall__body">
              <div className="hall__title">
                <h3 className="display">{faction.name}</h3>
                {isChosen ? (
                  <span className="hall__badge">
                    {committed === faction.id ? 'Locked in' : 'Selected'}
                  </span>
                ) : !ready ? (
                  <span className="hall__badge hall__badge--wip">
                    {live} of {total} ready
                  </span>
                ) : null}
              </div>
              <p className="hall__cyrillic">{faction.cyrillic}</p>
              <p className="hall__blurb">{faction.blurb}</p>
              {!ready && (
                <p className="hall__wip">
                  Not finished yet &mdash; {total - live} of its {total} units have abilities
                  the game does not enforce, so its cards would not tell you the truth.
                </p>
              )}
              {showTags && ready && (
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

