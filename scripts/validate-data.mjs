import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { CLOCK_PATTERN, clockToStep, isClock } from '../src/lib/clock.mjs'

/**
 * Two layers of checking:
 *  1. every document against its JSON Schema (shape, enums, patterns, oneOf),
 *  2. cross-document references that a schema cannot express (does this
 *     controlId exist on that device, is every category labelled, and so on).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))

const documents = {
  devices: { file: 'data/devices.json', schema: 'schemas/devices.schema.json' },
  rig: { file: 'data/rig.json', schema: 'schemas/rig.schema.json' },
  tuningLog: { file: 'data/tuning-log.json', schema: 'schemas/tuning-log.schema.json' },
  guides: { file: 'data/device-guides.json', schema: 'schemas/device-guides.schema.json' },
}

const errors = []
// strictRequired off: `if/then: { required: [...] }` is the idiomatic way to
// make `options` conditional on valueType, and does not redeclare properties.
// allowUnionTypes on: a control value is genuinely string | number | boolean.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true })
addFormats(ajv)

const loaded = {}
for (const [name, { file, schema: schemaPath }] of Object.entries(documents)) {
  const schema = readJson(schemaPath)
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push(`${schemaPath} 不是 JSON Schema 2020-12`)
    continue
  }
  const document = readJson(file)
  loaded[name] = document
  const validate = ajv.compile(schema)
  if (!validate(document)) {
    for (const error of validate.errors) {
      errors.push(
        `${file}${error.instancePath || ''}: ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ''}`,
      )
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join('\n'))
  process.exit(1)
}

const { devices: devicesDocument, rig, tuningLog, guides: guidesDocument } = loaded
const devices = new Map(devicesDocument.devices.map((device) => [device.id, device]))

const requireUnique = (values, label) => {
  const seen = new Set()
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label} 重複：${value}`)
    seen.add(value)
  }
}

requireUnique(
  devicesDocument.devices.map((device) => device.id),
  'deviceId',
)

for (const device of devices.values()) {
  requireUnique(
    device.controls.map((control) => control.id),
    `${device.id} controlId`,
  )
  requireUnique(
    device.sections.map((section) => section.id),
    `${device.id} sectionId`,
  )

  if (!devicesDocument.categoryLabels[device.category]) {
    errors.push(`categoryLabels 缺少 ${device.category}（${device.id} 使用中）`)
  }

  const declaredSections = new Set(device.sections.map((section) => section.id))
  const usedSections = new Set(device.controls.map((control) => control.section))
  for (const section of usedSections) {
    if (!declaredSections.has(section)) errors.push(`${device.id}: control 使用未宣告的 section ${section}`)
  }
  for (const section of declaredSections) {
    if (!usedSections.has(section)) errors.push(`${device.id}: section ${section} 沒有任何 control`)
  }

  for (const control of device.controls) {
    if (control.valueType === 'number' && control.min >= control.max) {
      errors.push(`${device.id}.${control.id}: min 必須小於 max`)
    }
  }
}

// JSON Schema cannot import the scale, so rig.schema.json spells the pattern
// out a second time. Hold the two together rather than discover the drift when
// the app accepts a value the schema rejects.
{
  const schemaPattern = readJson('schemas/rig.schema.json').$defs.clock.pattern
  if (schemaPattern !== CLOCK_PATTERN.source) {
    errors.push(
      `rig.schema.json: $defs.clock.pattern 與 clock.mjs 的 CLOCK_PATTERN 不同（${schemaPattern} vs ${CLOCK_PATTERN.source}）`,
    )
  }
}

const validateScalar = (deviceId, control, value, location) => {
  // isClock, not a second copy of the pattern: widen or narrow the scale in
  // clock.mjs and the app and this validator have to move together.
  if (control.valueType === 'clock' && !isClock(value)) {
    errors.push(`${location}: ${deviceId}.${control.id} 不是 30 分鐘刻度的鐘點值：${value}`)
  }
  if (control.valueType === 'number') {
    if (typeof value !== 'number') errors.push(`${location}: ${deviceId}.${control.id} 必須是數字`)
    else if (value < control.min || value > control.max) {
      errors.push(`${location}: ${deviceId}.${control.id} 超出 ${control.min}–${control.max}：${value}`)
    }
  }
  if (control.valueType === 'enum' && !control.options.includes(value)) {
    errors.push(`${location}: ${deviceId}.${control.id} 不接受 ${value}`)
  }
  if (control.valueType === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${location}: ${deviceId}.${control.id} 必須是布林值`)
  }
}

const validateSettingsMap = (settingsMap, location) => {
  for (const [deviceId, settings] of Object.entries(settingsMap)) {
    const device = devices.get(deviceId)
    if (!device) {
      errors.push(`${location}: 找不到 deviceId ${deviceId}`)
      continue
    }
    if (device.placement === 'reference') {
      errors.push(`${location}: ${deviceId} 是參考機種，不該有這條鏈的設定值`)
    }
    const controls = new Map(device.controls.map((control) => [control.id, control]))
    requireUnique(
      settings.map((setting) => setting.controlId),
      `${location}.${deviceId} controlId`,
    )
    for (const setting of settings) {
      const control = controls.get(setting.controlId)
      if (!control) {
        errors.push(`${location}: ${deviceId} 找不到 controlId ${setting.controlId}`)
        continue
      }
      if ('value' in setting) validateScalar(deviceId, control, setting.value, location)
      if ('range' in setting) {
        validateScalar(deviceId, control, setting.range.min, location)
        validateScalar(deviceId, control, setting.range.max, location)
        // Ordered on the value's own scale. A lexical compare happens to work
        // for zero-padded HH:MM and would silently stop working for anything
        // else, so the clock scale is asked directly.
        const { min, max } = setting.range
        const ordered =
          control.valueType === 'number'
            ? min <= max
            : isClock(min) && isClock(max)
              ? clockToStep(min) <= clockToStep(max)
              : String(min) <= String(max)
        if (!ordered) errors.push(`${location}: ${deviceId}.${control.id} range min 大於 max`)
      }
      if ('choices' in setting) {
        validateScalar(deviceId, control, setting.choices.preferred, location)
        for (const alternative of setting.choices.alternatives) {
          validateScalar(deviceId, control, alternative, location)
        }
        if (setting.choices.alternatives.includes(setting.choices.preferred)) {
          errors.push(`${location}: ${deviceId}.${control.id} preferred 不應同時列在 alternatives`)
        }
      }
    }
  }
}

const deviceNodes = rig.signalChain.filter((node) => node.kind === 'device')
for (const node of deviceNodes) {
  if (!devices.has(node.deviceId)) errors.push(`signalChain 找不到 deviceId ${node.deviceId}`)
}
requireUnique(
  deviceNodes.map((node) => node.deviceId),
  'signalChain deviceId',
)
const orders = rig.signalChain.map((node) => node.order)
requireUnique(orders, 'signalChain order')
if (orders.some((order, index) => order !== index + 1)) errors.push('signalChain order 必須由 1 連續遞增')

// `placement` is the contract between the catalog and the chain, and it is
// checked in both directions: a chain device that is never routed is a hole in
// the diagram, and a reference device that appears on the chain means it was
// adopted without anyone updating the evaluation that says it was not.
for (const device of devices.values()) {
  const routed = deviceNodes.some((node) => node.deviceId === device.id)
  if (device.placement === 'chain' && !routed) {
    errors.push(`${device.id}: placement 是 chain，卻不在 signalChain 上`)
  }
  if (device.placement === 'reference' && routed) {
    errors.push(`${device.id}: placement 是 reference，卻出現在 signalChain 上`)
  }
}

const chainIds = new Set(rig.signalChain.map((node) => node.deviceId ?? node.id))
for (const route of rig.routing) {
  for (const endpoint of [route.from, route.to]) {
    const [nodeId] = endpoint.split('.')
    if (!chainIds.has(nodeId)) errors.push(`routing 端點 ${endpoint} 不在 signalChain 上`)
  }
}

// A safety rule that names no live device is a rule nobody will ever be shown.
for (const [index, safetyRule] of rig.safetyRules.entries()) {
  for (const deviceId of safetyRule.devices) {
    const device = devices.get(deviceId)
    if (!device) errors.push(`safetyRules[${index}]: 找不到 deviceId ${deviceId}`)
    else if (device.placement !== 'chain') {
      errors.push(`safetyRules[${index}]: ${deviceId} 不在鏈上，這條規則約束不到任何東西`)
    }
  }
}

// A diagnosis names the pedals it is about, so renaming or removing one is a
// failure here rather than a sentence that quietly points at nothing.
for (const [index, diagnostic] of rig.diagnostics.entries()) {
  requireUnique(diagnostic.devices, `diagnostics[${index}] deviceId`)
  for (const deviceId of diagnostic.devices) {
    const device = devices.get(deviceId)
    if (!device) errors.push(`diagnostics[${index}]: 找不到 deviceId ${deviceId}`)
    else if (device.placement !== 'chain') {
      errors.push(`diagnostics[${index}]: ${deviceId} 不在鏈上，不會是這條鏈的症狀來源`)
    }
  }
}

requireUnique(
  (rig.openSlots ?? []).map((slot) => slot.id),
  'openSlot id',
)
// An open slot is a job with no device; the moment one of its candidates is in
// the catalog the slot is filled and the shortlist is history.
for (const slot of rig.openSlots ?? []) {
  if (devices.has(slot.id)) errors.push(`openSlot ${slot.id}: 與 deviceId 撞名`)
  requireUnique(
    slot.candidates.map((candidate) => candidate.name),
    `openSlot ${slot.id} candidate`,
  )
}

validateSettingsMap(rig.baseline.settings, 'baseline')
requireUnique(
  rig.presets.map((preset) => preset.id),
  'presetId',
)
requireUnique(
  rig.presets.map((preset) => preset.rigSlot),
  'rigSlot',
)
for (const preset of rig.presets) {
  if (preset.inherits !== rig.baseline.id) errors.push(`${preset.id}: inherits 找不到 ${preset.inherits}`)
  validateSettingsMap(preset.settings, `preset.${preset.id}`)
}

// A panel control with no setting in any voice is drawn dimmed, which reads
// the same whether it was a decision or an oversight. `target` exists for the
// ones that genuinely cannot be a number, so silence is no longer an option.
const settingsEverywhere = new Set()
for (const map of [rig.baseline.settings, ...rig.presets.map((preset) => preset.settings)]) {
  for (const [deviceId, settings] of Object.entries(map)) {
    for (const setting of settings) settingsEverywhere.add(`${deviceId}.${setting.controlId}`)
  }
}
for (const device of devices.values()) {
  if (device.placement !== 'chain') continue
  for (const control of device.controls) {
    if (control.surface !== 'panel') continue
    if (!settingsEverywhere.has(`${device.id}.${control.id}`)) {
      errors.push(
        `${device.id}.${control.id}: 面板控制項在所有音色都沒有設定；不能給定值就用 target 寫下聽感目標`,
      )
    }
  }
}

if (rig.deviceCatalog !== 'devices.json') errors.push(`rig.deviceCatalog 應為 devices.json`)

// README states the rig version and status on the repository front page, which
// is the first thing a visitor reads and the last thing anyone remembers to
// update. It was already one release behind when this check was written.
{
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  for (const [field, value] of [
    ['rigVersion', rig.rigVersion],
    ['status', rig.status],
  ]) {
    if (!readme.includes(`\`${value}\``)) {
      errors.push(`README.md: 沒有提到 rig.json 目前的 ${field} \`${value}\``)
    }
  }
}

// device-guides.json is knowledge, not decoration: hold it to the same contract.
for (const [deviceId, guide] of Object.entries(guidesDocument.guides)) {
  const device = devices.get(deviceId)
  if (!device) {
    errors.push(`device-guides: 找不到 deviceId ${deviceId}`)
    continue
  }
  const controlIds = new Set(device.controls.map((control) => control.id))
  for (const controlId of Object.keys(guide.controlNotes ?? {})) {
    if (!controlIds.has(controlId)) errors.push(`device-guides.${deviceId}: 找不到 controlId ${controlId}`)
  }

  // The meter simulates one real control, so it has to name one that exists and
  // stay inside the range that control declares. DevicePage renders it purely
  // from this block; nothing in the page knows which device owns a meter.
  if (guide.meter) {
    const where = `device-guides.${deviceId}.meter`
    const control = device.controls.find((item) => item.id === guide.meter.controlId)
    if (!control) {
      errors.push(`${where}: 找不到 controlId ${guide.meter.controlId}`)
    } else if (control.type !== 'readout') {
      errors.push(`${where}: ${control.id} 是 ${control.type}，儀表只能讀 readout`)
    } else {
      const min = control.min ?? 0
      if (guide.meter.max <= min || guide.meter.max > control.max) {
        errors.push(`${where}: max ${guide.meter.max} 不在 ${control.id} 的 ${min}–${control.max} 之內`)
      }
      const marks = [
        ...guide.meter.quickValues.map((value) => ['quickValues', value]),
        ...guide.meter.bands
          .filter((band) => band.upTo !== undefined)
          .map((band) => ['bands.upTo', band.upTo]),
      ]
      for (const [field, value] of marks) {
        if (value < min || value > guide.meter.max) {
          errors.push(`${where}.${field}: ${value} 不在 ${min}–${guide.meter.max} 之內`)
        }
      }
    }
    // Without an open last band a value past every upTo reads as no text at all.
    if (guide.meter.bands.at(-1).upTo !== undefined) {
      errors.push(`${where}.bands: 最後一段必須省略 upTo，否則高值沒有對應說明`)
    }
  }

  // A comparison names another device by id, so it cannot survive that device
  // being renamed or removed without this failing.
  requireUnique(
    (guide.comparisons ?? []).map((comparison) => comparison.deviceId),
    `device-guides.${deviceId} comparisons deviceId`,
  )
  for (const comparison of guide.comparisons ?? []) {
    if (comparison.deviceId === deviceId) errors.push(`device-guides.${deviceId}: 不能和自己比較`)
    else if (!devices.has(comparison.deviceId)) {
      errors.push(`device-guides.${deviceId}.comparisons: 找不到 deviceId ${comparison.deviceId}`)
    }
  }

  // chainRole and evaluation are the two halves of the same rule: a device
  // describes either the position it holds or the case for giving it one,
  // never both, and never neither.
  if (device.placement === 'chain' && !guide.chainRole) {
    errors.push(`device-guides.${deviceId}: 在鏈上的效果器必須有 chainRole`)
  }
  if (device.placement === 'reference' && guide.chainRole) {
    errors.push(`device-guides.${deviceId}: 參考機種沒有位置，不該有 chainRole`)
  }

  // An evaluation is what a reference device is for; a device already on the
  // chain has finished being evaluated, so carrying one is stale data.
  if (device.placement === 'reference' && !guide.evaluation) {
    errors.push(`device-guides.${deviceId}: 參考機種必須有 evaluation`)
  }
  if (device.placement === 'chain' && guide.evaluation) {
    errors.push(`device-guides.${deviceId}: 已在鏈上的效果器不該有 evaluation`)
  }
  for (const overlapId of guide.evaluation?.overlaps ?? []) {
    if (overlapId === deviceId) errors.push(`device-guides.${deviceId}: overlaps 不能是自己`)
    else if (!devices.has(overlapId)) {
      errors.push(`device-guides.${deviceId}.evaluation.overlaps: 找不到 deviceId ${overlapId}`)
    }
  }
}
for (const device of devices.values()) {
  if (!guidesDocument.guides[device.id]) errors.push(`device-guides 缺少 ${device.id} 的說明`)
}
// Every link must be unique across the whole knowledge base: the same URL in
// two places is the flat reference list growing back.
requireUnique(
  [
    ...Object.values(guidesDocument.guides).flatMap((guide) => guide.sources.map((source) => source.url)),
    ...(rig.openSlots ?? []).flatMap((slot) => slot.candidates.map((candidate) => candidate.url)),
  ],
  'source url',
)

if (tuningLog.rigId !== rig.rigId) errors.push('tuning-log.json rigId 與 rig.json 不一致')
const presetIds = new Set(rig.presets.map((preset) => preset.id))
requireUnique(
  tuningLog.sessions.map((session) => session.id),
  'tuning session id',
)
for (const session of tuningLog.sessions) {
  if (!presetIds.has(session.presetId))
    errors.push(`tuning session ${session.id} 找不到 presetId ${session.presetId}`)
  for (const change of session.changes) {
    const device = devices.get(change.deviceId)
    if (!device) errors.push(`tuning session ${session.id} 找不到 deviceId ${change.deviceId}`)
    else if (!device.controls.some((control) => control.id === change.controlId)) {
      errors.push(`tuning session ${session.id} 找不到 ${change.deviceId}.${change.controlId}`)
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join('\n'))
  process.exit(1)
}

const references = [...devices.values()].filter((device) => device.placement === 'reference')
console.log(
  `Devices: ${devices.size} (chain ${devices.size - references.length}, reference ${references.length})`,
)
console.log(`Controls: ${[...devices.values()].reduce((total, device) => total + device.controls.length, 0)}`)
console.log(`Presets: ${rig.presets.length}`)
console.log(`Guides: ${Object.keys(guidesDocument.guides).length}`)
console.log(
  `Sources: ${Object.values(guidesDocument.guides).reduce((total, guide) => total + guide.sources.length, 0)}`,
)
console.log(
  `Comparisons: ${Object.values(guidesDocument.guides).reduce((total, guide) => total + (guide.comparisons?.length ?? 0), 0)}`,
)
console.log(`Diagnostics: ${rig.diagnostics.length}`)
console.log(
  `Open slots: ${(rig.openSlots ?? []).length} (candidates ${(rig.openSlots ?? []).reduce((total, slot) => total + slot.candidates.length, 0)})`,
)
console.log(`Tuning sessions: ${tuningLog.sessions.length}`)
console.log('Schema validation and cross-references: OK')
