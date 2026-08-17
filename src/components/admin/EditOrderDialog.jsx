import { useState, useEffect } from 'react'
import { getAttachments, deleteAttachment } from '@/api/assignments'
import { AppIcon } from '@/utils/iconMap'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function EditOrderDialog({ order, onSave, onCancel }) {
  const [title, setTitle]         = useState(order.projectName || '')
  const [location, setLocation]   = useState(order.location || '')
  const [startDate, setStartDate] = useState(order.startDate?.slice(0, 10) || '')
  const [endDate, setEndDate]     = useState(order.dueDate?.slice(0, 10) || '')
  const [description, setDescription] = useState(order.description || '')
  const [newFiles, setNewFiles]   = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [existingAttachments, setExistingAttachments] = useState([])
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (order.db_id) {
      getAttachments(order.db_id).then(res => {
        if (res.success) setExistingAttachments(res.data || [])
      })
    }
  }, [order.db_id])

  const handleDeleteAttachment = async (attId) => {
    if (!window.confirm('この添付ファイルを削除しますか？')) return
    setDeletingId(attId)
    const res = await deleteAttachment(order.db_id, attId)
    if (res.success) {
      setExistingAttachments(prev => prev.filter(a => a.id !== attId))
    }
    setDeletingId(null)
  }

  const handleFileChange = (e) => {
    setNewFiles(Array.from(e.target.files))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('案件名は必須です'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(order.db_id, {
        title: title.trim(),
        location: location.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        description: description.trim(),
      }, newFiles)
    } catch (err) {
      setError(err.message || '保存に失敗しました')
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '0.3rem',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        padding: '1.5rem', width: '100%', maxWidth: '480px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: '0 0 1.2rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AppIcon name="Pencil" size={15} strokeWidth={2} style={{ color: '#4f46e5' }} />作業指示を編集
          </span>
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 案件名 */}
          <div>
            <label style={labelStyle}>案件名 *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="案件名を入力"
              required
            />
          </div>

          {/* 住所 */}
          <div>
            <label style={labelStyle}>現場住所</label>
            <input
              style={inputStyle}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="現場の住所を入力"
            />
          </div>

          {/* 日付 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>開始日</label>
              <input
                type="date"
                style={inputStyle}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>終了日</label>
              <input
                type="date"
                style={inputStyle}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 備考・作業内容 */}
          <div>
            <label style={labelStyle}>備考・作業内容</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="作業内容や注意事項を入力"
            />
          </div>

          {/* 既存の添付ファイル */}
          {existingAttachments.length > 0 && (
            <div>
              <label style={labelStyle}>既存の添付ファイル</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {existingAttachments.map(att => {
                  const url = att.url?.startsWith('http') ? att.url : `${BASE_URL}${att.url}`
                  const isImage = att.mime_type?.startsWith('image/')
                  return (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      {isImage ? (
                        <img src={url} alt={att.original_name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <AppIcon name="FileText" size={20} strokeWidth={1.8} style={{ color: '#64748b' }} />
                      )}
                      <a href={url} target="_blank" rel="noreferrer"
                        style={{ flex: 1, fontSize: '0.8rem', color: '#4f46e5', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.original_name || att.file_name || 'ファイル'}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        disabled={deletingId === att.id}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: 4, flexShrink: 0 }}
                      >
                        {deletingId === att.id ? '...' : '削除'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 作業資料の追加 */}
          <div>
            <label style={labelStyle}>作業資料を追加（PDF・画像・Word・Excel）</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
              style={{ fontSize: '0.85rem', color: '#475569' }}
            />
            {newFiles.length > 0 && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#4f46e5' }}>
                {newFiles.length}件のファイルを追加
              </p>
            )}
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AppIcon name="CircleX" size={14} strokeWidth={2} />{error}</p>
          )}

          {/* ボタン */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              style={{
                padding: '0.5rem 1.2rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', background: 'white',
                color: '#475569', cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1.4rem', borderRadius: '8px',
                border: 'none', background: '#4f46e5',
                color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
