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
