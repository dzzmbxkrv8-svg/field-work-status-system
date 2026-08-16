import { useState, useEffect, useMemo } from 'react'
import { getShift, respondToShift } from '@/api/shifts'
import { AppIcon } from '@/utils/iconMap'

const OPTIONS = [
    { value: 'available', label: '○', color: '#059669', bg: '#d1fae5' },
    { value: 'maybe', label: '△', color: '#b45309', bg: '#fef3c7' },
    { value: 'unavailable', label: '×', color: '#dc2626', bg: '#fee2e2' },
]

const OPTION_MAP = OPTIONS.reduce((map, o) => { map[o.value] = o; return map }, {})

function dateRange(start, end) {
    if (!start || !end) return []
    const dates = []
    const cur = new Date(start)
    const last = new Date(end)
    while (cur <= last) {
        dates.push(cur.toISOString().slice(0, 10))
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

function fmtDate(d) {
    const date = new Date(d)
    const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
    return `${date.getMonth() + 1}/${date.getDate()}(${w})`
}

function fmtDateShort(d) {
    const date = new Date(d)
    return `${date.getMonth() + 1}/${date.getDate()}`
}

// shiftRequestId: 対象の募集ID
// shiftTypeOptions: 管理者が定義した勤務区分（例: ["フル","ハーフ"]）。
//   会社によっては概念自体が無いため、未定義(null/空配列)なら ○/△/× のみで区分選択は表示しない
// availabilityOptions: 管理者が選んだ回答選択肢（例: ["available","unavailable"]）。
//   未定義(null/空配列)なら従来通り○/△/×すべてを使う
export default function ShiftRequestCard({ shiftRequestId, title, periodStart, periodEnd, deadline, shiftTypeOptions, availabilityOptions, showToast }) {
    const [expanded, setExpanded] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loaded, setLoaded] = useState(false)
    // answers: { [date]: { availability: string, shiftType?: string } }
    const [answers, setAnswers] = useState({})
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const dates = useMemo(() => dateRange(periodStart, periodEnd), [periodStart, periodEnd])
    const hasShiftTypes = Array.isArray(shiftTypeOptions) && shiftTypeOptions.length > 0
    const visibleOptions = useMemo(() => {
        const enabled = Array.isArray(availabilityOptions) && availabilityOptions.length > 0
            ? availabilityOptions
            : OPTIONS.map(o => o.value)
        return OPTIONS.filter(o => enabled.includes(o.value))
    }, [availabilityOptions])

    // 自分の回答済み内容は、カードを開く前でも一目で確認できるよう初回表示時に取得しておく
    useEffect(() => {
        if (loaded) return
        setLoading(true)
        getShift(shiftRequestId).then(res => {
            if (res.success && res.data) {
                const map = {}
                ;(res.data.myResponses || []).forEach(r => {
                    map[r.date] = {
                        availability: r.availability,
                        shiftType: r.shift_type || undefined,
                    }
                })
                setAnswers(map)
                if ((res.data.myResponses || []).length > 0) setSubmitted(true)
            }
            setLoaded(true)
        }).finally(() => setLoading(false))
    }, [loaded, shiftRequestId])

    const handleSelect = (date, value) => {
        setAnswers(prev => ({
            ...prev,
            [date]: {
                availability: value,
                // × の場合は勤務区分は意味を持たないのでクリア
                shiftType: value === 'unavailable' ? undefined : prev[date]?.shiftType,
            },
        }))
    }

    const handleShiftType = (date, type) => {
        setAnswers(prev => ({
            ...prev,
            [date]: { ...prev[date], shiftType: type },
        }))
    }

    const allAnswered = dates.length > 0 && dates.every(d => {
        const a = answers[d]
        if (!a?.availability) return false
        if (hasShiftTypes && a.availability !== 'unavailable' && !a.shiftType) return false
        return true
    })

    const handleSubmit = async () => {
        setSubmitting(true)
        const responses = dates
            .filter(d => answers[d]?.availability)
            .map(d => {
                const a = answers[d]
                const payload = { date: d, availability: a.availability }
                if (hasShiftTypes && a.availability !== 'unavailable' && a.shiftType) {
                    payload.shift_type = a.shiftType
                }
                return payload
            })
        const res = await respondToShift(shiftRequestId, responses)
        setSubmitting(false)
        if (res.success) {
            setSubmitted(true)
            setExpanded(false)
            showToast?.('success', 'シフトの回答を送信しました')
        } else {
            showToast?.('error', res.message || '送信に失敗しました')
        }
    }

    return (
        <div style={{
            background: '#fff', border: '1px solid #e0e0f5', borderRadius: 14,
            padding: '0.85rem 1rem', width: '100%', maxWidth: 300,
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <AppIcon name="CalendarDays" size={16} strokeWidth={2} style={{ color: '#4f46e5', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#4f46e5' }}>シフト調査</span>
                {submitted && (
                    <span style={{
                        marginLeft: 'auto', fontSize: '0.66rem', fontWeight: 700,
                        color: '#059669', background: '#d1fae5', borderRadius: 999, padding: '0.15rem 0.55rem',
                        flexShrink: 0,
                    }}>回答済み</span>
                )}
            </div>
            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{title}</p>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.74rem', color: '#64748b' }}>
                期間: {periodStart} 〜 {periodEnd}
                {deadline && <><br />締切: {deadline}</>}
            </p>

            {/* 回答済みの内容は開かなくても一覧で確認できる */}
            {!expanded && submitted && !loading && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.3rem',
                    marginBottom: '0.65rem', padding: '0.55rem 0.6rem',
                    background: '#f8fafc', borderRadius: 10,
                }}>
                    {dates.map(d => {
                        const ans = answers[d]
                        const opt = ans?.availability ? OPTION_MAP[ans.availability] : null
                        return (
                            <span key={d} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
                                fontSize: '0.7rem', fontWeight: 700, borderRadius: 6,
                                padding: '0.15rem 0.4rem',
                                color: opt ? opt.color : '#cbd5e1',
                                background: opt ? opt.bg : '#f1f5f9',
                            }}>
                                {fmtDateShort(d)}{opt ? opt.label : '-'}
                                {hasShiftTypes && ans?.shiftType && (
                                    <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>{ans.shiftType}</span>
                                )}
                            </span>
                        )
                    })}
                </div>
            )}

            {!expanded ? (
                <button
                    type="button"
                    className="fws-button secondary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem' }}
                    onClick={() => setExpanded(true)}
                    disabled={loading}
                >
                    {loading ? '読み込み中...' : submitted ? '回答を編集する' : '回答する'}
                </button>
            ) : (
                <>
                    {loading ? (
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>読み込み中...</p>
                    ) : (
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            maxHeight: 320, overflowY: 'auto', marginBottom: '0.65rem',
                            paddingRight: '0.15rem',
                        }}>
                            {dates.map(d => {
                                const ans = answers[d]
                                const needsType = hasShiftTypes && ans?.availability && ans.availability !== 'unavailable'
                                return (
                                    <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {/* 日付行 + ○△× ボタン */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#334155', minWidth: 56 }}>{fmtDate(d)}</span>
                                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                {visibleOptions.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => handleSelect(d, opt.value)}
                                                        style={{
                                                            width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                                                            border: ans?.availability === opt.value ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                                                            background: ans?.availability === opt.value ? opt.bg : '#fff',
                                                            color: opt.color, fontWeight: 700, fontSize: '0.92rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            padding: 0, flexShrink: 0,
                                                        }}
                                                    >{opt.label}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 管理者がこの募集で勤務区分を定義している場合のみ表示 */}
                                        {needsType && (
                                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                {shiftTypeOptions.map(type => {
                                                    const selected = ans?.shiftType === type
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => handleShiftType(d, type)}
                                                            style={{
                                                                padding: '0.18rem 0.6rem',
                                                                borderRadius: 6,
                                                                border: selected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                                                background: selected ? '#eef2ff' : '#fff',
                                                                color: selected ? '#4f46e5' : '#94a3b8',
                                                                fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                                                            }}
                                                        >{type}</button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                            type="button" className="fws-button tertiary"
                            style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem' }}
                            onClick={() => setExpanded(false)}
                        >閉じる</button>
                        <button
                            type="button" className="fws-button"
                            disabled={!allAnswered || submitting}
                            style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem', opacity: (!allAnswered || submitting) ? 0.5 : 1 }}
                            onClick={handleSubmit}
                        >{submitting ? '送信中...' : '回答を送信'}</button>
                    </div>
                </>
            )}
        </div>
    )
}
