import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { AppIcon } from '@/utils/iconMap'

/**
 * ログイン後にPush通知の有効化を促すバナー（作業員・管理者共通）。
 * 非対応端末・既に許可/拒否済みの場合は表示しない。
 */
export default function PushNotificationSetup() {
  const { supported, permission, alreadySubscribed, subscribing, enablePush } = usePushNotifications()
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 拒否済み(denied)は再度促しても意味がないため対象外。
    // alreadySubscribed の確認が終わる(nullでなくなる)まで待ってから判定する
    if (supported && permission !== 'denied' && alreadySubscribed === false) setShow(true)
  }, [supported, permission, alreadySubscribed])

  const handleEnable = async () => {
    setError('')
    const res = await enablePush()
    if (res.success) {
      setDone(true)
      setTimeout(() => setShow(false), 3000)
    } else {
      setError(res.message || '設定に失敗しました')
    }
  }

  if (!show) return null

  return (
    <div style={{
      background: '#eef2ff', border: '1px solid #c7c7f0', borderRadius: 14,
      padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      margin: '0 0 0.75rem',
    }}>
      <AppIcon name="Bell" size={22} strokeWidth={1.8} style={{ color: '#4f46e5', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        {done ? (
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#059669' }}>
            プッシュ通知を有効にしました。
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.88rem', color: '#1e1b4b' }}>
              プッシュ通知を有効にしませんか？
            </p>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#64748b' }}>
              アプリを開いていなくても、新しい案件やメッセージをすぐに受け取れます。
            </p>
            {error && <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#dc2626' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleEnable}
                disabled={subscribing}
                className="fws-button"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              >
                {subscribing ? '設定中...' : '今すぐ有効にする'}
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
