import { apiClient } from './client';

export const login = async (credentials) => {
  return apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const logout = async () => {
  return apiClient('/api/auth/logout', {
    method: 'POST',
  });
};

export const getMe = async () => {
  return apiClient('/api/auth/me', {
    method: 'GET',
  });
};

export const registerWorker = async ({ access_code, employee_id, name, password }) => {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ access_code, employee_id, name, password }),
  });
};

export const resetPassword = async ({ employee_id, name, new_password }) => {
  return apiClient('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ employee_id, name, new_password }),
  });
};
