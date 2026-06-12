import { useState } from 'react'
import { acceptAdminInvite } from '@/api/admins'
import { AppIcon } from '@/utils/iconMap'

/** パスワード強度チェック */
function checkPassword(pw) {
  return {
    length: pw.length >= 8,
    lower:  /[a-z]/.test(pw),
    upper:  /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  }
}
function isPasswordValid(pw) {
  const r = checkPassword(pw)
  return r.length && r.lower && r.upper && r.number
}

function PasswordStrength({ password }) {
  if (!password) return null
  const r = checkPassword(password)
  const rules = [
    { key: 'length', label: '8文字以上' },
    { key: 'lower',  label: '小文字を含む' },
    { key: 'upper',  label: '大文字を含む' },
    { key: 'number', label: '数字を含む' },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.6rem', marginTop: '0.4rem' }}>
      {rules.map(({ key, label }) => (
        <span key={key} style={{
          fontSize: '0.72rem', fontWeight: 600,
          color: r[key] ? '#059669' : '#94a3b8',
          display: 'flex', alignItems: 'center', gap: '0.2rem',
        }}>
          {r[key] ? '✓' : '○'} {label}
        </span>
      ))}
    </div>
  )
}

/**
 * 管理者招待の承諾ページ
 * URL: /?admin_invite=xxxxxx
 */
export default function AdminInvitePage({ token }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('form') // 'form' | 'submitting' | 'success'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isPasswordValid(password)) {
      setError('パスワードは大文字・小文字・数字を含む8文字以上で設定してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    setStatus('submitting')
    try {
      const result = await acceptAdminInvite({ token, password })
      if (!result.success) {
        throw new Error(result.message || '招待リンクが無効または期限切れです')
      }
      setStatus('success')
    } catch (e) {
      setStatus('form')
      setError(e.message || 'エラーが発生しました。しばらく待ってから再試行してください。')
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #ebebf5', borderRadius: 10,
    padding: '0.7rem 0.9rem', fontSize: '1rem',
    background: '#fafafa', color: '#1e1b4b',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '2.5rem',
        boxShadow: '0 4px 32px rgba(30,27,75,0.1)', maxWidth: 420, width: '100%',
      }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 1.5rem', textAlign: 'center' }}>
          FIELDO
        </p>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <AppIcon name="CircleCheck" size={48} style={{ color: '#059669' }} />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.2rem', color: '#0f0e2e' }}>
              管理者アカウントを作成しました
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              メールアドレスと設定したパスワードでログインしてください。
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block', background: '#1e1b4b', color: '#fff',
                textDecoration: 'none', padding: '0.7rem 1.75rem', borderRadius: 10,
                fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              ログイン画面へ
            </a>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f0e2e', textAlign: 'center' }}>
              管理者として参加する
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem', textAlign: 'center' }}>
              ログイン用のパスワードを設定してください。
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                パスワード
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, marginTop: '0.35rem' }}
                />
                <PasswordStrength password={password} />
              </label>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                確認用パスワード
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ ...inputStyle, marginTop: '0.35rem' }}
                />
              </label>
              {error && (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  background: '#1e1b4b', color: '#fff', border: 'none',
                  padding: '0.8rem', borderRadius: 10, fontWeight: 700,
                  fontSize: '0.95rem', cursor: 'pointer',
                  opacity: status === 'submitting' ? 0.6 : 1,
                }}
              >
                {status === 'submitting' ? '作成中...' : 'パスワードを設定して参加する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
