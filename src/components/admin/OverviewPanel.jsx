import SummaryCards from './SummaryCards'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { useState, useEffect } from 'react'
import { getAssignments } from '@/api/assignments'
import { getTeamTodayAttendance } from '@/api/attendance'

const ATTENDANCE_STEPS = [
  { key: 'finished_at',  label: '作業終了', color: '#6b7280', bg: '#f1f5f9' },
  { key: 'arrived_at',  label: '現場到着', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'departed_at', label: '出発済み', color: '#2563eb', bg: '#eff6ff' },
  { key: 'woke_up_at',  label: '起床済み', color: '#d97706', bg: '#fffbeb' },
]

function getWorkerStatus(attendance) {
  if (!attendance) return { label: '未報告', color: '#94a3b8', bg: '#f8fafc' }
  for (const step of ATTENDANCE_STEPS) {
    if (attendance[step.key]) return step
  }
  return { label: '未報告', color: '#94a3b8', bg: '#f8fafc' }
}

function AttendanceSummaryPanel({ attendance }) {
  if (!attendance || attendance.length === 0) return null

  const counts = { arrived: 0, departed: 0, woke_up: 0, finished: 0, not_reported: 0 }
  attendance.forEach(a => {
    if (a.finished_at) counts.finished++
    else if (a.arrived_at) counts.arrived++
    else if (a.departed_at) counts.departed++
    else if (a.woke_up_at) counts.woke_up++
    else counts.not_reported++
  })

  const total = attendance.length
  const onSite = counts.arrived + counts.departed + counts.woke_up + counts.finished

  const chips = [
    { label: '現場到着', count: counts.arrived, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: '出発済み', count: counts.departed, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: '起床済み', count: counts.woke_up, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: '作業終了', count: counts.finished, color: '#6b7280', bg: '#f1f5f9', border: '#e2e8f0' },
    { label: '未報告', count: counts.not_reported, color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  ].filter(c => c.count > 0)

  return (
    <section className="fws-panel" style={{ marginBottom: '1rem' }}>
      <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>👷 本日の作業員状況</h3>
        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
          出勤中 <strong style={{ color: '#0f172a' }}>{onSite}</strong> / {total}名
        </span>
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {chips.map(c => (
          <span key={c.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
            padding: '0.25rem 0.75rem',
          }}>
            {c.label} {c.count}名
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
        {attendance.map(a => {
          const status = getWorkerStatus(a)
          return (
            <div key={a.worker_id || a.employee_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 0.6rem', borderRadius: '8px',
              background: status.bg, fontSize: '0.85rem',
            }}>
              <span style={{ fontWeight: 500, color: '#0f172a' }}>{a.worker_name || a.name || '—'}</span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, color: status.color,
                background: 'white', borderRadius: '6px', padding: '0.1rem 0.5rem',
                border: `1px solid ${status.color}22`,
              }}>
                {status.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function OverviewPanel() {
  const { state } = useAppContext()
  const { text, formatNumber, formatDue, formatPriorityTag } = useI18n(state.language)
  const [orders, setOrders] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusLabels = {
    pending: '未着手',
    in_progress: '進行中',
    completed: '完了',
    cancelled: 'キャンセル',
    delayed: '遅延',
    ready_for_dispatch: '出発準備完了'
  }

  const getStatusLabelLocal = (status) => statusLabels[status?.toLowerCase()] || status

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [assignmentsRes, attendanceRes] = await Promise.all([
          getAssignments(),
          getTeamTodayAttendance(),
        ])
        if (assignmentsRes.success) setOrders(assignmentsRes.data || [])
        if (attendanceRes.success) setAttendance(attendanceRes.data || [])
      } catch (err) {
        console.error('Failed to fetch overview data:', err)
        setError('データを取得できませんでした')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const calculateSummary = () => {
    const summary = { total: orders.length, completionRate: 0, inProgress: 0, delayed: 0, readyForDispatch: 0, completed: 0 }
    orders.forEach(order => {
      const status = order.status?.toLowerCase()
      if (status === 'completed') summary.completed++
      if (status === 'in_progress') summary.inProgress++
      if (status === 'delayed') summary.delayed++
      if (status === 'ready_for_dispatch') summary.readyForDispatch++
    })
    summary.completionRate = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100)
    const today = new Date()
    const outstandingStartsCount = orders.filter(order => {
      if (!order.start_date) return false
      const start = new Date(order.start_date)
      const status = order.status?.toLowerCase()
      return start <= today && (status === 'pending' || status === 'ready_for_dispatch')
    }).length
    return { summary, outstandingStartsCount }
  }

  if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  const { summary, outstandingStartsCount } = calculateSummary()
  const topPriorityOrders = [...orders]
    .filter(o => o.status?.toLowerCase() !== 'completed')
    .sort((a, b) => {
      const priorityMap = { high: 1, medium: 2, low: 3 }
      const pA = priorityMap[a.priority?.toLowerCase()] || 99
      const pB = priorityMap[b.priority?.toLowerCase()] || 99
      if (pA !== pB) return pA - pB
      return new Date(a.end_date) - new Date(b.end_date)
    })
    .slice(0, 3)

  return (
    <>
      <AttendanceSummaryPanel attendance={attendance} />
      <SummaryCards summary={summary} outstandingCount={outstandingStartsCount} />
      <section className="fws-panel">
        <header className="fws-panel-header">
          <h3>{text.overview.title}</h3>
          <span>{formatNumber(topPriorityOrders.length)} {text.overview.ordersLabel}</span>
        </header>
        <div className="fws-priority-list">
          {topPriorityOrders.length === 0 ? (
            <p>{text.overview.empty}</p>
          ) : (
            topPriorityOrders.map((order) => (
              <article key={order.id} className="fws-priority-item">
                <div>
                  <h4>{order.assignment_code || order.id}</h4>
                  <p>{order.location}</p>
                </div>
                <div className="fws-priority-meta">
                  <span className={`fws-tag fws-tag-${(order.priority || 'medium').toLowerCase()}`}>
                    {formatPriorityTag(order.priority || 'Medium')}
                  </span>
                  <span>{getStatusLabelLocal(order.status)}</span>
                  <span>{formatDue(order.end_date || order.start_date)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  )
}
