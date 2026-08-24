import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { DashboardPage } from '../DashboardPage'
import { rig } from '../../lib/rig'
import { useRigStore } from '../../store/useRigStore'

const [first, second] = rig.presets

const draw = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )

const cardFor = (name: string) =>
  screen.getAllByRole('radio').find((node) => node.textContent?.includes(name))!

describe('DashboardPage', () => {
  beforeEach(() => {
    useRigStore.setState({ selectedPresetId: first.id })
  })

  /**
   * Calibrated against the bug it replaced — VoiceCard declared inside the
   * render body, so every selection produced a new component type and React
   * swapped the whole radiogroup for fresh DOM. The store still updated, which
   * is why nothing else caught it; the keyboard user lost their place.
   */
  it('keeps the pressed voice card focused after it is selected', async () => {
    const user = userEvent.setup()
    draw()

    const card = cardFor(second.name)
    card.focus()
    await user.keyboard('{Enter}')

    expect(useRigStore.getState().selectedPresetId).toBe(second.id)
    expect(cardFor(second.name)).toBe(card)
    expect(document.activeElement).toBe(card)
  })

  it('marks exactly the selected voice as checked', async () => {
    const user = userEvent.setup()
    draw()

    await user.click(cardFor(second.name))
    const checked = screen
      .getAllByRole('radio')
      .filter((node) => node.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0].textContent).toContain(second.name)
  })
})
