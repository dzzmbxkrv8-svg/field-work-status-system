import { useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import * as authApi from '@/api/auth'
import * as companiesApi from '@/api/companies'

export function useAuth() {
  const { state, dispatch, login, logout } = useAppContext()

  const loginWorker = useCallback(
    async ({ code, password }) => {
      const result = await authApi.login({ employee_id: code, password, role: 'worker' })
      if (!result.success) {
        const error = new Error(result.message || 'invalidWorkerCredentials')
        error.code = result.code || 'invalidWorkerCredentials'
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
        error.code = result.code || 'invalidAdmin'
        throw error
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      login(result.user)
      dispatch({ type: 'SET_TAB', payload: 'dashboard' })
      return result.user
    },
    [login, dispatch]
  )

  const registerWorker = useCallback(async ({ accessCode, furigana, name, phone, email, address, password }) => {
    const result = await authApi.registerWorker({
      access_code: accessCode,
      furigana,
      name,
      phone,
      email,
      address,
      password,
    })
    if (!result.success) {
      const error = new Error(result.message || 'unknownOrganization')
      error.code = result.message?.includes('アクセスコード') ? 'unknownOrganization' : 'unknownError'
      throw error
    }
    // 自動採番された employeeId を返す
    return { data: result.data, employeeId: result.employeeId }
  }, [])

  // 会社登録申請（管理者アカウント作成・運営承認待ち）
  const registerCompany = useCallback(async ({ companyName, adminName, furigana, phone, email, password }) => {
    const result = await companiesApi.registerCompany({
      company_name: companyName,
      admin_name: adminName,
      furigana,
      phone,
      email,
      password,
    })
    if (!result.success) {
      throw new Error(result.message || '登録申請に失敗しました')
    }
    return result
  }, [])

  // 新フロー: メール送信
  const forgotPassword = useCallback(async ({ email, password }) => {
    const result = await authApi.forgotPassword({ email, new_password: password })
    if (!result.success) {
      const error = new Error(result.message || 'リセットに失敗しました')
      throw error
    }
    return result
  }, [])

  // 新フロー: トークン確認
  const resetConfirm = useCallback(async ({ token }) => {
    const result = await authApi.resetConfirm({ token })
    if (!result.success) {
      const error = new Error(result.message || 'トークンが無効です')
      error.code = result.code || 'tokenExpired'
      throw error
    }
    return result
  }, [])

  // 旧互換
  const resetWorkerPassword = forgotPassword

  return {
    state,
    loginWorker,
    loginAdmin,
    registerWorker,
    registerCompany,
    forgotPassword,
    resetConfirm,
    resetWorkerPassword,
    logout,
  }
}
