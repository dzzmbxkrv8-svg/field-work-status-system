import { useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as authApi from '@/api/auth'

export function useAuth() {
  const { state, dispatch, login, logout } = useAppContext()

  const loginWorker = useCallback(
    async ({ code, password }) => {
      const result = await authApi.login({ employee_id: code, password, role: 'worker' })
      if (!result.success) {
        const error = new Error(result.message || 'invalidWorkerCredentials')
        error.code = 'invalidWorkerCredentials'
        throw error
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      login(result.user)
      return result.user
    },
    [login]
  )

  const loginAdmin = useCallback(
    async ({ code, password }) => {
      const result = await authApi.login({ employee_id: code, password, role: 'admin' })
      if (!result.success) {
        const error = new Error(result.message || 'invalidAdmin')
        error.code = 'invalidAdmin'
        throw error
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      login(result.user)
      dispatch({ type: 'SET_TAB', payload: 'overview' })
      return result.user
    },
    [login, dispatch]
  )

  const registerWorker = useCallback(async ({ accessCode, employeeId, name, password }) => {
    const result = await authApi.registerWorker({
      access_code: accessCode,
      employee_id: employeeId,
      name,
      password,
    })
    if (!result.success) {
      const error = new Error(result.message || 'unknownOrganization')
      error.code = result.message?.includes('アクセスコード') ? 'unknownOrganization' : 'unknownError'
      throw error
    }
    return result.data
  }, [])

  const resetWorkerPassword = useCallback(async ({ employeeId, name, password }) => {
    const result = await authApi.resetPassword({
      employee_id: employeeId,
      name,
      new_password: password,
    })
    if (!result.success) {
      const error = new Error(result.message || 'unknownWorker')
      error.code = 'unknownWorker'
      throw error
    }
    return result
  }, [])

  return {
    state,
    loginWorker,
    loginAdmin,
    registerWorker,
    resetWorkerPassword,
    logout,
  }
}
