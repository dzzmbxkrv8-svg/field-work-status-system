import { useState, useEffect, useCallback } from 'react'
import { getTeams, createTeam, updateTeam, deleteTeam, updateWorkerTeam } from '@/api/teams'
import { getWorkers } from '@/api/workers'

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

function WorkerRow({ worker, teams, onTeamChange }) {
  const [changing, setChanging] = useState(false)

  const handleChange = async (e) => {
    const newTeamId = e.target.value ? parseInt(e.target.value, 10) : null
    setChanging(true)
    await onTeamChange(worker.id, newTeamId)
    setChanging(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0.75rem',
      background: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#e2e8f0', color: '#475569',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
      }}>
        {worker.name[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {worker.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{worker.employee_id}</p>
      </div>
      <select
        value={worker.team_id || ''}
        onChange={handleChange}
        disabled={changing}
        style={{
          padding: '0.35rem 0.5rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontSize: '0.82rem',
          color: '#374151',
          background: '#fff',
          cursor: changing ? 'not-allowed' : 'pointer',
          minWidth: 110,
        }}
      >
        <option value="">未所属</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}

export default function TeamManagementPanel() {
  const [teams, setTeams] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [creatingNew, setCreatingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const [workerSectionOpen, setWorkerSectionOpen] = useState(false)

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const [teamsRes, workersRes] = await Promise.all([getTeams(), getWorkers()])
      if (teamsRes.success) setTeams(teamsRes.data || [])
      if (workersRes.success) setWorkers(workersRes.data || [])
      setError(null)
    } catch {
      if (isInitial) setError('データを取得できませんでした')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

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

  const handleWorkerTeamChange = async (workerId, teamId) => {
    await updateWorkerTeam(workerId, teamId)
    await fetchAll()
  }

  if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  return (
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
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: '#1e40af', fontSize: '0.9rem' }}>新しいチーム</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teams.map(team => (
            <div key={team.id} className="fws-card" style={{ padding: '1rem 1.25rem' }}>
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

      {/* 作業員のチーム所属管理 */}
      <div style={{ marginTop: '2rem' }}>
        <button
          type="button"
          onClick={() => setWorkerSectionOpen(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.5rem 0', borderTop: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
            作業員のチーム所属
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{workerSectionOpen ? '▲ 閉じる' : '▼ 開く'}</span>
        </button>

        {workerSectionOpen && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {workers.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>
                作業員が登録されていません
              </p>
            ) : workers.map(worker => (
              <WorkerRow
                key={worker.id}
                worker={worker}
                teams={teams}
                onTeamChange={handleWorkerTeamChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
