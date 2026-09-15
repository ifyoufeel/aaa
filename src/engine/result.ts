/**
 * An illegal move is a value, not an exception.
 *
 * The UI needs to ask "could this stack do that?" constantly — to grey out
 * buttons, to tint hexes — and it must be able to ask with the very same code
 * that enforces the rule. Throwing would make that ask expensive and would put
 * control flow for an ordinary situation (a player clicked the wrong hex) on
 * the exception path.
 */

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T = never>(reason: string): Result<T> {
  return { ok: false, reason }
}

/** Unwraps a result, throwing on failure. For tests and for genuinely impossible cases. */
export function expect<T>(result: Result<T>, context = 'expected ok'): T {
  if (!result.ok) throw new Error(`${context}: ${result.reason}`)
  return result.value
}
