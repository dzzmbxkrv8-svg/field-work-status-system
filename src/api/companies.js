import { apiClient } from './client';

// 会社登録申請（会社+管理者アカウントを承認待ちで作成）
export const registerCompany = async (data) => {
  return apiClient('/api/companies/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
