import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { useState } from 'react'

export default function AttendancePanel({ workers, orders, timeEntriesHook }) {
    const { state } = useAppContext()
    const { text } = useI18n('ja')
    const [filter, setFilter] = useState('All')

    const { teamAttendance = [] } = timeEntriesHook || {}

    const statusLabels = {
        woke_up: '起床済み',
        departed: '出発済み',
        arrived: '現場到着',
        finished: '作業終了',
        not_reported: '未報告',
    }

    // Combine workers with their attendance
    const workersWithAttendance = workers.map(w => {
        const attendance = teamAttendance.find(a => a.worker_id === w.id || a.employee_id === w.employee_id)
        return { ...w, attendance }
    })

    const filteredWorkers = workersWithAttendance.filter((worker) => {
        if (filter === 'All') return true
        return worker.team === filter
    })

    const teams = Array.from(new Set(workers.map((w) => w.team || w.team_id)))

    return (
        <div className="fws-panel">
            <div className="fws-panel-header">
                <h2>{text.tabs.monitoring}</h2>
                <div className="fws-filter-group">
                    <button
                        className={`fws-filter-chip ${filter === 'All' ? 'active' : ''}`}
                        onClick={() => setFilter('All')}
                    >
                        All Teams
                    </button>
                    {teams.map((team) => (
                        <button
                            key={team}
                            className={`fws-filter-chip ${filter === team ? 'active' : ''}`}
                            onClick={() => setFilter(team)}
                        >
                            {team}
                        </button>
                    ))}
                </div>
            </div>

            <div className="fws-grid worker-grid">
                {filteredWorkers.map((worker) => {
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
                                    <p>{worker.team || `Team ${worker.team_id}`}</p>
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
