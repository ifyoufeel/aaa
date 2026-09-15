/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the title and a build stamp', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Nav\u2019 & Yav\u2019")
    expect(screen.getByTestId('build-commit')).not.toBeEmptyDOMElement()
  })
})
