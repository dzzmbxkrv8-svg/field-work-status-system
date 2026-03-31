import { useState } from 'react'
import { useI18n } from '@/i18n'

export default function WorkerAssignmentDialog({ order, workers, onSave, onClose }) {
    const { text } = useI18n()
    // members stores names in the current mock data implementation
    const [selectedMembers, setSelectedMembers] = useState(new Set(order.members || []))

    const handleToggle = (workerName) => {
        const newSelected = new Set(selectedMembers)
        if (newSelected.has(workerName)) {
            newSelected.delete(workerName)
        } else {
            newSelected.add(workerName)
        }
        setSelectedMembers(newSelected)
    }

    const handleSave = () => {
        onSave(Array.from(selectedMembers))
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
                    <p>{text.admin.assignment.selectWorkers}</p>
                    <div className="fws-worker-list">
                        {workers.map((worker) => (
                            <label key={worker.id} className="fws-worker-item">
                                <input
                                    type="checkbox"
                                    checked={selectedMembers.has(worker.id)}
                                    onChange={() => handleToggle(worker.id)}
                                />
                                <span className="fws-worker-name">{worker.name}</span>
                                <span className="fws-worker-team">{worker.team}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <footer className="fws-modal-actions">
                    <button type="button" className="fws-button secondary" onClick={onClose}>
                        {text.admin.assignment.cancel}
                    </button>
                    <button type="button" className="fws-button" onClick={handleSave}>
                        {text.admin.assignment.save}
                    </button>
                </footer>
            </div>
        </div>
    )
}
