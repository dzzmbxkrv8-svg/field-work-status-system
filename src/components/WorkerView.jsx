import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useMessages } from '@/hooks/useMessages'
import { useDailyReports } from '@/hooks/useDailyReports'
import { useI18n } from '@/i18n'
import { STATUS_QUICK_ACTIONS } from '@/utils/constants'

export default function WorkerView() {
  const { state, logout } = useAppContext()
  const { sortedOrders: assignments } = useReports()
  const { todayAttendance, updateStatus: updateAttendance, loading: attendanceLoading, refreshToday } = useTimeEntries()
  const { messages: apiMessages, send: sendMessageApi } = useMessages()
  const { submitReport: submitDailyReport } = useDailyReports()
  const { text, formatDate, getStatusLabel } = useI18n(state.language)
  
  const [clockLoading, setClockLoading] = useState(false)
  const [reportForm, setReportForm] = useState({ assignment_id: '', note: '' })
  const [avatarPreview] = useState(null)
  const [reportPhotos, setReportPhotos] = useState([])
  const [completedAssignments, setCompletedAssignments] = useState(() => new Set())
  const [adminMessage, setAdminMessage] = useState('')
  const [adminMessageRecipient, setAdminMessageRecipient] = useState('')
  const messageTextareaRef = useRef(null)
  const [selectedSchedule, setSelectedSchedule] = useState({ date: null, entries: [] })
  const [activeTab, setActiveTab] = useState('home')
  const [messageView, setMessageView] = useState('received')

  const worker = state.session

  const incomingMessages = useMemo(() => {
    return apiMessages.map(msg => ({
      id: msg.id,
      sender: msg.sender_name || 'Admin',
      message: msg.content,
      timestamp: msg.created_at,
      isRead: msg.is_read
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [apiMessages])

  const recipientOptions = useMemo(() => {
    const organizationRecipients = state.organizations.map((org) => ({
      value: `org:${org.code}`,
      label: `${org.companyName || text.login.adminCompanyLabel}`,
      code: org.code,
    }))
    const workerRecipients = state.workers.map((item) => ({
      value: `worker:${item.id}`,
      label: `${item.name}`,
      code: item.organizationCode,
    }))
    return [...organizationRecipients, ...workerRecipients]
  }, [state.organizations, state.workers, text.login.adminCompanyLabel])

  const recipientLabelLookup = useMemo(
    () =>
      recipientOptions.reduce((acc, option) => {
        acc[option.value] = option.label
        return acc
      }, {}),
    [recipientOptions]
  )

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
    const year = today.getFullYear()
    const month = today.getMonth()
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
  }, [assignments])

  const quickLabels = text.worker.statusQuickLabels ?? {}

  const formatActionTimestamp = useCallback((timestamp) => {
    const locale = state.language === 'ja' ? 'ja-JP' : 'en-US'
    const timeString = new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${formatDate(timestamp)} ${timeString}`
  }, [state.language, formatDate])


  if (!worker) {
    return null
  }

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
      assignment_id: primaryAssignment.id,
      note: reportForm.note,
      photos: reportPhotos
    })
    
    if (result.success) {
      setReportForm((prev) => ({ ...prev, note: '' }))
      setReportPhotos([])
      alert(text.worker.reportSubmittedSuccess || 'Report submitted!')
    } else {
      alert(result.message || 'Error submitting report')
    }
  }, [primaryAssignment, reportForm.note, reportPhotos, submitDailyReport, setReportForm, setReportPhotos, text.worker.reportSubmittedSuccess])

  const handleQuickAction = useCallback(async (action) => {
    setClockLoading(true)
    const result = await updateAttendance(action.status)
    if (result.success) {
      await refreshToday()
    } else {
      alert(result.message || 'Error updating status')
    }
    setClockLoading(false)
  }, [updateAttendance, refreshToday])

  const avatarContent = avatarPreview ? (
    <img src={avatarPreview} alt={worker.name} />
  ) : (
    <span>{worker.name.slice(0, 1).toUpperCase()}</span>
  )

  const handleAssignmentComplete = useCallback((orderId) => {
    handleQuickAction(STATUS_QUICK_ACTIONS.find(a => a.status === 'finished') || {
      status: 'finished',
      icon: '🏁',
      variant: 'danger',
    })
    setCompletedAssignments((prev) => {
      const next = new Set(prev)
      next.add(orderId)
      return next
    })
    window.setTimeout(() => {
      setCompletedAssignments((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }, 10000)
  }, [handleQuickAction])

  const handleReportPhotoChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    
    const currentCount = reportPhotos.length
    const remainingSlots = 8 - currentCount
    
    if (remainingSlots <= 0) {
      alert(text.worker.attachmentLimitAlert || 'Maximum 8 photos allowed')
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
      team_id: type === 'worker' ? null : id,
      receiver_id: type === 'worker' ? parseInt(id) : null
    }

    const result = await sendMessageApi(payload)
    if (result.success) {
      setAdminMessage('')
    } else {
      alert(result.message || 'Error sending message')
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

  return (
    <div className="worker-app-shell">
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
            </section>

            <section className="safety-ticker">
              <span className="safety-icon">⚠️</span>
              <div className="safety-content">
                【安全通知】本日、午後から強風の予報が出ています。高所作業の際は十分に注意してください。   【天気】現在は晴れ（24℃）、降水確率10%です。
              </div>
            </section>

            <section className="worker-card worker-card-actions">
              <p className="worker-section-label">{text.worker.quickStatusTitle || '現場ステータス報告'}</p>
              <div className="worker-actions-grid">
                {[
                  { status: 'woke_up', icon: '🌅', variant: 'primary' },
                  { status: 'departed', icon: '🚗', variant: 'success' },
                  { status: 'arrived', icon: '📍', variant: 'warning' },
                  { status: 'finished', icon: '✅', variant: 'danger' },
                ].map((action) => {
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
                  ].filter(item => todayAttendance && todayAttendance[item.key])
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
              <p className="worker-upcoming-month">{new Date(calendarData.year, calendarData.month).toLocaleString(state.language === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' })}</p>
            </header>
            <div className="worker-calendar">
              <div className="worker-calendar-row worker-calendar-head">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(l => <span key={l}>{l}</span>)}
              </div>
              {calendarData.weeks.map((week, idx) => (
                <div key={idx} className="worker-calendar-row">
                  {week.map((day, dayIndex) => {
                    const key = day.toDateString()
                    const isCurrentMonth = day.getMonth() === calendarData.month
                    const entries = calendarData.assignmentByDate[key] ?? []
                    const isToday = day.toDateString() === calendarData.today.toDateString()
                    const isSelected = selectedSchedule.date && day.toDateString() === selectedSchedule.date.toDateString()

                    let bubbleClass = 'bubble-center'
                    if (dayIndex < 2) bubbleClass = 'bubble-left'
                    if (dayIndex > 4) bubbleClass = 'bubble-right'

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
                          <div className="worker-info-item">
                            <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                            <strong>{entry.projectName || entry.title || entry.id}</strong>
                          </div>
                          <div className="worker-info-item">
                            <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                            <span>{entry.location || text.worker.locationUnavailable}</span>
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
                          <div className="worker-assignment-links">
                            <a href="#" className="worker-assignment-link">{text.worker.assignmentDocsLabel}</a>
                          </div>
                          <button
                            type="button"
                            className="worker-assignment-complete"
                            onClick={() => handleAssignmentComplete(entry.db_id)}
                          >
                            {text.worker.completeAssignmentLabel}
                          </button>
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
                    const statusLabel = order.raw_status === 'pending' ? '未着手' : 
                                       order.raw_status === 'in_progress' ? '進行中' : 
                                       order.raw_status === 'completed' ? '完了' : 
                                       order.raw_status === 'cancelled' ? 'キャンセル' : order.status
                    
                    return (
                      <article key={order.id} className="worker-assignment-card">
                        <div className="worker-assignment-info">
                          {completedAssignments.has(order.id) ? (
                            <p className="worker-assignment-finished">{text.worker.assignmentFinishedMessage}</p>
                          ) : (
                            <>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                                <strong>{order.projectName || order.title || order.id}</strong>
                              </div>
                              <div className="worker-info-item">
                                <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                                <span>{order.location || text.worker.locationUnavailable} <span className="worker-map-link">[MAP]</span></span>
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
                              <div className="worker-assignment-links">
                                <a href="#" className="worker-assignment-link">{text.worker.assignmentDocsLabel}</a>
                              </div>
                            </>
                          )}
                        </div>
                        {!completedAssignments.has(order.id) && (
                          <div className="worker-assignment-actions">
                            <button
                              type="button"
                              className="worker-assignment-complete"
                              onClick={() => handleAssignmentComplete(order.db_id)}
                            >
                              {text.worker.completeAssignmentLabel}
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
                  {(messageView === 'received' ? incomingMessages : []).length === 0 ? (
                    <p className="worker-empty">{messageEmptyLabel}</p>
                  ) : (
                    <ul>
                      {(messageView === 'received' ? incomingMessages : []).map((entry, idx) => (
                        <li key={entry.id || idx}>
                           <p>{entry.message || entry.content}</p>
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
          <button type="button" className={`worker-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>🏠<span>{text.worker.navHome}</span></button>
          <button type="button" className={`worker-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>📅<span>{text.worker.navCalendar}</span></button>
          <button type="button" className={`worker-nav-item ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>✉️<span>{text.worker.navReport}</span></button>
        </nav>
      </div>
    </div>
  )
}
