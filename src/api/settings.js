import { apiClient } from './client';

export const getAnnouncement = async () =>
  apiClient('/api/settings/announcement', { method: 'GET' });

export const updateAnnouncement = async (value) =>
  apiClient('/api/settings/announcement', {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });

// アクセスコードはFieldo運営が発行するため読み取り専用
export const getAccessCode = async () =>
  apiClient('/api/settings/access-code', { method: 'GET' });
