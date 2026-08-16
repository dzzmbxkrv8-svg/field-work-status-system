import { useState, useMemo, useEffect } from 'react'
import { getAttachments } from '@/api/assignments'
import { AppIcon } from '@/utils/iconMap'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function AssignmentAttachments({ dbId }) {
  const [attachments, setAttachments] = useState([])
  useEffect(() => {
    if (!dbId) return
    getAttachments(dbId).then(res => {
      if (res.success) setAttachments(res.data || [])
    })
  }, [dbId])
  if (attachments.length === 0) return null
  return (
    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <AppIcon name="Paperclip" size={12} strokeWidth={2} />添付ファイル
      </span>
      {attachments.map(att => {
        const url = att.url?.startsWith('http') ? att.url : `${BASE_URL}${att.url}`
        const isImage = att.mime_type?.startsWith('image/')
        return isImage ? (
          <a key={att.id} href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
            <img src={url} alt={att.original_name} style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
          </a>
        ) : (
          <a key={att.id} href={url} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', background: '#f1f5f9', borderRadius: 6, fontSize: '0.78rem', color: '#4f46e5', textDecoration: 'none' }}>
            <AppIcon name="FileText" size={13} strokeWidth={2} />{att.original_name || att.file_name || 'ファイル'}
          </a>
        )
      })}
    </div>
  )
}

export default function WorkerCalendarTab({
  worker,
  text,
  language,
  assignments,
  completedIds,
  handleComplete,
  formatDate,
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedSchedule, setSelectedSchedule] = useState({ date: null, entries: [] })

  const calendarData = useMemo(() => {
    const today = new Date()
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const weeks = []
    for (let week = 0; week < 6; week += 1) {
      const days = []
      for (let d = 0; d < 7; d += 1) {
        const current = new Date(startDate)
        current.setDate(startDate.getDate() + week * 7 + d)
        days.push(current)
      }
      weeks.push(days)
    }
    const assignmentByDate = {}
    assignments.forEach(order => {
      const start = new Date(order.startDate)
      const end = new Date(order.dueDate || order.endDate || order.startDate)
      weeks.forEach(week => {
        week.forEach(day => {
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
          const orderStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
          const orderEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
          if (dayStart >= orderStart && dayStart <= orderEnd) {
            const key = day.toDateString()
            if (!assignmentByDate[key]) assignmentByDate[key] = []
            assignmentByDate[key].push(order)
          }
        })
      })
    })
    return { year, month, weeks, assignmentByDate, today }
  }, [assignments, calendarMonth])

  const [historyOpen, setHistoryOpen] = useState(false)

  const isCompleted = (id, status) =>
    completedIds.has(id) || status === 'Completed' || status === 'completed'

  // アクティブな案件（完了・キャンセル以外）
  const activeAssignments = useMemo(() =>
    assignments.filter(o => !isCompleted(o.id, o.status) && o.raw_status !== 'cancelled' && o.status?.toLowerCase() !== 'cancelled'),
  [assignments, completedIds])

  // 完了済みの案件（当日分のみ）
  const completedAssignments = useMemo(() => {
    const todayStr = new Date().toDateString()
    return assignments.filter(o => {
      if (!isCompleted(o.id, o.status)) return false
      // このセッションで完了した（楽観的更新）は常に当日
      if (completedIds.has(o.id)) return true
      // DBのupdated_atが今日なら表示
      if (o.updated_at) return new Date(o.updated_at).toDateString() === todayStr
      return false
    })
  }, [assignments, completedIds])

  const AssignmentCard = ({ entry, showCompleteButton }) => (
    <article key={entry.id} className="worker-assignment-card">
      <div className="worker-assignment-info">
        {isCompleted(entry.id, entry.status) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', padding: '0.4rem 0.75rem', background: '#d1fae5', borderRadius: '6px' }}>
            <AppIcon name="CheckCircle" size={14} strokeWidth={2} style={{ color: '#059669', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>完了済み</span>
          </div>
        )}
        <div className="worker-info-item">
          <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
          <strong>{entry.projectName || entry.title || entry.id}</strong>
        </div>
        <div className="worker-info-item">
          <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
          <span>
            {entry.location || text.worker.locationUnavailable}
            {entry.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: '#3B82F6', textDecoration: 'underline', cursor: 'pointer', marginLeft: '4px', fontSize: '0.85rem' }}
              >
                [MAP]
              </a>
            )}
          </span>
        </div>
        <div className="worker-info-item">
          <span className="worker-meta-label">{text.worker.assignmentDateLabel}:</span>
          <span>{formatDate(entry.startDate)}</span>
          <span className="worker-meta-label" style={{ marginLeft: '1rem' }}>{text.worker.assignmentCrewLabel}:</span>
          <span>{entry.crewCount || '—'}</span>
        </div>
        {entry.shift_type && (
          <div className="worker-info-item">
            <span className="worker-meta-label">勤務区分:</span>
            <span>{entry.shift_type}</span>
          </div>
        )}
        {entry.cautionNote && (
          <div className="worker-info-item">
            <span className="worker-meta-label">{text.worker.assignmentCautionLabel}:</span>
            <span>{entry.cautionNote}</span>
          </div>
        )}
        <div className="worker-info-item">
          <span className="worker-meta-label">{text.worker.assignmentTaskLabel}:</span>
          <span>{entry.notes || '—'}</span>
        </div>
        <div className="worker-info-item">
          <span className="worker-meta-label">{text.worker.assignmentMembersLabel}:</span>
          <span>{entry.members || '—'}</span>
        </div>
        <AssignmentAttachments dbId={entry.db_id} />
        {entry.location && showCompleteButton && (
          <div className="worker-assignment-links">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.location)}`} target="_blank" rel="noreferrer" className="worker-assignment-link">
              <AppIcon name="MapPin" size={13} strokeWidth={2} style={{ flexShrink: 0 }} />{text.worker.assignmentDocsLabel}
            </a>
          </div>
        )}
      </div>
      {showCompleteButton && (
        isCompleted(entry.id, entry.status) ? (
          <button disabled style={{ width: '100%', padding: '12px', backgroundColor: '#888', color: 'white', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '16px' }}>
            完了済み
          </button>
        ) : worker.id === entry.assigned_worker_id ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); handleComplete(entry) }} style={{ width: '100%', padding: '12px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            完了
          </button>
        ) : null
      )}
    </article>
  )

  return (
    <>
      <section className="worker-card worker-card-upcoming">
        <header>
          <h3>{text.worker.upcomingHeading}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              className="worker-nav-month-btn"
              onClick={() => {
                setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month - 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })
                setSelectedSchedule({ date: null, entries: [] })
              }}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '1rem' }}
            >
              ‹
            </button>
            <p className="worker-upcoming-month" style={{ margin: 0 }}>
              {new Date(calendarData.year, calendarData.month).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              className="worker-nav-month-btn"
              onClick={() => {
                setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month + 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })
                setSelectedSchedule({ date: null, entries: [] })
              }}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '1rem' }}
            >
              ›
            </button>
          </div>
        </header>

        <div className="worker-calendar">
          <div className="worker-calendar-row worker-calendar-head">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(l => <span key={l}>{l}</span>)}
          </div>
          {calendarData.weeks.map((week, idx) => (
            <div key={idx} className="worker-calendar-row">
              {week.map((day) => {
                const key = day.toDateString()
                const isCurrentMonth = day.getMonth() === calendarData.month
                const entries = calendarData.assignmentByDate[key] ?? []
                const isToday = day.toDateString() === calendarData.today.toDateString()
                return (
                  <button
                    type="button"
                    key={key}
                    className={`worker-calendar-cell ${isCurrentMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${entries.length > 0 ? 'has-event' : ''}`}
                    onClick={() => setSelectedSchedule({ date: new Date(day), entries })}
                  >
                    <span className="worker-calendar-day">{day.getDate()}</span>
                    {entries.length > 0 && <span className="worker-calendar-dot">●</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {selectedSchedule.date && (
          <section className="worker-calendar-details">
            <header>
              <h4>{formatDate(selectedSchedule.date)}</h4>
              <button className="worker-calendar-details-close" onClick={() => setSelectedSchedule({ date: null, entries: [] })}>×</button>
            </header>
            {selectedSchedule.entries.length > 0 ? (
              <div className="worker-assignment-grid">
                {selectedSchedule.entries.map((entry) => (
                  <AssignmentCard key={entry.id} entry={entry} showCompleteButton={!isCompleted(entry.id, entry.status)} />
                ))}
              </div>
            ) : (
              <p className="worker-calendar-no-events">{text.worker.calendarNoEvents}</p>
            )}
          </section>
        )}
      </section>

      {/* ── アクティブな案件一覧 ── */}
      <section className="worker-card worker-card-assignments">
        <header>
          <h3>{text.worker.assignmentHeading}</h3>
          <p className="worker-assignment-count">
            {activeAssignments.length}件
          </p>
        </header>
        {activeAssignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              <AppIcon name="CheckCircle" size={36} style={{ color: '#10b981', margin: '0 auto' }} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>現在の担当案件はありません</p>
          </div>
        ) : (
          <div className="worker-assignment-grid">
            {activeAssignments.map((order) => (
              <article key={order.id} className="worker-assignment-card">
                <div className="worker-assignment-info">
                  <div className="worker-info-item">
                    <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                    <strong>{order.projectName || order.title || order.id}</strong>
                  </div>
                  <div className="worker-info-item">
                    <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                    <span>
                      {order.location || text.worker.locationUnavailable}
                      {order.location && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#3B82F6', textDecoration: 'underline', cursor: 'pointer', marginLeft: '4px', fontSize: '0.85rem' }}
                        >
                          [MAP]
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="worker-info-item">
                    <span className="worker-meta-label">{text.worker.assignmentDateLabel}:</span>
                    <span>{formatDate(order.startDate)}</span>
                    <span className="worker-meta-label" style={{ marginLeft: '1rem' }}>{text.worker.assignmentCrewLabel}:</span>
                    <span>{order.crewCount || '—'}</span>
                  </div>
                  {order.shift_type && (
                    <div className="worker-info-item">
                      <span className="worker-meta-label">勤務区分:</span>
                      <span>{order.shift_type}</span>
                    </div>
                  )}
                  <div className="worker-info-item">
                    <span className="worker-meta-label">{text.worker.assignmentTaskLabel}:</span>
                    <span>{order.notes || '—'}</span>
                  </div>
                  <div className="worker-info-item">
                    <span className="worker-meta-label">{text.worker.assignmentMembersLabel}:</span>
                    <span>{order.members || '—'}</span>
                  </div>
                  {order.cautionNote && (
                    <div className="worker-info-item">
                      <span className="worker-meta-label">{text.worker.assignmentCautionLabel}:</span>
                      <span>{order.cautionNote}</span>
                    </div>
                  )}
                  <AssignmentAttachments dbId={order.db_id} />
                </div>
                {worker.id === order.assigned_worker_id && (
                  <div className="worker-assignment-actions" style={{ width: '100%' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleComplete(order) }}
                      style={{ width: '100%', padding: '12px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                      完了
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── 完了済み案件（履歴）── */}
      {completedAssignments.length > 0 && (
        <section className="worker-card" style={{ padding: '0' }}>
          <button
            type="button"
            onClick={() => setHistoryOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AppIcon name="CheckCircle" size={16} style={{ color: '#10b981' }} />
              <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#475569' }}>
                完了した案件
              </span>
              <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem' }}>
                {completedAssignments.length}件
              </span>
            </div>
            <AppIcon name={historyOpen ? 'ChevronLeft' : 'ChevronRight'} size={16} style={{ color: '#94a3b8', transform: historyOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>

          {historyOpen && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <div className="worker-assignment-grid" style={{ marginTop: '0.75rem' }}>
                {completedAssignments.map((order) => (
                  <AssignmentCard key={order.id} entry={order} showCompleteButton={false} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
