import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Fails when a generated artifact or the data formatting is out of date with
 * its source. This is the check that would have caught src/types.ts declaring
 * a `Preset.description` the data never had.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generated = [
  {
    file: 'src/types.generated.ts',
    script: 'scripts/generate-types.mjs',
    command: 'npm run generate:types',
    source: 'schemas/',
  },
  {
    file: 'src/responsive.generated.css',
    script: 'scripts/generate-responsive.mjs',
    command: 'npm run generate:responsive',
    source: 'src/lib/responsive.ts',
  },
]

for (const { file, script, command, source } of generated) {
  const target = path.join(root, file)
  const existed = fs.existsSync(target)
  const before = existed ? fs.readFileSync(target, 'utf8') : ''
  execFileSync(process.execPath, [path.join(root, script)], { cwd: root, stdio: 'pipe' })
  if (fs.readFileSync(target, 'utf8') !== before) {
    // Leave the tree exactly as it was found. Writing `before` back when the
    // artifact was absent would replace a missing file with an empty one, and
    // the typecheck that follows would fail on that instead of on the message.
    if (existed) fs.writeFileSync(target, before)
    else fs.rmSync(target)
    console.error(`ERROR: ${file} 與 ${source} 不同步。執行：${command}`)
    process.exit(1)
  }
}

execFileSync(process.execPath, [path.join(root, 'scripts/format-data.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CHECK_ONLY: '1' },
})

console.log('Generated types and data formatting: in sync')
