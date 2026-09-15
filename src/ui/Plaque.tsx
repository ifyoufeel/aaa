import { FACTION_ART, UNIT_ART } from './art'
import type { FactionId } from '../content/types'

/**
 * A shield plaque carrying a unit silhouette or a faction crest.
 *
 * Twenty of the thirty units have no silhouette drawn yet, so they fall back to
 * their faction's crest rather than to an empty plaque — a recognisable mark in
 * the right ink beats a hole, and it is obvious at a glance which still need
 * artwork.
 */
export function Plaque({
  unitId,
  factionId,
  ink,
  width = 74,
  height = 88,
  active = false,
  label,
}: {
  unitId?: string
  factionId: FactionId
  ink: string
  width?: number
  height?: number
  active?: boolean
  label?: string
}) {
  const art = (unitId ? UNIT_ART[unitId] : undefined) ?? FACTION_ART[factionId]
  const artSize = Math.min(width * 0.62, height * 0.58)

  return (
    <div
      className="plaque"
      style={{
        width,
        height,
        flex: '0 0 auto',
        border: active ? '2px solid var(--ember-lit)' : `1px solid ${ink}`,
      }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg
        width={artSize}
        height={artSize * (52 / 46)}
        viewBox="0 0 46 52"
        fill={ink}
        color={ink}
        style={{ marginBottom: height * 0.1 }}
        // The markup is our own, generated from design/*.py at build time.
        dangerouslySetInnerHTML={{ __html: art }}
      />
    </div>
  )
}
