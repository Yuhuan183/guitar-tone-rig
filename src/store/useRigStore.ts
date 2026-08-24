import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ScalarValue, UserOverrides } from '../types'
import { acceptsValue, deviceById, presetById, rig } from '../lib/rig'

interface RigState {
  selectedPresetId: string
  overrides: UserOverrides
  gainReductionDemo: number
  compareMode: boolean
  selectPreset: (presetId: string) => void
  setControl: (deviceId: string, controlId: string, value: ScalarValue) => void
  resetControl: (deviceId: string, controlId: string) => void
  resetPreset: () => void
  setGainReductionDemo: (value: number) => void
  toggleCompareMode: () => void
}

const defaultPresetId = rig.presets[0]?.id ?? ''

const PERSIST_KEY = 'guitar-tone-rig'
/** What the key was called before the project was renamed. */
const FORMER_PERSIST_KEY = 'guitar-rig-control-room'

/**
 * Reads the former key once and moves it across, so a rename in the repository
 * does not silently start someone over on a rig they have already tuned. The
 * old key is removed on the way past: on GitHub Pages the origin is shared with
 * every other project page on this account, and leaving a stray key there helps
 * nobody.
 */
const storageAdoptingFormerKey = {
  getItem: (name: string) => {
    const current = localStorage.getItem(name)
    if (current !== null) return current
    const former = localStorage.getItem(FORMER_PERSIST_KEY)
    if (former === null) return null
    localStorage.setItem(name, former)
    localStorage.removeItem(FORMER_PERSIST_KEY)
    return former
  },
  setItem: (name: string, value: string) => localStorage.setItem(name, value),
  removeItem: (name: string) => localStorage.removeItem(name),
}

/**
 * Drops overrides pointing at presets, devices or controls that no longer
 * exist, and values the control could not hold. Without the first a rename in
 * the JSON leaves invisible state that the workbench keeps writing to but never
 * shows; without the second, anything at all in this localStorage key reaches
 * the UI — and on GitHub Pages the origin is shared with every other project
 * page on the same account, so this app is not the only writer.
 */
function pruneOverrides(overrides: UserOverrides): UserOverrides {
  const presetIds = new Set(rig.presets.map((preset) => preset.id))
  const result: UserOverrides = {}

  for (const [presetId, devices] of Object.entries(overrides ?? {})) {
    if (!presetIds.has(presetId)) continue
    const keptDevices: UserOverrides[string] = {}

    for (const [deviceId, controls] of Object.entries(devices ?? {})) {
      const device = deviceById.get(deviceId)
      if (!device) continue
      const controlsById = new Map(device.controls.map((control) => [control.id, control]))
      const keptControls = Object.fromEntries(
        Object.entries(controls ?? {}).filter(([controlId, value]) => {
          const control = controlsById.get(controlId)
          return control !== undefined && acceptsValue(control, value)
        }),
      )
      if (Object.keys(keptControls).length) keptDevices[deviceId] = keptControls
    }

    if (Object.keys(keptDevices).length) result[presetId] = keptDevices
  }

  return result
}

export const useRigStore = create<RigState>()(
  persist(
    (set) => ({
      selectedPresetId: defaultPresetId,
      overrides: {},
      gainReductionDemo: 4,
      compareMode: false,
      selectPreset: (selectedPresetId) => set({ selectedPresetId }),
      setControl: (deviceId, controlId, value) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [state.selectedPresetId]: {
              ...state.overrides[state.selectedPresetId],
              [deviceId]: {
                ...state.overrides[state.selectedPresetId]?.[deviceId],
                [controlId]: value,
              },
            },
          },
        })),
      resetControl: (deviceId, controlId) =>
        set((state) => {
          const presetOverrides = { ...state.overrides[state.selectedPresetId] }
          const deviceOverrides = { ...presetOverrides[deviceId] }
          delete deviceOverrides[controlId]
          if (Object.keys(deviceOverrides).length) presetOverrides[deviceId] = deviceOverrides
          else delete presetOverrides[deviceId]
          return { overrides: { ...state.overrides, [state.selectedPresetId]: presetOverrides } }
        }),
      resetPreset: () =>
        set((state) => {
          const next = { ...state.overrides }
          delete next[state.selectedPresetId]
          return { overrides: next }
        }),
      setGainReductionDemo: (gainReductionDemo) => set({ gainReductionDemo }),
      toggleCompareMode: () => set((state) => ({ compareMode: !state.compareMode })),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => storageAdoptingFormerKey),
      // v1 persisted overrides that were never checked against the catalog;
      // onRehydrateStorage prunes them, so the shape itself needs no rewrite.
      version: 2,
      migrate: (persisted) => ({
        selectedPresetId: defaultPresetId,
        overrides: {},
        compareMode: false,
        ...(persisted as object),
      }),
      partialize: (state) => ({
        selectedPresetId: state.selectedPresetId,
        overrides: state.overrides,
        compareMode: state.compareMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.overrides = pruneOverrides(state.overrides)
        if (!presetById.has(state.selectedPresetId)) state.selectedPresetId = defaultPresetId
        state.compareMode = state.compareMode === true
      },
    },
  ),
)

/** The preset the UI is showing, always a real one. */
export function useSelectedPreset() {
  const selectedPresetId = useRigStore((state) => state.selectedPresetId)
  return presetById.get(selectedPresetId) ?? rig.presets[0]
}
