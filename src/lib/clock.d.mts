export const CLOCK_PATTERN: RegExp
export const CLOCK_MIN_STEP: number
export const CLOCK_MAX_STEP: number

export function isClock(value: unknown): value is string
/** 07:00 → 0, 07:30 → 1 … 17:30 → 21. */
export function clockToStep(value: string): number
export function stepToClock(step: number): string
export function clampStep(step: number): number
export function clockMidpoint(min: string, max: string): string
