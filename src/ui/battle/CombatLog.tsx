import { useEffect, useRef } from 'react'
import type { LogEntry } from '../../rules'

/**
 * The field record.
 *
 * Entries arrive already written for display — the engine composes the sentence
 * when it resolves the action, so the log cannot describe something other than
 * what happened.
 */
export function CombatLog({ log }: { log: readonly LogEntry[] }) {
  const end = useRef<HTMLDivElement>(null)
  const recent = log.slice(-40)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [log.length])

  return (
    <section className="log">
      <p className="kicker">Field record</p>
      <div className="log__scroll">
        {recent.map((entry, i) => (
          <p
            key={`${entry.round}-${i}`}
            className={`log__line log__line--${entry.kind}`}
            /* Older lines recede, so the eye lands on what just happened. */
            style={{ opacity: 0.45 + (0.55 * (i + 1)) / recent.length }}
          >
            {entry.text}
          </p>
        ))}
        <div ref={end} />
      </div>
    </section>
  )
}
