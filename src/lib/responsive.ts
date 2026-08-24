/**
 * One source of truth for anything that changes with viewport width.
 *
 * Every fluid value used to be a hand-guessed `clamp(46px, 8.2vw, 66px)`: the
 * middle term was eyeballed, so the value did not actually reach its minimum
 * and maximum at the viewports it was meant to. Here a scale declares only what
 * it should be *at which viewport*, and the interpolation is computed.
 *
 * Pure and unit-agnostic — `fluidAt` is the same maths the browser runs, so a
 * test can assert the curve without a browser.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1440,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/** The viewport range every scale interpolates across unless it says otherwise. */
export const VIEWPORT = { min: 360, max: BREAKPOINTS.xxl } as const

export interface FluidScale {
  /** Value at or below `from`, in px. */
  min: number
  /** Value at or above `to`, in px. */
  max: number
  from?: number
  to?: number
  /** `rem` respects the user's font size; `px` suits graphics. */
  unit?: 'rem' | 'px'
  /** Why this scale exists — kept next to the numbers, not in a commit message. */
  note?: string
}

const ROOT_FONT_SIZE = 16

export interface FluidTerms {
  min: number
  max: number
  from: number
  to: number
  /** Multiplier on viewport width, i.e. the `vw` coefficient as a fraction. */
  slope: number
  /** Constant offset in px at 0 viewport width. */
  intercept: number
}

export function fluidTerms(scale: FluidScale): FluidTerms {
  const from = scale.from ?? VIEWPORT.min
  const to = scale.to ?? VIEWPORT.max
  if (to <= from) throw new Error(`fluid scale: "to" (${to}) must exceed "from" (${from})`)
  const slope = (scale.max - scale.min) / (to - from)
  return { min: scale.min, max: scale.max, from, to, slope, intercept: scale.min - from * slope }
}

/** What the browser will compute at a given viewport width. */
export function fluidAt(scale: FluidScale, viewportWidth: number): number {
  const { min, max, slope, intercept } = fluidTerms(scale)
  const [lo, hi] = min <= max ? [min, max] : [max, min]
  return Math.min(hi, Math.max(lo, intercept + slope * viewportWidth))
}

const round = (value: number, places = 4) => Number(value.toFixed(places))

/** The CSS `clamp()` that produces the declared curve. */
export function fluidClamp(scale: FluidScale): string {
  const { min, max, slope, intercept } = fluidTerms(scale)
  const unit = scale.unit ?? 'px'
  const toUnit = (px: number) => (unit === 'rem' ? `${round(px / ROOT_FONT_SIZE)}rem` : `${round(px)}px`)
  const vw = round(slope * 100, 4)
  const offset = toUnit(intercept)
  const middle = intercept === 0 ? `${vw}vw` : `calc(${offset} + ${vw}vw)`
  return `clamp(${toUnit(min)}, ${middle}, ${toUnit(max)})`
}

/**
 * The registry. A component asks for a scale by name; it never writes a clamp.
 * Adding one here is the only way a new fluid value enters the stylesheet.
 */
export const SCALES = {
  'pedal-board': {
    min: 44,
    max: 66,
    note: 'px per enclosure unit on the board; the whole board scales together.',
  },
  'pedal-card': { min: 38, max: 54, note: 'Library card thumbnail.' },
  'pedal-figure': { min: 62, max: 112, note: 'The editable drawing on a device page.' },
  'shell-gutter': { min: 10, max: 28, unit: 'rem', note: 'Page margin either side of the workspace.' },
  'card-padding': { min: 17, max: 26, unit: 'rem', note: 'Padding inside a panel.' },
  'title-page': { min: 32, max: 52, unit: 'rem', note: 'h1.' },
  'title-section': { min: 19, max: 26, unit: 'rem', note: 'h2.' },
} satisfies Record<string, FluidScale>

export type ScaleName = keyof typeof SCALES

export const scaleVariable = (name: string) => `--scale-${name}`

/** `var(--scale-x)`, for a component that needs to reference one inline. */
export const scaleVar = (name: ScaleName) => `var(${scaleVariable(name)})`

/** Every scale as CSS custom property declarations. */
export function scaleDeclarations(scales: Record<string, FluidScale> = SCALES): string[] {
  return Object.entries(scales).map(([name, scale]) => `${scaleVariable(name)}: ${fluidClamp(scale)};`)
}

/** Breakpoints as custom properties, so JS and CSS cannot drift apart. */
export function breakpointDeclarations(): string[] {
  return Object.entries(BREAKPOINTS).map(([name, width]) => `--breakpoint-${name}: ${width}px;`)
}
