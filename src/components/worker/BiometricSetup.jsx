import { useState, useEffect } from 'react'
import { browserSupportsWebAuthn, registerBiometric, getBiometricStatus } from '@/api/webauthn'
import { AppIcon } from '@/utils/iconMap'

/**
 * ログイン後に生体認証の登録を促すバナー
 * すでに登録済み or 非対応端末は非表示
 */
export default function BiometricSetup() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!browserSupportsWebAuthn()) return
    // 既に登録済みかチェック
    getBiometricStatus()
      .then(res => { if (res.success && !res.registered) setShow(true) })
      .catch(() => {})
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    try {
      await registerBiometric()
      setDone(true)
      setTimeout(() => setShow(false), 3000)
    } catch (e) {
      setError(e.message || '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div style={{
      background: '#eef2ff', border: '1px solid #c7c7f0', borderRadius: 14,
      padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      margin: '0 0 0.75rem',
    }}>
      <AppIcon name="Fingerprint" size={22} strokeWidth={1.8} style={{ color: '#4f46e5', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        {done ? (
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#059669' }}>
            生体認証を登録しました。次回から使えます。
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.88rem', color: '#1e1b4b' }}>
              Face ID / 指紋認証を設定しませんか？
            </p>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#64748b' }}>
              次回からパスワード不要で素早くログインできます。
            </p>
            {error && <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#dc2626' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSetup}
                disabled={loading}
                className="fws-button"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              >
                {loading ? '設定中...' : '今すぐ設定する'}
              </button>
              <button
                type="button"
                onClick={() => setShow(false)}
                style={{ fontSize: '0.82rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem 0.5rem' }}
              >
                後で
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
