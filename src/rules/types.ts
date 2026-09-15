import type { FactionId, Realm } from '../content/types'
import type { Hex } from '../hex'

/** Which side of the field. Matches the realm its castle belongs to. */
export type Side = Realm

/**
 * A temporary condition on a stack.
 *
 * Effects tick down at the start of the affected stack's own turn, so "until
 * its next turn" means exactly one of its activations, regardless of where in
 * the round it was applied.
 */
export type EffectKind =
  /** Beckon: a hex less of movement. */
  | 'slowed'
  /** Lead Astray: movement halved. */
  | 'lost'
  /** Sunder: defence reduced by `amount`. */
  | 'sundered'
  /** Keening: initiative reduced by `amount`. */
  | 'deafened'
  /** Nightmare: deals `amount` less of its damage, as a fraction. */
  | 'cowed'
  /** Curse: its next attack rolls minimum damage. */
  | 'cursed'
  /** Flight: losing `amount` health at the start of each of its turns. */
  | 'burning'
  /** Skitter: has already taken its bonus action this turn. */
  | 'skittered'

export interface StatusEffect {
  readonly kind: EffectKind
  /** Activations of this stack remaining before it lapses. */
  readonly rounds: number
  /** Size of the effect, where the kind takes one. */
  readonly amount?: number
}

/** A stack of one unit type, standing on one hex. */
export interface Stack {
  /** Unique within a battle, e.g. "yav:bogatyr". */
  readonly id: string
  readonly side: Side
  readonly factionId: FactionId
  readonly unitId: string
  /** Living units. Zero means destroyed. */
  readonly count: number
  /**
   * Health remaining on the top unit. Damage eats the stack from the top, so
   * only one unit is ever partly wounded.
   */
  readonly topHp: number
  readonly hex: Hex
  /** Volleys left. Meaningless for a stack that does not shoot. */
  readonly ammo: number
  /** Retaliations left this round. Refilled at the top of each round. */
  readonly retaliations: number
  /** Traded its action for defence; cleared when its next turn comes round. */
  readonly defending: boolean
  /** Chose to wait, so it acts after everything that did not. */
  readonly waited: boolean
  /** Has taken its turn this round. */
  readonly acted: boolean
  /** Hexes crossed on this turn, which Charge is paid on. */
  readonly movedThisTurn: number
  /** Temporary conditions, ticked at the start of this stack's turn. */
  readonly effects: readonly StatusEffect[]
  /**
   * Attack earned permanently during the battle, as Gorge does. Kept apart
   * from `effects` because it never lapses.
   */
  readonly attackBonus: number
  /** Attacks made, for abilities that fire on a count (Mortar and Pestle). */
  readonly attacksMade: number
  /** Set once a Deathless stack has spent its one return. */
  readonly revived: boolean
}

export type ActionType = 'move' | 'attack' | 'shoot' | 'wait' | 'defend'

export type Action =
  /** Walk to a hex. */
  | { readonly type: 'move'; readonly to: Hex }
  /**
   * Close and strike. `from` is the hex to attack out of; when omitted the
   * engine picks the cheapest legal approach, so a click on an enemy does the
   * obvious thing.
   */
  | { readonly type: 'attack'; readonly target: string; readonly from?: Hex }
  | { readonly type: 'shoot'; readonly target: string }
  /** Act later this round instead of now. */
  | { readonly type: 'wait' }
  /** Give up the action for defence until the next turn. */
  | { readonly type: 'defend' }

export interface LogEntry {
  readonly round: number
  /** Short machine-readable kind, for styling the combat log. */
  readonly kind: 'move' | 'attack' | 'shoot' | 'retaliate' | 'wait' | 'defend' | 'rout' | 'end'
  readonly actorId: string
  readonly targetId?: string
  readonly damage?: number
  readonly killed?: number
  /** One sentence, already written for display. */
  readonly text: string
}

export type Outcome = { readonly winner: Side } | { readonly winner: 'draw' }

export interface BattleState {
  readonly seed: number
  readonly round: number
  readonly stacks: readonly Stack[]
  /** Whose turn it is. Null once the battle is decided. */
  readonly activeId: string | null
  readonly log: readonly LogEntry[]
  readonly outcome: Outcome | null
}

/** What each side brought. Counts are what recruitment produced. */
export interface ArmyOrder {
  readonly side: Side
  readonly factionId: FactionId
  /** unitId -> how many were bought. Entries of zero are ignored. */
  readonly counts: Readonly<Record<string, number>>
}
