import { describe, expect, it } from 'vitest'
import { groupSettingsBySection, mergeSettings, resolvePreset } from '../merge.mjs'
import type { Device, Rig, Setting, SettingsMap } from '../../types'

const s = (controlId: string, value: string): Setting => ({ controlId, value, confidence: 'provisional' })

describe('mergeSettings', () => {
  it('lets the preset win on a matching controlId', () => {
    const merged = mergeSettings({ p: [s('gain', 'base')] }, { p: [s('gain', 'preset')] })
    expect(merged.p).toEqual([s('gain', 'preset')])
  })

  it('keeps a device that only one side mentions', () => {
    const merged = mergeSettings({ a: [s('x', '1')] }, { b: [s('y', '2')] })
    expect(Object.keys(merged).sort()).toEqual(['a', 'b'])
  })

  it('appends preset-only controls after inherited ones', () => {
    const merged = mergeSettings({ p: [s('a', '1')] }, { p: [s('b', '2')] })
    expect(merged.p.map((x) => x.controlId)).toEqual(['a', 'b'])
  })

  it('does not mutate its inputs', () => {
    const base: SettingsMap = { p: [s('gain', 'base')] }
    mergeSettings(base, { p: [s('gain', 'preset')] })
    expect(base.p[0].value).toBe('base')
  })
})

describe('resolvePreset', () => {
  const rig = {
    baseline: { id: 'shared', settings: { p: [s('gain', 'base')] } },
    presets: [{ id: 'clean', inherits: 'shared', settings: { p: [s('tone', 'x')] } }],
  } as unknown as Rig

  it('merges the baseline under the preset', () => {
    const { settings } = resolvePreset(rig, 'clean')
    expect(settings.p.map((x) => x.controlId)).toEqual(['gain', 'tone'])
  })

  it('throws loudly on an unknown preset rather than returning a partial rig', () => {
    expect(() => resolvePreset(rig, 'nope')).toThrow(/Unknown preset/)
  })

  it('throws when the preset inherits something that is not the baseline', () => {
    const broken = { ...rig, presets: [{ id: 'clean', inherits: 'other', settings: {} }] } as unknown as Rig
    expect(() => resolvePreset(broken, 'clean')).toThrow(/baseline/)
  })
})

describe('groupSettingsBySection', () => {
  const device = {
    id: 'p',
    sections: [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
      { id: 'empty', label: 'Empty' },
    ],
    controls: [
      { id: 'b', section: 'two' },
      { id: 'a', section: 'one' },
      { id: 'c', section: 'one' },
    ],
  } as unknown as Device

  it('orders by section, then by catalog order — not by authoring order', () => {
    const groups = groupSettingsBySection(device, [s('c', '1'), s('b', '2'), s('a', '3')])
    expect(groups.map((g) => g.section.id)).toEqual(['one', 'two'])
    expect(groups[0].entries.map((e) => e.control.id)).toEqual(['a', 'c'])
  })

  it('drops a section with nothing in this voice', () => {
    const groups = groupSettingsBySection(device, [s('a', '1')])
    expect(groups.map((g) => g.section.id)).toEqual(['one'])
  })

  it('ignores a setting whose control is not on the device', () => {
    const groups = groupSettingsBySection(device, [s('ghost', '1')])
    expect(groups).toEqual([])
  })
})
