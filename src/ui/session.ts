/**
 * Per-browser identity and room bookkeeping.
 *
 * Every access is wrapped: localStorage throws in a private window, behind
 * blocked site data, and inside some embedded views. None of this is important
 * enough to break a game over, so failures fall back to a value that still
 * works for one session.
 */

const PLAYER_KEY = 'nav-yav:player'

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // A player who cannot persist still gets to finish this game.
  }
}

let ephemeralId: string | null = null

/** Stable id for this browser, so a reconnect is recognised as the same player. */
export function playerId(): string {
  const stored = read(PLAYER_KEY)
  if (stored) return stored
  if (!ephemeralId) ephemeralId = newId()
  write(PLAYER_KEY, ephemeralId)
  return ephemeralId
}

/** Short, URL-safe, and unguessable enough that nobody wanders into your game. */
export function newId(length = 10): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** Seed for a room, derived from its id so both players agree without asking. */
export function seedFromRoomId(roomId: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < roomId.length; i++) {
    hash ^= roomId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
