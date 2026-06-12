import { apiClient } from './client';

// 自社の管理者一覧+未承諾の招待一覧
export const getAdmins = async () =>
  apiClient('/api/admins', { method: 'GET' });

// 管理者を招待（メール送信）
export const inviteAdmin = async ({ name, furigana, email }) =>
  apiClient('/api/admins/invite', {
    method: 'POST',
    body: JSON.stringify({ name, furigana, email }),
  });

// 招待リンクからパスワードを設定して参加（公開）
export const acceptAdminInvite = async ({ token, password }) =>
  apiClient('/api/admins/accept', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

// 未承諾の招待を取り消す
export const cancelAdminInvitation = async (id) =>
  apiClient(`/api/admins/invitations/${id}`, { method: 'DELETE' });

// 管理者を無効化
export const deactivateAdmin = async (id) =>
  apiClient(`/api/admins/${id}`, { method: 'DELETE' });
