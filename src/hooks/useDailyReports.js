import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as reportsApi from '@/api/reports'

export function useDailyReports() {
  const { state, dispatch } = useAppContext()
  const { reports = [] } = state
  const [loading, setLoading] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const result = await reportsApi.getReports()
    if (result.success) {
      dispatch({ type: 'SET_REPORTS', payload: result.data })
    }
    setLoading(false)
  }, [dispatch])

  useEffect(() => {
    if (state.session) {
      fetchReports()
    }
  }, [state.session, fetchReports])

  const submitReport = useCallback(async (reportData) => {
    const result = await reportsApi.submitReport({
      assignment_id: reportData.assignment_id,
      content: reportData.note || reportData.content,
      photo_url: reportData.photo || reportData.photo_url
    })
    if (result.success) {
      fetchReports()
    }
    return result
  }, [fetchReports])

  return {
    reports,
    loading,
    submitReport,
    refresh: fetchReports
  }
}
