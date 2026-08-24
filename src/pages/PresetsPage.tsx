import { BookOpen, CircleCheck, Eye, EyeOff, FileJson, Wrench } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeviceParameters } from '../components/parameters/DeviceParameters'
import { ExportPanel } from '../components/ExportPanel'
import { ParameterLegend } from '../components/parameters/ParameterControl'
import { PresetSelector } from '../components/PresetSelector'
import { DataTable, Disclosure, Kicker, PageHeader, SectionHeader, StepList } from '../components/primitives'
import { catalog, deviceById, mergeSettings, pad2, rig } from '../lib/rig'
import { useStickyStack } from '../lib/useStickyStack'
import { useRigStore, useSelectedPreset } from '../store/useRigStore'

export function PresetsPage() {
  const preset = useSelectedPreset()
  const { ref: presetBarRef, height: presetBarHeight } = useStickyStack<HTMLElement>()
  const compareMode = useRigStore((state) => state.compareMode)
  const toggleCompareMode = useRigStore((state) => state.toggleCompareMode)

  const settings = useMemo(() => mergeSettings(rig.baseline.settings, preset.settings), [preset])
  const availableDevices = useMemo(
    () => catalog.devices.filter((device) => (settings[device.id]?.length ?? 0) > 0),
    [settings],
  )

  // Derived, not synced: when the chosen device is not in this preset the
  // first available one takes over without an effect and an extra render.
  const [activeDeviceId, setActiveDeviceId] = useState(availableDevices[0]?.id ?? '')
  const activeDevice = availableDevices.find((device) => device.id === activeDeviceId) ?? availableDevices[0]

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Interactive rig editor"
        title="音色工作台"
        description="先選音色，再聚焦一顆效果器。微調會保存在這台裝置，不會改寫原始 JSON。"
        action={
          <button
            type="button"
            className="secondary-button shrink-0"
            aria-pressed={compareMode}
            onClick={toggleCompareMode}
          >
            {compareMode ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            {compareMode ? '隱藏建議' : '顯示建議'}
          </button>
        }
      />

      <section className="console-panel sticky-preset" aria-label="選取音色" ref={presetBarRef}>
        <PresetSelector showReset />
      </section>

      <section
        className="workbench-layout"
        style={{ '--sticky-preset-height': `${presetBarHeight}px` } as CSSProperties}
      >
        <nav className="workbench-nav" aria-label="選擇效果器">
          <div className="px-1 pb-3">
            <Kicker tone="muted" size="sm">
              Signal stages
            </Kicker>
            <p className="mt-1 text-xs text-muted">一次顯示一級，方便比較與校正。</p>
          </div>
          <div className="device-tabs" role="radiogroup" aria-label="效果器">
            {availableDevices.map((device, index) => (
              <button
                key={device.id}
                type="button"
                role="radio"
                aria-checked={device.id === activeDevice?.id}
                className={'device-tab ' + (device.id === activeDevice?.id ? 'device-tab-active' : '')}
                onClick={() => setActiveDeviceId(device.id)}
              >
                <span className="device-index">{pad2(index + 1)}</span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold">{device.model}</span>
                  <span className="mt-0.5 block truncate text-2xs text-muted">{device.primaryRole}</span>
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {activeDevice && (
            <section className="console-panel" aria-labelledby="active-device-heading">
              <div className="border-b border-line/70 pb-5">
                <SectionHeader
                  eyebrow={activeDevice.manufacturer}
                  title={activeDevice.model}
                  description={activeDevice.primaryRole}
                  id="active-device-heading"
                  action={
                    <Link to={'/devices/' + activeDevice.id} className="text-button">
                      使用說明
                    </Link>
                  }
                />
              </div>
              <div className="mt-5">
                <ParameterLegend />
              </div>
              <div className="mt-5">
                <DeviceParameters
                  device={activeDevice}
                  settings={settings[activeDevice.id] ?? []}
                  compareMode={compareMode}
                />
              </div>
            </section>
          )}
        </div>

        <aside className="workbench-context">
          <div className="console-panel">
            <span className="status-pill">SLOT {pad2(preset.rigSlot)}</span>
            <h2 className="mt-4 text-xl font-semibold text-ink">{preset.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{preset.target}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {preset.genres.map((genre) => (
                <span key={genre} className="tag">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Disclosure icon={FileJson} title="把本機微調寫回 JSON">
        <ExportPanel />
      </Disclosure>

      <Disclosure icon={CircleCheck} title={rig.calibration.title}>
        <StepList steps={rig.calibration.steps} />
      </Disclosure>

      <Disclosure icon={BookOpen} title="參數與狀態的讀法">
        <DataTable
          label="參數表示法"
          columns={['JSON 寫法', '意思', '工作台行為']}
          rows={valueShapes.map(([shape, meaning, behaviour]) => ({
            key: shape,
            cells: [<code>{shape}</code>, meaning, behaviour],
          }))}
        />
        <div className="mt-5">
          <DataTable
            label="設定值信心度"
            columns={['狀態', '意思']}
            rows={settingStates.map(([state, meaning]) => ({
              key: state,
              cells: [<span className={`state-badge state-badge-${state}`}>{state}</span>, meaning],
            }))}
          />
        </div>
        <p className="mt-5 text-sm leading-7 text-muted">
          鐘點位置會受拾音器輸出、Cali76 Buffer、IR-D Channel Level 與監聽音量影響，一律以聽感與表頭
          讀數為準。「日系 Metal」指旋律型 J-Rock、Visual Kei 與傳統／現代 J-Metal，不等同 5150、 Rectifier
          或極端 Djent。
        </p>
      </Disclosure>

      <Disclosure icon={Wrench} title="跨效果器快速診斷">
        <DataTable
          label="跨效果器診斷"
          columns={['症狀', '先檢查', '牽涉的效果器']}
          rows={rig.diagnostics.map((diagnostic) => ({
            key: diagnostic.symptom,
            cells: [
              <strong className="text-ink">{diagnostic.symptom}</strong>,
              diagnostic.check,
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {diagnostic.devices.map((deviceId) => (
                  <Link key={deviceId} to={`/devices/${deviceId}`} className="table-link">
                    {deviceById.get(deviceId)?.model ?? deviceId}
                  </Link>
                ))}
              </span>,
            ],
          }))}
        />
      </Disclosure>
    </div>
  )
}

const valueShapes = [
  ['value', '明確的 enum、clock 或 number', '直接顯示與編輯'],
  ['range', '尚待實機校正的建議範圍', '從範圍中點開始，範圍畫在滑桿軌道上'],
  ['choices', '偏好值與替代值', '預設 preferred，選單保留其他合法值'],
  ['target', '不能只用單一數字表達的聽感', '作為文字目標，不提供滑桿'],
] as const

const settingStates = [
  ['provisional', '接線或模式決策，尚未以聽感驗證。'],
  ['needs-calibration', '起始建議值，必須以實機與實際音量校正。'],
  ['verified', '已在穩定條件下重複確認。'],
] as const
