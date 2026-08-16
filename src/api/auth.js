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

export const registerWorker = async (data) => {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 新フロー: メールアドレス + 新パスワード → 確認メール送信
export const forgotPassword = async ({ email, new_password }) => {
  return apiClient('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, new_password }),
  });
};

// 新フロー: URLトークンを検証 → パスワード適用
export const resetConfirm = async ({ token }) => {
  return apiClient('/api/auth/reset-confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
};

