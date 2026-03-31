import { useCallback, useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { PRIORITY_OPTIONS, STATUS_ORDER } from '@/utils/constants'

function summarizeWorkOrders(orders) {
  const summary = {
    total: orders.length,
    completed: 0,
    inProgress: 0,
    delayed: 0,
    notStarted: 0,
    readyForDispatch: 0,
  }

  orders.forEach((order) => {
    switch (order.status) {
      case 'Completed':
        summary.completed += 1
        break
      case 'In Progress':
        summary.inProgress += 1
        break
      case 'Delayed':
        summary.delayed += 1
        break
      case 'Ready for Dispatch':
        summary.readyForDispatch += 1
        break
      default:
        summary.notStarted += 1
    }
  })

  summary.completionRate = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100)
  return summary
}

export function useReports() {
  const { state, dispatch } = useAppContext()
  const { workOrders, filters } = state

  const sortedOrders = useMemo(() => {
    return [...workOrders].sort((a, b) => {
      const statusComparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (statusComparison !== 0) return statusComparison
      if (a.priority !== b.priority) {
        return PRIORITY_OPTIONS.indexOf(a.priority) - PRIORITY_OPTIONS.indexOf(b.priority)
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [workOrders])

  const filteredOrders = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return sortedOrders.filter((order) => {
      const matchesStatus = filters.status === 'All' || order.status === filters.status
      const matchesPriority = filters.priority === 'All' || order.priority === filters.priority
      const matchesSearch =
        searchTerm.length === 0 ||
        [order.id, order.team, order.supervisor, order.location, order.notes]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [sortedOrders, filters])

  const updateStatus = useCallback(
    (orderId, status) => {
      dispatch({
        type: 'UPDATE_WORK_ORDER',
        payload: { id: orderId, updates: { status, updatedAt: new Date().toISOString() } },
      })
    },
    [dispatch]
  )

  const updateProgress = useCallback(
    (orderId, progress) => {
      dispatch({
        type: 'UPDATE_WORK_ORDER',
        payload: { id: orderId, updates: { progress, updatedAt: new Date().toISOString() } },
      })
    },
    [dispatch]
  )

  const submitWorkerReport = useCallback(
    (orderId, report) => {
      const action = {
        type: 'UPDATE_WORK_ORDER',
        payload: {
          id: orderId,
          updates: {
            status: report.status,
            location: report.location,
            notes: report.note,
            updatedAt: report.timestamp,
            // 現場写真（ Base64 ）があればここに追加（ WorkerView から渡す予定 ）
            photo: report.photo || null,
          },
        },
      }

      if (state.online) {
        dispatch(action)
      } else {
        console.log('Offline: Adding action to queue', action)
        dispatch({ type: 'ADD_PENDING_ACTION', payload: action })
      }
    },
    [dispatch, state.online]
  )

  const updateOrder = useCallback(
    (orderId, updates) => {
      dispatch({
        type: 'UPDATE_WORK_ORDER',
        payload: { id: orderId, updates: { ...updates, updatedAt: new Date().toISOString() } },
      })
    },
    [dispatch]
  )

  const createOrder = useCallback(
    (order) => {
      dispatch({ type: 'ADD_WORK_ORDER', payload: order })
    },
    [dispatch]
  )

  const getAssignmentsForTeam = useCallback(
    (team) =>
      sortedOrders.filter((order) => order.team === team).sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }),
    [sortedOrders]
  )

  const summary = useMemo(() => summarizeWorkOrders(sortedOrders), [sortedOrders])

  const outstandingStarts = useMemo(() => {
    const today = new Date()
    return sortedOrders.filter((order) => {
      if (!order.startDate) return false
      const start = new Date(order.startDate)
      return start <= today && STATUS_ORDER[order.status] <= STATUS_ORDER['Ready for Dispatch']
    }).length
  }, [sortedOrders])

  const topPriorityOrders = useMemo(() => {
    return [...sortedOrders]
      .filter((order) => order.status !== 'Completed')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return PRIORITY_OPTIONS.indexOf(a.priority) - PRIORITY_OPTIONS.indexOf(b.priority)
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, 3)
  }, [sortedOrders])

  return {
    filters,
    sortedOrders,
    filteredOrders,
    summary,
    outstandingStarts,
    topPriorityOrders,
    updateStatus,
    updateProgress,
    submitWorkerReport,
    createOrder,
    updateOrder,
    getAssignmentsForTeam,
  }
}
