import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStickyStack } from '../useStickyStack'

let trigger: ((entries: unknown[]) => void) | undefined
class FakeResizeObserver {
  constructor(callback: (entries: unknown[]) => void) {
    trigger = callback
  }
  observe = vi.fn()
  disconnect = vi.fn()
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver)

function Probe() {
  const { ref, height } = useStickyStack<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="probe">
      {height}
    </div>
  )
}

describe('useStickyStack', () => {
  it('reports the border box, not the content box', () => {
    const { getByTestId } = render(<Probe />)
    act(() => trigger!([{ borderBoxSize: [{ blockSize: 180 }], target: getByTestId('probe') }]))
    expect(getByTestId('probe').textContent).toBe('180')
  })

  it('falls back to the measured rect when borderBoxSize is missing', () => {
    const { getByTestId } = render(<Probe />)
    const target = getByTestId('probe')
    target.getBoundingClientRect = () => ({ height: 96 }) as DOMRect
    act(() => trigger!([{ target }]))
    expect(target.textContent).toBe('96')
  })

  it('starts at zero so a consumer never offsets by NaN', () => {
    const { getByTestId } = render(<Probe />)
    expect(getByTestId('probe').textContent).toBe('0')
  })
})
