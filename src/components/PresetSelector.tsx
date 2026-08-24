import { Check, RotateCcw } from 'lucide-react'
import { pad2, rig } from '../lib/rig'
import { useRigStore } from '../store/useRigStore'

/**
 * A radiogroup, not a tablist: these buttons pick the rig-wide voice rather
 * than switching between panels on this page. The old `role="tab"` markup
 * announced "tab 1 of 5" with no tabpanel for a reader to move to.
 */
export function PresetSelector({ showReset = false }: { showReset?: boolean }) {
  const selectedPresetId = useRigStore((state) => state.selectedPresetId)
  const overrides = useRigStore((state) => state.overrides)
  const selectPreset = useRigStore((state) => state.selectPreset)
  const resetPreset = useRigStore((state) => state.resetPreset)
  const changedCount = Object.values(overrides[selectedPresetId] ?? {}).reduce(
    (total, controls) => total + Object.keys(controls).length,
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="preset-tabs" role="radiogroup" aria-label="選擇音色 Preset">
        {rig.presets.map((preset) => {
          const selected = preset.id === selectedPresetId
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectPreset(preset.id)}
              className={`preset-tab ${selected ? 'preset-tab-active' : ''}`}
            >
              <span className="font-display text-3xs text-muted">SLOT {pad2(preset.rigSlot)}</span>
              <span className="flex items-center gap-1.5 text-left text-sm font-semibold">
                {selected && <Check aria-hidden="true" size={14} />}
                {preset.name}
              </span>
            </button>
          )
        })}
      </div>
      {showReset && (
        <div
          className="flex min-h-9 flex-wrap items-center justify-between gap-4 text-xs text-muted"
          aria-live="polite"
        >
          <span>
            {changedCount ? `此音色有 ${changedCount} 個本機微調` : '目前使用 JSON 建議值，尚未微調'}
          </span>
          <button type="button" className="text-button" disabled={!changedCount} onClick={resetPreset}>
            <RotateCcw aria-hidden="true" size={14} />
            重設這組音色
          </button>
        </div>
      )}
    </div>
  )
}
