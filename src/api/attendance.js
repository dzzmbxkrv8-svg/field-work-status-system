import { apiClient } from './client';

export const getTodayAttendance = async () => {
  return apiClient('/api/attendance/today', {
    method: 'GET',
  });
};

export const updateAttendanceStatus = async (statusData) => {
  return apiClient('/api/attendance/status', {
    method: 'POST',
    body: JSON.stringify(statusData), // { status, lat, lng }
  });
};

export const getTeamTodayAttendance = async () => {
  return apiClient('/api/attendance/team/today', {
    method: 'GET',
  });
};

export const getAttendanceSummary = async (startDate, endDate) => {
  return apiClient(`/api/attendance/summary?start_date=${startDate}&end_date=${endDate}`, {
    method: 'GET',
  });
};
