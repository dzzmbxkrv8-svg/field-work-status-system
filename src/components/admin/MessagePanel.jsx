import { useState, useMemo, useEffect } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { useMessages } from '@/hooks/useMessages'
import { getWorkers } from '@/api/workers'

export default function MessagePanel() {
    const { state } = useAppContext()
    const { text, formatDate } = useI18n('ja')
    const { messages: apiMessages, send: sendMessageApi, loading: messagesLoading } = useMessages()
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [recipient, setRecipient] = useState('')
    const [message, setMessage] = useState('')
    const [activeTab, setActiveTab] = useState('received')

    useEffect(() => {
        const fetchWorkers = async () => {
            try {
                const result = await getWorkers()
                if (result.success) {
                    setWorkers(result.data || [])
                }
            } catch (err) {
                console.error('Failed to fetch workers for messaging:', err)
                setError('データを取得できませんでした')
            } finally {
                setLoading(false)
            }
        }
        fetchWorkers()
    }, [])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!recipient || !message.trim()) return

        const payload = {
            content: message.trim(),
            receiver_id: recipient === 'all' ? null : parseInt(recipient),
            team_id: recipient === 'all' ? 1 : null
        }

        const result = await sendMessageApi(payload)
        if (result.success) {
            setMessage('')
            alert('Message sent!')
        } else {
            alert(result.message || 'Error sending message')
        }
    }

    const messages = useMemo(() => {
        return apiMessages.map(msg => ({
            id: msg.id,
            sender: msg.sender_name || 'Admin',
            receiver: msg.receiver_name || (msg.team_id ? 'Team' : 'All'),
            message: msg.content,
            timestamp: msg.created_at,
            type: msg.sender_id === state.session?.id ? 'sent' : 'received'
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }, [apiMessages, state.session])

    const displayedMessages = messages.filter(m => m.type === activeTab)

    if (loading || messagesLoading) return <div className="fws-panel"><p>読み込み中...</p></div>
    if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

    return (
        <div className="fws-panel">
            <div className="fws-panel-header" style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>{text.worker.adminMessageTitle}</h2>
            </div>

            <div className="fws-grid-layout fws-message-grid">
                <form onSubmit={handleSend} className="fws-form-card">
                    <label>
                        {text.worker.adminMessageRecipientLabel}
                        <select value={recipient} onChange={(e) => setRecipient(e.target.value)} required>
                            <option value="">宛先を選択...</option>
                            <option value="all">全作業員</option>
                            {workers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.name} ({worker.team_name || worker.team || `Team ${worker.team_id}`})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={text.worker.adminMessagePlaceholder}
                            required
                        />
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="fws-button primary" disabled={messagesLoading}>
                            {text.worker.adminMessageButton}
                        </button>
                    </div>
                </form>

                <div className="fws-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div className="fws-tabs-secondary" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            className={`fws-filter-chip ${activeTab === 'received' ? 'active' : ''}`}
                            onClick={() => setActiveTab('received')}
                        >
                            {text.worker.adminMessageReceivedTab}
                        </button>
                        <button
                            className={`fws-filter-chip ${activeTab === 'sent' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sent')}
                        >
                            {text.worker.adminMessageSentTab}
                        </button>
                    </div>

                    {displayedMessages.length === 0 ? (
                        <p className="fws-empty-state" style={{ flexGrow: 1, textAlign: 'center', margin: '2rem 0' }}>{text.worker.adminMessageEmpty}</p>
                    ) : (
                        <ul className="fws-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
                            {displayedMessages.map((msg) => (
                                <li key={msg.id} className="fws-list-item">
                                    <div className="fws-list-content">
                                        <strong>
                                            {msg.type === 'received'
                                                ? text.worker.adminMessageFromLabel(msg.sender)
                                                : text.worker.adminMessageToLabel(msg.receiver)
                                            }
                                        </strong>
                                        <p>{msg.message}</p>
                                        <small className="fws-meta">{formatDate(msg.timestamp)}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
