import { useState, useRef, useCallback } from 'react'
import { uploadFile } from '@/api/messages'

export default function WorkerReportTab({
  text,
  assignments,
  reportForm,
  handleReportChange,
  handleReportSubmit,
  incomingMessages,
  sentMessages,
  recipientOptions,
  adminMessageRecipient,
  setAdminMessageRecipient,
  sendMessageApi,
  showToast,
}) {
  const [adminMessage, setAdminMessage] = useState('')
  const [messageView, setMessageView] = useState('received')
  const [reportPhotos, setReportPhotos] = useState([])
  const [reportSubTab, setReportSubTab] = useState('message')
  const [dailyPhoto, setDailyPhoto] = useState(null)
  const [dailyPhotoUploading, setDailyPhotoUploading] = useState(false)
  const messageTextareaRef = useRef(null)

  const messageSentLabel = text.worker.adminMessageSentTab ?? 'Sent'
  const messageReceivedLabel = text.worker.adminMessageReceivedTab ?? 'Received'
  const messageEmptyLabel = text.worker.adminMessageEmpty ?? 'No messages yet.'

  const handleReportPhotoChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const remainingSlots = 8 - reportPhotos.length
    if (remainingSlots <= 0) {
      showToast('warning', text.worker.attachmentLimitAlert || 'ファイルは最大で8つまで添付できます')
      return
    }
    files.slice(0, remainingSlots).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => setReportPhotos(prev => [...prev, { file, preview: reader.result }])
      reader.readAsDataURL(file)
    })
  }

  const removeReportPhoto = (index) => {
    setReportPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleAdminMessageChange = (event) => {
    setAdminMessage(event.target.value)
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto'
      messageTextareaRef.current.style.height = `${messageTextareaRef.current.scrollHeight}px`
    }
  }

  const handleDailyPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setDailyPhoto({ file, preview })
  }

  const removeDailyPhoto = () => {
    if (dailyPhoto?.preview) URL.revokeObjectURL(dailyPhoto.preview)
    setDailyPhoto(null)
  }

  const handleDailyReportSubmit = async () => {
    let photoUrl = null
    if (dailyPhoto) {
      setDailyPhotoUploading(true)
      const res = await uploadFile(dailyPhoto.file)
      setDailyPhotoUploading(false)
      if (res.success && res.url) {
        photoUrl = res.url
      } else {
        showToast('error', '写真のアップロードに失敗しました')
        return
      }
    }
    await handleReportSubmit(photoUrl)
    removeDailyPhoto()
  }

  const handleAdminMessageSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!adminMessage.trim() && reportPhotos.length === 0) return
    if (!adminMessageRecipient) return

    const [type, id] = adminMessageRecipient.split(':')
    const basePayload = {
      team_id: (type === 'worker' || type === 'admin') ? null : id,
      receiver_id: type === 'worker' ? parseInt(id) : null,
    }

    const uploadedUrls = []
    for (const photo of reportPhotos) {
      const res = await uploadFile(photo.file)
      if (res.success && res.url) uploadedUrls.push(res.url)
    }

    const result = await sendMessageApi({
      ...basePayload,
      content: adminMessage.trim(),
      ...(uploadedUrls.length > 0 ? { photo_url: uploadedUrls[0] } : {}),
    })

    if (result.success && uploadedUrls.length > 1) {
      for (const url of uploadedUrls.slice(1)) {
        await sendMessageApi({ ...basePayload, content: '', photo_url: url })
      }
    }

    if (result.success) {
      setAdminMessage('')
      setReportPhotos([])
      if (messageTextareaRef.current) messageTextareaRef.current.style.height = '120px'
      showToast('success', 'メッセージと報告を送信しました。')
    } else {
      showToast('error', result.message || '送信に失敗しました。')
    }
  }, [adminMessage, adminMessageRecipient, sendMessageApi, reportPhotos, showToast])

  return (
    <div className="worker-report-container">
      {/* ── サブタブ切り替え ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setReportSubTab('message')}
          style={{
            flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            background: reportSubTab === 'message' ? 'var(--color-primary)' : '#f1f5f9',
            color: reportSubTab === 'message' ? '#fff' : '#475569',
          }}
        >
          💬 メッセージ
          {incomingMessages.length > 0 && (
            <span style={{ marginLeft: '0.4rem', background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0.05rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
              {incomingMessages.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setReportSubTab('report')}
          style={{
            flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            background: reportSubTab === 'report' ? 'var(--color-primary)' : '#f1f5f9',
            color: reportSubTab === 'report' ? '#fff' : '#475569',
          }}
        >
          📝 日報
        </button>
      </div>

      {/* ── メッセージタブ ── */}
      {reportSubTab === 'message' && (
      <section className="worker-card worker-card-message">
        <header>
          <h3>メッセージ</h3>
        </header>
        <form className="worker-message-form" onSubmit={handleAdminMessageSubmit}>
          <div className="worker-form-group">
            <label>{text.worker.adminMessageRecipientLabel}</label>
            <select value={adminMessageRecipient} onChange={(e) => setAdminMessageRecipient(e.target.value)}>
              {recipientOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="worker-message-textarea-wrapper">
            <textarea
              ref={messageTextareaRef}
              value={adminMessage}
              onChange={handleAdminMessageChange}
              placeholder={text.worker.adminMessagePlaceholder}
              style={{ minHeight: '120px' }}
            />
          </div>

          <div className="worker-photo-controls" style={{ marginTop: '1rem' }}>
            <label className="worker-photo-label-trigger">
              <input type="file" accept="image/*" capture="camera" multiple onChange={handleReportPhotoChange} style={{ display: 'none' }} />
              <div className="worker-photo-add-box" style={{ padding: '0.75rem', border: '2px dashed var(--color-border)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                <span>📷 {text.worker.photoReportPrompt || '写真を追加'}</span>
              </div>
            </label>
            {reportPhotos.length > 0 && (
              <div className="worker-photo-grid-preview" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
                {reportPhotos.map((photo, idx) => (
                  <div key={idx} className="worker-photo-thumbnail" style={{ position: 'relative', aspectRatio: '1/1' }}>
                    <img src={photo.preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    <button type="button" className="worker-photo-delete" onClick={() => removeReportPhoto(idx)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', lineHeight: '20px', fontSize: '12px', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {reportPhotos.length >= 8 && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>最大8枚まで選択できます</p>
            )}
          </div>

          <button type="submit" className="worker-message-send-btn" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            <span className="worker-send-btn-text">{text.worker.adminMessageButton}</span>
          </button>
        </form>

        <div className="worker-message-list-section" style={{ marginTop: '2rem' }}>
          <div className="worker-message-tabs-pill">
            <button type="button" className={messageView === 'sent' ? 'active' : ''} onClick={() => setMessageView('sent')}>{messageSentLabel}</button>
            <button type="button" className={messageView === 'received' ? 'active' : ''} onClick={() => setMessageView('received')}>{messageReceivedLabel}</button>
          </div>
          <div className="worker-message-log-simple">
            {(messageView === 'received' ? incomingMessages : sentMessages).length === 0 ? (
              <p className="worker-empty">{messageEmptyLabel}</p>
            ) : (
              <ul>
                {(messageView === 'received' ? incomingMessages : sentMessages).map((entry, idx) => (
                  <li key={entry.id || idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>
                          {messageView === 'received'
                            ? text.worker.adminMessageFromLabel(entry.sender)
                            : text.worker.adminMessageToLabel(entry.receiver)
                          }
                        </p>
                        <p style={{ margin: '0 0 0.25rem' }}>{entry.message || entry.content}</p>
                        {entry.photo_url && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <img src={entry.photo_url} alt="Attached" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
                          </div>
                        )}
                        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {new Date(entry.timestamp).toLocaleString('ja-JP')}
                        </small>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      )}

      {/* ── 日報タブ ── */}
      {reportSubTab === 'report' && (
      <section className="worker-card worker-card-daily-report">
        <header>
          <h3>{text.worker.dailyReportTitle || '日報'}</h3>
        </header>
        <div className="worker-report-form-simple">
          {assignments.length > 1 && (
            <div className="worker-form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                {text.worker.assignmentProjectLabel}
              </label>
              <select
                value={reportForm.assignment_id}
                onChange={(e) => handleReportChange('assignment_id', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
              >
                {assignments.map(a => (
                  <option key={a.db_id ?? a.id} value={String(a.db_id ?? a.id)}>
                    {a.projectName || a.location || a.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <textarea
            rows={4}
            value={reportForm.note}
            onChange={(e) => handleReportChange('note', e.target.value)}
            placeholder={text.worker.dailyReportPlaceholder}
          />

          {/* 写真添付 */}
          <div style={{ marginTop: '0.75rem' }}>
            {dailyPhoto ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={dailyPhoto.preview} alt="添付写真" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={removeDailyPhoto}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#475569', border: '1px dashed #cbd5e1', width: 'fit-content' }}>
                <input type="file" accept="image/*" capture="camera" onChange={handleDailyPhotoChange} style={{ display: 'none' }} />
                📷 写真を添付
              </label>
            )}
          </div>

          <button
            type="button"
            className="worker-clock-button primary"
            onClick={handleDailyReportSubmit}
            disabled={!reportForm.note || dailyPhotoUploading}
            style={{ marginTop: '1rem' }}
          >
            {dailyPhotoUploading ? 'アップロード中...' : (text.worker.dailyReportSubmit)}
          </button>
        </div>
      </section>
      )}
    </div>
  )
}
