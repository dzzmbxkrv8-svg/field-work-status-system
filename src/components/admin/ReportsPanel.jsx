import { useState, useMemo, useEffect } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { downloadBlob, escapeForCsv, formatAdminDate } from '@/utils/format'
import WorkOrdersTable from './WorkOrdersTable'
import { getWorkers } from '@/api/workers'
import { getAssignments } from '@/api/assignments'

export default function ReportsPanel() {
    const { state } = useAppContext()
    const { text, getStatusLabel, getPriorityLabel } = useI18n(state.language)

    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [startDate, setStartDate] = useState(monthStart.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
    const [workers, setWorkers] = useState([])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [workersRes, assignmentsRes] = await Promise.all([
                    getWorkers(),
                    getAssignments()
                ])

                if (workersRes.success) setWorkers(workersRes.data || [])
                if (assignmentsRes.success) {
                    setOrders(assignmentsRes.data.map(o => ({
                        ...o,
                        id: o.assignment_code || o.id,
                        status: o.status,
                        priority: o.priority ? o.priority.charAt(0).toUpperCase() + o.priority.slice(1) : 'Medium',
                        progress: o.status === 'completed' ? 100 : (o.status === 'in_progress' ? 50 : 0),
                        startDate: o.start_date,
                        dueDate: o.end_date || o.start_date
                    })))
                }
            } catch (err) {
                console.error('Failed to fetch reports data:', err)
                setError('データを取得できませんでした')
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        // 案件ステータス変更・出退勤による自動完了をリアルタイムで反映
        const handleUpdate = () => fetchData()
        window.addEventListener('fieldo:assignment-updated', handleUpdate)
        window.addEventListener('fieldo:attendance-updated', handleUpdate)
        return () => {
            window.removeEventListener('fieldo:assignment-updated', handleUpdate)
            window.removeEventListener('fieldo:attendance-updated', handleUpdate)
        }
    }, [])

    const completedOrders = useMemo(
        () => orders.filter((order) => order.status?.toLowerCase() === 'completed'),
        [orders]
    )

    const handleExportOrdersCsv = () => {
        const headers = [
            'ID', 'チーム', '場所', 'ステータス', '優先度',
            '進捗', '開始日', '期限', 'メモ',
        ]
        const rows = orders.map((o) => [
            o.id, o.team_name || o.team, o.location,
            getStatusLabel(o.status), getPriorityLabel(o.priority),
            `${o.progress}%`, formatAdminDate(o.startDate),
            formatAdminDate(o.dueDate), o.notes || '',
        ].map(escapeForCsv).join(','))

        const blob = new Blob(['\ufeff' + [headers.join(','), ...rows].join('\n')], {
            type: 'text/csv;charset=utf-8;',
        })
        downloadBlob(`orders-${startDate}-${endDate}.csv`, blob)
    }

    if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
    if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

    return (
        <>
        <div className="fws-panel">
            <div className="fws-panel-header">
                <h2>{text.tabs.reports}</h2>
            </div>

            <div className="fws-report-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
                <label>
                    開始日
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label>
                    終了日
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="fws-button secondary" onClick={handleExportOrdersCsv}>
                        案件CSV出力
                    </button>
                </div>
            </div>

            <div className="fws-card">
                {completedOrders.length === 0 ? (
                    <p className="fws-empty">完了済みの案件はまだありません。</p>
                ) : (
                    <WorkOrdersTable orders={completedOrders} readOnly />
                )}
            </div>
        </div>
        </>
    )
}
