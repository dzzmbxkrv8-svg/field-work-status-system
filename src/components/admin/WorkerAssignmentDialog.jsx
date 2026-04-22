import { useState } from 'react'
import { useI18n } from '@/i18n'

export default function WorkerAssignmentDialog({ order, workers, onSave, onClose, error }) {
    const { text } = useI18n('ja')
    // DBのassigned_worker_idに合わせて単一選択（ラジオボタン）
    const [selectedWorkerId, setSelectedWorkerId] = useState(order.assigned_worker_id || null)
    const [saving, setSaving] = useState(false)

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
                    {error && (
                        <p style={{ color: '#991b1b', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            ❌ {error}
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
                        {workers.map((worker) => (
                            <label key={worker.id} className="fws-worker-item">
                                <input
                                    type="radio"
                                    name="assigned_worker"
                                    checked={selectedWorkerId === worker.id}
                                    onChange={() => setSelectedWorkerId(worker.id)}
                                />
                                <span className="fws-worker-name">{worker.name}</span>
                                <span className="fws-worker-team">{worker.team_name || worker.team}</span>
                            </label>
                        ))}
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
