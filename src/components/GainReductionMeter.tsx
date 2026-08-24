import { useRigStore } from '../store/useRigStore'
import { Kicker } from './primitives'

const LED_THRESHOLDS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
const QUICK_VALUES = [0, 3, 5, 8, 12]

function describe(value: number): string {
  if (value < 3) return '壓縮很輕，原始動態幾乎完整保留。'
  if (value <= 5) return '目標區：一般彈奏約亮兩顆，最重撥弦瞬間碰到第三顆。'
  if (value <= 8) return '壓縮已明顯，可能開始削弱 Pick Attack。'
  return '壓縮偏深；always-on 通常太扁，也會提高底噪。'
}

export function GainReductionMeter() {
  const value = useRigStore((state) => state.gainReductionDemo)
  const setValue = useRigStore((state) => state.setGainReductionDemo)

  return (
    <section className="equipment-panel" aria-labelledby="gr-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Kicker>Interactive meter</Kicker>
          <h2 id="gr-title" className="mt-2 text-2xl font-semibold">
            Cali76 · Gain Reduction
          </h2>
        </div>
        <output className="font-display text-4xl text-accent" htmlFor="gr-demo">
          {value}
          <span className="ml-1 text-sm text-muted">dB</span>
        </output>
      </div>

      <div className="mt-8 grid grid-cols-10 gap-2" aria-hidden="true">
        {LED_THRESHOLDS.map((threshold) => (
          <div key={threshold} className="text-center font-display text-3xs text-muted">
            <span className={`meter-led ${value >= threshold ? 'meter-led-on' : ''}`} />
            {threshold}
          </div>
        ))}
      </div>

      <label htmlFor="gr-demo" className="sr-only">
        模擬 Gain Reduction
      </label>
      <input
        id="gr-demo"
        className="control-range mt-6"
        type="range"
        min="0"
        max="20"
        value={value}
        aria-valuetext={`${value} dB`}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <p className="mt-4 text-sm leading-relaxed text-muted" aria-live="polite">
        {describe(value)}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_VALUES.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setValue(preset)}
            aria-pressed={value === preset}
            className={`choice-button px-4 ${value === preset ? 'choice-button-active' : ''}`}
          >
            {preset} dB
          </button>
        ))}
      </div>
    </section>
  )
}
