import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useMessages } from '@/hooks/useMessages'
import { useServerEvents } from '@/hooks/useServerEvents'
import { useI18n } from '@/i18n'
import WorkerBottomNav from '@/components/worker/WorkerBottomNav'
import WorkerHomeTab from '@/components/worker/WorkerHomeTab'
import WorkerCalendarTab from '@/components/worker/WorkerCalendarTab'
import WorkerReportTab from '@/components/worker/WorkerReportTab'
import BiometricSetup from '@/components/worker/BiometricSetup'
import { AppIcon } from '@/utils/iconMap'

export default function WorkerView() {
  const { state, logout } = useAppContext()
  const {
    sortedOrders: assignments,
    updateStatus: updateAssignmentStatus,
    refresh: refreshAssignments,
    newAssignmentsCount,
    clearNewAssignments,
  } = useReports()
  const { todayAttendance, updateStatus: updateAttendance, refreshToday } = useTimeEntries()
  const { messages: apiMessages, send: sendMessageApi, refresh: refreshMessages, markRead, markAllRead } = useMessages()
  const { text, formatDate, getStatusLabel } = useI18n(state.language)

  const [clockLoading, setClockLoading] = useState(false)
  const [completedIds, setCompletedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('home')
  const [toast, setToast] = useState(null)
  const [lastCheckedDate, setLastCheckedDate] = useState(() => new Date().toDateString())

  const worker = state.session

  // 日付をまたいだらリセット
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().toDateString()
      if (now !== lastCheckedDate) {
        setLastCheckedDate(now)
        refreshToday()
        refreshAssignments()
      }
    }, 60000)
    return () => clearInterval(timer)
  }, [lastCheckedDate, refreshToday, refreshAssignments])

  const showToast = useCallback((type, message, duration = 3500) => {
    setToast({ type, text: message })
    setTimeout(() => setToast(null), duration)
  }, [])

  // 新規案件が届いたらトーストで通知（ポーリング検出）
  useEffect(() => {
    if (newAssignmentsCount > 0) {
      showToast(
        'info',
        `新しい作業指示が ${newAssignmentsCount}件 届きました。カレンダーを確認してください。`,
        5000
      )
      clearNewAssignments()
    }
  }, [newAssignmentsCount, showToast, clearNewAssignments])

  // お知らせ更新シグナル（WorkerHomeTab に渡す）
  const [announcementRefreshKey, setAnnouncementRefreshKey] = useState(0)

  // SSE リアルタイムイベント処理
  useServerEvents({
    enabled: !!worker,
    onTokenExpired: () => logout(),
    onNewMessage: () => {
      refreshMessages()
    },
    onNewAssignment: (data) => {
      refreshAssignments()
      showToast('info', `新しい作業指示「${data.title}」が届きました`, 5000)
      clearNewAssignments() // ポーリング側の重複通知を防ぐ
    },
    onAssignmentUpdated: (data) => {
      refreshAssignments()
      showToast('info', `作業指示「${data.title}」が更新されました`, 4000)
    },
    onAnnouncementUpdated: () => {
      setAnnouncementRefreshKey(k => k + 1)
      showToast('info', 'お知らせが更新されました', 3500)
    },
  })

  // 受信メッセージ（ホームのティッカー・バッジ用）
  const incomingMessages = useMemo(() => {
    return apiMessages
      .filter(msg => msg.sender_id !== worker?.id)
      .map(msg => ({
        id: msg.id,
        sender: msg.sender_name || 'Admin',
        message: msg.content,
        photo_url: msg.photo_url,
        timestamp: msg.created_at,
        isRead: msg.is_read,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [apiMessages, worker])

  const formatActionTimestamp = useCallback((timestamp) => {
    const locale = state.language === 'ja' ? 'ja-JP' : 'en-US'
    const timeString = new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    return `${formatDate(timestamp)} ${timeString}`
  }, [state.language, formatDate])

  const handleQuickAction = useCallback(async (action) => {
    setClockLoading(true)
    const result = await updateAttendance(action.status)
    if (result.success) {
      await refreshToday()
    } else {
      showToast('error', result.message || 'ステータスの更新に失敗しました。')
    }
    setClockLoading(false)
  }, [updateAttendance, refreshToday, showToast])

  const handleComplete = useCallback(async (order) => {
    const displayId = order.id
    const dbId = order.db_id ?? order.id
    setCompletedIds(prev => new Set([...prev, displayId]))
    try {
      const result = await updateAssignmentStatus(dbId, 'completed')
      if (result.success) {
        await refreshAssignments()
        showToast('success', 'お疲れ様でした！作業が完了しました')
      } else {
        setCompletedIds(prev => { const s = new Set(prev); s.delete(displayId); return s })
        showToast('error', result.message || '完了処理に失敗しました。')
      }
    } catch {
      setCompletedIds(prev => { const s = new Set(prev); s.delete(displayId); return s })
      showToast('error', '完了処理に失敗しました。')
    }
  }, [updateAssignmentStatus, refreshAssignments, showToast])

  if (!worker) return null

  const toastColors = {
    success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
    info:    { bg: '#eef2ff', color: '#1e1b4b', border: '#c7c7f0' },
  }

  return (
    <div className="worker-app-shell">
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '0.75rem 1.25rem', borderRadius: '10px',
          fontSize: '0.88rem', maxWidth: '90vw',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          background: toastColors[toast.type].bg,
          color: toastColors[toast.type].color,
          border: `1px solid ${toastColors[toast.type].border}`,
        }}>
          <AppIcon
            name={
              toast.type === 'success' ? 'CircleCheck' :
              toast.type === 'error'   ? 'CircleX'     :
              toast.type === 'info'    ? 'Bell'         :
              'TriangleAlert'
            }
            size={15}
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
          {toast.text}
        </div>
      )}
      <div className="worker-app">
        <BiometricSetup />
        {activeTab === 'home' && (
          <WorkerHomeTab
            worker={worker}
            text={text}
            state={state}
            todayAttendance={todayAttendance}
            clockLoading={clockLoading}
            handleQuickAction={handleQuickAction}
            formatActionTimestamp={formatActionTimestamp}
            getStatusLabel={getStatusLabel}
            logout={logout}
            assignments={assignments}
            announcementRefreshKey={announcementRefreshKey}
          />
        )}
        {activeTab === 'calendar' && (
          <WorkerCalendarTab
            worker={worker}
            text={text}
            language={state.language}
            assignments={assignments}
            completedIds={completedIds}
            handleComplete={handleComplete}
            formatDate={formatDate}
          />
        )}
        {activeTab === 'report' && (
          <WorkerReportTab
            worker={worker}
            apiMessages={apiMessages}
            sendMessageApi={sendMessageApi}
            showToast={showToast}
            markRead={markRead}
            markAllRead={markAllRead}
          />
        )}
        <WorkerBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          text={text}
          incomingMessages={incomingMessages}
        />
      </div>
    </div>
  )
}
