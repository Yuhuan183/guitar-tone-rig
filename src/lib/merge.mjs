/**
 * The preset inheritance rule, shared by the React app and scripts/ so the
 * workbench and `show-preset` can never disagree about what a preset resolves
 * to. Plain ESM with a sibling .d.mts so Node can import it without a build.
 */

/**
 * Merges a preset's overrides over the shared baseline. Later settings win on
 * matching `controlId`; a device present in only one side is kept whole.
 */
export function mergeSettings(base, override) {
  const result = {}
  for (const deviceId of new Set([...Object.keys(base), ...Object.keys(override)])) {
    const byControl = new Map()
    for (const setting of base[deviceId] ?? []) byControl.set(setting.controlId, setting)
    for (const setting of override[deviceId] ?? []) byControl.set(setting.controlId, setting)
    result[deviceId] = [...byControl.values()]
  }
  return result
}

/**
 * Resolves the full settings map for one preset id.
 * Throws rather than returning a partial rig, so scripts fail loudly.
 */
export function resolvePreset(rig, presetId) {
  const preset = rig.presets.find((candidate) => candidate.id === presetId)
  if (!preset) throw new Error(`Unknown preset: ${presetId}`)
  if (preset.inherits !== rig.baseline.id) {
    throw new Error(`${preset.id}: inherits "${preset.inherits}" but baseline is "${rig.baseline.id}"`)
  }
  return { preset, settings: mergeSettings(rig.baseline.settings, preset.settings) }
}

/**
 * Orders a device's settings by the catalog's control order, grouped into the
 * device's declared sections. Authoring order in rig.json is not display order.
 */
export function groupSettingsBySection(device, settings) {
  const byControlId = new Map(settings.map((setting) => [setting.controlId, setting]))
  return device.sections
    .map((section) => ({
      section,
      entries: device.controls
        .filter((control) => control.section === section.id && byControlId.has(control.id))
        .map((control) => ({ control, setting: byControlId.get(control.id) })),
    }))
    .filter((group) => group.entries.length > 0)
}
