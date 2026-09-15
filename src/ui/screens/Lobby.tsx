import { useState } from 'react'
import type { Connection } from '../useRoom'

/**
 * Where a match starts: create a room, copy the link, send it.
 *
 * The connection notice is deliberately blunt. A player who does not know that
 * this build can only reach another tab of their own browser will send the
 * link to a friend and wonder why nothing happens.
 */
export function Lobby({
  onCreate,
  shareUrl,
  connection,
  waiting,
}: {
  onCreate: () => void
  shareUrl: string
  connection: Connection
  waiting: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard access can be refused; the input below is selectable anyway.
    }
  }

  return (
    <main className="screen screen--centred">
      <p className="kicker">Явь · Nav&rsquo; &amp; Yav&rsquo; · Навь</p>
      <h1 className="display title">Nav&rsquo; &amp; Yav&rsquo;</h1>
      <p className="lede">
        A Slavic dark-fantasy battle for two. Pick a castle, spend your gold, and meet on the
        hexes.
      </p>

      {!waiting ? (
        <button type="button" className="btn btn--primary lobby__go" onClick={onCreate}>
          Open a room
        </button>
      ) : (
        <section className="lobby__share">
          <p className="kicker">Send this to your opponent</p>
          <div className="lobby__link">
            <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="lobby__status">
            <span className="pulse" /> Waiting for them to open it&hellip;
          </p>
        </section>
      )}

      {connection === 'local' && (
        <p className="notice">
          Could not open a peer-to-peer connection on this browser or network, so the link only
          reaches <strong>another tab of this browser</strong> — good for trying it out, no use
          for playing someone else. Add Supabase credentials for a connection that does not
          depend on either player's network.
        </p>
      )}
      {connection === 'unavailable' && (
        <p className="notice notice--bad">
          This browser cannot open a room: it supports neither the remote transport nor
          same-browser channels.
        </p>
      )}
    </main>
  )
}
