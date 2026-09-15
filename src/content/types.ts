/**
 * Content types for factions and units.
 *
 * This is the canonical roster definition — `docs/factions.md` is generated
 * from it (`npm run docs:factions`), so the spec can never drift from what the
 * game actually loads.
 *
 * With no heroes and no spellbook, these numbers ARE the game's strategy layer.
 * Treat them as tuning surface, not as constants: everything here is expected
 * to move during the balance pass.
 */

/** Which half of the world a castle belongs to. The host picks from Yav', the guest from Nav'. */
export type Realm = 'yav' | 'nav'

export type FactionId =
  | 'kitezh'
  | 'borovina'
  | 'gromoboy'
  | 'kostyanoy'
  | 'topyla'
  | 'yagaya'

/**
 * Every ability in the game. Each is implemented by a handler in `src/rules/`;
 * this union is what keeps the content and the combat code honest about which
 * abilities actually exist.
 */
export type AbilityId =
  // Kitezh
  | 'pike-wall' | 'volley' | 'shield-wall' | 'charge' | 'ward'
  // Borovina
  | 'skitter' | 'pack' | 'spore-burst' | 'bark' | 'lead-astray'
  // Gromoboy
  | 'first-light' | 'keening' | 'chain' | 'flight' | 'thunderbolt'
  // Kostyanoy Dvor
  | 'reassemble' | 'gorge' | 'drain' | 'sunder' | 'deathless'
  // Topyla
  | 'beckon' | 'siren-song' | 'mire' | 'shriek' | 'drag-under'
  // Yagaya Pushcha
  | 'nightmare' | 'curse' | 'misfortune' | 'turns-to-face' | 'mortar'

export interface UnitStats {
  readonly attack: number
  readonly defense: number
  /** Per-unit damage roll, inclusive. */
  readonly damage: readonly [min: number, max: number]
  /** Health of a single unit; a stack's pool is this times its count. */
  readonly hp: number
  /** Hexes the stack may cross in one turn. */
  readonly speed: number
  /** Turn order within a round. Higher acts first; ties break by side, then by stack index. */
  readonly initiative: number
}

export interface RangedProfile {
  /** Volleys available for the whole battle. */
  readonly shots: number
  /** Damage multiplier when shooting while an enemy is adjacent. */
  readonly meleePenalty: number
}

export interface UnitAbility {
  readonly id: AbilityId
  readonly name: string
  /** One sentence, as shown on the recruitment card. */
  readonly text: string
}

export interface UnitDef {
  readonly id: string
  readonly name: string
  readonly cyrillic: string
  /** Lowercase role shown beside the name, e.g. "spearman". */
  readonly role: string
  readonly cost: number
  /**
   * Most of this unit one side may field, standing in for HoMM3's dwelling
   * growth.
   *
   * Without a cap the game is decided by arithmetic rather than by choice: a
   * stack of N deals N x damage AND has N x health, so its effectiveness goes
   * as N-squared and value per gold goes as (hp x damage) / cost-squared. On
   * that measure the cheapest unit in every hall beat the dearest by about
   * seven to one, and simulated armies of pure chaff won ~97% of battles. No
   * stat tuning fixes a quadratic; limiting numbers does.
   *
   * Caps are set so a full complement of any one unit costs roughly 40-48% of
   * the purse, which forces every army to be at least three units wide.
   */
  readonly maxCount: number
  readonly stats: UnitStats
  /** Present only on stacks that shoot. */
  readonly ranged?: RangedProfile
  readonly ability: UnitAbility
}

export interface FactionDef {
  readonly id: FactionId
  readonly name: string
  readonly cyrillic: string
  readonly realm: Realm
  /** Faction ink, used for silhouettes, tokens and card edges. */
  readonly accent: string
  readonly blurb: string
  /** Three words for the recruitment card: what this hall is and is not. */
  readonly tags: readonly [string, string, string]
  /** Exactly five, cheapest first. */
  readonly units: readonly [UnitDef, UnitDef, UnitDef, UnitDef, UnitDef]
}
