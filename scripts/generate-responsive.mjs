import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

/**
 * Emits src/responsive.generated.css from the scale registry in
 * src/lib/responsive.ts, so the stylesheet and the TypeScript agree by
 * construction. `npm run validate:generated` fails on any drift.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(root, 'src/responsive.generated.css')

const bundle = await build({
  entryPoints: [path.join(root, 'src/lib/responsive.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
})
const temporary = path.join(root, 'node_modules/.tmp/responsive.mjs')
fs.mkdirSync(path.dirname(temporary), { recursive: true })
fs.writeFileSync(temporary, bundle.outputFiles[0].text)

const { SCALES, scaleDeclarations, breakpointDeclarations } = await import(
  `${pathToFileURL(temporary).href}?v=${Date.now()}`
)

const notes = Object.entries(SCALES)
  .filter(([, scale]) => scale.note)
  .map(([name, scale]) => `   --scale-${name}: ${scale.note}`)

const css = `/* Generated from src/lib/responsive.ts by scripts/generate-responsive.mjs.
   Do not edit; run \`npm run generate:responsive\`.

${notes.join('\n')} */

:root {
${breakpointDeclarations()
  .map((line) => `  ${line}`)
  .join('\n')}

${scaleDeclarations()
  .map((line) => `  ${line}`)
  .join('\n')}
}
`

fs.writeFileSync(OUTPUT, css)
console.log(`Wrote ${path.relative(root, OUTPUT)} (${Object.keys(SCALES).length} scales)`)
