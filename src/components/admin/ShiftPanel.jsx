import { useState, useEffect, useMemo, useCallback } from 'react'
import { getShifts, createShiftRequest, getShiftSummary, confirmShiftDate, confirmAllShiftDates, resendShiftRequest, deleteShiftRequest } from '@/api/shifts'
import { AppIcon } from '@/utils/iconMap'

const STATUS_LABELS = { open: '募集中', closed: '締切', confirmed: '確定済み' }
const STATUS_COLORS = {
  open: { bg: '#eef2ff', color: '#4338ca' },
  closed: { bg: '#f1f5f9', color: '#64748b' },
  confirmed: { bg: '#d1fae5', color: '#065f46' },
}

const AVAILABILITY_META = {
  available: { label: '○', color: '#059669', bg: '#d1fae5' },
  maybe: { label: '△', color: '#b45309', bg: '#fef3c7' },
  unavailable: { label: '×', color: '#dc2626', bg: '#fee2e2' },
}

const AVAILABILITY_ITEMS = [
  { value: 'available', label: '○ 出勤可' },
  { value: 'maybe', label: '△ 応相談' },
  { value: 'unavailable', label: '× 出勤不可' },
]
const ALL_AVAILABILITY_VALUES = AVAILABILITY_ITEMS.map(i => i.value)

const PERIOD_TYPES = [
  { id: 'week', label: '1週間', days: 6 },
  { id: 'half', label: '半月', days: 14 },
  { id: 'month', label: '1ヶ月', days: 29 },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(d) {
  const date = new Date(d)
  const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${date.getMonth() + 1}/${date.getDate()}(${w})`
}

function StatusBadge({ status }) {
  const meta = STATUS_COLORS[status] || STATUS_COLORS.open
  return (
    <span style={{
      background: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.72rem',
      borderRadius: 999, padding: '0.2rem 0.65rem', flexShrink: 0,
    }}>{STATUS_LABELS[status] || status}</span>
  )
}

export default function ShiftPanel() {
  const [view, setView] = useState('list') // list | create | calendar
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null) // { type, text }

  const [selectedShift, setSelectedShift] = useState(null)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [confirmingDate, setConfirmingDate] = useState(null)
  const [confirmSelection, setConfirmSelection] = useState(new Set())
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [resendingDate, setResendingDate] = useState(null)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // 作成フォーム
  const [formTitle, setFormTitle] = useState('')
  const [formStart, setFormStart] = useState(todayStr())
  const [formPeriodType, setFormPeriodType] = useState('week')
  const [formDeadline, setFormDeadline] = useState('')
  const [creating, setCreating] = useState(false)
  // 勤務区分（例: フル/ハーフ、早番/遅番 など）。会社によっては概念が無いため空でもよい
  const [formShiftTypes, setFormShiftTypes] = useState([])
  const [formShiftTypeInput, setFormShiftTypeInput] = useState('')
  // 回答選択肢（○/△/×のうちどれを使うか）。デフォルトは全部使う
  const [formAvailability, setFormAvailability] = useState(ALL_AVAILABILITY_VALUES)

  const formEnd = useMemo(() => {
    const type = PERIOD_TYPES.find(t => t.id === formPeriodType) || PERIOD_TYPES[0]
    return addDays(formStart, type.days)
  }, [formStart, formPeriodType])

  const showBanner = (type, text) => {
    setBanner({ type, text })
    setTimeout(() => setBanner(null), 3500)
  }

  const loadShifts = useCallback(async () => {
    setLoading(true)
    const res = await getShifts()
    if (res.success) setShifts(res.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadShifts() }, [loadShifts])

  const loadSummary = useCallback(async (shiftId) => {
    setSummaryLoading(true)
    const res = await getShiftSummary(shiftId)
    if (res.success) setSummary(res.data)
    else showBanner('error', res.message || '集計の取得に失敗しました')
    setSummaryLoading(false)
  }, [])

  const openCalendar = (shift) => {
    setSelectedShift(shift)
    setSummary(null)
    setConfirmingDate(null)
    setView('calendar')
    loadSummary(shift.id)
  }

  const addFormShiftType = () => {
    const label = formShiftTypeInput.trim()
    if (!label) return
    if (formShiftTypes.includes(label)) {
      setFormShiftTypeInput('')
      return
    }
    if (formShiftTypes.length >= 8) {
      showBanner('error', '勤務区分は8個までです')
      return
    }
    setFormShiftTypes(prev => [...prev, label])
    setFormShiftTypeInput('')
  }

  const removeFormShiftType = (label) => {
    setFormShiftTypes(prev => prev.filter(l => l !== label))
  }

  const toggleFormAvailability = (value) => {
    setFormAvailability(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      showBanner('error', 'タイトルを入力してください')
      return
    }
    if (formAvailability.length < 2) {
      showBanner('error', '回答選択肢は2つ以上選んでください')
      return
    }
    setCreating(true)
    const res = await createShiftRequest({
      title: formTitle.trim(),
      period_start: formStart,
      period_end: formEnd,
      deadline: formDeadline || null,
      shift_type_options: formShiftTypes.length > 0 ? formShiftTypes : null,
      availability_options: formAvailability,
    })
    setCreating(false)
    if (res.success) {
      showBanner('success', 'シフト調査を作成し、全作業員へ送信しました')
      setFormTitle('')
      setFormDeadline('')
      setFormShiftTypes([])
      setFormShiftTypeInput('')
      setFormAvailability(ALL_AVAILABILITY_VALUES)
      setView('list')
      loadShifts()
    } else {
      showBanner('error', res.message || '作成に失敗しました')
    }
  }

  const openConfirmPanel = (date) => {
    const responders = summary?.byDate?.[date] || []
    const initial = new Set(
      responders.filter(r => r.confirmed || r.availability === 'available').map(r => r.workerId)
    )
    setConfirmSelection(initial)
    setConfirmingDate(date)
  }

  const toggleConfirmWorker = (workerId) => {
    setConfirmSelection(prev => {
      const next = new Set(prev)
      if (next.has(workerId)) next.delete(workerId)
      else next.add(workerId)
      return next
    })
  }

  const submitConfirm = async () => {
    if (!selectedShift || !confirmingDate) return
    setConfirmSaving(true)
    const res = await confirmShiftDate(selectedShift.id, {
      date: confirmingDate,
      worker_ids: Array.from(confirmSelection),
    })
    setConfirmSaving(false)
    if (res.success) {
      showBanner('success', `${fmtDate(confirmingDate)} のシフトを確定しました`)
      setConfirmingDate(null)
      loadSummary(selectedShift.id)
    } else {
      showBanner('error', res.message || '確定に失敗しました')
    }
  }

  const handleResendDate = async (date) => {
    if (!selectedShift) return
    if (!window.confirm(`${fmtDate(date)} について作業員へ再調査を送信しますか？`)) return
    setResendingDate(date)
    const res = await resendShiftRequest(selectedShift.id, { date })
    setResendingDate(null)
    if (res.success) showBanner('success', '再調査を送信しました')
    else showBanner('error', res.message || '送信に失敗しました')
  }

  const handleConfirmAll = async () => {
    if (!selectedShift) return
    if (!window.confirm(`「${selectedShift.title}」の期間中、○(出勤可)と回答した作業員をまとめて確定します。既に確定済みの日程には影響しません。よろしいですか？`)) return
    setConfirmingAll(true)
    const res = await confirmAllShiftDates(selectedShift.id)
    setConfirmingAll(false)
    if (res.success) {
      showBanner('success', res.message || '一括確定しました')
      loadSummary(selectedShift.id)
    } else {
      showBanner('error', res.message || '一括確定に失敗しました')
    }
  }

  const handleResendAll = async () => {
    if (!selectedShift) return
    if (!window.confirm(`「${selectedShift.title}」全体の再調査を全作業員へ送信しますか？`)) return
    const res = await resendShiftRequest(selectedShift.id, {})
    if (res.success) {
      showBanner('success', '再調査を送信しました')
      loadShifts()
    } else {
      showBanner('error', res.message || '送信に失敗しました')
    }
  }

  const handleDelete = async (shift, e) => {
    e?.stopPropagation()
    if (!window.confirm(
      `「${shift.title}」を削除しますか？\n作業員からの回答・確定状況は削除されます。既に確定して作業指示に反映済みの分はそのまま残ります。\nこの操作は取り消せません。`
    )) return
    setDeletingId(shift.id)
    const res = await deleteShiftRequest(shift.id)
    setDeletingId(null)
    if (res.success) {
      showBanner('success', res.message || '削除しました')
      if (selectedShift?.id === shift.id) {
        setSelectedShift(null)
        setView('list')
      }
      loadShifts()
    } else {
      showBanner('error', res.message || '削除に失敗しました')
    }
  }

  const Banner = banner && (
    <p style={{
      margin: 0, fontSize: '0.85rem', fontWeight: 600, borderRadius: 10,
      padding: '0.6rem 0.9rem',
      background: banner.type === 'error' ? '#fee2e2' : '#d1fae5',
      color: banner.type === 'error' ? '#991b1b' : '#065f46',
    }}>{banner.text}</p>
  )

  // ── 作成フォーム ──
  if (view === 'create') {
    return (
      <div className="fws-panel">
        <div className="fws-panel-header">
          <h2>シフト調査を作成</h2>
          <button type="button" className="fws-button tertiary" onClick={() => setView('list')}>一覧へ戻る</button>
        </div>
        {Banner}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            タイトル
            <input
              type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder="例）8月後半のシフト希望調査"
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>期間</span>
            <div className="fws-filter-group">
              {PERIOD_TYPES.map(t => (
                <button
                  key={t.id} type="button"
                  className={`fws-filter-chip ${formPeriodType === t.id ? 'active' : ''}`}
                  onClick={() => setFormPeriodType(t.id)}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            開始日
            <input
              type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
            />
          </label>

          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            対象期間: {formStart} 〜 {formEnd}
          </p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            回答締切（任意）
            <input
              type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>回答選択肢</span>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              作業員に選ばせる回答を選んでください（2つ以上）。△（応相談）が不要な場合は外せます。
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {AVAILABILITY_ITEMS.map(item => (
                <label key={item.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formAvailability.includes(item.value)}
                    onChange={() => toggleFormAvailability(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>勤務区分（任意）</span>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              ○/△で回答した際に選ばせたい区分があれば追加してください（例: フル・ハーフ、早番・遅番）。
              追加しない場合は○/△/×のみの回答になります。
            </p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text" value={formShiftTypeInput}
                onChange={e => setFormShiftTypeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFormShiftType() } }}
                placeholder="例）フル"
                style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.88rem' }}
              />
              <button type="button" className="fws-button secondary" onClick={addFormShiftType}>追加</button>
            </div>
            {formShiftTypes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                {formShiftTypes.map(label => (
                  <span key={label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: '#eef2ff', color: '#4338ca', fontWeight: 600, fontSize: '0.8rem',
                    borderRadius: 999, padding: '0.3rem 0.5rem 0.3rem 0.75rem',
                  }}>
                    {label}
                    <button
                      type="button" onClick={() => removeFormShiftType(label)}
                      style={{
                        background: 'rgba(67,56,202,0.12)', border: 'none', borderRadius: '50%',
                        width: 16, height: 16, color: '#4338ca', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}
                    ><AppIcon name="X" size={10} strokeWidth={3} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button" className="fws-button"
            disabled={creating || formAvailability.length < 2}
            onClick={handleCreate}
            style={{ opacity: (creating || formAvailability.length < 2) ? 0.6 : 1 }}
          >
            {creating ? '送信中...' : '作成して全作業員へ送信'}
          </button>
        </div>
      </div>
    )
  }

  // ── カレンダービュー ──
  if (view === 'calendar' && selectedShift) {
    return (
      <div className="fws-panel">
        <div className="fws-panel-header">
          <div>
            <h2>{selectedShift.title}</h2>
            <p>
              {selectedShift.period_start} 〜 {selectedShift.period_end}{selectedShift.deadline && ` ・締切 ${selectedShift.deadline}`}
              {Array.isArray(selectedShift.availability_options) && selectedShift.availability_options.length > 0 &&
                ` ・回答: ${selectedShift.availability_options.map(v => AVAILABILITY_META[v]?.label || v).join('/')}`}
              {Array.isArray(selectedShift.shift_type_options) && selectedShift.shift_type_options.length > 0 &&
                ` ・勤務区分: ${selectedShift.shift_type_options.join('/')}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={selectedShift.status} />
            <button
              type="button" className="fws-button"
              onClick={handleConfirmAll}
              disabled={confirmingAll}
              style={{ opacity: confirmingAll ? 0.6 : 1 }}
              title="○(出勤可)と回答した作業員をまとめて確定します。既に確定済みの日程には影響しません。"
            >
              <AppIcon name="CalendarDays" size={14} strokeWidth={2} /> {confirmingAll ? '確定中...' : '全日程一括確定'}
            </button>
            <button type="button" className="fws-button secondary" onClick={handleResendAll}>
              <AppIcon name="RefreshCw" size={14} strokeWidth={2} /> 全体を再調査
            </button>
            <button
              type="button" className="fws-button secondary"
              onClick={(e) => handleDelete(selectedShift, e)}
              disabled={deletingId === selectedShift.id}
              style={{ color: '#dc2626', borderColor: '#fecaca', opacity: deletingId === selectedShift.id ? 0.6 : 1 }}
            >
              <AppIcon name="Trash2" size={14} strokeWidth={2} /> {deletingId === selectedShift.id ? '削除中...' : '削除'}
            </button>
            <button type="button" className="fws-button tertiary" onClick={() => setView('list')}>一覧へ戻る</button>
          </div>
        </div>
        {Banner}

        {summaryLoading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>読み込み中...</p>
        ) : !summary ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>データがありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary.dates.map(date => {
              const responders = summary.byDate[date] || []
              return (
                <div key={date} style={{
                  border: '1px solid #f0f3f9', borderRadius: 12, padding: '0.75rem 1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{fmtDate(date)}</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button" className="fws-button secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => openConfirmPanel(date)}
                        disabled={responders.length === 0}
                      >確定</button>
                      <button
                        type="button" className="fws-button tertiary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => handleResendDate(date)}
                        disabled={resendingDate === date}
                      >{resendingDate === date ? '送信中...' : '再調査送信'}</button>
                    </div>
                  </div>

                  {responders.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>まだ回答がありません</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {responders.map(r => {
                        const meta = AVAILABILITY_META[r.availability] || AVAILABILITY_META.maybe
                        const shiftTypeLabel = r.availability !== 'unavailable' ? r.shiftType : null
                        return (
                          <span key={r.workerId} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            background: meta.bg, color: meta.color, fontWeight: 700,
                            fontSize: '0.8rem', borderRadius: 999, padding: '0.25rem 0.65rem',
                            border: r.confirmed ? `1.5px solid ${meta.color}` : '1px solid transparent',
                          }}>
                            {r.workerName}{meta.label}
                            {shiftTypeLabel && (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: 700, opacity: 0.85,
                                background: 'rgba(255,255,255,0.55)', borderRadius: 4,
                                padding: '0 0.3rem',
                              }}>{shiftTypeLabel}</span>
                            )}
                            {r.confirmed && <AppIcon name="Check" size={12} strokeWidth={3} />}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {confirmingDate === date && (
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.65rem 0.75rem', marginTop: '0.25rem' }}>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                        確定する作業員を選択してください
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.65rem' }}>
                        {responders.map(r => (
                          <label key={r.workerId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155' }}>
                            <input
                              type="checkbox"
                              checked={confirmSelection.has(r.workerId)}
                              onChange={() => toggleConfirmWorker(r.workerId)}
                            />
                            {r.workerName}
                            <span style={{ color: (AVAILABILITY_META[r.availability] || {}).color }}>
                              {(AVAILABILITY_META[r.availability] || {}).label}
                              {r.availability !== 'unavailable' && r.shiftType && ` ${r.shiftType}`}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="fws-button tertiary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={() => setConfirmingDate(null)}>キャンセル</button>
                        <button
                          type="button" className="fws-button"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', opacity: confirmSaving ? 0.6 : 1 }}
                          disabled={confirmSaving}
                          onClick={submitConfirm}
                        >{confirmSaving ? '確定中...' : 'この内容で確定'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── 一覧 ──
  return (
    <div className="fws-panel">
      <div className="fws-panel-header">
        <div>
          <h2>シフト管理</h2>
          <p>シフト調査を作成して作業員に一斉送信し、回答状況をカレンダーで確認します</p>
        </div>
        <button type="button" className="fws-button" onClick={() => setView('create')}>
          <AppIcon name="Plus" size={14} strokeWidth={2.5} /> シフト募集を作成
        </button>
      </div>
      {Banner}

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>読み込み中...</p>
      ) : shifts.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
          まだシフト調査がありません
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {shifts.map(shift => (
            <div
              key={shift.id}
              onClick={() => openCalendar(shift)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                border: '1px solid #f0f3f9', borderRadius: 12, padding: '0.85rem 1rem',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{shift.title}</p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {shift.period_start} 〜 {shift.period_end}
                  {shift.deadline && ` ・締切 ${shift.deadline}`}
                  {' '}・回答者 {shift.respondent_count ?? 0}名
                  {Array.isArray(shift.availability_options) && shift.availability_options.length > 0 &&
                    ` ・回答: ${shift.availability_options.map(v => AVAILABILITY_META[v]?.label || v).join('/')}`}
                  {Array.isArray(shift.shift_type_options) && shift.shift_type_options.length > 0 &&
                    ` ・区分: ${shift.shift_type_options.join('/')}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                <StatusBadge status={shift.status} />
                <button
                  type="button"
                  onClick={(e) => handleDelete(shift, e)}
                  disabled={deletingId === shift.id}
                  title="削除"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#cbd5e1', padding: '0.2rem', display: 'flex', alignItems: 'center',
                    opacity: deletingId === shift.id ? 0.5 : 1,
                  }}
                >
                  <AppIcon name="Trash2" size={16} strokeWidth={2} />
                </button>
                <AppIcon name="ChevronRight" size={16} strokeWidth={2} style={{ color: '#cbd5e1' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
