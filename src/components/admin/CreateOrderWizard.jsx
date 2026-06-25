import { useState, useMemo } from 'react'
import { AppIcon } from '@/utils/iconMap'

const STEPS = ['案件情報', 'メンバーを選ぶ', '確認']

// ---- Calendar Date Range Picker ----
const DOW = ['日', '月', '火', '水', '木', '金', '土']

function toYMD(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function DateRangePicker({ startDate, endDate, onChangeStart, onChangeEnd }) {
  const now = new Date()
  const todayStr = toYMD(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [picking, setPicking] = useState(null) // null=閉じている, 'start', 'end'

  const cells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDay = new Date(viewYear, viewMonth, 0).getDate()
    const result = []
    for (let i = 0; i < firstDow; i++) result.push(null)
    for (let d = 1; d <= lastDay; d++) result.push(d)
    return result
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const openPicker = (key) => {
    // 選択中の日付の月を表示
    const ref = key === 'start' ? startDate : endDate
    if (ref?.length === 10) {
      setViewYear(parseInt(ref.slice(0, 4)))
      setViewMonth(parseInt(ref.slice(5, 7)))
    }
    setPicking(prev => prev === key ? null : key)
  }

  const handleDay = (d) => {
    const ymd = toYMD(viewYear, viewMonth, d)
    if (picking === 'start') {
      onChangeStart(ymd)
      if (endDate && ymd > endDate) onChangeEnd(ymd)
      // 終了日が未設定なら終了日選択へ、設定済みなら閉じる
      if (!endDate) {
        setPicking('end')
      } else {
        setPicking(null)
      }
    } else {
      if (startDate && ymd < startDate) {
        onChangeEnd(startDate)
        onChangeStart(ymd)
      } else {
        onChangeEnd(ymd)
      }
      setPicking(null) // 終了日選択後は閉じる
    }
  }

  const fmtDisplay = (ymd) => ymd
    ? `${parseInt(ymd.slice(0,4))}年${parseInt(ymd.slice(5,7))}月${parseInt(ymd.slice(8,10))}日`
    : 'タップして選択'

  const isOpen = picking !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* 開始日・終了日フィールド */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {[['start','開始日'], ['end','終了日']].map(([key, label]) => {
          const val = key === 'start' ? startDate : endDate
          const isActive = picking === key
          return (
            <button key={key} type="button" onClick={() => openPicker(key)} style={{
              padding: '0.65rem 0.75rem', borderRadius: 10,
              border: `1.5px solid ${isActive ? '#4f46e5' : val ? '#c7c7f0' : '#e2e8f0'}`,
              background: isActive ? '#4f46e5' : val ? '#eef2ff' : '#f8fafc',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: isActive ? '#fff' : '#94a3b8', marginBottom: '0.15rem' }}>{label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isActive ? '#fff' : val ? '#1e1b4b' : '#94a3b8' }}>
                {fmtDisplay(val)}
              </div>
            </button>
          )
        })}
      </div>

      {/* カレンダー本体（展開時のみ表示） */}
      {isOpen && (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>

          {/* 選択中モード表示 */}
          <div style={{ padding: '0.6rem 1rem', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AppIcon name={picking === 'start' ? 'CalendarDays' : 'Flag'} size={13} strokeWidth={2} />
                {picking === 'start' ? '開始日を選択' : '終了日を選択'}
              </span>
            </span>
            <button type="button" onClick={() => setPicking(null)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: 24, height: 24, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><AppIcon name="X" size={14} strokeWidth={2.5} /></button>
          </div>

          {/* 月ナビ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem 0.4rem' }}>
            <button type="button" onClick={prevMonth} style={{
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', color: '#374151',
            }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
              {viewYear}年{viewMonth}月
            </span>
            <button type="button" onClick={nextMonth} style={{
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', color: '#374151',
            }}>›</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 0.5rem' }}>
            {DOW.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '0.72rem', fontWeight: 600,
                padding: '0.2rem 0 0.4rem',
                color: i === 0 ? '#ef4444' : i === 6 ? '#4f46e5' : '#94a3b8',
              }}>{d}</div>
            ))}
          </div>

      {/* 日付グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 0.5rem 0.75rem', rowGap: '0.15rem' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const ymd = toYMD(viewYear, viewMonth, d)
          const isStart = ymd === startDate
          const isEnd = ymd === endDate
          const inRange = startDate && endDate && ymd > startDate && ymd < endDate
          const isToday = ymd === todayStr
          const col = i % 7

          return (
            <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
              {/* 範囲帯 */}
              {(inRange || (isStart && endDate && endDate !== startDate) || (isEnd && startDate && endDate !== startDate)) && (
                <div style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  height: 32,
                  left: (isStart || col === 0) ? '50%' : 0,
                  right: (isEnd || col === 6) ? '50%' : 0,
                  background: '#eef2ff', zIndex: 0,
                }} />
              )}
              <button
                type="button"
                onClick={() => handleDay(d)}
                style={{
                  position: 'relative', zIndex: 1,
                  width: 34, height: 34, borderRadius: '50%', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: (isStart || isEnd) ? '#4f46e5' : 'transparent',
                  color: (isStart || isEnd) ? '#fff'
                    : isToday ? '#4f46e5'
                    : inRange ? '#1e1b4b'
                    : col === 0 ? '#ef4444'
                    : col === 6 ? '#4f46e5'
                    : '#0f172a',
                  fontWeight: (isStart || isEnd || isToday) ? 700 : 400,
                  fontSize: '0.9rem',
                  outline: isToday && !isStart && !isEnd ? '2px solid #a5b4fc' : 'none',
                  outlineOffset: 1,
                }}
              >{d}</button>
            </div>
          )
        })}
      </div>
        </div>
      )}
    </div>
  )
}

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
        background: selected ? '#4f46e5' : '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: selected ? '#fff' : '#475569',
        transition: 'all 0.15s ease',
        boxShadow: selected ? '0 0 0 3px #a5b4fc' : 'none',
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
            color: '#fff',
          }}><AppIcon name="Check" size={10} strokeWidth={3} /></div>
        )}
      </div>
      <span style={{
        fontSize: '0.75rem',
        color: selected ? '#4f46e5' : '#64748b',
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

const getFileIconName = (type) => {
  if (!type) return 'Paperclip'
  if (type.startsWith('image/')) return 'Camera'
  if (type === 'application/pdf') return 'FileText'
  return 'Paperclip'
}

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
  })
  const [attachments, setAttachments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([])
  const [leaderId, setLeaderId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const toggleWorker = (id) => {
    setSelectedWorkerIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id)
        if (leaderId === id) setLeaderId(next[0] ?? null)
        return next
      }
      const next = [...prev, id]
      if (!leaderId) setLeaderId(id)
      return next
    })
  }

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
        leaderId,
        memberIds: selectedWorkerIds,
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
                background: i < step ? '#22c55e' : i === step ? '#4f46e5' : '#e2e8f0',
                color: i <= step ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.2s',
              }}>
                {i < step ? <AppIcon name="Check" size={11} strokeWidth={3} /> : i + 1}
              </div>
              <span style={{
                fontSize: '0.72rem',
                color: i === step ? '#4f46e5' : '#94a3b8',
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
        }}><AppIcon name="CircleX" size={14} strokeWidth={2} style={{ flexShrink: 0, verticalAlign: 'middle', marginRight: '0.3rem' }} />{error}</p>
      )}

      {/* Step 0: 案件情報 */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AppIcon name="ClipboardList" size={16} strokeWidth={2} style={{ color: '#4f46e5' }} />案件情報を入力</h4>

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>作業期間</p>
            <DateRangePicker
              startDate={form.startDate}
              endDate={form.dueDate}
              onChangeStart={v => handleFormChange('startDate', v)}
              onChangeEnd={v => handleFormChange('dueDate', v)}
            />
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
                border: `2px dashed ${dragOver ? '#4f46e5' : '#cbd5e1'}`,
                borderRadius: 10,
                background: dragOver ? '#eef2ff' : '#f8fafc',
                padding: '1.25rem',
                textAlign: 'center',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('wiz-file-input').click()}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                <AppIcon name="Paperclip" size={14} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />ファイルをドラッグ＆ドロップ、または<span style={{ color: '#4f46e5', fontWeight: 600 }}>クリックして選択</span>
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
                    <AppIcon name={getFileIconName(file.type)} size={16} strokeWidth={2} style={{ flexShrink: 0, color: '#64748b' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.2rem', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AppIcon name="Users" size={16} strokeWidth={2} style={{ color: '#4f46e5' }} />メンバーを選んでください</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>複数選択可・選択後にリーダーを指定してください</p>
          </div>

          {/* 選択済みメンバー一覧 */}
          {selectedWorkerIds.length > 0 && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '0.6rem 0.75rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#0369a1' }}>
                選択中 {selectedWorkerIds.length}名
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {selectedWorkerIds.map(id => {
                  const w = workers.find(x => x.id === id)
                  if (!w) return null
                  const isLeader = leaderId === id
                  return (
                    <div key={id} style={{ position: 'relative', display: 'inline-block' }}>
                      {isLeader && (
                        <span style={{
                          position: 'absolute', top: -8, right: -2,
                          fontSize: '0.55rem', fontWeight: 700,
                          color: '#4f46e5', background: '#eef2ff',
                          padding: '0.1rem 0.3rem', borderRadius: 4,
                          lineHeight: 1.4, whiteSpace: 'nowrap',
                          border: '1px solid #c7c7f0',
                        }}>リーダー</span>
                      )}
                      <div style={{
                        padding: '0.25rem 0.6rem', borderRadius: 20,
                        background: isLeader ? '#4f46e5' : '#fff',
                        border: `1px solid ${isLeader ? '#4f46e5' : '#e2e8f0'}`,
                        fontSize: '0.78rem',
                        color: isLeader ? '#fff' : '#374151', fontWeight: 600,
                      }}>{w.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 作業員リスト（5件分の高さ固定・それ以上はスクロール） */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            maxHeight: 'calc(5 * 58px + 4 * 0.4rem)',
            overflowY: 'auto',
            paddingRight: '2px',
          }}>
            {workers.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>作業員が登録されていません</p>
            ) : workers.map(worker => {
              const isSelected = selectedWorkerIds.includes(worker.id)
              const isLeader = leaderId === worker.id
              return (
                <div key={worker.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.75rem', borderRadius: 10,
                  background: isSelected ? (isLeader ? '#eef2ff' : '#f8fafc') : '#fff',
                  border: `1.5px solid ${isLeader ? '#4f46e5' : isSelected ? '#c7c7f0' : '#e2e8f0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }} onClick={() => toggleWorker(worker.id)}>
                  {/* アバター */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: isSelected ? '#4f46e5' : '#e2e8f0',
                    color: isSelected ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.95rem',
                  }}>{worker.name[0]}</div>

                  {/* 名前・チーム */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: isSelected ? '#1e1b4b' : '#374151' }}>
                        {worker.name}
                      </p>
                      {isLeader && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700,
                          color: '#4f46e5', background: '#eef2ff',
                          padding: '0.05rem 0.35rem', borderRadius: 4,
                          border: '1px solid #c7c7f0', lineHeight: 1.6,
                          position: 'relative', top: '-4px',
                        }}>リーダー</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{worker.team_name || worker.team || '—'}</p>
                  </div>

                  {/* チェック + リーダーボタン */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {isSelected && !isLeader && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setLeaderId(worker.id) }}
                        style={{
                          padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 600,
                          borderRadius: 6, border: '1px solid #cbd5e1',
                          background: '#f8fafc', color: '#64748b', cursor: 'pointer',
                        }}
                      >
                        リーダーにする
                      </button>
                    )}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: isSelected ? '#4f46e5' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <AppIcon name="Check" size={11} strokeWidth={3} style={{ color: '#fff' }} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: 確認 */}
      {step === 2 && (
        <div>
          <h4 style={{ margin: '0 0 1rem', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AppIcon name="CheckCircle" size={16} strokeWidth={2} style={{ color: '#059669' }} />内容を確認してください</h4>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#4f46e5',
              padding: '0.85rem 1rem',
              color: '#fff',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{form.title}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AppIcon name="MapPin" size={12} strokeWidth={2} />{form.location}</p>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>開始日</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{form.startDate ? `${parseInt(form.startDate.slice(0,4))}年${parseInt(form.startDate.slice(5,7))}月${parseInt(form.startDate.slice(8,10))}日` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>終了日</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{form.dueDate ? `${parseInt(form.dueDate.slice(0,4))}年${parseInt(form.dueDate.slice(5,7))}月${parseInt(form.dueDate.slice(8,10))}日` : '—'}</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#64748b' }}>メンバー</span>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{selectedWorkerIds.length}名</span>
                </div>
                {selectedWorkerIds.length === 0 ? (
                  <span style={{ color: '#94a3b8' }}>未割り当て</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {selectedWorkerIds.map(id => {
                      const w = workers.find(x => x.id === id)
                      if (!w) return null
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#4f46e5', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.72rem', flexShrink: 0,
                          }}>{w.name[0]}</div>
                          <span style={{ color: '#1e293b', fontWeight: 500 }}>{w.name}</span>
                          {leaderId === id && (
                            <span style={{ fontSize: '0.6rem', color: '#4f46e5', fontWeight: 700, background: '#eef2ff', padding: '0.1rem 0.35rem', borderRadius: 4, border: '1px solid #c7c7f0', position: 'relative', top: '-2px' }}>リーダー</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
                      <AppIcon name={getFileIconName(file.type)} size={13} strokeWidth={2} style={{ flexShrink: 0, color: '#94a3b8' }} />
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
          {step === 0 ? 'キャンセル' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AppIcon name="ArrowLeft" size={13} strokeWidth={2} />戻る</span>}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: 8,
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {step === 1 ? (
              selectedWorkerIds.length > 0
                ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>次へ<AppIcon name="ArrowRight" size={13} strokeWidth={2} /></span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>スキップ<AppIcon name="ArrowRight" size={13} strokeWidth={2} /></span>
            ) : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>次へ<AppIcon name="ArrowRight" size={13} strokeWidth={2} /></span>}
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
              background: saving ? '#a5b4fc' : '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {saving ? '作成中...' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AppIcon name="CheckCircle" size={14} strokeWidth={2} />作成する</span>}
          </button>
        )}
      </div>
    </div>
  )
}
