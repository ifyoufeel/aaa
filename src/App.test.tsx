/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('opens on the lobby when there is no room in the URL', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Nav’ & Yav’")
    expect(screen.getByRole('button', { name: /open a room/i })).toBeInTheDocument()
  })

  it('shows the share link once a room exists', () => {
    window.location.hash = '#/r/testroom99'
    render(<App />)
    // The room is still connecting, so the lobby stays up with the link out.
    expect(screen.getByText(/send this to your opponent/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/#\/r\/testroom99\/j$/)).toBeInTheDocument()
  })
})
