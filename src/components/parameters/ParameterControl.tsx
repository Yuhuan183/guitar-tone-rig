import { RotateCcw } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import {
  CLOCK_MAX_STEP,
  clockToStep,
  formatSetting,
  settingValue,
  stepToClock,
  valuePosition,
} from '../../lib/rig'
import { useRigStore } from '../../store/useRigStore'
import type { Control, ScalarValue, Setting, SettingConfidence } from '../../types'

const CONFIDENCE_LABEL: Record<SettingConfidence, string> = {
  provisional: '暫定',
  'needs-calibration': '待校正',
  verified: '已驗證',
}

const CONFIDENCE_TITLE: Record<SettingConfidence, string> = {
  provisional: '接線或模式決策，尚未以聽感驗證。',
  'needs-calibration': '起始建議值，必須以實機與實際音量校正。',
  verified: '已在穩定條件下重複確認。',
}

/** The recommended band from a `range` setting, as track percentages. */
function recommendedBand(control: Control, setting: Setting) {
  if (!setting.range) return undefined
  const start = valuePosition(control, setting.range.min)
  const end = valuePosition(control, setting.range.max)
  if (start === end) return undefined
  return { start: Math.min(start, end), end: Math.max(start, end) }
}

function RangeSlider({
  id,
  control,
  setting,
  min,
  max,
  step,
  value,
  ariaLabel,
  ariaValueText,
  onChange,
}: {
  id: string
  control: Control
  setting: Setting
  min: number
  max: number
  step: number
  value: number
  ariaLabel?: string
  ariaValueText?: string
  onChange: (next: number) => void
}) {
  const band = recommendedBand(control, setting)
  const bandStyle = band
    ? ({ '--band-start': `${band.start * 100}%`, '--band-end': `${(1 - band.end) * 100}%` } as CSSProperties)
    : undefined

  return (
    <span className="range-field">
      <span className="range-track" aria-hidden="true">
        {band && <span className="range-band" style={bandStyle} />}
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="control-range"
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
      />
    </span>
  )
}

interface RendererProps {
  id: string
  control: Control
  setting: Setting
  value: ScalarValue | undefined
  update: (next: ScalarValue) => void
}

/**
 * One renderer per value shape, chosen in `pickRenderer`. Adding a valueType
 * means adding an entry here instead of another arm on a six-way ternary.
 */
const renderers = {
  target: ({ setting }: RendererProps) => (
    <p className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-3 text-sm leading-relaxed text-ink">
      {setting.target}
    </p>
  ),

  choices: ({ id, control, value, update }: RendererProps) => (
    <div
      className="mt-5 grid gap-2"
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      style={{ gridTemplateColumns: `repeat(${Math.min(control.options?.length ?? 1, 3)}, minmax(0, 1fr))` }}
    >
      {control.options?.map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={String(value) === String(option)}
          onClick={() => update(option)}
          className={`choice-button ${String(value) === String(option) ? 'choice-button-active' : ''}`}
        >
          {String(option)}
        </button>
      ))}
    </div>
  ),

  select: ({ id, control, value, update }: RendererProps) => (
    <select
      id={id}
      className="control-select mt-5"
      value={String(value ?? '')}
      onChange={(event) => update(event.target.value)}
    >
      {control.options?.map((option) => (
        <option key={String(option)} value={String(option)}>
          {String(option)}
        </option>
      ))}
    </select>
  ),

  clock: ({ id, control, setting, value, update }: RendererProps) => {
    const clock = typeof value === 'string' ? value : '12:00'
    return (
      <div className="mt-4 grid grid-cols-[4.25rem_1fr] items-center gap-4">
        <Knob control={control} value={clock} />
        <div>
          <output className="parameter-value" htmlFor={id}>
            {clock}
          </output>
          <RangeSlider
            id={id}
            control={control}
            setting={setting}
            min={0}
            max={CLOCK_MAX_STEP}
            step={1}
            value={clockToStep(clock)}
            ariaLabel={`${control.label} 鐘點位置`}
            ariaValueText={`${clock} 鐘點`}
            onChange={(next) => update(stepToClock(next))}
          />
        </div>
      </div>
    )
  },

  number: ({ id, control, setting, value, update }: RendererProps) => {
    const numeric = typeof value === 'number' ? value : (control.min ?? 0)
    const unit = control.unit ? ` ${control.unit}` : ''
    return (
      <div className="mt-4 grid grid-cols-[4.25rem_1fr] items-center gap-4">
        <Knob control={control} value={numeric} />
        <div>
          <output className="parameter-value" htmlFor={id}>
            {numeric}
            {unit}
          </output>
          <RangeSlider
            id={id}
            control={control}
            setting={setting}
            min={control.min ?? 0}
            max={control.max ?? 100}
            step={control.step ?? 1}
            value={numeric}
            ariaValueText={`${numeric}${unit}`}
            onChange={update}
          />
        </div>
      </div>
    )
  },

  boolean: ({ id, value, update }: RendererProps) => (
    <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => update(option)}
          className={`choice-button ${value === option ? 'choice-button-active' : ''}`}
        >
          {option ? 'on' : 'off'}
        </button>
      ))}
    </div>
  ),
} satisfies Record<string, (props: RendererProps) => ReactNode>

type RendererKey = keyof typeof renderers

/** A `target` setting has no single value to edit, so it wins over valueType. */
function pickRenderer(control: Control, setting: Setting): RendererKey {
  if (setting.target !== undefined) return 'target'
  if (control.valueType === 'enum') {
    return (control.options?.length ?? 0) <= 4 ? 'choices' : 'select'
  }
  if (control.valueType === 'boolean') return 'boolean'
  return control.valueType === 'clock' ? 'clock' : 'number'
}

function Knob({ control, value }: { control: Control; value: ScalarValue }) {
  const style = { '--knob-angle': `${-135 + valuePosition(control, value) * 270}deg` } as CSSProperties
  return (
    <div className="knob" style={style} aria-hidden="true">
      <span />
    </div>
  )
}

interface Props {
  deviceId: string
  control: Control
  setting: Setting
  compareMode: boolean
}

export function ParameterControl({ deviceId, control, setting, compareMode }: Props) {
  const selectedPresetId = useRigStore((state) => state.selectedPresetId)
  const userValue = useRigStore((state) => state.overrides[selectedPresetId]?.[deviceId]?.[control.id])
  const setControl = useRigStore((state) => state.setControl)
  const resetControl = useRigStore((state) => state.resetControl)

  const recommended = formatSetting(setting)
  const value = userValue ?? settingValue(setting)
  const edited = userValue !== undefined
  const id = `${deviceId}-${control.id}`
  const rendererKey = pickRenderer(control, setting)
  const Renderer = renderers[rendererKey]
  // Only these renderers put a labelable element on `id`. `target` renders
  // prose and the radiogroups render buttons, which reference the label text
  // through aria-labelledby instead.
  const labelIsForControl = rendererKey === 'select' || rendererKey === 'clock' || rendererKey === 'number'

  return (
    <div className={`parameter ${edited ? 'parameter-edited' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {labelIsForControl ? (
            <label id={`${id}-label`} htmlFor={id} className="parameter-label">
              {control.label}
            </label>
          ) : (
            <span id={`${id}-label`} className="parameter-label">
              {control.label}
            </span>
          )}
          <span
            className={`state-badge state-badge-${setting.confidence} mt-1.5`}
            title={CONFIDENCE_TITLE[setting.confidence]}
          >
            {CONFIDENCE_LABEL[setting.confidence]}
          </span>
        </div>
        {edited && (
          <button
            type="button"
            className="icon-button"
            onClick={() => resetControl(deviceId, control.id)}
            aria-label={`重設 ${control.label}`}
            title="回到 JSON 建議值"
          >
            <RotateCcw aria-hidden="true" size={15} />
          </button>
        )}
      </div>

      <Renderer
        id={id}
        control={control}
        setting={setting}
        value={value}
        update={(next: ScalarValue) => setControl(deviceId, control.id, next)}
      />

      {/* Range sliders and selects print blank; keep the value visible on paper. */}
      <p className="print-value">
        {control.label}：{value === undefined ? recommended : String(value)}
      </p>

      {(compareMode || setting.notes || control.direction) && (
        <div className="parameter-meta">
          {compareMode && rendererKey !== 'target' && (
            <p>
              <span className="text-ink">建議：</span>
              {recommended}
            </p>
          )}
          {setting.notes && <p className="mt-1">{setting.notes}</p>}
          {control.direction && (
            <p className="mt-1">
              <span className="text-ink">左：</span>
              {control.direction.left}
              <span className="ml-1 text-ink">右：</span>
              {control.direction.right}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Legend for the band drawn on sliders and the per-setting state badges. */
export function ParameterLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-1 w-8 rounded-full bg-accent/45" />
        JSON 建議範圍
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-4 w-0.5 rounded bg-accent" />
        已偏離建議值
      </span>
      {(Object.keys(CONFIDENCE_LABEL) as SettingConfidence[]).map((level) => (
        <span key={level} className={`state-badge state-badge-${level}`} title={CONFIDENCE_TITLE[level]}>
          {CONFIDENCE_LABEL[level]}
        </span>
      ))}
    </div>
  )
}
