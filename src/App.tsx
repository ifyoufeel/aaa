import { useCallback, useEffect, useState } from 'react'
import type { FactionId } from './content/types'
import type { Action } from './rules'
import { Battle } from './ui/screens/Battle'
import { FactionSelect } from './ui/screens/FactionSelect'
import { Lobby } from './ui/screens/Lobby'
import { Recruit } from './ui/screens/Recruit'
import { ShareBar } from './ui/ShareBar'
import { Result } from './ui/screens/Result'
import { newId, seedFromRoomId } from './ui/session'
import { inviteUrl, readRoom, useRoom } from './ui/useRoom'

/**
 * Phase router.
 *
 * The room id lives in the URL fragment, which never reaches the server, so a
 * match link leaks nothing to Vercel's logs. The seed is derived from the room
 * id rather than exchanged, so both clients agree on it before they have even
 * spoken.
 */
export default function App() {
  const [route, setRoute] = useState(() => readRoom())

  // Opening a link in an already-loaded tab should join, not sit there.
  useEffect(() => {
    const onHash = () => setRoute(readRoom())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { roomId, joining } = route
  const seed = roomId ? seedFromRoomId(roomId) : 0
  const { room, snapshot, connection, side, shareUrl } = useRoom(roomId, joining, seed)

  const create = useCallback(() => {
    const id = newId()
    window.location.hash = `#/r/${id}`
    setRoute({ roomId: id, joining: false })
  }, [])

  const act = useCallback((action: Action) => room?.act(action), [room])
  const pick = useCallback((id: FactionId) => room?.pickFaction(id), [room])
  const ready = useCallback(
    (counts: Record<string, number>) => room?.ready(counts),
    [room],
  )

  if (!roomId || !snapshot) {
    return (
      <Lobby
        onCreate={create}
        shareUrl={roomId ? inviteUrl(roomId) : ''}
        connection={connection}
        waiting={!!roomId}
      />
    )
  }

  // A divergence is not something to play through. Stop and say so.
  if (snapshot.desync) {
    return (
      <main className="screen screen--centred">
        <p className="kicker">Рассинхрон</p>
        <h1 className="display title title--sm">The two games have drifted apart</h1>
        <p className="lede">
          Your copy of the battle stopped matching your opponent&rsquo;s at move{' '}
          {snapshot.desync.seq}, so it has been halted rather than played on. Nothing either of
          you does from here would be the same game.
        </p>
        <p className="notice">
          Expected <code>{snapshot.desync.expected}</code>, got{' '}
          <code>{snapshot.desync.actual}</code>. Both of you reloading will start a fresh match.
        </p>
      </main>
    )
  }

  if (snapshot.error) {
    return (
      <main className="screen screen--centred">
        <h1 className="display title title--sm">Something went wrong</h1>
        <p className="notice notice--bad">{snapshot.error}</p>
      </main>
    )
  }

  const mine = snapshot.picks[side]

  /** The invite stays on screen until someone actually opens it. */
  const withShare = (screen: React.ReactNode) => (
    <>
      {!snapshot.peerConnected && <ShareBar url={shareUrl} connection={connection} />}
      {screen}
    </>
  )

  switch (snapshot.phase) {
    case 'lobby':
      return (
        <Lobby onCreate={create} shareUrl={shareUrl} connection={connection} waiting />
      )

    case 'faction':
      return withShare(<FactionSelect side={side} picks={snapshot.picks} onPick={pick} />)

    case 'recruit':
      return mine ? (
        withShare(
        <Recruit
          factionId={mine}
          opponentFactionId={snapshot.picks[side === 'yav' ? 'nav' : 'yav']}
          onReady={ready}
          waiting={!!snapshot.armies[side]}
        />,
        )
      ) : (
        withShare(<FactionSelect side={side} picks={snapshot.picks} onPick={pick} />)
      )

    case 'battle':
      return snapshot.battle ? (
        <Battle
          battle={snapshot.battle}
          side={side}
          onAct={act}
          peerConnected={snapshot.peerConnected}
        />
      ) : null

    case 'over':
      return snapshot.battle ? <Result battle={snapshot.battle} side={side} /> : null
  }
}
