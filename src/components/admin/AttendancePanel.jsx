import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { useState } from 'react'

export default function AttendancePanel({ workers, orders, timeEntriesHook }) {
    const { state } = useAppContext()
    const { text } = useI18n(state.language)
    const [filter, setFilter] = useState('All')

    const getClockStatus = timeEntriesHook?.getClockStatus
    const getLatestEntry = timeEntriesHook?.getLatestEntry
    const calculateWorkHours = timeEntriesHook?.calculateWorkHours

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const statusLabels = {
        working: '勤務中',
        on_break: '休憩中',
        off: '退勤済み',
    }

    const filteredWorkers = workers.filter((worker) => {
        if (filter === 'All') return true
        return worker.team === filter
    })

    const teams = Array.from(new Set(workers.map((w) => w.team)))

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
                    const activeOrder = orders.find(
                        (order) => order.members?.includes(worker.id) && order.status !== 'Completed'
                    )
                    const clockStatus = getClockStatus ? getClockStatus(worker.id) : null
                    const badgeClass = clockStatus === 'working' ? 'active' : clockStatus === 'on_break' ? 'active' : 'idle'

                    return (
                        <div key={worker.id} className="fws-card worker-tile">
                            <div className="worker-tile-header">
                                <div className="worker-tile-avatar">
                                    <span>{worker.name[0]}</span>
                                    <div className={`status-dot ${badgeClass}`} />
                                </div>
                                <div className="worker-tile-info">
                                    <h4>{worker.name}</h4>
                                    <p>{worker.team}</p>
                                </div>
                            </div>

                            <div className="worker-tile-body">
                                <div className="worker-tile-status">
                                    <span className={`status-pill ${clockStatus === 'working' || clockStatus === 'on_break' ? 'active' : 'idle'}`}>
                                        {clockStatus ? (statusLabels[clockStatus] || '未打刻') : (activeOrder ? activeOrder.status : 'Available')}
                                    </span>
                                </div>

                                {activeOrder && (
                                    <div className="worker-tile-project">
                                        <p className="project-label">Current Project</p>
                                        <p className="project-title">{activeOrder.projectName}</p>
                                    </div>
                                )}

                                {getClockStatus && (
                                    <div className="worker-tile-project">
                                        <p className="project-label">打刻ステータス</p>
                                        <p className="project-title">
                                            {statusLabels[getClockStatus(worker.id)] || '未打刻'}
                                        </p>
                                        {getLatestEntry && getLatestEntry(worker.id) && (
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                                最終打刻: {new Date(getLatestEntry(worker.id).timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        {calculateWorkHours && (
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                                本日の勤務: {(() => {
                                                    const h = calculateWorkHours(worker.id, todayStart, todayEnd)
                                                    return `${h.totalHours}時間${h.totalMinutes}分`
                                                })()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeOrder && activeOrder.photo && (
                                    <div className="worker-tile-photo">
                                        <img src={activeOrder.photo} alt="Field report" />
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
