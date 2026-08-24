/**
 * Domain types come from the schemas via `npm run generate:types`; only
 * app-local types (browser state that never reaches JSON) are declared here.
 */
export type {
  Baseline,
  Calibration,
  ChainNode,
  Choices,
  Control,
  ControlId,
  Device,
  DeviceCatalog,
  DeviceGuides,
  Diagnostic,
  Direction,
  Guide,
  Id,
  OpenSlot,
  Preset,
  Range,
  Rig,
  Route,
  Scalar,
  Section,
  Setting,
  SettingsMap,
  Source,
  TuningLog,
} from './types.generated'

import type { Guide, Scalar, Setting } from './types.generated'

/** The schema declares these inline on `Guide`; name them so the UI can too. */
export type Comparison = NonNullable<Guide['comparisons']>[number]
export type Evaluation = NonNullable<Guide['evaluation']>

export type ScalarValue = Scalar

export type SettingConfidence = Setting['confidence']

/** presetId → deviceId → controlId → value. Browser-only tuning overlay. */
export type UserOverrides = Record<string, Record<string, Record<string, ScalarValue>>>
