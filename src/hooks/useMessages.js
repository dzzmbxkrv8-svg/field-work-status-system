import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as messagesApi from '@/api/messages'

export function useMessages() {
  const { state, dispatch } = useAppContext()
  const { messages = [] } = state
  const [loading, setLoading] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    setLoading(true)
    const result = await messagesApi.getMessages()
    if (result.success) {
      dispatch({ type: 'SET_MESSAGES', payload: result.data })
    }
    setLoading(false)
  }, [dispatch])

  useEffect(() => {
    if (state.session) {
      fetchMessages()
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

  return {
    messages,
    loading,
    send,
    markRead,
    refresh: fetchMessages
  }
}
