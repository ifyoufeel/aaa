import { hashState } from '../engine/hash'
import { recordingRng, replayRng, seededRng } from '../engine/rng'
import { expect as expectOk } from '../engine/result'
import { offsetToAxial } from '../hex'
import { incomingMultipliers } from './abilities'
import { applyAction } from './apply'
import { legalActions, validate } from './legal'
import { createBattle } from './setup'
import { isAlive, poolHp } from './stack'
import type { Action, ArmyOrder, BattleState, Stack } from './types'

const KITEZH: ArmyOrder = {
  side: 'yav',
  factionId: 'kitezh',
  counts: { kmet: 24, strelets: 12, gridin: 6, bogatyr: 4, volkhv: 1 },
}
const TOPYLA: ArmyOrder = {
  side: 'nav',
  factionId: 'topyla',
  counts: { mavka: 20, rusalka: 9, bolotnik: 5, drekavac: 4, vodyanoy: 1 },
}

const fresh = (seed = 1) => createBattle(seed, KITEZH, TOPYLA)
const get = (s: BattleState, id: string) => s.stacks.find((x) => x.id === id)!

/** Rebuilds a state with one stack moved and made active. Test scaffolding only. */
function stage(
  state: BattleState,
  edits: Record<string, Partial<Stack> & { at?: [number, number] }>,
  activeId?: string,
): BattleState {
  const stacks = state.stacks.map((s) => {
    const edit = edits[s.id]
    if (!edit) return s
    const { at, ...rest } = edit
    return { ...s, ...rest, ...(at ? { hex: offsetToAxial({ col: at[0], row: at[1] }) } : {}) }
  })
  return { ...state, stacks, ...(activeId ? { activeId } : {}) }
}

/**
 * Plays a whole battle by always taking the same choice from the legal list,
 * which keeps it reproducible while still exercising every code path.
 */
function playOut(
  state: BattleState,
  pick: (actions: Action[], n: number) => Action,
  rng = seededRng(state.seed),
): { final: BattleState; turns: number } {
  let turns = 0
  while (!state.outcome && turns < 4000) {
    const actions = legalActions(state)
    if (actions.length === 0) break
    state = expectOk(applyAction(state, pick(actions, turns), rng), `turn ${turns}`)
    turns++
  }
  return { final: state, turns }
}

describe('retaliation', () => {
  it('answers a melee attack once, and the answer draws no answer', () => {
    // Bogatyr beside Bolotnik, Bogatyr to act.
    const state = stage(
      fresh(),
      { 'yav:bogatyr': { at: [7, 5] }, 'nav:bolotnik': { at: [8, 5] } },
      'yav:bogatyr',
    )
    const before = poolHp(get(state, 'yav:bogatyr'))
    const after = expectOk(
      applyAction(state, { type: 'attack', target: 'nav:bolotnik' }, seededRng(3)),
    )

    // The attacker took damage back...
    expect(poolHp(get(after, 'yav:bogatyr'))).toBeLessThan(before)
    // ...exactly one retaliation was spent...
    expect(get(after, 'nav:bolotnik').retaliations).toBe(0)
    // ...and the log holds one strike and one answer, not a loop.
    expect(after.log.filter((e) => e.kind === 'attack')).toHaveLength(1)
    expect(after.log.filter((e) => e.kind === 'retaliate')).toHaveLength(1)
  })

  it('does not answer a second attack in the same round', () => {
    let state = stage(
      fresh(),
      {
        'yav:bogatyr': { at: [7, 5] },
        'yav:kmet': { at: [8, 6] },
        'nav:bolotnik': { at: [8, 5], retaliations: 0 },
      },
      'yav:kmet',
    )
    const before = poolHp(get(state, 'yav:kmet'))
    state = expectOk(applyAction(state, { type: 'attack', target: 'nav:bolotnik' }, seededRng(3)))

    expect(poolHp(get(state, 'yav:kmet'))).toBe(before)
    expect(state.log.some((e) => e.kind === 'retaliate')).toBe(false)
  })

  it('refills retaliations when the round turns', () => {
    let state = fresh()
    while (state.round === 1 && !state.outcome) {
      state = expectOk(applyAction(state, { type: 'defend' }, seededRng(1)))
    }
    expect(state.stacks.every((s) => s.retaliations === 1)).toBe(true)
  })

  it('is not provoked by shooting', () => {
    const state = stage(
      fresh(),
      { 'yav:strelets': { at: [3, 5] }, 'nav:mavka': { at: [9, 5] } },
      'yav:strelets',
    )
    const after = expectOk(
      applyAction(state, { type: 'shoot', target: 'nav:mavka' }, seededRng(4)),
    )
    expect(after.log.some((e) => e.kind === 'retaliate')).toBe(false)
    expect(get(after, 'yav:strelets').ammo).toBe(11)
  })

  it('is suppressed by Shriek', () => {
    const state = stage(
      fresh(),
      { 'nav:drekavac': { at: [7, 5] }, 'yav:gridin': { at: [8, 5] } },
      'nav:drekavac',
    )
    const before = poolHp(get(state, 'nav:drekavac'))
    const after = expectOk(
      applyAction(state, { type: 'attack', target: 'yav:gridin' }, seededRng(5)),
    )
    expect(poolHp(get(after, 'nav:drekavac'))).toBe(before)
    expect(after.log.some((e) => e.kind === 'retaliate')).toBe(false)
  })
})

describe('abilities', () => {
  it('Charge pays more the further the rider came', () => {
    const near = stage(
      fresh(),
      { 'yav:bogatyr': { at: [7, 5] }, 'nav:bolotnik': { at: [8, 5] } },
      'yav:bogatyr',
    )
    const far = stage(
      fresh(),
      { 'yav:bogatyr': { at: [3, 5] }, 'nav:bolotnik': { at: [8, 5] } },
      'yav:bogatyr',
    )
    const dmg = (s: BattleState) =>
      expectOk(applyAction(s, { type: 'attack', target: 'nav:bolotnik' }, seededRng(11)))
        .log.find((e) => e.kind === 'attack')!.damage!

    expect(dmg(far)).toBeGreaterThan(dmg(near))
  })

  it('Shield Wall halves incoming fire, and Siren Song ignores it', () => {
    // Tested on the rule directly rather than through a whole attack: the two
    // shooters have different stats, so comparing their damage would measure
    // the stat gap as much as the ability.
    const state = fresh()
    const gridin = get(state, 'yav:gridin') // has Shield Wall
    const kmet = get(state, 'yav:kmet') // does not
    const ctx = (attacker: Stack, defender: Stack) =>
      ({ state, attacker, defender, kind: 'shoot', moved: 0 }) as const

    const plainArcher = get(state, 'yav:strelets')
    const siren = get(state, 'nav:rusalka')

    expect(incomingMultipliers(ctx(plainArcher, gridin))).toContain(0.5)
    expect(incomingMultipliers(ctx(siren, gridin))).not.toContain(0.5)
    expect(incomingMultipliers(ctx(plainArcher, kmet))).not.toContain(0.5)
  })

  it('Mire caps an adjacent enemy at two hexes of movement', () => {
    const state = stage(
      fresh(),
      { 'yav:bogatyr': { at: [7, 5] }, 'nav:bolotnik': { at: [8, 5] } },
      'yav:bogatyr',
    )
    // Bogatyr has speed 8, but is standing in the mire.
    const far = offsetToAxial({ col: 2, row: 5 })
    expect(applyAction(state, { type: 'move', to: far }, seededRng(1)).ok).toBe(false)

    const near = offsetToAxial({ col: 5, row: 5 })
    expect(applyAction(state, { type: 'move', to: near }, seededRng(1)).ok).toBe(true)
  })

  it('Beckon slows what it touches for one activation', () => {
    const state = stage(
      fresh(),
      { 'nav:mavka': { at: [7, 5] }, 'yav:kmet': { at: [8, 5] } },
      'nav:mavka',
    )
    const after = expectOk(
      applyAction(state, { type: 'attack', target: 'yav:kmet' }, seededRng(6)),
    )
    expect(get(after, 'yav:kmet').effects.some((e) => e.kind === 'slowed')).toBe(true)
  })

  it('Drag Under trades places with the target', () => {
    const state = stage(
      fresh(),
      { 'nav:vodyanoy': { at: [7, 5] }, 'yav:kmet': { at: [8, 5] } },
      'nav:vodyanoy',
    )
    const water = get(state, 'nav:vodyanoy').hex
    const bank = get(state, 'yav:kmet').hex

    const after = expectOk(
      applyAction(state, { type: 'attack', target: 'yav:kmet' }, seededRng(8)),
    )
    const target = get(after, 'yav:kmet')
    expect(isAlive(target)).toBe(true)
    expect(target.hex).toEqual(water)
    expect(get(after, 'nav:vodyanoy').hex).toEqual(bank)
  })
})

describe('legality', () => {
  it('leaves state untouched when an action is refused', () => {
    const state = fresh()
    const before = hashState(state)
    const refused = applyAction(state, { type: 'shoot', target: 'nope' }, seededRng(1))
    expect(refused.ok).toBe(false)
    expect(hashState(state)).toBe(before)
  })

  it('refuses shooting from a stack that cannot shoot, or has no arrows left', () => {
    const state = fresh()
    const kmet = stage(state, {}, 'yav:kmet')
    expect(applyAction(kmet, { type: 'shoot', target: 'nav:mavka' }, seededRng(1)).ok).toBe(false)

    const dry = stage(state, { 'yav:strelets': { ammo: 0 } }, 'yav:strelets')
    expect(applyAction(dry, { type: 'shoot', target: 'nav:mavka' }, seededRng(1)).ok).toBe(false)
  })

  it('refuses attacking your own side, or a stack already destroyed', () => {
    const state = stage(
      fresh(),
      { 'yav:bogatyr': { at: [7, 5] }, 'yav:kmet': { at: [8, 5] }, 'nav:mavka': { count: 0 } },
      'yav:bogatyr',
    )
    expect(applyAction(state, { type: 'attack', target: 'yav:kmet' }, seededRng(1)).ok).toBe(false)
    expect(applyAction(state, { type: 'attack', target: 'nav:mavka' }, seededRng(1)).ok).toBe(false)
  })

  it('refuses a move beyond reach, and a move to where you stand', () => {
    const state = stage(fresh(), {}, 'yav:kmet') // speed 4
    const here = get(state, 'yav:kmet').hex
    expect(applyAction(state, { type: 'move', to: here }, seededRng(1)).ok).toBe(false)
    expect(
      applyAction(state, { type: 'move', to: offsetToAxial({ col: 13, row: 5 }) }, seededRng(1)).ok,
    ).toBe(false)
  })

  it('agrees with validate on every legal action it offers', () => {
    let state = fresh()
    for (let i = 0; i < 40 && !state.outcome; i++) {
      for (const action of legalActions(state)) {
        expect(validate(state, action).ok, JSON.stringify(action)).toBe(true)
      }
      state = expectOk(applyAction(state, legalActions(state)[0]!, seededRng(i)))
    }
  })

  it('offers nothing once the battle is decided', () => {
    const over: BattleState = { ...fresh(), outcome: { winner: 'yav' }, activeId: null }
    expect(legalActions(over)).toEqual([])
    expect(applyAction(over, { type: 'defend' }, seededRng(1)).ok).toBe(false)
  })
})

describe('determinism', () => {
  it('reaches the same state from the same seed and the same choices', () => {
    const a = playOut(fresh(7), (actions, n) => actions[n % actions.length]!)
    const b = playOut(fresh(7), (actions, n) => actions[n % actions.length]!)
    expect(hashState(a.final)).toBe(hashState(b.final))
    expect(a.turns).toBe(b.turns)
  })

  it('diverges on a different seed, so the seed is actually doing something', () => {
    const a = playOut(fresh(7), (actions, n) => actions[n % actions.length]!)
    const b = playOut(fresh(8), (actions, n) => actions[n % actions.length]!)
    expect(hashState(a.final)).not.toBe(hashState(b.final))
  })

  it('replays a host recording to an identical state at every single step', () => {
    // This is the sync model in miniature: the host rolls, the guest replays
    // the rolls, and the two hashes must agree after every action. If this
    // test can fail, two players can silently play different games.
    let host = fresh(99)
    let guest = fresh(99)
    const source = seededRng(99)

    for (let turn = 0; turn < 250 && !host.outcome; turn++) {
      const actions = legalActions(host)
      if (actions.length === 0) break
      const action = actions[(turn * 7 + 3) % actions.length]!

      const recorder = recordingRng(source)
      host = expectOk(applyAction(host, action, recorder), `host turn ${turn}`)

      guest = expectOk(
        applyAction(guest, action, replayRng(recorder.draws)),
        `guest turn ${turn}`,
      )

      expect(hashState(guest), `desync after turn ${turn}`).toBe(hashState(host))
    }
    expect(host.log.length).toBeGreaterThan(10)
  })
})

describe('a battle always ends', () => {
  it('terminates under aggressive play, with one side wiped', () => {
    // Prefer attacking, then shooting, then closing the distance.
    const { final, turns } = playOut(fresh(4), (actions) => {
      return (
        actions.find((a) => a.type === 'attack') ??
        actions.find((a) => a.type === 'shoot') ??
        actions.find((a) => a.type === 'move') ??
        actions[0]!
      )
    })
    expect(final.outcome).not.toBeNull()
    expect(final.outcome!.winner).not.toBe('draw')
    expect(turns).toBeLessThan(4000)
  })

  it('is called a draw rather than running forever when nobody engages', () => {
    const { final } = playOut(fresh(4), (actions) => actions.find((a) => a.type === 'defend')!)
    expect(final.outcome).toEqual({ winner: 'draw' })
  })

  it('survives a thousand random turns across many seeds without an invalid state', () => {
    for (let seed = 0; seed < 25; seed++) {
      const rng = seededRng(seed * 1013 + 7)
      const { final } = playOut(
        fresh(seed),
        (actions) => actions[Math.floor(rng.next() * actions.length)]!,
        seededRng(seed),
      )
      for (const s of final.stacks) {
        expect(s.count, `seed ${seed} ${s.id}`).toBeGreaterThanOrEqual(0)
        expect(s.topHp, `seed ${seed} ${s.id}`).toBeGreaterThanOrEqual(0)
        expect(s.ammo, `seed ${seed} ${s.id}`).toBeGreaterThanOrEqual(0)
      }
      // No two living stacks ever share a hex.
      const occupied = final.stacks.filter(isAlive).map((s) => `${s.hex.q},${s.hex.r}`)
      expect(new Set(occupied).size, `seed ${seed}`).toBe(occupied.length)
    }
  })
})
