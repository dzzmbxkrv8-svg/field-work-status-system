import { useState, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { AppIcon } from '@/utils/iconMap'
import { useShiftAvailability } from '@/hooks/useShiftAvailability'

export default function WorkerAssignmentDialog({ order, workers, onSave, onClose, error }) {
    const { text } = useI18n()
    const a = text.admin.assignment
    // DBのassigned_worker_idに合わせて単一選択（ラジオボタン）
    const [selectedWorkerId, setSelectedWorkerId] = useState(order.assigned_worker_id || null)
    const [saving, setSaving] = useState(false)

    const startDate = order.startDate || order.start_date
    const endDate = order.endDate || order.end_date || order.dueDate || startDate
    // 作業期間中にシフトで明示的に×の回答をした作業員は候補から外す（未取得時はnull=全員表示）
    const { availabilityMap } = useShiftAvailability(startDate, endDate)

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
                    <h3>{a.title}</h3>
                    <button type="button" className="fws-close-button" onClick={onClose}>
                        &times;
                    </button>
                </header>
                <div className="fws-modal-content">
                    <p style={{ marginBottom: '0.5rem' }}>{a.selectWorkersFor(order.title || order.projectName)}</p>
                    {excludedCount > 0 && (
                        <p style={{
                            fontSize: '0.78rem', color: '#92400e',
                            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                            padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
                        }}>
                            {a.excludedNotice(excludedCount)}
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
                            <span className="fws-worker-name" style={{ color: '#94a3b8' }}>{a.none}</span>
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
                                            {a.unavailableBadge}
                                        </span>
                                    )}
                                    {isUnknown && (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#92400e' }}>
                                            {a.unknownBadge}
                                        </span>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                </div>
                <footer className="fws-modal-actions">
                    <button type="button" className="fws-button secondary" onClick={onClose} disabled={saving}>
                        {a.cancel}
                    </button>
                    <button type="button" className="fws-button" onClick={handleSave} disabled={saving}>
                        {saving ? a.saving : a.save}
                    </button>
                </footer>
            </div>
        </div>
    )
}
