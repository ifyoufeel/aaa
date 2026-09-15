export { applyAction, blockedHexes } from './apply'
export { chooseAction } from './ai'
export {
  IMPLEMENTED as IMPLEMENTED_ABILITIES,
  abilityIsLive,
  effectiveSpeed,
  factionReadiness,
  hasAbility,
  retaliationsForAbility,
  isFlier,
} from './abilities'
export { attackModifier, computeDamage, damageRange, rollBaseDamage } from './damage'
export { legalActions, meleeTargets, movementRange, shootTargets, stackAt, validate } from './legal'
export { activeStack, pendingQueue, roundOrder } from './queue'
export { createBattle } from './setup'
export { applyDamage, isAlive, maxPoolHp, poolHp, unitOf } from './stack'
export type {
  Action,
  ActionType,
  ArmyOrder,
  BattleState,
  EffectKind,
  LogEntry,
  Outcome,
  Side,
  Stack,
  StatusEffect,
} from './types'
