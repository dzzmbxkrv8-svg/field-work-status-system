import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useMessages } from '@/hooks/useMessages'
import { useDailyReports } from '@/hooks/useDailyReports'
import { useI18n } from '@/i18n'
import { STATUS_QUICK_ACTIONS } from '@/utils/constants'
import { getWorkers } from '@/api/workers'

export default function WorkerView() {
  const { state, logout } = useAppContext()
  const { sortedOrders: assignments } = useReports()
  const { todayAttendance, updateStatus: updateAttendance, refreshToday } = useTimeEntries()
  const { messages: apiMessages, send: sendMessageApi } = useMessages()
  const { submitReport: submitDailyReport } = useDailyReports()
  const { text, formatDate, getStatusLabel } = useI18n(state.language)
  
  const [clockLoading, setClockLoading] = useState(false)
  const [reportForm, setReportForm] = useState({ assignment_id: '', note: '' })
  const [avatarPreview] = useState(null)
  const [completedIds, setCompletedIds] = useState(new Set())
  const [toastVisible, setToastVisible] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminMessageRecipient, setAdminMessageRecipient] = useState('')
  const messageTextareaRef = useRef(null)
  const [selectedSchedule, setSelectedSchedule] = useState({ date: null, entries: [] })
  const [activeTab, setActiveTab] = useState('home')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [apiWorkers, setApiWorkers] = useState([])

  useEffect(() => {
    if (!worker) return
    getWorkers().then(res => {
      if (res.success) setApiWorkers(res.data || [])
    })
  }, [worker])
  const [messageView, setMessageView] = useState('received')
  const [toast, setToast] = useState(null) // { type: 'success'|'error'|'warning', text: string }
  const [lastCheckedDate, setLastCheckedDate] = useState(() => new Date().toDateString())

  // Date change monitoring
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

  // Toast trigger is now part of handleComplete

  const showToast = (type, text, duration = 3500) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), duration)
  }

  const worker = state.session

  const incomingMessages = useMemo(() => {
    return apiMessages
      .filter(msg => msg.sender_id !== worker?.id)
      .map(msg => ({
        id: msg.id,
        sender: msg.sender_name || 'Admin',
        message: msg.content,
        timestamp: msg.created_at,
        isRead: msg.is_read
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
      if (adminMessageRecipient !== '') {
        setAdminMessageRecipient('')
      }
      return
    }
    const currentExists = recipientOptions.some((option) => option.value === adminMessageRecipient)
    if (!currentExists) {
      setAdminMessageRecipient(recipientOptions[0].value)
    }
  }, [recipientOptions, adminMessageRecipient, setAdminMessageRecipient])

  // assignments is now from useReports() directly
  const calendarData = useMemo(() => {
    const today = new Date()
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const weeks = []
    for (let week = 0; week < 6; week += 1) {
      const days = []
      for (let d = 0; d < 7; d += 1) {
        const current = new Date(startDate)
        current.setDate(startDate.getDate() + week * 7 + d)
        days.push(current)
      }
      weeks.push(days)
    }
    const assignmentByDate = {}
    assignments.forEach(order => {
      const start = new Date(order.startDate)
      const end = new Date(order.dueDate || order.endDate || order.startDate)
      
      // For each day in the calendar grid, check if the assignment covers it
      weeks.forEach(week => {
        week.forEach(day => {
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
          const orderStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
          const orderEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
          
          if (dayStart >= orderStart && dayStart <= orderEnd) {
            const key = day.toDateString()
            if (!assignmentByDate[key]) assignmentByDate[key] = []
            assignmentByDate[key].push(order)
          }
        })
      })
    })
    return { year, month, weeks, assignmentByDate, today }
  }, [assignments, calendarMonth])

  const quickLabels = text.worker.statusQuickLabels ?? {}

  const formatActionTimestamp = useCallback((timestamp) => {
    const locale = state.language === 'ja' ? 'ja-JP' : 'en-US'
    const timeString = new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${formatDate(timestamp)} ${timeString}`
  }, [state.language, formatDate])



  const primaryAssignment = assignments[0]
  
  useEffect(() => {
    if (primaryAssignment && !reportForm.assignment_id) {
      setReportForm(prev => ({ ...prev, assignment_id: String(primaryAssignment.db_id) }))
    }
  }, [primaryAssignment, reportForm.assignment_id, setReportForm])

  const messageSentLabel = text.worker.adminMessageSentTab ?? 'Sent'
  const messageReceivedLabel = text.worker.adminMessageReceivedTab ?? 'Received'
  const messageEmptyLabel = text.worker.adminMessageEmpty ?? 'No messages yet.'

  const handleReportChange = (field, value) => {
    setReportForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleReportSubmit = useCallback(async () => {
    if (!primaryAssignment) return
    const result = await submitDailyReport({
      assignment_id: primaryAssignment.db_id ?? primaryAssignment.id,
      note: reportForm.note,
      photos: reportPhotos
    })
    
    if (result.success) {
      setReportForm((prev) => ({ ...prev, note: '' }))
      setReportPhotos([])
      showToast('success', text.worker.reportSubmittedSuccess || '日報を提出しました。')
    } else {
      showToast('error', result.message || '日報の提出に失敗しました。')
    }
  }, [primaryAssignment, reportForm.note, reportPhotos, submitDailyReport, setReportForm, setReportPhotos, text.worker.reportSubmittedSuccess])

  const handleQuickAction = useCallback(async (action) => {
    setClockLoading(true)
    const result = await updateAttendance(action.status)
    if (result.success) {
      await refreshToday()
    } else {
      showToast('error', result.message || 'ステータスの更新に失敗しました。')
    }
    setClockLoading(false)
  }, [updateAttendance, refreshToday])

  const avatarContent = avatarPreview ? (
    <img src={avatarPreview} alt={worker.name} />
  ) : (
    <span>{worker.name.slice(0, 1).toUpperCase()}</span>
  )

  const handleComplete = useCallback(async (order) => {
    const displayId = order.id;
    const dbId = order.db_id;
    
    setCompletedIds(prev => new Set([...prev, displayId]));
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/assignments/${dbId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch (error) {
      console.error('完了処理エラー:', error);
    }
  }, [])

  const handleReportPhotoChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    
    const currentCount = reportPhotos.length
    const remainingSlots = 8 - currentCount
    
    if (remainingSlots <= 0) {
      showToast('warning', text.worker.attachmentLimitAlert || 'ファイルは最大で8つまで添付できます')
      return
    }

    const filesToAdd = files.slice(0, remainingSlots)
    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setReportPhotos(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeReportPhoto = (index) => {
    setReportPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleAdminMessageSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!adminMessage.trim()) return
    if (!adminMessageRecipient) return

    const [type, id] = adminMessageRecipient.split(':')
    const payload = {
      content: adminMessage.trim(),
      team_id: (type === 'worker' || type === 'admin') ? null : id,
      receiver_id: type === 'worker' ? parseInt(id) : null
    }

    const result = await sendMessageApi(payload)
    if (result.success) {
      setAdminMessage('')
      showToast('success', 'メッセージを送信しました。')
    } else {
      showToast('error', result.message || 'メッセージの送信に失敗しました。')
    }
  }, [adminMessage, adminMessageRecipient, sendMessageApi, setAdminMessage])



  const handleAdminMessageChange = (event) => {
    setAdminMessage(event.target.value)
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto'
      messageTextareaRef.current.style.height = `${messageTextareaRef.current.scrollHeight}px`
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return text.worker.greetingNight
    if (hour < 11) return text.worker.greetingMorning
    if (hour < 17) return text.worker.greetingAfternoon
    return text.worker.greetingEvening
  }

  if (!worker) {
    return null
  }

  const toastColors = {
    success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  }

  return (
    <div className="worker-app-shell">
      {toastVisible && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 9999,
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap'
        }}>
          ✅ お疲れ様でした！作業が完了しました
        </div>
      )}
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
          <>
            {state.pendingActions.length > 0 && (
              <div className="worker-offline-banner">
                <span className="worker-offline-indicator"></span>
                <span>{text.worker.offlinePending(state.pendingActions.length)}</span>
              </div>
            )}
            
            <section className="worker-card worker-card-profile">
              <div className="worker-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="worker-avatar">
                    {avatarContent}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0' }}>{getGreeting()}</p>
                    <h2 style={{ margin: '0', fontSize: '1.4rem' }}>{worker.name}</h2>
                  </div>
                </div>
                <button type="button" className="worker-logout" onClick={logout}>
                  {text.actions.logout}
                </button>
              </div>
              
              <div className="worker-info-block">
                <div className="worker-info-row">
                  <span className="worker-info-label">{text.worker.workerIdLabel}</span>
                  <span className="worker-info-value">{worker.employee_id || worker.workerId}</span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-label">{text.login.accessCodeLabel}</span>
                  <span className="worker-info-value">{worker.employee_id}</span>
                </div>
                <div className="worker-info-row">
                  <span className="worker-info-label">{text.table.headers.team || 'チーム'}</span>
                  <span className="worker-info-value">{worker.team_name || worker.team}</span>
                </div>
              </div>

              {(() => {
                const statusSteps = [
                  { key: 'woke_up_at',   label: '起床済み',   color: '#f59e0b', icon: '🌅' },
                  { key: 'departed_at',  label: '出発済み',   color: '#3b82f6', icon: '🚗' },
                  { key: 'arrived_at',   label: '現場到着',   color: '#10b981', icon: '📍' },
                  { key: 'finished_at',  label: '作業終了',   color: '#6b7280', icon: '✅' },
                ]
                const currentStep = [...statusSteps].reverse().find(s => todayAttendance?.[s.key])
                return (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>本日のステータス：</span>
                    {currentStep ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        background: currentStep.color, color: '#fff',
                        borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold',
                        padding: '0.2rem 0.75rem',
                      }}>
                        {currentStep.icon} {currentStep.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>未報告</span>
                    )}
                  </div>
                )
              })()}
            </section>

            {(() => {
              const latestAdminMsg = incomingMessages[0]
              const tickerText = latestAdminMsg
                ? `【管理者からのお知らせ】${latestAdminMsg.message}`
                : '【安全通知】作業前に安全確認を必ず行ってください。ヘルメット・安全帯の着用を徹底してください。'
              return (
                <section className="safety-ticker">
                  <span className="safety-icon">⚠️</span>
                  <div className="safety-content">
                    {tickerText}
                  </div>
                </section>
              )
            })()}

            <section className="worker-card worker-card-actions">
              <p className="worker-section-label">{text.worker.quickStatusTitle || '現場ステータス報告'}</p>
              <div className="worker-actions-grid">
                {STATUS_QUICK_ACTIONS.map((action) => {
                  const actionLabel = quickLabels[action.status] ?? getStatusLabel(action.status)
                  const isRecorded = todayAttendance && todayAttendance[`${action.status}_at`]
                  return (
                    <button
                      key={action.status}
                      type="button"
                      className={`worker-action worker-action-${action.variant}`}
                      onClick={() => handleQuickAction(action)}
                      disabled={clockLoading || isRecorded}
                    >
                      <span className="worker-action-icon" aria-hidden="true">
                        {action.icon}
                      </span>
                      <span>{actionLabel}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="worker-card worker-card-history">
              <p className="worker-section-label">当日クイックアクション履歴</p>
              <div className="worker-clock-history-list">
                {(() => {
                  const historyItems = [
                    { key: 'woke_up_at', label: '起床済み', icon: '🌅' },
                    { key: 'departed_at', label: '出発済み', icon: '🚗' },
                    { key: 'arrived_at', label: '現場到着', icon: '📍' },
                    { key: 'finished_at', label: '作業終了', icon: '✅' },
                  ].filter(item => {
                    const isToday = todayAttendance && 
                                    (!todayAttendance.date || new Date(todayAttendance.date).toDateString() === new Date().toDateString())
                    return isToday && todayAttendance && todayAttendance[item.key]
                  })
                   .map(item => ({
                     ...item,
                     timestamp: todayAttendance[item.key]
                   }))
                   .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                  if (historyItems.length === 0) {
                    return <p className="worker-empty-mini" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>本日の履歴はありません</p>;
                  }

                  return historyItems.map((item, idx) => (
                    <div key={idx} className="worker-history-item-row" style={{ 
                      padding: '0.75rem 0',
                      borderBottom: idx === historyItems.length - 1 ? 'none' : '1px solid var(--color-border-light)',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                      <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{item.label}</span>
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>{formatActionTimestamp(item.timestamp)}</span>
                    </div>
                  ));
                })()}
              </div>
            </section>
          </>
        )}




        {activeTab === 'calendar' && (
          <section className="worker-card worker-card-upcoming">
            <header>
              <h3>{text.worker.upcomingHeading}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="worker-nav-month-btn"
                  onClick={() => {
                    setCalendarMonth(prev => {
                      const d = new Date(prev.year, prev.month - 1, 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })
                    setSelectedSchedule({ date: null, entries: [] })
                  }}
                  style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ‹
                </button>
                <p className="worker-upcoming-month" style={{ margin: 0 }}>
                  {new Date(calendarData.year, calendarData.month).toLocaleString(state.language === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  type="button"
                  className="worker-nav-month-btn"
                  onClick={() => {
                    setCalendarMonth(prev => {
                      const d = new Date(prev.year, prev.month + 1, 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })
                    setSelectedSchedule({ date: null, entries: [] })
                  }}
                  style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ›
                </button>
              </div>
            </header>
            <div className="worker-calendar">
              <div className="worker-calendar-row worker-calendar-head">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(l => <span key={l}>{l}</span>)}
              </div>
              {calendarData.weeks.map((week, idx) => (
                <div key={idx} className="worker-calendar-row">
                  {week.map((day) => {
                    const key = day.toDateString()
                    const isCurrentMonth = day.getMonth() === calendarData.month
                    const entries = calendarData.assignmentByDate[key] ?? []
                    const isToday = day.toDateString() === calendarData.today.toDateString()
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`worker-calendar-cell ${isCurrentMonth ? '' : 'muted'} ${isToday ? 'today' : ''} ${entries.length > 0 ? 'has-event' : ''}`}
                        onClick={() => setSelectedSchedule({ date: new Date(day), entries })}
                      >
                        <span className="worker-calendar-day">{day.getDate()}</span>
                        {entries.length > 0 && <span className="worker-calendar-dot">●</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {selectedSchedule.date && (
              <section className="worker-calendar-details">
                <header>
                  <h4>{formatDate(selectedSchedule.date)}</h4>
                  <button
                    className="worker-calendar-details-close"
                    onClick={() => setSelectedSchedule({ date: null, entries: [] })}
                  >
                    ×
                  </button>
                </header>
                {selectedSchedule.entries.length > 0 ? (
                  <div className="worker-assignment-grid">
                    {selectedSchedule.entries.map((entry) => (
                      <article key={entry.id} className="worker-assignment-card">
                        <div className="worker-assignment-info">
                          {completedIds.has(entry.id) || entry.status === 'Completed' || entry.status === 'completed' ? (
                            <p className="worker-assignment-finished">{text.worker.assignmentFinishedMessage}</p>
                          ) : (
                            <>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                                <strong>{entry.projectName || entry.title || entry.id}</strong>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                                <span>
                                  {entry.location || text.worker.locationUnavailable}
                                  {entry.location && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.location)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: '#3B82F6',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        marginLeft: '4px',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      [MAP]
                                    </a>
                                  )}
                                </span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentDateLabel}:</span>
                                <span>{formatDate(entry.startDate)}</span>
                                <span className="worker-meta-label" style={{ marginLeft: '1rem' }}>{text.worker.assignmentCrewLabel}:</span>
                                <span>{entry.crewCount || '—'}</span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentTaskLabel}:</span>
                                <span>{entry.notes || '—'}</span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentMembersLabel}:</span>
                                <span>{entry.members || '—'}</span>
                              </div>
                              {entry.location && (
                                <div className="worker-assignment-links">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.location)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="worker-assignment-link"
                                  >
                                    📍 {text.worker.assignmentDocsLabel}
                                  </a>
                                </div>
                              )}
                              {completedIds.has(entry.id) || entry.status === 'Completed' || entry.status === 'completed' ? (
                                <button
                                  disabled
                                  style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#888',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'not-allowed',
                                    fontSize: '16px'
                                  }}
                                >
                                  完了済み
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplete(entry);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#F59E0B',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  完了
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="worker-calendar-no-events">{text.worker.calendarNoEvents}</p>
                )}
              </section>
            )}

            <section className="worker-card worker-card-assignments">
              <header>
                <h3>{text.worker.assignmentHeading}</h3>
                <p className="worker-assignment-count">{text.worker.assignmentCount ? text.worker.assignmentCount(assignments.length) : `${assignments.length}件`}</p>
              </header>
              {assignments.length === 0 ? (
                <p className="worker-empty">{text.worker.empty}</p>
              ) : (
                <div className="worker-assignment-grid">
                  {assignments.map((order) => {
                    return (
                      <article key={order.id} className="worker-assignment-card">
                        <div className="worker-assignment-info">
                          {completedIds.has(order.id) || order.status === 'Completed' || order.status === 'completed' ? (
                            <p className="worker-assignment-finished">{text.worker.assignmentFinishedMessage}</p>
                          ) : (
                            <>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                                <strong>{order.projectName || order.title || order.id}</strong>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                                <span>
                                  {order.location || text.worker.locationUnavailable}
                                  {order.location && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: '#3B82F6',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        marginLeft: '4px',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      [MAP]
                                    </a>
                                  )}
                                </span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentDateLabel}:</span>
                                <span>{formatDate(order.startDate)}</span>
                                <span className="worker-meta-label" style={{ marginLeft: '1rem' }}>{text.worker.assignmentCrewLabel}:</span>
                                <span>{order.crewCount || '—'}</span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentTaskLabel}:</span>
                                <span>{order.notes || '—'}</span>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentMembersLabel}:</span>
                                <span>{order.members || '—'}</span>
                              </div>
                              {order.cautionNote && (
                                <div className="worker-info-item">
                                  <span className="worker-meta-label">{text.worker.assignmentCautionLabel}:</span>
                                  <span>{order.cautionNote}</span>
                                </div>
                              )}
                              {order.location && (
                                <div className="worker-assignment-links">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.location)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="worker-assignment-link"
                                  >
                                    📍 {text.worker.assignmentDocsLabel}
                                  </a>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {completedIds.has(order.id) || order.status === 'Completed' || order.status === 'completed' ? (
                          <div className="worker-assignment-actions" style={{ width: '100%' }}>
                            <button
                              disabled
                              style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#888',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'not-allowed',
                                fontSize: '16px'
                              }}
                            >
                              完了済み
                            </button>
                          </div>
                        ) : (
                          <div className="worker-assignment-actions" style={{ width: '100%' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(order);
                              }}
                              style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#F59E0B',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                              }}
                            >
                              完了
                            </button>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === 'report' && (
          <div className="worker-report-container">
            <section className="worker-card worker-card-message">
              <header>
                <h3>{text.worker.adminMessageTitle}</h3>
              </header>
              <form className="worker-message-form" onSubmit={handleAdminMessageSubmit}>
                 <div className="worker-form-group">
                   <label>{text.worker.adminMessageRecipientLabel}</label>
                   <select value={adminMessageRecipient} onChange={(e) => setAdminMessageRecipient(e.target.value)}>
                     {recipientOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                   </select>
                 </div>
                 <div className="worker-message-textarea-wrapper">
                   <textarea
                     ref={messageTextareaRef}
                     value={adminMessage}
                     onChange={handleAdminMessageChange}
                     placeholder={text.worker.adminMessagePlaceholder}
                     style={{ minHeight: '120px' }}
                   />
                   <button type="submit" className="worker-message-send-btn">
                     <span className="worker-send-btn-text">{text.worker.adminMessageButton}</span>
                   </button>
                 </div>
              </form>
              <div className="worker-message-list-section">
                <div className="worker-message-tabs-pill">
                  <button type="button" className={messageView === 'sent' ? 'active' : ''} onClick={() => setMessageView('sent')}>{messageSentLabel}</button>
                  <button type="button" className={messageView === 'received' ? 'active' : ''} onClick={() => setMessageView('received')}>{messageReceivedLabel}</button>
                </div>
                <div className="worker-message-log-simple">
                  {(messageView === 'received' ? incomingMessages : sentMessages).length === 0 ? (
                    <p className="worker-empty">{messageEmptyLabel}</p>
                  ) : (
                    <ul>
                      {(messageView === 'received' ? incomingMessages : sentMessages).map((entry, idx) => (
                        <li key={entry.id || idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>
                            {messageView === 'received'
                              ? `${text.worker.adminMessageFromLabel(entry.sender)}`
                              : `${text.worker.adminMessageToLabel(entry.receiver)}`
                            }
                          </p>
                          <p style={{ margin: '0 0 0.25rem' }}>{entry.message || entry.content}</p>
                          <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            {new Date(entry.timestamp).toLocaleString('ja-JP')}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {primaryAssignment && (
              <section className="worker-card worker-photo-report">
                <h4>📸 {text.worker.photoReportHeading || '現場写真報告'}</h4>
                <div className="worker-photo-controls">
                  <label className="worker-photo-label-trigger">
                    <input type="file" accept="image/*" capture="camera" multiple onChange={handleReportPhotoChange} style={{ display: 'none' }} />
                    <div className="worker-photo-add-box">
                      <span>{text.worker.photoReportPrompt}</span>
                    </div>
                  </label>
                  
                  {reportPhotos.length > 0 && (
                    <div className="worker-photo-grid-preview">
                      {reportPhotos.map((photo, idx) => (
                        <div key={idx} className="worker-photo-thumbnail">
                          <img src={photo} alt={`Preview ${idx}`} />
                          <button type="button" className="worker-photo-delete" onClick={() => removeReportPhoto(idx)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {reportPhotos.length > 0 && (
                    <button type="button" className="worker-clock-button primary" onClick={handleReportSubmit} style={{ marginTop: '1rem' }}>
                      {text.worker.photoReportSubmit}
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="worker-card worker-card-daily-report">
              <header>
                <h3>{text.worker.dailyReportTitle || '日報'}</h3>
              </header>
              <div className="worker-report-form-simple">
                {assignments.length > 1 && (
                  <div className="worker-form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                      {text.worker.assignmentProjectLabel}
                    </label>
                    <select
                      value={reportForm.assignment_id}
                      onChange={(e) => handleReportChange('assignment_id', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.9rem' }}
                    >
                      {assignments.map(a => (
                        <option key={a.db_id ?? a.id} value={String(a.db_id ?? a.id)}>
                          {a.projectName || a.location || a.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <textarea
                  rows={4}
                  value={reportForm.note}
                  onChange={(e) => handleReportChange('note', e.target.value)}
                  placeholder={text.worker.dailyReportPlaceholder}
                />
                <button
                  type="button"
                  className="worker-clock-button primary"
                  onClick={handleReportSubmit}
                  disabled={!reportForm.note}
                  style={{ marginTop: '1rem' }}
                >
                  {text.worker.dailyReportSubmit}
                </button>
              </div>
            </section>
          </div>
        )}

        <nav className="worker-bottom-nav">
          <button type="button" className={`worker-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            🏠<span>{text.worker.navHome}</span>
          </button>
          <button type="button" className={`worker-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            📅<span>{text.worker.navCalendar}</span>
          </button>
          <button
            type="button"
            className={`worker-nav-item ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
            style={{ position: 'relative' }}
          >
            ✉️
            {incomingMessages.filter(m => !m.isRead).length > 0 && (
              <span style={{
                position: 'absolute', top: '4px', right: '12px',
                background: '#ef4444', color: '#fff',
                borderRadius: '999px', fontSize: '0.65rem', fontWeight: 'bold',
                minWidth: '16px', height: '16px', lineHeight: '16px',
                textAlign: 'center', padding: '0 3px',
              }}>
                {incomingMessages.filter(m => !m.isRead).length}
              </span>
            )}
            <span>{text.worker.navReport}</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
