/**
 * Guitar knobs are read as clock positions from 7 o'clock to 5 o'clock in
 * half-hour steps. This module owns that scale and nothing else.
 *
 * Plain ESM with a sibling .d.mts, like merge.mjs, so scripts/ can order two
 * clock values with the real scale instead of a lexical string compare that
 * only works because HH:MM happens to be zero-padded.
 */
export const CLOCK_MIN_STEP = 0
export const CLOCK_MAX_STEP = 21

/** Exported so validate-data can hold the schema's copy of it to this one. */
export const CLOCK_PATTERN = /^(0[7-9]|1[0-7]):(?:00|30)$/

export const isClock = (value) => typeof value === 'string' && CLOCK_PATTERN.test(value)

/** 07:00 → 0, 07:30 → 1 … 17:30 → 21. */
export function clockToStep(value) {
  const [hour, minute] = value.split(':').map(Number)
  return (hour - 7) * 2 + (minute >= 30 ? 1 : 0)
}

export function stepToClock(step) {
  const safe = clampStep(step)
  return `${String(7 + Math.floor(safe / 2)).padStart(2, '0')}:${safe % 2 ? '30' : '00'}`
}

export const clampStep = (step) => Math.max(CLOCK_MIN_STEP, Math.min(CLOCK_MAX_STEP, Math.round(step)))

/** Midpoint of two clock positions, rounded to the nearest half hour. */
export const clockMidpoint = (min, max) => stepToClock(Math.round((clockToStep(min) + clockToStep(max)) / 2))
