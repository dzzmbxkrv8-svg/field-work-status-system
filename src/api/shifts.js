import { apiClient } from './client';

// 管理者: シフト募集一覧
export const getShifts = async () => {
  return apiClient('/api/shifts', { method: 'GET' });
};

// 管理者: シフト募集を作成（全作業員へ一斉送信される）
export const createShiftRequest = async (data) => {
  return apiClient('/api/shifts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 募集詳細（作業員の場合は自分の回答も含む）
export const getShift = async (id) => {
  return apiClient(`/api/shifts/${id}`, { method: 'GET' });
};

// 管理者: 日付ごとの回答集計（カレンダービュー）
export const getShiftSummary = async (id) => {
  return apiClient(`/api/shifts/${id}/summary`, { method: 'GET' });
};

// 作業員: 複数日の回答をまとめて送信
export const respondToShift = async (id, responses) => {
  return apiClient(`/api/shifts/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  });
};

// 管理者: 特定日のシフトを確定
export const confirmShiftDate = async (id, data) => {
  return apiClient(`/api/shifts/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 管理者: 期間全体を一括確定（○と回答した作業員をまとめて確定する。既存の確定は上書きしない）
export const confirmAllShiftDates = async (id) => {
  return apiClient(`/api/shifts/${id}/confirm-all`, { method: 'POST' });
};

// 管理者: 再調査を送信（date を渡すとその日のみ再依頼）
export const resendShiftRequest = async (id, data = {}) => {
  return apiClient(`/api/shifts/${id}/resend`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 作業員: 自分宛のシフト調査一覧
export const getMyShifts = async () => {
  return apiClient('/api/shifts/worker/my', { method: 'GET' });
};

// 管理者: 指定期間中、シフトで○（出勤可）と回答している作業員を判定する
// （作業指示のメンバー選択で「その日×の人を除外する」ために使う）
export const getAvailableWorkers = async (start, end) => {
  return apiClient(`/api/shifts/availability?start=${start}&end=${end}`, { method: 'GET' });
};

// 管理者: シフト調査を削除する
export const deleteShiftRequest = async (id) => {
  return apiClient(`/api/shifts/${id}`, { method: 'DELETE' });
};
