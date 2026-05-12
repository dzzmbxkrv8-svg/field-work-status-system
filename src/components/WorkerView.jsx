import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useMessages } from '@/hooks/useMessages'
import { useDailyReports } from '@/hooks/useDailyReports'
import { useI18n } from '@/i18n'
import { getWorkers } from '@/api/workers'
import WorkerBottomNav from '@/components/worker/WorkerBottomNav'
import WorkerHomeTab from '@/components/worker/WorkerHomeTab'
import WorkerCalendarTab from '@/components/worker/WorkerCalendarTab'
import WorkerReportTab from '@/components/worker/WorkerReportTab'

export default function WorkerView() {
  const { state, logout } = useAppContext()
  const { sortedOrders: assignments, updateStatus: updateAssignmentStatus, refresh: refreshAssignments } = useReports()
  const { todayAttendance, updateStatus: updateAttendance, refreshToday } = useTimeEntries()
  const { messages: apiMessages, send: sendMessageApi } = useMessages()
  const { submitReport: submitDailyReport } = useDailyReports()
  const { text, formatDate, getStatusLabel } = useI18n(state.language)

  const [clockLoading, setClockLoading] = useState(false)
  const [reportForm, setReportForm] = useState({ assignment_id: '', note: '' })
  const [completedIds, setCompletedIds] = useState(new Set())
  const [adminMessageRecipient, setAdminMessageRecipient] = useState('')
  const [activeTab, setActiveTab] = useState('home')
  const [apiWorkers, setApiWorkers] = useState([])
  const [toast, setToast] = useState(null)
  const [lastCheckedDate, setLastCheckedDate] = useState(() => new Date().toDateString())

  const worker = state.session

  useEffect(() => {
    if (!worker) return
    getWorkers().then(res => {
      if (res.success) setApiWorkers(res.data || [])
    })
  }, [worker])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().toDateString()
      if (now !== lastCheckedDate) {
        setLastCheckedDate(now)
        refreshToday()
      }
    }, 60000)
    return () => clearInterval(timer)
  }, [lastCheckedDate, refreshToday])

  const showToast = useCallback((type, message, duration = 3500) => {
    setToast({ type, text: message })
    setTimeout(() => setToast(null), duration)
  }, [])

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

  const sentMessages = useMemo(() => {
    return apiMessages
      .filter(msg => msg.sender_id === worker?.id)
      .map(msg => {
        let receiver = '管理者'
        if (msg.receiver_name) {
          receiver = msg.receiver_name
        } else if (msg.receiver_id) {
          const found = apiWorkers.find(w => w.id === msg.receiver_id)
          receiver = found ? found.name : `作業員 #${msg.receiver_id}`
        } else if (msg.team_id) {
          receiver = 'チーム全体'
        }
        return {
          id: msg.id,
          receiver,
          message: msg.content,
          photo_url: msg.photo_url,
          timestamp: msg.created_at,
        }
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [apiMessages, worker, apiWorkers])

  const recipientOptions = useMemo(() => {
    const adminOption = { value: 'admin:0', label: '管理者' }
    const workerRecipients = apiWorkers
      .filter(w => w.id !== worker?.id)
      .map(w => ({
        value: `worker:${w.id}`,
        label: `${w.name}（${w.team_name || w.team || `チーム ${w.team_id}`}）`,
        receiverId: w.id,
      }))
    return [adminOption, ...workerRecipients]
  }, [apiWorkers, worker])

  useEffect(() => {
    if (recipientOptions.length === 0) {
      if (adminMessageRecipient !== '') setAdminMessageRecipient('')
      return
    }
    const currentExists = recipientOptions.some(o => o.value === adminMessageRecipient)
    if (!currentExists) setAdminMessageRecipient(recipientOptions[0].value)
  }, [recipientOptions, adminMessageRecipient])

  const primaryAssignment = assignments[0]

  useEffect(() => {
    if (primaryAssignment && !reportForm.assignment_id) {
      setReportForm(prev => ({ ...prev, assignment_id: String(primaryAssignment.db_id) }))
    }
  }, [primaryAssignment, reportForm.assignment_id])

  const formatActionTimestamp = useCallback((timestamp) => {
    const locale = state.language === 'ja' ? 'ja-JP' : 'en-US'
    const timeString = new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    return `${formatDate(timestamp)} ${timeString}`
  }, [state.language, formatDate])

  const handleReportChange = useCallback((field, value) => {
    setReportForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleReportSubmit = useCallback(async (photoUrl) => {
    if (!primaryAssignment) return
    const result = await submitDailyReport({
      assignment_id: primaryAssignment.db_id ?? primaryAssignment.id,
      note: reportForm.note,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    if (result.success) {
      setReportForm(prev => ({ ...prev, note: '' }))
      showToast('success', text.worker.reportSubmittedSuccess || '日報を提出しました。')
    } else {
      showToast('error', result.message || '日報の提出に失敗しました。')
    }
  }, [primaryAssignment, reportForm.note, submitDailyReport, showToast, text.worker.reportSubmittedSuccess])

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
        showToast('success', 'お疲れ様でした！作業が完了しました ✅')
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
  }

  return (
    <div className="worker-app-shell">
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '0.75rem 1.25rem', borderRadius: '8px',
          fontSize: '0.9rem', maxWidth: '90vw', textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          background: toastColors[toast.type].bg,
          color: toastColors[toast.type].color,
          border: `1px solid ${toastColors[toast.type].border}`,
        }}>
          {toast.type === 'success' ? '✅ ' : toast.type === 'error' ? '❌ ' : '⚠️ '}
          {toast.text}
        </div>
      )}
      <div className="worker-app">
        {activeTab === 'home' && (
          <WorkerHomeTab
            worker={worker}
            text={text}
            state={state}
            todayAttendance={todayAttendance}
            incomingMessages={incomingMessages}
            clockLoading={clockLoading}
            handleQuickAction={handleQuickAction}
            formatActionTimestamp={formatActionTimestamp}
            getStatusLabel={getStatusLabel}
            logout={logout}
            assignments={assignments}
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
            text={text}
            assignments={assignments}
            reportForm={reportForm}
            handleReportChange={handleReportChange}
            handleReportSubmit={handleReportSubmit}
            incomingMessages={incomingMessages}
            sentMessages={sentMessages}
            recipientOptions={recipientOptions}
            adminMessageRecipient={adminMessageRecipient}
            setAdminMessageRecipient={setAdminMessageRecipient}
            sendMessageApi={sendMessageApi}
            showToast={showToast}
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
