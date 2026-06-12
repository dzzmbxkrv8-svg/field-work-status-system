import { useState, useEffect } from 'react'
import { STATUS_QUICK_ACTIONS } from '@/utils/constants'
import { AppIcon } from '@/utils/iconMap'
import { getAnnouncement } from '@/api/settings'

function getGreeting(text) {
  const hour = new Date().getHours()
  if (hour < 5) return text.worker.greetingNight
  if (hour < 11) return text.worker.greetingMorning
  if (hour < 17) return text.worker.greetingAfternoon
  return text.worker.greetingEvening
}

function TodayAssignmentCard({ assignments }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const active = assignments.filter(a => {
    const start = a.startDate ? new Date(a.startDate) : null
    const end = a.dueDate ? new Date(a.dueDate) : null
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)
    const notDone = a.raw_status !== 'cancelled' && a.raw_status !== 'completed'
    const inRange = start && start <= today && (!end || end >= today)
    return notDone && inRange
  })

  const upcoming = active.length === 0
    ? assignments
        .filter(a => {
          const start = a.startDate ? new Date(a.startDate) : null
          if (start) start.setHours(0, 0, 0, 0)
          return start && start > today && a.raw_status !== 'cancelled' && a.raw_status !== 'completed'
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 1)
    : []

  const items = active.length > 0 ? active : upcoming
  const isUpcoming = active.length === 0 && upcoming.length > 0

  if (items.length === 0) return null

  return (
    <section className="worker-card" style={{ background: '#ffffff', border: '1px solid #ebebf5' }}>
      <p className="worker-section-label" style={{ color: '#4f46e5', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.03em' }}>
        <AppIcon name={isUpcoming ? 'CalendarDays' : 'MapPin'} size={14} />
        {isUpcoming ? '次の担当現場' : '本日の担当現場'}
      </p>
      {items.map(a => (
        <div key={a.db_id || a.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{a.projectName || a.id}</p>
          {a.location && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(a.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <AppIcon name="MapPin" size={13} />
              {a.location}
              <span style={{ fontSize: '0.75rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>地図で開く</span>
            </a>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: '#475569', flexWrap: 'wrap' }}>
            {a.startDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AppIcon name="CalendarDays" size={12} />
                {a.startDate.slice(0, 10)}{a.dueDate && a.dueDate !== a.startDate ? ` 〜 ${a.dueDate.slice(0, 10)}` : ''}
              </span>
            )}
            {a.team_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AppIcon name="Users" size={12} />
                {a.team_name}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

export default function WorkerHomeTab({
  worker,
  text,
  state,
  todayAttendance,
  clockLoading,
  handleQuickAction,
  formatActionTimestamp,
  getStatusLabel,
  logout,
  assignments = [],
  announcementRefreshKey = 0,
}) {
  const quickLabels = text.worker.statusQuickLabels ?? {}
  const avatarContent = <span>{worker.name.slice(0, 1).toUpperCase()}</span>

  // お知らせをAPIから取得（SSEでキーが変わるたびに再取得）
  // refreshKeyRef を使って依存配列サイズを常に1に固定（HMR警告を防ぐ）
  const [announcement, setAnnouncement] = useState('')
  const refreshKeyRef = useRef(announcementRefreshKey)
  useEffect(() => {
    // ref の値が変わっていたら再取得
    if (refreshKeyRef.current !== announcementRefreshKey) {
      refreshKeyRef.current = announcementRefreshKey
    }
    getAnnouncement()
      .then(res => setAnnouncement(res.value ?? ''))
      .catch(() => {})
  }, [announcementRefreshKey])

  const statusSteps = [
    { key: 'woke_up_at',  label: '起床済み', color: '#f59e0b', iconName: 'Sunrise' },
    { key: 'departed_at', label: '出発済み', color: '#4f46e5', iconName: 'Car' },
    { key: 'arrived_at',  label: '現場到着', color: '#10b981', iconName: 'MapPin' },
    { key: 'finished_at', label: '作業終了', color: '#6b7280', iconName: 'CheckCircle' },
  ]
  const currentStep = [...statusSteps].reverse().find(s => todayAttendance?.[s.key])

  const historyItems = statusSteps
    .filter(item => {
      const isToday = todayAttendance &&
        (!todayAttendance.date || new Date(todayAttendance.date).toDateString() === new Date().toDateString())
      return isToday && todayAttendance && todayAttendance[item.key]
    })
    .map(item => ({ ...item, timestamp: todayAttendance[item.key] }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  const tickerText = announcement || '【安全通知】作業前に安全確認を必ず行ってください。ヘルメット・安全帯の着用を徹底してください。'

  return (
    <>
      {state.pendingActions.length > 0 && (
        <div className="worker-offline-banner">
          <span className="worker-offline-indicator"></span>
          <span>{text.worker.offlinePending(state.pendingActions.length)}</span>
        </div>
      )}

      <section className="worker-card worker-card-profile">
        <div className="worker-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="worker-avatar">{avatarContent}</div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0' }}>{getGreeting(text)}</p>
              <h2 style={{ margin: '0', fontSize: '1.4rem' }}>{worker.name}</h2>
            </div>
          </div>
          <button type="button" className="worker-logout" onClick={logout}>
            {text.actions.logout}
          </button>
        </div>

        <div className="worker-info-block">
          <div className="worker-info-row">
            <span className="worker-info-label">{text.worker.workerIdLabel}</span>
            <span className="worker-info-value">{worker.employee_id || worker.workerId}</span>
          </div>
          <div className="worker-info-row">
            <span className="worker-info-label">{text.table.headers.team || 'チーム'}</span>
            <span className="worker-info-value">{worker.team_name || worker.team}</span>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>本日のステータス：</span>
          {currentStep ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: currentStep.color, color: '#fff',
              borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold',
              padding: '0.2rem 0.75rem',
            }}>
              <AppIcon name={currentStep.iconName} size={13} /> {currentStep.label}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>未報告</span>
          )}
        </div>
      </section>

      <TodayAssignmentCard assignments={assignments} />

      <section className="safety-ticker">
        <span className="safety-icon"><AppIcon name="AlertTriangle" size={16} strokeWidth={2} /></span>
        <div className="safety-content">{tickerText}</div>
      </section>

      <section className="worker-card worker-card-actions">
        <p className="worker-section-label">{text.worker.quickStatusTitle || '現場ステータス報告'}</p>
        <div className="worker-actions-grid">
          {STATUS_QUICK_ACTIONS.map((action) => {
            const actionLabel = quickLabels[action.status] ?? getStatusLabel(action.status)
            const isRecorded = todayAttendance && todayAttendance[`${action.status}_at`]
            return (
              <button
                key={action.status}
                type="button"
                className={`worker-action worker-action-${action.variant}`}
                onClick={() => handleQuickAction(action)}
                disabled={clockLoading || isRecorded}
                style={isRecorded ? { opacity: 1, background: '#f0fdf4', border: '2px solid #86efac', color: '#15803d' } : {}}
              >
                <span className="worker-action-icon" aria-hidden="true">
                  {isRecorded
                    ? <AppIcon name="CheckCircle" size={20} />
                    : <AppIcon name={action.icon} size={20} />}
                </span>
                <span>{isRecorded ? `${actionLabel} 済み` : actionLabel}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="worker-card worker-card-history">
        <p className="worker-section-label">当日クイックアクション履歴</p>
        <div className="worker-clock-history-list">
          {historyItems.length === 0 ? (
            <p className="worker-empty-mini" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              本日の履歴はありません
            </p>
          ) : (
            historyItems.map((item, idx) => (
              <div key={idx} className="worker-history-item-row" style={{
                padding: '0.75rem 0',
                borderBottom: idx === historyItems.length - 1 ? 'none' : '1px solid var(--color-border-light)',
                fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', color: item.color }}>
                  <AppIcon name={item.iconName} size={16} strokeWidth={2} />
                </span>
                <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{item.label}</span>
                <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{formatActionTimestamp(item.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
