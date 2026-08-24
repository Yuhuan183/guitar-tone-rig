import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PedalGraphic } from '../components/pedal/PedalGraphic'
import { DataTable, Kicker, PageHeader, SectionHeader } from '../components/primitives'
import {
  catalog,
  categoryLabel,
  chainDevices,
  guides,
  mergeSettings,
  pad2,
  referenceDevices,
  rig,
} from '../lib/rig'
import { useSelectedPreset } from '../store/useRigStore'
import type { Device } from '../types'

type Facet = 'chain' | 'category' | 'manufacturer'

/** A reference device has no chain position, so it says so instead of "第 00 級". */
const positionLabel = (device: Device): string => {
  const index = chainDevices.findIndex((item) => item.id === device.id)
  return index < 0 ? '參考機種' : `第 ${pad2(index + 1)} 級`
}

const FACETS: { id: Facet; label: string; describe: (device: Device) => string }[] = [
  { id: 'chain', label: '訊號位置', describe: positionLabel },
  { id: 'category', label: '分類', describe: (device) => categoryLabel(device.category) },
  { id: 'manufacturer', label: '製造商', describe: (device) => device.manufacturer },
]

const SURFACE_LABEL: Record<string, string> = {
  panel: '面板',
  internal: '內部 Trimmer',
  software: '軟體',
  derived: '衍生目標',
}

export function LibraryPage() {
  const preset = useSelectedPreset()
  const [facet, setFacet] = useState<Facet>('chain')
  const [query, setQuery] = useState('')

  const settings = useMemo(() => mergeSettings(rig.baseline.settings, preset.settings), [preset])

  /**
   * Grouping by chain position would make one group per device, so that facet
   * is a flat ordered list with the position on the card. The reference shelf
   * is a second list because it has no position to be ordered by.
   */
  const groups = useMemo(() => {
    if (facet === 'chain') {
      return [
        ['訊號鏈', chainDevices] as const,
        ...(referenceDevices.length ? [['參考機種', referenceDevices] as const] : []),
      ]
    }
    const describe = FACETS.find((item) => item.id === facet)!.describe
    const map = new Map<string, Device[]>()
    for (const device of catalog.devices) {
      const key = describe(device)
      map.set(key, [...(map.get(key) ?? []), device])
    }
    return [...map].map(([label, devices]) => [label, devices] as const)
  }, [facet])

  // The control index answers "which pedal has a Presence knob?" — the one
  // question a catalog grouped only by device cannot.
  const controlRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return catalog.devices
      .flatMap((device) =>
        device.controls.map((control) => ({
          device,
          control,
          section: device.sections.find((item) => item.id === control.section)?.label ?? control.section,
        })),
      )
      .filter(
        ({ device, control, section }) =>
          !needle ||
          [control.label, control.id, control.type, section, device.model, device.manufacturer]
            .join(' ')
            .toLowerCase()
            .includes(needle),
      )
  }, [query])

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Knowledge base"
        title="效果器知識庫"
        description="同一批器材的幾種看法：依訊號位置、分類或製造商瀏覽，或直接搜尋某一個控制項。"
      />

      <section aria-labelledby="browse-heading">
        <SectionHeader
          eyebrow="Browse"
          title="瀏覽方式"
          description={`面板圖的旋鈕位置取自目前選取的「${preset.name}」。`}
          id="browse-heading"
          action={
            <div className="flex gap-2" role="radiogroup" aria-label="分類方式">
              {FACETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={facet === item.id}
                  onClick={() => setFacet(item.id)}
                  className={`choice-button px-3 ${facet === item.id ? 'choice-button-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="mt-6 space-y-7">
          {groups.map(([label, devices]) => (
            <div key={label ?? 'all'}>
              {label && <Kicker>{label}</Kicker>}
              <div className={(label ? 'mt-3 ' : '') + 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>
                {devices.map((device) => (
                  <Link key={device.id} to={`/devices/${device.id}`} className="library-card group">
                    <div className="library-card-art">
                      <PedalGraphic device={device} settings={settings[device.id] ?? []} />
                    </div>
                    <div className="min-w-0">
                      <Kicker tone="muted" size="sm">
                        {positionLabel(device)} · {device.manufacturer}
                      </Kicker>
                      <strong className="mt-1 block truncate text-lg font-semibold text-ink">
                        {device.model}
                      </strong>
                      <p className="mt-1 text-xs leading-6 text-muted">{device.primaryRole}</p>
                      <p className="mt-2 text-2xs text-muted">
                        {categoryLabel(device.category)} · {device.controls.length} 個控制項 ·{' '}
                        {guides.guides[device.id]?.principles.length ?? 0} 條調節取向
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="controls-index">
        <SectionHeader
          eyebrow="Control index"
          title="控制項索引"
          description={`${controlRows.length} / ${catalog.devices.reduce((total, device) => total + device.controls.length, 0)} 個控制項`}
          id="controls-index"
        />
        <div className="mt-5">
          <label htmlFor="control-search" className="sr-only">
            搜尋控制項
          </label>
          <div className="search-field">
            <Search aria-hidden="true" size={16} className="shrink-0 text-muted" />
            <input
              id="control-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如 presence、saturation、knob、Friedman"
              className="search-input"
            />
          </div>
        </div>
        <div className="mt-5">
          <DataTable
            label="控制項索引"
            columns={['控制', '效果器', '區塊', '形式', '所在']}
            rows={controlRows.map(({ device, control, section }) => ({
              key: `${device.id}.${control.id}`,
              cells: [
                <>
                  <strong className="text-ink">{control.label}</strong>
                  <code className="mt-1 block text-2xs text-muted">{control.id}</code>
                </>,
                <Link to={`/devices/${device.id}`} className="table-link">
                  {device.model}
                </Link>,
                section,
                control.type,
                SURFACE_LABEL[control.surface] ?? control.surface,
              ],
            }))}
          />
        </div>
      </section>
    </div>
  )
}
