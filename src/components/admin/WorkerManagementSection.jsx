import { useState, useEffect, useCallback } from 'react'
import { getWorkers, updateWorker, deleteWorker } from '@/api/workers'
import { getTeams } from '@/api/teams'
import { AppIcon } from '@/utils/iconMap'

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2']
const avatarColor = (id) => AVATAR_COLORS[(Number(id) || 0) % AVATAR_COLORS.length]

function Avatar({ name, id, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarColor(id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {name?.[0] ?? '?'}
    </div>
  )
}

function EditForm({ worker, teams, onSave, onCancel, saving }) {
  const [name, setName] = useState(worker.name || '')
  const [furigana, setFurigana] = useState(worker.furigana || '')
  const [phone, setPhone] = useState(worker.phone || '')
  const [email, setEmail] = useState(worker.email || '')
  const [teamId, setTeamId] = useState(worker.team_id ? String(worker.team_id) : '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const fieldStyle = {
    padding: '0.5rem 0.7rem', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: '0.88rem',
    width: '100%', boxSizing: 'border-box', background: '#fafafa',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('氏名は必須です'); return }
    setError(null)
    await onSave({
      name: name.trim(),
      furigana: furigana.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      team_id: teamId ? parseInt(teamId, 10) : null,
      ...(password ? { password } : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
      {error && (
        <p style={{ margin: 0, color: '#dc2626', fontSize: '0.82rem', background: '#fee2e2', padding: '0.4rem 0.7rem', borderRadius: 6 }}>
          {error}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          氏名 <span style={{ color: '#ef4444', fontSize: '0.7rem', display: 'inline' }}>必須</span>
          <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          ふりがな
          <input value={furigana} onChange={e => setFurigana(e.target.value)} placeholder="やまだ たろう" style={fieldStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          電話番号
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-0000-0000" style={fieldStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          メールアドレス
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yamada@example.com" style={fieldStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          チーム
          <select value={teamId} onChange={e => setTeamId(e.target.value)} style={fieldStyle}>
            <option value="">未所属</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#374151' }}>
          パスワード変更（任意）
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="変更する場合のみ入力" style={fieldStyle} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          キャンセル
        </button>
        <button type="submit" disabled={saving}
          style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}

export default function WorkerManagementSection() {
  const [workers, setWorkers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState(null)

  const fetchAll = useCallback(async () => {
    const [wRes, tRes] = await Promise.all([getWorkers(), getTeams()])
    if (wRes.success) setWorkers(wRes.data || [])
    if (tRes.success) setTeams(tRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSave = async (worker, data) => {
    setSavingId(worker.id)
    const res = await updateWorker(worker.id, data)
    if (res.success) {
      showMessage('success', `${worker.name} さんの情報を更新しました`)
      setEditingId(null)
      await fetchAll()
    } else {
      showMessage('error', res.message || '更新に失敗しました')
    }
    setSavingId(null)
  }

  const handleDeactivate = async (worker) => {
    if (!window.confirm(`${worker.name} さんのアカウントを無効化しますか？\nログインできなくなります。`)) return
    const res = await deleteWorker(worker.id)
    if (res.success) {
      showMessage('success', `${worker.name} さんを無効化しました`)
      await fetchAll()
    } else {
      showMessage('error', res.message || '無効化に失敗しました')
    }
  }

  if (loading) return null

  return (
    <div className="fws-panel" style={{ marginTop: '1rem' }}>
      <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AppIcon name="Users" size={16} style={{ color: '#4f46e5' }} />
          作業員の管理
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{workers.length}名</span>
      </header>

      {message && (
        <p style={{
          margin: '0 0 0.75rem', fontSize: '0.84rem',
          color: message.type === 'success' ? '#059669' : '#dc2626',
        }}>
          {message.text}
        </p>
      )}

      {workers.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          登録済みの作業員はいません
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {workers.map(worker => {
            const teamName = worker.team_name || '未所属'
            const isEditing = editingId === worker.id
            return (
              <div
                key={worker.id}
                style={{
                  border: isEditing ? '1.5px solid #a5b4fc' : '1.5px solid #ebebf5',
                  borderRadius: 12,
                  padding: '0.75rem 0.9rem',
                  background: isEditing ? '#f5f5ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar name={worker.name} id={worker.id} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: '#0f0e2e' }}>
                      {worker.name}
                      {worker.furigana && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                          {worker.furigana}
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {worker.employee_id} ・ {teamName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : worker.id)}
                      style={{
                        border: '1.5px solid #e2e8f0', background: isEditing ? '#eef2ff' : '#fff',
                        color: isEditing ? '#4f46e5' : '#374151',
                        borderRadius: 8, padding: '0.3rem 0.7rem',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {isEditing ? '閉じる' : '編集'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(worker)}
                      style={{
                        border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626',
                        borderRadius: 8, padding: '0.3rem 0.7rem',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      無効化
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <EditForm
                    worker={worker}
                    teams={teams}
                    onSave={(data) => handleSave(worker, data)}
                    onCancel={() => setEditingId(null)}
                    saving={savingId === worker.id}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
