import { mergeSettings } from './merge.mjs'
import { settingValue, valuePosition } from './value'
import type { Control, Device, Preset, ScalarValue, Setting, SettingsMap } from '../types'

/**
 * Resolves a device's front panel for a given set of settings. Pure — it takes
 * the device and the settings, never the rig — so the board diagram can be
 * rendered for any hypothetical voice and tested without loading real data.
 */

export type PanelShape = 'knob' | 'switch' | 'footswitch' | 'meter'

/**
 * Every control whose `surface` is `panel` must appear here or it would be
 * dropped from the drawing silently. validate-app checks the two agree.
 */
export const PANEL_SHAPES: Record<string, PanelShape> = {
  knob: 'knob',
  trimmer: 'knob',
  'rotary-selector': 'knob',
  selector: 'switch',
  toggle: 'switch',
  footswitch: 'footswitch',
  readout: 'meter',
}

export interface PanelItem {
  control: Control
  shape: PanelShape
  /** 0–1 along the control's own range; drives knob rotation and meter fill. */
  position: number
  value: ScalarValue | undefined
  /** No value in the data for this voice — drawn dimmed, not at mid-travel. */
  unset: boolean
  /** Only meaningful for a footswitch: is this stage engaged in this voice? */
  engaged: boolean
}

export interface PanelLayout {
  items: PanelItem[]
  knobs: PanelItem[]
  switches: PanelItem[]
  footswitches: PanelItem[]
  meters: PanelItem[]
  /** True when every footswitch is off, i.e. the whole stage is bypassed. */
  bypassed: boolean
}

const OFF_VALUES = new Set(['off', 'bypass', 'false'])

export const isEngaged = (value: ScalarValue | undefined): boolean =>
  value === undefined ? true : !OFF_VALUES.has(String(value).toLowerCase())

export function panelLayout(
  device: Device,
  settings: Setting[],
  overrides: Record<string, ScalarValue> = {},
): PanelLayout {
  const byControlId = new Map(settings.map((setting) => [setting.controlId, setting]))

  const items: PanelItem[] = device.controls
    .filter((control) => control.surface === 'panel' && PANEL_SHAPES[control.type])
    .map((control) => {
      const value = overrides[control.id] ?? settingValue(byControlId.get(control.id))
      return {
        control,
        shape: PANEL_SHAPES[control.type],
        position: value === undefined ? 0.5 : valuePosition(control, value),
        value,
        unset: value === undefined,
        engaged: isEngaged(value),
      }
    })

  const of = (shape: PanelShape) => items.filter((item) => item.shape === shape)
  const footswitches = of('footswitch')

  return {
    items,
    knobs: of('knob'),
    switches: of('switch'),
    footswitches,
    meters: of('meter'),
    bypassed: footswitches.length > 0 && footswitches.every((item) => !item.engaged),
  }
}

/**
 * Which voices engage this device. A pedal bypassed in the current voice has
 * almost no settings to show, so its page needs somewhere to send you.
 */
export function voicesEngaging(device: Device, presets: Preset[], baseline: SettingsMap) {
  const engaged: Preset[] = []
  const bypassed: Preset[] = []
  for (const preset of presets) {
    const settings = mergeSettings(baseline, preset.settings)[device.id] ?? []
    ;(panelLayout(device, settings).bypassed ? bypassed : engaged).push(preset)
  }
  return { engaged, bypassed }
}

/** -135° to +135°, the usable sweep of a guitar pedal knob. */
export const knobAngle = (position: number) => -135 + position * 270

/** Inverse of knobAngle, for pointer drag. */
export const anglePosition = (angle: number) => Math.min(1, Math.max(0, (angle + 135) / 270))
