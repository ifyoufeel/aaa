/**
 * The action reducer.
 *
 * `applyAction` is pure and total: same state plus same action plus same
 * random draws always produces the same next state. It reads no clock, calls
 * no `Math.random`, and mutates nothing it was given. The two clients' whole
 * agreement rests on that, so any temptation to reach outside these inputs
 * belongs somewhere else.
 */

import { ROUND_LIMIT } from '../content/balance'
import type { Rng } from '../engine/rng'
import type { Result } from '../engine/result'
import { err, ok } from '../engine/result'
import { hexDistance, hexKey, type Hex } from '../hex'
import { approachHex, findPath } from '../hex/board'
import {
  canRetaliate,
  effectiveAttack,
  effectiveDefense,
  effectiveSpeed,
  hasAbility,
  incomingMultipliers,
  isFlier,
  outgoingMultipliers,
  type AttackContext,
  type AttackKind,
} from './abilities'
import { computeDamage } from './damage'
import { pendingQueue } from './queue'
import { applyDamage, isAlive, unitOf } from './stack'
import type { Action, BattleState, LogEntry, Stack } from './types'

// ── helpers ──────────────────────────────────────────────────────────────────

const byId = (state: BattleState, id: string): Stack | undefined =>
  state.stacks.find((s) => s.id === id)

function replace(state: BattleState, ...updated: Stack[]): BattleState {
  const patch = new Map(updated.map((s) => [s.id, s]))
  return { ...state, stacks: state.stacks.map((s) => patch.get(s.id) ?? s) }
}

/** Hexes a stack may not enter: every other living stack. */
export function blockedHexes(state: BattleState, mover: Stack): ReadonlySet<string> {
  return new Set(
    state.stacks.filter((s) => s.id !== mover.id && isAlive(s)).map((s) => hexKey(s.hex)),
  )
}

function log(state: BattleState, entry: Omit<LogEntry, 'round'>): BattleState {
  return { ...state, log: [...state.log, { round: state.round, ...entry }] }
}

// ── striking ─────────────────────────────────────────────────────────────────

interface StrikeResult {
  readonly state: BattleState
  readonly damage: number
  readonly killed: number
}

/**
 * One stack hits another. Handles nothing about turns or legality — just the
 * arithmetic and its consequences.
 */
function strike(
  state: BattleState,
  attackerId: string,
  defenderId: string,
  kind: AttackKind,
  moved: number,
  rng: Rng,
): StrikeResult {
  const attacker = byId(state, attackerId)!
  const defender = byId(state, defenderId)!
  const ctx: AttackContext = { state, attacker, defender, kind, moved }
  const unit = unitOf(attacker)

  const damage = computeDamage({
    rng,
    count: attacker.count,
    damage: unit.stats.damage,
    attack: effectiveAttack(ctx),
    defense: effectiveDefense(ctx),
    multipliers: [...outgoingMultipliers(ctx), ...incomingMultipliers(ctx)],
  })

  const outcome = applyDamage(defender, damage)
  return {
    state: replace(state, outcome.stack),
    damage: outcome.dealt,
    killed: outcome.killed,
  }
}

function strikeText(
  attacker: Stack,
  defender: Stack,
  damage: number,
  killed: number,
  kind: AttackKind,
): string {
  const verb = kind === 'shoot' ? 'looses at' : kind === 'retaliate' ? 'answers' : 'strikes'
  const a = unitOf(attacker).name
  const d = unitOf(defender).name
  const toll = killed > 0 ? `, ${killed} fall` : ''
  return `${a} ${verb} ${d} for ${damage}${toll}.`
}

// ── turn plumbing ────────────────────────────────────────────────────────────

/** Ticks one activation off every effect on a stack, dropping the lapsed ones. */
function tickEffects(stack: Stack): Stack {
  if (stack.effects.length === 0) return stack
  const effects = stack.effects
    .map((e) => ({ ...e, rounds: e.rounds - 1 }))
    .filter((e) => e.rounds > 0)
  return { ...stack, effects }
}

/**
 * Closes the acting stack's turn and hands over to the next, starting a new
 * round when everyone has gone.
 */
function endTurn(state: BattleState): BattleState {
  const active = byId(state, state.activeId!)!
  let next = replace(state, {
    ...tickEffects(active),
    acted: true,
    movedThisTurn: 0,
  })

  const decided = checkOutcome(next)
  if (decided) return decided

  let queue = pendingQueue(next)
  if (queue.length === 0) {
    // New round: everything stands up again, retaliations refill, and any
    // stack that spent its turn defending stops.
    if (next.round >= ROUND_LIMIT) {
      return log({ ...next, activeId: null, outcome: { winner: 'draw' } }, {
        kind: 'end',
        actorId: '',
        text: `The field is left to the crows after ${ROUND_LIMIT} rounds.`,
      })
    }
    next = {
      ...next,
      round: next.round + 1,
      stacks: next.stacks.map((s) => ({
        ...s,
        acted: false,
        waited: false,
        defending: false,
        retaliations: hasAbility(s, 'turns-to-face') ? Number.MAX_SAFE_INTEGER : 1,
      })),
    }
    queue = pendingQueue(next)
  }

  return { ...next, activeId: queue[0]?.id ?? null }
}

function checkOutcome(state: BattleState): BattleState | null {
  const yavAlive = state.stacks.some((s) => s.side === 'yav' && isAlive(s))
  const navAlive = state.stacks.some((s) => s.side === 'nav' && isAlive(s))
  if (yavAlive && navAlive) return null

  const winner = yavAlive ? 'yav' : navAlive ? 'nav' : 'draw'
  const text =
    winner === 'draw'
      ? 'Both hosts are gone. Nobody holds the field.'
      : `${winner === 'yav' ? 'Явь' : 'Навь'} holds the field.`
  return log({ ...state, activeId: null, outcome: { winner } }, {
    kind: 'end',
    actorId: '',
    text,
  })
}

// ── the reducer ──────────────────────────────────────────────────────────────

export function applyAction(state: BattleState, action: Action, rng: Rng): Result<BattleState> {
  if (state.outcome) return err('the battle is over')
  const active = state.activeId ? byId(state, state.activeId) : undefined
  if (!active) return err('no stack is active')
  if (!isAlive(active)) return err('the active stack is destroyed')

  switch (action.type) {
    case 'wait':
      return applyWait(state, active)
    case 'defend':
      return applyDefend(state, active)
    case 'move':
      return applyMove(state, active, action.to)
    case 'attack':
      return applyAttack(state, active, action.target, action.from, rng)
    case 'shoot':
      return applyShoot(state, active, action.target, rng)
  }
}

function applyWait(state: BattleState, active: Stack): Result<BattleState> {
  if (active.waited) return err('this stack has already waited this round')
  // Waiting is not taking a turn: the stack goes to the back of the queue and
  // will be asked again, so `acted` stays false.
  const next = replace(state, { ...active, waited: true })
  const queue = pendingQueue(next)
  return ok(
    log({ ...next, activeId: queue[0]?.id ?? null }, {
      kind: 'wait',
      actorId: active.id,
      text: `${unitOf(active).name} holds back.`,
    }),
  )
}

function applyDefend(state: BattleState, active: Stack): Result<BattleState> {
  const next = replace(state, { ...active, defending: true })
  return ok(
    endTurn(
      log(next, {
        kind: 'defend',
        actorId: active.id,
        text: `${unitOf(active).name} sets its shields.`,
      }),
    ),
  )
}

function applyMove(state: BattleState, active: Stack, to: Hex): Result<BattleState> {
  const speed = effectiveSpeed(state, active)
  const path = findPath(active.hex, to, speed, blockedHexes(state, active), isFlier(active))
  if (path === null) return err('that hex is out of reach')
  if (path.length === 0) return err('already standing there')

  const moved = replace(state, { ...active, hex: to, movedThisTurn: path.length })
  return ok(
    endTurn(
      log(moved, {
        kind: 'move',
        actorId: active.id,
        text: `${unitOf(active).name} advances ${path.length} ${path.length === 1 ? 'hex' : 'hexes'}.`,
      }),
    ),
  )
}

function applyAttack(
  state: BattleState,
  active: Stack,
  targetId: string,
  from: Hex | undefined,
  rng: Rng,
): Result<BattleState> {
  const target = byId(state, targetId)
  if (!target) return err('no such stack')
  if (target.side === active.side) return err('that is one of yours')
  if (!isAlive(target)) return err('that stack is already destroyed')

  const speed = effectiveSpeed(state, active)
  const blocked = blockedHexes(state, active)
  const flying = isFlier(active)

  const standAt =
    from ?? approachHex(active.hex, target.hex, speed, blocked, flying)
  if (!standAt) return err('cannot reach that stack this turn')
  if (hexDistance(standAt, target.hex) !== 1) return err('that hex is not beside the target')

  const path = findPath(active.hex, standAt, speed, blocked, flying)
  if (path === null) return err('cannot reach that hex')

  const moved = path.length
  let next = replace(state, { ...active, hex: standAt, movedThisTurn: moved })

  // The blow.
  const hit = strike(next, active.id, targetId, 'melee', moved, rng)
  next = log(hit.state, {
    kind: 'attack',
    actorId: active.id,
    targetId,
    damage: hit.damage,
    killed: hit.killed,
    text: strikeText(byId(next, active.id)!, target, hit.damage, hit.killed, 'melee'),
  })

  // And the answer, if the target is still standing and still able.
  const survivor = byId(next, targetId)!
  const attackerNow = byId(next, active.id)!
  const retaliationCtx: AttackContext = {
    state: next,
    attacker: attackerNow,
    defender: survivor,
    kind: 'melee',
    moved,
  }
  if (canRetaliate(retaliationCtx)) {
    next = replace(next, { ...survivor, retaliations: survivor.retaliations - 1 })
    const back = strike(next, targetId, active.id, 'retaliate', 0, rng)
    next = log(back.state, {
      kind: 'retaliate',
      actorId: targetId,
      targetId: active.id,
      damage: back.damage,
      killed: back.killed,
      text: strikeText(survivor, attackerNow, back.damage, back.killed, 'retaliate'),
    })
  }

  next = applyPostAttack(next, active.id, targetId)
  return ok(endTurn(next))
}

function applyShoot(
  state: BattleState,
  active: Stack,
  targetId: string,
  rng: Rng,
): Result<BattleState> {
  const unit = unitOf(active)
  if (!unit.ranged) return err('this stack does not shoot')
  if (active.ammo <= 0) return err('out of shots')

  const target = byId(state, targetId)
  if (!target) return err('no such stack')
  if (target.side === active.side) return err('that is one of yours')
  if (!isAlive(target)) return err('that stack is already destroyed')

  let next = replace(state, { ...active, ammo: active.ammo - 1 })
  const hit = strike(next, active.id, targetId, 'shoot', 0, rng)
  next = log(hit.state, {
    kind: 'shoot',
    actorId: active.id,
    targetId,
    damage: hit.damage,
    killed: hit.killed,
    text: strikeText(active, target, hit.damage, hit.killed, 'shoot'),
  })

  // A shot draws no retaliation.
  return ok(endTurn(next))
}

/** Ability effects that resolve after a melee exchange settles. */
function applyPostAttack(state: BattleState, attackerId: string, targetId: string): BattleState {
  const attacker = byId(state, attackerId)!
  const target = byId(state, targetId)!
  let next = state

  // Drag Under: the two change places.
  //
  // "Pull the target one hex closer" reads well but cannot ever fire -- a
  // melee target is adjacent by definition, so there is no closer hex to pull
  // it to. Trading places always works, and does something far more
  // interesting: it rips a shooter out of its own line and leaves the
  // Vodyanoy standing in it.
  if (hasAbility(attacker, 'drag-under') && isAlive(target)) {
    const a = byId(next, attackerId)!
    const t = byId(next, targetId)!
    next = replace(next, { ...a, hex: t.hex }, { ...t, hex: a.hex })
    next = log(next, {
      kind: 'attack',
      actorId: attackerId,
      targetId,
      text: `${unitOf(t).name} is dragged under, and the water takes its place.`,
    })
  }

  // Beckon: whoever ended their move next to a mavka is slower next round.
  if (hasAbility(attacker, 'beckon') && isAlive(target)) {
    const slowed = byId(next, targetId)!
    if (!slowed.effects.some((e) => e.kind === 'slowed')) {
      next = replace(next, { ...slowed, effects: [...slowed.effects, { kind: 'slowed', rounds: 1 }] })
    }
  }

  return next
}
