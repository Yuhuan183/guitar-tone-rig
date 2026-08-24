import { describe, expect, it } from 'vitest'
import { catalog, chainDevices, guides, referenceDevices, rig, safetyRulesFor } from '../rig'

/**
 * The composition root bound to the real data. These assert the invariants the
 * UI relies on at render time; scripts/validate-data.mjs asserts the same ones
 * before the data is ever bundled, and the two must not disagree.
 */

describe('safetyRulesFor', () => {
  it('reaches every device a rule names, from the single rig-level copy', () => {
    for (const entry of rig.safetyRules) {
      for (const deviceId of entry.devices) {
        expect(safetyRulesFor(deviceId).map((item) => item.rule)).toContain(entry.rule)
      }
    }
  })

  it('returns nothing for a device no rule constrains', () => {
    expect(safetyRulesFor('jan-ray')).toEqual([])
  })

  it('no longer duplicates a rule into a device warning', () => {
    const rules = new Set(rig.safetyRules.map((entry) => entry.rule))
    for (const guide of Object.values(guides.guides)) {
      if (guide.warning) expect(rules.has(guide.warning)).toBe(false)
    }
  })
})

describe('placement', () => {
  it('splits the catalog with nothing left over', () => {
    expect(chainDevices.length + referenceDevices.length).toBe(catalog.devices.length)
  })

  it('gives a chain device a role and a reference device an evaluation, never both', () => {
    for (const device of catalog.devices) {
      const guide = guides.guides[device.id]
      const onChain = device.placement === 'chain'
      expect(Boolean(guide.chainRole)).toBe(onChain)
      expect(Boolean(guide.evaluation)).toBe(!onChain)
    }
  })
})

describe('setting coverage', () => {
  const settled = new Set(
    [rig.baseline.settings, ...rig.presets.map((preset) => preset.settings)].flatMap((map) =>
      Object.entries(map).flatMap(([deviceId, settings]) =>
        settings.map((setting) => `${deviceId}.${setting.controlId}`),
      ),
    ),
  )

  it('leaves no panel control on the chain without a setting in some voice', () => {
    for (const device of chainDevices) {
      for (const control of device.controls) {
        if (control.surface !== 'panel') continue
        expect(settled.has(`${device.id}.${control.id}`)).toBe(true)
      }
    }
  })

  it('gives a reference device no settings at all', () => {
    for (const device of referenceDevices) {
      for (const control of device.controls) {
        expect(settled.has(`${device.id}.${control.id}`)).toBe(false)
      }
    }
  })
})
