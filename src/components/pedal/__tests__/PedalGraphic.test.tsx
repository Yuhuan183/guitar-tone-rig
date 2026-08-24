import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PedalGraphic } from '../PedalGraphic'
import type { Device, Setting } from '../../../types'

const device: Device = {
  id: 'p',
  manufacturer: 'ACME',
  model: 'Test Pedal',
  category: 'gain',
  subtype: 'od',
  primaryRole: 'test',
  placement: 'chain',
  appearance: { widthUnits: 2, heightUnits: 1.4, body: '#222222', face: '#eeeeee' },
  sections: [{ id: 'pedal', label: '主控制' }],
  controls: [
    {
      id: 'bypass',
      label: 'Bypass',
      section: 'pedal',
      type: 'footswitch',
      valueType: 'enum',
      surface: 'panel',
      options: ['off', 'on'],
    },
    { id: 'gain', label: 'Gain', section: 'pedal', type: 'knob', valueType: 'clock', surface: 'panel' },
    {
      id: 'hidden',
      label: 'Editor',
      section: 'pedal',
      type: 'toggle',
      valueType: 'enum',
      surface: 'software',
      options: ['off', 'on'],
    },
  ],
}

const settings: Setting[] = [
  { controlId: 'bypass', value: 'on', confidence: 'provisional' },
  { controlId: 'gain', value: '12:00', confidence: 'provisional' },
]

describe('PedalGraphic', () => {
  it('is a plain image with no focusable controls when read-only', () => {
    render(<PedalGraphic device={device} settings={settings} />)
    expect(screen.getByRole('img', { name: /Test Pedal/ })).toBeTruthy()
    expect(screen.queryAllByRole('slider')).toHaveLength(0)
  })

  it('exposes each panel control as a slider when editable', () => {
    render(<PedalGraphic device={device} settings={settings} onChange={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(2)
    expect(screen.getByRole('slider', { name: /Gain：12:00/ })).toBeTruthy()
  })

  it('never draws a software-only control', () => {
    render(<PedalGraphic device={device} settings={settings} onChange={vi.fn()} />)
    expect(screen.queryByRole('slider', { name: /Editor/ })).toBeNull()
  })

  it('nudges one detent per arrow key', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)

    const gain = screen.getByRole('slider', { name: /Gain/ })
    gain.focus()
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith('gain', '12:30')

    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith('gain', '11:30')
  })

  it('ignores keys that are not a nudge', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    screen.getByRole('slider', { name: /Gain/ }).focus()
    await user.keyboard('{Enter}a ')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('walks an enum footswitch with the arrow keys', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PedalGraphic device={device} settings={settings} onChange={onChange} />)
    screen.getByRole('slider', { name: /Bypass/ }).focus()
    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith('bypass', 'off')
  })

  it('reports the value it was given, so the drawing cannot drift from the data', () => {
    const { rerender } = render(<PedalGraphic device={device} settings={settings} onChange={vi.fn()} />)
    expect(screen.getByRole('slider', { name: /Gain：12:00/ })).toBeTruthy()

    rerender(
      <PedalGraphic device={device} settings={settings} overrides={{ gain: '15:30' }} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('slider', { name: /Gain：15:30/ })).toBeTruthy()
  })

  it('says a control is 未設定 rather than inventing a value', () => {
    render(<PedalGraphic device={device} settings={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('slider', { name: /Gain：未設定/ })).toBeTruthy()
  })
})
