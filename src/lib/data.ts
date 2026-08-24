import devicesJson from '../../data/devices.json'
import guidesJson from '../../data/device-guides.json'
import rigJson from '../../data/rig.json'
import type { DeviceCatalog, DeviceGuides, Rig } from '../types'

/**
 * The single place the bundled JSON enters the app. Everything else takes what
 * it needs as an argument, which is what keeps the rest of lib/ pure and
 * testable without loading the real rig.
 *
 * The assertions are checked by `npm run validate:data` against the same
 * schemas that generate src/types.generated.ts; TypeScript cannot narrow the
 * literal strings it infers from a JSON import into the schema's enums.
 */
export const catalog = devicesJson as unknown as DeviceCatalog
export const rig = rigJson as unknown as Rig
export const guides = guidesJson as unknown as DeviceGuides

export const deviceById = new Map(catalog.devices.map((device) => [device.id, device]))
export const presetById = new Map(rig.presets.map((preset) => [preset.id, preset]))

export const categoryLabel = (category: string): string => catalog.categoryLabels[category] ?? category
