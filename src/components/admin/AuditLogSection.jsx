import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiClient } from '@/api/client'
import { AppIcon } from '@/utils/iconMap'

const ACTION_LABELS = {
  'worker.create': '作業員を追加',
  'worker.update': '作業員情報を更新',
  'worker.deactivate': '作業員を無効化',
  'worker.approve': '作業員を承認',
  'team.create': 'チームを作成',
  'team.update': 'チームを更新',
  'team.delete': 'チームを削除',
  'admin.invite': '管理者を招待',
  'admin.deactivate': '管理者を無効化',
  'announcement.update': 'お知らせを更新',
  'assignment.create': '案件を作成',
  'assignment.update': '案件を更新',
  'assignment.status_change': '案件のステータスを変更',
  'assignment.assign_worker': '案件の担当者を変更',
  'assignment.set_members': '案件のメンバーを設定',
  'shift.create': 'シフト調査を作成',
  'shift.delete': 'シフト調査を削除',
}

function summarizeDetails(log) {
  const d = log.details || {}
  switch (log.action) {
    case 'worker.create':
    case 'worker.update':
    case 'worker.approve':
      return d.name || ''
    case 'team.create':
    case 'team.update':
    case 'team.delete':
      return d.name || ''
    case 'admin.invite':
      return `${d.name || ''}（${d.email || ''}）`
    case 'admin.deactivate':
      return d.name || ''
    case 'announcement.update':
      return d.value ? `「${String(d.value).slice(0, 30)}」` : '（空欄に変更）'
    case 'assignment.create':
    case 'assignment.update':
      return d.title || ''
    case 'assignment.status_change':
      return `${d.title || ''} → ${d.status || ''}`
    case 'assignment.assign_worker':
      return d.title || ''
    case 'assignment.set_members':
      return `メンバー${d.member_ids?.length ?? 0}名`
    case 'shift.create':
    case 'shift.delete':
      return d.title || ''
    default:
      return ''
  }
}

export default function AuditLogSection() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(10)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await apiClient('/api/audit-logs?limit=200', { method: 'GET' })
    if (res.success) {
      setLogs(res.data || [])
    } else {
      setError(res.message || '操作履歴の取得に失敗しました')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open && logs.length === 0 && !loading) fetchLogs()
  }, [open, logs.length, loading, fetchLogs])

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(log => {
      const label = ACTION_LABELS[log.action] || log.action
      const summary = summarizeDetails(log)
      return [log.actor_name, label, summary].filter(Boolean)
        .some(field => String(field).toLowerCase().includes(q))
    })
  }, [logs, search])

  useEffect(() => { setVisibleCount(10) }, [search])

  const visibleLogs = filteredLogs.slice(0, visibleCount)

  return (
    <div className="fws-panel" style={{ marginTop: '1rem', padding: '0' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 1.25rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
          <AppIcon name="ClipboardList" size={16} style={{ color: '#4f46e5' }} />
          操作履歴
        </span>
        <AppIcon name={open ? 'ChevronLeft' : 'ChevronRight'} size={16} style={{ color: '#94a3b8', transform: open ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', marginTop: '0.85rem' }}>
            <AppIcon name="Search" size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="操作者・種類・内容で検索"
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: '0.82rem', boxSizing: 'border-box',
              }}
            />
          </div>

          {loading && <p style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>読み込み中...</p>}
          {error && <p style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}

          {!loading && !error && filteredLogs.length === 0 && (
            <p style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center' }}>
              {search ? `「${search}」に一致する履歴はありません` : '操作履歴はまだありません'}
            </p>
          )}

          {!loading && !error && visibleLogs.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {visibleLogs.map(log => (
                <div key={log.id} style={{ border: '1px solid #ebebf5', borderRadius: 10, padding: '0.6rem 0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 700, color: '#1e1b4b' }}>{ACTION_LABELS[log.action] || log.action}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', flexShrink: 0 }}>
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#475569' }}>
                    {summarizeDetails(log)}
                  </p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                    実行者: {log.actor_name || '不明'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {filteredLogs.length > visibleLogs.length && (
            <button
              type="button"
              className="fws-button tertiary"
              onClick={() => setVisibleCount(c => c + 10)}
              style={{ alignSelf: 'center', fontSize: '0.8rem', display: 'block', margin: '0.85rem auto 0' }}
            >
              もっと見る（残り{filteredLogs.length - visibleLogs.length}件）
            </button>
          )}
        </div>
      )}
    </div>
  )
}
