import { describe, expect, it } from 'vitest'
import { formatSetting, nudge, positionValue, settingValue, valuePosition } from '../value'
import type { Control, Setting } from '../../types'

const clockKnob: Control = {
  id: 'attack',
  label: 'ATTACK',
  section: 'pedal',
  type: 'knob',
  valueType: 'clock',
  surface: 'panel',
}
const numberKnob: Control = {
  id: 'ratio',
  label: 'RATIO',
  section: 'pedal',
  type: 'knob',
  valueType: 'number',
  surface: 'panel',
  min: 4,
  max: 20,
}
const enumSwitch: Control = {
  id: 'bright_tight',
  label: 'Bright/Tight',
  section: 'ch1',
  type: 'toggle',
  valueType: 'enum',
  surface: 'panel',
  options: ['full-fat', 'bright-tight'],
}

const offsetKnob: Control = {
  id: 'trim',
  label: 'TRIM',
  section: 'pedal',
  type: 'knob',
  valueType: 'number',
  surface: 'panel',
  min: -12,
  max: 12,
  step: 5,
}
const booleanSwitch: Control = {
  id: 'pad',
  label: 'PAD',
  section: 'pedal',
  type: 'toggle',
  valueType: 'boolean',
  surface: 'panel',
}

describe('settingValue', () => {
  it('reads an explicit value', () => {
    expect(settingValue({ controlId: 'x', value: 4, confidence: 'provisional' })).toBe(4)
  })

  it('prefers the preferred choice', () => {
    const setting: Setting = {
      controlId: 'x',
      confidence: 'provisional',
      choices: { preferred: 'a', alternatives: ['b'] },
    }
    expect(settingValue(setting)).toBe('a')
  })

  it('takes the midpoint of a numeric range', () => {
    expect(settingValue({ controlId: 'x', range: { min: 3, max: 5 }, confidence: 'provisional' })).toBe(4)
  })

  it('takes the midpoint of a clock range rather than its start', () => {
    const setting: Setting = {
      controlId: 'x',
      range: { min: '09:30', max: '11:00' },
      confidence: 'provisional',
    }
    expect(settingValue(setting)).toBe('10:30')
  })

  it('has no value for a target, which is prose', () => {
    expect(
      settingValue({ controlId: 'x', target: 'Bypass Unity', confidence: 'provisional' }),
    ).toBeUndefined()
    expect(settingValue(undefined)).toBeUndefined()
  })
})

describe('formatSetting', () => {
  it('renders each shape distinctly', () => {
    expect(formatSetting({ controlId: 'x', value: 'on', confidence: 'provisional' })).toBe('on')
    expect(formatSetting({ controlId: 'x', range: { min: 3, max: 5 }, confidence: 'provisional' })).toBe(
      '3–5',
    )
    expect(formatSetting({ controlId: 'x', target: 'Unity', confidence: 'provisional' })).toBe('Unity')
    expect(formatSetting(undefined)).toBe('未設定')
  })

  it('lists alternatives only when there are some', () => {
    const withAlts: Setting = {
      controlId: 'x',
      confidence: 'provisional',
      choices: { preferred: '57', alternatives: ['421'] },
    }
    const without: Setting = {
      controlId: 'x',
      confidence: 'provisional',
      choices: { preferred: '57', alternatives: [] },
    }
    expect(formatSetting(withAlts)).toContain('421')
    expect(formatSetting(without)).toBe('57')
  })
})

describe('valuePosition and positionValue', () => {
  it('round-trips a clock knob at every detent', () => {
    for (let step = 0; step <= 21; step += 1) {
      const clock = positionValue(clockKnob, step / 21)
      expect(valuePosition(clockKnob, clock)).toBeCloseTo(step / 21, 5)
    }
  })

  it('maps a numeric range onto its own bounds', () => {
    expect(valuePosition(numberKnob, 4)).toBe(0)
    expect(valuePosition(numberKnob, 20)).toBe(1)
    expect(positionValue(numberKnob, 0)).toBe(4)
    expect(positionValue(numberKnob, 1)).toBe(20)
  })

  it('clamps rather than extrapolating outside the range', () => {
    expect(valuePosition(numberKnob, -100)).toBe(0)
    expect(valuePosition(numberKnob, 1000)).toBe(1)
    expect(positionValue(numberKnob, 5)).toBe(20)
    expect(positionValue(numberKnob, -5)).toBe(4)
  })

  it('spreads enum options evenly and snaps back', () => {
    expect(valuePosition(enumSwitch, 'full-fat')).toBe(0)
    expect(valuePosition(enumSwitch, 'bright-tight')).toBe(1)
    expect(positionValue(enumSwitch, 0.9)).toBe('bright-tight')
  })

  it('centres an unknown enum value instead of throwing', () => {
    expect(valuePosition(enumSwitch, 'nonsense')).toBe(0)
  })

  it('places detents from the control\u2019s own minimum, not from zero', () => {
    // min is not a multiple of step, so a grid measured from 0 would put the
    // lowest reachable value at -10 and never let the knob reach -12.
    expect(positionValue(offsetKnob, 0)).toBe(-12)
    expect(positionValue(offsetKnob, 1)).toBe(12)
    expect(positionValue(offsetKnob, 5 / 24)).toBe(-7)
    expect(positionValue(offsetKnob, 10 / 24)).toBe(-2)
  })

  it('reads a boolean control as off or on rather than mid-travel', () => {
    expect(valuePosition(booleanSwitch, false)).toBe(0)
    expect(valuePosition(booleanSwitch, true)).toBe(1)
    expect(positionValue(booleanSwitch, 0.2)).toBe(false)
    expect(positionValue(booleanSwitch, 0.8)).toBe(true)
  })
})

describe('nudge', () => {
  it('moves one detent per press and stops at the ends', () => {
    expect(nudge(clockKnob, '12:00', 1)).toBe('12:30')
    expect(nudge(clockKnob, '12:00', -1)).toBe('11:30')
    expect(nudge(clockKnob, '17:30', 1)).toBe('17:30')
    expect(nudge(clockKnob, '07:00', -1)).toBe('07:00')
  })

  it('steps a number by its step and clamps', () => {
    expect(nudge(numberKnob, 10, 1)).toBe(11)
    expect(nudge(numberKnob, 20, 1)).toBe(20)
    expect(nudge(numberKnob, 4, -1)).toBe(4)
  })

  it('walks enum options', () => {
    expect(nudge(enumSwitch, 'full-fat', 1)).toBe('bright-tight')
    expect(nudge(enumSwitch, 'bright-tight', 1)).toBe('bright-tight')
  })

  it('steps from the minimum when the minimum is off the step grid', () => {
    expect(nudge(offsetKnob, -12, 1)).toBe(-7)
    expect(nudge(offsetKnob, -7, -1)).toBe(-12)
    expect(nudge(offsetKnob, -12, -1)).toBe(-12)
  })

  it('toggles a boolean instead of writing a float', () => {
    expect(nudge(booleanSwitch, false, 1)).toBe(true)
    expect(nudge(booleanSwitch, true, -1)).toBe(false)
    expect(nudge(booleanSwitch, true, 1)).toBe(true)
    expect(nudge(booleanSwitch, false, -1)).toBe(false)
  })

  it('starts somewhere sane when there is no value yet', () => {
    expect(nudge(clockKnob, undefined, 1)).toBe('12:30')
    expect(nudge(enumSwitch, undefined, 1)).toBe('bright-tight')
  })
})
