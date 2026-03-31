import { useCallback, useMemo } from 'react'
import { useAppContext } from '@/contexts/AppContext'

const TIME_ENTRY_TYPES = ['clock_in', 'clock_out', 'break_start', 'break_end']

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
  const { state, dispatch } = useAppContext()
  const { timeEntries } = state

  const addEntry = useCallback(
    async (userId, type, workOrderId = null, note = '') => {
      if (!TIME_ENTRY_TYPES.includes(type)) return null
      const { latitude, longitude } = await getCurrentPosition()
      const entry = {
        id: `TE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        type,
        timestamp: new Date().toISOString(),
        latitude,
        longitude,
        workOrderId,
        note,
      }
      dispatch({ type: 'ADD_TIME_ENTRY', payload: entry })
      dispatch({
        type: 'ADD_AUDIT_LOG',
        payload: {
          id: `AL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId,
          action: type,
          targetId: workOrderId || userId,
          timestamp: entry.timestamp,
          details: JSON.stringify({ type, latitude, longitude, note }),
        },
      })
      return entry
    },
    [dispatch]
  )

  const clockIn = useCallback((userId, workOrderId, note) => addEntry(userId, 'clock_in', workOrderId, note), [addEntry])
  const clockOut = useCallback(
    (userId, workOrderId, note) => addEntry(userId, 'clock_out', workOrderId, note),
    [addEntry]
  )
  const breakStart = useCallback(
    (userId, workOrderId, note) => addEntry(userId, 'break_start', workOrderId, note),
    [addEntry]
  )
  const breakEnd = useCallback((userId, workOrderId, note) => addEntry(userId, 'break_end', workOrderId, note), [addEntry])

  const getEntriesForUser = useCallback(
    (userId) =>
      timeEntries.filter((e) => e.userId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [timeEntries]
  )

  const getLatestEntry = useCallback(
    (userId) => {
      const entries = getEntriesForUser(userId)
      return entries.length > 0 ? entries[0] : null
    },
    [getEntriesForUser]
  )

  const getClockStatus = useCallback(
    (userId) => {
      const latest = getLatestEntry(userId)
      if (!latest) return 'off'
      switch (latest.type) {
        case 'clock_in':
        case 'break_end':
          return 'working'
        case 'break_start':
          return 'on_break'
        case 'clock_out':
          return 'off'
        default:
          return 'off'
      }
    },
    [getLatestEntry]
  )

  const getTodayEntries = useCallback(
    (userId) => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      return timeEntries
        .filter((e) => e.userId === userId && new Date(e.timestamp) >= todayStart)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    },
    [timeEntries]
  )

  const calculateWorkHours = useCallback(
    (userId, startDate, endDate) => {
      const entries = timeEntries
        .filter((e) => {
          const t = new Date(e.timestamp)
          return e.userId === userId && t >= startDate && t <= endDate
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      let totalMs = 0
      let clockInTime = null
      let breakStartTime = null

      for (const entry of entries) {
        const t = new Date(entry.timestamp)
        switch (entry.type) {
          case 'clock_in':
            clockInTime = t
            break
          case 'clock_out':
            if (clockInTime) {
              totalMs += t - clockInTime
              clockInTime = null
            }
            break
          case 'break_start':
            if (clockInTime) {
              totalMs += t - clockInTime
              clockInTime = null
              breakStartTime = t
            }
            break
          case 'break_end':
            if (breakStartTime) {
              clockInTime = t
              breakStartTime = null
            }
            break
        }
      }
      if (clockInTime) {
        totalMs += new Date() - clockInTime
      }

      return {
        totalHours: Math.floor(totalMs / 3600000),
        totalMinutes: Math.floor((totalMs % 3600000) / 60000),
        totalMs,
      }
    },
    [timeEntries]
  )

  const allEntries = useMemo(
    () => [...timeEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [timeEntries]
  )

  return {
    allEntries,
    clockIn,
    clockOut,
    breakStart,
    breakEnd,
    getEntriesForUser,
    getLatestEntry,
    getClockStatus,
    getTodayEntries,
    calculateWorkHours,
  }
}

