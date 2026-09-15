/**
 * A match between two players.
 *
 * Both sides run this same class. The host is simply the side that resolves
 * actions and rolls the dice; the guest asks and replays. Everything else —
 * faction picks, recruitment, the battle state — is mirrored on both.
 *
 * The engine is pure, so `Room` is where all the awkwardness lives: ordering,
 * reconnection, and telling the player when the two copies have diverged.
 */

import { hashState } from '../engine/hash'
import { recordingRng, replayRng, seededRng } from '../engine/rng'
import type { FactionId } from '../content/types'
import { applyAction, createBattle } from '../rules'
import type { Action, ArmyOrder, BattleState, Side } from '../rules'
import type { Message, Phase, ResolvedAction, Transport } from './protocol'
import { PROTOCOL_VERSION } from './protocol'

export interface RoomSnapshot {
  readonly phase: Phase
  readonly side: Side
  readonly isHost: boolean
  readonly peerConnected: boolean
  readonly picks: Partial<Record<Side, FactionId>>
  readonly armies: Partial<Record<Side, Readonly<Record<string, number>>>>
  readonly battle: BattleState | null
  /**
   * Set when the two clients' states stopped matching. The match cannot be
   * trusted past this point, and the UI must say so rather than carry on.
   */
  readonly desync: { readonly seq: number; readonly expected: string; readonly actual: string } | null
  readonly error: string | null
}

export interface RoomOptions {
  readonly transport: Transport
  readonly side: Side
  readonly playerId: string
  /** Shared by both sides; the host's value wins if they differ. */
  readonly seed: number
}

/** The host is Yav' — the player who created the room and sent the link. */
const HOST_SIDE: Side = 'yav'

export class Room {
  private readonly transport: Transport
  private readonly side: Side
  private readonly playerId: string
  private readonly listeners = new Set<(snapshot: RoomSnapshot) => void>()
  private readonly unsubscribe: () => void

  private seed: number
  private phase: Phase = 'lobby'
  private peerConnected = false
  private picks: Partial<Record<Side, FactionId>> = {}
  private armies: Partial<Record<Side, Readonly<Record<string, number>>>> = {}
  private battle: BattleState | null = null
  private desync: RoomSnapshot['desync'] = null
  private error: string | null = null

  /** Every resolved step, so a rejoining guest can be caught up. */
  private history: ResolvedAction[] = []
  private nextSeq = 1
  /** The host's generator. Guests never roll. */
  private rng = seededRng(0)

  constructor(options: RoomOptions) {
    this.transport = options.transport
    this.side = options.side
    this.playerId = options.playerId
    this.seed = options.seed
    this.rng = seededRng(options.seed)
    this.unsubscribe = this.transport.onMessage((m) => this.receive(m))
  }

  get isHost(): boolean {
    return this.side === HOST_SIDE
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  /** Announce yourself. The host answers with the room's current state. */
  join(): void {
    this.transport.send({
      type: 'hello',
      version: PROTOCOL_VERSION,
      side: this.side,
      playerId: this.playerId,
    })
    if (this.phase === 'lobby') this.setPhase('faction')
  }

  dispose(): void {
    this.unsubscribe()
    this.transport.close()
    this.listeners.clear()
  }

  subscribe(listener: (snapshot: RoomSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  snapshot(): RoomSnapshot {
    return {
      phase: this.phase,
      side: this.side,
      isHost: this.isHost,
      peerConnected: this.peerConnected,
      picks: { ...this.picks },
      armies: { ...this.armies },
      battle: this.battle,
      desync: this.desync,
      error: this.error,
    }
  }

  // ── player intent ──────────────────────────────────────────────────────────

  pickFaction(factionId: FactionId): void {
    this.picks = { ...this.picks, [this.side]: factionId }
    this.transport.send({ type: 'pick', side: this.side, factionId })
    this.advanceFromPicks()
  }

  ready(counts: Readonly<Record<string, number>>): void {
    this.armies = { ...this.armies, [this.side]: counts }
    this.transport.send({ type: 'ready', side: this.side, counts })
    this.advanceFromArmies()
  }

  /**
   * Attempt an action. The host resolves it immediately; the guest asks and
   * waits for the answer, so the two never apply the same action twice.
   */
  act(action: Action): void {
    if (!this.battle) return
    if (this.isHost) this.resolve(action)
    else this.transport.send({ type: 'request', side: this.side, action })
  }

  // ── receiving ──────────────────────────────────────────────────────────────

  private receive(message: Message): void {
    switch (message.type) {
      case 'hello':
        this.peerConnected = true
        if (message.version !== PROTOCOL_VERSION) {
          this.fail(
            `Your opponent is on a different version of the game (${message.version} vs ${PROTOCOL_VERSION}). One of you needs to reload.`,
          )
          return
        }
        if (this.isHost) {
          this.transport.send({
            type: 'welcome',
            version: PROTOCOL_VERSION,
            phase: this.phase,
            seed: this.seed,
            picks: this.picks,
            armies: this.armies,
            history: this.history,
          })
        }
        this.emit()
        return

      case 'welcome':
        // Only the guest is ever welcomed, and the host's view is the truth.
        if (this.isHost) return
        this.peerConnected = true
        this.seed = message.seed
        this.picks = { ...message.picks }
        this.armies = { ...message.armies }
        this.phase = message.phase
        if (message.history.length > 0 || message.phase === 'battle' || message.phase === 'over') {
          this.rebuildFrom(message.history)
        }
        this.emit()
        return

      case 'pick':
        this.picks = { ...this.picks, [message.side]: message.factionId }
        this.advanceFromPicks()
        return

      case 'ready':
        this.armies = { ...this.armies, [message.side]: message.counts }
        this.advanceFromArmies()
        return

      case 'request':
        // Only the host resolves, and only the other side may ask.
        if (!this.isHost || message.side === this.side) return
        this.resolve(message.action)
        return

      case 'resolved':
        if (this.isHost) return
        this.applyResolved(message)
        return

      case 'desync':
        this.desync = { seq: message.seq, expected: message.expected, actual: message.actual }
        this.emit()
        return
    }
  }

  // ── the authoritative step ─────────────────────────────────────────────────

  /** Host only: roll, apply, and tell the guest exactly what happened. */
  private resolve(action: Action): void {
    if (!this.battle || this.desync) return

    const recorder = recordingRng(this.rng)
    const result = applyAction(this.battle, action, recorder)
    if (!result.ok) {
      // An illegal request is not a crash: the guest's view was simply stale.
      this.error = result.reason
      this.emit()
      return
    }

    this.battle = result.value
    this.error = null
    const step: ResolvedAction = {
      seq: this.nextSeq++,
      action,
      draws: recorder.draws,
      hash: hashState(this.battle),
    }
    this.history.push(step)
    if (this.battle.outcome) this.phase = 'over'
    this.transport.send({ type: 'resolved', ...step })
    this.emit()
  }

  /** Guest only: replay the host's roll and check we agree about the result. */
  private applyResolved(step: ResolvedAction): void {
    if (!this.battle || this.desync) return
    if (step.seq !== this.nextSeq) {
      // A gap means a message was lost; the host's history is the cure.
      this.fail(`Lost track of the battle at move ${step.seq}. Reload to resync.`)
      return
    }

    const result = applyAction(this.battle, step.action, replayRng(step.draws))
    if (!result.ok) {
      this.reportDesync(step.seq, step.hash, `rejected: ${result.reason}`)
      return
    }

    const actual = hashState(result.value)
    if (actual !== step.hash) {
      this.reportDesync(step.seq, step.hash, actual)
      return
    }

    this.battle = result.value
    this.nextSeq = step.seq + 1
    this.history.push(step)
    if (this.battle.outcome) this.phase = 'over'
    this.emit()
  }

  private reportDesync(seq: number, expected: string, actual: string): void {
    this.desync = { seq, expected, actual }
    this.transport.send({ type: 'desync', seq, expected, actual })
    this.emit()
  }

  /** Guest reconnect: replay the host's whole history onto a fresh battle. */
  private rebuildFrom(history: readonly ResolvedAction[]): void {
    const opening = this.startingState()
    if (!opening) return
    let state = opening
    for (const step of history) {
      const result = applyAction(state, step.action, replayRng(step.draws))
      if (!result.ok) {
        this.fail(`Could not catch up with the battle (move ${step.seq}: ${result.reason}).`)
        return
      }
      state = result.value
    }
    this.battle = state
    this.history = [...history]
    this.nextSeq = (history.at(-1)?.seq ?? 0) + 1
    if (state.outcome) this.phase = 'over'
  }

  // ── phase transitions ──────────────────────────────────────────────────────

  private advanceFromPicks(): void {
    if (this.picks.yav && this.picks.nav && this.phase === 'faction') {
      this.setPhase('recruit')
    } else {
      this.emit()
    }
  }

  private advanceFromArmies(): void {
    if (this.armies.yav && this.armies.nav && this.battle === null) {
      const opening = this.startingState()
      if (opening) {
        this.battle = opening
        this.rng = seededRng(this.seed)
        this.setPhase('battle')
        return
      }
    }
    this.emit()
  }

  private startingState(): BattleState | null {
    const { yav, nav } = this.picks
    if (!yav || !nav || !this.armies.yav || !this.armies.nav) return null
    const yavOrder: ArmyOrder = { side: 'yav', factionId: yav, counts: this.armies.yav }
    const navOrder: ArmyOrder = { side: 'nav', factionId: nav, counts: this.armies.nav }
    try {
      return createBattle(this.seed, yavOrder, navOrder)
    } catch (cause) {
      this.fail(cause instanceof Error ? cause.message : 'could not start the battle')
      return null
    }
  }

  private setPhase(phase: Phase): void {
    this.phase = phase
    this.emit()
  }

  private fail(message: string): void {
    this.error = message
    this.emit()
  }

  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of [...this.listeners]) listener(snapshot)
  }
}
