import { Check, ClipboardCopy, Download, FileJson } from 'lucide-react'
import { useMemo, useState } from 'react'
import { copyText, diffPreset, downloadText, stringify, toRigPatch, toTuningSession } from '../lib/export'
import { useRigStore, useSelectedPreset } from '../store/useRigStore'
import { DataTable, Disclosure, Notice } from './primitives'

type Target = 'rig' | 'session'

const TARGETS: Record<Target, { label: string; file: string; hint: string }> = {
  rig: {
    label: 'rig.json 覆寫區塊',
    file: 'rig-patch.json',
    hint: '貼進 rig.json 對應 preset 的 settings；confidence 一律回到 needs-calibration，實機確認後才改 verified。',
  },
  session: {
    label: 'tuning-log 測試紀錄',
    file: 'tuning-session.json',
    hint: '補上吉他、拾音器、監聽、音量與保留／退回理由後，加進 tuning-log.json 的 sessions。',
  },
}

/**
 * Closes the loop the maintenance contract describes: local tuning goes back
 * out as JSON instead of being transcribed by eye.
 */
export function ExportPanel() {
  const preset = useSelectedPreset()
  const overrides = useRigStore((state) => state.overrides)
  const [target, setTarget] = useState<Target>('rig')
  const [copied, setCopied] = useState(false)

  const diffs = useMemo(() => diffPreset(preset, overrides), [preset, overrides])
  const payload = useMemo(
    () => stringify(target === 'rig' ? toRigPatch(preset, diffs) : toTuningSession(preset, diffs)),
    [target, preset, diffs],
  )

  if (!diffs.length) {
    return (
      <Notice icon={FileJson} tone="neutral">
        這組音色目前沒有本機微調。在工作台調整任何參數後，這裡會產生可貼回 <code>rig.json</code> 與{' '}
        <code>tuning-log.json</code> 的區塊。
      </Notice>
    )
  }

  const handleCopy = async () => {
    setCopied(await copyText(payload))
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-4">
      <DataTable
        label={`${preset.name} 的本機微調`}
        columns={['效果器', '控制', 'JSON 建議', '本機值']}
        rows={diffs.map((diff) => ({
          key: `${diff.deviceId}.${diff.controlId}`,
          cells: [
            diff.deviceModel,
            <>
              <strong className="text-ink">{diff.controlLabel}</strong>
              <code className="mt-1 block text-2xs text-muted">{diff.controlId}</code>
            </>,
            diff.beforeText,
            <strong className="text-accent">{String(diff.after)}</strong>,
          ],
        }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="radiogroup" aria-label="匯出格式">
          {(Object.keys(TARGETS) as Target[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={target === key}
              onClick={() => setTarget(key)}
              className={`choice-button px-3 ${target === key ? 'choice-button-active' : ''}`}
            >
              {TARGETS[key].label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" className="secondary-button" onClick={handleCopy}>
            {copied ? <Check aria-hidden="true" size={16} /> : <ClipboardCopy aria-hidden="true" size={16} />}
            {copied ? '已複製' : '複製 JSON'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => downloadText(TARGETS[target].file, payload)}
          >
            <Download aria-hidden="true" size={16} />
            下載
          </button>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted">{TARGETS[target].hint}</p>

      <Disclosure title="檢視 JSON">
        <pre className="table-scroll rounded-xl bg-canvas/60 p-4 font-display text-xs leading-6 text-muted">
          {payload}
        </pre>
      </Disclosure>
    </div>
  )
}
