import { describe, expect, it } from 'vitest'
import { supportsWebRTC, webrtcTransport } from './webrtc'

describe('webrtcTransport', () => {
  it('reports unsupported in an environment with no RTCPeerConnection', () => {
    // jsdom does not implement WebRTC. This is the guard that keeps the
    // transport from ever touching the network in tests, so it is worth
    // pinning down rather than relying on it by accident.
    expect(supportsWebRTC()).toBe(false)
  })

  it('resolves to null rather than throwing when unsupported', async () => {
    await expect(webrtcTransport({ roomId: 'test-room', isHost: true })).resolves.toBeNull()
  })
})
