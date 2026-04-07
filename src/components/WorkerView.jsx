import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useI18n } from '@/i18n'
import { STATUS_OPTIONS, STATUS_QUICK_ACTIONS } from '@/utils/constants'

export default function WorkerView() {
  const { state, logout } = useAppContext()
  const { submitWorkerReport, getAssignmentsForTeam } = useReports()
  const { text, formatDate, getStatusLabel, formatNumber } = useI18n(state.language)
  const { clockIn, clockOut, breakStart, breakEnd, getClockStatus, getTodayEntries, calculateWorkHours } =
    useTimeEntries()
  const [clockLoading, setClockLoading] = useState(false)
  const [reportForm, setReportForm] = useState({ status: '', location: '', note: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [latestQuickAction, setLatestQuickAction] = useState(null)
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
  const [incomingMessages] = useState(() => [
    {
      id: 'incoming-1',
      sender: '管理本部',
      senderCode: 'ABCD1234',
      message: '明日の集合時間が30分早まりました。8:00に現地集合でお願いします。',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'incoming-2',
      sender: '配車担当',
      senderCode: 'ABCD1234',
      message: '車両Bの整備が完了しました。必要であれば利用申請をしてください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'incoming-3',
      sender: '安全管理',
      senderCode: 'ABCD1234',
      message: '強風が予測されています。必要に応じて一時待機を検討してください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: 'incoming-4',
      sender: '管理本部',
      senderCode: 'ABCD1234',
      message: '今日の作業は計画通りに進めてください。進捗を15時に共有してください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: 'incoming-5',
      sender: '配車担当',
      senderCode: 'ABCD1234',
      message: '搬入ルートが変更になりました。添付図面を参照してください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: 'incoming-6',
      sender: '安全管理',
      senderCode: 'ABCD1234',
      message: '午前中に安全ミーティングを実施してください。資料を共有済みです。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    },
    {
      id: 'incoming-7',
      sender: '管理本部',
      senderCode: 'ABCD1234',
      message: '資材搬入が遅れています。新しいスケジュールを後ほど共有します。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    },
    {
      id: 'incoming-8',
      sender: '配車担当',
      senderCode: 'ABCD1234',
      message: '来週の現場配置についてヒアリングをしたいので、空いている時間を返答ください。',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ])
  const [messageView, setMessageView] = useState('sent')
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

  const worker = state.session
  const assignments = useMemo(() => worker ? getAssignmentsForTeam(worker.team) : [], [getAssignmentsForTeam, worker?.team])
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
    const assignmentByDate = assignments.reduce((acc, order) => {
      const key = new Date(order.startDate).toDateString()
      if (!acc[key]) acc[key] = []
      acc[key].push(order)
      return acc
    }, {})
    return { year, month, weeks, assignmentByDate, today }
  }, [assignments])

  if (!worker) {
    return null
  }

  // 打刻ステータス
  const clockStatus = getClockStatus(worker.workerId || worker.id)
  const todayTimeEntries = getTodayEntries(worker.workerId || worker.id)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const workHours = calculateWorkHours(worker.workerId || worker.id, todayStart, todayEnd)

  const primaryOrderId = assignments.length > 0 ? assignments[0].id : null

  const handleClockAction = async (action) => {
    setClockLoading(true)
    try {
      await action(worker.workerId || worker.id, primaryOrderId, '')
    } finally {
      setClockLoading(false)
    }
  }

  const clockStatusLabel =
    clockStatus === 'working' ? '勤務中' : clockStatus === 'on_break' ? '休憩中' : '退勤済み'

  const clockStatusVariant =
    clockStatus === 'working' ? 'success' : clockStatus === 'on_break' ? 'warning' : 'neutral'

  const timeTypeLabels = { clock_in: '出勤', clock_out: '退勤', break_start: '休憩開始', break_end: '休憩終了' }

  const primaryAssignment = assignments[0]
  const locationText =
    primaryAssignment && primaryAssignment.location ? primaryAssignment.location : text.worker.locationUnavailable
  const quickLabels = text.worker.statusQuickLabels ?? {}
  const messageSentLabel = text.worker.adminMessageSentTab ?? 'Sent'
  const messageReceivedLabel = text.worker.adminMessageReceivedTab ?? 'Received'
  const messageEmptyLabel = text.worker.adminMessageEmpty ?? 'No messages yet.'

  const handleReportChange = (field, value) => {
    setReportForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleReportSubmit = () => {
    const statusToSend = reportForm.status || primaryAssignment?.status
    if (!primaryAssignment || !statusToSend) return
    submitWorkerReport(primaryAssignment.id, {
      status: statusToSend,
      location: reportForm.location || text.worker.locationUnavailable,
      note: reportForm.note,
      photo: reportPhoto,
      timestamp: new Date().toISOString(),
    })
    setReportForm((prev) => ({ ...prev, note: '' }))
    setReportPhoto(null)
  }

  const formatActionTimestamp = (timestamp) => {
    const locale = state.language === 'ja' ? 'ja-JP' : 'en-US'
    const timeString = new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${formatDate(timestamp)} ${timeString}`
  }

  const handleQuickAction = (orderId, action) => {
    const timestamp = new Date().toISOString()
    const actionLabel = quickLabels[action.status] ?? getStatusLabel(action.status)
    const payload = {
      status: action.status,
      location: locationText,
      note: actionLabel,
      timestamp,
    }
    submitWorkerReport(orderId, payload)
    const newAction = {
      label: actionLabel,
      icon: action.icon,
      status: action.status,
      timestamp,
      formatted: formatActionTimestamp(timestamp),
    }
    setLatestQuickAction(newAction)
    setActivityLog((prev) => [newAction, ...prev].slice(0, 5))
  }

  const handleAssignmentComplete = (orderId) => {
    handleQuickAction(orderId, {
      status: 'Completed',
      icon: '🏁',
      label: text.worker.statusQuickLabels?.Completed ?? getStatusLabel('Completed'),
      variant: 'danger',
    })
    setCompletedAssignments((prev) => {
      const next = new Set(prev)
      next.add(orderId)
      return next
    })
    // 10秒後に元の表示に戻す
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

  const handleAdminMessageSubmit = (event) => {
    event.preventDefault()
    if (!adminMessage.trim()) return
    if (!adminMessageRecipient) return
    setAdminMessageLog((prev) => [
      {
        message: adminMessage.trim(),
        timestamp: new Date().toISOString(),
        recipient: adminMessageRecipient,
        attachments: messageAttachments
      },
      ...prev.slice(0, 3),
    ])
    setAdminMessage('')
    setMessageAttachments([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleMessageFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const currentCount = messageAttachments.length
    const remainingSlots = 8 - currentCount

    if (remainingSlots <= 0) {
      alert('ファイルは最大で8つまで添付できます')
      return
    }

    const filesToAdd = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      alert('ファイルは最大で8つまで添付できます')
    }

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

  const formatToLabel = (label) =>
    (text.worker.adminMessageToLabel ? text.worker.adminMessageToLabel(label) : label)
  const formatFromLabel = (label) =>
    (text.worker.adminMessageFromLabel ? text.worker.adminMessageFromLabel(label) : label)

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
            {!state.online && (
              <div className="worker-offline-banner">
                <span className="worker-offline-icon">📶</span>
                <span>オフライン：送信待機中 ({state.pendingActions.length}件)</span>
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
                      {text.worker.workerIdLabel}: {worker.workerId}
                    </p>
                  </div>
                  <button type="button" className="worker-logout" onClick={logout}>
                    {text.actions.logout}
                  </button>
                </div>
                <div className="worker-info-block">
                  <div className="worker-info-row">
                    <span className="worker-info-label">{text.login.accessCodeLabel}</span>
                    <span className="worker-info-value">{worker.organizationCode}</span>
                  </div>
                  <div className="worker-info-row">
                    <span className="worker-info-label">{text.table.headers.team}</span>
                    <span className="worker-info-value">{worker.team}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* 打刻カード */}
            <section className="worker-card">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>打刻</h3>
                <span
                  className={`worker-chip worker-chip-${clockStatusVariant === 'success'
                    ? 'low'
                    : clockStatusVariant === 'warning'
                      ? 'medium'
                      : 'high'
                    }`}
                >
                  {clockStatusLabel}
                </span>
              </header>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>本日の勤務時間</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937' }}>
                  {workHours.totalHours}時間{workHours.totalMinutes}分
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                {clockStatus === 'off' && (
                  <button
                    type="button"
                    className="worker-action worker-action-success"
                    style={{ flex: 1, justifyContent: 'center', minHeight: '80px' }}
                    onClick={() => handleClockAction(clockIn)}
                    disabled={clockLoading}
                  >
                    <span className="worker-action-icon">🟢</span>
                    <span>出勤</span>
                  </button>
                )}
                {clockStatus === 'working' && (
                  <>
                    <button
                      type="button"
                      className="worker-action worker-action-warning"
                      style={{ flex: 1, justifyContent: 'center', minHeight: '80px' }}
                      onClick={() => handleClockAction(breakStart)}
                      disabled={clockLoading}
                    >
                      <span className="worker-action-icon">☕</span>
                      <span>休憩</span>
                    </button>
                    <button
                      type="button"
                      className="worker-action worker-action-danger"
                      style={{ flex: 1, justifyContent: 'center', minHeight: '80px' }}
                      onClick={() => handleClockAction(clockOut)}
                      disabled={clockLoading}
                    >
                      <span className="worker-action-icon">🔴</span>
                      <span>退勤</span>
                    </button>
                  </>
                )}
                {clockStatus === 'on_break' && (
                  <button
                    type="button"
                    className="worker-action worker-action-primary"
                    style={{ flex: 1, justifyContent: 'center', minHeight: '80px' }}
                    onClick={() => handleClockAction(breakEnd)}
                    disabled={clockLoading}
                  >
                    <span className="worker-action-icon">▶️</span>
                    <span>再開</span>
                  </button>
                )}
              </div>

              {todayTimeEntries.length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    本日の打刻履歴
                  </div>
                  {todayTimeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #f9fafb',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, minWidth: '5rem' }}>
                        {timeTypeLabels[entry.type] ?? entry.type}
                      </span>
                      <span style={{ color: '#6b7280' }}>
                        {new Date(entry.timestamp).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {entry.latitude && <span style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>📍</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="safety-ticker">
              <span className="safety-icon">⚠️</span>
              <div className="safety-content">
                【安全通知】本日、午後から強風の予報が出ています。高所作業の際は十分に注意してください。   【天気】現在は晴れ（24℃）、降水確率10%です。
              </div>
            </section>

            {primaryAssignment && (
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
                        onClick={() => handleQuickAction(primaryAssignment.id, action)}
                      >
                        <span className="worker-action-icon" aria-hidden="true">
                          {action.icon}
                        </span>
                        <span>{actionLabel}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="worker-latest-wrapper">
                  <h4>{text.worker.latestReportTitle}</h4>
                  {latestQuickAction ? (
                    <div
                      className={`worker-latest-highlight worker-action-${STATUS_QUICK_ACTIONS.find(
                        (item) => item.status === latestQuickAction.status
                      )?.variant ?? 'primary'}`}
                    >
                      <div className="worker-latest-icon">
                        {STATUS_QUICK_ACTIONS.find((item) => item.status === latestQuickAction.status)?.icon ?? '✅'}
                      </div>
                      <div className="worker-latest-details">
                        <p className="worker-latest-label">{latestQuickAction.label}</p>
                        <p className="worker-latest-time">{latestQuickAction.formatted}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="worker-empty">{text.worker.latestReportEmpty}</p>
                  )}
                </div>
              </section>
            )}

            {activityLog.length > 0 && (
              <section className="worker-card timeline-card">
                <h3>本日のアクティビティ</h3>
                <div className="timeline-list">
                  {activityLog.map((log, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-time">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="timeline-dot" />
                      <div className="timeline-text">{log.icon} {log.label} を報告しました</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <>
            <section className="worker-card worker-card-upcoming">
              <header>
                <h3>{text.worker.upcomingHeading}</h3>
                <p className="worker-upcoming-month">
                  {new Date(calendarData.year, calendarData.month).toLocaleString(
                    state.language === 'ja' ? 'ja-JP' : 'en-US',
                    { month: 'long', year: 'numeric' }
                  )}
                </p>
              </header>
              <div className="worker-calendar">
                <div className="worker-calendar-row worker-calendar-head">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                {calendarData.weeks.map((week, index) => (
                  <div key={String(index)} className="worker-calendar-row">
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
                          className={`worker-calendar-cell ${isCurrentMonth ? '' : 'muted'} ${isToday ? 'today' : ''
                            } ${entries.length > 0 ? 'has-event' : ''}`}
                          onClick={() =>
                            setSelectedSchedule({ date: new Date(day), entries })
                          }
                        >
                          <span className="worker-calendar-day">{day.getDate()}</span>
                          {entries.map((assignment) => (
                            <span key={assignment.id} className="worker-calendar-tag">
                              {assignment.projectName || assignment.id}
                            </span>
                          ))}
                          {isSelected && (
                            <div className={`worker-calendar-bubble ${bubbleClass}`} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="worker-calendar-bubble-close"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSchedule({ date: null, entries: [] })
                                }}
                              >
                                ×
                              </button>
                              <h4>{formatDate(day)}</h4>
                              {entries.length > 0 ? (
                                <ul>
                                  {entries.map((entry) => (
                                    <li key={entry.id}>
                                      <strong>{entry.projectName || entry.id}</strong>
                                      <p>{entry.upcomingNotes || entry.address || entry.location}</p>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="worker-calendar-no-events">予定はありません</p>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className="worker-card worker-card-assignments">
              <header>
                <h3>{text.worker.assignmentHeading}</h3>
                <p className="worker-assignment-count">{text.worker.assignmentCount(assignments.length)}</p>
              </header>
              {assignments.length === 0 ? (
                <p className="worker-empty">{text.worker.empty}</p>
              ) : (
                <div className="worker-assignment-grid">
                  {assignments.map((order) => (
                    <article key={order.id} className="worker-assignment-card">
                      <div className="worker-assignment-info">
                        {completedAssignments.has(order.id) ? (
                          <p className="worker-assignment-finished">{text.worker.assignmentFinishedMessage}</p>
                        ) : (
                          <>
                            <div>
                              <span className="worker-meta-label">{text.worker.assignmentProjectLabel}:</span>
                              <span>{order.projectName || order.id}</span>
                            </div>
                            <div>
                              <span className="worker-meta-label">{text.worker.assignmentAddressLabel}:</span>
                              <span>{order.address || order.location || text.worker.locationUnavailable}</span>
                              {order.mapUrl && (
                                <a
                                  className="worker-assignment-map"
                                  href={order.mapUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  [MAP]
                                </a>
                              )}
                            </div>
                            <div>
                              <span className="worker-meta-label">{text.worker.assignmentDateLabel}:</span>
                              <span>{formatDate(order.startDate)}</span>
                            </div>
                            <div>
                              <span className="worker-meta-label">{text.worker.assignmentCrewLabel}:</span>
                              <span>{formatNumber(order.crewCount)}</span>
                            </div>
                            <div>
                              <span className="worker-meta-label">{text.worker.assignmentTaskLabel}:</span>
                              <span>{order.taskDescription || order.notes || '—'}</span>
                            </div>
                            {order.members && order.members.length > 0 && (
                              <div>
                                <span className="worker-meta-label">{text.worker.assignmentMembersLabel}:</span>
                                <span>
                                  {order.members
                                    .map((id) => state.workers.find((w) => w.id === id)?.name || id)
                                    .join(', ')}
                                </span>
                              </div>
                            )}
                            {order.cautionNote && (
                              <div>
                                <span className="worker-meta-label">{text.worker.assignmentCautionLabel}:</span>
                                <span>{order.cautionNote}</span>
                              </div>
                            )}
                            {order.resourceUrl && (
                              <a
                                className="worker-assignment-download"
                                href={order.resourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {text.worker.assignmentDocsLabel}
                              </a>
                            )}
                            {order.uploadUrl && (
                              <a
                                className="worker-assignment-upload"
                                href={order.uploadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {text.worker.assignmentUploadLabel}
                              </a>
                            )}
                          </>
                        )}
                      </div>
                      {!completedAssignments.has(order.id) && (
                        <div className="worker-assignment-actions">
                          <button
                            type="button"
                            className="worker-assignment-complete"
                            onClick={() => handleAssignmentComplete(order.id)}
                          >
                            {text.worker.completeAssignmentLabel}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'report' && (
          <>
            <div className="worker-report-container">
              <section className="worker-card worker-card-message">
                <header>
                  <h3>{text.worker.adminMessageTitle}</h3>
                </header>
                <form className="worker-message-form" onSubmit={handleAdminMessageSubmit}>
                  <div className="worker-form-row-side">
                    <label>
                      {text.worker.adminMessageRecipientLabel}
                      <select
                        value={adminMessageRecipient}
                        onChange={(event) => setAdminMessageRecipient(event.target.value)}
                        disabled={recipientOptions.length === 0}
                      >
                        {recipientOptions.length === 0 ? (
                          <option value="">{text.worker.adminMessageNoRecipients ?? '宛先がありません'}</option>
                        ) : (
                          recipientOptions.map((recipient) => (
                            <option key={recipient.value} value={recipient.value}>
                              {recipient.label}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={adminMessage}
                    placeholder={text.worker.adminMessagePlaceholder}
                    ref={messageTextareaRef}
                    onChange={handleAdminMessageChange}
                  />
                  <div className="worker-message-actions">
                    <div className="worker-attach-list">
                      <label className="worker-message-attach">
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleMessageFileChange}
                          style={{ display: 'none' }}
                          disabled={messageAttachments.length >= 8}
                        />
                        <span role="img" aria-label="attach">📎</span>
                        <span>{text.worker.attachFile ?? '添付'}</span>
                      </label>
                      {messageAttachments.length > 0 && (
                        <div className="worker-attachment-previews">
                          {messageAttachments.map((file, index) => (
                            <div key={index} className="worker-attachment-tag">
                              <span className="worker-tag-text">{file.name}</span>
                              <button type="button" onClick={() => removeAttachment(index)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="worker-message-send">{text.worker.adminMessageButton}</button>
                  </div>
                </form>

                <div className="worker-message-box">
                  <div className="worker-message-tabs">
                    <button
                      type="button"
                      className={messageView === 'sent' ? 'active' : ''}
                      onClick={() => setMessageView('sent')}
                    >
                      {messageSentLabel}
                    </button>
                    <button
                      type="button"
                      className={messageView === 'received' ? 'active' : ''}
                      onClick={() => setMessageView('received')}
                    >
                      {messageReceivedLabel}
                    </button>
                  </div>
                  <div className="worker-message-log">
                    <ul>
                      {(messageView === 'sent' ? adminMessageLog : incomingMessages).map((entry, index) => (
                        <li key={entry.id ?? `${entry.timestamp}-${index}-${messageView}`}>
                          <div className="worker-log-meta">
                            <span className="worker-log-time">{formatDate(entry.timestamp)}</span>
                            <span className="worker-log-sender">
                              {messageView === 'sent'
                                ? formatToLabel(recipientLabelLookup[entry.recipient] ?? entry.recipient)
                                : formatFromLabel(entry.sender)}
                            </span>
                          </div>
                          <p className="worker-log-text">{entry.message}</p>
                          {entry.attachments && entry.attachments.length > 0 && (
                            <div className="worker-log-attachments">
                              {entry.attachments.map((att, i) => (
                                <div key={i} className="worker-log-att-item">
                                  {att.type.startsWith('image/') ? (
                                    <img src={att.data} alt={att.name} />
                                  ) : (
                                    <a href={att.data} download={att.name}>📎 {att.name.slice(0, 10)}...</a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                      {(messageView === 'sent' ? adminMessageLog : incomingMessages).length === 0 && (
                        <li className="worker-empty-log">{messageEmptyLabel}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              {primaryAssignment && (
                <section className="worker-card worker-photo-report">
                  <h4>📸 現場写真報告</h4>
                  <div className="worker-photo-controls">
                    <label className="worker-photo-label" htmlFor="photo-upload">
                      <input id="photo-upload" type="file" accept="image/*" capture="camera" onChange={handleReportPhotoChange} style={{ display: 'none' }} />
                      <div className="worker-photo-preview-box">
                        {reportPhoto ? <img src={reportPhoto} alt="Preview" /> : <span>カメラを起動 / 写真を選択</span>}
                      </div>
                    </label>
                    {reportPhoto && (
                      <button type="button" className="worker-message-send" onClick={handleReportSubmit}>
                        写真を報告する
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section className="worker-card worker-card-daily-report">
                <header>
                  <h3>{text.worker.dailyReportTitle ?? '日報'}</h3>
                </header>
                <div className="worker-report-form">
                  <textarea
                    rows={4}
                    value={reportForm.note}
                    onChange={(e) => handleReportChange('note', e.target.value)}
                    placeholder={text.worker.dailyReportPlaceholder ?? '本日の作業内容を記入してください。'}
                  />
                  <div className="worker-report-actions">
                    <button
                      type="button"
                      className="worker-assignment-complete"
                      onClick={handleReportSubmit}
                      disabled={!reportForm.note}
                    >
                      {text.worker.dailyReportSubmit ?? '日報を提出'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        <nav className="worker-bottom-nav">
          <button
            type="button"
            className={`worker-nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <span className="worker-nav-icon">🏠</span>
            <span className="worker-nav-label">ホーム</span>
          </button>
          <button
            type="button"
            className={`worker-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <span className="worker-nav-icon">📅</span>
            <span className="worker-nav-label">カレンダー</span>
          </button>
          <button
            type="button"
            className={`worker-nav-item ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <span className="worker-nav-icon">✉️</span>
            <span className="worker-nav-label">連絡・報告</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
