import { useMemo, useState } from 'react'
import { getFaction } from '../../content/factions'
import { hexDistance, hexKey, type Hex } from '../../hex'
import { approachHex, findPath } from '../../hex/board'
import {
  activeStack,
  blockedHexes,
  effectiveSpeed,
  isAlive,
  isFlier,
  meleeTargets,
  movementRange,
  shootTargets,
  type Action,
  type BattleState,
  type Side,
  type Stack,
} from '../../rules'
import { ActionBar } from '../battle/ActionBar'
import { AttackPreview } from '../battle/AttackPreview'
import { CombatLog } from '../battle/CombatLog'
import { HexGrid } from '../battle/HexGrid'
import { StackToken } from '../battle/StackToken'
import { TurnQueue } from '../battle/TurnQueue'
import { BOARD_PX } from '../battle/layout'

/**
 * The battlefield.
 *
 * All legality comes from `src/rules/legal.ts` — the same functions the engine
 * uses to accept or refuse an action. The UI never decides for itself whether a
 * move is allowed, so a hex it lights up is always one the reducer will accept.
 */
export function Battle({
  battle,
  side,
  onAct,
  peerConnected,
}: {
  battle: BattleState
  side: Side
  onAct: (action: Action) => void
  peerConnected: boolean
}) {
  const active = activeStack(battle)
  const yours = active?.side === side
  const [hovered, setHovered] = useState<Stack | null>(null)
  const [pending, setPending] = useState<Stack | null>(null)

  const reach = useMemo(() => movementRange(battle), [battle])
  const melee = useMemo(() => new Set(meleeTargets(battle)), [battle])
  const shots = useMemo(() => new Set(shootTargets(battle)), [battle])

  /** How a strike on this stack would be delivered, if at all. */
  function planFor(target: Stack): { kind: 'melee' | 'shoot'; moved: number } | null {
    if (!active || !yours) return null
    const adjacent = hexDistance(active.hex, target.hex) === 1
    if (shots.has(target.id) && !adjacent) return { kind: 'shoot', moved: 0 }
    if (!melee.has(target.id)) return null
    const stand = approachHex(
      active.hex,
      target.hex,
      effectiveSpeed(battle, active),
      blockedHexes(battle, active),
      isFlier(active),
    )
    if (!stand) return null
    const path = findPath(
      active.hex,
      stand,
      effectiveSpeed(battle, active),
      blockedHexes(battle, active),
      isFlier(active),
    )
    return { kind: 'melee', moved: path?.length ?? 0 }
  }

  const shown = pending ?? hovered
  const plan = shown ? planFor(shown) : null

  /** Hexes the charge would cross, drawn under the token. */
  const pathKeys = useMemo(() => {
    if (!active || !shown || plan?.kind !== 'melee') return new Set<string>()
    const stand = approachHex(
      active.hex,
      shown.hex,
      effectiveSpeed(battle, active),
      blockedHexes(battle, active),
      isFlier(active),
    )
    if (!stand) return new Set<string>()
    const path = findPath(
      active.hex,
      stand,
      effectiveSpeed(battle, active),
      blockedHexes(battle, active),
      isFlier(active),
    )
    return new Set((path ?? []).map(hexKey))
  }, [active, shown, plan, battle])

  function pickHex(hex: Hex) {
    if (!yours || !active) return
    setPending(null)
    if (reach.has(hexKey(hex))) onAct({ type: 'move', to: hex })
  }

  function pickStack(stack: Stack) {
    if (!yours || !active) return
    if (stack.side === side) return
    const how = planFor(stack)
    if (!how) return
    // First click arms the target and shows the cost; second commits.
    if (pending?.id === stack.id) {
      commit(stack, how.kind)
    } else {
      setPending(stack)
    }
  }

  function commit(target: Stack, kind: 'melee' | 'shoot') {
    setPending(null)
    setHovered(null)
    onAct(kind === 'shoot' ? { type: 'shoot', target: target.id } : { type: 'attack', target: target.id })
  }

  const mine = getFaction(
    battle.stacks.find((s) => s.side === side)?.factionId ?? 'kitezh',
  )
  const theirs = getFaction(
    battle.stacks.find((s) => s.side !== side)?.factionId ?? 'topyla',
  )

  return (
    <main className="screen battle">
      <header className="battle__head">
        <div className="battle__round">
          <p className="kicker">Round</p>
          <p className="display tnum battle__round-n">{battle.round}</p>
        </div>
        <TurnQueue battle={battle} />
        <div className="battle__peer">
          <span className={`pulse ${peerConnected ? '' : 'pulse--off'}`} />
          <span>{peerConnected ? `${theirs.name} connected` : 'Opponent away'}</span>
        </div>
      </header>

      <div className="battle__field">
        <span className="battle__banner battle__banner--left" style={{ color: mine.accent }}>
          {mine.name} &middot; you
        </span>
        <span className="battle__banner battle__banner--right" style={{ color: theirs.accent }}>
          {theirs.name}
        </span>

        <div className="battle__boardwrap">
          <svg
            className="battle__board"
            viewBox={`0 0 ${BOARD_PX.width} ${BOARD_PX.height}`}
            role="group"
            aria-label="Battlefield"
          >
            <HexGrid
              reachable={new Set(reach.keys())}
              path={pathKeys}
              activeHex={active?.hex ?? null}
              targetHex={plan ? (shown?.hex ?? null) : null}
              onPick={pickHex}
            />
            {battle.stacks.filter(isAlive).map((stack) => (
              <g
                key={stack.id}
                onMouseEnter={() => stack.side !== side && setHovered(stack)}
                onMouseLeave={() => setHovered(null)}
              >
                <StackToken
                  stack={stack}
                  isActive={stack.id === battle.activeId}
                  isTarget={shown?.id === stack.id && plan !== null}
                  onPick={pickStack}
                />
              </g>
            ))}
          </svg>

          {active && shown && plan && (
            <AttackPreview
              attacker={active}
              defender={shown}
              kind={plan.kind}
              moved={plan.moved}
            />
          )}
        </div>
      </div>

      <footer className="battle__foot">
        <CombatLog log={battle.log} />
        {active && (
          <ActionBar
            active={active}
            yours={!!yours}
            pendingTarget={pending}
            onWait={() => onAct({ type: 'wait' })}
            onDefend={() => onAct({ type: 'defend' })}
            onCommit={() => {
              const how = pending ? planFor(pending) : null
              if (pending && how) commit(pending, how.kind)
            }}
          />
        )}
      </footer>
      <div className="grain" />
    </main>
  )
}

