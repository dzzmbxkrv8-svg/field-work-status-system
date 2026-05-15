import { useState, useRef, useEffect, useMemo } from 'react'
import { uploadFile } from '@/api/messages'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function Avatar({ name, size = 32, bg = '#475569' }) {
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

export default function WorkerReportTab({ worker, apiMessages, sendMessageApi, showToast }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [attachFile, setAttachFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const imageInputRef = useRef(null)
  const textareaRef = useRef(null)

  const chatMessages = useMemo(() => {
    return (apiMessages || [])
      .filter(msg =>
        msg.sender_id === worker?.id ||           // 自分が送った
        msg.receiver_id === worker?.id ||          // 自分宛て
        (msg.team_id != null && msg.sender_id !== worker?.id)  // 全員宛ブロードキャスト
      )
      .map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || '管理者',
        content: msg.content,
        photoUrl: msg.photo_url,
        ts: msg.created_at,
        isMine: msg.sender_id === worker?.id,
      }))
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
  }, [apiMessages, worker])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImg = file.type.startsWith('image/')
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

    const result = await sendMessageApi({
      content: input.trim(),
      receiver_id: null,
      team_id: null,
      ...(uploadedIsImage && uploadedUrl ? { photo_url: uploadedUrl } : {}),
      ...(!uploadedIsImage && uploadedUrl ? { file_url: uploadedUrl } : {}),
    })

    if (result.success) {
      setInput('')
      clearAttach()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } else {
      showToast('error', result.message || '送信に失敗しました')
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = (input.trim() || attachFile) && !sending && !uploading

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 160px)',
      background: '#f0f2f5',
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e2e8f0',
    }}>
      {/* ── ヘッダー ── */}
      <div style={{
        padding: '0.75rem 1rem',
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
        }}>管</div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>管理者</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>管理者へのメッセージ</p>
        </div>
      </div>

      {/* ── メッセージエリア ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '1rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {chatMessages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '3rem' }}>
            メッセージはまだありません
          </p>
        ) : chatMessages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.isMine ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: '0.4rem',
          }}>
            {!msg.isMine && <Avatar name={msg.senderName} size={30} bg="#4f46e5" />}
            <div style={{
              maxWidth: '72%', display: 'flex', flexDirection: 'column',
              alignItems: msg.isMine ? 'flex-end' : 'flex-start', gap: '0.15rem',
            }}>
              {!msg.isMine && (
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '0.25rem' }}>
                  {msg.senderName}
                </span>
              )}
              {(msg.content || msg.photoUrl) && (
                <div style={{
                  padding: (msg.photoUrl && !msg.content) ? 0 : '0.55rem 0.85rem',
                  borderRadius: msg.isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.isMine ? '#2563eb' : '#fff',
                  color: msg.isMine ? '#fff' : '#1e293b',
                  fontSize: '0.88rem', lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  wordBreak: 'break-word', overflow: 'hidden',
                }}>
                  {msg.content && <span>{msg.content}</span>}
                  {msg.photoUrl && (
                    <img
                      src={msg.photoUrl.startsWith('http') ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`}
                      alt="添付画像"
                      style={{
                        display: 'block',
                        marginTop: msg.content ? '0.4rem' : 0,
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
                </div>
              )}
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{fmtTime(msg.ts)}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── 添付プレビュー ── */}
      {attachFile && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
        }}>
          {attachFile.isImage && attachFile.preview ? (
            <img src={attachFile.preview} alt="" style={{ height: 52, width: 52, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#334155', background: '#e2e8f0', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
              📎 {attachFile.file.name}
            </span>
          )}
          <button type="button" onClick={clearAttach} style={{
            background: '#ef4444', border: 'none', borderRadius: '50%',
            width: 20, height: 20, color: '#fff', fontSize: '0.7rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
          {uploading && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>アップロード中...</span>}
        </div>
      )}

      {/* ── 入力エリア ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '0.4rem',
        padding: '0.65rem 0.75rem',
        background: '#fff', borderTop: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* カメラアイコン */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}
          title="画像を添付"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
          }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          style={{
            flex: 1, resize: 'none',
            border: '1px solid #e2e8f0',
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
            background: canSend ? '#2563eb' : '#e2e8f0',
            color: canSend ? '#fff' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'default',
            fontSize: '1rem', flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >➤</button>
      </div>
    </div>
  )
}
