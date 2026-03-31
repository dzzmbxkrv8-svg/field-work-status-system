import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'

export default function MessagePanel({ workers }) {
    const { state } = useAppContext()
    const { text, formatDate } = useI18n(state.language)
    const [recipient, setRecipient] = useState('')
    const [message, setMessage] = useState('')
    const [attachments, setAttachments] = useState([])
    const [activeTab, setActiveTab] = useState('sent') // 'sent' or 'received'
    const [messageLog, setMessageLog] = useState([])

    const handleSend = (e) => {
        e.preventDefault()
        if (!recipient || !message.trim()) return

        const newMessage = {
            id: Date.now(),
            recipient,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            sender: 'Admin',
            type: 'sent',
            attachments: attachments
        }

        setMessageLog([newMessage, ...messageLog])
        setMessage('')
        setAttachments([])
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const currentCount = attachments.length
        const remainingSlots = 8 - currentCount

        if (remainingSlots <= 0) {
            alert('Maximum 8 files allowed.')
            return
        }

        const filesToAdd = files.slice(0, remainingSlots)
        if (files.length > remainingSlots) {
            alert(`Maximum 8 files allowed. Only ${remainingSlots} files added.`)
        }

        filesToAdd.forEach(file => {
            const reader = new FileReader()
            reader.onload = () => {
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    data: reader.result
                }])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    // Mock received messages for demonstration
    const receivedMessages = [
        {
            id: 'r1',
            sender: 'W001', // Tanaka
            message: '現場に到着しました。',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: 'received',
        },
        {
            id: 'r2',
            sender: 'W002', // Sato
            message: '資材が不足しています。確認お願いします。',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            type: 'received',
        },
    ]

    const displayedMessages = activeTab === 'sent'
        ? messageLog.filter(m => m.type === 'sent')
        : receivedMessages

    return (
        <div className="fws-panel">
            <div className="fws-panel-header">
                <h2>{text.worker.adminMessageTitle}</h2>
                <p>{text.worker.adminMessagePlaceholder}</p>
            </div>

            <div className="fws-grid-layout fws-message-grid">
                <form onSubmit={handleSend} className="fws-form-card">
                    <label>
                        {text.worker.adminMessageRecipientLabel}
                        <select value={recipient} onChange={(e) => setRecipient(e.target.value)} required>
                            <option value="">Select recipient...</option>
                            <option value="all">All Workers</option>
                            {workers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} ({worker.team})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Message
                        <textarea
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={text.worker.adminMessagePlaceholder}
                            required
                        />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    disabled={attachments.length >= 8}
                                />
                                <span role="img" aria-label="attach">📎</span>
                                <span>Attach ({attachments.length}/8)</span>
                            </label>
                            {attachments.length > 0 && (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                    {attachments.map((file, index) => (
                                        <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#666' }}
                                                aria-label="remove file"
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button type="submit" className="fws-button primary">
                            {text.worker.adminMessageButton}
                        </button>
                    </div>
                </form>

                <div className="fws-card">
                    <div className="fws-tabs-secondary">
                        <button
                            className={`fws-tab-secondary ${activeTab === 'sent' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sent')}
                        >
                            {text.worker.adminMessageSentTab}
                        </button>
                        <button
                            className={`fws-tab-secondary ${activeTab === 'received' ? 'active' : ''}`}
                            onClick={() => setActiveTab('received')}
                        >
                            {text.worker.adminMessageReceivedTab}
                        </button>
                    </div>

                    {displayedMessages.length === 0 ? (
                        <p className="fws-empty-state">{text.worker.adminMessageEmpty}</p>
                    ) : (
                        <ul className="fws-list">
                            {displayedMessages.map((log) => {
                                const isReceived = log.type === 'received'
                                const senderName = isReceived
                                    ? workers.find(w => w.id === log.sender)?.name || log.sender
                                    : 'Admin'
                                const recipientName = !isReceived
                                    ? (log.recipient === 'all' ? 'All Workers' : workers.find(w => w.id === log.recipient)?.name || log.recipient)
                                    : 'Admin'

                                return (
                                    <li key={log.id} className="fws-list-item">
                                        <div className="fws-list-content">
                                            <strong>
                                                {isReceived
                                                    ? text.worker.adminMessageFromLabel(senderName)
                                                    : text.worker.adminMessageToLabel(recipientName)
                                                }
                                            </strong>
                                            <p>{log.message}</p>
                                            {log.attachments && log.attachments.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {log.attachments.map((att, i) => (
                                                        <div key={i}>
                                                            {att.type.startsWith('image/') ? (
                                                                <img src={att.data} alt={att.name} style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                                                            ) : (
                                                                <a href={att.data} download={att.name} style={{ display: 'block' }}>
                                                                    📎 {att.name}
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <small className="fws-meta">{formatDate(log.timestamp)}</small>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div >
    )
}
