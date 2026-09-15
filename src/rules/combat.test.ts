import { DAMAGE } from '../content/balance'
import { hashState } from '../engine/hash'
import { recordingRng, seededRng } from '../engine/rng'
import { expect as expectOk } from '../engine/result'
import { hexDistance } from '../hex'
import { attackModifier, damageRange, rollBaseDamage } from './damage'
import { applyAction } from './apply'
import { pendingQueue } from './queue'
import { createBattle } from './setup'
import { applyDamage, poolHp, unitOf } from './stack'
import type { ArmyOrder, BattleState } from './types'

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
const stack = (s: BattleState, id: string) => s.stacks.find((x) => x.id === id)!

describe('attackModifier', () => {
  it('is neutral when attack equals defence', () => {
    expect(attackModifier(10, 10)).toBe(1)
  })

  it('adds 5% per point of attack advantage', () => {
    expect(attackModifier(14, 10)).toBeCloseTo(1.2)
  })

  it('removes 2.5% per point of defence advantage', () => {
    expect(attackModifier(10, 14)).toBeCloseTo(0.9)
  })

  it('clamps at triple damage however far ahead the attacker is', () => {
    expect(attackModifier(1000, 1)).toBe(DAMAGE.attackCap)
  })

  it('clamps at 30% however far behind', () => {
    expect(attackModifier(1, 1000)).toBe(DAMAGE.defenseFloor)
  })
})

describe('rollBaseDamage', () => {
  it('stays inside count x [min, max]', () => {
    const rng = seededRng(5)
    for (let i = 0; i < 300; i++) {
      const count = 1 + (i % 40)
      const total = rollBaseDamage(rng, count, 3, 7)
      expect(total).toBeGreaterThanOrEqual(count * 3)
      expect(total).toBeLessThanOrEqual(count * 7)
    }
  })

  it('spends at most ten draws however large the stack', () => {
    // Every draw has to travel to the other client for replay, so this bound
    // is a wire-size guarantee as much as a performance one.
    const recorder = recordingRng(seededRng(1))
    rollBaseDamage(recorder, 400, 1, 6)
    expect(recorder.draws.length).toBeLessThanOrEqual(10)
  })

  it('is zero for an empty stack', () => {
    expect(rollBaseDamage(seededRng(1), 0, 1, 6)).toBe(0)
  })
})

describe('damageRange', () => {
  it('brackets what computeDamage actually rolls', () => {
    const args = { count: 8, damage: [3, 6] as const, attack: 12, defense: 7 }
    const { min, max } = damageRange(args)
    const rng = seededRng(77)
    for (let i = 0; i < 200; i++) {
      const rolled = rollBaseDamage(rng, args.count, 3, 6)
      const actual = Math.floor(rolled * attackModifier(args.attack, args.defense))
      expect(actual).toBeGreaterThanOrEqual(min - 1)
      expect(actual).toBeLessThanOrEqual(max + 1)
    }
  })

  it('consumes no randomness, so a hover preview cannot desync the game', () => {
    const recorder = recordingRng(seededRng(1))
    damageRange({ count: 5, damage: [2, 4], attack: 9, defense: 9 })
    expect(recorder.draws).toHaveLength(0)
  })
})

describe('applyDamage', () => {
  const s = () => stack(fresh(), 'yav:kmet') // 24 Kmet at 10 hp each

  it('eats the pool from the top, wounding only one unit', () => {
    const out = applyDamage(s(), 25)
    expect(out.killed).toBe(2)
    expect(out.stack.count).toBe(22)
    expect(out.stack.topHp).toBe(5)
    expect(poolHp(out.stack)).toBe(240 - 25)
  })

  it('kills exactly on a round number without over-killing', () => {
    const out = applyDamage(s(), 30)
    expect(out.killed).toBe(3)
    expect(out.stack.count).toBe(21)
    expect(out.stack.topHp).toBe(10)
  })

  it('destroys the stack and reports only the damage it could absorb', () => {
    const out = applyDamage(s(), 10_000)
    expect(out.destroyed).toBe(true)
    expect(out.stack.count).toBe(0)
    expect(out.dealt).toBe(240)
  })

  it('ignores zero and negative damage', () => {
    expect(applyDamage(s(), 0).dealt).toBe(0)
    expect(applyDamage(s(), -5).dealt).toBe(0)
  })
})

describe('setup', () => {
  it('deploys both armies on opposite edges', () => {
    const state = fresh()
    expect(state.stacks).toHaveLength(10)
    const yav = state.stacks.filter((s) => s.side === 'yav')
    const nav = state.stacks.filter((s) => s.side === 'nav')
    for (const a of yav) {
      for (const b of nav) expect(hexDistance(a.hex, b.hex)).toBeGreaterThan(5)
    }
  })

  it('never stacks two units on one hex', () => {
    const hexes = fresh().stacks.map((s) => `${s.hex.q},${s.hex.r}`)
    expect(new Set(hexes).size).toBe(hexes.length)
  })

  it('gives shooters their ammunition and everyone one retaliation', () => {
    const state = fresh()
    expect(stack(state, 'yav:strelets').ammo).toBe(12)
    expect(stack(state, 'yav:kmet').ammo).toBe(0)
    expect(state.stacks.every((s) => s.retaliations === 1)).toBe(true)
  })

  it('is identical for identical orders, so both clients agree on the opening', () => {
    expect(hashState(fresh(9))).toBe(hashState(fresh(9)))
  })

  it('starts with the highest-initiative stack', () => {
    // Zhar-ptitsa is not in this match; Drekavac at 12 leads Bogatyr at 11.
    expect(fresh().activeId).toBe('nav:drekavac')
  })

  it('refuses a battle where either side has nothing on the field', () => {
    expect(() =>
      createBattle(1, { side: 'yav', factionId: 'kitezh', counts: {} }, TOPYLA),
    ).toThrow(/yav has no stacks/)
    expect(() =>
      createBattle(1, KITEZH, { side: 'nav', factionId: 'topyla', counts: {} }),
    ).toThrow(/nav has no stacks/)
  })
})

describe('turn order', () => {
  it('runs highest initiative first', () => {
    const order = pendingQueue(fresh()).map((s) => unitOf(s).stats.initiative)
    expect(order).toEqual([...order].sort((a, b) => b - a))
  })

  it('sends a waiting stack to the back without spending its turn', () => {
    const state = fresh()
    const first = state.activeId!
    const after = expectOk(applyAction(state, { type: 'wait' }, seededRng(1)))

    expect(after.activeId).not.toBe(first)
    expect(stack(after, first).acted).toBe(false)
    expect(stack(after, first).waited).toBe(true)
    // It is still in this round's queue, just last.
    expect(pendingQueue(after).at(-1)!.id).toBe(first)
  })

  it('refuses a second wait from the same stack', () => {
    let state = fresh()
    const first = state.activeId!
    state = expectOk(applyAction(state, { type: 'wait' }, seededRng(1)))
    // Walk the queue round to the waiter again.
    while (state.activeId !== first) {
      state = expectOk(applyAction(state, { type: 'defend' }, seededRng(1)))
    }
    expect(applyAction(state, { type: 'wait' }, seededRng(1)).ok).toBe(false)
  })

  it('opens a new round once everyone has acted', () => {
    let state = fresh()
    const seen = new Set<string>()
    while (state.round === 1 && !state.outcome) {
      seen.add(state.activeId!)
      state = expectOk(applyAction(state, { type: 'defend' }, seededRng(1)))
    }
    expect(state.round).toBe(2)
    expect(seen.size).toBe(10)
    expect(state.stacks.every((s) => !s.acted)).toBe(true)
    // Defending lapses when the round turns.
    expect(state.stacks.every((s) => !s.defending)).toBe(true)
  })
})
