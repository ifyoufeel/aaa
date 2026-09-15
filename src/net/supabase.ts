/**
 * Two people on two machines, over Supabase Realtime.
 *
 * Broadcast channels only — no database tables, no schema, no server code. The
 * battle is ephemeral and lives entirely in the two clients; Supabase is doing
 * nothing here but passing messages between them.
 *
 * The cost of that simplicity, stated plainly because it is the one thing a
 * player will actually notice: THE HOST'S BROWSER IS THE MATCH. A guest who
 * drops can rejoin and be caught up from the host's history, but if the host
 * closes their tab there is nothing left to catch up from.
 */

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Message, Transport } from './protocol'
import { isMessage } from './protocol'

const EVENT = 'msg'

/**
 * Credentials come from the build, and the anon key is public by design — it
 * ships in the bundle and is meant to. The service-role key must never appear
 * in this repository.
 */
export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = import.meta.env['VITE_SUPABASE_URL']
  const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY']
  if (typeof url !== 'string' || typeof anonKey !== 'string' || !url || !anonKey) return null
  return { url, anonKey }
}

/** Whether remote play is available in this build at all. */
export function canPlayRemotely(): boolean {
  return supabaseConfig() !== null
}

let client: SupabaseClient | null = null

/**
 * Loaded on demand. The Supabase client is a large dependency and a game
 * played between two tabs of one browser has no use for it, so it stays out of
 * the initial bundle until someone actually opens a remote room.
 */
async function getClient(): Promise<SupabaseClient | null> {
  if (client) return client
  const config = supabaseConfig()
  if (!config) return null
  const { createClient } = await import('@supabase/supabase-js')
  client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })
  return client
}

export interface SupabaseTransportOptions {
  readonly roomId: string
  /** Distinguishes this tab from the peer, so we ignore our own echoes. */
  readonly senderId: string
}

/**
 * Resolves null when the build has no Supabase credentials, so callers can fall
 * back to same-browser play rather than failing.
 */
export async function supabaseTransport(
  options: SupabaseTransportOptions,
): Promise<Transport | null> {
  const supabase = await getClient()
  if (!supabase) return null

  const handlers = new Set<(message: Message) => void>()
  const peerHandlers = new Set<(connected: boolean) => void>()

  const channel: RealtimeChannel = supabase.channel(`room:${options.roomId}`, {
    config: { broadcast: { self: false }, presence: { key: options.senderId } },
  })

  channel.on('broadcast', { event: EVENT }, ({ payload }) => {
    // Straight off the wire from the other player's browser: untrusted.
    const body = (payload as { from?: unknown; message?: unknown } | null)?.message
    if ((payload as { from?: unknown })?.from === options.senderId) return
    if (isMessage(body)) {
      for (const handler of [...handlers]) handler(body)
    }
  })

  const notifyPeers = () => {
    const others = Object.keys(channel.presenceState()).filter((k) => k !== options.senderId)
    for (const handler of [...peerHandlers]) handler(others.length > 0)
  }
  channel.on('presence', { event: 'sync' }, notifyPeers)
  channel.on('presence', { event: 'join' }, notifyPeers)
  channel.on('presence', { event: 'leave' }, notifyPeers)

  /** Sends attempted before the channel is live, replayed once it is. */
  const pending: Message[] = []
  let subscribed = false

  void channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return
    subscribed = true
    void channel.track({ at: Date.now() })
    for (const message of pending.splice(0)) publish(message)
  })

  function publish(message: Message): void {
    void channel.send({
      type: 'broadcast',
      event: EVENT,
      payload: { from: options.senderId, message },
    })
  }

  return {
    send(message) {
      if (subscribed) publish(message)
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
      handlers.clear()
      peerHandlers.clear()
      void supabase.removeChannel(channel)
    },
  }
}
