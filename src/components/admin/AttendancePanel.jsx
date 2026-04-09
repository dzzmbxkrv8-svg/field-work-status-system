import { useI18n } from '@/i18n'
import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { getWorkers } from '@/api/workers'
import { getTeamTodayAttendance } from '@/api/attendance'

export default function AttendancePanel() {
    const { state } = useAppContext()
    const { filters } = state
    const { text } = useI18n('ja')
    const [workers, setWorkers] = useState([])
    const [teamAttendance, setTeamAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [teamFilter, setTeamFilter] = useState('All')

    const statusLabels = {
        not_reported: '未報告',
        woke_up: '起床済み',
        departed: '出発済み',
        arrived: '現場到着',
        finished: '作業終了'
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [workersRes, attendanceRes] = await Promise.all([
                    getWorkers(),
                    getTeamTodayAttendance()
                ])

                if (workersRes.success) {
                    setWorkers(workersRes.data || [])
                }
                if (attendanceRes.success) {
                    setTeamAttendance(attendanceRes.data || [])
                }
            } catch (err) {
                console.error('Failed to fetch attendance data:', err)
                setError('データを取得できませんでした')
                setWorkers([])
                setTeamAttendance([])
            } finally {
                setLoading(false)
            }
        }

        fetchData()
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
                <h2>{text.tabs.monitoring}</h2>
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

            <div className="fws-grid worker-grid">
                {filteredWorkers.length === 0 ? (
                   <p className="fws-empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', margin: '2rem 0' }}>作業員が見つかりません</p>
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

                    return (
                        <div key={worker.id} className="fws-card worker-tile">
                            <div className="worker-tile-header">
                                <div className="worker-tile-avatar">
                                    <span>{worker.name[0]}</span>
                                    <div className={`status-dot ${badgeClass}`} />
                                </div>
                                <div className="worker-tile-info">
                                    <h4>{worker.name}</h4>
                                    <p>{worker.team_name || worker.team || `Team ${worker.team_id}`}</p>
                                </div>
                            </div>

                            <div className="worker-tile-body">
                                <div className="worker-tile-status">
                                    <span className={`status-pill ${statusVariant}`}>
                                        {statusLabels[status] || status}
                                    </span>
                                </div>

                                <div className="worker-tile-project">
                                    <p className="project-label">今日のアクティビティ</p>
                                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                                        {status === 'not_reported' ? (
                                            <p>{text.worker.teamStatusUnknown ?? '報告なし'}</p>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>
                                                {attendance.woke_up_at && <li>⏰ 起床: {new Date(attendance.woke_up_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</li>}
                                                {attendance.departed_at && <li>🚗 出発: {new Date(attendance.departed_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</li>}
                                                {attendance.arrived_at && <li>📍 到着: {new Date(attendance.arrived_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</li>}
                                                {attendance.finished_at && <li>🏁 終了: {new Date(attendance.finished_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</li>}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {attendance?.location_lat && (
                                    <div className="worker-tile-project">
                                        <p className="project-label">最終報告場所</p>
                                        <a 
                                            href={`https://www.google.com/maps?q=${attendance.location_lat},${attendance.location_lng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'underline' }}
                                        >
                                            MAPを表示
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
