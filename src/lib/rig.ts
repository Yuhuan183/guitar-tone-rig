/**
 * Application-bound view of the domain: the pure modules in lib/ take their
 * data as arguments, and this is where they are bound to the real rig once.
 * Components import from here; tests import the pure modules directly.
 */
import { adjacent, chainOrder, devicesByPlacement } from './chain'
import { catalog, deviceById, rig } from './data'

export { catalog, categoryLabel, deviceById, guides, presetById, rig } from './data'
export { groupSettingsBySection, mergeSettings, resolvePreset } from './merge.mjs'
export type { ControlEntry, SectionGroup } from './merge.mjs'
export { CLOCK_MAX_STEP, CLOCK_MIN_STEP, clockToStep, isClock, stepToClock } from './clock.mjs'
export { formatSetting, nudge, positionValue, settingValue, valuePosition } from './value'
export { pad2, truncate } from './format'
export type { Adjacent } from './chain'

export const chainDevices = chainOrder(rig, deviceById)

/** Catalog entries that are studied but not routed — the comparison shelf. */
export const referenceDevices = devicesByPlacement(catalog, 'reference')

export const adjacentStages = (deviceId: string) => adjacent(chainDevices, deviceId)

/** The hard limits that constrain one device, from the single rig-level copy. */
export const safetyRulesFor = (deviceId: string) =>
  rig.safetyRules.filter((entry) => entry.devices.includes(deviceId))
