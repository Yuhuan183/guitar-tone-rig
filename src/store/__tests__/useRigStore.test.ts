import { beforeEach, describe, expect, it } from 'vitest'
import { useRigStore } from '../useRigStore'
import { rig } from '../../lib/rig'

/**
 * The persisted key is the app's only untrusted input. On GitHub Pages every
 * project page under the same account shares one origin and therefore one
 * localStorage, so what comes back is not necessarily what this app wrote —
 * and a rename in the JSON can strand overrides even when nothing is hostile.
 */
const KEY = 'guitar-tone-rig'
const FORMER_KEY = 'guitar-rig-control-room'
const preset = rig.presets[0]

const seed = (state: unknown) => localStorage.setItem(KEY, JSON.stringify({ version: 2, state }))

describe('rehydrating persisted state', () => {
  // setState first, then clear: persist writes the key back on every setState,
  // so clearing first leaves the store's own write sitting in localStorage and
  // the test is no longer starting from empty.
  beforeEach(() => {
    useRigStore.setState({ selectedPresetId: preset.id, overrides: {}, compareMode: false })
    localStorage.clear()
  })

  it('keeps only values the control could actually hold', async () => {
    seed({
      selectedPresetId: preset.id,
      overrides: {
        [preset.id]: {
          cali76: {
            attack: '12:00', // a real clock value on a clock control
            ratio: 999, // outside the control's declared 4–20
            input: 7, // a number where the control wants a clock
            release: { toString: 'x' }, // not a scalar at all
            no_such_control: 1,
          },
          'ghost-pedal': { anything: 1 },
        },
      },
      compareMode: false,
    })

    await useRigStore.persist.rehydrate()

    expect(useRigStore.getState().overrides[preset.id]).toEqual({ cali76: { attack: '12:00' } })
  })

  it('drops a whole preset that is no longer in the rig', async () => {
    seed({
      selectedPresetId: preset.id,
      overrides: { 'retired-voice': { cali76: { attack: '12:00' } } },
      compareMode: false,
    })

    await useRigStore.persist.rehydrate()

    expect(useRigStore.getState().overrides).toEqual({})
  })

  it('falls back to a real voice when the stored one is gone', async () => {
    seed({ selectedPresetId: 'retired-voice', overrides: {}, compareMode: false })

    await useRigStore.persist.rehydrate()

    expect(rig.presets.some((item) => item.id === useRigStore.getState().selectedPresetId)).toBe(true)
  })

  it('reads compareMode as a boolean rather than whatever was stored', async () => {
    seed({ selectedPresetId: preset.id, overrides: {}, compareMode: 'yes' })

    await useRigStore.persist.rehydrate()

    expect(useRigStore.getState().compareMode).toBe(false)
  })
})

describe('the key the project used to persist under', () => {
  // setState first, then clear: persist writes the key back on every setState,
  // so clearing first leaves the store's own write sitting in localStorage and
  // the test is no longer starting from empty.
  beforeEach(() => {
    useRigStore.setState({ selectedPresetId: preset.id, overrides: {}, compareMode: false })
    localStorage.clear()
  })

  const tuned = { cali76: { attack: '12:00' } }

  it('adopts what is under the former key and clears it', async () => {
    localStorage.setItem(
      FORMER_KEY,
      JSON.stringify({
        version: 2,
        state: { selectedPresetId: preset.id, overrides: { [preset.id]: tuned }, compareMode: false },
      }),
    )

    await useRigStore.persist.rehydrate()

    expect(useRigStore.getState().overrides[preset.id]).toEqual(tuned)
    expect(localStorage.getItem(FORMER_KEY)).toBeNull()
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })

  it('leaves the current key alone when both exist', async () => {
    seed({ selectedPresetId: preset.id, overrides: { [preset.id]: tuned }, compareMode: false })
    localStorage.setItem(
      FORMER_KEY,
      JSON.stringify({
        version: 2,
        state: { selectedPresetId: preset.id, overrides: {}, compareMode: true },
      }),
    )

    await useRigStore.persist.rehydrate()

    expect(useRigStore.getState().overrides[preset.id]).toEqual(tuned)
    expect(useRigStore.getState().compareMode).toBe(false)
  })

  it('does nothing when there is no former key', async () => {
    await useRigStore.persist.rehydrate()
    expect(useRigStore.getState().overrides).toEqual({})
  })
})
