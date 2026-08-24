import { describe, expect, it } from 'vitest'
import { pad2, truncate } from '../format'

describe('pad2', () => {
  it('pads single digits and leaves the rest alone', () => {
    expect(pad2(1)).toBe('01')
    expect(pad2(9)).toBe('09')
    expect(pad2(10)).toBe('10')
    expect(pad2(123)).toBe('123')
  })
})

describe('truncate', () => {
  it('leaves a short string untouched', () => {
    expect(truncate('Gain', 10)).toBe('Gain')
    expect(truncate('exactly10!', 10)).toBe('exactly10!')
  })

  it('ellipsises within the budget, never over it', () => {
    const result = truncate('Ch.1 Power Amp Presence', 11)
    expect(result).toBe('Ch.1 Power…')
    expect(result.length).toBe(11)
  })
})
