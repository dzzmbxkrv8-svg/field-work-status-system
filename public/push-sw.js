// Web Push通知の受信・表示処理。
// vite-plugin-pwa（generateSW方式）が生成するService Workerに
// importScripts() で読み込まれる追加スクリプト。

self.addEventListener('push', (event) => {
  let payload = { title: 'Fieldo', body: '新しい通知があります' }
  try {
    if (event.data) payload = event.data.json()
  } catch {
    // JSON以外のペイロードは無視してデフォルト文言を使う
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Fieldo', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
