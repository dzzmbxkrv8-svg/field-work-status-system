import SummaryCards from './SummaryCards'
import { useI18n } from '@/i18n'
import { useState, useEffect } from 'react'
import { getAssignments } from '@/api/assignments'

export default function OverviewPanel() {
  const { text, formatNumber, formatDue, formatPriorityTag } = useI18n('ja')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const statusLabels = {
    pending: '未着手',
    in_progress: '進行中',
    completed: '完了',
    cancelled: 'キャンセル',
    delayed: '遅延',
    ready_for_dispatch: '出発準備完了'
  }

  const getStatusLabelLocal = (status) => {
    return statusLabels[status?.toLowerCase()] || status
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const assignmentsRes = await getAssignments()

        if (assignmentsRes.success) {
          setOrders(assignmentsRes.data || [])
        } else {
          setOrders([])
        }
      } catch (err) {
        console.error('Failed to fetch overview data:', err)
        setError('データを取得できませんでした')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const calculateSummary = () => {
    const summary = {
      total: orders.length,
      completionRate: 0,
      inProgress: 0,
      delayed: 0,
      readyForDispatch: 0,
      completed: 0
    }

    orders.forEach(order => {
      const status = order.status?.toLowerCase()
      if (status === 'completed') summary.completed++
      if (status === 'in_progress') summary.inProgress++
      if (status === 'delayed') summary.delayed++
      if (status === 'ready_for_dispatch') summary.readyForDispatch++
    })

    summary.completionRate = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100)
    
    // Outstanding starts: workers who haven't reported woke_up/departed yet but have assignments?
    // User logic in useReports was: start date <= today and status <= Ready for Dispatch
    const today = new Date()
    const outstandingStartsCount = orders.filter(order => {
      if (!order.start_date) return false
      const start = new Date(order.start_date)
      const status = order.status?.toLowerCase()
      return start <= today && (status === 'pending' || status === 'ready_for_dispatch')
    }).length

    return { summary, outstandingStartsCount }
  }

  if (loading) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  const { summary, outstandingStartsCount } = calculateSummary()
  const topPriorityOrders = [...orders]
    .filter(o => o.status?.toLowerCase() !== 'completed')
    .sort((a, b) => {
      const priorityMap = { high: 1, medium: 2, low: 3 }
      const pA = priorityMap[a.priority?.toLowerCase()] || 99
      const pB = priorityMap[b.priority?.toLowerCase()] || 99
      if (pA !== pB) return pA - pB
      return new Date(a.end_date) - new Date(b.end_date)
    })
    .slice(0, 3)

  return (
    <>
      <SummaryCards summary={summary} outstandingCount={outstandingStartsCount} />
      <section className="fws-panel">
        <header className="fws-panel-header">
          <h3>{text.overview.title}</h3>
          <span>
            {formatNumber(topPriorityOrders.length)} {text.overview.ordersLabel}
          </span>
        </header>
        <div className="fws-priority-list">
          {topPriorityOrders.length === 0 ? (
            <p>{text.overview.empty}</p>
          ) : (
            topPriorityOrders.map((order) => (
              <article key={order.id} className="fws-priority-item">
                <div>
                  <h4>{order.assignment_code || order.id}</h4>
                  <p>{order.location}</p>
                </div>
                <div className="fws-priority-meta">
                  <span className={`fws-tag fws-tag-${(order.priority || 'medium').toLowerCase()}`}>
                    {formatPriorityTag(order.priority || 'Medium')}
                  </span>
                  <span>{getStatusLabelLocal(order.status)}</span>
                  <span>{formatDue(order.end_date || order.start_date)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  )
}
