import { useRigStore } from '../store/useRigStore'
import { Kicker } from './primitives'
import type { Control, Guide } from '../types'

/**
 * An interactive readout for a device whose guide declares one. Which control
 * it simulates and every word it says come from device-guides.json; rendering
 * it off a hardcoded device id put it on one page and nowhere else, with no
 * validator able to notice when that id stopped existing.
 */
type MeterSpec = NonNullable<Guide['meter']>

/** Ten LEDs; the `grid-cols-10` below has to be a literal for Tailwind to see it. */
const LED_COUNT = 10

/** The midpoint of each of LED_COUNT equal bins: a lit LED means "at least here". */
const ledThresholds = (min: number, max: number) =>
  Array.from({ length: LED_COUNT }, (_, index) => min + ((index + 0.5) * (max - min)) / LED_COUNT)

/** First band the value fits; the last one omits `upTo` and catches the rest. */
const noteFor = (meter: MeterSpec, value: number) =>
  meter.bands.find((band) => band.upTo === undefined || value <= band.upTo)?.note ?? ''

export function GuideMeter({ control, meter }: { control: Control; meter: MeterSpec }) {
  // One demo value in the store, because one device declares a meter. It is
  // browser-local scratch state, not part of any voice.
  const value = useRigStore((state) => state.gainReductionDemo)
  const setValue = useRigStore((state) => state.setGainReductionDemo)
  const min = control.min ?? 0
  const unit = control.unit ?? ''

  return (
    <section className="equipment-panel" aria-labelledby="meter-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Kicker>Interactive meter</Kicker>
          <h2 id="meter-title" className="mt-2 text-2xl font-semibold">
            {meter.title}
          </h2>
        </div>
        <output className="font-display text-4xl text-accent" htmlFor="meter-demo">
          {value}
          <span className="ml-1 text-sm text-muted">{unit}</span>
        </output>
      </div>

      <div className="mt-8 grid grid-cols-10 gap-2" aria-hidden="true">
        {ledThresholds(min, meter.max).map((threshold) => (
          <div key={threshold} className="text-center font-display text-3xs text-muted">
            <span className={`meter-led ${value >= threshold ? 'meter-led-on' : ''}`} />
            {Math.round(threshold)}
          </div>
        ))}
      </div>

      <label htmlFor="meter-demo" className="sr-only">
        {meter.sliderLabel}
      </label>
      <input
        id="meter-demo"
        className="control-range mt-6"
        type="range"
        min={min}
        max={meter.max}
        value={value}
        aria-valuetext={`${value} ${unit}`.trim()}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <p className="mt-4 text-sm leading-relaxed text-muted" aria-live="polite">
        {noteFor(meter, value)}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {meter.quickValues.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => setValue(quick)}
            aria-pressed={value === quick}
            className={`choice-button px-4 ${value === quick ? 'choice-button-active' : ''}`}
          >
            {quick} {unit}
          </button>
        ))}
      </div>
    </section>
  )
}
