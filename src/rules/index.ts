export { applyAction, blockedHexes } from './apply'
export {
  IMPLEMENTED as IMPLEMENTED_ABILITIES,
  effectiveSpeed,
  hasAbility,
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
