/**
 * Every tunable number that is not a unit stat.
 *
 * Kept in one file on purpose: the balance pass should be a diff to this file
 * plus the faction rosters, never a hunt through rules code.
 */

/** Gold each side may spend during recruitment. Both sides get the same. */
export const GOLD_BUDGET = 1500

/** HoMM3's battlefield. Wider than it is tall, offset rows. */
export const BOARD = {
  cols: 15,
  rows: 11,
} as const

/**
 * HoMM3's damage modifier. Each point of attack above the target's defence
 * adds 5%, capped at triple; each point of defence above attack removes 2.5%,
 * floored at 30%.
 */
export const DAMAGE = {
  perAttackPoint: 0.05,
  attackCap: 3.0,
  perDefensePoint: 0.025,
  defenseFloor: 0.3,
} as const

/** Shooting into or out of a melee, and across the field. */
export const RANGED = {
  /** Multiplier when an enemy stands next to the shooter. */
  adjacentPenalty: 0.5,
  /** Beyond this many hexes a shot is halved, as in HoMM3's range penalty. */
  longRange: 10,
  longRangePenalty: 0.5,
} as const

/**
 * Charge, paid per hex crossed to reach the target.
 *
 * The cap matters more than the rate: with no ceiling a rider crossing the
 * whole board hit for +150%, which made cavalry the only composition worth
 * buying in simulation.
 */
export const CHARGE = {
  perHex: 0.15,
  cap: 1.75,
} as const

/** Defending trades your action for a defence bonus until your next turn. */
export const DEFEND_BONUS = 0.3

/** A battle that reaches this many rounds is called a draw rather than run forever. */
export const ROUND_LIMIT = 50
