/**
 * Two people on two machines, over a direct WebRTC connection.
 *
 * No account, no environment variables, nothing to configure: this is why the
 * game is reachable across devices the moment it is deployed. Connection setup
 * borrows PeerJS's free public broker (the default cloud server behind the
 * `peerjs` package) purely to exchange the handful of kilobytes of SDP and ICE
 * candidates needed to open a peer-to-peer channel. Once that handshake
 * finishes, every game message goes straight between the two browsers — the
 * broker is no longer involved at all, and does not see the match.
 *
 * The host registers under an id derived from the room id, so the guest can
 * dial it without either side telling the other anything out of band. The
 * guest may open the invite link before the host's peer has finished
 * registering, so a failed dial is retried rather than treated as final.
 *
 * The cost, stated plainly because it is the one thing a player will actually
 * notice: some restrictive corporate or campus networks block a direct
 * peer-to-peer connection outright (only a STUN server is configured, not a
 * TURN relay), and that shows up as "opponent never connects" with nothing
 * more specific to say. Supabase (see supabase.ts) does not have this failure
 * mode, because it never attempts a direct connection between the two
 * browsers — it is the sturdier option for anyone willing to set it up, and is
 * preferred automatically when configured.
 */

import type { Message, Transport } from './protocol'
import { isMessage } from './protocol'

/** True when this browser's engine implements WebRTC at all. */
export function supportsWebRTC(): boolean {
  return typeof RTCPeerConnection !== 'undefined'
}

export interface WebrtcTransportOptions {
  readonly roomId: string
  readonly isHost: boolean
}

/** How long to wait for the guest's dial to reach a not-yet-registered host. */
const RETRY_MS = 1500
/** ~30s of retrying — long enough for a slow host tab to finish registering. */
const MAX_ATTEMPTS = 20
/** How long to wait for our own peer to register with the broker at all. */
const OPEN_TIMEOUT_MS = 8000

function peerIdFor(roomId: string): string {
  // PeerJS ids allow letters, digits, spaces, dashes and underscores; roomId
  // is already restricted to [A-Za-z0-9_-] by the URL route in useRoom.ts.
  return `nav-yav-host-${roomId}`
}

/**
 * Resolves null when this browser cannot use WebRTC, or the broker cannot be
 * reached at all, so callers can fall back to same-browser play rather than
 * failing outright.
 */
export async function webrtcTransport(
  options: WebrtcTransportOptions,
): Promise<Transport | null> {
  if (!supportsWebRTC()) return null

  type PeerJsModule = typeof import('peerjs')
  let Peer: PeerJsModule['Peer']
  let PeerErrorType: PeerJsModule['PeerErrorType']
  try {
    ;({ Peer, PeerErrorType } = await import('peerjs'))
  } catch {
    // The broker's client script failed to load — offline, or the host is
    // blocked on this network. Same shape of failure as no broker at all.
    return null
  }

  const peer = options.isHost ? new Peer(peerIdFor(options.roomId)) : new Peer()

  const ready = await new Promise<boolean>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(false)
      }
    }, OPEN_TIMEOUT_MS)
    peer.on('open', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(true)
    })
    peer.on('error', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(false)
    })
  })

  if (!ready) {
    peer.destroy()
    return null
  }

  const handlers = new Set<(message: Message) => void>()
  const peerHandlers = new Set<(connected: boolean) => void>()
  const pending: Message[] = []
  let conn: import('peerjs').DataConnection | null = null
  let closed = false

  function bind(c: import('peerjs').DataConnection): void {
    // `conn` is set only once this specific connection actually opens, not
    // the moment it is created. A guest's dial that lands before the host has
    // registered fails server-side by timing out the offer (PeerErrorType
    // .PeerUnavailable) rather than by closing or erroring THIS DataConnection
    // object — it is simply left forever pending. Claiming `conn` any earlier
    // would leave every retry after the first permanently blocked by a dead
    // connection that can never open, close, or error on its own.
    c.on('open', () => {
      // First one in wins: two connections can only both reach 'open' if two
      // dials were in flight at once, and the loser should not silently
      // replace an already-working channel.
      if (closed || conn) return
      conn = c
      for (const message of pending.splice(0)) void c.send(message)
      for (const handler of [...peerHandlers]) handler(true)
    })
    c.on('data', (data) => {
      if (!closed && isMessage(data)) for (const handler of [...handlers]) handler(data)
    })
    c.on('close', () => {
      if (conn === c) conn = null
      if (!closed) for (const handler of [...peerHandlers]) handler(false)
    })
    c.on('error', () => {
      if (conn === c) conn = null
      if (!closed) for (const handler of [...peerHandlers]) handler(false)
    })
  }

  if (options.isHost) {
    peer.on('connection', bind)
  } else {
    let attempts = 0
    const dial = () => {
      if (closed || conn) return
      attempts += 1
      bind(peer.connect(peerIdFor(options.roomId), { reliable: true }))
    }
    peer.on('error', (err) => {
      if (closed || conn) return
      if (err.type === PeerErrorType.PeerUnavailable && attempts < MAX_ATTEMPTS) {
        setTimeout(dial, RETRY_MS)
      }
    })
    dial()
  }

  return {
    send(message) {
      if (conn?.open) void conn.send(message)
      else pending.push(message)
    },
    onMessage(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    onPeerChange(handler) {
      peerHandlers.add(handler)
      return () => {
        peerHandlers.delete(handler)
      }
    },
    close() {
      closed = true
      handlers.clear()
      peerHandlers.clear()
      conn?.close()
      peer.destroy()
    },
  }
}
