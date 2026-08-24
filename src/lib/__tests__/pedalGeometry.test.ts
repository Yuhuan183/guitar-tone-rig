import { describe, expect, it } from 'vitest'
import { MIN_TARGET_PX, pedalGeometry } from '../pedalGeometry'
import { panelLayout } from '../panel'
import type { Control, Device } from '../../types'

const knob = (id: string): Control => ({
  id,
  label: id,
  section: 'pedal',
  type: 'knob',
  valueType: 'clock',
  surface: 'panel',
})

const device = (count: number, widthUnits = 2, heightUnits = 1.4): Device => ({
  id: 'p',
  manufacturer: 'm',
  model: 'M',
  category: 'gain',
  subtype: 's',
  primaryRole: 'r',
  placement: 'chain',
  appearance: { widthUnits, heightUnits, body: '#000000', face: '#ffffff' },
  sections: [{ id: 'pedal', label: 'pedal' }],
  controls: Array.from({ length: count }, (_, i) => knob(`k${i}`)),
})

const geometryFor = (count: number, w?: number, h?: number) => {
  const d = device(count, w, h)
  return pedalGeometry(d, panelLayout(d, []))
}

describe('pedalGeometry', () => {
  it('uses the declared enclosure size as the viewBox', () => {
    const g = geometryFor(4, 2.4, 1.15)
    expect(g.width).toBe(2.4)
    expect(g.height).toBe(1.15)
  })

  it('keeps every control inside the enclosure', () => {
    for (const count of [1, 4, 8, 13, 19]) {
      const g = geometryFor(count)
      for (const { x, y } of [...g.knobs, ...g.switches, ...g.footswitches]) {
        expect(x).toBeGreaterThan(0)
        expect(x).toBeLessThan(g.width)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(g.height)
      }
    }
  })

  it('shrinks the knobs rather than overflowing when there are many', () => {
    expect(geometryFor(16).knobRadius).toBeLessThan(geometryFor(2).knobRadius)
  })

  it('fits more per row on a wider enclosure', () => {
    const narrow = geometryFor(8, 1)
    const wide = geometryFor(8, 3)
    const rowsOf = (g: ReturnType<typeof pedalGeometry>) => new Set(g.knobs.map((k) => k.y.toFixed(4))).size
    expect(rowsOf(wide)).toBeLessThan(rowsOf(narrow))
  })

  it('spaces a row evenly and symmetrically', () => {
    const g = geometryFor(2, 2)
    const [left, right] = g.knobs
    expect(left.y).toBe(right.y)
    expect(left.x + right.x).toBeCloseTo(g.width, 5)
  })

  it('handles a device with no panel controls at all', () => {
    const g = geometryFor(0)
    expect(g.knobs).toEqual([])
    expect(g.width).toBeGreaterThan(0)
  })
})

describe('minInteractiveScale', () => {
  it('is high enough that the smallest control meets the touch minimum', () => {
    for (const count of [1, 5, 9, 13, 19]) {
      const g = geometryFor(count, 2.4, 1.15)
      const drawn = g.knobRadius * 2 * 1.55 * g.minInteractiveScale
      expect(drawn).toBeGreaterThanOrEqual(MIN_TARGET_PX - 0.01)
    }
  })

  it('demands a bigger scale for a denser enclosure', () => {
    expect(geometryFor(16, 2.4, 1.15).minInteractiveScale).toBeGreaterThan(
      geometryFor(3, 2.4, 1.15).minInteractiveScale,
    )
  })
})
