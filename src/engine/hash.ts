/**
 * State fingerprinting, for desync detection.
 *
 * After every action the host broadcasts a hash of the resulting state and the
 * guest compares it against its own. A mismatch means the two clients have
 * diverged, and it is far better to say so immediately than to let two people
 * play subtly different games for ten more rounds.
 *
 * This is FNV-1a: a checksum, not a cryptographic hash. It detects accidents,
 * not tampering — an opponent who wants to cheat holds the whole state anyway,
 * and no client-side scheme can stop them.
 */

/**
 * JSON with object keys sorted, so two structurally equal states always
 * serialize identically regardless of the order their fields were assigned.
 * Undefined values are dropped, as JSON.stringify would.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

/** 32-bit FNV-1a, as eight lowercase hex digits. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function hashState(state: unknown): string {
  return fnv1a(stableStringify(state))
}
