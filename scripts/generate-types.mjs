import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'json-schema-to-typescript'

/**
 * Generates src/types.generated.ts from schemas/. The schemas are the contract;
 * hand-editing the generated file is what let types.ts drift from the data
 * before, so CI re-runs this and fails on any diff.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(root, 'src/types.generated.ts')

const sources = [
  { file: 'schemas/devices.schema.json', name: 'DeviceCatalog' },
  { file: 'schemas/rig.schema.json', name: 'Rig' },
  { file: 'schemas/tuning-log.schema.json', name: 'TuningLog' },
  { file: 'schemas/device-guides.schema.json', name: 'DeviceGuides' },
]

const options = {
  bannerComment: '',
  additionalProperties: false,
  declareExternallyReferenced: true,
  enableConstEnums: false,
  style: { semi: false, singleQuote: true, printWidth: 110 },
}

/**
 * `if/then` and `oneOf` express *validation* constraints that ajv enforces at
 * check time. Left in place they compile to unusable intersections of identical
 * members, so strip them and keep the property shape.
 */
function stripConditionals(node) {
  if (Array.isArray(node)) return node.forEach(stripConditionals)
  if (!node || typeof node !== 'object') return
  delete node.allOf
  delete node.oneOf
  // `minItems` compiles to a `[T, ...T[]]` tuple that fights every `.filter()`
  // downstream for no type-safety gain; ajv already enforces the cardinality.
  delete node.minItems
  for (const value of Object.values(node)) stripConditionals(value)
}

/** Shared `$defs` (Id, Scalar) compile once per schema; keep the first. */
function dedupeDeclarations(source) {
  const seen = new Set()
  return source.replace(/^export (?:type|interface) (\w+)[\s\S]*?(?=\n(?:export |$))/gm, (block, name) => {
    if (seen.has(name)) return ''
    seen.add(name)
    return block
  })
}

const blocks = []
for (const { file, name } of sources) {
  const schema = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  // `$schema` is a file-level authoring aid, not part of the domain model.
  delete schema.properties.$schema
  schema.required = (schema.required ?? []).filter((key) => key !== '$schema')
  stripConditionals(schema)
  schema.title = name
  blocks.push((await compile(schema, name, options)).trim())
}

const banner = `// Generated from schemas/ by scripts/generate-types.mjs — do not edit.
// Run \`npm run generate:types\` after changing a schema.
`
fs.writeFileSync(
  OUTPUT,
  banner +
    '\n' +
    dedupeDeclarations(blocks.join('\n\n'))
      .replace(/\n{3,}/g, '\n\n')
      .trim() +
    '\n',
)
console.log(`Wrote ${path.relative(root, OUTPUT)} from ${sources.length} schemas`)
