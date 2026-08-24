import { clampStep, clockMidpoint, clockToStep, isClock, stepToClock, CLOCK_MAX_STEP } from './clock.mjs'
import type { Control, ScalarValue, Setting } from '../types'

/**
 * Turns a Setting of any shape into the single value the UI starts from, and
 * back again. Pure: no data imports, no React, so every branch is testable.
 */

export function settingValue(setting?: Setting): ScalarValue | undefined {
  if (!setting) return undefined
  if (setting.value !== undefined) return setting.value
  if (setting.choices) return setting.choices.preferred
  if (setting.range) return rangeMidpoint(setting.range.min, setting.range.max)
  return undefined
}

export function rangeMidpoint(min: ScalarValue, max: ScalarValue): ScalarValue {
  if (typeof min === 'number' && typeof max === 'number') {
    return Math.round(((min + max) / 2) * 10) / 10
  }
  if (isClock(min) && isClock(max)) return clockMidpoint(min, max)
  return min
}

export function formatSetting(setting?: Setting): string {
  if (!setting) return '未設定'
  if (setting.value !== undefined) return String(setting.value)
  if (setting.range) return `${setting.range.min}–${setting.range.max}`
  if (setting.choices) {
    const alternatives = setting.choices.alternatives.length
      ? `（另選 ${setting.choices.alternatives.join('、')}）`
      : ''
    return `${setting.choices.preferred}${alternatives}`
  }
  return setting.target ?? '未設定'
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * Detents run from the control's own minimum. A grid measured from zero lands
 * off-scale whenever min is not a multiple of step, and leaves min itself
 * unreachable — the one value a knob turned fully down has to produce.
 */
const snapToStep = (value: number, min: number, max: number, step: number) =>
  Math.min(max, Math.max(min, min + Math.round((value - min) / step) * step))

/** Normalises any control value to 0–1, for knob angles and range bands. */
export function valuePosition(control: Control, value: ScalarValue): number {
  if (control.valueType === 'clock' && typeof value === 'string') {
    return clamp01(clockToStep(value) / CLOCK_MAX_STEP)
  }
  if (control.valueType === 'number' && typeof value === 'number') {
    const min = control.min ?? 0
    const max = control.max ?? 100
    return max === min ? 0.5 : clamp01((value - min) / (max - min))
  }
  if (control.valueType === 'enum' && control.options?.length) {
    const index = control.options.findIndex((option) => String(option) === String(value))
    return clamp01(Math.max(0, index) / Math.max(1, control.options.length - 1))
  }
  if (control.valueType === 'boolean') return value === true ? 1 : 0
  return 0.5
}

/**
 * The inverse of valuePosition: what value does 0–1 along this control mean?
 * Needed to make the board diagram draggable.
 */
export function positionValue(control: Control, position: number): ScalarValue {
  const p = clamp01(position)
  if (control.valueType === 'clock') return stepToClock(clampStep(p * CLOCK_MAX_STEP))
  if (control.valueType === 'number') {
    const min = control.min ?? 0
    const max = control.max ?? 100
    const step = control.step ?? 1
    return snapToStep(min + p * (max - min), min, max, step)
  }
  if (control.valueType === 'enum' && control.options?.length) {
    const index = Math.round(p * (control.options.length - 1))
    return control.options[Math.min(control.options.length - 1, Math.max(0, index))]
  }
  if (control.valueType === 'boolean') return p >= 0.5
  return p
}

/** One detent in either direction, for keyboard control. */
export function nudge(control: Control, value: ScalarValue | undefined, direction: 1 | -1): ScalarValue {
  const current = value === undefined ? 0.5 : valuePosition(control, value)
  if (control.valueType === 'clock') {
    return stepToClock(clampStep(clockToStep(isClock(value) ? value : '12:00') + direction))
  }
  if (control.valueType === 'number') {
    const min = control.min ?? 0
    const max = control.max ?? 100
    const step = control.step ?? 1
    const numeric = typeof value === 'number' ? value : min + (max - min) / 2
    return snapToStep(numeric + direction * step, min, max, step)
  }
  if (control.valueType === 'enum' && control.options?.length) {
    const index = control.options.findIndex((option) => String(option) === String(value))
    const next = Math.min(control.options.length - 1, Math.max(0, (index < 0 ? 0 : index) + direction))
    return control.options[next]
  }
  // A two-position switch has one detent in each direction and no travel
  // between them, so a press moves to that end and stays there.
  if (control.valueType === 'boolean') return direction > 0
  return positionValue(control, current + direction * 0.05)
}
