import { apiClient } from './client';

export const getReports = async () => {
  return apiClient('/api/reports', {
    method: 'GET',
  });
};

export const getReport = async (id) => {
  return apiClient(`/api/reports/${id}`, {
    method: 'GET',
  });
};

export const submitReport = async (reportData) => {
  return apiClient('/api/reports', {
    method: 'POST',
    body: JSON.stringify(reportData), // { assignment_id, content, photo_url }
  });
};

export const getReportSummary = async (startDate, endDate, { regenerate = false } = {}) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (regenerate) params.set('regenerate', 'true');
  return apiClient(`/api/reports/summary?${params.toString()}`, { method: 'GET' });
};
