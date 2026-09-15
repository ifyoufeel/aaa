/**
 * Seeded randomness.
 *
 * Every die roll in the game comes from here. Nothing in the rules may call
 * `Math.random`, read a clock, or otherwise reach outside its inputs — the two
 * clients replay each other's actions and must arrive at identical state.
 *
 * The generator's whole state is one 32-bit integer, so a position can be saved
 * and resumed exactly. Three flavours:
 *
 * - `seededRng`   generates, and is what the host runs.
 * - `recordingRng` wraps a generator and keeps every value it produced.
 * - `replayRng`    hands back a recorded list instead of generating.
 *
 * The host resolves an action with a recording generator and broadcasts the
 * draws; the guest applies the same action with a replay generator. The result
 * is identical without either side having to trust the other's arithmetic.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number
}

export interface SeededRng extends Rng {
  /** Current generator state; store it to resume exactly where you left off. */
  readonly state: number
}

export interface RecordingRng extends Rng {
  /** Every value produced so far, in order. */
  readonly draws: readonly number[]
}

/**
 * mulberry32. Small, fast, and good enough for damage rolls; the important
 * property here is that it is exactly reproducible from its state, which
 * `Math.random` is not.
 */
export function seededRng(seed: number, cursor = 0): SeededRng {
  let state = seed | 0
  // Fast-forward to a saved cursor position.
  for (let i = 0; i < cursor; i++) step()

  function step(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next: step,
    int: (min, max) => min + Math.floor(step() * (max - min + 1)),
    get state() {
      return state
    },
  }
}

export function recordingRng(inner: Rng): RecordingRng {
  const draws: number[] = []
  return {
    next() {
      const value = inner.next()
      draws.push(value)
      return value
    },
    int(min, max) {
      const value = inner.next()
      draws.push(value)
      return min + Math.floor(value * (max - min + 1))
    },
    draws,
  }
}

/**
 * Replays recorded draws. Running out means the two sides disagree about how
 * many rolls an action needs — a desync, and one worth failing loudly on
 * rather than quietly generating fresh randomness.
 */
export function replayRng(draws: readonly number[]): Rng {
  let i = 0
  function take(): number {
    if (i >= draws.length) {
      throw new Error(
        `rng underrun: replay needed draw ${i + 1} but only ${draws.length} were recorded`,
      )
    }
    return draws[i++]!
  }
  return {
    next: take,
    int: (min, max) => min + Math.floor(take() * (max - min + 1)),
  }
}
