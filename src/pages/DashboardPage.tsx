import { CircleAlert, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Pedalboard } from '../components/pedal/Pedalboard'
import { SignalChain } from '../components/SignalChain'
import { Kicker, Notice, PageHeader, SectionHeader } from '../components/primitives'
import { pad2, rig } from '../lib/rig'
import { useRigStore, useSelectedPreset } from '../store/useRigStore'
import type { Preset } from '../types'

/**
 * Module scope, not the render body: a component declared inside a render is a
 * new type on every pass, so React would replace the whole radiogroup — and
 * the focused card with it — each time a voice is selected.
 */
function VoiceCard({
  item,
  selected,
  onSelect,
}: {
  item: Preset
  selected: boolean
  onSelect: (presetId: string) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(item.id)}
      className={`voice-card ${selected ? 'voice-card-active' : ''}`}
    >
      <span className="flex items-center justify-between gap-2">
        <Kicker tone="muted" size="sm">
          SLOT {pad2(item.rigSlot)}
        </Kicker>
        <span className="font-display text-3xs uppercase tracking-[0.1em] text-muted">{item.status}</span>
      </span>
      <strong className="mt-2 block text-lg font-semibold text-ink">{item.name}</strong>
      <span className="mt-1.5 block text-xs leading-6 text-muted">{item.target}</span>
      <span className="mt-3 flex flex-wrap gap-1.5">
        {item.genres.map((genre) => (
          <span key={genre} className="tag">
            {genre}
          </span>
        ))}
      </span>
    </button>
  )
}

/**
 * The chain comes first — the board and the flow diagram are two views of the
 * same thing — then the voices this chain supports, then the way in to each
 * pedal's controls.
 */
export function DashboardPage() {
  const preset = useSelectedPreset()
  const selectPreset = useRigStore((state) => state.selectPreset)

  const [primary, secondary] = useMemo(() => {
    const byTier = (tier: Preset['tier']) => rig.presets.filter((item) => item.tier === tier)
    return [byTier('primary'), byTier('secondary')]
  }, [])

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Rig overview"
        title="目前的效果鏈"
        description="先看盤上有什麼、訊號怎麼走，再選這條鏈支援的音色，最後進工作台調參數。"
        action={
          <Link to="/presets" className="primary-button shrink-0">
            <SlidersHorizontal aria-hidden="true" size={17} />
            開啟工作台
          </Link>
        }
      />

      <section aria-labelledby="board-heading">
        <SectionHeader
          eyebrow="Pedalboard"
          title="效果盤"
          description={`旋鈕位置取自「${preset.name}」的設定；點任何一顆進入它的參數與說明。`}
          id="board-heading"
        />
        <div className="mt-6">
          <Pedalboard />
        </div>
        <p className="mt-3 text-2xs text-muted">示意圖，非實機外觀。</p>
      </section>

      <section aria-labelledby="chain-heading">
        <SectionHeader
          eyebrow="Signal path"
          title="鍊式結構"
          description="同一條鏈的訊號流向，含輸入與監聽端點。"
          id="chain-heading"
          action={
            <Link to="/signal-chain" className="text-button">
              Gain Stacking 與 Gate
            </Link>
          }
        />
        <div className="mt-6">
          <SignalChain animate />
        </div>
        <Notice icon={CircleAlert} tone="danger" title="安全邊界" className="mt-4">
          {rig.safetyRules
            .slice(0, 2)
            .map((entry) => entry.rule)
            .join(' ')}
        </Notice>
      </section>

      <section aria-labelledby="voices-heading">
        <SectionHeader
          eyebrow="Supported voices"
          title="這條鏈支援的音色"
          description="主要音色是這條鏈的設計目標；次要音色是在它們之間推導出來的位置。"
          id="voices-heading"
        />
        <div className="mt-6 space-y-6" role="radiogroup" aria-label="選擇音色">
          <div>
            <Kicker>主要</Kicker>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {primary.map((item) => (
                <VoiceCard
                  key={item.id}
                  item={item}
                  selected={item.id === preset.id}
                  onSelect={selectPreset}
                />
              ))}
            </div>
          </div>
          <div>
            <Kicker tone="muted">次要</Kicker>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {secondary.map((item) => (
                <VoiceCard
                  key={item.id}
                  item={item}
                  selected={item.id === preset.id}
                  onSelect={selectPreset}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-5 flex items-start gap-3 text-xs leading-5 text-muted">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-accent" size={16} />
          rig v{rig.rigVersion}，尚未實機驗證；一次只改一到兩個參數，確認後從工作台匯出回 JSON。
        </p>
      </section>
    </div>
  )
}
