/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useReducer, useEffect } from 'react'
import { changeLanguage, getCurrentLanguage } from '@/i18n'
import { ROLE_TABS } from '@/utils/constants'

const AppContext = createContext()

const STORAGE_KEY = 'fws_app_state_v4'

function createInitialState() {
  const language = getCurrentLanguage() || 'ja'
  changeLanguage(language)

  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      let validatedSession = null
      if (token && userStr) {
        try { validatedSession = JSON.parse(userStr) } catch { validatedSession = null }
      }

      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const allowedTabs = new Set(ROLE_TABS.map((tab) => tab.id))
        const restoredTab =
          parsed.selectedTab && allowedTabs.has(parsed.selectedTab) ? parsed.selectedTab : ROLE_TABS[0].id

        return {
          language,
          session: validatedSession,
          selectedTab: restoredTab,
          filters: parsed.filters || {
            status: 'All',
            priority: 'All',
            search: '',
            worker: 'All',
            overdueOnly: false,
          },
          online: true,
          pendingActions: parsed.pendingActions || [],
          workOrders: [],
          messages: [],
          reports: [],
        }
      }

      if (validatedSession) {
        return {
          language,
          session: validatedSession,
          selectedTab: ROLE_TABS[0].id,
          filters: { status: 'All', priority: 'All', search: '', worker: 'All', overdueOnly: false },
          online: true,
          pendingActions: [],
          workOrders: [],
          messages: [],
          reports: [],
        }
      }
    } catch (e) {
      console.error('Failed to load state from storage', e)
    }
  }

  return {
    language,
    session: null,
    selectedTab: ROLE_TABS[0].id,
    filters: {
      status: 'All',
      priority: 'All',
      search: '',
      worker: 'All',
      overdueOnly: false,
    },
    online: true,
    pendingActions: [],
    workOrders: [],
    messages: [],
    reports: [],
  }
}

const initialState = createInitialState()

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload }
    case 'SET_SESSION':
      return { ...state, session: action.payload }
    case 'SET_TAB':
      return { ...state, selectedTab: action.payload }
    case 'UPDATE_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'SET_ONLINE':
      return { ...state, online: action.payload }
    case 'ADD_PENDING_ACTION':
      return { ...state, pendingActions: [...state.pendingActions, action.payload] }
    case 'CLEAR_PENDING_ACTIONS':
      return { ...state, pendingActions: [] }
    case 'SET_WORK_ORDERS':
      return { ...state, workOrders: action.payload }
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload }
    case 'SET_REPORTS':
      return { ...state, reports: action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Persist state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state])

  // Listen for storage events to sync across tabs (Optional, but keeping simple reload or sync if needed)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        // Simple reload to sync if storage changes, or just ignore for now
        // window.location.reload();
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Sync offline actions when coming back online
  useEffect(() => {
    const syncOfflineActions = () => {
      if (state.pendingActions.length > 0) {
        console.log('Syncing offline actions...', state.pendingActions)
        // デモ版のため、キュー内の各アクションを順次 dispatch して反映
        state.pendingActions.forEach(action => {
          dispatch(action)
        })
        dispatch({ type: 'CLEAR_PENDING_ACTIONS' })
      }
    }

    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE', payload: true })
      syncOfflineActions()
    }
    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE', payload: false })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (!navigator.onLine) {
      dispatch({ type: 'SET_ONLINE', payload: false })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.pendingActions])

  const setLanguage = useCallback((language) => {
    changeLanguage(language)
    dispatch({ type: 'SET_LANGUAGE', payload: getCurrentLanguage() })
  }, [])

  const login = useCallback((session) => dispatch({ type: 'SET_SESSION', payload: session }), [])
  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    dispatch({ type: 'SET_SESSION', payload: null })
  }, [])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      language: state.language,
      setLanguage,
      login,
      logout,
    }),
    [state, setLanguage, login, logout]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
