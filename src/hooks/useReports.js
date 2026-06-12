import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
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

const POLL_INTERVAL = 60_000 // 60秒

export function useReports() {
  const { state, dispatch } = useAppContext()
  const { workOrders, filters } = state
  const intervalRef = useRef(null)

  // 新規案件通知用
  const seenIdsRef = useRef(null)           // null = 初回未取得
  const [newAssignmentsCount, setNewAssignmentsCount] = useState(0)

  const clearNewAssignments = useCallback(() => setNewAssignmentsCount(0), [])

  // DBのstatus値（snake_case/lowercase）をフロントエンド表示用（PascalCase）に変換
  const normalizeStatus = (raw) => {
    const map = {
      'completed': 'Completed',
      'in_progress': 'In Progress',
      'in progress': 'In Progress',
      'not_started': 'Not Started',
      'not started': 'Not Started',
      'delayed': 'Delayed',
      'ready_for_dispatch': 'Ready for Dispatch',
      'ready for dispatch': 'Ready for Dispatch',
    }
    if (!raw) return 'Not Started'
    return map[raw.toLowerCase()] || raw
  }

  const fetchAssignments = useCallback(async () => {
    if (!localStorage.getItem('token')) return
    const result = await assignmentsApi.getAssignments()
    if (result.success) {
      const normalized = result.data.map(o => {
        const normalizedStatus = normalizeStatus(o.status)
        return {
          ...o,
          db_id: o.id,
          id: o.assignment_code || o.id,
          projectName: o.title,
          location: o.location,
          startDate: o.start_date,
          endDate: o.end_date,
          dueDate: o.end_date || o.start_date,
          raw_status: o.status,
          status: normalizedStatus,
          priority: o.priority ? o.priority.charAt(0).toUpperCase() + o.priority.slice(1) : 'Medium',
          progress: normalizedStatus === 'Completed' ? 100 : (normalizedStatus === 'In Progress' ? 50 : 0)
        }
      })

      dispatch({ type: 'SET_WORK_ORDERS', payload: normalized })

      // 新規案件を検出（初回ロードはスキップ）
      const currentIds = new Set(normalized.map(o => o.db_id))
      if (seenIdsRef.current === null) {
        // 初回：IDを記録するだけ、通知しない
        seenIdsRef.current = currentIds
      } else {
        const newIds = [...currentIds].filter(id => !seenIdsRef.current.has(id))
        if (newIds.length > 0) {
          setNewAssignmentsCount(prev => prev + newIds.length)
          seenIdsRef.current = currentIds
        }
      }
    }
  }, [dispatch])

  // 初回取得 + ポーリング（60秒間隔）
  useEffect(() => {
    if (!state.session) return

    fetchAssignments()

    const startPolling = () => {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAssignments()
        }
      }, POLL_INTERVAL)
    }

    const stopPolling = () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // タブが表示に戻ったら即時再取得
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAssignments()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
    async () => {
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
    refresh: fetchAssignments,
    // 新規案件通知
    newAssignmentsCount,
    clearNewAssignments,
  }
}

