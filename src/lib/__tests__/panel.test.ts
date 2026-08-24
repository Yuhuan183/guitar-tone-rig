import { describe, expect, it } from 'vitest'
import { anglePosition, isEngaged, knobAngle, panelLayout, voicesEngaging, PANEL_SHAPES } from '../panel'
import type { Device, Preset, Setting } from '../../types'

const device: Device = {
  id: 'test-pedal',
  manufacturer: 'ACME',
  model: 'Test',
  category: 'gain',
  subtype: 'overdrive',
  primaryRole: 'test',
  placement: 'chain',
  appearance: { widthUnits: 1, heightUnits: 1.5, body: '#000000', face: '#ffffff' },
  sections: [{ id: 'pedal', label: '主控制' }],
  controls: [
    {
      id: 'bypass',
      label: 'Bypass',
      section: 'pedal',
      type: 'footswitch',
      valueType: 'enum',
      surface: 'panel',
      options: ['off', 'on'],
    },
    { id: 'gain', label: 'Gain', section: 'pedal', type: 'knob', valueType: 'clock', surface: 'panel' },
    {
      id: 'mode',
      label: 'Mode',
      section: 'pedal',
      type: 'toggle',
      valueType: 'enum',
      surface: 'panel',
      options: ['a', 'b'],
    },
    {
      id: 'meter',
      label: 'Meter',
      section: 'pedal',
      type: 'readout',
      valueType: 'number',
      surface: 'panel',
      min: 0,
      max: 10,
    },
    {
      id: 'hidden',
      label: 'Editor only',
      section: 'pedal',
      type: 'toggle',
      valueType: 'enum',
      surface: 'software',
      options: ['off', 'on'],
    },
  ],
}

const on: Setting[] = [
  { controlId: 'bypass', value: 'on', confidence: 'provisional' },
  { controlId: 'gain', value: '12:00', confidence: 'provisional' },
]

describe('panelLayout', () => {
  it('draws only panel controls, sorted into shapes', () => {
    const layout = panelLayout(device, on)
    expect(layout.items).toHaveLength(4)
    expect(layout.knobs.map((i) => i.control.id)).toEqual(['gain'])
    expect(layout.switches.map((i) => i.control.id)).toEqual(['mode'])
    expect(layout.footswitches.map((i) => i.control.id)).toEqual(['bypass'])
    expect(layout.meters.map((i) => i.control.id)).toEqual(['meter'])
  })

  it('marks a control the voice never mentions as unset', () => {
    const layout = panelLayout(device, on)
    expect(layout.knobs[0].unset).toBe(false)
    expect(layout.switches[0].unset).toBe(true)
  })

  it('lets a local override win over the voice', () => {
    const layout = panelLayout(device, on, { gain: '15:00' })
    expect(layout.knobs[0].value).toBe('15:00')
    expect(layout.knobs[0].unset).toBe(false)
  })

  it('reports bypass only when every footswitch is off', () => {
    expect(panelLayout(device, on).bypassed).toBe(false)
    expect(
      panelLayout(device, [{ controlId: 'bypass', value: 'off', confidence: 'provisional' }]).bypassed,
    ).toBe(true)
  })

  it('is not bypassed when the device has no footswitch at all', () => {
    const alwaysOn = { ...device, controls: device.controls.filter((c) => c.type !== 'footswitch') }
    expect(panelLayout(alwaysOn, []).bypassed).toBe(false)
  })
})

describe('isEngaged', () => {
  it.each([
    ['off', false],
    ['bypass', false],
    ['OFF', false],
    ['on', true],
    ['enabled', true],
  ])('%s -> %s', (value, expected) => expect(isEngaged(value as string)).toBe(expected))

  it('treats an unspecified control as engaged, not as off', () => {
    expect(isEngaged(undefined)).toBe(true)
  })
})

describe('voicesEngaging', () => {
  const presets = [
    {
      id: 'clean',
      settings: { 'test-pedal': [{ controlId: 'bypass', value: 'on', confidence: 'provisional' }] },
    },
    {
      id: 'metal',
      settings: { 'test-pedal': [{ controlId: 'bypass', value: 'off', confidence: 'provisional' }] },
    },
  ] as unknown as Preset[]

  it('splits the voices that use this pedal from the ones that do not', () => {
    const { engaged, bypassed } = voicesEngaging(device, presets, {})
    expect(engaged.map((p) => p.id)).toEqual(['clean'])
    expect(bypassed.map((p) => p.id)).toEqual(['metal'])
  })

  it('inherits the baseline when the preset says nothing', () => {
    const silent = [{ id: 'x', settings: {} }] as unknown as Preset[]
    const baseline = {
      'test-pedal': [{ controlId: 'bypass', value: 'off', confidence: 'provisional' as const }],
    }
    expect(voicesEngaging(device, silent, baseline).bypassed.map((p) => p.id)).toEqual(['x'])
  })
})

describe('knob sweep', () => {
  it('spans -135 to +135 degrees', () => {
    expect(knobAngle(0)).toBe(-135)
    expect(knobAngle(0.5)).toBe(0)
    expect(knobAngle(1)).toBe(135)
  })

  it('inverts back to a position, clamped', () => {
    expect(anglePosition(knobAngle(0.42))).toBeCloseTo(0.42, 6)
    expect(anglePosition(-400)).toBe(0)
    expect(anglePosition(400)).toBe(1)
  })
})

describe('PANEL_SHAPES', () => {
  it('has no shape that the drawing cannot render', () => {
    const drawable = new Set(['knob', 'switch', 'footswitch', 'meter'])
    for (const shape of Object.values(PANEL_SHAPES)) expect(drawable.has(shape)).toBe(true)
  })
})
