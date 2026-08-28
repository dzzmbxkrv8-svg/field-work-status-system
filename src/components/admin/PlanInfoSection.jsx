import { useState, useEffect } from 'react'
import { getPlan } from '@/api/settings'
import { AppIcon } from '@/utils/iconMap'

// 契約プランと作業員数の利用状況を表示するセクション。
// 実際の決済(Stripe等)は未接続のため、プラン変更はFieldo運営への
// お問い合わせ導線のみを提供する（閲覧専用）。
export default function PlanInfoSection() {
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    getPlan().then(res => { if (res.success) setPlan(res.data) }).catch(() => {})
  }, [])

  if (!plan) return null

  const isUnlimited = plan.workerLimit == null
  const isNearLimit = !isUnlimited && plan.workerCount >= plan.workerLimit * 0.8
  const isOverLimit = !isUnlimited && plan.workerCount >= plan.workerLimit

  return (
    <section className="fws-panel" style={{ marginBottom: '1rem' }}>
      <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AppIcon name="ShieldCheck" size={16} style={{ color: '#4f46e5' }} />
          ご利用プラン
        </h3>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b' }}>{plan.planLabel}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: isOverLimit ? '#dc2626' : '#64748b' }}>
            作業員数: {plan.workerCount}名{isUnlimited ? '' : ` / 上限${plan.workerLimit}名`}
          </p>
        </div>
        {(isNearLimit || isOverLimit) && (
          <span style={{
            fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 8,
            background: isOverLimit ? '#fee2e2' : '#fffbeb',
            color: isOverLimit ? '#dc2626' : '#92400e',
          }}>
            {isOverLimit ? '上限に達しています' : 'まもなく上限です'}
          </span>
        )}
      </div>
      {(isNearLimit || isOverLimit) && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
          プランのアップグレードについてはFieldo運営にお問い合わせください。
        </p>
      )}
    </section>
  )
}
