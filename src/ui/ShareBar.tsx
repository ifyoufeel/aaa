import { useState } from 'react'
import type { Connection } from './useRoom'

/**
 * The invite link, pinned until the opponent actually arrives.
 *
 * An earlier cut dropped the player straight from "open a room" into faction
 * select, which meant the host never got a chance to copy the link at all — the
 * one thing the screen existed for. Keeping it up until `peerConnected` lets
 * them choose a castle while they wait without losing the link.
 */
export function ShareBar({ url, connection }: { url: string; connection: Connection }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard access can be refused; the field stays selectable.
    }
  }

  return (
    <div className="sharebar">
      <p className="sharebar__label">
        <span className="pulse" /> Waiting for your opponent
      </p>
      <input
        className="sharebar__url"
        readOnly
        value={url}
        aria-label="Invite link"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="btn sharebar__copy" onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      {connection === 'local' && (
        <p className="sharebar__note">
          Could not open a peer-to-peer connection — this link only reaches another tab of this
          browser.
        </p>
      )}
    </div>
  )
}
