import { ArrowDown, CircleAlert, CircleMinus, Shield, Zap } from 'lucide-react'
import { SignalChain } from '../components/SignalChain'
import { InfoCard, Kicker, Notice, PageHeader, SectionHeader } from '../components/primitives'
import { chainDevices, guides, pad2, referenceDevices, rig } from '../lib/rig'
import { VERDICTS } from '../lib/verdict'

export function SignalChainPage() {
  /**
   * Walked in signal order rather than catalog order, because the cards are
   * numbered: 01 has to be the first thing the guitar reaches.
   */
  const stages = chainDevices.flatMap((device) =>
    (guides.guides[device.id]?.chainRole ?? []).map((role) => ({
      key: `${device.id}-${role.scope ?? 'main'}`,
      deviceId: device.id,
      title: role.scope ? `${device.model} ${role.scope}` : device.model,
      ...role,
    })),
  )

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Signal architecture"
        title="訊號鏈與 Gate"
        description="判斷 EQ 或 Boost 的作用，不只看踏板排在哪裡，而是看它位於哪一個失真級的前面或後面。"
      />
      <SignalChain />

      <section className="grid gap-5 lg:grid-cols-2">
        <InfoCard icon={ArrowDown} kicker="Pre-shaping" title="失真前 EQ" headingLevel={2}>
          改變哪些頻率先撞進削波。削低頻讓失真更緊；推中頻讓 Attack 與音符核心更清楚。Ive 對 IR-D 就是
          Pre-EQ／Boost。
        </InfoCard>
        <InfoCard icon={ArrowDown} kicker="Post-shaping" title="失真後 EQ" headingLevel={2}>
          修整已形成的聲音，比較像混音。OX Stomp 的 Master 4-band EQ、Low／High Cut 位在 Cab／Mic 後。
        </InfoCard>
      </section>

      <Notice title="同一顆效果器可以同時是 Pre 與 Post">
        Ive 在 NOTADÜMBLË 後，所以是 NOTADÜMBLË Drive 的 Post-shaping；它又在 IR-D 前，因此是 IR-D 的 Pre-EQ。
      </Notice>

      <section>
        <SectionHeader eyebrow="Gain responsibilities" title="每一級的工作" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage, index) => (
            <InfoCard
              key={stage.key}
              kicker={pad2(index + 1)}
              title={stage.title}
              to={`/devices/${stage.deviceId}`}
              footer={<span className="text-warning">避免：{stage.avoid}</span>}
            >
              {stage.job}
            </InfoCard>
          ))}
        </div>
      </section>

      {(rig.openSlots ?? []).map((slot) => (
        <section key={slot.id} aria-labelledby={`slot-${slot.id}`}>
          <SectionHeader
            eyebrow="Open slot"
            title={`還缺一級：${slot.label}`}
            description={slot.problem}
            id={`slot-${slot.id}`}
          />
          {slot.topology?.length ? (
            <div className="equipment-panel mt-6">
              <Kicker>Recommended topology</Kicker>
              <ol className="mt-6 space-y-3 font-display text-sm">
                {slot.topology.map((line, index) => (
                  <li key={line} className="flex gap-3">
                    <span className="text-accent">{pad2(index + 1)}</span>
                    <span className="text-ink">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {slot.candidates.map((candidate) => (
              <InfoCard
                key={candidate.url}
                icon={Zap}
                badge={<span className="tag">{candidate.verdict}</span>}
                title={candidate.name}
                href={candidate.url}
              >
                {candidate.notes}
              </InfoCard>
            ))}
          </div>
          {slot.rules?.length ? (
            <div className="equipment-panel mt-5">
              <div className="flex items-center gap-3">
                <Shield aria-hidden="true" className="text-accent" size={21} />
                <h3 className="text-xl font-semibold text-ink">不管選哪一顆都成立的原則</h3>
              </div>
              <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:grid-cols-2">
                {slot.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}

      <section>
        <SectionHeader eyebrow="Hard limits" title="安全規則" />
        <ul className="mt-6 grid gap-3">
          {rig.safetyRules.map((entry) => (
            <li key={entry.rule}>
              <Notice icon={CircleAlert} tone="danger">
                {entry.rule}
              </Notice>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reference-heading">
        <SectionHeader
          eyebrow="On the shelf"
          title="暫時不放進鏈上的器材"
          description="不是不好，而是工作與現有的級重疊。只有需要一個現有鏈給不了的角色時才加回，而不是「再多一顆」。"
          id="reference-heading"
        />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {referenceDevices.map((device) => (
            <InfoCard
              key={device.id}
              icon={CircleMinus}
              badge={
                <span className="tag">
                  {VERDICTS[guides.guides[device.id]?.evaluation?.verdict ?? 'hold'].short}
                </span>
              }
              title={device.model}
              to={`/devices/${device.id}`}
            >
              {guides.guides[device.id]?.evaluation?.rationale}
            </InfoCard>
          ))}
        </div>
      </section>
    </div>
  )
}
