import { fnv1a, hashState, stableStringify } from './hash'
import { err, expect as expectOk, ok } from './result'
import { recordingRng, replayRng, seededRng } from './rng'

describe('Result', () => {
  it('carries a value or a reason', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 })
    expect(err('nope')).toEqual({ ok: false, reason: 'nope' })
  })

  it('unwraps, or throws with context', () => {
    expect(expectOk(ok(7))).toBe(7)
    expect(() => expectOk(err('blocked'), 'move')).toThrow('move: blocked')
  })
})

describe('seededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = seededRng(12345)
    const b = seededRng(12345)
    const draw = (r: ReturnType<typeof seededRng>) =>
      Array.from({ length: 50 }, () => r.next())
    expect(draw(a)).toEqual(draw(b))
  })

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, seededRng(1).next)
    const b = Array.from({ length: 20 }, seededRng(2).next)
    expect(a).not.toEqual(b)
  })

  it('stays inside [0, 1)', () => {
    const rng = seededRng(99)
    for (let i = 0; i < 5000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('rolls integers inclusive of both bounds', () => {
    const rng = seededRng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 4000; i++) seen.add(rng.int(1, 6))
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('handles a single-value range', () => {
    const rng = seededRng(3)
    for (let i = 0; i < 20; i++) expect(rng.int(5, 5)).toBe(5)
  })

  it('resumes exactly from a saved cursor', () => {
    // The whole play-by-action model depends on this: a client that rejoins
    // mid-battle must continue the same sequence, not start a new one.
    const original = seededRng(4242)
    const skipped = Array.from({ length: 17 }, original.next)
    const rest = Array.from({ length: 10 }, original.next)

    const resumed = seededRng(4242, 17)
    expect(Array.from({ length: 10 }, resumed.next)).toEqual(rest)
    expect(skipped).toHaveLength(17)
  })

  it('exposes its state', () => {
    const rng = seededRng(11)
    const before = rng.state
    rng.next()
    expect(rng.state).not.toBe(before)
  })
})

describe('recording and replay', () => {
  it('replays a recording to identical results', () => {
    const recorder = recordingRng(seededRng(2024))
    const rolled = Array.from({ length: 30 }, () => recorder.int(1, 20))

    const replayed = replayRng(recorder.draws)
    expect(Array.from({ length: 30 }, () => replayed.int(1, 20))).toEqual(rolled)
  })

  it('records one draw per call, for int as well as next', () => {
    const recorder = recordingRng(seededRng(1))
    recorder.next()
    recorder.int(1, 6)
    recorder.int(3, 9)
    expect(recorder.draws).toHaveLength(3)
  })

  it('throws rather than inventing randomness when the recording runs short', () => {
    // A silent fallback here is exactly the desync the hash is meant to catch,
    // except it would be undetectable.
    const replayed = replayRng([0.5])
    expect(replayed.next()).toBe(0.5)
    expect(() => replayed.next()).toThrow(/rng underrun/)
  })
})

describe('stableStringify', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })

  it('sorts nested keys too', () => {
    const x = { outer: { z: 1, a: { n: 2, m: 3 } } }
    const y = { outer: { a: { m: 3, n: 2 }, z: 1 } }
    expect(stableStringify(x)).toBe(stableStringify(y))
  })

  it('keeps array order, which is meaningful', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]))
  })

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null')
    expect(stableStringify(3)).toBe('3')
    expect(stableStringify('x')).toBe('"x"')
    expect(stableStringify(undefined)).toBe('null')
  })

  it('drops undefined members, as JSON does', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}')
  })
})

describe('hashState', () => {
  it('is stable across key order', () => {
    expect(hashState({ a: 1, b: [2, 3] })).toBe(hashState({ b: [2, 3], a: 1 }))
  })

  it('changes when anything changes', () => {
    expect(hashState({ hp: 40 })).not.toBe(hashState({ hp: 39 }))
  })

  it('is eight hex digits', () => {
    expect(hashState({ any: 'thing' })).toMatch(/^[0-9a-f]{8}$/)
    expect(fnv1a('')).toMatch(/^[0-9a-f]{8}$/)
  })
})
