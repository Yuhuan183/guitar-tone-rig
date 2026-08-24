import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBreakpoint, useFluid, useViewportWidth } from '../useFluid'
import { SCALES, fluidAt } from '../responsive'

const resizeTo = (width: number) =>
  act(() => {
    window.innerWidth = width
    window.dispatchEvent(new Event('resize'))
  })

function Probe() {
  return (
    <>
      <span data-testid="width">{useViewportWidth()}</span>
      <span data-testid="board">{useFluid('pedal-board').toFixed(2)}</span>
      <span data-testid="lg">{String(useBreakpoint('lg'))}</span>
    </>
  )
}

describe('useFluid', () => {
  it('reads the same value the registry defines', () => {
    resizeTo(900)
    render(<Probe />)
    expect(screen.getByTestId('board').textContent).toBe(fluidAt(SCALES['pedal-board'], 900).toFixed(2))
  })

  it('follows the viewport', () => {
    resizeTo(1440)
    render(<Probe />)
    const wide = screen.getByTestId('board').textContent

    resizeTo(360)
    expect(screen.getByTestId('board').textContent).not.toBe(wide)
    expect(screen.getByTestId('width').textContent).toBe('360')
  })

  it('answers a breakpoint without a component knowing the number', () => {
    resizeTo(1200)
    render(<Probe />)
    expect(screen.getByTestId('lg').textContent).toBe('true')

    resizeTo(700)
    expect(screen.getByTestId('lg').textContent).toBe('false')
  })

  it('stops listening once unmounted', () => {
    resizeTo(1000)
    const { unmount } = render(<Probe />)
    unmount()
    expect(() => resizeTo(400)).not.toThrow()
  })
})
