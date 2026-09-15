import type { FactionId } from '../../content/types'

/**
 * Faction ink, mirroring the custom properties in tokens.css so components can
 * reach a colour by faction id without hardcoding the hex.
 */
export const FACTION_VAR: Record<FactionId, string> = {
  kitezh: 'var(--kitezh)',
  borovina: 'var(--borovina)',
  gromoboy: 'var(--gromoboy)',
  kostyanoy: 'var(--kostyanoy)',
  topyla: 'var(--topyla)',
  yagaya: 'var(--yagaya)',
}
