import { useI18n } from '@/i18n'
import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { getWorkers } from '@/api/workers'
import { getTeamTodayAttendance } from '@/api/attendance'

export default function AttendancePanel() {
    const { state } = useAppContext()
    const { filters } = state
    const { text } = useI18n(state.language)
    const [workers, setWorkers] = useState([])
    const [teamAttendance, setTeamAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [teamFilter, setTeamFilter] = useState('All')
    const [lastUpdated, setLastUpdated] = useState(null)

    const statusLabels = {
        not_reported: '未報告',
        woke_up: '起床済み',
        departed: '出発済み',
        arrived: '現場到着',
        finished: '作業終了'
    }

    useEffect(() => {
        const fetchData = async (isInitial = false) => {
            if (isInitial) setLoading(true)
            try {
                const [workersRes, attendanceRes] = await Promise.all([
                    getWorkers(),
                    getTeamTodayAttendance(),
                ])

                if (workersRes.success) setWorkers(workersRes.data || [])
                if (attendanceRes.success) setTeamAttendance(attendanceRes.data || [])
                setLastUpdated(new Date())
                setError(null)
            } catch (err) {
                console.error('Failed to fetch attendance data:', err)
                if (isInitial) {
                    setError('データを取得できませんでした')
                    setWorkers([])
                    setTeamAttendance([])
                }
            } finally {
                if (isInitial) setLoading(false)
            }
        }

        fetchData(true)

        // 30秒ごとに自動更新
        const intervalId = setInterval(() => fetchData(false), 30000)
        return () => clearInterval(intervalId)
    }, [])

    const workersWithAttendance = useMemo(() => {
        return workers.map(w => {
            const attendance = teamAttendance.find(a => a.worker_id === w.id || a.employee_id === w.employee_id)
            return { ...w, attendance }
        })
    }, [workers, teamAttendance])

    const filteredWorkers = useMemo(() => {
        const searchTerm = filters.search.trim().toLowerCase()
        return workersWithAttendance.filter((worker) => {
            const teamVal = worker.team_name || worker.team || `Team ${worker.team_id}`
            const matchesTeamChip = teamFilter === 'All' || teamVal === teamFilter
            
            const matchesSearch =
              searchTerm.length === 0 ||
              [worker.name, teamVal, worker.employee_id]
                .join(' ')
                .toLowerCase()
                .includes(searchTerm)
                
            return matchesTeamChip && matchesSearch
        })
    }, [workersWithAttendance, teamFilter, filters.search])

    const teams = Array.from(new Set(workers.map((w) => w.team_name || w.team || `Team ${w.team_id}`)))

    if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
    if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

    return (
        <div className="fws-panel">
            <div className="fws-panel-header">
                <div>
                    <h2>{text.tabs.monitoring}</h2>
                    {lastUpdated && (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                            最終更新: {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}（30秒ごとに自動更新）
                        </p>
                    )}
                </div>
                <div className="fws-filter-group">
                    <button
                        className={`fws-filter-chip ${teamFilter === 'All' ? 'active' : ''}`}
                        onClick={() => setTeamFilter('All')}
                    >
                        All Teams
                    </button>
                    {teams.map((team) => (
                        <button
                            key={team}
                            className={`fws-filter-chip ${teamFilter === team ? 'active' : ''}`}
                            onClick={() => setTeamFilter(team)}
                        >
                            {team}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredWorkers.length === 0 ? (
                   <p className="fws-empty-state" style={{ textAlign: 'center', margin: '2rem 0' }}>作業員が見つかりません</p>
                ) : filteredWorkers.map((worker) => {
                    const attendance = worker.attendance
                    const status = attendance?.status || 'not_reported'
                    const badgeClass = status !== 'not_reported' ? 'active' : 'idle'
                    const statusVariant = (() => {
                        switch (status) {
                          case 'woke_up': return 'warning'
                          case 'departed': return 'primary'
                          case 'arrived': return 'success'
                          case 'finished': return 'completed'
                          default: return 'neutral'
                        }
                    })()

                    const fmt = (ts) => new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

                    return (
                        <div key={worker.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.85rem',
                            padding: '0.65rem 1rem',
                            background: 'white', border: '1px solid #f1f5f9',
                            borderRadius: '12px',
                        }}>
                            {/* アバター */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                    width: 36, height: 36,
                                    background: 'var(--premium-grad)',
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: '0.9rem'
                                }}>
                                    {worker.name[0]}
                                </div>
                                <div className={`status-dot ${badgeClass}`} style={{ bottom: -2, right: -2 }} />
                            </div>

                            {/* 名前・チーム・ステータス（左ブロック） */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                        {worker.name}
                                    </p>
                                    <span className={`status-pill ${statusVariant}`}>
                                        {statusLabels[status] || status}
                                    </span>
                                </div>
                                <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                                    {worker.team_name || worker.team || `Team ${worker.team_id}`}
                                </p>
                            </div>

                            {/* アクティビティ 2×2グリッド（右ブロック） */}
                            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 72px)', gap: '0.15rem 0', fontSize: '0.72rem' }}>
                                {status === 'not_reported' ? (
                                    <span style={{ color: '#cbd5e1', gridColumn: '1/-1' }}>報告なし</span>
                                ) : (
                                    <>
                                        <span style={{ color: attendance.woke_up_at ? '#475569' : '#d1d5db' }}>起床: {attendance.woke_up_at ? fmt(attendance.woke_up_at) : '—'}</span>
                                        <span style={{ color: attendance.departed_at ? '#475569' : '#d1d5db' }}>出発: {attendance.departed_at ? fmt(attendance.departed_at) : '—'}</span>
                                        <span style={{ color: attendance.arrived_at ? '#475569' : '#d1d5db' }}>到着: {attendance.arrived_at ? fmt(attendance.arrived_at) : '—'}</span>
                                        <span style={{ color: attendance.finished_at ? '#475569' : '#d1d5db' }}>終了: {attendance.finished_at ? fmt(attendance.finished_at) : '—'}</span>
                                    </>
                                )}
                            </div>

                            {/* MAPリンク */}
                            {attendance?.location_lat && (
                                <a
                                    href={`https://www.google.com/maps?q=${attendance.location_lat},${attendance.location_lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', flexShrink: 0, background: '#eff6ff', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}
                                >
                                    MAP
                                </a>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
