import { useCallback, useState, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as attendanceApi from '@/api/attendance'

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

export function useTimeEntries() {
  const { state } = useAppContext()
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [teamAttendance, setTeamAttendance] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTodayAttendance = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    setLoading(true)
    const result = await attendanceApi.getTodayAttendance()
    if (result.success) {
      setTodayAttendance(result.data)
    }
    setLoading(false)
  }, [])

  const fetchTeamAttendance = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    const result = await attendanceApi.getTeamTodayAttendance()
    if (result.success) {
      setTeamAttendance(result.data)
    }
  }, [])

  useEffect(() => {
    if (state.session) {
      fetchTodayAttendance()
      fetchTeamAttendance()
    }
  }, [state.session, fetchTodayAttendance, fetchTeamAttendance])

  const updateStatus = useCallback(
    async (status) => {
      const { latitude, longitude } = await getCurrentPosition()
      const result = await attendanceApi.updateAttendanceStatus({
        status,
        lat: latitude,
        lng: longitude
      })
      if (result.success) {
        setTodayAttendance(result.data)
        fetchTeamAttendance()
      }
      return result
    },
    [fetchTeamAttendance]
  )

  return {
    todayAttendance,
    teamAttendance,
    loading,
    updateStatus,
    refreshToday: fetchTodayAttendance,
    refreshTeam: fetchTeamAttendance
  }
}
