// Generated from schemas/ by scripts/generate-types.mjs — do not edit.
// Run `npm run generate:types` after changing a schema.

export type Id = string
export type ControlId = string

export interface DeviceCatalog {
  catalogVersion: string
  updatedAt: string
  /**
   * Display label per device category. Every category used by a device must appear here.
   */
  categoryLabels: {
    [k: string]: string
  }
  devices: Device[]
}
export interface Device {
  id: Id
  manufacturer: string
  model: string
  category:
    | 'dynamics'
    | 'gain'
    | 'amp-simulator'
    | 'speaker-simulator'
    | 'gate'
    | 'eq'
    | 'modulation'
    | 'time'
    | 'utility'
  subtype: string
  primaryRole: string
  /**
   * chain = currently routed on the board; reference = kept for comparison and chain evaluation only. The validator holds this to the signal chain in both directions.
   */
  placement: 'chain' | 'reference'
  sections: Section[]
  controls: Control[]
  appearance: Appearance
}
/**
 * A display group on the device front panel. Array order is display order.
 */
export interface Section {
  id: Id
  label: string
  description?: string
}
export interface Control {
  id: ControlId
  label: string
  section: Id
  /**
   * The shape of the control, and only its shape. Where it lives is `surface`, how many positions it has is `options`, and what it reads is `valueType` — encoding any of those in the name here would be a second copy. Closed so a typo fails validation rather than silently dropping the control from the board diagram.
   */
  type: 'knob' | 'rotary-selector' | 'trimmer' | 'toggle' | 'selector' | 'footswitch' | 'readout'
  valueType: 'clock' | 'number' | 'enum' | 'boolean'
  unit?: string
  min?: number
  max?: number
  step?: number
  options?: (string | number | boolean)[]
  direction?: Direction
  description?: string
  /**
   * panel = on the front face and drawn on the board diagram; internal = a trimmer inside or on the back, set once and not performed with; software = editor or app only; derived = a target that is read, not set.
   */
  surface: 'panel' | 'internal' | 'software' | 'derived'
}
export interface Direction {
  left: string
  right: string
}
/**
 * Schematic enclosure for the board diagram — proportions and colour only, not a likeness of the product. All pedals render at one shared units-per-pixel scale, so widthUnits and heightUnits set the true relative size on the board.
 */
export interface Appearance {
  /**
   * 1 unit ≈ a standard compact enclosure width.
   */
  widthUnits: number
  /**
   * Enclosure fill.
   */
  body: string
  /**
   * Legend and knob-cap colour.
   */
  face: string
  note?: string
  /**
   * 1 unit ≈ a standard compact enclosure width, so a typical pedal is taller than it is wide.
   */
  heightUnits: number
}

export type Scalar = string | number | boolean

export interface Rig {
  rigId: Id
  rigVersion: string
  status: 'draft-unverified' | 'in-calibration' | 'verified'
  updatedAt: string
  statusNote?: string
  deviceCatalog: string
  signalChain: ChainNode[]
  routing: Route[]
  /**
   * Hard limits that would damage equipment or the sound if broken. Each names the devices it constrains, so the rule can be shown on their pages from this one copy instead of being retyped into a device warning.
   */
  safetyRules: SafetyRule[]
  calibration: Calibration
  /**
   * Symptoms that span more than one device. Anything scoped to a single pedal belongs in that device's troubleshooting in device-guides.json.
   */
  diagnostics: Diagnostic[]
  /**
   * A job this chain does not currently have a device for, with the shortlist. Distinct from a reference device: there is no pedal here to model, only a decision that has not been made.
   */
  openSlots?: OpenSlot[]
  baseline: Baseline
  presets: Preset[]
}
export interface ChainNode {
  order: number
  kind: 'device' | 'endpoint'
  deviceId?: Id
  id?: Id
  label?: string
}
export interface Route {
  from: string
  to: string
  signal: string
  notes?: string
}
export interface SafetyRule {
  rule: string
  devices: Id[]
}
/**
 * The order in which this chain is dialled in from nothing. Rig-level because no single device owns it.
 */
export interface Calibration {
  title: string
  steps: string[]
}
export interface Diagnostic {
  symptom: string
  check: string
  /**
   * The devices involved, by id, so a diagnosis cannot outlive the pedals it names.
   */
  devices: Id[]
}
export interface OpenSlot {
  id: Id
  label: string
  /**
   * Why the slot is still open — the thing that makes the obvious answer wrong.
   */
  problem: string
  /**
   * The routing this slot would need, in signal order.
   */
  topology?: string[]
  /**
   * How to set whatever ends up here, independent of which candidate wins.
   */
  rules?: string[]
  candidates: {
    name: string
    /**
     * The one-line reason this candidate is on the list at all.
     */
    verdict: string
    url: string
    notes: string
  }[]
}
export interface Baseline {
  id: Id
  description: string
  settings: SettingsMap
}
export interface SettingsMap {
  [k: string]: Setting[]
}
export interface Setting {
  controlId: string
  value?: Scalar
  range?: Range
  choices?: Choices
  target?: string
  /**
   * How much this particular value has been earned. Named apart from rig.status and preset.status on purpose: those three are different scales and sharing a field name invited reading the wrong one.
   */
  confidence: 'provisional' | 'needs-calibration' | 'verified'
  notes?: string
}
export interface Range {
  min: Scalar
  max: Scalar
}
export interface Choices {
  preferred: Scalar
  alternatives: Scalar[]
}
export interface Preset {
  id: Id
  name: string
  rigSlot: number
  inherits: Id
  status: 'untested' | 'testing' | 'verified' | 'rejected'
  target: string
  genres: string[]
  pickupPreference: string[]
  settings: SettingsMap
  /**
   * primary = a voice this chain was built for; secondary = a position derived between the primary voices.
   */
  tier: 'primary' | 'secondary'
}

export interface TuningLog {
  rigId: Id
  instructions?: string
  sessions: {
    id: Id
    date: string
    presetId: Id
    context: {
      guitar: string
      pickup: string
      monitoring: string
      volume: string
      room?: string
    }
    observations: string[]
    changes: {
      deviceId: Id
      controlId: ControlId
      before: Scalar
      after: Scalar
      reason: string
    }[]
    decision: 'keep' | 'revise' | 'reject' | 'inconclusive'
    notes?: string
  }[]
}

export type DeviceId = string

export interface DeviceGuides {
  guidesVersion: string
  updatedAt: string
  /**
   * Keyed by deviceId. Every key must exist in devices.json.
   */
  guides: {
    [k: string]: Guide
  }
}
export interface Guide {
  eyebrow: string
  summary: string
  principles: {
    title: string
    body: string
  }[]
  troubleshooting: {
    symptom: string
    action: string
  }[]
  /**
   * Keyed by controlId. Every key must exist on the matching device.
   */
  controlNotes?: {
    [k: string]: string
  }
  /**
   * An interactive readout worth practising against, for a device that has one. Which control it simulates, and the copy that reads it — held here rather than in the page, which used to render it for one hardcoded device id.
   */
  meter?: {
    /**
     * A readout control on the same device; validate-data checks it exists.
     */
    controlId: string
    title: string
    sliderLabel: string
    /**
     * Top of the simulated sweep. Must sit inside the control’s own range.
     */
    max: number
    quickValues: number[]
    /**
     * Read in order; the first band whose upTo the value fits wins. The last one omits upTo and catches the rest.
     */
    bands: {
      upTo?: number
      note: string
    }[]
  }
  workflow?: {
    title: string
    steps: string[]
  }
  facts?: string[]
  warning?: string
  /**
   * Official pages and manuals for this device. Links live next to the thing they describe, not in a separate list.
   */
  sources: Source[]
  /**
   * Where confidence in this device’s guidance stops: observation rather than spec, or something that must be re-checked on the real rig.
   */
  caveats?: string[]
  /**
   * What this stage is for on this particular chain, and what it must not be asked to do. Required for a device whose placement is "chain", forbidden for a reference device — it describes a position, and a reference device has none. More than one entry when a device owns more than one job.
   */
  chainRole?: {
    /**
     * Narrows the entry to one half of a device that has two jobs, e.g. NOTADÜMBLË's Clean and Drive sides.
     */
    scope?: string
    job: string
    avoid: string
  }[]
  /**
   * How this device differs from another one in the catalog. Keyed by deviceId so a model name is never retyped, and so a comparison cannot outlive the device it names.
   */
  comparisons?: {
    deviceId: DeviceId
    /**
     * The job both devices can do, which is why they are comparable at all.
     */
    shared: string
    /**
     * The mechanism that actually separates them, not an adjective.
     */
    differs: string
    /**
     * The condition under which this device wins.
     */
    chooseWhen: string
  }[]
  /**
   * Required for a device whose placement is "reference", forbidden for one already on the chain: where it would go, what it would collide with, and whether it earns a slot.
   */
  evaluation?: {
    /**
     * The positions actually considered, each judged on its own. A pedal with one obvious slot has one entry; a versatile one has several, and the comparison between them is the evaluation.
     */
    placements: {
      /**
       * The job it would be doing in this position.
       */
      role?: string
      /**
       * The resulting signal order, written out.
       */
      chain: string
      verdict: string
    }[]
    /**
     * Devices already on the chain whose job this one would duplicate.
     */
    overlaps?: DeviceId[]
    /**
     * adopt = put it on the board; trial = worth borrowing to hear; hold = no reason to add it right now; reject = ruled out.
     */
    verdict: 'adopt' | 'trial' | 'hold' | 'reject'
    rationale: string
    /**
     * What adopting it would cost, beyond money.
     */
    tradeoffs?: string[]
  }
}
export interface Source {
  label: string
  url: string
}
