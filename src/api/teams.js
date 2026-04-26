import { apiClient } from './client';

export const getTeams = async () =>
  apiClient('/api/teams', { method: 'GET' });

export const createTeam = async (data) =>
  apiClient('/api/teams', { method: 'POST', body: JSON.stringify(data) });

export const updateTeam = async (id, data) =>
  apiClient(`/api/teams/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteTeam = async (id) =>
  apiClient(`/api/teams/${id}`, { method: 'DELETE' });

export const updateWorkerTeam = async (workerId, teamId) =>
  apiClient(`/api/workers/${workerId}/team`, { method: 'PATCH', body: JSON.stringify({ teamId }) });
