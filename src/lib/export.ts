import { deviceById, formatSetting, mergeSettings, pad2, rig, settingValue } from './rig'
import type { Preset, ScalarValue, Setting, SettingsMap, UserOverrides } from '../types'

export interface OverrideDiff {
  deviceId: string
  deviceModel: string
  controlId: string
  controlLabel: string
  before: ScalarValue | undefined
  beforeText: string
  after: ScalarValue
}

/**
 * Flattens one preset's local tuning into a Before/After list, resolved against
 * the merged baseline + preset settings so `before` is what the JSON actually
 * recommends rather than whatever happened to be on screen.
 */
export function diffPreset(preset: Preset, overrides: UserOverrides): OverrideDiff[] {
  const merged = mergeSettings(rig.baseline.settings, preset.settings)
  const presetOverrides = overrides[preset.id] ?? {}
  const rows: OverrideDiff[] = []

  for (const [deviceId, controls] of Object.entries(presetOverrides)) {
    const device = deviceById.get(deviceId)
    if (!device) continue
    const byControlId = new Map((merged[deviceId] ?? []).map((setting) => [setting.controlId, setting]))

    for (const control of device.controls) {
      if (!(control.id in controls)) continue
      const setting = byControlId.get(control.id)
      rows.push({
        deviceId,
        deviceModel: device.model,
        controlId: control.id,
        controlLabel: control.label,
        before: settingValue(setting),
        beforeText: formatSetting(setting),
        after: controls[control.id],
      })
    }
  }

  return rows
}

/**
 * The `settings` block to paste into the preset in rig.json.
 * `confidence` is reset to `needs-calibration`: a value tried in the browser
 * has not been heard yet.
 */
export function toRigPatch(preset: Preset, diffs: OverrideDiff[]) {
  const settings: SettingsMap = {}
  for (const diff of diffs) {
    const setting: Setting = {
      controlId: diff.controlId,
      value: diff.after,
      confidence: 'needs-calibration',
    }
    ;(settings[diff.deviceId] ??= []).push(setting)
  }
  return { id: preset.id, name: preset.name, settings }
}

/** A tuning-log session skeleton, pre-filled with the Before/After pairs. */
export function toTuningSession(preset: Preset, diffs: OverrideDiff[], today = new Date()) {
  // The local day, not the UTC one: a session tuned at 01:30 in Taipei belongs
  // to that morning, and toISOString would file it under the day before.
  const date = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return {
    id: `${date}-${preset.id}`,
    date,
    presetId: preset.id,
    context: { guitar: '', pickup: '', monitoring: '', volume: '' },
    observations: [],
    changes: diffs.map((diff) => ({
      deviceId: diff.deviceId,
      controlId: diff.controlId,
      before: diff.before ?? '',
      after: diff.after,
      reason: '',
    })),
    decision: 'inconclusive',
  }
}

export const stringify = (value: unknown) => JSON.stringify(value, null, 2)

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  // Firefox starts no download from an anchor that is not in the document, and
  // every browser reads the blob after this task returns — revoking the url on
  // the next line would hand it one that is already gone.
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
