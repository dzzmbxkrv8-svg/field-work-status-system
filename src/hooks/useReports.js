import { useCallback, useMemo, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { PRIORITY_OPTIONS, STATUS_ORDER } from '@/utils/constants'
import * as assignmentsApi from '@/api/assignments'

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

  const fetchAssignments = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    const result = await assignmentsApi.getAssignments()
    if (result.success) {
      dispatch({ 
        type: 'SET_WORK_ORDERS', 
        payload: result.data.map(o => ({
          ...o,
          id: o.assignment_code || o.id,
          projectName: o.title,
          location: o.location,
          dueDate: o.end_date || o.start_date,
          status: o.status === 'pending' ? 'Not Started' : (o.status === 'in_progress' ? 'In Progress' : (o.status === 'completed' ? 'Completed' : 'Delayed')),
          priority: o.priority ? o.priority.charAt(0).toUpperCase() + o.priority.slice(1) : 'Medium',
          progress: o.status === 'completed' ? 100 : (o.status === 'in_progress' ? 50 : 0)
        }))
      })
    }
  }, [dispatch])

  useEffect(() => {
    if (state.session) {
      fetchAssignments()
    }
  }, [state.session, fetchAssignments])

  const sortedOrders = useMemo(() => {
    return [...workOrders].sort((a, b) => {
      const statusComparison = (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99)
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
    async (orderId, status) => {
      const result = await assignmentsApi.updateAssignmentStatus(orderId, status)
      if (result.success) {
        fetchAssignments()
      }
      return result
    },
    [fetchAssignments]
  )

  const updateProgress = useCallback(
    async (orderId, progress) => {
      // Backend assignment doesn't have progress yet, but we'll simulate if needed or just skip
      return { success: true }
    },
    []
  )

  const submitWorkerReport = useCallback(
    async (orderId, report) => {
      const result = await updateStatus(orderId, report.status);
      return result;
    },
    [updateStatus]
  )

  const updateOrder = useCallback(
    async (orderId, updates) => {
       // Limited update in backend for now
       if (updates.status) {
         return updateStatus(orderId, updates.status)
       }
       return { success: true }
    },
    [updateStatus]
  )

  const createOrder = useCallback(
    async (order) => {
      if (!localStorage.getItem('token')) return { success: false, message: 'Unauthorized' };
      const result = await assignmentsApi.createAssignment({
        assignment_code: `FW-${Date.now().toString().slice(-4)}`,
        title: order.projectName || order.location,
        location: order.location,
        team_id: order.team_id || 1, // mapping team string to id if needed
        start_date: order.startDate,
        end_date: order.dueDate,
        notes: order.notes
      })
      if (result.success) {
        fetchAssignments()
      }
      return result
    },
    [fetchAssignments]
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
      return start <= today && (STATUS_ORDER[order.status] || 0) <= STATUS_ORDER['Ready for Dispatch']
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
    refresh: fetchAssignments
  }
}

