import { Link } from 'react-router-dom'
import { DataTable, InfoCard, Kicker } from './primitives'
import { deviceById } from '../lib/rig'
import { VERDICTS } from '../lib/verdict'
import type { Comparison, Evaluation } from '../types'

/**
 * The two things a reference device exists to answer: how it differs from what
 * is already on the board, and whether it earns a slot. Both are driven by
 * device-guides.json, so a comparison cannot name a pedal the catalog dropped.
 */

/** A device name that is always a link, so a comparison is one click deep. */
function DeviceLink({ deviceId }: { deviceId: string }) {
  const device = deviceById.get(deviceId)
  if (!device) return <span className="text-muted">{deviceId}</span>
  return (
    <Link to={`/devices/${device.id}`} className="table-link">
      {device.model}
    </Link>
  )
}

export function ComparisonTable({ model, comparisons }: { model: string; comparisons: Comparison[] }) {
  return (
    <DataTable
      label={`${model} 與現有效果器的比較`}
      columns={['對照', '重疊的工作', '差在哪裡', '什麼時候選它']}
      rows={comparisons.map((comparison) => ({
        key: comparison.deviceId,
        cells: [
          <DeviceLink deviceId={comparison.deviceId} />,
          comparison.shared,
          comparison.differs,
          comparison.chooseWhen,
        ],
      }))}
    />
  )
}

/**
 * Each position is judged on its own, because a versatile pedal is not one
 * decision — deciding it is worth adding means deciding which of its jobs the
 * chain actually needs.
 */
function PlacementTable({ model, placements }: { model: string; placements: Evaluation['placements'] }) {
  return (
    <DataTable
      label={`${model} 的放置方式`}
      columns={['角色', '訊號順序', '判斷']}
      rows={placements.map((placement, index) => ({
        key: `${placement.chain}-${index}`,
        cells: [
          <strong className="text-ink">{placement.role ?? '唯一考慮的位置'}</strong>,
          <code className="text-2xs">{placement.chain}</code>,
          placement.verdict,
        ],
      }))}
    />
  )
}

export function ChainEvaluation({ model, evaluation }: { model: string; evaluation: Evaluation }) {
  const verdict = VERDICTS[evaluation.verdict]

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        <InfoCard
          tone={verdict.tone}
          kicker="Verdict"
          badge={<span className="tag">{verdict.label}</span>}
          title="評估結論"
        >
          {evaluation.rationale}
        </InfoCard>

        <InfoCard tone="muted" kicker="Overlap" title="和誰的工作重疊">
          {evaluation.overlaps?.length ? (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {evaluation.overlaps.map((deviceId) => (
                <DeviceLink key={deviceId} deviceId={deviceId} />
              ))}
            </span>
          ) : (
            '沒有和鏈上任何一級重疊，是這條鏈目前缺的角色。'
          )}
          {evaluation.tradeoffs?.length ? (
            <span className="mt-4 block border-t border-line pt-4">
              <Kicker as="span" tone="muted" size="sm">
                加進來的代價
              </Kicker>
              <span className="mt-2 grid gap-2">
                {evaluation.tradeoffs.map((tradeoff) => (
                  <span key={tradeoff} className="block border-l-2 border-warning/50 pl-4">
                    {tradeoff}
                  </span>
                ))}
              </span>
            </span>
          ) : null}
        </InfoCard>
      </div>

      <PlacementTable model={model} placements={evaluation.placements} />
    </div>
  )
}
