import { BOARD, GOLD_BUDGET } from './balance'
import { FACTIONS, factionsOf, getFaction, getUnit } from './factions'
import type { AbilityId } from './types'

describe('faction roster', () => {
  it('splits three halls to each realm', () => {
    expect(factionsOf('yav')).toHaveLength(3)
    expect(factionsOf('nav')).toHaveLength(3)
  })

  it('gives every hall exactly five units, cheapest first', () => {
    for (const faction of FACTIONS) {
      expect(faction.units).toHaveLength(5)
      const costs = faction.units.map((u) => u.cost)
      expect(costs).toEqual([...costs].sort((a, b) => a - b))
    }
  })

  it('uses a unique id for every faction and for every unit within a faction', () => {
    expect(new Set(FACTIONS.map((f) => f.id)).size).toBe(FACTIONS.length)
    for (const faction of FACTIONS) {
      const ids = faction.units.map((u) => u.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('never reuses an ability id across the whole game', () => {
    // Abilities are implemented by id, so a duplicate would silently give two
    // different units the same behaviour.
    const seen = new Map<AbilityId, string>()
    for (const faction of FACTIONS) {
      for (const unit of faction.units) {
        const previous = seen.get(unit.ability.id)
        expect(previous, `${unit.ability.id} reused by ${previous} and ${unit.id}`).toBeUndefined()
        seen.set(unit.ability.id, `${faction.id}/${unit.id}`)
      }
    }
    expect(seen.size).toBe(30)
  })

  it('keeps stats inside sane ranges', () => {
    for (const faction of FACTIONS) {
      for (const unit of faction.units) {
        const { attack, defense, damage, hp, speed, initiative } = unit.stats
        const [min, max] = damage
        expect(unit.cost, unit.id).toBeGreaterThan(0)
        expect(attack, unit.id).toBeGreaterThan(0)
        expect(defense, unit.id).toBeGreaterThan(0)
        expect(min, unit.id).toBeGreaterThan(0)
        expect(max, unit.id).toBeGreaterThanOrEqual(min)
        expect(hp, unit.id).toBeGreaterThan(0)
        expect(initiative, unit.id).toBeGreaterThan(0)
        // A stack must be able to cross the board in a handful of turns, and
        // must never cross it in one.
        expect(speed, unit.id).toBeGreaterThanOrEqual(3)
        expect(speed, unit.id).toBeLessThan(BOARD.cols)
      }
    }
  })

  it('lets every hall field all five of its units inside the budget', () => {
    // If the cheapest possible full army does not fit, a whole unit type is
    // unreachable and the recruitment decision is fake.
    for (const faction of FACTIONS) {
      const oneOfEach = faction.units.reduce((sum, u) => sum + u.cost, 0)
      expect(oneOfEach, faction.id).toBeLessThanOrEqual(GOLD_BUDGET)
    }
  })

  it('separates the cheapest unit from the capstone by at least eight times', () => {
    // What matters is that the tiers are actually distinct choices, not how
    // many copies of the top unit the budget happens to allow -- Kitezh's
    // capstone is a support piece and is legitimately cheap for its slot.
    for (const faction of FACTIONS) {
      const [cheapest] = faction.units
      const capstone = faction.units[4]
      expect(capstone.cost / cheapest.cost, faction.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('gives shooters a shot count and a melee penalty', () => {
    for (const faction of FACTIONS) {
      for (const unit of faction.units) {
        if (!unit.ranged) continue
        expect(unit.ranged.shots, unit.id).toBeGreaterThan(0)
        expect(unit.ranged.meleePenalty, unit.id).toBeGreaterThan(0)
        expect(unit.ranged.meleePenalty, unit.id).toBeLessThan(1)
      }
    }
  })

  it('gives every hall but Kostyanoy Dvor exactly one shooter', () => {
    // Kostyanoy having none is the game's sharpest asymmetry and is deliberate.
    // This test exists so that stops being true only on purpose.
    for (const faction of FACTIONS) {
      const shooters = faction.units.filter((u) => u.ranged).length
      expect(shooters, faction.id).toBe(faction.id === 'kostyanoy' ? 0 : 1)
    }
  })

  it('looks units up by faction', () => {
    expect(getUnit('kitezh', 'bogatyr').cost).toBe(90)
    expect(() => getUnit('kitezh', 'nope')).toThrow(/unknown unit/)
    expect(() => getFaction('nope' as never)).toThrow(/unknown faction/)
  })
})
