import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { AppIcon } from '@/utils/iconMap'
import { getAvailableWorkers } from '@/api/shifts'

export default function WorkerAssignmentDialog({ order, workers, onSave, onClose, error }) {
    const { text } = useI18n()
    // DBのassigned_worker_idに合わせて単一選択（ラジオボタン）
    const [selectedWorkerId, setSelectedWorkerId] = useState(order.assigned_worker_id || null)
    const [saving, setSaving] = useState(false)
    // 作業期間中にシフトで明示的に×の回答をした作業員は候補から外す（未取得時はnull=全員表示）
    const [availabilityMap, setAvailabilityMap] = useState(null)

    const startDate = order.startDate || order.start_date
    const endDate = order.endDate || order.end_date || order.dueDate || startDate

    useEffect(() => {
        if (!startDate) { setAvailabilityMap(null); return }
        let cancelled = false
        getAvailableWorkers(startDate, endDate).then(res => {
            if (cancelled) return
            if (res.success) {
                const map = {}
                res.data.forEach(a => { map[a.worker_id] = a.available })
                setAvailabilityMap(map)
            } else {
                setAvailabilityMap(null)
            }
        })
        return () => { cancelled = true }
    }, [startDate, endDate])

    // 明示的な×の人は除外。未回答・△(応相談)はまだ「出勤不可」と決まっていないので候補に残す。
    // ただし既に割り当て済みの担当者は、外れていても状況が分かるよう表示は残す
    const visibleWorkers = useMemo(() => {
        if (!availabilityMap) return workers
        return workers.filter(w => availabilityMap[w.id] !== false || w.id === order.assigned_worker_id)
    }, [workers, availabilityMap, order.assigned_worker_id])
    const excludedCount = workers.length - visibleWorkers.length

    const handleSave = async () => {
        setSaving(true)
        await onSave(selectedWorkerId)
        setSaving(false)
    }

    return (
        <div className="fws-modal-overlay">
            <div className="fws-modal">
                <header className="fws-modal-header">
                    <h3>{text.admin.assignment.title}</h3>
                    <button type="button" className="fws-close-button" onClick={onClose}>
                        &times;
                    </button>
                </header>
                <div className="fws-modal-content">
                    <p style={{ marginBottom: '0.5rem' }}>{text.admin.assignment.selectWorkers}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                        案件「{order.title || order.projectName}」の担当者を1名選択してください
                    </p>
                    {excludedCount > 0 && (
                        <p style={{
                            fontSize: '0.78rem', color: '#92400e',
                            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                            padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
                        }}>
                            作業期間中にシフトで「×」の回答をした{excludedCount}名は候補から非表示になっています。
                        </p>
                    )}
                    {error && (
                        <p style={{ color: '#991b1b', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            <AppIcon name="CircleX" size={14} strokeWidth={2} style={{ flexShrink: 0 }} /> {error}
                        </p>
                    )}
                    <div className="fws-worker-list">
                        {/* 割り振り解除の選択肢 */}
                        <label key="none" className="fws-worker-item">
                            <input
                                type="radio"
                                name="assigned_worker"
                                checked={selectedWorkerId === null}
                                onChange={() => setSelectedWorkerId(null)}
                            />
                            <span className="fws-worker-name" style={{ color: '#94a3b8' }}>担当者なし（解除）</span>
                        </label>
                        {visibleWorkers.map((worker) => {
                            const status = availabilityMap ? availabilityMap[worker.id] : true
                            const isUnavailable = status === false
                            const isUnknown = status === null
                            return (
                                <label key={worker.id} className="fws-worker-item">
                                    <input
                                        type="radio"
                                        name="assigned_worker"
                                        checked={selectedWorkerId === worker.id}
                                        onChange={() => setSelectedWorkerId(worker.id)}
                                    />
                                    <span className="fws-worker-name">{worker.name}</span>
                                    <span className="fws-worker-team">{worker.team_name || worker.team}</span>
                                    {isUnavailable && (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#dc2626' }}>
                                            シフト×
                                        </span>
                                    )}
                                    {isUnknown && (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#92400e' }}>
                                            シフト未回答
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                </div>
                <footer className="fws-modal-actions">
                    <button type="button" className="fws-button secondary" onClick={onClose} disabled={saving}>
                        {text.admin.assignment.cancel}
                    </button>
                    <button type="button" className="fws-button" onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : text.admin.assignment.save}
                    </button>
                </footer>
            </div>
        </div>
    )
}
