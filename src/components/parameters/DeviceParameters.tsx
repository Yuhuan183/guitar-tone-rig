import { useMemo } from 'react'
import { groupSettingsBySection } from '../../lib/rig'
import type { Device, Setting } from '../../types'
import { ParameterControl } from './ParameterControl'
import { Kicker } from '../primitives'

/**
 * Renders one device's settings grouped by its declared front-panel sections,
 * in catalog control order. rig.json authoring order is not display order —
 * flattening it put IR-D's Active Channel last, after nineteen other cards.
 */
export function DeviceParameters({
  device,
  settings,
  compareMode,
  columns = 'md:grid-cols-2 2xl:grid-cols-3',
}: {
  device: Device
  settings: Setting[]
  compareMode: boolean
  columns?: string
}) {
  const groups = useMemo(() => groupSettingsBySection(device, settings), [device, settings])

  if (!groups.length) return <p className="text-sm text-muted">這組音色沒有為此效果器指定參數。</p>

  return (
    <div className="grid gap-4">
      {groups.map(({ section, entries }) => (
        <section key={section.id} className="control-group" aria-labelledby={`${device.id}-${section.id}`}>
          <div className="control-group-title">
            <div className="min-w-0">
              <Kicker as="p">{section.label}</Kicker>
              {section.description && (
                <p className="mt-1 text-xs leading-5 text-muted">{section.description}</p>
              )}
            </div>
            <span className="shrink-0 font-display text-3xs text-muted">{entries.length}</span>
          </div>
          <h3 id={`${device.id}-${section.id}`} className="sr-only">
            {device.model} — {section.label}
          </h3>
          <div className={`grid gap-3 ${columns}`}>
            {entries.map(({ control, setting }) => (
              <ParameterControl
                key={control.id}
                deviceId={device.id}
                control={control}
                setting={setting}
                compareMode={compareMode}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
