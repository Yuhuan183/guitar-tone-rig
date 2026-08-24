import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  FlaskConical,
  PowerOff,
  Scale,
  Settings2,
  Wrench,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChainEvaluation, ComparisonTable } from '../components/DeviceEvaluation'
import { DeviceParameters } from '../components/parameters/DeviceParameters'
import { PedalGraphic } from '../components/pedal/PedalGraphic'
import { GainReductionMeter } from '../components/GainReductionMeter'
import { ParameterLegend } from '../components/parameters/ParameterControl'
import {
  DataTable,
  Disclosure,
  InfoCard,
  Kicker,
  Notice,
  PageHeader,
  SectionHeader,
  StepList,
} from '../components/primitives'
import {
  adjacentStages,
  categoryLabel,
  deviceById,
  guides,
  mergeSettings,
  pad2,
  rig,
  safetyRulesFor,
} from '../lib/rig'
import { panelLayout, voicesEngaging } from '../lib/panel'
import { useRigStore, useSelectedPreset } from '../store/useRigStore'
import type { ScalarValue } from '../types'

/** Stable identity so the selector does not return a new object each render. */
const EMPTY_OVERRIDES: Record<string, ScalarValue> = {}

export function DevicePage() {
  const { deviceId } = useParams()
  const preset = useSelectedPreset()
  const compareMode = useRigStore((state) => state.compareMode)
  const selectPreset = useRigStore((state) => state.selectPreset)
  const setControl = useRigStore((state) => state.setControl)
  const device = deviceId ? deviceById.get(deviceId) : undefined

  const settings = useMemo(
    () => (device ? (mergeSettings(rig.baseline.settings, preset.settings)[device.id] ?? []) : []),
    [device, preset],
  )
  const settingsByControl = useMemo(
    () => new Map(settings.map((setting) => [setting.controlId, setting])),
    [settings],
  )
  const deviceOverrides = useRigStore((state) =>
    device ? (state.overrides[preset.id]?.[device.id] ?? EMPTY_OVERRIDES) : EMPTY_OVERRIDES,
  )

  if (!device) return <Navigate to="/" replace />

  const guide = guides.guides[device.id]
  /**
   * A reference device is studied, not played: it has no chain position, no
   * settings in any voice, and nothing to export, so the whole tuning half of
   * this page is replaced by the comparison and the evaluation.
   */
  const isReference = device.placement === 'reference'
  const { previous, next, position, total } = adjacentStages(device.id)
  const bypassedHere = !isReference && panelLayout(device, settings, deviceOverrides).bypassed
  const { engaged } = voicesEngaging(device, rig.presets, rig.baseline.settings)

  return (
    <div className="space-y-7">
      <div>
        <Link to="/" className="text-button w-fit">
          <ArrowLeft aria-hidden="true" size={15} />
          訊號鏈
        </Link>
        <div className="mt-4">
          <PageHeader
            eyebrow={guide?.eyebrow ?? categoryLabel(device.category)}
            title={device.model}
            description={guide?.summary ?? device.primaryRole}
            meta={
              <Kicker tone="muted" size="sm" className="mt-3">
                {device.manufacturer} · {isReference ? '參考機種，不在鏈上' : `第 ${position} / ${total} 級`}
              </Kicker>
            }
            action={
              <figure className="device-figure">
                <PedalGraphic
                  device={device}
                  settings={settings}
                  overrides={deviceOverrides}
                  onChange={
                    isReference ? undefined : (controlId, value) => setControl(device.id, controlId, value)
                  }
                />
                <figcaption className="device-figure-caption">
                  <Kicker tone="muted" size="sm">
                    {isReference ? '無設定值' : preset.name}
                  </Kicker>
                  <span>
                    {isReference
                      ? '沒有進過這條鏈，所以旋鈕一律是未設定。'
                      : '可直接拖曳旋鈕，或用方向鍵微調。'}
                  </span>
                </figcaption>
              </figure>
            }
          />
        </div>
      </div>

      {safetyRulesFor(device.id).map((entry) => (
        <Notice key={entry.rule} icon={CircleAlert} tone="danger" title="硬性限制">
          {entry.rule}
        </Notice>
      ))}

      {guide?.warning && (
        <Notice icon={CircleAlert} tone="warning" title="注意">
          {guide.warning}
        </Notice>
      )}

      {bypassedHere && (
        <Notice icon={PowerOff} tone="neutral" title={`在「${preset.name}」是 Bypass`}>
          這條鏈上它是關閉的，所以下面只有開關本身。
          {engaged.length > 0 && (
            <span className="mt-3 flex flex-wrap gap-2">
              {engaged.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="choice-button px-3"
                  onClick={() => selectPreset(item.id)}
                >
                  切到 {item.name}
                </button>
              ))}
            </span>
          )}
        </Notice>
      )}
      {device.id === 'cali76' && <GainReductionMeter />}

      {isReference ? (
        <section className="console-panel" aria-labelledby="evaluation-title">
          <div className="border-b border-line pb-5">
            <SectionHeader
              eyebrow="Chain evaluation"
              title="音色鏈評估"
              description="它會放在哪一級、和誰的工作重疊，以及現在要不要加。"
              id="evaluation-title"
              action={<span className="status-pill">{guide?.comparisons?.length ?? 0} comparisons</span>}
            />
          </div>
          {guide?.evaluation && (
            <div className="mt-5">
              <ChainEvaluation model={device.model} evaluation={guide.evaluation} />
            </div>
          )}
          {guide?.comparisons?.length ? (
            <div className="mt-5 border-t border-line pt-5">
              <Kicker as="p">和現有效果器比較</Kicker>
              <div className="mt-4">
                <ComparisonTable model={device.model} comparisons={guide.comparisons} />
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="console-panel" aria-labelledby="controls-title">
          <div className="border-b border-line pb-5">
            <SectionHeader
              eyebrow={`Slot ${pad2(preset.rigSlot)} · ${preset.name}`}
              title="參數"
              description="調整會與音色工作台同步，並保存在這台裝置。"
              id="controls-title"
              action={<span className="status-pill">{settings.length} controls</span>}
            />
          </div>
          <div className="mt-5">
            <ParameterLegend />
          </div>
          <div className="mt-5">
            <DeviceParameters
              device={device}
              settings={settings}
              compareMode={compareMode}
              columns="md:grid-cols-2 xl:grid-cols-3"
            />
          </div>
        </section>
      )}

      {guide && (
        <Disclosure icon={Settings2} title="調節取向" open>
          <div className="grid gap-3 md:grid-cols-3">
            {guide.principles.map((principle, index) => (
              <InfoCard
                key={principle.title}
                className="reference-card"
                kicker={pad2(index + 1)}
                title={principle.title}
              >
                {principle.body}
              </InfoCard>
            ))}
          </div>
          {guide.facts?.length ? (
            <ul className="mt-5 grid gap-3 border-t border-line pt-5 text-sm leading-6 text-muted md:grid-cols-2">
              {guide.facts.map((fact) => (
                <li key={fact} className="border-l-2 border-accent/40 pl-4">
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}
        </Disclosure>
      )}

      {guide?.workflow && (
        <Disclosure icon={Settings2} title={guide.workflow.title}>
          <StepList steps={guide.workflow.steps} />
        </Disclosure>
      )}

      {guide && (
        <Disclosure icon={Wrench} title="快速診斷">
          <DataTable
            label={`${device.model} 快速診斷`}
            columns={['症狀', '處理']}
            rows={guide.troubleshooting.map((item) => ({
              key: item.symptom,
              cells: [<strong className="text-ink">{item.symptom}</strong>, item.action],
            }))}
          />
        </Disclosure>
      )}

      <Disclosure icon={Settings2} title="完整參數定義">
        <DataTable
          label={`${device.model} 參數定義`}
          columns={['控制', '區塊', '形式', '資料型別', '調節方向／目前用途']}
          rows={device.controls.map((control) => ({
            key: control.id,
            cells: [
              <>
                <strong className="text-ink">{control.label}</strong>
                <code className="mt-1 block text-2xs text-muted">{control.id}</code>
              </>,
              device.sections.find((section) => section.id === control.section)?.label ?? control.section,
              control.type,
              control.valueType,
              guide?.controlNotes?.[control.id] ??
                (control.direction
                  ? `左：${control.direction.left}；右：${control.direction.right}`
                  : (settingsByControl.get(control.id)?.notes ?? '依模式或建議值選擇。')),
            ],
          }))}
        />
      </Disclosure>

      {guide && (guide.caveats?.length || guide.sources.length) && (
        <Disclosure icon={FlaskConical} title="信心邊界與資料來源">
          {guide.caveats?.length ? (
            <ul className="grid gap-3 text-sm leading-7 text-muted">
              {guide.caveats.map((caveat) => (
                <li key={caveat} className="border-l-2 border-warning/50 pl-4">
                  {caveat}
                </li>
              ))}
            </ul>
          ) : null}
          <div className={'flex flex-wrap gap-2 ' + (guide.caveats?.length ? 'mt-5' : '')}>
            {guide.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                {source.label}
                <ArrowUpRight aria-hidden="true" size={15} />
              </a>
            ))}
          </div>
        </Disclosure>
      )}

      {isReference ? (
        <Link to="/library" className="device-row group">
          <Scale aria-hidden="true" className="shrink-0 text-muted" size={16} />
          <span className="min-w-0 flex-1">
            <Kicker tone="muted" size="sm">
              沒有相鄰訊號級
            </Kicker>
            <span className="mt-1 block truncate text-base font-semibold text-ink">回知識庫比較其他器材</span>
          </span>
          <ArrowRight aria-hidden="true" className="shrink-0 text-muted" size={16} />
        </Link>
      ) : (
        <nav className="grid gap-3 sm:grid-cols-2" aria-label="相鄰訊號級">
          {previous ? (
            <Link to={`/devices/${previous.id}`} className="device-row group">
              <ArrowLeft aria-hidden="true" className="shrink-0 text-muted" size={16} />
              <span className="min-w-0 flex-1">
                <Kicker tone="muted" size="sm">
                  前一級
                </Kicker>
                <span className="mt-1 block truncate text-base font-semibold text-ink">{previous.model}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/devices/${next.id}`} className="device-row group sm:text-right">
              <span className="min-w-0 flex-1">
                <Kicker tone="muted" size="sm">
                  下一級
                </Kicker>
                <span className="mt-1 block truncate text-base font-semibold text-ink">{next.model}</span>
              </span>
              <ArrowRight aria-hidden="true" className="shrink-0 text-muted" size={16} />
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
