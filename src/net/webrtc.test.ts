import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HelloMessage } from './protocol'
import { webrtcTransport } from './webrtc'

type Listener = (...args: never[]) => void

class FakeEmitter {
  private readonly listeners = new Map<string, Set<Listener>>()

  on(event: string, cb: Listener): this {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(cb)
    return this
  }

  emit(event: string, ...args: never[]): void {
    for (const cb of [...(this.listeners.get(event) ?? [])]) cb(...args)
  }
}

class FakeConnection extends FakeEmitter {
  open = false
  readonly sent: unknown[] = []
  closed = false

  send(data: unknown): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }
}

class FakePeer extends FakeEmitter {
  destroyed = false
  readonly connections: FakeConnection[] = []
  readonly id: string | undefined

  constructor(id?: string) {
    super()
    this.id = id
  }

  connect(_peerId: string): FakeConnection {
    const c = new FakeConnection()
    this.connections.push(c)
    return c
  }

  destroy(): void {
    this.destroyed = true
  }
}

let lastPeer: FakePeer | null = null

vi.mock('peerjs', () => ({
  // A real class, not vi.fn(): `new Peer(...)` needs a genuine constructor,
  // and returning a different object from one (here, the FakePeer) is valid
  // JS that vi.fn()'s mock wrapper does not support.
  Peer: class {
    constructor(id?: string) {
      lastPeer = new FakePeer(id)
      return lastPeer
    }
  },
  PeerErrorType: { PeerUnavailable: 'peer-unavailable' },
}))

const hello: HelloMessage = { type: 'hello', version: 1, side: 'nav', playerId: 'p1' }

describe('webrtcTransport in an unsupported environment', () => {
  it('resolves to null rather than throwing', async () => {
    // jsdom does not implement WebRTC, and nothing in this describe block
    // stubs it in. This is the guard that keeps the transport from ever
    // touching the network in ordinary tests, so it is worth pinning down
    // rather than relying on it by accident.
    expect(typeof RTCPeerConnection).toBe('undefined')
    await expect(webrtcTransport({ roomId: 'test-room', isHost: true })).resolves.toBeNull()
  })
})

describe('webrtcTransport, with peerjs mocked', () => {
  beforeEach(() => {
    lastPeer = null
    vi.stubGlobal('RTCPeerConnection', class {})
    return () => vi.unstubAllGlobals()
  })

  it('retries a dial the host was not yet registered for, and connects once it is', async () => {
    const transportPromise = webrtcTransport({ roomId: 'retry-room', isHost: false })
    await vi.waitFor(() => {
      if (!lastPeer) throw new Error('peer not constructed yet')
    })
    lastPeer!.emit('open', 'guest-id' as never)

    const transport = await transportPromise
    expect(transport).not.toBeNull()
    expect(lastPeer!.connections).toHaveLength(1)

    // The real PeerJS server times out an offer to a not-yet-registered host
    // by emitting a peer-level error; it never opens, closes, or errors the
    // DataConnection object itself. Before the fix, the transport treated
    // that dead connection as claiming `conn` forever, so this error was the
    // only chance to retry, and nothing after it ever did.
    lastPeer!.emit('error', { type: 'peer-unavailable' } as never)

    // The retry is scheduled on a real timer (RETRY_MS), so wait for it
    // rather than assuming a fixed delay.
    await vi.waitFor(
      () => {
        expect(lastPeer!.connections).toHaveLength(2)
      },
      { timeout: 3000 },
    )

    const second = lastPeer!.connections[1]!
    second.open = true
    second.emit('open')

    transport!.send(hello)
    expect(second.sent).toEqual([hello])
  })
})
