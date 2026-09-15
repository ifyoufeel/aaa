/**
 * The wire protocol between the two players.
 *
 * The match is HOST-AUTHORITATIVE WITH VERIFICATION. The guest sends action
 * *requests*; the host resolves them — including every random draw — and
 * broadcasts the action, the draws it used, and a hash of the state that
 * resulted. The guest replays the action against its own copy using the host's
 * draws, then compares its hash with the host's.
 *
 * Pure lockstep determinism would be more elegant and would need no draws on
 * the wire, but it fails SILENTLY: one difference in iteration order between
 * two browsers and the players are in subtly different games with nothing to
 * tell them. Resolving randomness once and checksumming after every action
 * means a divergence is caught on the very next message and can be reported
 * honestly.
 *
 * Nothing here is anti-cheat. Both players hold the whole state and could edit
 * it; no client-side scheme can prevent that. These messages are for catching
 * accidents, not opponents.
 */

import type { FactionId } from '../content/types'
import type { Action, Side } from '../rules'

/** Bumped whenever the shape below changes. Mismatched peers refuse to play. */
export const PROTOCOL_VERSION = 1

export type Phase = 'lobby' | 'faction' | 'recruit' | 'battle' | 'over'

/** Sent by whoever joins, to announce themselves. */
export interface HelloMessage {
  readonly type: 'hello'
  readonly version: number
  readonly side: Side
  /** Stable per-browser id, so a reconnect is recognised as the same player. */
  readonly playerId: string
}

/** Host's answer to a hello: the full current state of the room. */
export interface WelcomeMessage {
  readonly type: 'welcome'
  readonly version: number
  readonly phase: Phase
  readonly seed: number
  readonly picks: Partial<Record<Side, FactionId>>
  readonly armies: Partial<Record<Side, Readonly<Record<string, number>>>>
  /** Present once the battle has begun: every action so far, in order. */
  readonly history: readonly ResolvedAction[]
}

export interface PickFactionMessage {
  readonly type: 'pick'
  readonly side: Side
  readonly factionId: FactionId
}

export interface ReadyMessage {
  readonly type: 'ready'
  readonly side: Side
  readonly counts: Readonly<Record<string, number>>
}

/** Guest -> host: "I would like to do this." Never applied on the sender. */
export interface RequestMessage {
  readonly type: 'request'
  readonly side: Side
  readonly action: Action
}

/** One resolved step of the battle, as the host decided it. */
export interface ResolvedAction {
  /** Monotonic from 1, so a gap is detectable. */
  readonly seq: number
  readonly action: Action
  /** Random draws the host consumed, in order. */
  readonly draws: readonly number[]
  /** Host's hash of the state AFTER applying the action. */
  readonly hash: string
}

/** Host -> guest: "this happened." */
export interface ResolvedMessage extends ResolvedAction {
  readonly type: 'resolved'
}

/** Either side, on noticing the two states no longer agree. */
export interface DesyncMessage {
  readonly type: 'desync'
  readonly seq: number
  readonly expected: string
  readonly actual: string
}

export type Message =
  | HelloMessage
  | WelcomeMessage
  | PickFactionMessage
  | ReadyMessage
  | RequestMessage
  | ResolvedMessage
  | DesyncMessage

/**
 * A two-party channel. Everything above this line is transport-agnostic, so
 * the same room logic runs over a same-browser channel, a real server, or a
 * pair of in-memory queues in a test.
 */
export interface Transport {
  send(message: Message): void
  /** Returns an unsubscribe function. */
  onMessage(handler: (message: Message) => void): () => void
  /** Called when the peer's presence changes, where the transport can tell. */
  onPeerChange?(handler: (connected: boolean) => void): () => void
  close(): void
}

/**
 * Messages arrive from the other player's browser and are therefore untrusted
 * input, however friendly the opponent. Anything that reaches the rules engine
 * goes through this first.
 */
export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  return (
    type === 'hello' ||
    type === 'welcome' ||
    type === 'pick' ||
    type === 'ready' ||
    type === 'request' ||
    type === 'resolved' ||
    type === 'desync'
  )
}
