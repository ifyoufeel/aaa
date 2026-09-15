import { hashState } from '../engine/hash'
import { legalActions } from '../rules'
import type { Action } from '../rules'
import { PROTOCOL_VERSION } from './protocol'
import { Room, type RoomSnapshot } from './room'
import { loopbackPair, memoryHub } from './transports'

/** Lets the microtask-delivered loopback messages settle. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function pair(seed = 42) {
  const [hostSide, guestSide] = loopbackPair()
  const host = new Room({ transport: hostSide, side: 'yav', playerId: 'h', seed })
  const guest = new Room({ transport: guestSide, side: 'nav', playerId: 'g', seed })
  return { host, guest }
}

const KITEZH = { kmet: 20, strelets: 10, gridin: 5, bogatyr: 3, volkhv: 1 }
const TOPYLA = { mavka: 18, rusalka: 8, bolotnik: 4, drekavac: 3, vodyanoy: 1 }

/** Drives both rooms from lobby to the opening of the battle. */
async function startBattle(seed = 42) {
  const { host, guest } = pair(seed)
  host.join()
  guest.join()
  await settle()

  host.pickFaction('kitezh')
  guest.pickFaction('topyla')
  await settle()

  host.ready(KITEZH)
  guest.ready(TOPYLA)
  await settle()
  return { host, guest }
}

describe('room handshake', () => {
  it('puts both sides into faction select once they have said hello', async () => {
    const { host, guest } = pair()
    host.join()
    guest.join()
    await settle()

    expect(host.snapshot().phase).toBe('faction')
    expect(guest.snapshot().phase).toBe('faction')
    expect(host.snapshot().peerConnected).toBe(true)
    expect(guest.snapshot().peerConnected).toBe(true)
  })

  it('makes the link sender the host and nobody else', async () => {
    const { host, guest } = pair()
    expect(host.isHost).toBe(true)
    expect(guest.isHost).toBe(false)
  })

  it('shares both picks with both sides, then moves on to recruitment', async () => {
    const { host, guest } = pair()
    host.join()
    guest.join()
    await settle()

    host.pickFaction('kitezh')
    await settle()
    expect(guest.snapshot().picks.yav).toBe('kitezh')
    expect(guest.snapshot().phase).toBe('faction') // still waiting on the guest

    guest.pickFaction('topyla')
    await settle()
    expect(host.snapshot().picks.nav).toBe('topyla')
    expect(host.snapshot().phase).toBe('recruit')
    expect(guest.snapshot().phase).toBe('recruit')
  })

  it('starts the battle only when both armies are in', async () => {
    const { host, guest } = pair()
    host.join()
    guest.join()
    await settle()
    host.pickFaction('kitezh')
    guest.pickFaction('topyla')
    await settle()

    host.ready(KITEZH)
    await settle()
    expect(host.snapshot().battle).toBeNull()

    guest.ready(TOPYLA)
    await settle()
    expect(host.snapshot().phase).toBe('battle')
    expect(guest.snapshot().phase).toBe('battle')
  })

  it('deals both sides an identical opening position', async () => {
    const { host, guest } = await startBattle()
    expect(hashState(guest.snapshot().battle)).toBe(hashState(host.snapshot().battle))
  })

  it('refuses to play against a different protocol version', async () => {
    const [a, b] = loopbackPair()
    const host = new Room({ transport: a, side: 'yav', playerId: 'h', seed: 1 })
    b.send({ type: 'hello', version: PROTOCOL_VERSION + 1, side: 'nav', playerId: 'g' })
    await settle()
    expect(host.snapshot().error).toMatch(/different version/)
  })
})

describe('playing a match', () => {
  /** Whoever's turn it is takes the given action. */
  function actor(host: Room, guest: Room): Room {
    const battle = host.snapshot().battle!
    const active = battle.stacks.find((s) => s.id === battle.activeId)!
    return active.side === 'yav' ? host : guest
  }

  it('keeps both sides in step across a long battle', async () => {
    const { host, guest } = await startBattle(7)

    for (let turn = 0; turn < 120; turn++) {
      const battle = host.snapshot().battle!
      if (battle.outcome) break
      const actions = legalActions(battle)
      const action =
        actions.find((a) => a.type === 'attack') ??
        actions.find((a) => a.type === 'shoot') ??
        actions.find((a) => a.type === 'move') ??
        actions[0]!

      actor(host, guest).act(action)
      await settle()

      expect(guest.snapshot().desync, `desync at turn ${turn}`).toBeNull()
      expect(hashState(guest.snapshot().battle), `divergence at turn ${turn}`).toBe(
        hashState(host.snapshot().battle),
      )
    }
    expect(host.snapshot().battle!.log.length).toBeGreaterThan(20)
  })

  it('lets the guest act by asking, never by applying it themselves', async () => {
    const { host, guest } = await startBattle(3)
    // Wind on until it is the guest's turn.
    while (host.snapshot().battle!.stacks.find((s) => s.id === host.snapshot().battle!.activeId)!.side !== 'nav') {
      actor(host, guest).act({ type: 'defend' })
      await settle()
    }

    const before = hashState(guest.snapshot().battle)
    guest.act({ type: 'defend' })
    // Before the host has answered, the guest's own state is untouched.
    expect(hashState(guest.snapshot().battle)).toBe(before)

    await settle()
    expect(hashState(guest.snapshot().battle)).not.toBe(before)
    expect(hashState(guest.snapshot().battle)).toBe(hashState(host.snapshot().battle))
  })

  it('applies the host its own action exactly once', async () => {
    // The host resolves locally AND broadcasts. If it also acted on its own
    // broadcast the action would land twice, so the resolved message must be
    // ignored by its author.
    const { host, guest } = await startBattle(3)
    const before = hashState(host.snapshot().battle)

    host.act({ type: 'defend' })
    await settle()
    const once = hashState(host.snapshot().battle)
    expect(once).not.toBe(before)

    await settle()
    expect(hashState(host.snapshot().battle)).toBe(once)
    expect(hashState(guest.snapshot().battle)).toBe(once)
  })

  it('reports an illegal request instead of crashing', async () => {
    const { host, guest } = await startBattle(3)
    guest.act({ type: 'shoot', target: 'nope' } as Action)
    await settle()
    expect(host.snapshot().error).toBeTruthy()
    expect(host.snapshot().desync).toBeNull()
  })

  it('reaches the same end state on both sides', async () => {
    const { host, guest } = await startBattle(11)
    for (let turn = 0; turn < 600; turn++) {
      const battle = host.snapshot().battle!
      if (battle.outcome) break
      const actions = legalActions(battle)
      actor(host, guest).act(
        actions.find((a) => a.type === 'attack') ??
          actions.find((a) => a.type === 'move') ??
          actions[0]!,
      )
      await settle()
    }
    expect(host.snapshot().phase).toBe('over')
    expect(guest.snapshot().phase).toBe('over')
    expect(guest.snapshot().battle!.outcome).toEqual(host.snapshot().battle!.outcome)
  })
})

describe('desync detection', () => {
  it('catches a guest whose state no longer matches the host', async () => {
    // The whole point of the hash. Corrupt the guest's copy behind its back
    // and check it notices on the very next action rather than playing on.
    const { host, guest } = await startBattle(5)

    const corrupted = guest.snapshot().battle!
    // Reach in and quietly wound a stack, as a divergent rules build would.
    ;(guest as unknown as { battle: unknown }).battle = {
      ...corrupted,
      stacks: corrupted.stacks.map((s, i) => (i === 0 ? { ...s, count: s.count - 1 } : s)),
    }

    const actions = legalActions(host.snapshot().battle!)
    host.act(actions.find((a) => a.type === 'move') ?? actions[0]!)
    await settle()

    const desync = guest.snapshot().desync
    expect(desync).not.toBeNull()
    expect(desync!.expected).not.toBe(desync!.actual)
  })

  it('tells the host about it too, so neither side plays on alone', async () => {
    const { host, guest } = await startBattle(5)
    const corrupted = guest.snapshot().battle!
    ;(guest as unknown as { battle: unknown }).battle = {
      ...corrupted,
      round: corrupted.round + 5,
    }

    host.act(legalActions(host.snapshot().battle!)[0]!)
    await settle()
    expect(host.snapshot().desync).not.toBeNull()
  })

  it('stops applying anything once it has diverged', async () => {
    const { host, guest } = await startBattle(5)
    const corrupted = guest.snapshot().battle!
    ;(guest as unknown as { battle: unknown }).battle = { ...corrupted, round: 99 }

    host.act(legalActions(host.snapshot().battle!)[0]!)
    await settle()
    const frozen = hashState(guest.snapshot().battle)

    host.act(legalActions(host.snapshot().battle!)[0]!)
    await settle()
    expect(hashState(guest.snapshot().battle)).toBe(frozen)
  })
})

describe('rejoining', () => {
  it('catches a fresh guest up to a battle already in progress', async () => {
    // A second device opens the same link mid-battle. The host replies with
    // its history and the newcomer replays it to the same position.
    const hub = memoryHub()
    const host = new Room({ transport: hub.connect(), side: 'yav', playerId: 'h', seed: 13 })
    const guest = new Room({ transport: hub.connect(), side: 'nav', playerId: 'g', seed: 13 })

    host.join()
    guest.join()
    await settle()
    host.pickFaction('kitezh')
    guest.pickFaction('topyla')
    await settle()
    host.ready(KITEZH)
    guest.ready(TOPYLA)
    await settle()

    for (let i = 0; i < 12; i++) {
      const battle = host.snapshot().battle!
      const active = battle.stacks.find((s) => s.id === battle.activeId)!
      ;(active.side === 'yav' ? host : guest).act({ type: 'defend' })
      await settle()
    }
    const midpoint = hashState(host.snapshot().battle)

    const rejoined = new Room({ transport: hub.connect(), side: 'nav', playerId: 'g2', seed: 13 })
    rejoined.join()
    await settle()

    expect(rejoined.snapshot().phase).toBe('battle')
    expect(hashState(rejoined.snapshot().battle)).toBe(midpoint)
  })

  it('keeps following along after catching up', async () => {
    const hub = memoryHub()
    const host = new Room({ transport: hub.connect(), side: 'yav', playerId: 'h', seed: 21 })
    const guest = new Room({ transport: hub.connect(), side: 'nav', playerId: 'g', seed: 21 })
    host.join()
    guest.join()
    await settle()
    host.pickFaction('kitezh')
    guest.pickFaction('topyla')
    await settle()
    host.ready(KITEZH)
    guest.ready(TOPYLA)
    await settle()

    host.act({ type: 'defend' })
    await settle()

    const rejoined = new Room({ transport: hub.connect(), side: 'nav', playerId: 'g2', seed: 21 })
    rejoined.join()
    await settle()

    const battle = host.snapshot().battle!
    const active = battle.stacks.find((s) => s.id === battle.activeId)!
    ;(active.side === 'yav' ? host : guest).act({ type: 'defend' })
    await settle()

    expect(rejoined.snapshot().desync).toBeNull()
    expect(hashState(rejoined.snapshot().battle)).toBe(hashState(host.snapshot().battle))
  })
})

describe('snapshots', () => {
  it('notifies subscribers and stops after unsubscribing', async () => {
    const { host, guest } = pair()
    const seen: RoomSnapshot[] = []
    const off = host.subscribe((s) => seen.push(s))
    expect(seen).toHaveLength(1) // current state, immediately

    host.join()
    guest.join()
    await settle()
    const count = seen.length
    expect(count).toBeGreaterThan(1)

    off()
    host.pickFaction('kitezh')
    expect(seen).toHaveLength(count)
  })
})
