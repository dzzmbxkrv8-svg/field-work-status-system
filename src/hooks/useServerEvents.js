import { useEffect, useRef } from 'react'

const SSE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/events'

/** JWTの有効期限をチェック（期限切れなら true） */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

/**
 * Server-Sent Events フック
 * サーバーからのリアルタイムプッシュ通知を受信する。
 *
 * コールバックは useRef で保持するため、呼び出し元で useCallback 不要。
 * 再レンダリングのたびに関数参照が変わっても常に最新版が呼ばれる（stale closure なし）。
 *
 * @param {object}   options
 * @param {boolean}  options.enabled                  - SSE を有効にするか
 * @param {function} options.onNewMessage             - 新規メッセージ受信時
 * @param {function} options.onNewAssignment          - 新規案件追加時
 * @param {function} options.onAssignmentUpdated      - 案件内容更新時
 * @param {function} options.onAnnouncementUpdated    - お知らせ更新時
 * @param {function} options.onAssignmentStatusChanged  - 案件ステータス変更時（作業員→管理者）
 * @param {function} options.onAttendanceStatusChanged - 出退勤ステータス変更時（作業員→管理者）
 * @param {function} options.onTokenExpired            - JWTトークン期限切れ時
 */
export function useServerEvents({
  enabled = true,
  onNewMessage,
  onNewAssignment,
  onAssignmentUpdated,
  onAnnouncementUpdated,
  onAssignmentStatusChanged,
  onAttendanceStatusChanged,
  onTokenExpired,
}) {
  // コールバックを ref で管理 → 依存配列に含める必要がなく、常に最新版が呼ばれる
  const cbRef = useRef({})
  cbRef.current = {
    onNewMessage,
    onNewAssignment,
    onAssignmentUpdated,
    onAnnouncementUpdated,
    onAssignmentStatusChanged,
    onAttendanceStatusChanged,
    onTokenExpired,
  }

  const esRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const retryCount = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const token = localStorage.getItem('token')
    if (!token) return

    // 接続前にトークン期限を確認
    if (isTokenExpired(token)) {
      cbRef.current.onTokenExpired?.()
      return
    }

    const connect = () => {
      esRef.current?.close()

      const es = new EventSource(`${SSE_URL}?token=${encodeURIComponent(token)}`)
      esRef.current = es

      es.addEventListener('connected', () => {
        retryCount.current = 0
      })

      // --- イベントハンドラー（ref 経由で常に最新コールバックを呼ぶ）---
      es.addEventListener('new_message', () => {
        cbRef.current.onNewMessage?.()
      })

      es.addEventListener('new_assignment', (e) => {
        cbRef.current.onNewAssignment?.(JSON.parse(e.data))
      })

      es.addEventListener('assignment_updated', (e) => {
        cbRef.current.onAssignmentUpdated?.(JSON.parse(e.data))
      })

      es.addEventListener('announcement_updated', (e) => {
        cbRef.current.onAnnouncementUpdated?.(JSON.parse(e.data))
      })

      es.addEventListener('assignment_status_changed', (e) => {
        cbRef.current.onAssignmentStatusChanged?.(JSON.parse(e.data))
      })

      es.addEventListener('attendance_status_changed', (e) => {
        cbRef.current.onAttendanceStatusChanged?.(JSON.parse(e.data))
      })

      es.onerror = () => {
        es.close()
        esRef.current = null

        // 期限切れなら再接続しない
        const currentToken = localStorage.getItem('token')
        if (!currentToken || isTokenExpired(currentToken)) {
          cbRef.current.onTokenExpired?.()
          return
        }

        // 指数バックオフで再接続（最大 30 秒）
        const delay = Math.min(1000 * 2 ** retryCount.current, 30_000)
        retryCount.current += 1
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimerRef.current)
      esRef.current?.close()
      esRef.current = null
    }
  }, [enabled]) // enabled のみ — コールバックは ref で管理するため不要
}
