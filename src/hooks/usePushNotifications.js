import { useCallback, useEffect, useState } from 'react'
import { getVapidPublicKey, subscribePush } from '@/api/push'

// VAPID公開鍵(base64url)をpushManager.subscribeが要求するUint8Arrayに変換する
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// Web Push通知の許可状況・購読処理をまとめたフック。
// 対応ブラウザでのみ動作し、未対応環境（一部iOS等）では何もしない。
export function usePushNotifications() {
  const [supported] = useState(() =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  )
  const [permission, setPermission] = useState(() =>
    supported ? Notification.permission : 'unsupported'
  )
  // 通知許可(permission)がgrantedでも、実際の購読(subscription)がまだ作られていない
  // 場合があるため（例: OS/ブラウザ側で以前許可しただけでこのアプリ内では未購読）、
  // 許可状態だけでなく購読の有無も別に確認する
  const [alreadySubscribed, setAlreadySubscribed] = useState(null) // null=未確認
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supported) return
    setPermission(Notification.permission)
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setAlreadySubscribed(!!sub))
      .catch(() => setAlreadySubscribed(false))
  }, [supported])

  const enablePush = useCallback(async () => {
    if (!supported) return { success: false, message: 'この端末では通知に対応していません' }
    setSubscribing(true)
    setError(null)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        return { success: false, message: '通知が許可されませんでした' }
      }

      const keyRes = await getVapidPublicKey()
      if (!keyRes.success || !keyRes.data?.publicKey) {
        return { success: false, message: 'サーバー側でPush通知が未設定です' }
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey),
        })
      }

      const json = subscription.toJSON()
      const res = await subscribePush({ endpoint: json.endpoint, keys: json.keys })
      if (!res.success) {
        return { success: false, message: res.message || '購読の登録に失敗しました' }
      }
      setAlreadySubscribed(true)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: '通知の設定に失敗しました' }
    } finally {
      setSubscribing(false)
    }
  }, [supported])

  return { supported, permission, alreadySubscribed, subscribing, error, enablePush }
}
