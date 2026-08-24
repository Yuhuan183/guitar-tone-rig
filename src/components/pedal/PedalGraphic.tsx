import { memo } from 'react'
import { panelLayout } from '../../lib/panel'
import { pedalGeometry, UNIT } from '../../lib/pedalGeometry'
import { truncate } from '../../lib/format'
import type { Device, ScalarValue, Setting } from '../../types'
import { FootSwitch, Knob, Meter, Switch } from './parts'
import { usePedalControl } from './usePedalControl'

/**
 * A schematic enclosure drawn from devices.json, with every control at the
 * value the given settings specify. Read-only by default; pass `onChange` and
 * the knobs become draggable and keyboard-operable.
 *
 * Every pedal renders at the same units-per-pixel, so relative sizes on the
 * board are true and one `--pedal-scale` resizes the whole board for RWD.
 */

interface Props {
  device: Device
  settings: Setting[]
  overrides?: Record<string, ScalarValue>
  /** Omit for a read-only drawing. */
  onChange?: (controlId: string, value: ScalarValue) => void
}

function InteractiveKnob({
  placed,
  face,
  radius,
  onChange,
  kind,
}: {
  placed: ReturnType<typeof pedalGeometry>['knobs'][number]
  face: string
  radius: number
  onChange?: (controlId: string, value: ScalarValue) => void
  kind: 'knob' | 'switch' | 'foot'
}) {
  const { item, x, y } = placed
  const handlers = usePedalControl(
    item.control,
    item.value,
    onChange ? (next) => onChange(item.control.id, next) : undefined,
  )
  const Part = kind === 'knob' ? Knob : kind === 'switch' ? Switch : FootSwitch
  return <Part item={item} x={x} y={y} face={face} handlers={handlers} radius={radius} />
}

export const PedalGraphic = memo(function PedalGraphic({
  device,
  settings,
  overrides = {},
  onChange,
}: Props) {
  const layout = panelLayout(device, settings, overrides)
  const geometry = pedalGeometry(device, layout)
  const { body, face } = device.appearance

  return (
    <svg
      className={`pedal-graphic ${layout.bypassed ? 'pedal-bypassed' : ''} ${onChange ? 'pedal-editable' : ''}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      style={{
        // An editable drawing grows until its smallest control meets the
        // touch-target minimum, but never past its container — on a phone the
        // 44px sliders below are the input, and the drawing is the readout.
        width: onChange
          ? `min(100%, calc(${geometry.width} * max(var(--pedal-scale, ${UNIT}px), ${geometry.minInteractiveScale.toFixed(2)}px)))`
          : `calc(${geometry.width} * var(--pedal-scale, ${UNIT}px))`,
      }}
      role={onChange ? 'group' : 'img'}
      aria-label={`${device.model} 面板示意圖`}
    >
      <rect
        x="0.008"
        y="0.008"
        width={geometry.width - 0.016}
        height={geometry.height - 0.016}
        rx="0.12"
        fill={body}
        className="pedal-body"
      />
      <text x={geometry.width / 2} y={geometry.titleY} className="pedal-title" fill={face}>
        {truncate(device.model, 22)}
      </text>

      {geometry.knobs.map((placed) => (
        <InteractiveKnob
          key={placed.item.control.id}
          placed={placed}
          face={face}
          radius={geometry.knobRadius}
          onChange={onChange}
          kind="knob"
        />
      ))}
      {geometry.switches.map((placed) => (
        <InteractiveKnob
          key={placed.item.control.id}
          placed={placed}
          face={face}
          radius={geometry.knobRadius}
          onChange={onChange}
          kind="switch"
        />
      ))}
      {geometry.meters.map(({ item, x, y, width }) => (
        <Meter key={item.control.id} item={item} x={x} y={y} width={width} />
      ))}
      {geometry.footswitches.map((placed) => (
        <InteractiveKnob
          key={placed.item.control.id}
          placed={placed}
          face={face}
          radius={geometry.knobRadius}
          onChange={onChange}
          kind="foot"
        />
      ))}
    </svg>
  )
})
