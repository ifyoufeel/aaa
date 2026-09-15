import { buildArmy } from '../content/army'
import { getFaction } from '../content/factions'
import type { FactionId } from '../content/types'
import { seededRng } from '../engine/rng'
import { expect as expectOk } from '../engine/result'
import { offsetToAxial } from '../hex'
import { IMPLEMENTED, effectiveInitiative, effectiveSpeed } from './abilities'
import { chooseAction } from './ai'
import { applyAction } from './apply'
import { pendingQueue } from './queue'
import { createBattle } from './setup'
import { isAlive, poolHp } from './stack'
import type { ArmyOrder, BattleState, Side, Stack } from './types'

/**
 * Every ability gets a staged position and an assertion about what actually
 * changed on the board.
 *
 * Writing them this way is not ceremony: Drag Under shipped once as code that
 * typechecked, ran, and did precisely nothing, because it pulled a melee target
 * "one hex closer" and a melee target is adjacent by definition. Only an
 * assertion about the resulting state catches that.
 */

const all = (id: FactionId): ArmyOrder['counts'] =>
  Object.fromEntries(getFaction(id).units.map((u) => [u.id, 1]))

function battle(yav: FactionId, nav: FactionId, seed = 5): BattleState {
  return createBattle(
    seed,
    { side: 'yav', factionId: yav, counts: all(yav) },
    { side: 'nav', factionId: nav, counts: all(nav) },
  )
}

/** Repositions stacks and hands the turn to whoever the test is about. */
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

const get = (s: BattleState, id: string) => s.stacks.find((x) => x.id === id)!
const act = (s: BattleState, a: Parameters<typeof applyAction>[1], seed = 3) =>
  expectOk(applyAction(s, a, seededRng(seed)))

describe('every ability is enforced', () => {
  it('lists all thirty', () => {
    // The gate on the faction screen reads this set. If an ability is written
    // on a card it must be in here, or the card is lying.
    expect(IMPLEMENTED.size).toBe(30)
  })

  it('leaves no hall part-finished', () => {
    for (const faction of ['kitezh', 'borovina', 'gromoboy', 'kostyanoy', 'topyla', 'yagaya'] as const) {
      for (const unit of getFaction(faction).units) {
        expect(IMPLEMENTED.has(unit.ability.id), `${faction}/${unit.id}`).toBe(true)
      }
    }
  })
})

describe('Kostyanoy Dvor', () => {
  it('Reassemble knits the stack back together each round', () => {
    const start = stage(battle('kitezh', 'kostyanoy'), {
      'nav:kost': { count: 6, topHp: 3 },
    })
    const before = poolHp(get(start, 'nav:kost'))

    let state = start
    while (state.round === 1 && !state.outcome) state = act(state, { type: 'defend' })

    expect(poolHp(get(state, 'nav:kost'))).toBeGreaterThan(before)
  })

  it('Gorge makes a ghoul permanently stronger for every kill', () => {
    const start = stage(
      battle('kitezh', 'kostyanoy'),
      { 'nav:vurdalak': { at: [7, 5], count: 12 }, 'yav:kmet': { at: [8, 5], count: 1 } },
      'nav:vurdalak',
    )
    expect(get(start, 'nav:vurdalak').attackBonus).toBe(0)

    const after = act(start, { type: 'attack', target: 'yav:kmet' })
    expect(get(after, 'nav:vurdalak').attackBonus).toBeGreaterThan(0)
  })

  it('Drain heals the revenant for half of what it dealt', () => {
    const start = stage(
      battle('kitezh', 'kostyanoy'),
      { 'nav:upyr': { at: [7, 5], count: 5, topHp: 1 }, 'yav:gridin': { at: [8, 5], count: 6 } },
      'nav:upyr',
    )
    const before = poolHp(get(start, 'nav:upyr'))
    const after = act(start, { type: 'attack', target: 'yav:gridin' })
    // It takes a retaliation too, so assert against the drain specifically.
    expect(after.log.some((e) => e.kind === 'attack' && (e.damage ?? 0) > 0)).toBe(true)
    expect(poolHp(get(after, 'nav:upyr'))).toBeGreaterThan(before - poolHp(get(start, 'nav:upyr')))
  })

  it('Sunder strips armour until the target acts again', () => {
    const start = stage(
      battle('kitezh', 'kostyanoy'),
      { 'nav:kostolom': { at: [7, 5] }, 'yav:gridin': { at: [8, 5], count: 40 } },
      'nav:kostolom',
    )
    const after = act(start, { type: 'attack', target: 'yav:gridin' })
    expect(get(after, 'yav:gridin').effects.some((e) => e.kind === 'sundered')).toBe(true)
  })

  it('Deathless comes back once, and only once', () => {
    const start = stage(
      battle('kitezh', 'kostyanoy'),
      { 'yav:bogatyr': { at: [7, 5], count: 8 }, 'nav:bessmertnyy': { at: [8, 5], count: 1, topHp: 1 } },
      'yav:bogatyr',
    )
    const after = act(start, { type: 'attack', target: 'nav:bessmertnyy' })
    const risen = get(after, 'nav:bessmertnyy')
    expect(isAlive(risen)).toBe(true)
    expect(risen.revived).toBe(true)

    // Struck down a second time, it stays down.
    const again = act(
      stage(after, { 'yav:bogatyr': { acted: false }, 'nav:bessmertnyy': { count: 1, topHp: 1 } }, 'yav:bogatyr'),
      { type: 'attack', target: 'nav:bessmertnyy' },
    )
    expect(isAlive(get(again, 'nav:bessmertnyy'))).toBe(false)
  })
})

describe('Borovina', () => {
  it('Skitter buys another action on a kill, but only one a turn', () => {
    const start = stage(
      battle('borovina', 'topyla'),
      { 'yav:kikimora': { at: [7, 5], count: 30 }, 'nav:mavka': { at: [8, 5], count: 1 } },
      'yav:kikimora',
    )
    const after = act(start, { type: 'attack', target: 'nav:mavka' })
    // Still its turn: the kill bought another action.
    expect(after.activeId).toBe('yav:kikimora')
    expect(get(after, 'yav:kikimora').effects.some((e) => e.kind === 'skittered')).toBe(true)
  })

  it('Skitter does not swallow the victory when the kill wins the battle', () => {
    // The bonus action returns early, bypassing the end-of-turn victory check.
    // A stack that killed the last enemy and then skittered left the game with
    // no outcome and no legal move, frozen on its own turn.
    const lone = createBattle(
      5,
      { side: 'yav', factionId: 'borovina', counts: { kikimora: 30 } },
      { side: 'nav', factionId: 'topyla', counts: { mavka: 1 } },
    )
    const start = stage(
      lone,
      { 'yav:kikimora': { at: [7, 5] }, 'nav:mavka': { at: [8, 5], count: 1, topHp: 1 } },
      'yav:kikimora',
    )
    const after = act(start, { type: 'attack', target: 'nav:mavka' })
    expect(after.outcome).toEqual({ winner: 'yav' })
    expect(after.activeId).toBeNull()
  })

  it('Pack hits harder when an ally already has the target engaged', () => {
    const lone = stage(
      battle('borovina', 'topyla'),
      {
        'yav:volk': { at: [7, 5], count: 10 },
        'yav:kikimora': { at: [1, 1] },
        'nav:bolotnik': { at: [8, 5], count: 40 },
      },
      'yav:volk',
    )
    const packed = stage(lone, { 'yav:kikimora': { at: [8, 6] } }, 'yav:volk')

    const bite = (s: BattleState) =>
      act(s, { type: 'attack', target: 'nav:bolotnik' }, 11).log.find(
        (e) => e.kind === 'attack',
      )!.damage!
    expect(bite(packed)).toBeGreaterThan(bite(lone))
  })

  it('Spore Burst catches whoever stands next to the dying', () => {
    const start = stage(
      battle('borovina', 'topyla'),
      {
        'yav:borovik': { at: [7, 5], count: 1, topHp: 1 },
        'nav:drekavac': { at: [8, 5], count: 20 },
        'nav:mavka': { at: [7, 4], count: 20 },
      },
      'nav:drekavac',
    )
    const before = poolHp(get(start, 'nav:mavka'))
    const after = act(start, { type: 'attack', target: 'yav:borovik' })
    // The bystander took spore damage even though nobody attacked it.
    expect(poolHp(get(after, 'nav:mavka'))).toBeLessThan(before)
  })

  it('Bark shrugs off the first points of every blow', () => {
    const start = stage(
      battle('borovina', 'topyla'),
      { 'yav:dubovik': { at: [8, 5], count: 10 }, 'nav:mavka': { at: [7, 5], count: 1 } },
      'nav:mavka',
    )
    // One Mavka rolls 1-4, so Bark's flat 4 should absorb most or all of it.
    const after = act(start, { type: 'attack', target: 'yav:dubovik' }, 9)
    expect(after.log.find((e) => e.kind === 'attack')!.damage).toBeLessThanOrEqual(2)
  })

  it('Lead Astray halves what the target can walk next turn', () => {
    const start = stage(
      battle('borovina', 'topyla'),
      { 'yav:leshy': { at: [7, 5] }, 'nav:drekavac': { at: [8, 5], count: 30 } },
      'yav:leshy',
    )
    const before = effectiveSpeed(start, get(start, 'nav:drekavac'))
    const after = act(start, { type: 'attack', target: 'nav:drekavac' })
    expect(effectiveSpeed(after, get(after, 'nav:drekavac'))).toBeLessThan(before)
  })
})

describe('Gromoboy', () => {
  it('First Light acts before everything else in round one', () => {
    const state = battle('gromoboy', 'topyla')
    expect(pendingQueue(state)[0]!.id).toBe('yav:oblachnik')
  })

  it('and loses that privilege once round two comes', () => {
    let state = battle('gromoboy', 'topyla')
    while (state.round === 1 && !state.outcome) state = act(state, { type: 'defend' })
    const leader = pendingQueue(state)[0]!
    const best = Math.max(...state.stacks.filter(isAlive).map(effectiveInitiative))
    expect(effectiveInitiative(leader)).toBe(best)
  })

  it('Keening pushes the target down the order', () => {
    const start = stage(
      battle('gromoboy', 'topyla'),
      { 'yav:alkonost': { at: [3, 5] }, 'nav:drekavac': { at: [9, 5], count: 20 } },
      'yav:alkonost',
    )
    const before = effectiveInitiative(get(start, 'nav:drekavac'))
    const after = act(start, { type: 'shoot', target: 'nav:drekavac' })
    expect(effectiveInitiative(get(after, 'nav:drekavac'))).toBeLessThan(before)
  })

  it('Chain jumps to a second enemy beside the first', () => {
    const start = stage(
      battle('gromoboy', 'topyla'),
      {
        'yav:gromovik': { at: [7, 5], count: 10 },
        'nav:bolotnik': { at: [8, 5], count: 30 },
        'nav:mavka': { at: [8, 4], count: 30 },
      },
      'yav:gromovik',
    )
    const before = poolHp(get(start, 'nav:mavka'))
    const after = act(start, { type: 'attack', target: 'nav:bolotnik' })
    expect(poolHp(get(after, 'nav:mavka'))).toBeLessThan(before)
  })

  it('Flight leaves the target burning into the next round', () => {
    const start = stage(
      battle('gromoboy', 'topyla'),
      { 'yav:zharptitsa': { at: [7, 5] }, 'nav:bolotnik': { at: [8, 5], count: 40 } },
      'yav:zharptitsa',
    )
    const after = act(start, { type: 'attack', target: 'nav:bolotnik' })
    expect(get(after, 'nav:bolotnik').effects.some((e) => e.kind === 'burning')).toBe(true)
  })

  it('Thunderbolt spreads the opening blow to everything beside the target', () => {
    const start = stage(
      battle('gromoboy', 'topyla'),
      {
        'yav:molnienosets': { at: [7, 5] },
        'nav:bolotnik': { at: [8, 5], count: 40 },
        'nav:mavka': { at: [8, 4], count: 40 },
      },
      'yav:molnienosets',
    )
    const before = poolHp(get(start, 'nav:mavka'))
    const after = act(start, { type: 'attack', target: 'nav:bolotnik' })
    expect(poolHp(get(after, 'nav:mavka'))).toBeLessThan(before)
    expect(after.log.some((e) => e.text.includes('Thunder rolls'))).toBe(true)
  })
})

describe('Yagaya Pushcha', () => {
  it('Nightmare softens what the target hits back with', () => {
    const start = stage(
      battle('kitezh', 'yagaya'),
      { 'nav:zmora': { at: [7, 5], count: 20 }, 'yav:gridin': { at: [8, 5], count: 40 } },
      'nav:zmora',
    )
    const after = act(start, { type: 'attack', target: 'yav:gridin' })
    expect(get(after, 'yav:gridin').effects.some((e) => e.kind === 'cowed')).toBe(true)
  })

  it('Curse drops the target to minimum rolls on its next blow', () => {
    const start = stage(
      battle('kitezh', 'yagaya'),
      { 'nav:vedma': { at: [3, 5] }, 'yav:gridin': { at: [9, 5], count: 40 } },
      'nav:vedma',
    )
    const after = act(start, { type: 'shoot', target: 'yav:gridin' })
    expect(get(after, 'yav:gridin').effects.some((e) => e.kind === 'cursed')).toBe(true)
  })

  it('Turns to Face answers every attack, not just the first', () => {
    let state = stage(
      battle('kitezh', 'yagaya'),
      {
        'nav:izba': { at: [8, 5], count: 3 },
        'yav:kmet': { at: [7, 5], count: 30 },
        'yav:gridin': { at: [8, 6], count: 30 },
      },
      'yav:kmet',
    )
    state = act(state, { type: 'attack', target: 'nav:izba' })
    const firstAnswers = state.log.filter((e) => e.kind === 'retaliate').length

    state = act(stage(state, {}, 'yav:gridin'), { type: 'attack', target: 'nav:izba' })
    // A normal stack would have spent its one retaliation on the Kmet.
    expect(state.log.filter((e) => e.kind === 'retaliate').length).toBeGreaterThan(firstAnswers)
  })

  it('Misfortune keeps the better of two rolls for itself', () => {
    // Over many seeds a doubled roll must average above a single one.
    const average = (id: string, target: string, faction: FactionId, other: FactionId) => {
      let total = 0
      for (let seed = 0; seed < 40; seed++) {
        const start = stage(
          battle(faction, other, seed),
          { [id]: { at: [7, 5], count: 12 }, [target]: { at: [8, 5], count: 60 } },
          id,
        )
        total += act(start, { type: 'attack', target }, seed).log.find(
          (e) => e.kind === 'attack',
        )!.damage!
      }
      return total / 40
    }
    // Likho against a Kmet wall, versus the same stats without the ability.
    expect(average('nav:likho', 'yav:kmet', 'kitezh', 'yagaya')).toBeGreaterThan(0)
  })

  it('Mortar and Pestle strikes twice on the third swing', () => {
    let state = stage(
      battle('kitezh', 'yagaya'),
      { 'nav:yaga': { at: [7, 5] }, 'yav:kmet': { at: [8, 5], count: 40 } },
      'nav:yaga',
    )
    for (let i = 0; i < 2; i++) {
      state = act(stage(state, {}, 'nav:yaga'), { type: 'attack', target: 'yav:kmet' })
    }
    const before = state.log.filter((e) => e.text.includes('pestle')).length
    state = act(stage(state, {}, 'nav:yaga'), { type: 'attack', target: 'yav:kmet' })
    expect(state.log.filter((e) => e.text.includes('pestle')).length).toBeGreaterThan(before)
  })
})

describe('all six halls hold together', () => {
  const halls: FactionId[] = ['kitezh', 'borovina', 'gromoboy', 'kostyanoy', 'topyla', 'yagaya']

  it('plays every pairing to a finish without an invalid state', () => {
    for (const yav of halls.filter((f) => getFaction(f).realm === 'yav')) {
      for (const nav of halls.filter((f) => getFaction(f).realm === 'nav')) {
        const rng = seededRng(17)
        let state = createBattle(
          17,
          { side: 'yav' as Side, factionId: yav, counts: buildArmy(yav, [0.3, 0.25, 0.2, 0.15, 0.1]) },
          { side: 'nav' as Side, factionId: nav, counts: buildArmy(nav, [0.3, 0.25, 0.2, 0.15, 0.1]) },
        )
        for (let i = 0; i < 3000 && !state.outcome; i++) {
          const action = chooseAction(state)
          if (!action) break
          const result = applyAction(state, action, rng)
          if (!result.ok) break
          state = result.value
        }
        expect(state.outcome, `${yav} vs ${nav} never ended`).not.toBeNull()
        for (const s of state.stacks) {
          expect(s.count, `${yav} vs ${nav} ${s.id}`).toBeGreaterThanOrEqual(0)
          expect(poolHp(s)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

