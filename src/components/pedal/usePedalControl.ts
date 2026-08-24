import { useCallback, useRef } from 'react'
import { anglePosition, knobAngle } from '../../lib/panel'
import { nudge, positionValue, valuePosition } from '../../lib/value'
import type { Control, ScalarValue } from '../../types'

/**
 * Turns pointer and keyboard input on a drawn control into a value change.
 * Interaction lives here rather than in the SVG components so the drawing
 * stays presentational and this logic can be tested on its own.
 */

/** Vertical drag distance, in px, for a full sweep of the control. */
const DRAG_RANGE = 140

export interface PedalControlHandlers {
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void
  onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => void
}

export function usePedalControl(
  control: Control,
  value: ScalarValue | undefined,
  onChange?: (next: ScalarValue) => void,
): PedalControlHandlers | undefined {
  const start = useRef<{ y: number; position: number } | null>(null)

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGGElement>) => {
      if (!onChange) return
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      start.current = {
        y: event.clientY,
        position: value === undefined ? 0.5 : valuePosition(control, value),
      }

      const target = event.currentTarget
      const move = (moveEvent: PointerEvent) => {
        if (!start.current) return
        const delta = (start.current.y - moveEvent.clientY) / DRAG_RANGE
        onChange(positionValue(control, start.current.position + delta))
      }
      const end = () => {
        start.current = null
        target.releasePointerCapture(event.pointerId)
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerup', end)
        target.removeEventListener('pointercancel', end)
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', end)
      target.addEventListener('pointercancel', end)
    },
    [control, value, onChange],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGGElement>) => {
      if (!onChange) return
      const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key]
      if (direction === undefined) return
      event.preventDefault()
      onChange(nudge(control, value, direction as 1 | -1))
    },
    [control, value, onChange],
  )

  return onChange ? { onPointerDown, onKeyDown } : undefined
}

export { anglePosition, knobAngle }
