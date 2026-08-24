import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { Pedalboard } from '../Pedalboard'
import { chainDevices, rig } from '../../../lib/rig'
import { useRigStore } from '../../../store/useRigStore'

const renderBoard = () =>
  render(
    <MemoryRouter>
      <Pedalboard />
    </MemoryRouter>,
  )

describe('Pedalboard', () => {
  beforeEach(() => {
    useRigStore.setState({ selectedPresetId: rig.presets[0].id, overrides: {} })
  })

  it('draws every stage of the chain, in order, each linking to its device', () => {
    renderBoard()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(chainDevices.length)
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      chainDevices.map((device) => `/devices/${device.id}`),
    )
  })

  it('labels each pedal with a state a reader can act on', () => {
    renderBoard()
    const states = screen.getAllByText(/^(ON|BYPASS|ALWAYS ON)$/)
    expect(states).toHaveLength(chainDevices.length)
  })

  it('follows the selected voice', () => {
    const { rerender } = renderBoard()
    const before = screen.getAllByText(/^(ON|BYPASS|ALWAYS ON)$/).map((el) => el.textContent)

    const metal = rig.presets.find((preset) => preset.id === 'tight-japanese-metal')!
    useRigStore.setState({ selectedPresetId: metal.id })
    rerender(
      <MemoryRouter>
        <Pedalboard />
      </MemoryRouter>,
    )

    const after = screen.getAllByText(/^(ON|BYPASS|ALWAYS ON)$/).map((el) => el.textContent)
    expect(after).not.toEqual(before)
  })

  it('shows a local override rather than the stored voice value', () => {
    const preset = rig.presets[0]
    useRigStore.setState({
      selectedPresetId: preset.id,
      overrides: { [preset.id]: { cali76: { bypass: 'off' } } },
    })
    renderBoard()
    expect(screen.getAllByText('BYPASS').length).toBeGreaterThan(0)
  })
})
