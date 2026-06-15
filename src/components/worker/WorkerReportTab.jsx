import { useState, useMemo, useEffect, useRef } from 'react'
import { getWorkers } from '@/api/workers'
import { uploadFile } from '@/api/messages'
import { AppIcon } from '@/utils/iconMap'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2']
const avatarColor = (id) => AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]

function Avatar({ name, id, size = 40 }) {
  const bg = id === 'admin'
    ? 'linear-gradient(135deg, #4f46e5 0%, #4f46e5 100%)'
    : avatarColor(id || 0)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg,
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
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function WorkerReportTab({ worker, apiMessages, sendMessageApi, showToast, markRead }) {
  const [workers, setWorkers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [attachFile, setAttachFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const composingRef = useRef(false)

  useEffect(() => {
    getWorkers().then(r => { if (r.success) setWorkers(r.data || []) })
  }, [])

  const myId = worker?.id

  const messages = useMemo(() =>
    (apiMessages || [])
      .map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || '管理者',
        receiverId: msg.receiver_id,
        teamId: msg.team_id,
        content: msg.content,
        photoUrl: msg.photo_url,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        ts: msg.created_at,
        isMine: msg.sender_id === myId,
        isRead: msg.is_read,
      }))
      .sort((a, b) => new Date(a.ts) - new Date(b.ts)),
  [apiMessages, myId])

  // 全作業員IDセット（管理者メッセージ判別用）
  const workerIdSet = useMemo(() => new Set(workers.map(w => w.id)), [workers])

  // 管理者との会話に含めるメッセージ
  const adminConvFilter = (msg) =>
    (msg.isMine && msg.receiverId == null && msg.teamId == null) ||  // 自分→管理者
    (msg.receiverId === myId) ||                                      // 管理者→自分（直接）
    (msg.teamId != null && !msg.isMine)                              // 全員宛ブロードキャスト

  const conversations = useMemo(() => {
    const adminMsgs = messages.filter(adminConvFilter)
    const adminUnread = adminMsgs.filter(m => !m.isMine && !m.isRead).length
    const adminEntry = {
      id: 'admin', name: '管理者', teamName: null,
      latest: adminMsgs[adminMsgs.length - 1] || null,
      unreadCount: adminUnread,
    }

    const workerEntries = workers
      .filter(w => w.id !== myId)
      .map(w => {
        const conv = messages.filter(msg =>
          (msg.senderId === myId && msg.receiverId === w.id) ||
          (msg.senderId === w.id && msg.receiverId === myId)
        )
        const unread = conv.filter(m => !m.isMine && !m.isRead).length
        return { id: w.id, name: w.name, teamName: w.team_name, latest: conv[conv.length - 1] || null, unreadCount: unread }
      })

    return [adminEntry, ...workerEntries]
  }, [messages, workers, myId])

  const chatMessages = useMemo(() => {
    if (!selectedUser) return []
    if (selectedUser.id === 'admin') return messages.filter(adminConvFilter)
    return messages.filter(msg =>
      (msg.senderId === myId && msg.receiverId === selectedUser.id) ||
      (msg.senderId === selectedUser.id && msg.receiverId === myId)
    )
  }, [messages, selectedUser, myId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // チャットを開いたとき、相手から来た未読メッセージを既読にする
  useEffect(() => {
    if (!selectedUser || !markRead || !myId) return
    const unread = chatMessages.filter(
      msg => !msg.isMine && msg.receiverId === myId && !msg.isRead
    )
    unread.forEach(msg => markRead(msg.id))
  }, [selectedUser, chatMessages, markRead, myId])

  const handleFileSelect = (e, forImage) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImg = forImage || file.type.startsWith('image/')
    const preview = isImg ? URL.createObjectURL(file) : null
    setAttachFile({ file, preview, isImage: isImg })
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
    let uploadedIsImage = false

    if (attachFile) {
      setUploading(true)
      const res = await uploadFile(attachFile.file)
      setUploading(false)
      if (res.success) {
        uploadedUrl = res.url
        uploadedIsImage = attachFile.isImage
      } else {
        showToast('error', 'ファイルのアップロードに失敗しました')
        setSending(false)
        return
      }
    }

    const payload = {
      content: input.trim(),
      receiver_id: selectedUser.id === 'admin' ? null : selectedUser.id,
      team_id: null,
      ...(uploadedIsImage && uploadedUrl ? { photo_url: uploadedUrl } : {}),
      ...(!uploadedIsImage && uploadedUrl ? { file_url: uploadedUrl, file_name: attachFile?.file?.name } : {}),
    }

    const result = await sendMessageApi(payload)
    if (result.success) {
      setInput('')
      clearAttach()
    } else {
      showToast('error', result.message || '送信に失敗しました')
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) { e.preventDefault(); handleSend() }
  }

  const canSend = (input.trim() || attachFile) && !sending && !uploading

  // ── チャット画面 ──
  if (selectedUser) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 160px)',
        background: '#f0f2f5',
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
          <Avatar name={selectedUser.name} id={selectedUser.id} size={36} />
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
              {!msg.isMine && (
                <Avatar
                  name={msg.senderName}
                  id={selectedUser.id === 'admin' ? 'admin' : msg.senderId}
                  size={30}
                />
              )}
              <div style={{
                maxWidth: '72%', display: 'flex', flexDirection: 'column',
                alignItems: msg.isMine ? 'flex-end' : 'flex-start', gap: '0.15rem',
              }}>
                {!msg.isMine && (
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '0.25rem' }}>
                    {msg.senderName}
                  </span>
                )}
                {(msg.content || msg.photoUrl || msg.fileUrl) && (
                  <div style={{
                    padding: (msg.photoUrl && !msg.content) ? 0 : '0.55rem 0.85rem',
                    borderRadius: msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.isMine ? '#4f46e5' : '#fff',
                    color: msg.isMine ? '#fff' : '#1e293b',
                    fontSize: '0.88rem', lineHeight: 1.5,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word', overflow: 'hidden',
                  }}>
                    {msg.content && <span>{msg.content}</span>}
                    {msg.photoUrl && (
                      <img
                        src={msg.photoUrl.startsWith('http') ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`}
                        alt="添付画像"
                        style={{
                          display: 'block', marginTop: msg.content ? '0.4rem' : 0,
                          maxWidth: '100%',
                          borderRadius: msg.content ? 8 : (msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
                          maxHeight: 220, objectFit: 'cover', cursor: 'pointer',
                        }}
                        onClick={() => window.open(
                          msg.photoUrl.startsWith('http') ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`,
                          '_blank'
                        )}
                      />
                    )}
                    {msg.fileUrl && (
                      <a
                        href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BASE_URL}${msg.fileUrl}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          marginTop: msg.content ? '0.3rem' : 0,
                          padding: '0.4rem 0.6rem',
                          background: msg.isMine ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
                          borderRadius: 8, textDecoration: 'none',
                          color: msg.isMine ? '#fff' : '#1e293b',
                          fontSize: '0.78rem', fontWeight: 600,
                        }}
                      >
                        <AppIcon name="Paperclip" size={12} strokeWidth={2} style={{ flexShrink: 0 }} /> {msg.fileName || 'ファイル'}
                      </a>
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
            display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
          }}>
            {attachFile.isImage && attachFile.preview ? (
              <img src={attachFile.preview} alt="" style={{ height: 52, width: 52, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#e2e8f0', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
                <AppIcon name="Paperclip" size={14} strokeWidth={2} style={{ color: '#64748b', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#334155', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attachFile.file.name}
                </span>
              </div>
            )}
            <button type="button" onClick={clearAttach} style={{
              background: '#ef4444', border: 'none', borderRadius: '50%',
              width: 20, height: 20, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><AppIcon name="X" size={11} strokeWidth={2.5} /></button>
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
          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e, true)} />
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={e => handleFileSelect(e, false)} />

          {/* カメラ */}
          <button type="button" onClick={() => imageInputRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            title="画像を添付">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>

          {/* クリップ */}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}
            title="ファイルを添付">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
            }}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={() => { composingRef.current = false }}
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
          <button type="button" onClick={handleSend} disabled={!canSend} style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: canSend ? '#4f46e5' : '#e2e8f0',
            color: canSend ? '#fff' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'default',
            flexShrink: 0, transition: 'all 0.15s',
          }}><AppIcon name="Send" size={16} strokeWidth={2} /></button>
        </div>
      </div>
    )
  }

  // ── トーク一覧画面 ──
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ padding: '0.85rem 1rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>メッセージ</h2>
      </div>

      {conversations.map(conv => {
        const latest = conv.latest
        const unread = conv.unreadCount || 0
        const latestText = latest
          ? (latest.photoUrl ? '[写真]' : latest.fileUrl ? `[ファイル] ${latest.fileName || ''}` : latest.content || '')
          : 'メッセージなし'
        return (
          <div
            key={conv.id}
            onClick={() => setSelectedUser(conv)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', cursor: 'pointer',
              borderBottom: '1px solid #f8fafc',
              background: unread > 0 ? '#fef2f2' : '#fff',
            }}
          >
            <Avatar name={conv.name} id={conv.id} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ margin: 0, fontWeight: unread > 0 ? 800 : 700, fontSize: '0.92rem', color: '#0f172a' }}>{conv.name}</p>
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
