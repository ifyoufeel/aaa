/**
 * Composing an army inside the budget and the recruitment caps.
 *
 * Shared by the balance harness, the tests and (eventually) a "fill for me"
 * button on the recruitment screen. Having one implementation means a price
 * change cannot silently invalidate a test fixture or a simulated matchup — it
 * just produces a different, still-legal army.
 */

import { GOLD_BUDGET } from './balance'
import { getFaction } from './factions'
import type { FactionId } from './types'

/**
 * Spends `budget` across the five tiers in proportion to `weights`, then fills
 * the remainder with whatever still fits under both the purse and its cap.
 *
 * Weights are relative: `[1, 0, 0, 0, 0]` leans entirely on tier one.
 */
export function buildArmy(
  factionId: FactionId,
  weights: readonly number[],
  budget = GOLD_BUDGET,
): Record<string, number> {
  const units = getFaction(factionId).units
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const counts: Record<string, number> = {}
  let spent = 0

  units.forEach((unit, i) => {
    const share = ((weights[i] ?? 0) / total) * budget
    const n = Math.min(unit.maxCount, Math.floor(share / unit.cost))
    if (n > 0) {
      counts[unit.id] = n
      spent += n * unit.cost
    }
  })

  // Top up with the cheapest thing that still fits, cheapest first, until
  // nothing more can be added. Caps make this terminate.
  let progress = true
  while (progress) {
    progress = false
    for (const unit of [...units].sort((a, b) => a.cost - b.cost)) {
      const held = counts[unit.id] ?? 0
      if (held < unit.maxCount && spent + unit.cost <= budget) {
        counts[unit.id] = held + 1
        spent += unit.cost
        progress = true
      }
    }
  }
  return counts
}

/** What an army costs. */
export function armyCost(factionId: FactionId, counts: Readonly<Record<string, number>>): number {
  return getFaction(factionId).units.reduce((n, u) => n + u.cost * (counts[u.id] ?? 0), 0)
}

/** A sensible all-round army, used as the default in tests and simulations. */
export const BALANCED_WEIGHTS = [0.3, 0.25, 0.2, 0.15, 0.1] as const
