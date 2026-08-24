import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Formats the knowledge JSON with 2-space indentation, but keeps leaf records
 * (a control, a section, a setting, a route) on a single line so a device or a
 * preset reads as a table in a diff instead of a 12-line block per row.
 *
 * Run with CHECK_ONLY=1 to fail instead of rewriting.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_INLINE = 200

/** A record is inlinable when it contains only primitives and primitive arrays. */
const isRecord = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (item) =>
      item === null ||
      typeof item !== 'object' ||
      (Array.isArray(item) && item.every((entry) => entry === null || typeof entry !== 'object')),
  )

/** JSON.stringify with a space after `:` and `,`, which reads better inline. */
const inline = (value) => {
  if (Array.isArray(value)) return '[' + value.map(inline).join(', ') + ']'
  if (value !== null && typeof value === 'object') {
    return (
      '{ ' +
      Object.entries(value)
        .map(([k, v]) => JSON.stringify(k) + ': ' + inline(v))
        .join(', ') +
      ' }'
    )
  }
  return JSON.stringify(value)
}

function render(value, depth) {
  const pad = '  '.repeat(depth)
  const inner = '  '.repeat(depth + 1)

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const flat = inline(value)
    if (value.every((item) => item === null || typeof item !== 'object') && flat.length <= MAX_INLINE)
      return flat
    return '[\n' + value.map((item) => inner + render(item, depth + 1)).join(',\n') + '\n' + pad + ']'
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    if (!entries.length) return '{}'
    const flat = inline(value)
    if (isRecord(value) && flat.length <= MAX_INLINE) return flat
    return (
      '{\n' +
      entries.map(([k, v]) => inner + JSON.stringify(k) + ': ' + render(v, depth + 1)).join(',\n') +
      '\n' +
      pad +
      '}'
    )
  }

  return JSON.stringify(value)
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['data/devices.json', 'data/rig.json', 'data/tuning-log.json', 'data/device-guides.json']

const drifted = []
for (const target of targets) {
  const file = path.join(root, target)
  if (!fs.existsSync(file)) continue
  const before = fs.readFileSync(file, 'utf8')
  const after = render(JSON.parse(before), 0) + '\n'
  if (before === after) {
    console.log(`${target}: ok`)
    continue
  }
  drifted.push(target)
  if (process.env.CHECK_ONLY) console.error(`${target}: not formatted`)
  else {
    fs.writeFileSync(file, after)
    console.log(`${target}: formatted`)
  }
}

if (process.env.CHECK_ONLY && drifted.length) {
  console.error(`\nRun: npm run format:data`)
  process.exit(1)
}
