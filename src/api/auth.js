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
