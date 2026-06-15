import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { getWorkers } from '@/api/workers'
import { getTeamTodayAttendance } from '@/api/attendance'
import { getAssignments } from '@/api/assignments'
import { getAnnouncement, updateAnnouncement } from '@/api/settings'
import SummaryCards from './SummaryCards'
import { AppIcon } from '@/utils/iconMap'

const STATUS_LABELS = {
  not_reported: '未報告',
  woke_up:  '起床済み',
  departed: '出発済み',
  arrived:  '現場到着',
  finished: '作業終了',
}

const STATUS_VARIANT = {
  woke_up:  'warning',
  departed: 'primary',
  arrived:  'success',
  finished: 'completed',
}

const PRIORITY_MAP = { high: 1, medium: 2, low: 3 }

const ORDER_STATUS_LABELS = {
  pending: '未着手', in_progress: '進行中',
  completed: '完了', cancelled: 'キャンセル',
}

export default function DashboardPanel() {
  const { state } = useAppContext()
  const { filters } = state
  const { text, formatNumber, formatDue, formatPriorityTag } = useI18n(state.language)

  const [workers, setWorkers]         = useState([])
  const [attendance, setAttendance]   = useState([])
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [teamFilter, setTeamFilter]   = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)

  // お知らせ編集
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementSaving, setAnnouncementSaving] = useState(false)
  const [announcementSaved, setAnnouncementSaved] = useState(false)

  useEffect(() => {
    getAnnouncement().then(res => setAnnouncementText(res.value ?? '')).catch(() => {})
  }, [])

  const handleAnnouncementSave = async () => {
    setAnnouncementSaving(true)
    try {
      await updateAnnouncement(announcementText)
      setAnnouncementSaved(true)
      setTimeout(() => setAnnouncementSaved(false), 2500)
    } catch (e) {
      // ignore
    } finally {
      setAnnouncementSaving(false)
    }
  }

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const [workersRes, attendanceRes, ordersRes] = await Promise.all([
        getWorkers(),
        getTeamTodayAttendance(),
        getAssignments(),
      ])
      if (workersRes.success)    setWorkers(workersRes.data || [])
      if (attendanceRes.success) setAttendance(attendanceRes.data || [])
      if (ordersRes.success)     setOrders(ordersRes.data || [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      if (isInitial) setError('データを取得できませんでした')
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    const id = setInterval(() => fetchData(false), 30000)
    // 作業員からの案件・出退勤ステータス変更通知で即時更新
    const handleAssignmentUpdated = () => fetchData(false)
    const handleAttendanceUpdated = () => fetchData(false)
    window.addEventListener('fieldo:assignment-updated', handleAssignmentUpdated)
    window.addEventListener('fieldo:attendance-updated', handleAttendanceUpdated)
    return () => {
      clearInterval(id)
      window.removeEventListener('fieldo:assignment-updated', handleAssignmentUpdated)
      window.removeEventListener('fieldo:attendance-updated', handleAttendanceUpdated)
    }
  }, [])

  // 作業員 + 出勤状況を結合
  const workersWithAttendance = useMemo(() => workers.map(w => ({
    ...w,
    attendance: attendance.find(a => a.worker_id === w.id || a.employee_id === w.employee_id),
  })), [workers, attendance])

  const teams = useMemo(() =>
    Array.from(new Set(workers.map(w => w.team_name || w.team || `Team ${w.team_id}`))),
  [workers])

  const filteredWorkers = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return workersWithAttendance.filter(w => {
      const team = w.team_name || w.team || `Team ${w.team_id}`
      const matchTeam   = teamFilter === 'All' || team === teamFilter
      const matchSearch = !search || [w.name, team, w.employee_id].join(' ').toLowerCase().includes(search)
      return matchTeam && matchSearch
    })
  }, [workersWithAttendance, teamFilter, filters.search])

  // 案件サマリー
  const summary = useMemo(() => {
    const s = { total: orders.length, completionRate: 0, inProgress: 0, delayed: 0, readyForDispatch: 0, completed: 0 }
    orders.forEach(o => {
      const st = o.status?.toLowerCase()
      if (st === 'completed')          s.completed++
      if (st === 'in_progress')        s.inProgress++
      if (st === 'delayed')            s.delayed++
      if (st === 'ready_for_dispatch') s.readyForDispatch++
    })
    s.completionRate = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100)
    return s
  }, [orders])

  const outstandingCount = useMemo(() => {
    const today = new Date()
    return orders.filter(o => {
      if (!o.start_date) return false
      const st = o.status?.toLowerCase()
      return new Date(o.start_date) <= today && (st === 'pending' || st === 'ready_for_dispatch')
    }).length
  }, [orders])

  const topOrders = useMemo(() =>
    [...orders]
      .filter(o => o.status?.toLowerCase() !== 'completed' && o.status?.toLowerCase() !== 'cancelled')
      .sort((a, b) => {
        const pA = PRIORITY_MAP[a.priority?.toLowerCase()] || 99
        const pB = PRIORITY_MAP[b.priority?.toLowerCase()] || 99
        return pA !== pB ? pA - pB : new Date(a.end_date) - new Date(b.end_date)
      })
      .slice(0, 3),
  [orders])

  const fmt = ts => new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error)   return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  return (
    <>
      {/* ── 案件サマリーカード ── */}
      <SummaryCards summary={summary} outstandingCount={outstandingCount} />

      {/* ── 作業員へのお知らせ編集 ── */}
      <section className="fws-panel" style={{ marginBottom: '1rem' }}>
        <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AppIcon name="Bell" size={16} style={{ color: '#d97706' }} />
            作業員へのお知らせ
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>作業員ホーム画面に表示されます</span>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            value={announcementText}
            onChange={e => setAnnouncementText(e.target.value)}
            rows={3}
            placeholder="例：【安全通知】作業前に安全確認を必ず行ってください。"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid #ebebf5', borderRadius: '10px',
              padding: '0.7rem 0.9rem', fontSize: '0.9rem',
              fontFamily: 'inherit', resize: 'vertical',
              background: '#fafafa', color: '#0f0e2e',
              lineHeight: 1.6, transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#ebebf5'}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
            {announcementSaved && (
              <span style={{ fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AppIcon name="CheckCircle" size={14} /> 保存しました
              </span>
            )}
            <button
              type="button"
              className="fws-button"
              onClick={handleAnnouncementSave}
              disabled={announcementSaving}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              {announcementSaving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 優先度の高い案件 ── */}
      {topOrders.length > 0 && (
        <section className="fws-panel" style={{ marginBottom: '1rem' }}>
          <header className="fws-panel-header">
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AppIcon name="ClipboardList" size={16} style={{ color: '#4f46e5' }} />
              進行中の案件（優先度順）
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{topOrders.length}件</span>
          </header>
          <div className="fws-priority-list">
            {topOrders.map(order => (
              <article key={order.id} className="fws-priority-item">
                <div>
                  <h4>{order.title || order.assignment_code || order.id}</h4>
                  <p>{order.location}</p>
                </div>
                <div className="fws-priority-meta">
                  <span className={`fws-tag fws-tag-${(order.priority || 'medium').toLowerCase()}`}>
                    {formatPriorityTag(order.priority || 'Medium')}
                  </span>
                  <span>{ORDER_STATUS_LABELS[order.status?.toLowerCase()] || order.status}</span>
                  <span>{formatDue(order.end_date || order.start_date)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── 作業員出勤状況 ── */}
      <div className="fws-panel">
        <div className="fws-panel-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AppIcon name="HardHat" size={16} style={{ color: '#4f46e5' }} />
              本日の作業員状況
            </h2>
            {lastUpdated && (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}（30秒ごと自動更新）
              </p>
            )}
          </div>
          <div className="fws-filter-group">
            <button
              className={`fws-filter-chip ${teamFilter === 'All' ? 'active' : ''}`}
              onClick={() => setTeamFilter('All')}
            >全チーム</button>
            {teams.map(team => (
              <button
                key={team}
                className={`fws-filter-chip ${teamFilter === team ? 'active' : ''}`}
                onClick={() => setTeamFilter(team)}
              >{team}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredWorkers.length === 0 ? (
            <p className="fws-empty-state" style={{ textAlign: 'center', margin: '2rem 0' }}>作業員が見つかりません</p>
          ) : filteredWorkers.map(worker => {
            const att = worker.attendance
            const status = att?.status || 'not_reported'
            const badgeClass = status !== 'not_reported' ? 'active' : 'idle'
            const statusVariant = STATUS_VARIANT[status] || 'neutral'

            return (
              <div key={worker.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.65rem 1rem',
                background: 'white', border: '1px solid #f1f5f9', borderRadius: '12px',
              }}>
                {/* アバター */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, background: 'var(--premium-grad)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem',
                  }}>
                    {worker.name[0]}
                  </div>
                  <div className={`status-dot ${badgeClass}`} style={{ bottom: -2, right: -2 }} />
                </div>

                {/* 名前・チーム・ステータス */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{worker.name}</p>
                    <span className={`status-pill ${statusVariant}`}>{STATUS_LABELS[status] || status}</span>
                  </div>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {worker.team_name || worker.team || `Team ${worker.team_id}`}
                  </p>
                </div>

                {/* 時刻グリッド */}
                <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 72px)', gap: '0.15rem 0', fontSize: '0.72rem' }}>
                  {status === 'not_reported' ? (
                    <span style={{ color: '#cbd5e1', gridColumn: '1/-1' }}>報告なし</span>
                  ) : (
                    <>
                      <span style={{ color: att?.woke_up_at  ? '#475569' : '#d1d5db' }}>起床: {att?.woke_up_at  ? fmt(att.woke_up_at)  : '—'}</span>
                      <span style={{ color: att?.departed_at ? '#475569' : '#d1d5db' }}>出発: {att?.departed_at ? fmt(att.departed_at) : '—'}</span>
                      <span style={{ color: att?.arrived_at  ? '#475569' : '#d1d5db' }}>到着: {att?.arrived_at  ? fmt(att.arrived_at)  : '—'}</span>
                      <span style={{ color: att?.finished_at ? '#475569' : '#d1d5db' }}>終了: {att?.finished_at ? fmt(att.finished_at) : '—'}</span>
                    </>
                  )}
                </div>

                {/* MAPリンク */}
                {att?.location_lat && (
                  <a
                    href={`https://www.google.com/maps?q=${att.location_lat},${att.location_lng}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: '0.72rem', color: '#4f46e5', textDecoration: 'none',
                      flexShrink: 0, background: '#eef2ff', padding: '0.2rem 0.55rem',
                      borderRadius: '6px', border: '1px solid #c7c7f0', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  ><AppIcon name="MapPin" size={11} /> MAP</a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
