import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { PedalGraphic } from './PedalGraphic'
import { Kicker } from '../primitives'
import { chainDevices, mergeSettings, pad2, rig } from '../../lib/rig'
import { panelLayout } from '../../lib/panel'
import { useRigStore, useSelectedPreset } from '../../store/useRigStore'

/**
 * The board as it stands for the current voice: which stages are engaged, and
 * where every panel control sits. Switching voices animates the knobs to their
 * new positions, which is also the fastest way to see what a voice changes.
 */
export function Pedalboard() {
  const preset = useSelectedPreset()
  const overrides = useRigStore((state) => state.overrides[preset.id])
  const settings = useMemo(() => mergeSettings(rig.baseline.settings, preset.settings), [preset])

  return (
    <div className="pedalboard">
      {chainDevices.map((device, index) => {
        const deviceSettings = settings[device.id] ?? []
        const deviceOverrides = overrides?.[device.id] ?? {}
        const { bypassed, footswitches } = panelLayout(device, deviceSettings, deviceOverrides)
        const state = footswitches.length === 0 ? 'always-on' : bypassed ? 'bypass' : 'engaged'

        return (
          <Link key={device.id} to={`/devices/${device.id}`} className="pedalboard-slot group">
            <div className="pedalboard-slot-head">
              <Kicker tone="muted" size="sm">
                {pad2(index + 1)}
              </Kicker>
              <span className={`pedal-state pedal-state-${state}`}>
                {state === 'bypass' ? 'BYPASS' : state === 'always-on' ? 'ALWAYS ON' : 'ON'}
              </span>
            </div>
            <PedalGraphic device={device} settings={deviceSettings} overrides={deviceOverrides} />
            <p className="pedalboard-slot-role">{device.primaryRole}</p>
          </Link>
        )
      })}
    </div>
  )
}
