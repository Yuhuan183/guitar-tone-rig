import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { GuideMeter } from '../GuideMeter'
import { guides, deviceById } from '../../lib/rig'
import { useRigStore } from '../../store/useRigStore'

const device = deviceById.get('cali76')!
const meter = guides.guides.cali76.meter!
const control = device.controls.find((item) => item.id === meter.controlId)!

const draw = () => render(<GuideMeter control={control} meter={meter} />)

describe('GuideMeter', () => {
  beforeEach(() => {
    useRigStore.setState({ gainReductionDemo: 4 })
  })

  it('takes its heading, unit and sweep from the data rather than the page', () => {
    draw()
    expect(screen.getByRole('heading', { name: meter.title })).toBeTruthy()
    const slider = screen.getByRole('slider', { name: meter.sliderLabel })
    expect(slider.getAttribute('min')).toBe(String(control.min))
    expect(slider.getAttribute('max')).toBe(String(meter.max))
    expect(screen.getByRole('status').textContent).toContain(control.unit)
  })

  it('reads the band the current value falls in, and the open one past the last upTo', async () => {
    const user = userEvent.setup()
    draw()
    // 4 is inside the second band, whose upTo is 5.
    expect(screen.getByText(meter.bands[1].note)).toBeTruthy()

    const highest = meter.quickValues.at(-1)!
    await user.click(screen.getByRole('button', { name: new RegExp(`^${highest}\\b`) }))
    expect(screen.getByText(meter.bands.at(-1)!.note)).toBeTruthy()
  })

  it('offers every quick value the guide lists and marks the active one', async () => {
    const user = userEvent.setup()
    draw()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(meter.quickValues.length)

    await user.click(buttons[0])
    const pressed = buttons.filter((node) => node.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(useRigStore.getState().gainReductionDemo).toBe(meter.quickValues[0])
  })
})
