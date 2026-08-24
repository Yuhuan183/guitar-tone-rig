import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePreset } from '../src/lib/merge.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rig = JSON.parse(fs.readFileSync(path.join(root, 'data/rig.json'), 'utf8'))
const presetId = process.argv[2]

if (!presetId) {
  console.error(
    `Usage: node scripts/show-preset.mjs <preset-id>\nAvailable: ${rig.presets.map((preset) => preset.id).join(', ')}`,
  )
  process.exit(1)
}

let resolved
try {
  resolved = resolvePreset(rig, presetId)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const { preset, settings } = resolved
console.log(
  JSON.stringify(
    {
      rigId: rig.rigId,
      rigVersion: rig.rigVersion,
      preset: {
        id: preset.id,
        name: preset.name,
        status: preset.status,
        target: preset.target,
        genres: preset.genres,
        pickupPreference: preset.pickupPreference,
        settings,
      },
    },
    null,
    2,
  ),
)
