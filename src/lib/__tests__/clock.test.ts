import { describe, expect, it } from 'vitest'
import { clampStep, clockMidpoint, clockToStep, isClock, stepToClock, CLOCK_MAX_STEP } from '../clock.mjs'

describe('clock scale', () => {
  it('maps the ends of the sweep', () => {
    expect(clockToStep('07:00')).toBe(0)
    expect(clockToStep('17:30')).toBe(CLOCK_MAX_STEP)
    expect(stepToClock(0)).toBe('07:00')
    expect(stepToClock(CLOCK_MAX_STEP)).toBe('17:30')
  })

  it('round-trips every legal position', () => {
    for (let step = 0; step <= CLOCK_MAX_STEP; step += 1) {
      expect(clockToStep(stepToClock(step))).toBe(step)
    }
  })

  it('pads the hour so values sort lexically', () => {
    expect(stepToClock(1)).toBe('07:30')
    expect(stepToClock(5)).toBe('09:30')
    expect('09:30' < '11:00').toBe(true)
  })

  it('clamps out-of-range steps instead of wrapping', () => {
    expect(clampStep(-8)).toBe(0)
    expect(clampStep(99)).toBe(CLOCK_MAX_STEP)
    expect(stepToClock(-8)).toBe('07:00')
  })

  it('rejects positions off the half-hour grid', () => {
    expect(isClock('12:00')).toBe(true)
    expect(isClock('12:15')).toBe(false)
    expect(isClock('18:00')).toBe(false)
    expect(isClock('6:00')).toBe(false)
    expect(isClock(12)).toBe(false)
  })

  it('takes the midpoint of a range, not its start', () => {
    expect(clockMidpoint('09:30', '11:00')).toBe('10:30')
    expect(clockMidpoint('12:00', '12:00')).toBe('12:00')
  })
})
