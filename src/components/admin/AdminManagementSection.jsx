import { useState, useEffect, useCallback } from 'react'
import { getAdmins, inviteAdmin, cancelAdminInvitation, deactivateAdmin } from '@/api/admins'
import { AppIcon } from '@/utils/iconMap'

/**
 * 管理者の管理セクション（一覧・招待・無効化）
 * チーム管理タブの末尾に表示する
 */
export default function AdminManagementSection({ currentUserId }) {
  const [admins, setAdmins] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text }

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteState, setInviteState] = useState({ name: '', furigana: '', email: '' })
  const [inviting, setInviting] = useState(false)

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await getAdmins()
      if (res.success) {
        setAdmins(res.data || [])
        setInvitations(res.invitations || [])
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteState.name.trim()) {
      showMessage('error', '氏名を入力してください')
      return
    }
    if (!inviteState.email.trim()) {
      showMessage('error', 'メールアドレスを入力してください')
      return
    }
    setInviting(true)
    try {
      const res = await inviteAdmin({
        name: inviteState.name,
        furigana: inviteState.furigana,
        email: inviteState.email,
      })
      if (!res.success) throw new Error(res.message)
      showMessage('success', res.message || '招待メールを送信しました')
      setInviteState({ name: '', furigana: '', email: '' })
      setInviteOpen(false)
      fetchAdmins()
    } catch (err) {
      showMessage('error', err.message || '招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (id) => {
    if (!window.confirm('この招待を取り消しますか？')) return
    const res = await cancelAdminInvitation(id)
    if (res.success) {
      showMessage('success', '招待を取り消しました')
      fetchAdmins()
    } else {
      showMessage('error', res.message || '取り消しに失敗しました')
    }
  }

  const handleDeactivate = async (admin) => {
    if (!window.confirm(`${admin.name} さんの管理者アカウントを無効化しますか？\nこの操作をするとログインできなくなります。`)) return
    const res = await deactivateAdmin(admin.id)
    if (res.success) {
      showMessage('success', res.message)
      fetchAdmins()
    } else {
      showMessage('error', res.message || '無効化に失敗しました')
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #ebebf5', borderRadius: 10,
    padding: '0.6rem 0.8rem', fontSize: '0.9rem',
    background: '#fafafa', color: '#1e1b4b',
  }

  if (loading) return null

  return (
    <div className="fws-panel" style={{ marginTop: '1rem' }}>
      <header className="fws-panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AppIcon name="ShieldCheck" size={16} style={{ color: '#4f46e5' }} />
          管理者の管理
        </h3>
        <button
          type="button"
          className="fws-button"
          style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
          onClick={() => setInviteOpen(v => !v)}
        >
          {inviteOpen ? '閉じる' : '管理者を招待'}
        </button>
      </header>

      {message && (
        <p style={{
          margin: '0 0 0.75rem', fontSize: '0.84rem', whiteSpace: 'pre-wrap',
          color: message.type === 'success' ? '#059669' : '#dc2626',
        }}>
          {message.text}
        </p>
      )}

      {inviteOpen && (
        <form
          onSubmit={handleInvite}
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
            background: '#f8fafc', border: '1.5px solid #ebebf5', borderRadius: 12,
            padding: '1rem', marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            招待メールが届き、本人がパスワードを設定すると管理者として参加できます（リンクは72時間有効）。
          </p>
          <input
            placeholder="氏名（例：山田一郎）"
            value={inviteState.name}
            onChange={e => setInviteState(prev => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="ふりがな（例：やまだいちろう）"
            value={inviteState.furigana}
            onChange={e => setInviteState(prev => ({ ...prev, furigana: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="メールアドレス（例：yamada@example.com）"
            value={inviteState.email}
            onChange={e => setInviteState(prev => ({ ...prev, email: e.target.value }))}
            style={inputStyle}
          />
          <button
            type="submit"
            className="fws-button"
            disabled={inviting}
            style={{ padding: '0.6rem', fontSize: '0.88rem' }}
          >
            {inviting ? '送信中...' : '招待メールを送信'}
          </button>
        </form>
      )}

      {/* 管理者一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {admins.map(admin => (
          <div
            key={admin.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1.5px solid #ebebf5', borderRadius: 12, padding: '0.7rem 0.9rem',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f0e2e' }}>
                {admin.name}
                {admin.id === currentUserId && (
                  <span style={{
                    marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 600,
                    background: '#eef2ff', color: '#4f46e5',
                    borderRadius: 999, padding: '0.15rem 0.55rem',
                  }}>
                    自分
                  </span>
                )}
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin.employee_id}{admin.email ? ` ・ ${admin.email}` : ''}
              </p>
            </div>
            {admin.id !== currentUserId && admins.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeactivate(admin)}
                style={{
                  border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626',
                  borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.78rem',
                  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}
              >
                無効化
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 未承諾の招待 */}
      {invitations.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
            招待中（未承諾）
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invitations.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: '1.5px dashed #cbd5e1', borderRadius: 12, padding: '0.7rem 0.9rem',
                  background: '#f8fafc',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#475569' }}>
                    {invite.name}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {invite.email} ・ 期限 {new Date(invite.expires_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCancelInvitation(invite.id)}
                  style={{
                    border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b',
                    borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.78rem',
                    fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  取り消す
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
