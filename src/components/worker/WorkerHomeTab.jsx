import { STATUS_QUICK_ACTIONS } from '@/utils/constants'

function getGreeting(text) {
  const hour = new Date().getHours()
  if (hour < 5) return text.worker.greetingNight
  if (hour < 11) return text.worker.greetingMorning
  if (hour < 17) return text.worker.greetingAfternoon
  return text.worker.greetingEvening
}

export default function WorkerHomeTab({
  worker,
  text,
  state,
  todayAttendance,
  incomingMessages,
  clockLoading,
  handleQuickAction,
  formatActionTimestamp,
  getStatusLabel,
  logout,
}) {
  const quickLabels = text.worker.statusQuickLabels ?? {}
  const avatarContent = <span>{worker.name.slice(0, 1).toUpperCase()}</span>

  const statusSteps = [
    { key: 'woke_up_at',  label: '起床済み', color: '#f59e0b', icon: '🌅' },
    { key: 'departed_at', label: '出発済み', color: '#3b82f6', icon: '🚗' },
    { key: 'arrived_at',  label: '現場到着', color: '#10b981', icon: '📍' },
    { key: 'finished_at', label: '作業終了', color: '#6b7280', icon: '✅' },
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

  const latestAdminMsg = incomingMessages[0]
  const tickerText = latestAdminMsg
    ? `【管理者からのお知らせ】${latestAdminMsg.message}`
    : '【安全通知】作業前に安全確認を必ず行ってください。ヘルメット・安全帯の着用を徹底してください。'

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
            <span className="worker-info-label">{text.login.accessCodeLabel}</span>
            <span className="worker-info-value">{worker.employee_id}</span>
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
              {currentStep.icon} {currentStep.label}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>未報告</span>
          )}
        </div>
      </section>

      <section className="safety-ticker">
        <span className="safety-icon">⚠️</span>
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
              >
                <span className="worker-action-icon" aria-hidden="true">{action.icon}</span>
                <span>{actionLabel}</span>
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
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
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
