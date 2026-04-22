import { useState } from 'react'

const STEPS = ['案件情報', 'メンバーを選ぶ', '確認']

const PRIORITY_OPTIONS = [
  { value: 'high',   label: '高', color: '#ef4444' },
  { value: 'medium', label: '中', color: '#f59e0b' },
  { value: 'low',    label: '低', color: '#22c55e' },
]

function AvatarCircle({ name, selected, onClick }) {
  const initial = name ? name[0] : '?'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem',
      }}
    >
      <div style={{
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: selected ? '#2563eb' : '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: selected ? '#fff' : '#475569',
        transition: 'all 0.15s ease',
        boxShadow: selected ? '0 0 0 3px #93c5fd' : 'none',
      }}>
        {initial}
        {selected && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            color: '#fff',
          }}>✓</div>
        )}
      </div>
      <span style={{
        fontSize: '0.75rem',
        color: selected ? '#2563eb' : '#64748b',
        fontWeight: selected ? 600 : 400,
        maxWidth: 60,
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{name}</span>
    </button>
  )
}

const FILE_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/heic': '🖼️',
  'image/webp': '🖼️',
}
const getFileIcon = (type) => FILE_ICONS[type] || '📎'

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CreateOrderWizard({ workers, onCreate, onCancel }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    title: '',
    location: '',
    startDate: '',
    dueDate: '',
    priority: 'medium',
  })
  const [attachments, setAttachments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const selectedWorker = workers.find(w => w.id === selectedWorkerId) || null

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (step === 0) {
      if (!form.title.trim() || !form.location.trim()) {
        setError('案件名と現場は必須です')
        return
      }
    }
    setError(null)
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep(s => s - 1)
  }

  const handleFileSelect = (files) => {
    const MAX = 10
    const newFiles = Array.from(files).slice(0, MAX - attachments.length)
    setAttachments(prev => [...prev, ...newFiles].slice(0, MAX))
  }

  const handleRemoveFile = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      await onCreate({
        title: form.title,
        location: form.location,
        startDate: form.startDate,
        dueDate: form.dueDate,
        priority: form.priority,
        workerId: selectedWorkerId,
        attachments,
      })
    } catch (e) {
      setError('作成に失敗しました。もう一度お試しください。')
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* ステッパーヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0' }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: i < step ? '#22c55e' : i === step ? '#2563eb' : '#e2e8f0',
                color: i <= step ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.2s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.72rem',
                color: i === step ? '#2563eb' : '#94a3b8',
                fontWeight: i === step ? 600 : 400,
                whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: i < step ? '#22c55e' : '#e2e8f0',
                margin: '0 0.5rem',
                marginBottom: '1.2rem',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p style={{
          color: '#991b1b',
          background: '#fee2e2',
          padding: '0.5rem 0.75rem',
          borderRadius: 6,
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}>❌ {error}</p>
      )}

      {/* Step 0: 案件情報 */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>📋 案件情報を入力</h4>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#374151' }}>
            案件名 <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>必須</span>
            <input
              value={form.title}
              onChange={e => handleFormChange('title', e.target.value)}
              placeholder="例：渋谷ビル外壁工事"
              style={{ padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#374151' }}>
            現場・場所 <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>必須</span>
            <input
              value={form.location}
              onChange={e => handleFormChange('location', e.target.value)}
              placeholder="例：東京都渋谷区〇〇1-2-3"
              style={{ padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#374151' }}>
              開始日
              <input
                type="date"
                value={form.startDate}
                onChange={e => handleFormChange('startDate', e.target.value)}
                style={{ padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#374151' }}>
              終了日
              <input
                type="date"
                value={form.dueDate}
                onChange={e => handleFormChange('dueDate', e.target.value)}
                style={{ padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </label>
          </div>

          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#374151' }}>優先度</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFormChange('priority', opt.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 8,
                    border: `2px solid ${form.priority === opt.value ? opt.color : '#e2e8f0'}`,
                    background: form.priority === opt.value ? `${opt.color}18` : '#f8fafc',
                    color: form.priority === opt.value ? opt.color : '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 資料・図面 */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#374151' }}>
              資料・図面 <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>（任意・最大10ファイル）</span>
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
                borderRadius: 10,
                background: dragOver ? '#eff6ff' : '#f8fafc',
                padding: '1.25rem',
                textAlign: 'center',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('wiz-file-input').click()}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                📎 ファイルをドラッグ＆ドロップ、または<span style={{ color: '#2563eb', fontWeight: 600 }}>クリックして選択</span>
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                PDF・画像・Word・Excel（1ファイル最大20MB）
              </p>
            </div>
            <input
              id="wiz-file-input"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.doc,.docx,.xls,.xlsx"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* File list */}
            {attachments.length > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {attachments.map((file, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{getFileIcon(file.type)}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>
                      {file.name}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(i) }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: '1rem', padding: '0 0.1rem', lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: メンバーを選ぶ */}
      {step === 1 && (
        <div>
          <h4 style={{ margin: '0 0 0.25rem', color: '#1e293b', fontSize: '1rem' }}>👥 担当作業員を選んでください</h4>
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#94a3b8' }}>1名選択・スキップも可</p>

          {selectedWorker && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.9rem',
              background: '#eff6ff',
              borderRadius: 10,
              marginBottom: '1rem',
              border: '1px solid #bfdbfe',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#2563eb', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
              }}>{selectedWorker.name[0]}</div>
              <span style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>{selectedWorker.name}</span>
              <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>{selectedWorker.team_name || selectedWorker.team}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            maxHeight: 280,
            overflowY: 'auto',
            padding: '0.5rem',
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
          }}>
            {workers.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem' }}>作業員が登録されていません</p>
            ) : workers.map(worker => (
              <AvatarCircle
                key={worker.id}
                name={worker.name}
                selected={selectedWorkerId === worker.id}
                onClick={() => setSelectedWorkerId(
                  selectedWorkerId === worker.id ? null : worker.id
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 確認 */}
      {step === 2 && (
        <div>
          <h4 style={{ margin: '0 0 1rem', color: '#1e293b', fontSize: '1rem' }}>✅ 内容を確認してください</h4>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#2563eb',
              padding: '0.85rem 1rem',
              color: '#fff',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{form.title}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.85 }}>📍 {form.location}</p>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>開始日</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{form.startDate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>終了日</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{form.dueDate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>優先度</span>
                <span style={{
                  fontWeight: 600,
                  color: PRIORITY_OPTIONS.find(p => p.value === form.priority)?.color,
                }}>
                  {PRIORITY_OPTIONS.find(p => p.value === form.priority)?.label}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>担当作業員</span>
                {selectedWorker ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#2563eb', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.75rem',
                    }}>{selectedWorker.name[0]}</div>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{selectedWorker.name}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>未割り当て</span>
                )}
              </div>
              {attachments.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>添付ファイル</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{attachments.length}件</span>
                  </div>
                  {attachments.map((file, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', marginBottom: '0.2rem' }}>
                      <span>{getFileIcon(file.type)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>({formatBytes(file.size)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* フッターボタン */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '1.5rem',
        gap: '0.75rem',
      }}>
        <button
          type="button"
          onClick={step === 0 ? onCancel : handleBack}
          disabled={saving}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#64748b',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {step === 0 ? 'キャンセル' : '← 戻る'}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {step === 1 ? (selectedWorkerId ? '次へ →' : 'スキップ →') : '次へ →'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: 8,
              border: 'none',
              background: saving ? '#93c5fd' : '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {saving ? '作成中...' : '✅ 作成する'}
          </button>
        )}
      </div>
    </div>
  )
}
