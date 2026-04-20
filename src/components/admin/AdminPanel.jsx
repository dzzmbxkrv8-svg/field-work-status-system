import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { defaultFormState, PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/utils/constants'
import { downloadBlob, escapeForCsv, formatAdminDate } from '@/utils/format'
import AdminActivityFeed from './AdminActivityFeed'
import WorkOrdersTable from './WorkOrdersTable'
import { getAssignments, createAssignment, updateAssignmentStatus } from '@/api/assignments'

function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default function AdminPanel({ onAssignWorkers }) {
  const { state } = useAppContext()
  const { filters } = state
  const { text, getStatusLabel, getPriorityLabel, getSafetyCheckLabel } = useI18n('ja')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [isAdding, setIsAdding] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (type, text, duration = 3500) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), duration)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAssignments()
      if (result.success) {
        setOrders(result.data.map(o => ({
          ...o,
          id: o.assignment_code || o.id,
          db_id: o.id,
          projectName: o.title,
          location: o.location,
          team: o.team_name || `Team ${o.team_id}`,
          supervisor: o.supervisor_name || '—',
          status: o.status,
          priority: o.priority ? o.priority.charAt(0).toUpperCase() + o.priority.slice(1) : 'Medium',
          crewCount: o.crew_count || 1,
          startDate: o.start_date,
          endDate: o.end_date,
          dueDate: o.end_date || o.start_date,
          progress: o.status === 'completed' ? 100 : (o.status === 'in_progress' ? 50 : 0),
          updatedAt: o.updated_at || o.created_at
        })))
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
      setError('データを取得できませんでした')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = filters.status === 'All' || order.status === filters.status.toLowerCase()
      const matchesPriority = filters.priority === 'All' || order.priority === filters.priority
      const matchesSearch =
        searchTerm.length === 0 ||
        [order.id, order.team, order.supervisor, order.location, order.notes]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [orders, filters])

  const formatDateForExport = (value) => {
    const formatted = formatAdminDate(value)
    return formatted === '—' ? '' : formatted
  }

  const handleExportToCsv = () => {
    const headers = [
      `${text.table.headers.order} ID`,
      text.table.headers.team,
      text.table.headers.supervisor,
      text.table.headers.location,
      text.table.headers.status,
      text.table.headers.progress,
      text.table.headers.priority,
      text.admin.form.crewCount,
      text.admin.form.startDate,
      text.admin.form.dueDate,
      text.admin.form.safetyCheck,
      text.admin.form.notes,
      text.table.headers.updated,
    ]

    const csvRows = [
      headers.join(','),
      ...filteredOrders.map((order) =>
        [
          order.id,
          order.team,
          order.supervisor,
          order.location,
          getStatusLabel(order.status),
          `${order.progress}%`,
          getPriorityLabel(order.priority),
          order.crewCount,
          formatDateForExport(order.startDate),
          formatDateForExport(order.dueDate),
          getSafetyCheckLabel(order.safetyCheck),
          order.notes,
          formatDateForExport(order.updatedAt),
        ]
          .map(escapeForCsv)
          .join(',')
      ),
    ]

    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    downloadBlob('field-work-status.csv', blob)
  }

  const handleExportToExcel = () => {
    const headers = [
      `${text.table.headers.order} ID`,
      text.table.headers.team,
      text.table.headers.supervisor,
      text.table.headers.location,
      text.table.headers.status,
      text.table.headers.progress,
      text.table.headers.priority,
      text.admin.form.crewCount,
      text.admin.form.startDate,
      text.admin.form.dueDate,
      text.admin.form.safetyCheck,
      text.admin.form.notes,
      text.table.headers.updated,
    ]

    const bodyRows = filteredOrders
      .map(
        (order) => `<tr>${[
          order.id,
          order.team,
          order.supervisor,
          order.location,
          getStatusLabel(order.status),
          `${order.progress}%`,
          getPriorityLabel(order.priority),
          order.crewCount,
          formatDateForExport(order.startDate),
          formatDateForExport(order.dueDate),
          getSafetyCheckLabel(order.safetyCheck),
          order.notes || '',
          formatDateForExport(order.updatedAt),
        ]
          .map((value) => `<td>${escapeHtml(value)}</td>`)
          .join('')}</tr>`
      )
      .join('')

    const table = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8" /></head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + table], {
      type: 'application/vnd.ms-excel',
    })
    downloadBlob('field-work-status.xls', blob)
  }

  const handleFormChange = (field, value) => {
    setFormState((previous) => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await createAssignment({
      assignment_code: `FW-${Date.now().toString().slice(-4)}`,
      title: formState.location, 
      location: formState.location,
      team_id: 1, 
      start_date: formState.startDate,
      end_date: formState.dueDate,
      notes: formState.notes,
      priority: formState.priority.toLowerCase(),
      status: formState.status.toLowerCase()
    })
    
    if (result.success) {
      setFormState(defaultFormState)
      setIsAdding(false)
      fetchOrders()
      showNotification('success', '作業指示を作成しました。')
    } else {
      showNotification('error', result.message || '作業指示の作成に失敗しました。')
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    
    const result = await updateAssignmentStatus(order.db_id, newStatus.toLowerCase())
    if (result.success) {
      fetchOrders()
    } else {
      showNotification('error', result.message || 'ステータスの更新に失敗しました。')
    }
  }

  if (loading && orders.length === 0) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error && orders.length === 0) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  return (
    <section className="fws-panel">
      {notification && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem',
          background: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
        }}>
          {notification.type === 'success' ? '✅ ' : '❌ '}{notification.text}
        </div>
      )}
      <header className="fws-panel-header">
        <div>
          <h3>{text.admin.title}</h3>
          <p>{text.admin.description}</p>
        </div>
        <div className="fws-action-bar">
          <button type="button" className="fws-button secondary" onClick={handleExportToCsv}>
            {text.admin.exportCsv}
          </button>
          <button type="button" className="fws-button secondary" onClick={handleExportToExcel}>
            {text.admin.exportExcel}
          </button>
          <button type="button" className="fws-button" onClick={() => setIsAdding((value) => !value)}>
            {isAdding ? text.admin.cancel : text.admin.addOrder}
          </button>
        </div>
      </header>

      <AdminActivityFeed orders={filteredOrders} />

      {isAdding && (
        <form className="fws-form" onSubmit={handleSubmit}>
          <div className="fws-form-grid">
            <label>
              {text.admin.form.team}
              <input required value={formState.team} onChange={(event) => handleFormChange('team', event.target.value)} />
            </label>
            <label>
              {text.admin.form.supervisor}
              <input
                required
                value={formState.supervisor}
                onChange={(event) => handleFormChange('supervisor', event.target.value)}
              />
            </label>
            <label>
              {text.admin.form.location}
              <input
                required
                value={formState.location}
                onChange={(event) => handleFormChange('location', event.target.value)}
              />
            </label>
            <label>
              {text.admin.form.status}
              <select value={formState.status} onChange={(event) => handleFormChange('status', event.target.value)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.admin.form.priority}
              <select value={formState.priority} onChange={(event) => handleFormChange('priority', event.target.value)}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.admin.form.crewCount}
              <input
                type="number"
                min="1"
                value={formState.crewCount}
                onChange={(event) => handleFormChange('crewCount', event.target.value)}
              />
            </label>
            <label>
              {text.admin.form.startDate}
              <input type="date" value={formState.startDate} onChange={(event) => handleFormChange('startDate', event.target.value)} />
            </label>
            <label>
              {text.admin.form.dueDate}
              <input type="date" value={formState.dueDate} onChange={(event) => handleFormChange('dueDate', event.target.value)} />
            </label>
            <label>
              {text.admin.form.progress}
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={formState.progress}
                onChange={(event) => handleFormChange('progress', event.target.value)}
              />
            </label>
            <label>
              {text.admin.form.safetyCheck}
              <input value={formState.safetyCheck} onChange={(event) => handleFormChange('safetyCheck', event.target.value)} />
            </label>
            <label className="fws-form-notes">
              {text.admin.form.notes}
              <textarea rows={3} value={formState.notes} onChange={(event) => handleFormChange('notes', event.target.value)} />
            </label>
          </div>
          <div className="fws-form-actions">
            <button type="submit" className="fws-button">
              {text.admin.form.submit}
            </button>
          </div>
        </form>
      )}

      <WorkOrdersTable
        orders={filteredOrders}
        onStatusChange={handleStatusChange}
        onProgressChange={() => { }}
        onAssignWorkers={onAssignWorkers}
      />
    </section>
  )
}
