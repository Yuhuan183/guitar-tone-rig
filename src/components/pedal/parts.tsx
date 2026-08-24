import type { CSSProperties, ReactNode } from 'react'
import { knobAngle } from '../../lib/panel'
import type { PanelItem } from '../../lib/panel'
import { truncate } from '../../lib/format'
import { formatSetting } from '../../lib/value'
import type { PedalControlHandlers } from './usePedalControl'

/**
 * Presentational SVG parts. Each takes a resolved PanelItem and a position in
 * enclosure units; none of them know about the store, the rig, or each other.
 */

interface PartProps {
  item: PanelItem
  x: number
  y: number
  face: string
  handlers?: PedalControlHandlers
}

/** Wraps a part so it is focusable and announced only when it is editable. */
function Control({
  item,
  handlers,
  transform,
  hitRadius,
  children,
}: {
  item: PanelItem
  handlers?: PedalControlHandlers
  transform: string
  /** Enclosure units; padded out so a drawn knob is still a real touch target. */
  hitRadius: number
  children: ReactNode
}) {
  const interactive = Boolean(handlers)
  const label = `${item.control.label}：${item.value === undefined ? '未設定' : String(item.value)}`
  return (
    <g
      transform={transform}
      className={[item.unset && 'pedal-unset', interactive && 'pedal-interactive'].filter(Boolean).join(' ')}
      {...(interactive
        ? {
            role: 'slider',
            tabIndex: 0,
            'aria-label': label,
            'aria-valuenow': Math.round(item.position * 100),
            'aria-valuetext': label,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            ...handlers,
          }
        : { 'aria-hidden': true })}
    >
      {interactive && <circle r={hitRadius} className="pedal-hit-area" />}
      {children}
    </g>
  )
}

export function Knob({ item, x, y, face, handlers, radius }: PartProps & { radius: number }) {
  return (
    <Control item={item} handlers={handlers} hitRadius={radius * 1.55} transform={`translate(${x} ${y})`}>
      <circle r={radius} className="pedal-knob-body" />
      <circle r={radius} className="pedal-knob-ring" />
      <g
        className="pedal-knob-pointer"
        style={{ '--pedal-knob-angle': `${knobAngle(item.position)}deg` } as CSSProperties}
      >
        <line x1="0" y1={-radius * 0.22} x2="0" y2={-radius * 0.82} />
      </g>
      <text y={radius + 0.09} className="pedal-legend" fill={face}>
        {truncate(item.control.label, 11)}
      </text>
    </Control>
  )
}

export function Switch({ item, x, y, face, handlers, radius }: PartProps & { radius: number }) {
  const travel = (item.position - 0.5) * radius * 1.1
  return (
    <Control item={item} handlers={handlers} hitRadius={radius * 1.55} transform={`translate(${x} ${y})`}>
      <rect
        x={-radius * 0.38}
        y={-radius * 0.72}
        width={radius * 0.76}
        height={radius * 1.44}
        rx={radius * 0.38}
        className="pedal-switch-body"
      />
      <circle cy={travel} r={radius * 0.3} className="pedal-switch-cap" />
      <text y={radius + 0.09} className="pedal-legend" fill={face}>
        {truncate(item.control.label, 11)}
      </text>
    </Control>
  )
}

export function FootSwitch({ item, x, y, handlers, radius }: PartProps & { radius: number }) {
  return (
    <Control item={item} handlers={handlers} hitRadius={radius * 1.55} transform={`translate(${x} ${y})`}>
      <circle
        r={radius * 0.34}
        cy={-radius * 1.1}
        className={`pedal-led ${item.engaged ? 'pedal-led-on' : ''}`}
      />
      <circle r={radius * 0.78} className="pedal-foot-body" />
      <circle r={radius * 0.38} className="pedal-foot-cap" />
    </Control>
  )
}

export function Meter({ item, x, y, width }: { item: PanelItem; x: number; y: number; width: number }) {
  const count = 10
  const lit = item.unset ? 0 : Math.round(item.position * count)
  const step = width / count
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <title>{formatSetting()}</title>
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x={index * step}
          width={step * 0.72}
          height={0.055}
          rx={0.028}
          className={`pedal-meter-seg ${index < lit ? 'pedal-meter-seg-on' : ''}`}
        />
      ))}
    </g>
  )
}
