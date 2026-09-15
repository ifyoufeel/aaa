/**
 * Balance harness.
 *
 * Plays whole battles between scripted army compositions and reports who wins.
 * Both sides are driven by the same greedy AI, so the difference in outcomes is
 * the armies rather than the play.
 *
 *   npx tsx scripts/simulate.ts            # every matchup, 60 battles each
 *   npx tsx scripts/simulate.ts 200        # more battles, tighter numbers
 */

import { buildArmy as build } from '../src/content/army'
import { GOLD_BUDGET } from '../src/content/balance'
import { factionsOf } from '../src/content/factions'
import { seededRng } from '../src/engine/rng'
import { applyAction, chooseAction, createBattle } from '../src/rules'
import type { ArmyOrder, Side } from '../src/rules'

const ROUNDS_CAP = 400

const SHAPES: Record<string, readonly number[]> = {
  chaff: [1, 0, 0, 0, 0],
  shooters: [0.3, 1, 0, 0, 0],
  line: [0.3, 0.2, 1, 0, 0],
  cavalry: [0.2, 0, 0, 1, 0],
  elite: [0.2, 0, 0, 0, 1],
  balanced: [0.3, 0.25, 0.2, 0.15, 0.1],
}

function play(
  seed: number,
  yav: ArmyOrder,
  nav: ArmyOrder,
): { winner: Side | 'draw'; rounds: number } {
  let state = createBattle(seed, yav, nav)
  const rng = seededRng(seed ^ 0x9e3779b9)

  for (let i = 0; i < 4000 && !state.outcome && state.round < ROUNDS_CAP; i++) {
    const action = chooseAction(state)
    if (!action) break
    const result = applyAction(state, action, rng)
    if (!result.ok) break
    state = result.value
  }
  return { winner: state.outcome?.winner ?? 'draw', rounds: state.round }
}

const battles = Number(process.argv[2] ?? 40)
const shapes = Object.keys(SHAPES)
const yavHalls = factionsOf('yav').map((f) => f.id)
const navHalls = factionsOf('nav').map((f) => f.id)

console.log(`\nAll halls, ${battles} battles per cell, ${GOLD_BUDGET} gold a side\n`)

/** Win rate for one composition across everything it met. */
const tally: Record<string, { won: number; played: number }> = {}
const note = (key: string, won: boolean) => {
  tally[key] ??= { won: 0, played: 0 }
  tally[key]!.played++
  if (won) tally[key]!.won++
}

let games = 0
let rounds = 0
let draws = 0

// ── Hall against hall, averaged over every shape pairing ────────────────────
console.log('Hall matchups (row = Yav hall, cell = its win rate)\n')
console.log(`${''.padEnd(16)}${navHalls.map((n) => n.padStart(16)).join('')}`)

for (const yav of yavHalls) {
  const row: string[] = []
  for (const nav of navHalls) {
    let won = 0
    let played = 0
    for (const ys of shapes) {
      for (const ns of shapes) {
        for (let n = 0; n < battles; n++) {
          const seed = 1000 + n * 7919
          const { winner, rounds: r } = play(
            seed,
            { side: 'yav', factionId: yav, counts: build(yav, SHAPES[ys]!) },
            { side: 'nav', factionId: nav, counts: build(nav, SHAPES[ns]!) },
          )
          if (winner === 'yav') won++
          if (winner === 'draw') draws++
          note(`${yav}:${ys}`, winner === 'yav')
          note(`${nav}:${ns}`, winner === 'nav')
          played++
          games++
          rounds += r
        }
      }
    }
    row.push(`${Math.round((won / played) * 100)}%`.padStart(16))
  }
  console.log(`${yav.padEnd(16)}${row.join('')}`)
}

// ── Per-hall and per-shape rollups ──────────────────────────────────────────
const rate = (key: string) => {
  const t = tally[key]!
  return t.won / t.played
}

const byHall: Record<string, { won: number; played: number }> = {}
for (const [key, t] of Object.entries(tally)) {
  const hall = key.split(':')[0]!
  byHall[hall] ??= { won: 0, played: 0 }
  byHall[hall]!.won += t.won
  byHall[hall]!.played += t.played
}

console.log('\nBy hall:\n')
for (const [hall, t] of Object.entries(byHall).sort((a, b) => b[1].won / b[1].played - a[1].won / a[1].played)) {
  const pct = Math.round((t.won / t.played) * 100)
  console.log(`  ${hall.padEnd(12)} ${String(pct).padStart(3)}%  ${'#'.repeat(Math.round(pct / 3))}`)
}

console.log('\nWorst and best compositions:\n')
const sorted = Object.keys(tally).sort((a, b) => rate(b) - rate(a))
for (const key of [...sorted.slice(0, 4), '...', ...sorted.slice(-4)]) {
  if (key === '...') {
    console.log('  ...')
    continue
  }
  console.log(`  ${key.padEnd(22)} ${String(Math.round(rate(key) * 100)).padStart(3)}%`)
}

console.log(
  `\n${games} battles, ${(rounds / games).toFixed(1)} rounds on average, ${draws} draws\n`,
)
