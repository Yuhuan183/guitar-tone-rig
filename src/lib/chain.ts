import type { Device, DeviceCatalog, Rig } from '../types'

/** Devices in signal order — the order they are actually dialled in. */
export function chainOrder(rig: Rig, byId: Map<string, Device>): Device[] {
  return rig.signalChain.flatMap((node) =>
    node.kind === 'device' && node.deviceId ? (byId.get(node.deviceId) ?? []) : [],
  )
}

export interface Adjacent {
  position: number
  total: number
  previous?: Device
  next?: Device
}

/** Previous and next stage, so a device page can be walked like the chain. */
export function adjacent(devices: Device[], deviceId: string): Adjacent {
  const index = devices.findIndex((device) => device.id === deviceId)
  return {
    position: index + 1,
    total: devices.length,
    previous: index > 0 ? devices[index - 1] : undefined,
    next: index >= 0 && index < devices.length - 1 ? devices[index + 1] : undefined,
  }
}

/**
 * Catalog entries by declared placement. `reference` devices are kept for
 * comparison and chain evaluation and are deliberately not routed, so nothing
 * that walks the chain should reach for the catalog directly.
 */
export const devicesByPlacement = (catalog: DeviceCatalog, placement: Device['placement']): Device[] =>
  catalog.devices.filter((device) => device.placement === placement)
