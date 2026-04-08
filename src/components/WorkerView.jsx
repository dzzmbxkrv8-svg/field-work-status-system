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
  const { sortedOrders: assignments, getAssignmentsForTeam } = useReports()
  const { todayAttendance, teamAttendance, updateStatus: updateAttendance, loading: attendanceLoading } = useTimeEntries()
  const { messages: apiMessages, send: sendMessageApi, markRead: markAsReadApi } = useMessages()
  const { reports: dailyReports, submitReport: submitDailyReport } = useDailyReports()
  const { text, formatDate, formatDateTime, getStatusLabel, formatNumber } = useI18n(state.language)
  
  const [clockLoading, setClockLoading] = useState(false)
  const [reportForm, setReportForm] = useState({ status: '', assignment_id: '', location: '', note: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [reportPhoto, setReportPhoto] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [completedAssignments, setCompletedAssignments] = useState(() => new Set())
  const [adminMessage, setAdminMessage] = useState('')
  const [adminMessageLog, setAdminMessageLog] = useState([])
  const [adminMessageRecipient, setAdminMessageRecipient] = useState('')
  const [messageAttachments, setMessageAttachments] = useState([])
  const messageTextareaRef = useRef(null)
  const fileInputRef = useRef(null)
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
  }, [recipientOptions, adminMessageRecipient])

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
  const locationText = primaryAssignment?.location || text.worker.locationUnavailable
  const messageSentLabel = text.worker.adminMessageSentTab ?? 'Sent'
  const messageReceivedLabel = text.worker.adminMessageReceivedTab ?? 'Received'
  const messageEmptyLabel = text.worker.adminMessageEmpty ?? 'No messages yet.'

  const handleReportChange = (field, value) => {
    setReportForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleReportSubmit = async () => {
    if (!primaryAssignment) return
    const result = await submitDailyReport({
      assignment_id: primaryAssignment.id,
      note: reportForm.note,
      photo: reportPhoto
    })
    
    if (result.success) {
      setReportForm((prev) => ({ ...prev, note: '' }))
      setReportPhoto(null)
      alert(text.worker.reportSubmittedSuccess || 'Report submitted!')
    } else {
      alert(result.message || 'Error submitting report')
    }
  }

  const handleQuickAction = async (orderId, action) => {
    setClockLoading(true)
    const result = await updateAttendance(action.status)
    setClockLoading(false)

    if (result.success) {
      const timestamp = new Date().toISOString()
      const actionLabel = quickLabels[action.status] ?? getStatusLabel(action.status)
      const newAction = {
        label: actionLabel,
        icon: action.icon,
        status: action.status,
        timestamp,
        formatted: formatActionTimestamp(timestamp),
      }
      setLatestQuickAction(newAction)
      setActivityLog((prev) => [newAction, ...prev].slice(0, 5))
    } else {
      alert(result.message || 'Error updating status')
    }
  }

  const handleAssignmentComplete = (orderId) => {
    handleQuickAction(orderId, STATUS_QUICK_ACTIONS.find(a => a.status === 'finished') || {
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
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleReportPhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setReportPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const avatarContent = avatarPreview ? (
    <img src={avatarPreview} alt={worker.name} />
  ) : (
    <span>{worker.name.slice(0, 1).toUpperCase()}</span>
  )

  const handleAdminMessageSubmit = async (event) => {
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
      setMessageAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else {
      alert(result.message || 'Error sending message')
    }
  }

  const handleMessageFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const currentCount = messageAttachments.length
    const remainingSlots = 8 - currentCount
    if (remainingSlots <= 0) {
      alert(text.worker.attachmentLimitAlert)
      return
    }
    const filesToAdd = files.slice(0, remainingSlots)
    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setMessageAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: reader.result
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeAttachment = (index) => {
    setMessageAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleAdminMessageChange = (event) => {
    setAdminMessage(event.target.value)
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto'
      messageTextareaRef.current.style.height = `${messageTextareaRef.current.scrollHeight}px`
    }
  }

  const formatToLabel = (label) => (text.worker.adminMessageToLabel ? text.worker.adminMessageToLabel(label) : label)
  const formatFromLabel = (label) => (text.worker.adminMessageFromLabel ? text.worker.adminMessageFromLabel(label) : label)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 5) return text.worker.greetingNight ?? 'お疲れ様です'
    if (hour < 11) return text.worker.greetingMorning ?? 'おはようございます'
    if (hour < 17) return text.worker.greetingAfternoon ?? 'こんにちは'
    return text.worker.greetingEvening ?? 'お疲れ様です'
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
            <div className="worker-dashboard-top">
              <section className="worker-card worker-card-profile">
                <div className="worker-card-header">
                  <label className="worker-avatar editable">
                    <input type="file" accept="image/*" onChange={handleAvatarChange} />
                    {avatarContent}
                    <span className="worker-avatar-edit">{text.worker.editAvatar ?? '編集'}</span>
                  </label>
                  <div className="worker-card-header-info">
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem' }}>{getGreeting()}</p>
                    <h2>{worker.name}</h2>
                    <p className="worker-subtext">
                      {text.worker.workerIdLabel}: {worker.employee_id || worker.workerId}
                    </p>
                  </div>
                  <button type="button" className="worker-logout" onClick={logout}>
                    {text.actions.logout}
                  </button>
                </div>
                <div className="worker-info-block">
                  <div className="worker-info-row">
                    <span className="worker-info-label">{text.login.accessCodeLabel}</span>
                    <span className="worker-info-value">{worker.organizationCode || worker.employee_id}</span>
                  </div>
                  <div className="worker-info-row">
                    <span className="worker-info-label">{text.table.headers.team || 'Team'}</span>
                    <span className="worker-info-value">{worker.team_name || worker.team || worker.team_id}</span>
                  </div>
                </div>
              </section>
            </div>

            <section className="safety-ticker">
              <span className="safety-icon">⚠️</span>
              <div className="safety-content">
                【安全通知】本日、午後から強風の予報が出ています。高所作業の際は十分に注意してください。   【天気】現在は晴れ（24℃）、降水確率10%です。
              </div>
            </section>

            <section className="worker-card worker-card-actions">
              <p className="worker-section-label">{text.worker.quickActionHint}</p>
              <div className="worker-actions-grid">
                {STATUS_QUICK_ACTIONS.map((action) => {
                  const actionLabel = quickLabels[action.status] ?? getStatusLabel(action.status)
                  return (
                    <button
                      key={action.status}
                      type="button"
                      className={`worker-action worker-action-${action.variant}`}
                      onClick={() => handleQuickAction(primaryAssignment?.id || 'general', action)}
                      disabled={clockLoading}
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

            <section className="worker-card worker-card-team">
              <header>
                <h3>{text.worker.teamStatusTitle ?? 'チームメンバー'}</h3>
                <p className="worker-team-count">
                  {text.worker.teamStatusCount
                    ? text.worker.teamStatusCount(teamAttendance.length)
                    : `${teamAttendance.length}名`}
                </p>
              </header>
              <div className="worker-team-grid">
                {teamAttendance.length === 0 ? (
                  <p className="worker-empty">{text.worker.teamStatusEmpty ?? 'メンバーがいません'}</p>
                ) : (
                  teamAttendance.map((attendee) => {
                    if (attendee.worker_id === worker.id) return null;
                    const memberStatus = attendee.status || 'not_reported'
                    const statusLabel = quickLabels[memberStatus] || getStatusLabel(memberStatus)
                    const statusVariant = (() => {
                      switch (memberStatus) {
                        case 'woke_up': return 'warning'
                        case 'departed': return 'primary'
                        case 'arrived': return 'success'
                        case 'finished': return 'completed'
                        default: return 'neutral'
                      }
                    })()

                    return (
                      <div key={attendee.worker_id} className="worker-team-member">
                        <div className="worker-team-avatar">
                          <span>{attendee.name.slice(0, 1)}</span>
                        </div>
                        <div className="worker-team-info">
                          <span className="worker-team-name">{attendee.name}</span>
                          <span className={`worker-team-status worker-team-status-${statusVariant}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="worker-card">
              <div className="worker-latest-wrapper">
                <h4>{text.worker.latestReportTitle}</h4>
                <div className="worker-report-list">
                  {dailyReports.length > 0 ? (
                    dailyReports.slice(0, 3).map((report) => (
                      <div key={report.id} className="worker-latest-highlight worker-action-neutral">
                        <div className="worker-latest-icon">📝</div>
                        <div className="worker-latest-details">
                          <p className="worker-latest-label">
                            {formatDateTime(report.submitted_at)}
                            {report.assignment_code && (
                              <span className="worker-latest-code">
                                [{report.assignment_code}: {report.assignment_title}]
                              </span>
                            )}
                          </p>
                          <p className="worker-latest-snippet">
                            {report.content ? (report.content.length > 30 ? report.content.substring(0, 30) + '...' : report.content) : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="worker-empty">{text.worker.latestReportEmpty}</p>
                  )}
                </div>
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
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(l => <span key={l}>{l}</span>)}
              </div>
              {calendarData.weeks.map((week, idx) => (
                <div key={idx} className="worker-calendar-row">
                  {week.map(day => {
                    const key = day.toDateString()
                    const entries = calendarData.assignmentByDate[key] ?? []
                    const isToday = day.toDateString() === calendarData.today.toDateString()
                    return (
                      <button key={key} type="button" className={`worker-calendar-cell ${day.getMonth() === calendarData.month ? '' : 'muted'} ${isToday ? 'today' : ''} ${entries.length > 0 ? 'has-event' : ''}`} onClick={() => setSelectedSchedule({ date: new Date(day), entries })}>
                        <span className="worker-calendar-day">{day.getDate()}</span>
                        {entries.map(a => <span key={a.id} className="worker-calendar-tag">{a.projectName || a.id}</span>)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="worker-selected-schedule">
              <header>
                <h4>
                  {selectedSchedule.date 
                    ? formatDate(selectedSchedule.date) 
                    : text.worker.upcomingHeading}
                </h4>
              </header>
              <div className="worker-assignment-list">
                {(selectedSchedule.entries && selectedSchedule.entries.length > 0) ? (
                  selectedSchedule.entries.map((order) => (
                    <div key={order.id} className="worker-card worker-assignment-item">
                      <div className="worker-assignment-badge">{order.status}</div>
                      <div className="worker-assignment-main">
                        <span className="worker-assignment-code">{order.assignment_code || order.id}</span>
                        <h5>{order.projectName || order.title}</h5>
                        <p className="worker-assignment-loc">📍 {order.location}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="worker-empty">{text.worker.calendarNoEvents || 'この日の担当作業はありません'}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'report' && (
          <div className="worker-report-container">
            <section className="worker-card">
              <h3>{text.worker.reportTitle}</h3>
              <div className="worker-report-form">
                <div className="worker-form-group">
                  <label>{text.worker.assignmentHeading || '担当作業'}</label>
                  <select
                    value={reportForm.assignment_id}
                    onChange={(e) => handleReportChange('assignment_id', e.target.value)}
                  >
                    <option value="">{text.worker.selectAssignment || '-- 選択してください --'}</option>
                    {assignments.length > 0 ? (
                      assignments.map(a => (
                        <option key={a.id} value={a.db_id}>
                          {a.assignment_code || a.id}: {a.projectName || a.title}
                        </option>
                      ))
                    ) : (
                      <option disabled>{text.worker.empty || '作業指示がありません'}</option>
                    )}
                  </select>
                </div>
                <div className="worker-form-group">
                  <label>{text.worker.statusLabel}</label>
                  <select 
                    value={reportForm.status} 
                    onChange={(e) => handleReportChange('status', e.target.value)}
                  >
                    <option value="">{text.worker.selectStatus || '-- 選択してください --'}</option>
                    {STATUS_QUICK_ACTIONS.map(a => (
                      <option key={a.status} value={a.status}>
                        {quickLabels[a.status] || getStatusLabel(a.status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="worker-form-group">
                  <label>{text.worker.reportNoteLabel}</label>
                  <textarea
                    value={reportForm.note}
                    onChange={(e) => handleReportChange('note', e.target.value)}
                    placeholder={text.worker.reportNotePlaceholder}
                  />
                </div>
                <div className="worker-form-group">
                  <label>{text.worker.reportPhotoLabel}</label>
                  <div className="worker-photo-upload">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = () => setReportPhoto(reader.result)
                        reader.readAsDataURL(file)
                      }
                    }} />
                    {reportPhoto && <img src={reportPhoto} alt="Upload preview" className="worker-photo-preview" />}
                  </div>
                </div>
                <button 
                  type="button" 
                  className="worker-button" 
                  onClick={handleReportSubmit}
                  disabled={!primaryAssignment}
                >
                  {text.worker.reportSubmitButton}
                </button>
                {!primaryAssignment && <p className="worker-error-text">{text.worker.locationUnavailable}</p>}
              </div>
            </section>

            <section className="worker-card worker-card-message">
              <h3>{text.worker.adminMessageTitle}</h3>
              <form className="worker-message-form" onSubmit={handleAdminMessageSubmit}>
                 <select value={adminMessageRecipient} onChange={(e) => setAdminMessageRecipient(e.target.value)}>
                   {recipientOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                 </select>
                <textarea value={adminMessage} onChange={handleAdminMessageChange} placeholder={text.worker.adminMessagePlaceholder} />
                <button type="submit" className="worker-message-send">{text.worker.adminMessageButton}</button>
              </form>
              <div className="worker-message-box">
                <div className="worker-message-tabs">
                  <button type="button" className={messageView === 'received' ? 'active' : ''} onClick={() => setMessageView('received')}>{messageReceivedLabel}</button>
                  <button type="button" className={messageView === 'sent' ? 'active' : ''} onClick={() => setMessageView('sent')}>{messageSentLabel}</button>
                </div>
                <div className="worker-message-log">
                  <ul>
                    {((messageView === 'received' ? incomingMessages : adminMessageLog) || []).map((entry, idx) => (
                      <li key={entry.id || idx}>
                        <div className="worker-log-meta">
                          <span className="worker-log-time">{formatDate(entry.timestamp)}</span>
                          <span>{messageView === 'received' ? entry.sender : (recipientLabelLookup[entry.recipient] || entry.recipient)}</span>
                        </div>
                        <p>{entry.message || entry.content}</p>
                      </li>
                    ))}
                    {((messageView === 'received' ? incomingMessages : adminMessageLog) || []).length === 0 && (
                      <p className="worker-empty">{messageEmptyLabel}</p>
                    )}
                  </ul>
                </div>
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
