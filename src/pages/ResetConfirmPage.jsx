import { useState, useEffect } from 'react'
import { resetConfirm } from '@/api/auth'
import { AppIcon } from '@/utils/iconMap'

/**
 * パスワードリセット確認ページ
 * URL: /?reset_token=xxxxxx
 */
export default function ResetConfirmPage({ token }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    resetConfirm({ token })
      .then(res => {
        setStatus('success')
        setMessage(res.message || 'パスワードを更新しました。新しいパスワードでログインしてください。')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.message || 'リンクが無効または期限切れです。再度パスワードリセットを申請してください。')
      })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '2.5rem',
        boxShadow: '0 4px 32px rgba(30,27,75,0.1)', maxWidth: 420, width: '100%',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          FIELDO
        </p>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              <AppIcon name="RefreshCw" size={40} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: '#64748b' }}>確認中...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <AppIcon name="CircleCheck" size={48} style={{ color: '#059669' }} />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.2rem', color: '#0f0e2e' }}>
              パスワードを更新しました
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              新しいパスワードでログインしてください。
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
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <AppIcon name="CircleX" size={48} style={{ color: '#dc2626' }} />
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.2rem', color: '#0f0e2e' }}>
              リンクが無効です
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block', background: '#f1f5f9', color: '#1e1b4b',
                textDecoration: 'none', padding: '0.7rem 1.75rem', borderRadius: 10,
                fontWeight: 700, fontSize: '0.9rem', border: '1.5px solid #ebebf5',
              }}
            >
              ログイン画面へ戻る
            </a>
          </>
        )}
      </div>
    </div>
  )
}
