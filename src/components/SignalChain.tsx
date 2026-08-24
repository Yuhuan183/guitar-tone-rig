import { ArrowRight, Guitar, Radio, Speaker } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { deviceById, pad2, rig } from '../lib/rig'

/**
 * Wraps onto as many rows as it needs rather than scrolling sideways: a
 * horizontal scroller inside a vertically scrolling page hides the tail of the
 * chain and fights the reading direction.
 */
export function SignalChain({ compact = false, animate = false }: { compact?: boolean; animate?: boolean }) {
  return (
    <ol
      className={['chain-flow', compact && 'chain-flow-compact', animate && 'chain-flow-live']
        .filter(Boolean)
        .join(' ')}
      aria-label="目前吉他訊號鏈"
    >
      {rig.signalChain.map((node, index) => {
        const device = node.deviceId ? deviceById.get(node.deviceId) : undefined
        const isInput = node.id === 'guitar'
        const Icon = isInput ? Guitar : device ? Radio : Speaker
        const card = (
          <div className={`chain-node ${device ? 'chain-node-device' : ''}`}>
            <div className="mb-3 flex items-center justify-between text-muted">
              <Icon aria-hidden="true" size={17} />
              <span className="font-display text-2xs tracking-[0.16em]">{pad2(node.order)}</span>
            </div>
            <strong className="block text-base font-semibold text-ink">{device?.model ?? node.label}</strong>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {device?.primaryRole ?? (isInput ? 'Pickup signal' : 'Stereo monitoring')}
            </span>
          </div>
        )
        return (
          <li key={node.order} className="chain-step" style={{ '--chain-index': index } as CSSProperties}>
            {device ? <Link to={`/devices/${device.id}`}>{card}</Link> : card}
            {index < rig.signalChain.length - 1 && (
              <ArrowRight aria-hidden="true" className="chain-arrow" size={17} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
