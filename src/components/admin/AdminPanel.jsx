import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { defaultFormState, PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/utils/constants'
import { downloadBlob, escapeForCsv, formatAdminDate } from '@/utils/format'
import AdminActivityFeed from './AdminActivityFeed'
import WorkOrdersTable from './WorkOrdersTable'
import { getAssignments, createAssignment, updateAssignmentStatus, assignWorker, uploadAttachments } from '@/api/assignments'
import { getWorkers } from '@/api/workers'
import CreateOrderWizard from './CreateOrderWizard'

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
  const [workers, setWorkers] = useState([])
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
    getWorkers().then(res => {
      if (res.success) setWorkers(res.data || [])
    })
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

  const handleWizardCreate = async ({ title, location, startDate, dueDate, priority, workerId, attachments }) => {
    const result = await createAssignment({
      assignment_code: `FW-${Date.now().toString().slice(-4)}`,
      title,
      location,
      team_id: 1,
      start_date: startDate,
      end_date: dueDate,
      priority: priority.toLowerCase(),
      status: 'pending',
    })

    if (!result.success) {
      showNotification('error', result.message || '作業指示の作成に失敗しました。')
      throw new Error(result.message)
    }

    const newId = result.data?.id
    if (newId) {
      if (workerId) {
        await assignWorker(newId, workerId)
      }
      if (attachments && attachments.length > 0) {
        const uploadResult = await uploadAttachments(newId, attachments)
        if (!uploadResult.success) {
          showNotification('error', `作業指示は作成しましたが、ファイルのアップロードに失敗しました: ${uploadResult.message}`)
        }
      }
    }

    setIsAdding(false)
    fetchOrders()
    showNotification('success', '作業指示を作成しました。')
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
        </div>
      </header>

      <AdminActivityFeed orders={filteredOrders} />

      <div style={{ marginBottom: '1rem' }}>
        {!isAdding ? (
          <button type="button" className="fws-button" onClick={() => setIsAdding(true)}>
            {text.admin.addOrder}
          </button>
        ) : (
          <CreateOrderWizard
            workers={workers}
            onCreate={handleWizardCreate}
            onCancel={() => setIsAdding(false)}
          />
        )}
      </div>

      <WorkOrdersTable
        orders={filteredOrders}
        onStatusChange={handleStatusChange}
        onProgressChange={() => { }}
        onAssignWorkers={onAssignWorkers}
      />
    </section>
  )
}
