import { useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { generateAccessCode, generateWorkerId } from '@/utils/access'

export function useAuth() {
  const { state, dispatch, login, logout } = useAppContext()
  const { organizations, workers } = state

  const loginWorker = useCallback(
    ({ code, password }) => {
      const normalized = code.trim().toUpperCase()
      // Check if it's a Worker ID (e.g., W001) or Organization Code
      const account = workers.find(
        (entry) =>
          (entry.id === normalized || entry.organizationCode === normalized) &&
          entry.password === password
      )
      if (!account) {
        const error = new Error('invalidWorkerCredentials')
        error.code = 'invalidWorkerCredentials'
        throw error
      }
      login({
        role: 'worker',
        name: account.name,
        team: account.team,
        workerId: account.id,
        organizationCode: account.organizationCode,
      })
      return account
    },
    [workers, login]
  )

  const loginAdmin = useCallback(
    ({ code, password }) => {
      const normalized = code.trim().toUpperCase()
      const organization = organizations.find((org) => org.code === normalized)
      if (!organization || organization.adminPassword !== password) {
        const error = new Error('invalidAdmin')
        error.code = 'invalidAdmin'
        throw error
      }
      login({ role: 'admin', name: organization.adminName, code: organization.code })
      dispatch({ type: 'SET_TAB', payload: 'overview' })
      return organization
    },
    [organizations, login, dispatch]
  )

  const registerOrganization = useCallback(
    ({ companyName, adminName, password }) => {
      const existingCodes = organizations.map((org) => org.code)
      const code = generateAccessCode(existingCodes)
      const record = { code, companyName, adminName, adminPassword: password }
      dispatch({ type: 'ADD_ORGANIZATION', payload: record })
      return record
    },
    [organizations, dispatch]
  )

  const registerWorker = useCallback(
    ({ accessCode, name, team, password }) => {
      const normalized = accessCode.trim().toUpperCase()
      const organization = organizations.find((org) => org.code === normalized)
      if (!organization) {
        const error = new Error('unknownOrganization')
        error.code = 'unknownOrganization'
        throw error
      }
      const worker = {
        id: generateWorkerId(name),
        name,
        team,
        organizationCode: organization.code,
        password,
      }
      dispatch({ type: 'ADD_WORKER', payload: worker })
      return worker
    },
    [organizations, dispatch]
  )

  const resetWorkerPassword = useCallback(
    ({ accessCode, name, password }) => {
      const normalized = accessCode.trim().toUpperCase()
      const worker = workers.find(
        (entry) => entry.organizationCode === normalized && entry.name === name
      )
      if (!worker) {
        const error = new Error('unknownWorker')
        error.code = 'unknownWorker'
        throw error
      }
      dispatch({ type: 'UPDATE_WORKER', payload: { id: worker.id, updates: { password } } })
      return worker
    },
    [workers, dispatch]
  )

  const resetAdminPassword = useCallback(
    ({ code, password }) => {
      const normalized = code.trim().toUpperCase()
      const organization = organizations.find((org) => org.code === normalized)
      if (!organization) {
        const error = new Error('unknownOrganization')
        error.code = 'unknownOrganization'
        throw error
      }
      dispatch({ type: 'UPDATE_ORGANIZATION', payload: { code: organization.code, updates: { adminPassword: password } } })
      return organization
    },
    [organizations, dispatch]
  )

  return {
    state,
    loginWorker,
    loginAdmin,
    registerOrganization,
    registerWorker,
    resetWorkerPassword,
    resetAdminPassword,
    logout,
  }
}
