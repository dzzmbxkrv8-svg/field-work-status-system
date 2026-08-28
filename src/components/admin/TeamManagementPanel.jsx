import { useState, useEffect, useCallback } from 'react'
import { getTeams, createTeam, updateTeam, deleteTeam } from '@/api/teams'
import { getPendingWorkers, approveWorker } from '@/api/workers'
import { getAccessCode } from '@/api/settings'
import { AppIcon } from '@/utils/iconMap'
import { useAppContext } from '@/contexts/AppContext'
import AdminManagementSection from './AdminManagementSection'
import WorkerManagementSection from './WorkerManagementSection'
import AuditLogSection from './AuditLogSection'

function TeamForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('チーム名は必須です')
      return
    }
    setError(null)
    await onSave({ name: name.trim(), description: description.trim() })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {error && (
        <p style={{ color: '#991b1b', background: '#fee2e2', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.85rem', margin: 0 }}>
          {error}
        </p>
      )}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.88rem', color: '#374151' }}>
        チーム名 <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>必須</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：荷上げ班、建て方班"
          autoFocus
          style={{ padding: '0.55rem 0.75rem', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.88rem', color: '#374151' }}>
        説明・職種
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="例：荷上げ、建て方、大工、警備員"
          style={{ padding: '0.55rem 0.75rem', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
        />
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="fws-button tertiary"
          style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={saving}
          className="fws-button primary"
          style={{ fontSize: '0.88rem', padding: '0.45rem 1.25rem' }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}


export default function TeamManagementPanel() {
  const { state } = useAppContext()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [creatingNew, setCreatingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savingId, setSavingId] = useState(null)

  // 会社アクセスコード
  const [accessCodeText, setAccessCodeText] = useState('')
  const [accessCodeCopied, setAccessCodeCopied] = useState(false)

  useEffect(() => {
    getAccessCode().then(res => setAccessCodeText(res.value ?? '')).catch(() => {})
  }, [])

  const handleAccessCodeCopy = async () => {
    if (!accessCodeText) return
    try {
      await navigator.clipboard.writeText(accessCodeText)
      setAccessCodeCopied(true)
      setTimeout(() => setAccessCodeCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  // 承認待ち作業員
  const [pendingWorkers, setPendingWorkers] = useState([])
  const [approvingId, setApprovingId] = useState(null)

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const [teamsRes, pendingRes] = await Promise.all([
        getTeams(), getPendingWorkers()
      ])
      if (teamsRes.success) setTeams(teamsRes.data || [])
      if (pendingRes.success) setPendingWorkers(pendingRes.data || [])
      setError(null)
    } catch {
      if (isInitial) setError('データを取得できませんでした')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  const handleApprove = async (id) => {
    setApprovingId(id)
    try {
      await approveWorker(id)
      await fetchAll()
    } finally {
      setApprovingId(null)
    }
  }

  useEffect(() => { fetchAll(true) }, [fetchAll])

  const handleCreate = async (data) => {
    setSavingId('new')
    const res = await createTeam(data)
    if (res.success) {
      setCreatingNew(false)
      await fetchAll()
    }
    setSavingId(null)
  }

  const handleUpdate = async (id, data) => {
    setSavingId(id)
    const res = await updateTeam(id, data)
    if (res.success) {
      setEditingId(null)
      await fetchAll()
    }
    setSavingId(null)
  }

  const handleDelete = async (team) => {
    if (!window.confirm(`「${team.name}」を削除してもよいですか？\n所属する作業員のチームは未設定になります。`)) return
    const res = await deleteTeam(team.id)
    if (res.success) await fetchAll()
  }

  if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  return (
    <>
    {/* ── 会社アクセスコード ── */}
    <section className="fws-panel" style={{ marginBottom: '1rem' }}>
      <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AppIcon name="Bookmark" size={16} style={{ color: '#4f46e5' }} />
          会社アクセスコード
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>新規作業員登録に使用するコード</span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            flex: 1, boxSizing: 'border-box',
            border: '1.5px solid #ebebf5', borderRadius: '10px',
            padding: '0.7rem 0.9rem', fontSize: '1rem',
            fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em',
            background: '#fafafa', color: '#1e1b4b',
          }}>
            {accessCodeText || '―'}
          </span>
          <button
            type="button"
            className="fws-button"
            onClick={handleAccessCodeCopy}
            disabled={!accessCodeText}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', flexShrink: 0 }}
          >
            {accessCodeCopied ? 'コピーしました' : 'コピー'}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
          このコードはFieldo運営が会社ごとに発行する固有のコードです。
          作業員がアカウント作成時にこのコードを入力すると、貴社にチーム未所属で登録されます。
        </p>
      </div>
    </section>

    {/* ── 承認待ち作業員パネル ── */}
    {pendingWorkers.length > 0 && (
      <div className="fws-panel" style={{ marginBottom: '1rem', border: '1.5px solid #fde68a', background: '#fffbeb' }}>
        <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AppIcon name="Bell" size={16} style={{ color: '#d97706' }} />
            承認待ちの作業員
          </h3>
          <span style={{
            background: '#f97316', color: '#fff',
            fontSize: '0.72rem', fontWeight: 700,
            padding: '0.2rem 0.55rem', borderRadius: 99,
          }}>
            {pendingWorkers.length}件
          </span>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {pendingWorkers.map(w => (
            <div key={w.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: '#fff', borderRadius: 10, padding: '0.75rem 1rem',
              border: '1px solid #fde68a',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>{w.name}</span>
                  {w.furigana && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>（{w.furigana}）</span>}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{w.employee_id}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                  {w.phone && <span><AppIcon name="User" size={11} strokeWidth={2} style={{ verticalAlign: 'middle' }} /> {w.phone}</span>}
                  {w.email && <span>{w.email}</span>}
                  {w.address && <span><AppIcon name="MapPin" size={11} strokeWidth={2} style={{ verticalAlign: 'middle' }} /> {w.address}</span>}
                  <span style={{ color: '#94a3b8' }}>{new Date(w.created_at).toLocaleDateString('ja-JP')} 登録</span>
                </div>
              </div>
              <button
                type="button"
                className="fws-button"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', flexShrink: 0 }}
                disabled={approvingId === w.id}
                onClick={() => handleApprove(w.id)}
              >
                {approvingId === w.id ? '処理中...' : '承認する'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="fws-panel">
      <div className="fws-panel-header">
        <div>
          <h2>チーム管理</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
            職種・チームの作成・編集・削除ができます
          </p>
        </div>
        <button
          type="button"
          className="fws-button primary"
          onClick={() => { setCreatingNew(true); setEditingId(null) }}
          disabled={creatingNew}
        >
          + チームを追加
        </button>
      </div>

      {creatingNew && (
        <div style={{
          background: '#eef2ff',
          border: '1px solid #c7c7f0',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: '#1e1b4b', fontSize: '0.9rem' }}>新しいチーム</p>
          <TeamForm
            onSave={handleCreate}
            onCancel={() => setCreatingNew(false)}
            saving={savingId === 'new'}
          />
        </div>
      )}

      {teams.length === 0 ? (
        <p className="fws-empty-state" style={{ textAlign: 'center', margin: '2rem 0' }}>
          チームがありません。「+ チームを追加」から作成してください。
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '360px', overflowY: 'auto' }}>
          {teams.map(team => (
            <div key={team.id} className="fws-card" style={{ padding: '0.55rem 1rem', minHeight: 'auto' }}>
              {editingId === team.id ? (
                <TeamForm
                  initial={team}
                  onSave={(data) => handleUpdate(team.id, data)}
                  onCancel={() => setEditingId(null)}
                  saving={savingId === team.id}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem' }}>{team.name}</h4>
                      <span style={{
                        background: '#f1f5f9', color: '#64748b',
                        fontSize: '0.72rem', padding: '0.15rem 0.5rem',
                        borderRadius: 99, fontWeight: 500,
                      }}>
                        {team.worker_count}名
                      </span>
                    </div>
                    {team.description && (
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="fws-button tertiary"
                      style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}
                      onClick={() => { setEditingId(team.id); setCreatingNew(false) }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="fws-button tertiary"
                      style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', color: '#ef4444' }}
                      onClick={() => handleDelete(team)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>

    {/* ── 作業員の管理 ── */}
    <WorkerManagementSection />

    {/* ── 管理者の管理 ── */}
    <AdminManagementSection currentUserId={state.session?.id} />

    {/* ── 操作履歴（監査ログ） ── */}
    <AuditLogSection />
    </>
  )
}
