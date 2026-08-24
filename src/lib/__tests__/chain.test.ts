import { describe, expect, it } from 'vitest'
import { adjacent, chainOrder, devicesByPlacement } from '../chain'
import type { Device, DeviceCatalog, Rig } from '../../types'

const make = (id: string) => ({ id, model: id }) as Device
const [a, b, c] = ['a', 'b', 'c'].map(make)
const byId = new Map([a, b, c].map((d) => [d.id, d]))

const rig = {
  signalChain: [
    { order: 1, kind: 'endpoint', id: 'guitar', label: 'Guitar' },
    { order: 2, kind: 'device', deviceId: 'a' },
    { order: 3, kind: 'device', deviceId: 'b' },
    { order: 4, kind: 'device', deviceId: 'c' },
    { order: 5, kind: 'endpoint', id: 'out', label: 'Out' },
  ],
} as unknown as Rig

describe('chainOrder', () => {
  it('keeps devices in signal order and drops endpoints', () => {
    expect(chainOrder(rig, byId).map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('skips a deviceId with no device rather than emitting a hole', () => {
    const broken = { signalChain: [{ order: 1, kind: 'device', deviceId: 'ghost' }] } as unknown as Rig
    expect(chainOrder(broken, byId)).toEqual([])
  })
})

describe('adjacent', () => {
  it('has no previous at the head and no next at the tail', () => {
    expect(adjacent([a, b, c], 'a')).toMatchObject({ position: 1, total: 3, previous: undefined, next: b })
    expect(adjacent([a, b, c], 'c')).toMatchObject({ position: 3, previous: b, next: undefined })
  })

  it('has both in the middle', () => {
    expect(adjacent([a, b, c], 'b')).toMatchObject({ previous: a, next: b === b ? c : c })
  })

  it('reports neither for a device that is not on the chain', () => {
    expect(adjacent([a, b, c], 'zzz')).toMatchObject({ position: 0, previous: undefined, next: undefined })
  })
})

describe('devicesByPlacement', () => {
  const catalog = {
    devices: [
      { ...a, placement: 'chain' },
      { ...b, placement: 'chain' },
      { ...make('d'), placement: 'reference' },
    ],
  } as unknown as DeviceCatalog

  it('separates the routed devices from the comparison shelf', () => {
    expect(devicesByPlacement(catalog, 'chain').map((d) => d.id)).toEqual(['a', 'b'])
    expect(devicesByPlacement(catalog, 'reference').map((d) => d.id)).toEqual(['d'])
  })

  it('returns an empty list rather than undefined when nothing matches', () => {
    const chainOnly = { devices: [{ ...a, placement: 'chain' }] } as unknown as DeviceCatalog
    expect(devicesByPlacement(chainOnly, 'reference')).toEqual([])
  })
})
