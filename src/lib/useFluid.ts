import { useSyncExternalStore } from 'react'
import { BREAKPOINTS, fluidAt, SCALES } from './responsive'
import type { Breakpoint, ScaleName } from './responsive'

/**
 * Read a registered scale, or a breakpoint, from JS. Components that need a
 * number rather than a CSS value get it from the same registry the stylesheet
 * is generated from, so the two cannot disagree.
 */

const subscribe = (onChange: () => void) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('resize', onChange, { passive: true })
  return () => window.removeEventListener('resize', onChange)
}

const viewportWidth = () => (typeof window === 'undefined' ? BREAKPOINTS.lg : window.innerWidth)

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, viewportWidth, () => BREAKPOINTS.lg)
}

/** The px value of a registered scale at the current viewport. */
export function useFluid(name: ScaleName): number {
  return fluidAt(SCALES[name], useViewportWidth())
}

/** True at or above a named breakpoint. Never a magic number in a component. */
export function useBreakpoint(name: Breakpoint): boolean {
  return useViewportWidth() >= BREAKPOINTS[name]
}
