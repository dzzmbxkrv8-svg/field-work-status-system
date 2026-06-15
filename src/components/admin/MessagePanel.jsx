import { useState, useMemo, useEffect, useRef } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useMessages } from '@/hooks/useMessages'
import { getWorkers } from '@/api/workers'
import { uploadFile } from '@/api/messages'
import { AppIcon } from '@/utils/iconMap'

const AVATAR_COLORS = ['#4f46e5','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2']
const avatarColor = (id) => AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function Avatar({ name, id, size = 40 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: avatarColor(id || 0),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: size * 0.4,
        }}>
            {name?.[0] ?? '?'}
        </div>
    )
}

function fmtTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function isImage(mimeType) {
    return mimeType && mimeType.startsWith('image/')
}

// ファイルアイコン（種類別）
function FileIcon({ mimeType }) {
    const iconName = !mimeType ? 'FileText'
        : mimeType.includes('pdf') ? 'FileText'
        : mimeType.includes('image') ? 'Camera'
        : 'Paperclip'
    return <AppIcon name={iconName} size={20} strokeWidth={1.8} style={{ color: 'currentColor', flexShrink: 0 }} />
}

// ファイル添付カード（画像以外）
function FileCard({ url, fileName, isMine }) {
    const fullUrl = url?.startsWith('http') ? url : `${BASE_URL}${url}`
    return (
        <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: isMine ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
                borderRadius: 10, textDecoration: 'none',
                color: isMine ? '#fff' : '#1e293b',
                marginTop: '0.3rem',
                border: isMine ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
            }}
        >
            <AppIcon name="Paperclip" size={18} strokeWidth={2} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                {fileName || 'ファイル'}
            </span>
        </a>
    )
}

export default function MessagePanel({ workers: propWorkers }) {
    const { state } = useAppContext()
    const { messages: apiMessages, send: sendMessageApi, loading: messagesLoading, markRead } = useMessages()
    const [workers, setWorkers] = useState(propWorkers || [])
    const [loading, setLoading] = useState(!(propWorkers && propWorkers.length > 0))
    const [selectedUser, setSelectedUser] = useState(null)
    const [search, setSearch] = useState('')
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    // 添付ファイル state
    const [attachFile, setAttachFile] = useState(null)      // { file, preview, isImage }
    const [uploading, setUploading] = useState(false)
    const bottomRef = useRef(null)
    const imageInputRef = useRef(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (propWorkers && propWorkers.length > 0) {
            setWorkers(propWorkers)
            setLoading(false)
            return
        }
        getWorkers().then(r => {
            if (r.success) setWorkers(r.data || [])
        }).finally(() => setLoading(false))
    }, [propWorkers])

    const myId = state.session?.id

    const messages = useMemo(() => {
        return apiMessages.map(msg => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderName: msg.sender_name || 'Admin',
            receiverId: msg.receiver_id,
            teamId: msg.team_id,
            content: msg.content,
            photoUrl: msg.photo_url,
            fileUrl: msg.file_url,
            fileName: msg.file_name,
            ts: msg.created_at,
            isMine: msg.sender_id === myId,
            isRead: msg.is_read,
        })).sort((a, b) => new Date(a.ts) - new Date(b.ts))
    }, [apiMessages, myId])

    const conversations = useMemo(() => {
        const map = {}
        const allMsgs = messages.filter(m => m.teamId != null || (!m.receiverId && !m.teamId))
        if (allMsgs.length > 0) {
            const unread = allMsgs.filter(m => !m.isMine && !m.isRead).length
            map['all'] = { id: 'all', name: '全員', latest: allMsgs[allMsgs.length - 1], unreadCount: unread }
        }
        workers.forEach(w => {
            const conv = messages.filter(m =>
                (m.senderId === w.id || m.receiverId === w.id) && !m.teamId
            )
            const unread = conv.filter(m => !m.isMine && !m.isRead).length
            map[w.id] = { id: w.id, name: w.name, teamName: w.team_name, latest: conv[conv.length - 1] || null, unreadCount: unread }
        })
        return Object.values(map)
    }, [messages, workers])

    const chatMessages = useMemo(() => {
        if (!selectedUser) return []
        if (selectedUser.id === 'all') {
            return messages.filter(m => m.teamId != null || (!m.receiverId && !m.teamId))
        }
        return messages.filter(m =>
            (m.senderId === selectedUser.id || m.receiverId === selectedUser.id) && !m.teamId
        )
    }, [messages, selectedUser])

    // 会話を開いたとき相手からの未読メッセージを既読にする
    useEffect(() => {
        if (!selectedUser || !myId) return
        const unread = chatMessages.filter(m => !m.isMine && !m.isRead)
        unread.forEach(m => markRead(m.id))
    }, [selectedUser?.id, chatMessages.length])

    // ひらがな↔カタカナを統一してふりがな検索に対応
    const toHiragana = (str) => str.replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    const toKatakana = (str) => str.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))

    // 検索フィルター済み作業員リスト（条件returnより前に置く必要あり）
    const filteredWorkers = useMemo(() => {
        const raw = search.trim()
        if (!raw) return workers
        const q = toHiragana(raw.toLowerCase())   // 入力をひらがなに統一
        return workers.filter(w => {
            const name = w.name || ''
            const furigana = toHiragana(w.furigana || '') // DBのふりがな（ひらがな統一）
            return (
                name.includes(raw) ||             // 漢字名の部分一致
                furigana.includes(q)              // ふりがなの部分一致（ひら/カタ両対応）
            )
        })
    }, [workers, search])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    // ファイル選択ハンドラ
    const handleFileSelect = (e, forImage) => {
        const file = e.target.files?.[0]
        if (!file) return
        const img = forImage || file.type.startsWith('image/')
        const preview = img ? URL.createObjectURL(file) : null
        setAttachFile({ file, preview, isImage: img })
        e.target.value = ''
    }

    const clearAttach = () => {
        if (attachFile?.preview) URL.revokeObjectURL(attachFile.preview)
        setAttachFile(null)
    }

    const handleSend = async () => {
        if (!input.trim() && !attachFile) return
        if (!selectedUser) return
        setSending(true)

        let uploadedUrl = null
        let uploadedFileName = null
        let uploadedIsImage = false

        // ファイルがあればまずアップロード
        if (attachFile) {
            setUploading(true)
            const res = await uploadFile(attachFile.file)
            setUploading(false)
            if (res.success) {
                uploadedUrl = res.url
                uploadedFileName = res.originalName
                uploadedIsImage = isImage(res.mimetype)
            }
        }

        const payload = {
            content: input.trim(),
            receiver_id: selectedUser.id === 'all' ? null : selectedUser.id,
            team_id: selectedUser.id === 'all' ? 1 : null,
            ...(uploadedIsImage ? { photo_url: uploadedUrl } : {}),
            ...(!uploadedIsImage && uploadedUrl ? { file_url: uploadedUrl, file_name: uploadedFileName } : {}),
        }

        const result = await sendMessageApi(payload)
        if (result.success) {
            setInput('')
            clearAttach()
        }
        setSending(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const canSend = (input.trim() || attachFile) && !sending && !uploading

    if (loading || messagesLoading) return <div className="fws-panel"><p>読み込み中...</p></div>

    // ── チャット画面 ──
    if (selectedUser) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column',
                height: 'calc(100vh - 130px)',
                background: '#f0f0f0',
                borderRadius: 16, overflow: 'hidden',
                border: '1px solid #e2e8f0',
            }}>
                {/* ヘッダー */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: '#fff', borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0,
                }}>
                    <button type="button" onClick={() => setSelectedUser(null)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#4f46e5', padding: '0.25rem',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <AppIcon name="ArrowLeft" size={18} strokeWidth={2} />
                    </button>
                    <Avatar name={selectedUser.name} id={selectedUser.id === 'all' ? 0 : selectedUser.id} size={36} />
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{selectedUser.name}</p>
                        {selectedUser.teamName && (
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{selectedUser.teamName}</p>
                        )}
                    </div>
                </div>

                {/* メッセージエリア */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {chatMessages.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>
                            メッセージはまだありません
                        </p>
                    ) : chatMessages.map(msg => (
                        <div key={msg.id} style={{
                            display: 'flex',
                            flexDirection: msg.isMine ? 'row-reverse' : 'row',
                            alignItems: 'flex-end', gap: '0.4rem',
                        }}>
                            {!msg.isMine && <Avatar name={msg.senderName} id={msg.senderId} size={30} />}
                            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: msg.isMine ? 'flex-end' : 'flex-start', gap: '0.15rem' }}>
                                {!msg.isMine && (
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '0.25rem' }}>{msg.senderName}</span>
                                )}
                                {/* テキスト or ファイルのみ or 両方 */}
                                {(msg.content || msg.photoUrl || msg.fileUrl) && (
                                    <div style={{
                                        padding: (msg.photoUrl && !msg.content) ? 0 : '0.55rem 0.85rem',
                                        borderRadius: msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: msg.isMine ? '#4f46e5' : '#fff',
                                        color: msg.isMine ? '#fff' : '#1e293b',
                                        fontSize: '0.88rem', lineHeight: 1.5,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                        wordBreak: 'break-word',
                                        overflow: 'hidden',
                                    }}>
                                        {msg.content && <span>{msg.content}</span>}
                                        {/* 画像 */}
                                        {msg.photoUrl && (
                                            <img
                                                src={msg.photoUrl.startsWith('http') ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`}
                                                alt="添付画像"
                                                style={{ display: 'block', marginTop: msg.content ? '0.4rem' : 0, maxWidth: '100%', borderRadius: msg.content ? 8 : (msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'), maxHeight: 220, objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => window.open(msg.photoUrl.startsWith('http') ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`, '_blank')}
                                            />
                                        )}
                                        {/* ファイル */}
                                        {msg.fileUrl && (
                                            <FileCard url={msg.fileUrl} fileName={msg.fileName} isMine={msg.isMine} />
                                        )}
                                    </div>
                                )}
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{fmtTime(msg.ts)}</span>
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* 添付プレビュー */}
                {attachFile && (
                    <div style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        flexShrink: 0,
                    }}>
                        {attachFile.isImage && attachFile.preview ? (
                            <img src={attachFile.preview} alt="" style={{ height: 52, width: 52, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#e2e8f0', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
                                <FileIcon mimeType={attachFile.file.type} />
                                <span style={{ fontSize: '0.78rem', color: '#334155', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {attachFile.file.name}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{fmtSize(attachFile.file.size)}</span>
                            </div>
                        )}
                        <button type="button" onClick={clearAttach} style={{ background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AppIcon name="X" size={11} strokeWidth={2.5} />
                        </button>
                        {uploading && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>アップロード中...</span>}
                    </div>
                )}

                {/* 入力エリア */}
                <div style={{
                    display: 'flex', alignItems: 'flex-end', gap: '0.4rem',
                    padding: '0.65rem 0.75rem',
                    background: '#fff', borderTop: '1px solid #e2e8f0',
                    flexShrink: 0,
                }}>
                    {/* 隠しinput群 */}
                    <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, true)} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={e => handleFileSelect(e, false)} />

                    {/* カメラアイコン */}
                    <button type="button" onClick={() => imageInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }} title="画像を添付">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                    </button>
                    {/* クリップアイコン */}
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }} title="ファイルを添付">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                    </button>

                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="メッセージを入力..."
                        rows={1}
                        style={{
                            flex: 1, resize: 'none', border: '1px solid #e2e8f0',
                            borderRadius: 20, padding: '0.55rem 0.9rem',
                            fontSize: '0.9rem', outline: 'none',
                            background: '#f8fafc', lineHeight: 1.5,
                            maxHeight: 100, overflowY: 'auto',
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        style={{
                            width: 40, height: 40, borderRadius: '50%', border: 'none',
                            background: canSend ? '#4f46e5' : '#e2e8f0',
                            color: canSend ? '#fff' : '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: canSend ? 'pointer' : 'default',
                            fontSize: '1rem', flexShrink: 0,
                            transition: 'all 0.15s',
                        }}
                    ><AppIcon name="Send" size={16} strokeWidth={2} /></button>
                </div>
            </div>
        )
    }

    // ── トーク一覧画面 ──
    const showAll = !search.trim() || '全員'.includes(search.trim())

    return (
        <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            border: '1px solid #e2e8f0',
        }}>
            {/* ヘッダー + 検索バー */}
            <div style={{ padding: '0.85rem 1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>メッセージ</h2>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: '#f1f5f9', borderRadius: 20,
                    padding: '0.4rem 0.75rem', marginBottom: '0.75rem',
                }}>
                    <AppIcon name="Search" size={14} strokeWidth={2} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="名前で検索..."
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            fontSize: '0.88rem', outline: 'none', color: '#0f172a',
                        }}
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                          <AppIcon name="X" size={14} strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>

            {/* 全員宛（検索でフィルターされる） */}
            {showAll && (() => {
                const allConv = conversations.find(c => c.id === 'all')
                const allUnread = allConv?.unreadCount || 0
                return (
                    <div
                        onClick={() => setSelectedUser({ id: 'all', name: '全員' })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.85rem 1rem', cursor: 'pointer',
                            borderBottom: '1px solid #f8fafc', background: '#fff',
                        }}
                    >
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                            background: '#4f46e5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: '1.1rem',
                        }}>全</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>全員</p>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                全作業員へ一斉送信
                            </p>
                        </div>
                        {allUnread > 0 ? (
                            <span style={{
                                background: '#ef4444', color: '#fff',
                                borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                minWidth: 20, height: 20, lineHeight: '20px',
                                textAlign: 'center', padding: '0 5px', flexShrink: 0,
                            }}>{allUnread > 99 ? '99+' : allUnread}</span>
                        ) : (
                            <AppIcon name="ChevronRight" size={16} strokeWidth={2} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        )}
                    </div>
                )
            })()}

            {/* 作業員リスト */}
            {filteredWorkers.length === 0 && search ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '2rem 1rem' }}>
                    「{search}」に一致する作業員はいません
                </p>
            ) : filteredWorkers.map(worker => {
                const conv = conversations.find(c => c.id === worker.id)
                const latest = conv?.latest
                const unread = conv?.unreadCount || 0
                const latestText = latest
                    ? (latest.photoUrl ? '[写真]' : latest.fileUrl ? `[ファイル] ${latest.fileName || ''}` : latest.content)
                    : 'メッセージなし'
                return (
                    <div
                        key={worker.id}
                        onClick={() => setSelectedUser({ id: worker.id, name: worker.name, teamName: worker.team_name })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.85rem 1rem', cursor: 'pointer',
                            borderBottom: '1px solid #f8fafc',
                            background: unread > 0 ? '#fef2f2' : '#fff',
                        }}
                    >
                        <Avatar name={worker.name} id={worker.id} size={48} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <p style={{ margin: 0, fontWeight: unread > 0 ? 800 : 700, fontSize: '0.92rem', color: '#0f172a' }}>{worker.name}</p>
                                {latest && <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>{fmtTime(latest.ts)}</span>}
                            </div>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: unread > 0 ? '#374151' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                                {latestText}
                            </p>
                        </div>
                        {unread > 0 ? (
                            <span style={{
                                background: '#ef4444', color: '#fff',
                                borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                                minWidth: 20, height: 20, lineHeight: '20px',
                                textAlign: 'center', padding: '0 5px', flexShrink: 0,
                            }}>{unread > 99 ? '99+' : unread}</span>
                        ) : (
                            <AppIcon name="ChevronRight" size={16} strokeWidth={2} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
