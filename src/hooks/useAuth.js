import { useCallback } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import { generateAccessCode, generateWorkerId } from '@/utils/access'
import * as authApi from '@/api/auth'

export function useAuth() {
  const { state, dispatch, login, logout } = useAppContext()
  const { organizations, workers } = state

  const loginWorker = useCallback(
    async ({ code, password }) => {
      const result = await authApi.login({ employee_id: code, password, role: 'worker' });
      if (!result.success) {
        const error = new Error(result.message || 'invalidWorkerCredentials');
        error.code = 'invalidWorkerCredentials';
        throw error;
      }
      
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      login(result.user);
      return result.user;
    },
    [login]
  );

  const loginAdmin = useCallback(
    async ({ code, password }) => {
      const result = await authApi.login({ employee_id: code, password, role: 'admin' });
      if (!result.success) {
        const error = new Error(result.message || 'invalidAdmin');
        error.code = 'invalidAdmin';
        throw error;
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      login(result.user);
      dispatch({ type: 'SET_TAB', payload: 'overview' });
      return result.user;
    },
    [login, dispatch]
  );

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
