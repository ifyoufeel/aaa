/**
 * Ways for two players to reach each other.
 *
 * Four rungs of a ladder, all behind the same `Transport` interface:
 *
 * - `loopbackPair`     two ends wired together in memory. Tests.
 * - `broadcastChannel` two tabs of the same browser. Real play with no backend
 *                      at all, and the quickest way to try a change.
 * - WebRTC             two people on two machines, no account needed. See
 *                      webrtc.ts. The default for real cross-device play.
 * - Supabase Realtime  two people on two machines, over a real server relay.
 *                      Needs a project; see supabase.ts. Preferred over WebRTC
 *                      when configured, since it has none of peer-to-peer's
 *                      NAT/firewall failure modes.
 *
 * The room logic in room.ts cannot tell which one it is talking over.
 */

import type { Message, Transport } from './protocol'
import { isMessage } from './protocol'

type Handler = (message: Message) => void

function makeHub() {
  const handlers = new Set<Handler>()
  return {
    handlers,
    subscribe(handler: Handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    deliver(message: Message) {
      for (const handler of [...handlers]) handler(message)
    },
  }
}

/**
 * Two transports wired directly to each other.
 *
 * Delivery is asynchronous on purpose: a synchronous hand-off would let a
 * message arrive in the middle of the sender's own state update and hide
 * ordering bugs that a real network would expose immediately.
 */
export function loopbackPair(): [Transport, Transport] {
  const a = makeHub()
  const b = makeHub()
  let open = true

  const make = (mine: ReturnType<typeof makeHub>, theirs: ReturnType<typeof makeHub>): Transport => ({
    send(message) {
      if (!open) return
      queueMicrotask(() => {
        if (open) theirs.deliver(message)
      })
    },
    onMessage: mine.subscribe,
    close() {
      open = false
      mine.handlers.clear()
      theirs.handlers.clear()
    },
  })

  return [make(a, b), make(b, a)]
}

/**
 * An in-memory hub that any number of ends can join.
 *
 * Unlike `loopbackPair` this matches how the real transports behave: a message
 * goes to every other member, not to one specific peer. That matters for
 * testing a second device opening the same link while a battle is running.
 */
export function memoryHub(): { connect(): Transport } {
  const members = new Set<{ deliver: (m: Message) => void }>()
  return {
    connect(): Transport {
      const hub = makeHub()
      const self = { deliver: hub.deliver }
      members.add(self)
      return {
        send(message) {
          queueMicrotask(() => {
            for (const member of [...members]) {
              if (member !== self) member.deliver(message)
            }
          })
        },
        onMessage: hub.subscribe,
        close() {
          members.delete(self)
          hub.handlers.clear()
        },
      }
    },
  }
}

/**
 * Two tabs of the same browser, over BroadcastChannel.
 *
 * Good enough for real two-player play on one machine, which makes it the
 * fastest way to try a rules change — no account, no network, no deploy.
 * It cannot reach another device: BroadcastChannel is scoped to one origin in
 * one browser profile.
 */
export function broadcastChannelTransport(roomId: string): Transport {
  const channel = new BroadcastChannel(`nav-yav:${roomId}`)
  const hub = makeHub()

  const listener = (event: MessageEvent) => {
    // Anything on this channel came from another tab and is untrusted.
    if (isMessage(event.data)) hub.deliver(event.data)
  }
  channel.addEventListener('message', listener)

  return {
    send(message) {
      channel.postMessage(message)
    },
    onMessage: hub.subscribe,
    close() {
      channel.removeEventListener('message', listener)
      channel.close()
      hub.handlers.clear()
    },
  }
}

/** True when this browser can run the same-tab transport at all. */
export function supportsBroadcastChannel(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}
