import type { FactionDef, FactionId, Realm, UnitDef } from '../types'
import { borovina } from './borovina'
import { gromoboy } from './gromoboy'
import { kitezh } from './kitezh'
import { kostyanoy } from './kostyanoy'
import { topyla } from './topyla'
import { yagaya } from './yagaya'

/** Every castle, in the order they are offered. */
export const FACTIONS: readonly FactionDef[] = [
  kitezh,
  borovina,
  gromoboy,
  kostyanoy,
  topyla,
  yagaya,
]

const BY_ID = new Map<FactionId, FactionDef>(FACTIONS.map((f) => [f.id, f]))

export function getFaction(id: FactionId): FactionDef {
  const faction = BY_ID.get(id)
  if (!faction) throw new Error(`unknown faction: ${id}`)
  return faction
}

/** The three halls a given side chooses between. */
export function factionsOf(realm: Realm): readonly FactionDef[] {
  return FACTIONS.filter((f) => f.realm === realm)
}

export function getUnit(factionId: FactionId, unitId: string): UnitDef {
  const unit = getFaction(factionId).units.find((u) => u.id === unitId)
  if (!unit) throw new Error(`unknown unit: ${factionId}/${unitId}`)
  return unit
}

export { borovina, gromoboy, kitezh, kostyanoy, topyla, yagaya }
