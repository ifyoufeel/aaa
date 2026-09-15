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
import { hexDistance, hexKey, isAdjacent, type Hex } from '../hex'
import { approachHex, findPath } from '../hex/board'
import {
  canRetaliate,
  damageIgnored,
  effectiveAttack,
  effectiveDefense,
  effectiveSpeed,
  hasAbility,
  hasEffect,
  incomingMultipliers,
  isFlier,
  outgoingMultipliers,
  retaliationsPerRound,
  type AttackContext,
  type AttackKind,
} from './abilities'
import { computeDamage, type RollMode } from './damage'
import { pendingQueue } from './queue'
import { applyDamage, healStack, isAlive, unitOf } from './stack'
import type { Action, BattleState, EffectKind, LogEntry, Stack } from './types'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Most attack a Gorge stack can accumulate in one battle. */
const GORGE_CAP = 12

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

  // Curse forces the floor; Misfortune rolls twice and keeps the better.
  const roll: RollMode = hasEffect(attacker, 'cursed')
    ? 'min'
    : hasAbility(attacker, 'misfortune')
      ? 'best'
      : hasAbility(defender, 'misfortune')
        ? 'worst'
        : 'normal'

  const damage = computeDamage({
    rng,
    count: attacker.count,
    damage: unit.stats.damage,
    attack: effectiveAttack(ctx),
    defense: effectiveDefense(ctx),
    multipliers: [...outgoingMultipliers(ctx), ...incomingMultipliers(ctx)],
    ignored: damageIgnored(defender),
    roll,
  })

  const outcome = applyDamage(defender, damage)
  let after = replace(state, outcome.stack)

  // Deathless: Koshchei's court keeps its death somewhere else, once.
  if (outcome.destroyed && hasAbility(defender, 'deathless') && !defender.revived) {
    const third = Math.max(1, Math.ceil(defender.count / 3))
    const unitHp = unitOf(defender).stats.hp
    after = replace(after, {
      ...byId(after, defender.id)!,
      count: third,
      topHp: unitHp,
      revived: true,
    })
    after = log(after, {
      kind: 'attack',
      actorId: defender.id,
      text: `${unitOf(defender).name} will not stay dead. ${third} rise again.`,
    })
  }

  // Spore Burst: what dies goes off in the faces of whoever stands near it.
  if (outcome.killed > 0 && hasAbility(defender, 'spore-burst')) {
    for (const bystander of after.stacks) {
      if (bystander.side === defender.side || !isAlive(bystander)) continue
      if (!isAdjacent(bystander.hex, defender.hex)) continue
      const burst = applyDamage(bystander, 4 * outcome.killed)
      after = replace(after, burst.stack)
      if (burst.dealt > 0) {
        after = log(after, {
          kind: 'attack',
          actorId: defender.id,
          targetId: bystander.id,
          damage: burst.dealt,
          killed: burst.killed,
          text: `Spores burst over ${unitOf(bystander).name} for ${burst.dealt}.`,
        })
      }
    }
  }

  return { state: after, damage: outcome.dealt, killed: outcome.killed }
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

/** Adds an effect, replacing any of the same kind rather than stacking it. */
function withEffect(stack: Stack, kind: EffectKind, rounds: number, amount?: number): Stack {
  return {
    ...stack,
    effects: [
      ...stack.effects.filter((e) => e.kind !== kind),
      amount === undefined ? { kind, rounds } : { kind, rounds, amount },
    ],
  }
}

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
      stacks: next.stacks.map((s) => {
        const stood = {
          ...s,
          acted: false,
          waited: false,
          defending: false,
          retaliations: retaliationsPerRound(s),
        }
        if (!isAlive(stood)) return stood
        // Reassemble: bones find each other again overnight.
        if (hasAbility(stood, 'reassemble')) {
          return healStack(stood, Math.ceil(stood.count / 2), stood.count)
        }
        return stood
      }),
    }

    // Burning is resolved after everyone has stood up, so a stack that burns
    // to nothing does not linger in the new round's queue.
    for (const s of next.stacks) {
      if (!isAlive(s) || !hasEffect(s, 'burning')) continue
      const burn = s.effects.find((e) => e.kind === 'burning')!
      const outcome = applyDamage(s, (burn.amount ?? 0) * s.count)
      next = replace(next, outcome.stack)
      if (outcome.dealt > 0) {
        next = log(next, {
          kind: 'attack',
          actorId: s.id,
          damage: outcome.dealt,
          killed: outcome.killed,
          text: `${unitOf(s).name} burns for ${outcome.dealt}.`,
        })
      }
    }

    const settled = checkOutcome(next)
    if (settled) return settled

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

  // Count the blow before it lands: Mortar strikes twice on every third.
  const swung = byId(next, active.id)!
  const nth = swung.attacksMade + 1
  next = replace(next, { ...swung, attacksMade: nth })

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

  // Mortar and Pestle: the pestle comes down again on every third swing.
  if (hasAbility(active, 'mortar') && nth % 3 === 0 && isAlive(byId(next, targetId)!)) {
    const again = strike(next, active.id, targetId, 'melee', 0, rng)
    next = log(again.state, {
      kind: 'attack',
      actorId: active.id,
      targetId,
      damage: again.damage,
      killed: again.killed,
      text: `The pestle comes down again for ${again.damage}.`,
    })
  }

  // Thunderbolt: the opening stroke spreads to everything around the target.
  if (hasAbility(active, 'thunderbolt') && nth === 1) {
    const struck = byId(next, targetId)!
    for (const bystander of next.stacks) {
      if (bystander.side === active.side || bystander.id === targetId) continue
      if (!isAlive(bystander) || !isAdjacent(bystander.hex, struck.hex)) continue
      const arc = strike(next, active.id, bystander.id, 'shoot', 0, rng)
      next = log(arc.state, {
        kind: 'attack',
        actorId: active.id,
        targetId: bystander.id,
        damage: arc.damage,
        killed: arc.killed,
        text: `Thunder rolls over ${unitOf(bystander).name} for ${arc.damage}.`,
      })
    }
  }

  // Chain: the bolt jumps to something else standing by the target.
  if (hasAbility(active, 'chain')) {
    const struck = byId(next, targetId)!
    const neighbour = next.stacks.find(
      (s) =>
        s.side !== active.side &&
        s.id !== targetId &&
        isAlive(s) &&
        isAdjacent(s.hex, struck.hex),
    )
    if (neighbour) {
      const arc = strike(next, active.id, neighbour.id, 'shoot', 0, rng)
      const halved = Math.floor(arc.damage / 2)
      // strike() already applied the full amount; give half of it back.
      const mended = healStack(byId(arc.state, neighbour.id)!, arc.damage - halved, neighbour.count)
      next = log(replace(arc.state, mended), {
        kind: 'attack',
        actorId: active.id,
        targetId: neighbour.id,
        damage: halved,
        text: `The bolt jumps to ${unitOf(neighbour).name} for ${halved}.`,
      })
    }
  }

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

  next = applyPostAttack(next, active.id, targetId, hit.killed)

  // Skitter: a kill buys another action, but only one a turn -- a chain of
  // kills granting endless activations would let one stack clear the board.
  //
  // Not if that kill won the battle, though. This path returns without going
  // through endTurn, which is where victory is noticed: a stack that killed the
  // last enemy and then skittered left the game with no outcome and no legal
  // move, frozen on its own turn.
  const skittering = byId(next, active.id)!
  const enemiesLeft = next.stacks.some((s) => s.side !== active.side && isAlive(s))
  if (
    enemiesLeft &&
    hasAbility(skittering, 'skitter') &&
    hit.killed > 0 &&
    isAlive(skittering) &&
    !hasEffect(skittering, 'skittered')
  ) {
    next = replace(next, {
      ...skittering,
      movedThisTurn: 0,
      effects: [...skittering.effects, { kind: 'skittered' as const, rounds: 1 }],
    })
    return ok(
      log(next, {
        kind: 'move',
        actorId: active.id,
        text: `${unitOf(skittering).name} scatters and comes again.`,
      }),
    )
  }

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

  // A shot draws no retaliation, but its rider effects still land.
  next = applyPostAttack(next, active.id, targetId, hit.killed)
  return ok(endTurn(next))
}

/**
 * Everything that fires once a blow has landed: debuffs the attacker hangs on
 * its target, rewards it takes for a kill, and repositioning.
 *
 * Called for shots as well as melee, since several of these are not melee-only.
 */
function applyPostAttack(
  state: BattleState,
  attackerId: string,
  targetId: string,
  killed: number,
): BattleState {
  const attacker = byId(state, attackerId)!
  const target = byId(state, targetId)!
  let next = state

  // Gorge: a ghoul that has eaten hits harder for the rest of the battle.
  //
  // Per killing BLOW, not per unit killed, and capped. Scaling with the body
  // count meant one swing through a chaff stack handed it +40 attack, which
  // pinned the damage modifier at its ceiling for the rest of the battle and
  // won Kostyanoy 91% of everything.
  if (hasAbility(attacker, 'gorge') && killed > 0) {
    const fed = byId(next, attackerId)!
    next = replace(next, { ...fed, attackBonus: Math.min(GORGE_CAP, fed.attackBonus + 2) })
  }

  // Drain: half of what it dealt comes back, but never past its starting size.
  if (hasAbility(attacker, 'drain')) {
    const drained = byId(next, attackerId)!
    const dealt = state.log.at(-1)?.damage ?? 0
    if (dealt > 0 && isAlive(drained)) {
      next = replace(next, healStack(drained, Math.floor(dealt / 3), drained.count))
    }
  }

  if (isAlive(byId(next, targetId)!)) {
    const hit = byId(next, targetId)!
    // Sunder: armour opened up until the target's next turn.
    if (hasAbility(attacker, 'sunder')) next = replace(next, withEffect(hit, 'sundered', 1, 3))
    // Keening: it loses its place in the order.
    if (hasAbility(attacker, 'keening')) {
      next = replace(next, withEffect(byId(next, targetId)!, 'deafened', 1, 2))
    }
    // Nightmare: it strikes softer for having seen what it saw.
    if (hasAbility(attacker, 'nightmare')) {
      next = replace(next, withEffect(byId(next, targetId)!, 'cowed', 1, 0.1))
    }
    // Curse: its next blow lands at the floor.
    if (hasAbility(attacker, 'curse')) {
      next = replace(next, withEffect(byId(next, targetId)!, 'cursed', 1))
    }
    // Lead Astray: the wood folds up in front of it.
    if (hasAbility(attacker, 'lead-astray')) {
      next = replace(next, withEffect(byId(next, targetId)!, 'lost', 1))
    }
    // Flight: the firebird leaves it alight.
    if (hasAbility(attacker, 'flight')) {
      next = replace(next, withEffect(byId(next, targetId)!, 'burning', 2, 3))
    }
  }

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
