import { useState, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { downloadBlob, escapeForCsv, formatAdminDate } from '@/utils/format'
import WorkOrdersTable from './WorkOrdersTable'

export default function ReportsPanel({ orders, workers }) {
    const { state } = useAppContext()
    const { text, getStatusLabel, getPriorityLabel } = useI18n('ja')

    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [startDate, setStartDate] = useState(monthStart.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
    const [activeTab, setActiveTab] = useState('completed')

    const completedOrders = useMemo(
        () => orders.filter((order) => order.status === 'Completed'),
        [orders]
    )

    const handleExportOrdersCsv = () => {
        const headers = [
            'ID', 'チーム', '場所', 'ステータス', '優先度',
            '進捗', '開始日', '期限', 'メモ',
        ]
        const rows = orders.map((o) => [
            o.id, o.team, o.location,
            getStatusLabel(o.status), getPriorityLabel(o.priority),
            `${o.progress}%`, formatAdminDate(o.startDate),
            formatAdminDate(o.dueDate), o.notes || '',
        ].map(escapeForCsv).join(','))

        const blob = new Blob(['\ufeff' + [headers.join(','), ...rows].join('\n')], {
            type: 'text/csv;charset=utf-8;',
        })
        downloadBlob(`orders-${startDate}-${endDate}.csv`, blob)
    }

    const auditLogs = state.auditLogs || []
    const sortedLogs = useMemo(
        () => [...auditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50),
        [auditLogs]
    )

    const actionLabels = {
        clock_in: '出勤', clock_out: '退勤',
        break_start: '休憩開始', break_end: '休憩終了',
        status_update: 'ステータス更新', order_create: '案件作成',
        order_update: '案件更新', message_send: 'メッセージ送信',
    }

    return (
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

            <div className="fws-tabs-secondary" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>

                <button
                    className={`fws-filter-chip ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    {text.reports?.completedOrders ?? '完了済み案件'}
                </button>
                <button
                    className={`fws-filter-chip ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    監査ログ
                </button>
            </div>

            {activeTab === 'completed' && (
                <div className="fws-card">
                    <WorkOrdersTable orders={completedOrders} readOnly />
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="fws-card">
                    {sortedLogs.length === 0 ? (
                        <p className="fws-empty">監査ログはまだありません。</p>
                    ) : (
                        <div className="fws-table-wrapper">
                            <table className="fws-table">
                                <thead>
                                    <tr>
                                        <th>日時</th>
                                        <th>ユーザー</th>
                                        <th>操作</th>
                                        <th>対象</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLogs.map((log) => {
                                        const worker = (workers || []).find((w) => w.id === log.userId)
                                        return (
                                            <tr key={log.id}>
                                                <td data-label="日時">
                                                    {new Date(log.timestamp).toLocaleString('ja-JP')}
                                                </td>
                                                <td data-label="ユーザー">{worker?.name ?? log.userId}</td>
                                                <td data-label="操作">{actionLabels[log.action] ?? log.action}</td>
                                                <td data-label="対象">{log.targetId}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
