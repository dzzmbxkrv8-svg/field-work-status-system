import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as messagesApi from '@/api/messages'

const POLL_INTERVAL = 30_000 // 30秒

export function useMessages() {
  const { state, dispatch } = useAppContext()
  const { messages = [] } = state
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    if (!localStorage.getItem('token')) return
    setLoading(true)
    const result = await messagesApi.getMessages()
    if (result.success) {
      dispatch({ type: 'SET_MESSAGES', payload: result.data })
    }
    setLoading(false)
  }, [dispatch])

  // 初回取得 + ポーリング（30秒間隔）
  useEffect(() => {
    if (!state.session) return

    fetchMessages()

    const startPolling = () => {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchMessages()
        }
      }, POLL_INTERVAL)
    }

    const stopPolling = () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // タブが表示に戻ったら即時再取得
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.session, fetchMessages])

  const send = useCallback(async (messageData) => {
    const result = await messagesApi.sendMessage(messageData)
    if (result.success) {
      fetchMessages()
    }
    return result
  }, [fetchMessages])

  const markRead = useCallback(async (id) => {
    if (!state.session) return
    const result = await messagesApi.markAsRead(id, state.session.id)
    if (result.success) {
      fetchMessages()
    }
    return result
  }, [state.session, fetchMessages])

  // 複数メッセージをまとめて既読にする（fetchMessages は1回だけ）
  const markAllRead = useCallback(async (ids) => {
    if (!state.session || !ids.length) return
    await Promise.all(ids.map(id => messagesApi.markAsRead(id, state.session.id)))
    fetchMessages()
  }, [state.session, fetchMessages])

  return {
    messages,
    loading,
    send,
    markRead,
    markAllRead,
    refresh: fetchMessages
  }
}
