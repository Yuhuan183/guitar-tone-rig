import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SignalChainPage } from '../SignalChainPage'
import { chainDevices, guides, referenceDevices, rig } from '../../lib/rig'

const draw = () =>
  render(
    <MemoryRouter>
      <SignalChainPage />
    </MemoryRouter>,
  )

const roleCount = chainDevices.reduce(
  (total, device) => total + (guides.guides[device.id]?.chainRole?.length ?? 0),
  0,
)

describe('SignalChainPage', () => {
  it('gives every stage on the chain a card, including the ones that own two jobs', () => {
    draw()
    // Every chainRole entry is a card, so a device with a Clean and a Drive
    // side gets two — and a device missing from the table would be missed.
    expect(screen.getAllByText(/^避免：/)).toHaveLength(roleCount)
    expect(roleCount).toBeGreaterThan(chainDevices.length)
  })

  it('links each stage card to the pedal it describes', () => {
    draw()
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    for (const device of chainDevices) {
      expect(hrefs).toContain(`/devices/${device.id}`)
    }
  })

  /**
   * Calibrated against the bug it replaced — a hardcoded `find(id === 'noise-gate')`
   * — by adding a second slot to the data and watching this fail. With one slot
   * in the real rig it cannot bite today; it starts guarding the moment a
   * second one is added, which is exactly when the old code would have gone
   * quiet.
   */
  it('renders a section per open slot rather than one slot it knows by name', () => {
    draw()
    for (const slot of rig.openSlots ?? []) {
      expect(screen.getByRole('heading', { name: `還缺一級：${slot.label}` })).toBeTruthy()
      for (const candidate of slot.candidates) {
        expect(screen.getByRole('heading', { name: candidate.name })).toBeTruthy()
      }
    }
  })

  it('puts every reference device on the shelf with its verdict', () => {
    draw()
    for (const device of referenceDevices) {
      expect(screen.getByRole('heading', { name: device.model })).toBeTruthy()
    }
  })

  it('states each safety rule once', () => {
    draw()
    for (const entry of rig.safetyRules) {
      expect(screen.getAllByText(entry.rule)).toHaveLength(1)
    }
  })
})
