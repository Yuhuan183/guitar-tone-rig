import { describe, expect, it } from 'vitest'
import {
  BREAKPOINTS,
  SCALES,
  VIEWPORT,
  fluidAt,
  fluidClamp,
  fluidTerms,
  scaleDeclarations,
  scaleVar,
} from '../responsive'

const scale = { min: 44, max: 66, from: 360, to: 1440 }

describe('fluidAt', () => {
  it('hits exactly the declared value at each end', () => {
    expect(fluidAt(scale, 360)).toBeCloseTo(44, 6)
    expect(fluidAt(scale, 1440)).toBeCloseTo(66, 6)
  })

  it('interpolates linearly in between', () => {
    expect(fluidAt(scale, 900)).toBeCloseTo(55, 6)
  })

  it('clamps outside the range instead of extrapolating', () => {
    expect(fluidAt(scale, 100)).toBe(44)
    expect(fluidAt(scale, 5000)).toBe(66)
  })

  it('clamps to the declared ends even when the scale shrinks as the viewport grows', () => {
    const shrinking = { min: 40, max: 20, from: 360, to: 1440 }
    expect(fluidAt(shrinking, 100)).toBe(40)
    expect(fluidAt(shrinking, 5000)).toBe(20)
    expect(fluidAt(shrinking, 900)).toBeCloseTo(30, 6)
  })

  it('defaults to the project viewport range', () => {
    expect(fluidAt({ min: 0, max: 100 }, VIEWPORT.min)).toBeCloseTo(0, 6)
    expect(fluidAt({ min: 0, max: 100 }, VIEWPORT.max)).toBeCloseTo(100, 6)
  })
})

describe('fluidTerms', () => {
  it('refuses an inverted viewport range rather than producing a silent NaN', () => {
    expect(() => fluidTerms({ min: 1, max: 2, from: 1000, to: 500 })).toThrow(/must exceed/)
    expect(() => fluidTerms({ min: 1, max: 2, from: 500, to: 500 })).toThrow()
  })
})

describe('fluidClamp', () => {
  /** Evaluates the emitted CSS the way a browser would, to prove they agree. */
  const evaluateCss = (css: string, viewport: number, rootFontSize = 16) => {
    const toPx = (token: string) => {
      const value = parseFloat(token)
      if (token.includes('rem')) return value * rootFontSize
      if (token.includes('vw')) return (value / 100) * viewport
      return value
    }
    const [, minToken, middle, maxToken] = css.match(/^clamp\((.+?), (.+), (.+?)\)$/)!
    const middleValue = (middle.startsWith('calc(') ? middle.slice(5, -1) : middle)
      .split(' + ')
      .reduce((total, token) => total + toPx(token), 0)
    return Math.min(toPx(maxToken), Math.max(toPx(minToken), middleValue))
  }

  it('emits CSS that computes the same curve the module does', () => {
    for (const [name, definition] of Object.entries(SCALES)) {
      const css = fluidClamp(definition)
      for (const viewport of [320, 360, 500, 768, 1024, 1200, 1440, 1920]) {
        expect(evaluateCss(css, viewport), `${name} at ${viewport}px`).toBeCloseTo(
          fluidAt(definition, viewport),
          1,
        )
      }
    }
  })

  it('drops the offset term when the line passes through the origin', () => {
    expect(fluidClamp({ min: 0, max: 100, from: 0, to: 1000 })).toBe('clamp(0px, 10vw, 100px)')
  })

  it('emits rem when asked, so the value respects the user font size', () => {
    expect(fluidClamp({ min: 16, max: 32, unit: 'rem' })).toContain('rem')
    expect(fluidClamp({ min: 16, max: 32 })).toContain('px')
  })
})

describe('registry', () => {
  it('names every scale as a custom property', () => {
    expect(scaleVar('pedal-board')).toBe('var(--scale-pedal-board)')
    expect(scaleDeclarations()).toHaveLength(Object.keys(SCALES).length)
    for (const line of scaleDeclarations()) expect(line).toMatch(/^--scale-[a-z-]+: clamp\(/)
  })

  it('has a sane range for every registered scale', () => {
    for (const [name, definition] of Object.entries(SCALES)) {
      expect(definition.max, name).toBeGreaterThan(definition.min)
      expect(definition.min, name).toBeGreaterThan(0)
    }
  })

  it('keeps the breakpoints ordered', () => {
    const widths = Object.values(BREAKPOINTS)
    expect([...widths].sort((a, b) => a - b)).toEqual(widths)
  })
})
