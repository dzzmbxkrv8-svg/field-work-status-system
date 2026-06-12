// src/api/client.js
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${baseURL}${endpoint}`, config);
    
    if (response.status === 401) {
      // ログインAPI以外での401エラー時にのみログアウト処理・リダイレクトを行う
      if (!endpoint.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // すでにログイン画面にいない場合のみリダイレクト（無限ループ防止）
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          window.location.href = '/';
        }
      }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const err = new Error(data.message || `APIエラー: ${response.status}`);
      err.code = data.code;
      throw err;
    }

    return await response.json();
  } catch (error) {
    return { success: false, message: error.message, code: error.code };
  }
};
