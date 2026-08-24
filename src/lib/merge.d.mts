import type { Device, Preset, Rig, Setting, SettingsMap, Control, Section } from '../types'

export function mergeSettings(base: SettingsMap, override: SettingsMap): SettingsMap
export function resolvePreset(rig: Rig, presetId: string): { preset: Preset; settings: SettingsMap }

export interface ControlEntry {
  control: Control
  setting: Setting
}
export interface SectionGroup {
  section: Section
  entries: ControlEntry[]
}
export function groupSettingsBySection(device: Device, settings: Setting[]): SectionGroup[]
