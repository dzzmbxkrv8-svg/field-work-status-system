import { apiClient } from './client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getMessages = async () => {
  return apiClient('/api/messages', { method: 'GET' });
};

export const sendMessage = async (messageData) => {
  return apiClient('/api/messages', {
    method: 'POST',
    body: JSON.stringify(messageData),
  });
};

// ファイル・画像をアップロードしてURLを返す
export const uploadFile = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${BASE}/api/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'アップロード失敗');
    }
    return await res.json();
  } catch (e) {
    return { success: false, message: e.message };
  }
};

export const markAsRead = async (id, receiverId) => {
  return apiClient(`/api/messages/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ receiver_id: receiverId }),
  });
};
