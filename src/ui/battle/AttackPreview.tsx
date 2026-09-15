import { hexDistance } from '../../hex'
import { damageRange, hasAbility, poolHp, unitOf, type Stack } from '../../rules'

/**
 * What a strike will cost, before you commit to it.
 *
 * HoMM3's readability came from telling you the consequences in advance, and
 * this panel is the whole reason `damageRange` exists as a separate, RNG-free
 * function: a preview is drawn on hover, on one client only, so it must never
 * consume a random draw. If it did, the two clients' generators would drift
 * apart from nothing more than moving a mouse.
 */
export function AttackPreview({
  attacker,
  defender,
  kind,
  moved,
}: {
  attacker: Stack
  defender: Stack
  kind: 'melee' | 'shoot'
  moved: number
}) {
  const attackerUnit = unitOf(attacker)
  const defenderUnit = unitOf(defender)

  const multipliers: number[] = []
  if (kind === 'melee' && moved > 0 && hasAbility(attacker, 'charge')) {
    multipliers.push(1 + 0.25 * moved)
  }
  if (kind === 'shoot' && hasAbility(defender, 'shield-wall') && !hasAbility(attacker, 'siren-song')) {
    multipliers.push(0.5)
  }

  const { min, max } = damageRange({
    count: attacker.count,
    damage: attackerUnit.stats.damage,
    attack: attackerUnit.stats.attack,
    defense: defenderUnit.stats.defense + (defender.defending ? Math.round(defenderUnit.stats.defense * 0.3) : 0),
    multipliers,
  })

  const hp = defenderUnit.stats.hp
  const pool = poolHp(defender)
  const kills = (damage: number) =>
    Math.min(defender.count, Math.floor(Math.min(damage, pool) / hp))

  const retaliates =
    kind === 'melee' && defender.retaliations > 0 && !hasAbility(attacker, 'shriek')

  const back = retaliates
    ? damageRange({
        count: Math.max(1, defender.count - kills(min)),
        damage: defenderUnit.stats.damage,
        attack: defenderUnit.stats.attack,
        defense: attackerUnit.stats.defense,
      })
    : null

  return (
    <aside className="preview" aria-live="polite">
      <p className="preview__head">
        {kind === 'shoot' ? 'If you shoot' : moved > 0 ? 'If you charge' : 'If you strike'}
      </p>
      <p className="display tnum preview__damage">
        {min}&ndash;{max}
      </p>
      <p className="preview__sub">
        damage
        {kind === 'melee' && moved > 0
          ? ` · ${moved} ${moved === 1 ? 'hex' : 'hexes'} charged`
          : ''}
        {kind === 'shoot' ? ` · ${hexDistance(attacker.hex, defender.hex)} hexes` : ''}
      </p>
      <dl className="preview__rows">
        <div>
          <dt>Kills</dt>
          <dd className="tnum">
            {kills(min)}&ndash;{kills(max)} of {defender.count}
          </dd>
        </div>
        <div>
          <dt>Retaliation</dt>
          <dd className={retaliates ? 'preview__warn' : ''}>{retaliates ? 'yes' : 'none'}</dd>
        </div>
        {back && (
          <div>
            <dt>You take back</dt>
            <dd className="tnum">
              {back.min}&ndash;{back.max}
            </dd>
          </div>
        )}
      </dl>
    </aside>
  )
}
