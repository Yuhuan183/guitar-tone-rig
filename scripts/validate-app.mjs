import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Route and link integrity, plus the parts of design-system/MASTER.md that can
 * be checked mechanically. MASTER.md previously named three anti-patterns that
 * the implementation was violating, because nothing enforced it.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const devices = JSON.parse(read('data/devices.json')).devices
const errors = []

const routes = new Set(['/', '/presets', '/signal-chain', '/library'])
for (const device of devices) routes.add(`/devices/${device.id}`)

const sourceFiles = []
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) visit(target)
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) sourceFiles.push(target)
  }
}
visit(path.join(root, 'src'))

const appSource = new Map(
  sourceFiles.map((file) => [path.relative(root, file), fs.readFileSync(file, 'utf8')]),
)

for (const [file, source] of appSource) {
  for (const match of source.matchAll(/\bto="(\/[^"]*)"/g)) {
    if (!routes.has(match[1])) errors.push(`${file}: unknown route ${match[1]}`)
  }
  for (const match of source.matchAll(/\bhref="((?:data|schemas)\/[^"]+)"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) errors.push(`${file}: missing file ${match[1]}`)
  }
  // Zero padding must come from pad2(); `0{n}` silently breaks past nine.
  for (const match of source.matchAll(/>0\{/g)) {
    errors.push(`${file}: hard-coded zero padding near "${match[0]}" — use pad2()`)
  }
}

// Every route must be reachable from the shell at every breakpoint. The sidebar
// and footer are lg-only, so anything not in the bottom bar is mobile-orphaned.
const shell = appSource.get('src/components/AppShell.tsx') ?? ''
const shellRoutes = new Set([...shell.matchAll(/to:\s*'([^']+)'/g)].map((match) => match[1]))
const reachableElsewhere = new Set(shellRoutes)
for (const route of routes) {
  if (route.startsWith('/devices/')) continue
  if (!reachableElsewhere.has(route)) {
    errors.push(`AppShell: ${route} 在手機上沒有導覽入口（sidebar 與 footer 都是 lg-only）`)
  }
}

const styles = read('src/styles.css')

// Component classes must be layered, or they outrank every Tailwind utility and
// `lg:hidden` stops working on anything that declares `display`.
const componentLayerStart = styles.indexOf('@layer components {')
if (componentLayerStart === -1) errors.push('styles.css: 缺少 @layer components')
else {
  const beforeLayer = styles.slice(0, componentLayerStart)
  const strayClassRule = beforeLayer.match(/^\.[a-z][\w-]*\s*(?:,|\{)/m)
  if (strayClassRule) {
    errors.push(
      `styles.css: class rule "${strayClassRule[0].trim()}" 在 layer 之外，會覆寫 Tailwind utilities`,
    )
  }
}

// `justify-content`/`align-items` are inert without a flex or grid display.
// `.mobile-header` set both and rendered as a block, so the brand and the
// status pill sat next to each other instead of at opposite edges. Declarations
// are unioned across the file because media queries legitimately override just
// one property of a base rule.
const flexProps = new Map()
for (const rule of styles.matchAll(/(\.[\w-]+)(?:\s*,\s*\.[\w-]+)*\s*\{([^}]*)\}/g)) {
  const [, selector, body] = rule
  const entry = flexProps.get(selector) ?? { uses: false, display: false }
  entry.uses ||= /(?:justify-content|align-items)\s*:/.test(body)
  entry.display ||= /display\s*:\s*(?:inline-)?(?:flex|grid)/.test(body)
  flexProps.set(selector, entry)
}
for (const [selector, { uses, display }] of flexProps) {
  if (uses && !display) {
    errors.push(`styles.css: ${selector} 使用 justify-content/align-items 但沒有 flex/grid display`)
  }
}

// ---------------------------------------------------------------------------
// Contrast is computed from the tokens, not pattern-matched. An alpha
// threshold is only a proxy: it passes a palette change that darkens the
// surfaces underneath and quietly drops the ratio below the requirement.
// ---------------------------------------------------------------------------
const token = (name) => {
  const match = styles.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))
  return match ? match[1].trim() : null
}

/** Resolves a token to [r, g, b, a], following var() indirection. */
function resolveColor(value, depth = 0) {
  if (!value || depth > 4) return null
  const indirect = value.match(/^var\((--[\w-]+)\)$/)
  if (indirect) return resolveColor(token(indirect[1]), depth + 1)
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const rgb = value.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
  return null
}

const channel = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const over = ([r, g, b, a], bg) => [0, 1, 2].map((i) => Math.round([r, g, b][i] * a + bg[i] * (1 - a)))
const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const surfaces = ['--ink-1000', '--ink-950', '--ink-900', '--ink-850']
  .map((name) => ({ name, rgb: resolveColor(token(name)) }))
  .filter((surface) => surface.rgb)
if (surfaces.length < 4) errors.push('styles.css: 無法解析全部四層 surface token')

const requireRatio = (colorToken, minimum, what) => {
  const color = resolveColor(token(colorToken))
  if (!color) {
    errors.push(`styles.css: 無法解析 ${colorToken}`)
    return
  }
  for (const surface of surfaces) {
    const ratio = contrast(over(color, surface.rgb), surface.rgb)
    if (ratio < minimum) {
      errors.push(
        `styles.css: ${colorToken} 在 ${surface.name} 上是 ${ratio.toFixed(2)}:1，${what}需要 ${minimum}:1`,
      )
    }
  }
}

// WCAG 1.4.11: interactive boundaries and the focus indicator need 3:1.
requireRatio('--color-border-strong', 3, '互動元件邊界')
requireRatio('--focus-ring', 3, 'focus ring')
// WCAG 1.4.3: text needs 4.5:1.
requireRatio('--color-foreground', 4.5, '主要文字')
requireRatio('--color-muted-foreground', 4.5, '次要文字')
requireRatio('--color-accent-hover', 4.5, '強調文字')
requireRatio('--color-warning-default', 4.5, '警告文字')
requireRatio('--color-danger-default', 4.5, '危險文字')
requireRatio('--color-success-default', 4.5, '成功文字')

// Every font-size in the stylesheet must come from the --text-* scale.
const typeScale = new Set([...styles.matchAll(/^\s*--text-[\w-]+:\s*([\d.]+rem);/gm)].map((m) => m[1]))
const offScale = [...new Set([...styles.matchAll(/font-size:\s*([\d.]+rem)\s*;/g)].map((m) => m[1]))].filter(
  (size) => !typeScale.has(size),
)
if (offScale.length) errors.push(`styles.css: font-size 不在 --text-* 尺度內：${offScale.join(', ')}`)
for (const selector of [
  '.control-select',
  '.choice-button',
  '.device-tab',
  '.preset-tab',
  '.icon-button',
  '.secondary-button',
  '.reference-link',
]) {
  const rule = styles.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))
  if (rule && /border:\s*1px solid var\(--color-border\)/.test(rule[1])) {
    errors.push(`styles.css: ${selector} 是互動元件，邊界應使用 --color-border-strong`)
  }
}

// The type scale is only a scale if the components obey it too. Arbitrary
// Tailwind font sizes were how `text-[10px]` got copied around before.
for (const [file, source] of appSource) {
  for (const match of source.matchAll(/\btext-\[[^\]]*(?:px|rem)[^\]]*\]/g)) {
    errors.push(`${file}: ${match[0]} 不在 --text-* 尺度內，請用 text-3xs … text-lg`)
  }
}

// Fluid values come from the scale registry, never from a hand-written clamp.
for (const match of styles.matchAll(/clamp\([^)]*vw[^)]*\)/g)) {
  errors.push(`styles.css: 手寫 clamp "${match[0]}"，請在 src/lib/responsive.ts 註冊 scale`)
}
for (const [file, source] of appSource) {
  // The registry itself is where clamps are allowed to be discussed and built.
  if (file === 'src/lib/responsive.ts') continue
  for (const match of source.matchAll(/clamp\([^)]*vw[^)]*\)/g)) {
    errors.push(`${file}: 手寫 clamp "${match[0]}"，請在 src/lib/responsive.ts 註冊 scale`)
  }
}

// Every panel control type must have a shape in src/lib/panel.ts, or it would
// be dropped from the board diagram without a word.
const panelSource = appSource.get('src/lib/panel.ts') ?? ''
const shapeBlock = panelSource.match(/PANEL_SHAPES: Record<string, PanelShape> = \{([\s\S]*?)\n\}/)
const mappedTypes = new Set(
  [...(shapeBlock?.[1] ?? '').matchAll(/^\s*'?([\w-]+)'?:/gm)].map((match) => match[1]),
)
for (const device of devices) {
  for (const control of device.controls) {
    if (control.surface === 'panel' && !mappedTypes.has(control.type)) {
      errors.push(`panel.ts: ${device.id}.${control.id} 的 type "${control.type}" 沒有對應的 PanelShape`)
    }
  }
}
// Cover the whole vocabulary, not just the part in use today: a shape that
// only appears once a device happens to need it is a shape nobody tested.
const typeEnum = JSON.parse(read('schemas/devices.schema.json')).$defs.control.properties.type.enum
for (const type of typeEnum) {
  if (!mappedTypes.has(type)) errors.push(`panel.ts: PANEL_SHAPES 缺少 type "${type}"`)
}
for (const type of mappedTypes) {
  if (!typeEnum.includes(type)) errors.push(`panel.ts: PANEL_SHAPES 有 schema 不承認的 type "${type}"`)
}

// Same argument one level down: value.ts turns a control into a 0–1 position
// and back, and a valueType it never names falls through to the numeric
// fallback — drawn at mid-travel, and written back as a float where the schema
// wants a clock string or a boolean. 'boolean' was in the enum unhandled.
const valueSource = appSource.get('src/lib/value.ts') ?? ''
const valueTypeEnum = JSON.parse(read('schemas/devices.schema.json')).$defs.control.properties.valueType.enum
const positionFunctions = [
  ...valueSource.matchAll(/export function (valuePosition|positionValue|nudge)\b([\s\S]*?)\n\}/g),
]
if (positionFunctions.length !== 3) {
  errors.push(`value.ts: 找不到三個位置換算函式（比對到 ${positionFunctions.length} 個），檢查已失效`)
}
for (const [, name, body] of positionFunctions) {
  for (const valueType of valueTypeEnum) {
    if (!body.includes(`valueType === '${valueType}'`)) {
      errors.push(`value.ts: ${name} 沒有處理 valueType "${valueType}"`)
    }
  }
}

// The enclosure colours are authored in data/devices.json, so the CSS token
// check above never sees them. A pedal's legend is text on its body and has to
// be readable at the same threshold as everything else.
for (const device of devices) {
  const body = resolveColor(device.appearance.body)
  const face = resolveColor(device.appearance.face)
  if (!body || !face) {
    errors.push(`devices.json: ${device.id} 的 appearance 顏色無法解析`)
    continue
  }
  const ratio = contrast(face, body)
  if (ratio < 4.5) {
    errors.push(`devices.json: ${device.id} 的 face 在 body 上只有 ${ratio.toFixed(2)}:1，面板文字需要 4.5:1`)
  }
}

// The workbench legend explains the schema to a reader. If the schema grows a
// fifth value shape or a fourth status, an unexplained one is worse than none.
const presetsSource = appSource.get('src/pages/PresetsPage.tsx') ?? ''
const legend = (name) => {
  const block = presetsSource.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\]`))
  return new Set([...(block?.[1] ?? '').matchAll(/^\s*\['([\w-]+)'/gm)].map((match) => match[1]))
}
const rigSchema = JSON.parse(read('schemas/rig.schema.json'))
const shapes = rigSchema.$defs.setting.oneOf.flatMap((branch) => branch.required)
const confidences = rigSchema.$defs.setting.properties.confidence.enum
for (const [name, expected] of [
  ['valueShapes', shapes],
  ['settingStates', confidences],
]) {
  const documented = legend(name)
  for (const value of expected) {
    if (!documented.has(value)) errors.push(`PresetsPage.tsx: ${name} 沒有解釋 "${value}"`)
  }
  for (const value of documented) {
    if (!expected.includes(value)) errors.push(`PresetsPage.tsx: ${name} 解釋了不存在的 "${value}"`)
  }
}

// Same failure mode one level up: an unlabelled `surface` falls through to the
// raw enum value in the control index, which reads as a leaked identifier.
const librarySource = appSource.get('src/pages/LibraryPage.tsx') ?? ''
const surfaceBlock = librarySource.match(/SURFACE_LABEL: Record<string, string> = \{([\s\S]*?)\n\}/)
const labelledSurfaces = new Set(
  [...(surfaceBlock?.[1] ?? '').matchAll(/^\s*'?([\w-]+)'?:/gm)].map((match) => match[1]),
)
for (const device of devices) {
  for (const control of device.controls) {
    if (!labelledSurfaces.has(control.surface)) {
      errors.push(
        `LibraryPage.tsx: ${device.id}.${control.id} 的 surface "${control.surface}" 沒有對應的 SURFACE_LABEL`,
      )
    }
  }
}

// Every class that has a rule must be reachable from a component. Four rules
// survived the page that used them and kept shipping in the bundle; nothing
// noticed because dead CSS never throws. Names built by template literal —
// `notice-${tone}` — count as used via their prefix, which is why a class is
// checked against every dash-separated prefix of itself before being blamed.
const authoredClasses = new Set(
  [...styles.matchAll(/(?<![\w-])\.([a-z][\w-]*)\s*(?=[{,:.\s])/g)].map((match) => match[1]),
)
// A class only ever named inside a :not() or a compound selector is a hook for
// components to opt into, not a rule of its own.
const declared = new Set([...styles.matchAll(/^\s*\.([a-z][\w-]*)[^{\n]*\{/gm)].map((match) => match[1]))
const componentText = [...appSource.entries()]
  .filter(([file]) => file.endsWith('.tsx') || file.endsWith('.ts'))
  .map(([, source]) => source)
  .join('\n')
const reachable = (name) => {
  const parts = name.split('-')
  for (let end = parts.length; end > 0; end -= 1) {
    const candidate = parts.slice(0, end).join('-')
    if (new RegExp(`(?<![\\w-])${candidate}(?![\\w-])`).test(componentText)) return true
  }
  return false
}
for (const name of [...authoredClasses].sort()) {
  if (declared.has(name) && !reachable(name)) {
    errors.push(`styles.css: .${name} 沒有任何元件用到`)
  }
}

// A literal port is free only by luck and collides with whatever else the
// machine is running; scripts/pick-port.mjs derives one per project instead.
const viteConfig = read('vite.config.ts')
for (const match of viteConfig.matchAll(/\bport:\s*(\d+)/g)) {
  errors.push(`vite.config.ts: port 寫死為 ${match[1]}，請用 pickPort() 依專案推導`)
}
if (!viteConfig.includes('pickPort')) errors.push('vite.config.ts: 沒有使用 pickPort()')

for (const target of [
  'data/devices.json',
  'data/rig.json',
  'data/tuning-log.json',
  'data/device-guides.json',
]) {
  if (!fs.existsSync(path.join(root, target))) errors.push(`missing ${target}`)
}

const dist = path.join(root, 'dist')
if (fs.existsSync(dist)) {
  for (const target of [
    'data/devices.json',
    'data/rig.json',
    'data/tuning-log.json',
    'data/device-guides.json',
    'schemas/devices.schema.json',
    'schemas/rig.schema.json',
    'schemas/tuning-log.schema.json',
    'schemas/device-guides.schema.json',
  ]) {
    if (!fs.existsSync(path.join(dist, target))) errors.push(`dist: missing ${target}`)
  }
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join('\n'))
  process.exit(1)
}

console.log(`Routes: ${routes.size}`)
console.log(`Source files checked: ${sourceFiles.length}`)
console.log('Routes, links and design-system invariants: OK')
