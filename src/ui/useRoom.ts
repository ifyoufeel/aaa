import { useEffect, useMemo, useState } from 'react'
import { Room, type RoomSnapshot } from '../net'
import {
  broadcastChannelTransport,
  supabaseTransport,
  supportsBroadcastChannel,
} from '../net'
import type { Side } from '../rules'
import { playerId } from './session'

export type Connection =
  /** Two people, two machines. */
  | 'remote'
  /** Two tabs of this browser. No account needed, and no other device. */
  | 'local'
  | 'unavailable'

export interface RoomHandle {
  readonly room: Room | null
  readonly snapshot: RoomSnapshot | null
  readonly connection: Connection
  readonly roomId: string | null
  readonly side: Side
  readonly shareUrl: string
}

export interface RoomRoute {
  readonly roomId: string | null
  /** True when this tab arrived by invite rather than by creating the room. */
  readonly joining: boolean
}

/**
 * The room lives in the URL fragment, which never reaches the server, so a
 * match link leaks nothing to the host's logs.
 *
 * The `/j` suffix is what marks a tab as the guest, and it has to be in the URL
 * rather than in storage: the no-backend transport is two tabs of ONE browser,
 * which share a localStorage, so anything remembered there would tell both tabs
 * they were the host. They were, briefly, and the match never started.
 */
export function readRoom(): RoomRoute {
  const match = /^#\/r\/([A-Za-z0-9_-]{4,40})(\/j)?$/.exec(window.location.hash)
  return { roomId: match?.[1] ?? null, joining: Boolean(match?.[2]) }
}

/** The host's own URL. */
export function roomUrl(roomId: string): string {
  return `${window.location.origin}${window.location.pathname}#/r/${roomId}`
}

/** The link to send. Opening it makes you the guest. */
export function inviteUrl(roomId: string): string {
  return `${roomUrl(roomId)}/j`
}

/**
 * Wires a Room to React.
 *
 * The side is decided by who created the link: the creator hosts as Yav', and
 * anyone opening a link they did not create joins as Nav'. That is remembered
 * per browser, so reopening your own link puts you back on your own side
 * instead of handing you the opponent's army.
 */
export function useRoom(roomId: string | null, joining: boolean, seed: number): RoomHandle {
  const [room, setRoom] = useState<Room | null>(null)
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [connection, setConnection] = useState<Connection>('unavailable')

  // Явь hosts and rolls the dice; Навь joins by invite.
  const side: Side = useMemo(() => (joining ? 'nav' : 'yav'), [joining])

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      setSnapshot(null)
      return
    }

    let disposed = false
    let live: Room | null = null

    void (async () => {
      const remote = await supabaseTransport({ roomId, senderId: playerId() })
      if (disposed) return

      const transport =
        remote ?? (supportsBroadcastChannel() ? broadcastChannelTransport(roomId) : null)
      if (!transport) {
        setConnection('unavailable')
        return
      }
      setConnection(remote ? 'remote' : 'local')

      live = new Room({ transport, side, playerId: playerId(), seed })
      const off = live.subscribe(setSnapshot)
      live.join()
      setRoom(live)

      return () => off()
    })()

    return () => {
      disposed = true
      live?.dispose()
    }
  }, [roomId, side, seed])

  return {
    room,
    snapshot,
    connection,
    roomId,
    side,
    shareUrl: roomId ? inviteUrl(roomId) : '',
  }
}
