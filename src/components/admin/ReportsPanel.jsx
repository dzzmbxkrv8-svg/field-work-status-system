import { useState, useMemo, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import { downloadBlob, escapeForCsv, formatAdminDate } from '@/utils/format'
import WorkOrdersTable from './WorkOrdersTable'
import { getAssignments, getMembers, getAttachments } from '@/api/assignments'
import { getAttendanceSummary } from '@/api/attendance'
import { AppIcon } from '@/utils/iconMap'

const ATTENDANCE_STATUS_LABELS = {
    not_reported: '未報告',
    woke_up: '起床済み',
    departed: '出発済み',
    arrived: '現場到着',
    finished: '作業終了',
}

function fmtTime(value) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ReportsPanel() {
    const { state } = useAppContext()
    const { text } = useI18n(state.language)

    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const [startDate, setStartDate] = useState(monthStart.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [exportingAttendance, setExportingAttendance] = useState(false)
    const [completedSearch, setCompletedSearch] = useState('')

    const [selectedOrder, setSelectedOrder] = useState(null)
    const [detailMembers, setDetailMembers] = useState([])
    const [detailAttachments, setDetailAttachments] = useState([])
    const [detailLoading, setDetailLoading] = useState(false)

    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const assignmentsRes = await getAssignments()

                if (assignmentsRes.success) {
                    setOrders(assignmentsRes.data.map(o => ({
                        ...o,
                        db_id: o.id,
                        id: o.assignment_code || o.id,
                        projectName: o.title,
                        status: o.status,
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

    const handleSelectOrder = async (order) => {
        setSelectedOrder(order)
        setDetailMembers([])
        setDetailAttachments([])
        setDetailLoading(true)
        const dbId = order.db_id ?? order.id
        const [membersRes, attachmentsRes] = await Promise.all([
            getMembers(dbId),
            getAttachments(dbId),
        ])
        if (membersRes.success) setDetailMembers(membersRes.data || [])
        if (attachmentsRes.success) setDetailAttachments(attachmentsRes.data || [])
        setDetailLoading(false)
    }

    const completedOrders = useMemo(() => {
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate + 'T23:59:59') : null
        return orders.filter(order => {
            if (order.status?.toLowerCase() !== 'completed') return false
            if (!order.updated_at) return true
            const completedAt = new Date(order.updated_at)
            if (start && completedAt < start) return false
            if (end && completedAt > end) return false
            return true
        })
    }, [orders, startDate, endDate])

    // 期間で絞り込んだ完了済み案件を、さらに案件名・場所・チーム名で絞り込む
    const filteredCompletedOrders = useMemo(() => {
        const q = completedSearch.trim().toLowerCase()
        if (!q) return completedOrders
        return completedOrders.filter(o =>
            [o.projectName, o.id, o.location, o.team_name || o.team]
                .filter(Boolean)
                .some(field => String(field).toLowerCase().includes(q))
        )
    }, [completedOrders, completedSearch])

    const handleExportOrdersCsv = () => {
        const statusLabels = { pending: '未着手', in_progress: '進行中', completed: '完了', cancelled: 'キャンセル' }
        const headers = ['ID', 'チーム', '場所', 'ステータス', '進捗', '開始日', '期限', 'メモ']
        const rows = orders.map((o) => [
            o.id, o.team_name || o.team, o.location,
            statusLabels[o.status] || o.status,
            `${o.progress}%`, formatAdminDate(o.startDate),
            formatAdminDate(o.dueDate), o.notes || '',
        ].map(escapeForCsv).join(','))

        const blob = new Blob(['\ufeff' + [headers.join(','), ...rows].join('\n')], {
            type: 'text/csv;charset=utf-8;',
        })
        downloadBlob(`orders-${startDate}-${endDate}.csv`, blob)
    }

    // 出勤記録CSV: 1人×1日×1案件 = 1行。同じ日に複数案件を担当していた場合は行を分ける。
    // 対象日に担当していた案件が無い場合は「（担当案件なし）」として出勤ステータスのみ出力する。
    // ※ その日attendanceに1件も記録が無い(作業員が一度もステータス報告していない)日は対象外
    //   （出勤記録そのものが存在しないため）。
    const handleExportAttendanceCsv = async () => {
        setExportingAttendance(true)
        try {
            const res = await getAttendanceSummary(startDate, endDate)
            if (!res.success) {
                setError(res.message || '出勤記録の取得に失敗しました')
                return
            }
            const headers = ['日付', '作業員名', '案件名', '現場住所', 'ステータス', '起床', '出発', '到着', '終了']
            const rows = []
            for (const a of res.data || []) {
                const dateStr = String(a.date).slice(0, 10)
                const matchedOrders = orders.filter(o =>
                    o.assigned_worker_id === a.worker_id &&
                    o.startDate && o.startDate <= dateStr &&
                    (o.dueDate ? o.dueDate >= dateStr : o.startDate === dateStr)
                )
                const targets = matchedOrders.length > 0 ? matchedOrders : [null]
                for (const o of targets) {
                    rows.push([
                        dateStr, a.worker_name,
                        o ? (o.title || o.projectName) : '（担当案件なし）',
                        o ? o.location : '',
                        ATTENDANCE_STATUS_LABELS[a.status] || a.status,
                        fmtTime(a.woke_up_at), fmtTime(a.departed_at), fmtTime(a.arrived_at), fmtTime(a.finished_at),
                    ].map(escapeForCsv).join(','))
                }
            }
            const blob = new Blob(['﻿' + [headers.join(','), ...rows].join('\n')], {
                type: 'text/csv;charset=utf-8;',
            })
            downloadBlob(`attendance-${startDate}-${endDate}.csv`, blob)
        } finally {
            setExportingAttendance(false)
        }
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
                    <button type="button" className="fws-button secondary" onClick={handleExportAttendanceCsv} disabled={exportingAttendance}>
                        {exportingAttendance ? '出力中...' : '出勤記録CSV出力'}
                    </button>
                </div>
            </div>

            {completedOrders.length > 0 && (
                <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: 360 }}>
                    <AppIcon name="Search" size={14} strokeWidth={2} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        value={completedSearch}
                        onChange={(e) => setCompletedSearch(e.target.value)}
                        placeholder="案件名・場所・チーム名で検索"
                        style={{
                            width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: 8,
                            border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box',
                        }}
                    />
                </div>
            )}

            <div className="fws-card">
                {completedOrders.length === 0 ? (
                    <p className="fws-empty">完了済みの案件はまだありません。</p>
                ) : filteredCompletedOrders.length === 0 ? (
                    <p className="fws-empty">「{completedSearch}」に一致する完了済み案件はありません。</p>
                ) : (
                    <WorkOrdersTable orders={filteredCompletedOrders} readOnly onSelect={handleSelectOrder} />
                )}
            </div>
        </div>

        {/* 詳細パネル（スライドアップ） */}
        {selectedOrder && (
            <>
                {/* オーバーレイ */}
                <div
                    onClick={() => setSelectedOrder(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                        zIndex: 200,
                    }}
                />
                {/* シート */}
                <div style={{
                    position: 'fixed', left: 0, right: 0, bottom: 0,
                    zIndex: 201,
                    background: '#fff',
                    borderRadius: '16px 16px 0 0',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    padding: '0 0 calc(env(safe-area-inset-bottom) + 1rem)',
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                }}>
                    {/* ハンドル＋ヘッダー */}
                    <div style={{
                        position: 'sticky', top: 0, background: '#fff',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '0.75rem 1rem 0.75rem',
                        zIndex: 1,
                    }}>
                        <div style={{ width: 36, height: 4, borderRadius: 9, background: '#e2e8f0', margin: '0 auto 0.75rem' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>
                                {selectedOrder.projectName || selectedOrder.title || selectedOrder.id}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedOrder(null)}
                                style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <AppIcon name="X" size={20} />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '1rem' }}>
                        {/* 基本情報 */}
                        <section style={{ marginBottom: '1.25rem' }}>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>基本情報</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {selectedOrder.location && (
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
                                        <AppIcon name="MapPin" size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                                        {selectedOrder.location}
                                    </div>
                                )}
                                {(selectedOrder.startDate || selectedOrder.dueDate) && (
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
                                        <AppIcon name="Calendar" size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                                        {formatAdminDate(selectedOrder.startDate)}
                                        {selectedOrder.dueDate && selectedOrder.dueDate !== selectedOrder.startDate && ` 〜 ${formatAdminDate(selectedOrder.dueDate)}`}
                                    </div>
                                )}
                                {selectedOrder.team_name && (
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
                                        <AppIcon name="Users" size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                                        {selectedOrder.team_name}
                                    </div>
                                )}
                                {(selectedOrder.description || selectedOrder.notes) && (
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '0.6rem 0.75rem', lineHeight: 1.6 }}>
                                        {selectedOrder.description || selectedOrder.notes}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* メンバー */}
                        <section style={{ marginBottom: '1.25rem' }}>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                メンバー {!detailLoading && `(${detailMembers.length}名)`}
                            </p>
                            {detailLoading ? (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>読み込み中...</p>
                            ) : detailMembers.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>メンバーが登録されていません</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {detailMembers.map(m => (
                                        <div key={m.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.65rem',
                                            padding: '0.5rem 0.75rem', borderRadius: 10,
                                            border: '1px solid #f1f5f9', background: '#fafafa',
                                        }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                background: '#4f46e5', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                                            }}>
                                                {m.name?.[0] ?? '?'}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{m.name}</p>
                                                <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                                                    {m.employee_id}{m.team_name ? ` ・ ${m.team_name}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* 添付資料 */}
                        <section>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                添付資料 {!detailLoading && `(${detailAttachments.length}件)`}
                            </p>
                            {detailLoading ? (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>読み込み中...</p>
                            ) : detailAttachments.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>添付資料はありません</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {detailAttachments.map(att => (
                                        <a
                                            key={att.id}
                                            href={`${BASE_URL}/uploads/${att.filename}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.65rem',
                                                padding: '0.5rem 0.75rem', borderRadius: 10,
                                                border: '1px solid #e0e7ff', background: '#f5f3ff',
                                                textDecoration: 'none', color: '#4f46e5',
                                            }}
                                        >
                                            <AppIcon name="Paperclip" size={14} style={{ flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {att.original_name}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.72rem', color: '#7c3aed' }}>
                                                    {(att.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <AppIcon name="Download" size={14} style={{ flexShrink: 0 }} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </>
        )}
        </>
    )
}
