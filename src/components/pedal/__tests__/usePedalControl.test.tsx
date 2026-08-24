import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PedalGraphic } from '../PedalGraphic'
import type { Device, Setting } from '../../../types'

const device: Device = {
  id: 'p',
  manufacturer: 'ACME',
  model: 'Drag',
  category: 'gain',
  subtype: 'od',
  primaryRole: 'r',
  placement: 'chain',
  appearance: { widthUnits: 2, heightUnits: 1.4, body: '#222222', face: '#eeeeee' },
  sections: [{ id: 'pedal', label: 'pedal' }],
  controls: [
    { id: 'gain', label: 'Gain', section: 'pedal', type: 'knob', valueType: 'clock', surface: 'panel' },
  ],
}
const settings: Setting[] = [{ controlId: 'gain', value: '12:00', confidence: 'provisional' }]

/** happy-dom has no pointer capture; the component only needs it to not throw. */
const stubCapture = (el: Element) => {
  Object.assign(el, { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() })
}

/**
 * On touch, the pointer is released with the finger, so it is no longer active
 * by the time pointerup fires and the DOM throws NotFoundError.
 */
const stubThrowingRelease = (el: Element) => {
  Object.assign(el, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(() => {
      throw new DOMException('no active pointer', 'NotFoundError')
    }),
  })
}

const drag = (el: Element, dy: number) => {
  fireEvent.pointerDown(el, { pointerId: 1, clientY: 200 })
  fireEvent(el, new PointerEvent('pointermove', { clientY: 200 - dy, bubbles: false }))
  fireEvent(el, new PointerEvent('pointerup', { bubbles: false }))
}

describe('pointer drag', () => {
  it('turns a knob up when dragged up', () => {
    const onChange = vi.fn()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: /Gain/ })
    stubCapture(knob)

    drag(knob, 70)
    expect(onChange).toHaveBeenCalled()
    const [, next] = onChange.mock.calls.at(-1)!
    expect(next > '12:00').toBe(true)
  })

  it('turns it down when dragged down', () => {
    const onChange = vi.fn()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: /Gain/ })
    stubCapture(knob)

    drag(knob, -70)
    const [, next] = onChange.mock.calls.at(-1)!
    expect(next < '12:00').toBe(true)
  })

  it('clamps at the end of the sweep instead of wrapping round', () => {
    const onChange = vi.fn()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: /Gain/ })
    stubCapture(knob)

    drag(knob, 5000)
    expect(onChange).toHaveBeenLastCalledWith('gain', '17:30')
  })

  it('stops following the pointer once released', () => {
    const onChange = vi.fn()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: /Gain/ })
    stubCapture(knob)

    drag(knob, 40)
    const callsAfterRelease = onChange.mock.calls.length
    fireEvent(knob, new PointerEvent('pointermove', { clientY: 0 }))
    expect(onChange.mock.calls.length).toBe(callsAfterRelease)
  })

  it('detaches its listeners even when releasing pointer capture throws', () => {
    const onChange = vi.fn()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: /Gain/ })
    stubThrowingRelease(knob)

    drag(knob, 40)
    onChange.mockClear()

    // One move in a second drag must reach exactly one handler. A leaked
    // listener per drag makes every later move fire once per drag so far.
    fireEvent.pointerDown(knob, { pointerId: 1, clientY: 200 })
    fireEvent(knob, new PointerEvent('pointermove', { clientY: 160, bubbles: false }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does nothing at all when the drawing is read-only', () => {
    render(<PedalGraphic device={device} settings={settings} />)
    const knob = screen.getByRole('img', { name: /Drag/ }).querySelector('g')!
    expect(() => drag(knob, 60)).not.toThrow()
  })
})
