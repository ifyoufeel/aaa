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
import type { FactionId } from '../src/content/types'
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

const battles = Number(process.argv[2] ?? 60)
const yavFaction: FactionId = 'kitezh'
const navFaction: FactionId = 'topyla'
const shapes = Object.keys(SHAPES)

console.log(
  `\n${yavFaction} vs ${navFaction} — ${battles} battles per matchup, ${GOLD_BUDGET} gold a side\n`,
)

const wins: Record<string, { won: number; played: number }> = {}
const note = (shape: string, won: boolean) => {
  wins[shape] ??= { won: 0, played: 0 }
  wins[shape]!.played++
  if (won) wins[shape]!.won++
}

const header = ['', ...shapes.map((s) => s.padStart(9))].join(' ')
console.log(`${'yav \\ nav'.padEnd(10)}${header}`)

let totalRounds = 0
let games = 0

for (const yavShape of shapes) {
  const row: string[] = []
  for (const navShape of shapes) {
    let yavWins = 0
    for (let n = 0; n < battles; n++) {
      const seed = 1000 + n * 7919
      const { winner, rounds } = play(
        seed,
        { side: 'yav', factionId: yavFaction, counts: build(yavFaction, SHAPES[yavShape]!) },
        { side: 'nav', factionId: navFaction, counts: build(navFaction, SHAPES[navShape]!) },
      )
      if (winner === 'yav') yavWins++
      note(`yav:${yavShape}`, winner === 'yav')
      note(`nav:${navShape}`, winner === 'nav')
      totalRounds += rounds
      games++
    }
    row.push(`${Math.round((yavWins / battles) * 100)}%`.padStart(9))
  }
  console.log(`${yavShape.padEnd(10)}${['', ...row].join(' ')}`)
}

console.log('\nWin rate by composition, across every opponent:\n')
for (const [shape, { won, played }] of Object.entries(wins).sort(
  (a, b) => b[1].won / b[1].played - a[1].won / a[1].played,
)) {
  const rate = Math.round((won / played) * 100)
  const bar = '#'.repeat(Math.round(rate / 4))
  console.log(`  ${shape.padEnd(14)} ${String(rate).padStart(3)}%  ${bar}`)
}
console.log(`\n${games} battles, ${(totalRounds / games).toFixed(1)} rounds on average\n`)
