import type { PanelItem, PanelLayout } from './panel'
import type { Device } from '../types'

/**
 * Places panel controls inside the enclosure, in enclosure units. Separated
 * from the SVG so the layout can be asserted in a test without rendering.
 *
 * One shared scale for every pedal: `UNIT` px per enclosure unit means a
 * 2-unit-wide pedal is drawn exactly twice as wide as a 1-unit one, which is
 * what makes the board read as a board.
 */
export const UNIT = 64

/**
 * WCAG 2.2 target size. A dense enclosure like the IR-D shrinks its knobs to
 * fit, so an editable drawing has to scale up until they are reachable.
 */
export const MIN_TARGET_PX = 24

export interface Placed {
  item: PanelItem
  x: number
  y: number
}

export interface PedalGeometry {
  width: number
  height: number
  titleY: number
  knobs: Placed[]
  switches: Placed[]
  footswitches: Placed[]
  meters: { item: PanelItem; x: number; y: number; width: number }[]
  knobRadius: number
  /** px-per-unit at which the smallest control still meets MIN_TARGET_PX. */
  minInteractiveScale: number
}

const PAD = 0.16
const TITLE = 0.3

function grid(
  items: PanelItem[],
  perRow: number,
  left: number,
  span: number,
  top: number,
  rowHeight: number,
): Placed[] {
  return items.map((item, index) => {
    const row = Math.floor(index / perRow)
    const inRow = Math.min(perRow, items.length - row * perRow)
    const column = span / inRow
    return {
      item,
      x: left + column * (index % perRow) + column / 2,
      y: top + row * rowHeight,
    }
  })
}

export function pedalGeometry(device: Device, layout: PanelLayout): PedalGeometry {
  const width = device.appearance.widthUnits
  const height = device.appearance.heightUnits
  const inner = width - PAD * 2

  const perRow = Math.max(2, Math.round(inner / 0.42))
  const knobRows = Math.ceil(layout.knobs.length / perRow) || 0
  const switchRows = Math.ceil(layout.switches.length / perRow) || 0
  const footRow = layout.footswitches.length ? 0.34 : 0

  const bodyTop = TITLE + 0.06
  const bodyBottom = height - PAD - footRow
  const rows = knobRows + switchRows + (layout.meters.length ? 1 : 0)
  const rowHeight = rows > 0 ? Math.min(0.4, (bodyBottom - bodyTop) / rows) : 0
  const top = bodyTop + rowHeight / 2

  const knobRadius = Math.min(0.15, rowHeight * 0.4)

  return {
    width,
    height,
    titleY: TITLE,
    knobRadius,
    minInteractiveScale: knobRadius > 0 ? MIN_TARGET_PX / (knobRadius * 2 * 1.55) : UNIT,
    knobs: grid(layout.knobs, perRow, PAD, inner, top, rowHeight),
    switches: grid(layout.switches, perRow, PAD, inner, top + knobRows * rowHeight, rowHeight),
    meters: layout.meters.map((item) => ({
      item,
      x: PAD,
      y: bodyTop + (knobRows + switchRows) * rowHeight + rowHeight / 2,
      width: inner,
    })),
    footswitches: layout.footswitches.map((item, index) => ({
      item,
      x: (width / layout.footswitches.length) * index + width / layout.footswitches.length / 2,
      y: height - PAD - 0.08,
    })),
  }
}
